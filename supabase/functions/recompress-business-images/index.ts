import { createClient } from "npm:@supabase/supabase-js@2";
import { assertStaff } from "../_shared/auth-helpers.ts";
import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
} from "https://deno.land/x/imagemagick_deno@0.0.31/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "business-images";
const MAX_DIM = 1920;
const QUALITY = 78;

let magickReady = false;
async function ensureMagick() {
  if (!magickReady) {
    await initializeImageMagick();
    magickReady = true;
  }
}

function parseStoragePath(url: string, bucketHost: string): string | null {
  try {
    const u = new URL(url);
    if (u.host !== bucketHost) return null;
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    return decodeURIComponent(u.pathname.slice(i + marker.length));
  } catch {
    return null;
  }
}

async function compress(bytes: Uint8Array): Promise<Uint8Array> {
  await ensureMagick();
  return await new Promise<Uint8Array>((resolve, reject) => {
    try {
      ImageMagick.read(bytes, (img) => {
        if (img.width > MAX_DIM || img.height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / img.width, MAX_DIM / img.height);
          img.resize(Math.round(img.width * ratio), Math.round(img.height * ratio));
        }
        img.quality = QUALITY;
        img.write(MagickFormat.Webp, (out) => resolve(new Uint8Array(out)));
      });
    } catch (e) {
      reject(e);
    }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await assertStaff(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const bucketHost = new URL(supabaseUrl).host;

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const businessId: string | undefined = body.business_id;
    const slug: string | undefined = body.slug;
    const dryRun = body.dry_run !== false; // safe default: dry run
    const minSizeKb: number = body.min_size_kb ?? 500;
    const limit: number = body.limit ?? 200;
    const revert: boolean = body.revert === true;

    if (!businessId && !slug) return json({ error: "business_id ou slug requis" }, 400);

    const sel = supabase.from("businesses").select("id, name, slug, images").limit(1);
    const { data: biz, error: bizErr } = businessId
      ? await sel.eq("id", businessId).maybeSingle()
      : await sel.eq("slug", slug!).maybeSingle();
    if (bizErr) throw bizErr;
    if (!biz) return json({ error: "Établissement introuvable" }, 404);

    // ---- REVERT ----
    if (revert) {
      const { data: logs } = await supabase
        .from("image_compression_log")
        .select("id, original_url, compressed_url, compressed_path, reverted_at")
        .eq("business_id", biz.id)
        .is("reverted_at", null);

      const images: string[] = [...(biz.images || [])];
      let restored = 0;
      for (const l of logs || []) {
        const idx = images.indexOf(l.compressed_url);
        if (idx !== -1) {
          images[idx] = l.original_url;
          restored++;
        }
        await supabase.storage.from(BUCKET).remove([l.compressed_path]);
        await supabase
          .from("image_compression_log")
          .update({ reverted_at: new Date().toISOString() })
          .eq("id", l.id);
      }
      if (restored > 0) await supabase.from("businesses").update({ images }).eq("id", biz.id);
      return json({ business: biz.name, reverted: restored });
    }

    // ---- SCAN ----
    const images: string[] = [...(biz.images || [])];
    const candidates: { index: number; url: string; path: string; sizeKb: number }[] = [];

    for (let i = 0; i < images.length; i++) {
      const url = images[i];
      const path = url ? parseStoragePath(url, bucketHost) : null;
      if (!path) continue;
      if (path.includes("/owm-compressed/")) continue;
      const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
      const file = path.slice(path.lastIndexOf("/") + 1);
      const { data: listed } = await supabase.storage.from(BUCKET).list(dir, {
        search: file,
        limit: 100,
      });
      const meta = listed?.find((f) => f.name === file);
      const sizeKb = Math.round(((meta?.metadata as any)?.size ?? 0) / 1024);
      if (sizeKb >= minSizeKb) candidates.push({ index: i, url, path, sizeKb });
    }

    candidates.sort((a, b) => b.sizeKb - a.sizeKb);
    const batch = candidates.slice(0, limit);

    if (dryRun) {
      return json({
        business: biz.name,
        slug: biz.slug,
        totalImages: images.length,
        candidates: batch.length,
        totalKb: batch.reduce((s, c) => s + c.sizeKb, 0),
        details: batch.map((c) => ({ path: c.path, sizeKb: c.sizeKb })),
        dryRun: true,
      });
    }

    // ---- COMPRESS ----
    const results: any[] = [];
    let savedKb = 0;
    for (const c of batch) {
      try {
        const { data: file, error: dlErr } = await supabase.storage.from(BUCKET).download(c.path);
        if (dlErr || !file) throw dlErr ?? new Error("download failed");
        const src = new Uint8Array(await file.arrayBuffer());
        const out = await compress(src);
        const newKb = Math.round(out.byteLength / 1024);
        if (out.byteLength >= src.byteLength) {
          results.push({ path: c.path, skipped: "pas de gain", sizeKb: c.sizeKb });
          continue;
        }
        const dir = c.path.includes("/") ? c.path.slice(0, c.path.lastIndexOf("/")) : "";
        const base = c.path.slice(c.path.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "");
        const newPath = `${dir ? dir + "/" : ""}owm-compressed/${base}.webp`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(newPath, out, { contentType: "image/webp", upsert: true });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
        images[c.index] = pub.publicUrl;

        await supabase.from("image_compression_log").insert({
          business_id: biz.id,
          original_url: c.url,
          original_path: c.path,
          original_size_kb: c.sizeKb,
          compressed_url: pub.publicUrl,
          compressed_path: newPath,
          compressed_size_kb: newKb,
        });

        savedKb += c.sizeKb - newKb;
        results.push({ path: c.path, fromKb: c.sizeKb, toKb: newKb, newPath });
      } catch (e) {
        results.push({ path: c.path, error: String((e as Error)?.message ?? e) });
      }
    }

    await supabase.from("businesses").update({ images }).eq("id", biz.id);

    return json({
      business: biz.name,
      slug: biz.slug,
      processed: results.filter((r) => r.newPath).length,
      savedMb: Math.round((savedKb / 1024) * 100) / 100,
      results,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
