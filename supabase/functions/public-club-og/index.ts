// Edge Function: public-club-og
// Renvoie les méta OG (title, description, image) pour un profil public Club
// à partir du nickname. Utilisé par le Worker Cloudflare pour réécrire les
// balises og:* des pages /u/:nickname lors des partages WhatsApp/FB/LinkedIn.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SITE_NAME = "ONE WORLD MOROCCO";
const BASE_URL = "https://oneworldmorocco.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/images/og-image.jpg`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Accepte ?nickname=xxx ou dernier segment du path (/public-club-og/xxx)
    let nickname = url.searchParams.get("nickname") || "";
    if (!nickname) {
      const parts = url.pathname.split("/").filter(Boolean);
      nickname = parts[parts.length - 1] || "";
      if (nickname === "public-club-og") nickname = "";
    }
    nickname = decodeURIComponent(nickname).trim();

    const fallback = {
      title: `${SITE_NAME} – Les meilleures adresses au Maroc`,
      description: "Hôtels, restaurants, activités et services sélectionnés au Maroc.",
      image: DEFAULT_OG_IMAGE,
      url: BASE_URL,
    };

    if (!nickname) {
      return json(fallback);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data, error } = await supabase
      .rpc("get_public_club_profile", { _nickname: nickname });

    if (error) {
      console.error("public-club-og rpc error:", error);
      return json(fallback);
    }

    const profile = Array.isArray(data) ? data[0] : data;
    if (!profile) {
      return json(fallback);
    }

    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
    const displayName = fullName || profile.nickname || nickname;
    const place = [profile.city, profile.country].filter(Boolean).join(", ");

    const title = `${displayName}${place ? ` – ${place}` : ""} | ${SITE_NAME}`;
    const description = (profile.description && String(profile.description).trim())
      ? String(profile.description).substring(0, 200)
      : `Découvrez le profil de ${displayName} sur ${SITE_NAME}.`;
    const image = profile.avatar_url || DEFAULT_OG_IMAGE;
    const pageUrl = `${BASE_URL}/u/${encodeURIComponent(profile.nickname || nickname)}`;

    return json({ title, description, image, url: pageUrl });
  } catch (err) {
    console.error("public-club-og error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
