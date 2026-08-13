import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { execSync, execFileSync } from "node:child_process";

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
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  }
}
loadEnv(rootEnvPath);
loadEnv(localEnvPath);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const WORKER_SECRET = process.env.WORKER_SECRET;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !WORKER_SECRET) {
  console.error("❌ SUPABASE_URL ou WORKER_SECRET manquant.");
  process.exit(1);
}

const CLAIM_URL = `${SUPABASE_URL}/functions/v1/worker-claim-job`;
const FINALIZE_URL = `${SUPABASE_URL}/functions/v1/worker-finalize-job`;

function workerHeaders() {
  const h = { "x-worker-secret": WORKER_SECRET, "Content-Type": "application/json" };
  if (ANON_KEY) h["Authorization"] = `Bearer ${ANON_KEY}`;
  return h;
}

async function claimJob() {
  const r = await fetch(CLAIM_URL, { method: "POST", headers: workerHeaders() });
  if (!r.ok) {
    console.error(`❌ claim ${r.status}:`, await r.text());
    return null;
  }
  return r.json();
}

async function finalizeJob(payload) {
  const r = await fetch(FINALIZE_URL, {
    method: "POST",
    headers: workerHeaders(),
    body: JSON.stringify(payload),
  });
  if (!r.ok) console.error(`❌ finalize ${r.status}:`, await r.text());
}

async function uploadToSignedUrl(signedUrl, buffer) {
  const r = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "x-upsert": "true" },
    body: buffer,
  });
  if (!r.ok) throw new Error(`upload ${r.status}: ${await r.text()}`);
}

function getVideoDurationSeconds(videoPath) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${videoPath}"`,
      { encoding: "utf-8" }
    );
    const sec = parseFloat(out.trim());
    return Number.isFinite(sec) ? Math.round(sec) : null;
  } catch (e) {
    return null;
  }
}

