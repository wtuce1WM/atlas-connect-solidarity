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
    const APIFLASH_KEY = Deno.env.get("APIFLASH_ACCESS_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!APIFLASH_KEY) throw new Error("APIFLASH_ACCESS_KEY non configurée");

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

    // Use our own player page (hosted on this Supabase project) so YouTube
    // embeds correctly. Capturing youtube.com/embed directly returns
    // "Error 153 Video player configuration error" because the origin is
    // not whitelisted for headless embeds.
    const playerUrl =
      `${SUPABASE_URL}/functions/v1/youtube-player-page` +
      `?id=${encodeURIComponent(youtubeId)}&t=${ts}`;

    // ApiFlash screenshot — wait 6s for YT IFrame API to load + seek + render.
    const apiflashUrl =
      `https://api.apiflash.com/v1/urltoimage` +
      `?access_key=${encodeURIComponent(APIFLASH_KEY)}` +
      `&url=${encodeURIComponent(playerUrl)}` +
      `&width=1280&height=720&format=jpeg&quality=92` +
      `&delay=6&fresh=true&response_type=image&no_cookie_banners=true`;

    console.log("[youtube-frame-capture] Calling ApiFlash", { youtubeId, ts });
    const shotRes = await fetch(apiflashUrl);
    if (!shotRes.ok) {
      const text = await shotRes.text();
      console.error("[youtube-frame-capture] ApiFlash error", shotRes.status, text);
      return new Response(JSON.stringify({ error: `ApiFlash ${shotRes.status}: ${text.slice(0, 200)}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const blob = await shotRes.blob();
    if (blob.size < 5_000) {
      return new Response(JSON.stringify({ error: "Capture vide / lecteur non chargé" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
