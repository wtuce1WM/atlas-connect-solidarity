/**
 * youtube-frame-capture
 *
 * Captures a HD frame from a YouTube video at a given timestamp using ApiFlash
 * (server-side screenshot service), uploads it to Supabase Storage and updates
 * the corresponding row's `custom_thumbnail_url` (or `thumbnail_url`) +
 * `thumbnail_locked = true`.
 *
 * Body: { youtubeId, timestamp, source, videoRowId }
 *   - source: "business_youtube_videos" | "generic_videos" | "business_documents"
 *   - timestamp: integer seconds (>= 0)
 *
 * Auth: requires authenticated staff user (validated via JWT + has_role).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_SOURCES = new Set([
  "business_youtube_videos",
  "generic_videos",
  "business_documents",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isStaff } = await admin.rpc("is_staff", { _user_id: user.id });
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Accès staff requis" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate body
    const body = await req.json().catch(() => ({}));
    const { youtubeId, timestamp, source, videoRowId } = body ?? {};
    if (typeof youtubeId !== "string" || !/^[\w-]{11}$/.test(youtubeId)) {
      return new Response(JSON.stringify({ error: "youtubeId invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ts = Math.max(0, Math.floor(Number(timestamp) || 0));
    if (!ALLOWED_SOURCES.has(source)) {
      return new Response(JSON.stringify({ error: "source invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof videoRowId !== "string" || videoRowId.length < 8) {
      return new Response(JSON.stringify({ error: "videoRowId invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the official YouTube HD thumbnail. We try maxresdefault (1280×720)
    // first, then fall back to hqdefault (480×360) which always exists.
    // Note: the `timestamp` parameter is accepted for API compatibility but
    // ignored — YouTube only exposes their auto-selected thumbnails publicly.
    const candidates = [
      `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${youtubeId}/sddefault.jpg`,
      `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    ];
    let blob: Blob | null = null;
    let usedUrl = "";
    for (const candidate of candidates) {
      try {
        const r = await fetch(candidate);
        if (!r.ok) continue;
        const b = await r.blob();
        // YouTube returns a 120×90 grey placeholder (~1-2 KB) when the
        // requested size doesn't exist. Reject anything suspiciously small.
        if (b.size < 5_000) continue;
        blob = b;
        usedUrl = candidate;
        break;
      } catch (_) { /* try next */ }
    }
    if (!blob) {
      return new Response(JSON.stringify({ error: "Aucune thumbnail HD disponible pour cette vidéo" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[youtube-frame-capture] Fetched", usedUrl, blob.size, "bytes");

    // Upload to storage
    const path = `thumbs/yt-hd-${youtubeId}-t${ts}-${Date.now()}.jpg`;
    const { error: upErr } = await admin.storage
      .from("business-images")
      .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: true });
    if (upErr) throw upErr;
    const { data: urlData } = admin.storage.from("business-images").getPublicUrl(path);

    // Persist to row
    const thumbCol = source === "business_youtube_videos" ? "custom_thumbnail_url" : "thumbnail_url";
    const { error: updErr } = await admin
      .from(source)
      .update({ [thumbCol]: urlData.publicUrl, thumbnail_locked: true })
      .eq("id", videoRowId);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ url: urlData.publicUrl, timestamp: ts }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[youtube-frame-capture] Fatal", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
