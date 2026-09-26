import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_ORIGIN = "https://oneworldmorocco.com";

// Sert le manifeste PWA d'un site vitrine /site/:slug, généré depuis les
// données de l'établissement (nom, photo principale). 404 si le site vitrine
// n'est pas activé : le navigateur retombe alors sur un simple raccourci.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const slug = new URL(req.url).searchParams.get("slug")?.trim().toLowerCase();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return new Response(JSON.stringify({ error: "slug invalide" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: biz } = await supabase
    .from("businesses")
    .select("id, name, images")
    .eq("slug", slug)
    .maybeSingle();
  if (!biz) return notFound();

  const { data: showcase } = await supabase
    .from("business_showcase_site")
    .select("enabled, hero_image_url")
    .eq("business_id", biz.id)
    .maybeSingle();
  if (!showcase?.enabled) return notFound();

  const pageUrl = `${SITE_ORIGIN}/site/${slug}`;
  const hero = showcase.hero_image_url || biz.images?.[0] || null;

  // Dar Najat garde ses icônes carrées dédiées et son nom court.
  const isDarNajat = slug === "riad-dar-najat";
  const icons = isDarNajat
    ? [192, 512].map((s) => ({
        src: `${SITE_ORIGIN}/pwa/riad-dar-najat/icon-${s}.png`,
        sizes: `${s}x${s}`,
        type: "image/png",
      }))
    : hero
      ? [{ src: hero, sizes: "any", type: hero.endsWith(".webp") ? "image/webp" : "image/jpeg" }]
      : [];

  const manifest = {
    id: pageUrl,
    name: biz.name,
    short_name: isDarNajat ? "Dar Najat" : biz.name,
    start_url: pageUrl,
    scope: pageUrl,
    display: "standalone",
    background_color: "#F7F1E8",
    theme_color: "#C04F17",
    lang: "fr",
    icons,
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=300",
    },
  });
});

function notFound() {
  return new Response(JSON.stringify({ error: "Site vitrine non activé" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
