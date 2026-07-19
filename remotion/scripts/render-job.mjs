import { createClient } from "@supabase/supabase-js";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Load environment variables from parent folder's .env (or worker folder's .env)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, "../../.env");
const localEnvPath = path.resolve(__dirname, "../.env");

function loadEnv(envPath) {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
}

loadEnv(rootEnvPath);
loadEnv(localEnvPath);

const {
  VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  VITE_SUPABASE_ANON_KEY,
} = process.env;

const supabaseUrl = VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Erreur : SUPABASE_URL ou SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY manquante.");
  console.log("Veuillez configurer votre fichier .env avec les clés requises.");
  process.exit(1);
}

// DIAG: which key is actually being used?
console.log("🔎 DIAG keys:", {
  url_set: !!supabaseUrl,
  service_role_set: !!SUPABASE_SERVICE_ROLE_KEY,
  service_role_len: SUPABASE_SERVICE_ROLE_KEY?.length ?? 0,
  anon_set: !!VITE_SUPABASE_ANON_KEY,
  using: SUPABASE_SERVICE_ROLE_KEY ? "SERVICE_ROLE" : "ANON",
});

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET = "studio-videos";

async function getNextJob() {
  const { data: candidate, error: selErr } = await supabase
    .from("video_jobs")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selErr) {
    console.error("❌ Erreur lors de la sélection d'un job :", selErr);
    return null;
  }
  if (!candidate) return null;

  const { data, error } = await supabase
    .from("video_jobs")
    .update({ status: "rendering" })
    .eq("id", candidate.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (error) {
    console.error("❌ Erreur lors du verrouillage du job :", error);
    return null;
  }
  return data;
}

async function renderAndUpload() {
  console.log("🔍 Recherche d'une vidéo en file d'attente...");
  const job = await getNextJob();

  if (!job) {
    console.log("✨ Aucune vidéo en file d'attente.");
    return;
  }

  console.log(`🎬 Traitement de la vidéo ${job.id} (${job.template_id || "studio-signature"})...`);

  try {
    const tempDir = path.resolve(__dirname, "../tmp-render");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const outPath = path.join(tempDir, `${job.id}.mp4`);
    
    // Configurer les props pour le rendu : priorité à template_props (option B),
    // fallback sur scenario_json pour compat ascendante.
    const props = (job.template_props && Object.keys(job.template_props).length > 0)
      ? job.template_props
      : (job.scenario_json || {});
    const inputPropsFile = path.join(tempDir, `${job.id}-props.json`);
    fs.writeFileSync(inputPropsFile, JSON.stringify(props, null, 2));

    console.log("📦 Bundling Remotion...");
    const bundled = await bundle({
      entryPoint: path.resolve(__dirname, "../src/index.ts"),
      webpackOverride: (c) => c,
    });

    console.log("🌐 Ouverture de l'instance Chrome...");
    const browser = await openBrowser("chrome", {
      browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      chromiumOptions: {
        args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
      },
      chromeMode: "chrome-for-testing",
    });

    const validCompositions = [
      "main",
      "corporate-vertical",
      "business-showcase",
      "comptoir-darna",
      "riad-dar-najat",
      "maison-brummell",
      "jnane-rumi",
      "agent-ia-demo",
      "agent-ia-demo-v2",
      "nar-complexe",
      "farasha-farmhouse",
      "bo-zin"
    ];
    let compositionId = job.template_id || "business-showcase";
    if (!validCompositions.includes(compositionId)) {
      console.log(`⚠️ Composition "${compositionId}" non valide, repli sur "business-showcase"`);
      compositionId = "business-showcase";
    }
    console.log(`🎨 Sélection de la composition : ${compositionId}`);
    
    const composition = await selectComposition({
      serveUrl: bundled,
      id: compositionId,
      puppeteerInstance: browser,
      inputProps: props,
    });

    console.log("🎥 Rendu vidéo en cours (cette étape prend quelques secondes)...");
    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: "h264",
      outputLocation: outPath,
      puppeteerInstance: browser,
      muted: true,
      concurrency: 1,
      inputProps: props,
    });

    await browser.close({ silent: false });

    console.log("🚀 Téléversement de la vidéo sur le cloud...");
    const fileBuffer = fs.readFileSync(outPath);
    const storagePath = `${job.id}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = pub.publicUrl;

    console.log(`✅ Vidéo générée avec succès : ${publicUrl}`);

    // Mettre à jour le statut du job
    const { error: updateError } = await supabase
      .from("video_jobs")
      .update({
        status: "done",
        output_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (updateError) throw updateError;

    // Nettoyage local
    fs.unlinkSync(outPath);
    fs.unlinkSync(inputPropsFile);

  } catch (error) {
    console.error("❌ Erreur pendant le rendu :", error);
    
    await supabase
      .from("video_jobs")
      .update({
        status: "error",
        error_message: error.message || String(error),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
  }
}

// Boucle : traite tous les jobs en attente (utile pour GitHub Actions)
async function processAllPending() {
  const maxJobs = parseInt(process.env.MAX_JOBS || "5", 10);
  for (let i = 0; i < maxJobs; i++) {
    const { data: pending } = await supabase
      .from("video_jobs")
      .select("id")
      .eq("status", "pending")
      .limit(1);
    if (!pending || pending.length === 0) {
      console.log("✨ File d'attente vide.");
      return;
    }
    await renderAndUpload();
  }
}

processAllPending()
  .then(() => {
    console.log("👋 Fin du worker.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("💥 Erreur fatale :", err);
    process.exit(1);
  });