async function renderOne() {
  console.log("🔍 Recherche d'une vidéo en file d'attente...");
  const claim = await claimJob();
  if (!claim || !claim.job) {
    console.log("✨ Aucune vidéo en file d'attente.");
    return false;
  }
  const { job, upload } = claim;
  console.log(`🎬 Job ${job.id} (${job.template_id || "business-showcase"})`);

  try {
    const tempDir = path.resolve(__dirname, "../tmp-render");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const outPath = path.join(tempDir, `${job.id}.mp4`);
    let props = (job.template_props && Object.keys(job.template_props).length > 0)
      ? job.template_props
      : (job.scenario_json || {});

    // --- Scénario « Feed » : capture Playwright réelle puis rendu par le template
    // paramétrique. Toute la géométrie/rythme passe par le manifest, aucun calibrage
    // n'est codé ici. La capture doit précéder le bundling (assets dans public/).
    const isFeed = String(job.template_id || "").startsWith("feed-template");
    if (isFeed) {
      const p = props || {};
      if (!p.url) throw new Error("Job feed sans URL source");
      const slug = String(p.slug || `job-${job.id.slice(0, 8)}`);
      const origin = new URL(p.url).origin;
      const sections = Array.isArray(p.sections) && p.sections.length > 0
        ? p.sections.join(",")
        : "Avis clients,Vidéos,Assistant IA,À proximité";
      const captureArgs = [
        "capture/capture_feed.py",
        "--url", String(p.url),
        "--slug", slug,
        "--label", String(p.label || slug),
        "--steps", String(p.steps || 6),
        "--origin", origin,
        "--fps", String(p.fps || 25),
        "--step-seconds", String(p.stepSeconds || 3),
        "--detail-seconds", String(p.detailSeconds || 21),
        "--sections", sections,
        "--dsf", String(p.dsf || 2),
        "--output-scale", String(p.outputScale || 1.5),
      ];
      // Le rail de CTA de gauche n'apparaît pas au montage (vertical et paysage).
      if (p.hideRail !== false) captureArgs.push("--hide-rail");
      // Paysage : on extrait en plus les frames vidéo 16:9 non recadrées, qui
      // occupent tout le cadre, la UI de la fiche étant superposée par-dessus.
      if (p.format === "landscape") {
        captureArgs.push("--wide");
      }
      console.log("🎥 Capture du feed :", captureArgs.join(" "));
      execFileSync("python3", captureArgs, {
        cwd: path.resolve(__dirname, ".."),
        stdio: "inherit",
        env: process.env,
      });

      // Rythme réglé en back-office : on patche le bloc timing du manifest.
      const manifestFile = path.resolve(__dirname, `../public/feed/${slug}/manifest.json`);
      const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf-8"));
      if (p.timing && typeof p.timing === "object") {
        manifest.timing = { ...manifest.timing, ...p.timing };
        fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));
      }
      props = {
        manifestPath: `feed/${slug}/manifest.json`,
        format: p.format === "landscape" ? "landscape" : "portrait",
      };
    }

    // --- Promo business : fond d'écran optionnel issu d'une capture feed
    // (URL /search). On réutilise exactement le même script de capture ; seul
    // le manifest est passé au template, qui n'en lit que les frames vidéo.
    const isPromo = String(job.template_id || "").startsWith("business-promo");
    if (isPromo && props?.bgFeedUrl) {
      const slug = `promo-${job.id.slice(0, 8)}`;
      const captureArgs = [
        "capture/capture_feed.py",
        "--url", String(props.bgFeedUrl),
        "--slug", slug,
        "--label", String(props.name || slug),
        "--steps", String(props.bgFeedSteps || 6),
        "--origin", new URL(props.bgFeedUrl).origin,
        "--fps", "25",
        "--step-seconds", "3",
        "--sections", "Avis clients",
        "--dsf", "2",
        "--output-scale", "1.5",
        "--hide-rail",
      ];
      console.log("🎥 Capture du fond feed :", captureArgs.join(" "));
      execFileSync("python3", captureArgs, {
        cwd: path.resolve(__dirname, ".."),
        stdio: "inherit",
        env: process.env,
      });
      props = { ...props, bgFeedManifest: `feed/${slug}/manifest.json` };
    }


    console.log("📦 Bundling Remotion...");
    const bundled = await bundle({
      entryPoint: path.resolve(__dirname, "../src/index.ts"),
      webpackOverride: (c) => c,
    });

    console.log("🌐 Ouverture Chrome...");
    const browser = await openBrowser("chrome", {
      browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      chromiumOptions: {
        args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
      },
      chromeMode: "chrome-for-testing",
    });

    const validCompositions = [
      "main", "corporate-vertical", "business-showcase", "comptoir-darna",
      "riad-dar-najat", "maison-brummell", "jnane-rumi", "agent-ia-demo",
      "agent-ia-demo-v2", "nar-complexe", "farasha-farmhouse", "bo-zin",
      "explainer-affiliates", "feed-template", "feed-template-landscape",
      "business-promo", "business-promo-landscape",
    ];
    let compositionId = job.template_id || "business-showcase";
    if (!validCompositions.includes(compositionId)) {
      console.log(`⚠️ Composition "${compositionId}" invalide, repli sur "business-showcase"`);
      compositionId = "business-showcase";
    }

    const composition = await selectComposition({
      serveUrl: bundled,
      id: compositionId,
      puppeteerInstance: browser,
      inputProps: props,
    });


    // Audio : activé si une bande son globale est définie ou si le fond continu doit garder son son
    const wantsAudio = Boolean(props?.soundtrackUrl) || Boolean(props?.continuousBgSound);
    console.log(`🔊 Audio ${wantsAudio ? "activé" : "désactivé"} (soundtrack=${Boolean(props?.soundtrackUrl)}, bgSound=${Boolean(props?.continuousBgSound)})`);

    console.log("🎥 Rendu...");
    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: "h264",
      outputLocation: outPath,
      puppeteerInstance: browser,
      muted: !wantsAudio,
      audioCodec: wantsAudio ? "aac" : undefined,
      enforceAudioTrack: wantsAudio,
      concurrency: 1,
      jpegQuality: 100,
      crf: 16,
      inputProps: props,
    });


    await browser.close({ silent: false });

    console.log("🚀 Upload via URL signée...");
    const buffer = fs.readFileSync(outPath);
    await uploadToSignedUrl(upload.signedUrl, buffer);

    const realDuration = getVideoDurationSeconds(outPath);
    if (realDuration) console.log(`⏱️ Durée réelle : ${realDuration}s`);

    console.log(`✅ Terminé : ${upload.publicUrl}`);
    await finalizeJob({
      job_id: job.id,
      status: "done",
      output_url: upload.publicUrl,
      duration_sec: realDuration,
    });

    fs.unlinkSync(outPath);
    return true;
  } catch (error) {
    console.error("❌ Erreur pendant le rendu :", error);
    await finalizeJob({
      job_id: job.id,
      status: "error",
      error_message: error?.message || String(error),
    });
    return true;
  }
}

async function processAllPending() {
  const maxJobs = parseInt(process.env.MAX_JOBS || "5", 10);
  for (let i = 0; i < maxJobs; i++) {
    const hadJob = await renderOne();
    if (!hadJob) return;
  }
}

processAllPending()
  .then(() => { console.log("👋 Fin du worker."); process.exit(0); })
  .catch((err) => { console.error("💥 Erreur fatale :", err); process.exit(1); });
