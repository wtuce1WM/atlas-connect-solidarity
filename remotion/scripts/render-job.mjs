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

/**
 * Format et compression du rendu (`template_props.encode`, réglé en
 * back-office). Le repli n'est volontairement plus `crf: 16` : ce réglage
 * quasi-master produisait des fichiers de 20 à 50 Mo pour aucun gain visible.
 */
const ENCODE_FALLBACK = { crf: 28, scale: 1, audio: "keep", audioBitrate: "96k", jpegQuality: 90 };

function normalizeEncode(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const crf = Number.isFinite(Number(r.crf))
    ? Math.min(40, Math.max(14, Math.round(Number(r.crf))))
    : ENCODE_FALLBACK.crf;
  const scaleRaw = Number(r.scale);
  const scale = Number.isFinite(scaleRaw) && scaleRaw > 0 && scaleRaw <= 1 ? scaleRaw : 1;
  const audio = r.audio === "mute" ? "mute" : "keep";
  const audioBitrate = ["64k", "96k", "128k"].includes(String(r.audioBitrate))
    ? String(r.audioBitrate)
    : ENCODE_FALLBACK.audioBitrate;
  // Au-delà de CRF 26, une qualité JPEG de 100 sur les frames intermédiaires
  // ne sert plus à rien : x264 rejette l'information juste après.
  const jpegQuality = crf <= 22 ? 100 : crf <= 28 ? 90 : 80;
  return { crf, scale, audio, audioBitrate, jpegQuality };
}

/** Remux `+faststart` sans réencodage : indispensable pour la lecture progressive. */
function optimizeForWeb(videoPath) {
  const tmp = `${videoPath}.web.mp4`;
  try {
    const before = fs.statSync(videoPath).size;
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", videoPath, "-c", "copy", "-movflags", "+faststart", tmp], {
      stdio: "inherit",
    });
    fs.renameSync(tmp, videoPath);
    const after = fs.statSync(videoPath).size;
    console.log(`📦 Poids final : ${(after / 1024 / 1024).toFixed(2)} Mo (faststart appliqué, avant remux ${(before / 1024 / 1024).toFixed(2)} Mo)`);
  } catch (e) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    console.log(`⚠️ Remux faststart ignoré : ${e?.message || e}`);
  }
}

