// Worker simple — à déployer hors de Lovable (Render/Fly/Railway/VPS).
//
// Variables d'environnement requises :
//   SUPABASE_URL                = https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   = clé service_role (NE PAS exposer côté client)
//   REMOTION_ENTRY              = chemin vers remotion/src/index.ts (relatif au worker)
//   REMOTION_COMPOSITION_ID     = "studio-signature" (à déclarer dans Root.tsx)
//   POLL_INTERVAL_MS            = défaut 5000
//
// Usage : `node worker.mjs`

import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { readFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  REMOTION_ENTRY = "../src/index.ts",
  REMOTION_COMPOSITION_ID = "studio-signature",
  POLL_INTERVAL_MS = "5000",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = "studio-videos";

async function pickJob() {
  const { data, error } = await supabase
    .from("video_jobs")
    .update({ status: "rendering" })
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .select()
    .maybeSingle();
  if (error) console.error("pickJob error", error);
  return data;
}

async function renderJob(job) {
  const dir = mkdtempSync(join(tmpdir(), "studio-"));
  const out = join(dir, `${job.id}.mp4`);
  const propsFile = join(dir, "props.json");
  await import("node:fs/promises").then((fs) =>
    fs.writeFile(propsFile, JSON.stringify(job.scenario_json ?? {}))
  );

  // Lance Remotion CLI
  execSync(
    `npx remotion render ${REMOTION_ENTRY} ${REMOTION_COMPOSITION_ID} ${out} --props=${propsFile}`,
    { stdio: "inherit" }
  );

  const buf = readFileSync(out);
  const path = `${job.id}.mp4`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: "video/mp4", upsert: true });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  unlinkSync(out);

  await supabase
    .from("video_jobs")
    .update({ status: "done", output_url: pub.publicUrl })
    .eq("id", job.id);
}

async function loop() {
  while (true) {
    try {
      const job = await pickJob();
      if (job) {
        console.log("Rendering job", job.id);
        try {
          await renderJob(job);
          console.log("Done", job.id);
        } catch (e) {
          console.error("Render failed", e);
          await supabase
            .from("video_jobs")
            .update({ status: "error", error_message: String(e?.message ?? e) })
            .eq("id", job.id);
        }
      } else {
        await new Promise((r) => setTimeout(r, Number(POLL_INTERVAL_MS)));
      }
    } catch (e) {
      console.error("loop error", e);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

loop();
