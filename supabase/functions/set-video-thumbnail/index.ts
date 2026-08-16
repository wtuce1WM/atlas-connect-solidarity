// Affecte / verrouille la vignette d'une vidéo (business_documents ou generic_videos).
// Passe par le service role après vérification staff : évite les échecs RLS storage côté client.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "npm:@supabase/supabase-js@2";
import { assertStaff } from "../_shared/auth-helpers.ts";

const ALLOWED_SOURCES = ["business_documents", "generic_videos"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const guard = await assertStaff(req, corsHeaders);
    if (guard instanceof Response) return guard;

    const body = await req.json();
    const { videoId, source, action, locked, imageBase64, contentType, ext } = body ?? {};

    if (!videoId || !ALLOWED_SOURCES.includes(source)) {
      return json({ error: "videoId / source invalide" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Simple bascule du verrou
    if (action === "lock") {
      const { error } = await admin
        .from(source)
        .update({ thumbnail_locked: !!locked })
        .eq("id", videoId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, thumbnail_locked: !!locked });
    }

    if (!imageBase64) return json({ error: "imageBase64 manquant" }, 400);

    const bin = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
    const safeExt = (ext || "jpg").toString().replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
    const path = `thumbs/staff-${source}-${videoId}-${Date.now()}.${safeExt}`;

    const { error: upErr } = await admin.storage.from("business-images").upload(path, bin, {
      cacheControl: "31536000",
      upsert: true,
      contentType: contentType || "image/jpeg",
    });
    if (upErr) return json({ error: `upload: ${upErr.message}` }, 400);

    const { data: urlData } = admin.storage.from("business-images").getPublicUrl(path);

    const { error: updErr } = await admin
      .from(source)
      .update({ thumbnail_url: urlData.publicUrl, thumbnail_locked: true })
      .eq("id", videoId);
    if (updErr) return json({ error: `update: ${updErr.message}` }, 400);

    return json({ ok: true, thumbnail_url: urlData.publicUrl, thumbnail_locked: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
