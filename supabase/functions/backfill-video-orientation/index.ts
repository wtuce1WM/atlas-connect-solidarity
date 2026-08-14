import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { assertStaff } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Mesure les dimensions réelles d'une vidéo MP4/MOV en ne téléchargeant que
 * quelques Ko : on lit l'atom `moov` → `trak` → `tkhd` (largeur/hauteur en
 * fixed-point 16.16) et la matrice de transformation (rotation 90/270 → swap).
 *
 * Aucun ffmpeg, aucun téléchargement complet : requêtes HTTP Range.
 */

const isMp4Like = (u: string) => /\.(mp4|m4v|mov)(\?|$)/i.test(u);

async function fetchRange(url: string, range: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { headers: { Range: `bytes=${range}` } });
    if (!res.ok && res.status !== 206) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

type Dims = { width: number; height: number };

/** Parcourt les boxes ISO-BMFF et renvoie les dimensions du premier track vidéo. */
function parseBoxes(buf: Uint8Array, start: number, end: number, depth = 0): Dims | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let off = start;
  while (off + 8 <= end) {
    let size = dv.getUint32(off);
    const type = String.fromCharCode(buf[off + 4], buf[off + 5], buf[off + 6], buf[off + 7]);
    let header = 8;
    if (size === 1) {
      if (off + 16 > end) return null;
      // 64-bit size : on ignore les 32 bits hauts (aucune box utile > 4 Go ici)
      size = Number(dv.getBigUint64(off + 8));
      header = 16;
    } else if (size === 0) {
      size = end - off;
    }
    if (size < header) return null;
    const bodyStart = off + header;
    const bodyEnd = Math.min(off + size, end);

    if (type === "moov" || type === "trak" || type === "mdia") {
      const found = parseBoxes(buf, bodyStart, bodyEnd, depth + 1);
      if (found) return found;
    } else if (type === "tkhd" && bodyEnd - bodyStart >= 84) {
      const version = buf[bodyStart];
      // version 0 : 4 (version+flags) + 4+4 (create/modify) + 4 (track id) + 4 (reserved) + 4 (duration)
      // version 1 : 4 + 8+8 + 4 + 4 + 8
      const afterDuration = bodyStart + (version === 1 ? 4 + 8 + 8 + 4 + 4 + 8 : 4 + 4 + 4 + 4 + 4 + 4);
      const matrixStart = afterDuration + 8 /* reserved */ + 2 /* layer */ + 2 /* alt group */ + 2 /* volume */ + 2 /* reserved */;
      const wOff = matrixStart + 36;
      if (wOff + 8 > bodyEnd) {
        off += size;
        continue;
      }
      const a = dv.getInt32(matrixStart) / 65536;
      const b = dv.getInt32(matrixStart + 4) / 65536;
      const w = dv.getUint32(wOff) / 65536;
      const h = dv.getUint32(wOff + 4) / 65536;
      if (w >= 1 && h >= 1) {
        const rotated = Math.abs(a) < 0.01 && Math.abs(b) > 0.99; // 90° ou 270°
        return rotated
          ? { width: Math.round(h), height: Math.round(w) }
          : { width: Math.round(w), height: Math.round(h) };
      }
    }
    off += size;
  }
  return null;
}

async function readDims(url: string): Promise<Dims | null> {
  if (!isMp4Like(url)) return null;
  // La plupart des fichiers ont `moov` en tête ; sinon il est en fin de fichier.
  const head = await fetchRange(url, "0-524287");
  if (head && head.length > 16) {
    const dims = parseBoxes(head, 0, head.length);
    if (dims) return dims;
  }
  const tail = await fetchRange(url, "-1048576");
  if (tail && tail.length > 16) {
    const dims = parseBoxes(tail, 0, tail.length);
    if (dims) return dims;
    // `moov` peut commencer avant la fenêtre : on cherche la signature brute
    for (let i = 0; i + 8 < tail.length; i++) {
      if (tail[i] === 0x6d && tail[i + 1] === 0x6f && tail[i + 2] === 0x6f && tail[i + 3] === 0x76) {
        const found = parseBoxes(tail, i + 4, tail.length);
        if (found) return found;
      }
    }
  }
  return null;
}

const orientationOf = (d: Dims) =>
  d.width > d.height * 1.05 ? "landscape" : d.height > d.width * 1.05 ? "portrait" : "square";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await assertStaff(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({} as any));
    const limit = Math.min(Number(body.limit) || 120, 400);
    const concurrency = Math.min(Number(body.concurrency) || 8, 16);
    const table: "business_documents" | "generic_videos" =
      body.table === "generic_videos" ? "generic_videos" : "business_documents";

    let query = supabase
      .from(table)
      .select("id, url")
      .is("orientation_checked_at", null)
      .not("url", "is", null)
      .limit(limit);
    if (table === "business_documents") query = query.eq("type", "video");

    const { data: rows, error } = await query;
    if (error) throw error;

    const todo = (rows ?? []).filter((r: any) => typeof r.url === "string" && isMp4Like(r.url));
    const skipped = (rows ?? []).length - todo.length;

    // Les URLs non-MP4 (YouTube, TikTok, embeds…) sont marquées comme vues pour
    // ne pas être re-tentées à chaque passage.
    for (const r of (rows ?? []) as any[]) {
      if (!todo.some((t: any) => t.id === r.id)) {
        await supabase
          .from(table)
          .update({ orientation: null, orientation_checked_at: new Date().toISOString() })
          .eq("id", r.id);
      }
    }

    let measured = 0;
    let failed = 0;
    const counts: Record<string, number> = { landscape: 0, portrait: 0, square: 0 };
    let cursor = 0;

    const worker = async () => {
      while (cursor < todo.length) {
        const row = todo[cursor++] as any;
        const dims = await readDims(row.url);
        const patch: Record<string, unknown> = { orientation_checked_at: new Date().toISOString() };
        if (dims) {
          const o = orientationOf(dims);
          patch.media_width = dims.width;
          patch.media_height = dims.height;
          patch.orientation = o;
          counts[o] = (counts[o] ?? 0) + 1;
          measured++;
        } else {
          failed++;
        }
        await supabase.from(table).update(patch).eq("id", row.id);
      }
    };

    await Promise.all(Array.from({ length: concurrency }, worker));

    const { count: remaining } = await (table === "business_documents"
      ? supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("type", "video")
          .is("orientation_checked_at", null)
      : supabase.from(table).select("id", { count: "exact", head: true }).is("orientation_checked_at", null));

    return json({ table, picked: (rows ?? []).length, measured, failed, skipped, counts, remaining });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