const MEDIA_EXT = /\.(mp4|mov|webm|m4v|ogv|jpe?g|png|webp|avif|gif|mp3|m4a|wav|aac)(\?|#|$)/i;
const DL_DIR = path.resolve(__dirname, "../public/dl");

function extOf(url) {
  const m = new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toLowerCase() : "bin";
}

/** URLs déjà en échec dans ce process : évite de réessayer 3× le même hôte mort. */
const FAILED_URLS = new Set();

/**
 * Contrôle d'intégrité d'un média téléchargé.
 * Un fichier tronqué (moov atom not found) ou une page d'erreur HTML enregistrée
 * en .mp4 passait le test `size > 0` et faisait planter ffprobe pendant le rendu.
 */
function validateMedia(dest, ext, expectedLength) {
  const size = fs.statSync(dest).size;
  if (size === 0) return "fichier vide";
  if (expectedLength && size !== expectedLength) {
    return `taille incomplète (${size}/${expectedLength} octets)`;
  }
  const head = fs.readFileSync(dest).subarray(0, 4096);
  if (/^\s*(<!doctype|<html|\{)/i.test(head.toString("latin1"))) {
    return "réponse HTML/JSON au lieu d'un média";
  }
  if (/^(mp4|mov|m4v|m4a)$/.test(ext)) {
    const txt = head.toString("latin1");
    if (!txt.includes("ftyp")) return "conteneur MP4 invalide (pas d'atome ftyp)";
    // L'atome `moov` peut être en fin de fichier : on le cherche sur tout le buffer.
    const all = fs.readFileSync(dest).toString("latin1");
    if (!all.includes("moov")) return "conteneur MP4 incomplet (pas d'atome moov)";
  }
  return null;
}

async function downloadMedia(url) {
  const key = Buffer.from(url).toString("base64url").slice(-40);
  const ext = extOf(url);
  const file = `${key}.${ext}`;
  const dest = path.join(DL_DIR, file);
  if (fs.existsSync(dest) && !validateMedia(dest, ext, null)) return `dl/${file}`;
  if (fs.existsSync(dest)) fs.rmSync(dest, { force: true });
  if (FAILED_URLS.has(url)) return null;
  if (!fs.existsSync(DL_DIR)) fs.mkdirSync(DL_DIR, { recursive: true });

  for (let attempt = 1; attempt <= 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    try {
      const r = await fetch(url, {
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; OWMRenderer/1.0)", Accept: "*/*" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const expected = Number(r.headers.get("content-length")) || 0;
      const buf = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(dest, buf);
      const problem = validateMedia(dest, ext, expected);
      if (problem) throw new Error(problem);
      console.log(`⬇️  Média internalisé (${(buf.length / 1048576).toFixed(1)} Mo) : ${url}`);
      return `dl/${file}`;
    } catch (e) {
      console.warn(`⚠️  Téléchargement échoué (essai ${attempt}/3) ${url} : ${e?.message || e}`);
      if (fs.existsSync(dest)) fs.rmSync(dest, { force: true });
    } finally {
      clearTimeout(timer);
    }
  }
  FAILED_URLS.add(url);
  console.warn(`⛔ Média ignoré (illisible) : ${url}`);
  return null;
}



/**
 * Réécrit récursivement toute URL média http(s) des props vers un fichier local.
 * Les **clés** d'objets sont réécrites elles aussi : `config.assetTrims` est
 * indexé par URL de média, et le template compare cette clé à l'URL du clip
 * (déjà internalisée). Sans réécriture des clés, les bornes Start/End saisies
 * dans « Médias du montage » n'étaient jamais appliquées au rendu.
 */
async function internalizeRemoteMedia(value) {
  if (typeof value === "string") {
    if (!/^https?:\/\//i.test(value) || !MEDIA_EXT.test(value)) return value;
    const local = await downloadMedia(value);
    return local ?? value;
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const v of value) out.push(await internalizeRemoteMedia(v));
    return out;
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const key = /^https?:\/\//i.test(k) && MEDIA_EXT.test(k)
        ? ((await downloadMedia(k)) ?? k)
        : k;
      out[key] = await internalizeRemoteMedia(v);
    }
    return out;
  }
  return value;
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
      let manifestDirty = false;
      if (p.timing && typeof p.timing === "object") {
        manifest.timing = { ...manifest.timing, ...p.timing };
        manifestDirty = true;
      }
      // Effets optionnels choisis en back-office (grain, vignette, light leaks,
      // tracé SVG, motion blur). Absents = aucun effet, rendu inchangé.
      if (p.effects && typeof p.effects === "object") {
        manifest.effects = p.effects;
        manifestDirty = true;
      }
      // Montage (5 options identiques à Promo business) : le template lit le
      // manifest, donc aucun prop supplémentaire à faire circuler.
      if (p.variant && p.variant !== "fullscreen") {
        manifest.mockup = {
          variant: String(p.variant),
          bg: p.mockupBg ?? null,
          browserUrl: p.browserUrl ?? null,
          splitSide: p.splitSide === "right" ? "right" : "left",
          title: p.label ?? null,
          subtitle: p.url ?? null,
        };
        manifestDirty = true;
      }
      if (manifestDirty) fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));

      props = {
        manifestPath: `feed/${slug}/manifest.json`,
        format: p.format === "landscape" ? "landscape" : "portrait",
      };
    }

    // --- Promo business : fond d'écran optionnel issu d'une capture feed
    // (URL /search). On réutilise exactement le même script de capture ; seul
    // le manifest est passé au template, qui n'en lit que les frames vidéo.
    const isPromo = String(job.template_id || "").startsWith("business-promo");
    if (isPromo) {
      // Un manifest transmis par le job (reste d'un rendu précédent) pointerait
      // vers une capture qui n'appartient pas à cet établissement : on ne garde
      // que celle capturée ci-dessous, et on purge le dossier de captures.
      const { bgFeedManifest: _stale, ...rest } = props || {};
      props = rest;
      const feedDir = path.resolve(__dirname, "../public/feed");
      if (fs.existsSync(feedDir)) fs.rmSync(feedDir, { recursive: true, force: true });
    }
    // Le décor feed sert uniquement de fond derrière un mockup : inutile de
    // lancer la capture Playwright pour un rendu plein écran.
    const wantsFeedBg =
      isPromo && !!props?.bgFeedUrl && ["mockup", "browser", "multi", "split"].includes(String(props?.variant || ""));
    if (wantsFeedBg) {
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
    // --- Internalisation des médias distants.
    // Le proxy interne de Remotion (localhost:3000/proxy?src=…) échoue en
    // delayRender() timeout dès qu'un hébergeur tiers est lent, refuse le
    // Range ou coupe la connexion depuis le runner GitHub (cas constaté :
    // mamounia.com). On télécharge donc chaque média distant dans public/dl/
    // et on réécrit la prop vers un chemin staticFile local.
    props = await internalizeRemoteMedia(props);

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
      "storyboard", "storyboard-landscape",

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


    // Audio : bande son globale, son du fond continu, ou voix off d'au moins une étape du storyboard
    const hasVoiceOver = Array.isArray(props?.sections)
      && props.sections.some((s) => {
        const v = s?.config?.voice;
        return v && v.enabled !== false && typeof v.url === "string" && v.url.trim().length > 0;
      });
    const encode = normalizeEncode(props?.encode);
    const wantsAudio = encode.audio !== "mute"
      && (Boolean(props?.soundtrackUrl) || Boolean(props?.continuousBgSound) || hasVoiceOver);
    console.log(`🔊 Audio ${wantsAudio ? "activé" : "désactivé"} (soundtrack=${Boolean(props?.soundtrackUrl)}, bgSound=${Boolean(props?.continuousBgSound)}, voix off=${hasVoiceOver}, option=${encode.audio})`);
    console.log(`🗜️ Compression : CRF ${encode.crf}, échelle ${Math.round(encode.scale * 100)} %, audio ${wantsAudio ? encode.audioBitrate : "supprimé"}`);

    console.log("🎥 Rendu...");
    // Le compositeur Remotion meurt parfois en extrayant une frame (proxy 500
    // → « Error: cancelled »), y compris sur un fichier valide déjà rendu avec
    // succès. On relance donc une fois avec un navigateur neuf avant d'abandonner.
    const runRender = (instance) =>
      renderMedia({
        composition,
        serveUrl: bundled,
        codec: "h264",
        outputLocation: outPath,
        puppeteerInstance: instance,
        muted: !wantsAudio,
        audioCodec: wantsAudio ? "aac" : undefined,
        audioBitrate: wantsAudio ? encode.audioBitrate : undefined,
        enforceAudioTrack: wantsAudio,
        concurrency: 1,
        jpegQuality: encode.jpegQuality,
        crf: encode.crf,
        scale: encode.scale,
        inputProps: props,
      });

    let activeBrowser = browser;
    try {
      await runRender(activeBrowser);
    } catch (e) {
      const msg = String(e?.message || e);
      const transient = /cancelled|extract frame|Target closed|Page crashed|compositor/i.test(msg);
      if (!transient) throw e;
      console.warn(`♻️  Crash compositeur détecté (${msg.slice(0, 120)}) — nouvelle tentative avec un navigateur neuf.`);
      try { await activeBrowser.close({ silent: true }); } catch { /* déjà mort */ }
      activeBrowser = await openBrowser("chrome", {
        browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
        chromeMode: "chrome-for-testing",
      });
      await runRender(activeBrowser);
    }

    // Streaming web : sans l'atome moov en tête, le lecteur attend le
    // téléchargement complet du fichier. Remux sans réencodage (sans perte).
    optimizeForWeb(outPath);




    await activeBrowser.close({ silent: false });

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
