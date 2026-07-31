// Studio Vidéo IA — assistant texte :
//  - action "from_video"  : synthétise un Titre + un Texte à partir d'une vidéo de l'établissement
//  - action "estimate"    : estime la durée nécessaire (secondes) pour un texte donné
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";
import { generateText } from "npm:ai";

const MODEL = "google/gemini-3.6-flash";

function estimateSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (!words) return 3;
  // lecture à l'écran ~2.3 mots/s + 1s d'entrée/sortie
  return Math.max(3, Math.min(60, Math.round(words / 2.3 + 1)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    if (action === "estimate") {
      const text = String(body?.text ?? "");
      if (!text.trim()) {
        return new Response(JSON.stringify({ error: "Texte requis" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      return Response.json(
        { seconds: estimateSeconds(text), words, chars: text.trim().length },
        { headers: corsHeaders },
      );
    }

    if (action !== "from_video") {
      return new Response(JSON.stringify({ error: "Action inconnue" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const businessId = body?.business_id ? String(body.business_id) : null;
    const videoId = body?.video_id ? String(body.video_id) : null; // youtube id
    const videoUrl = body?.video_url ? String(body.video_url) : null;
    const lang = body?.lang === "en" ? "en" : "fr";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let sourceTitle = body?.video_title ? String(body.video_title) : "";
    let durationSeconds: number | null = null;
    let priceType: string | null = null;
    let priceFree: string | null = null;

    if (videoId) {
      const { data } = await supabase
        .from("business_youtube_videos")
        .select("title,duration_seconds,video_id")
        .eq("video_id", videoId)
        .limit(1)
        .maybeSingle();
      if (data) {
        sourceTitle = data.title || sourceTitle;
        durationSeconds = data.duration_seconds ?? null;
      }
    }
    if (videoUrl) {
      const { data } = await supabase
        .from("business_documents")
        .select("name,price,price_type")
        .eq("url", videoUrl)
        .limit(1)
        .maybeSingle();
      if (data?.name && !sourceTitle) sourceTitle = data.name;
      priceType = (data?.price_type ?? null) as string | null;
      const raw = data?.price == null ? "" : String(data.price).trim();
      priceFree = raw ? raw : null;
    }

    const priceTypeLabel =
      priceType === "location"
        ? (lang === "en" ? "Rental" : "Location")
        : priceType === "vente"
          ? (lang === "en" ? "For sale" : "Vente")
          : null;
    const priceLine = [priceTypeLabel, priceFree ? `Prix: ${priceFree}` : null]
      .filter(Boolean)
      .join(" — ");

    let hook = "";
    let description = "";
    let name = "";
    if (businessId) {
      const { data: b } = await supabase
        .from("businesses")
        .select("name,hook_fr,hook_en,description,description_en")
        .eq("id", businessId)
        .maybeSingle();
      if (b) {
        name = b.name ?? "";
        hook = (lang === "en" ? b.hook_en || b.hook_fr : b.hook_fr) ?? "";
        description = (lang === "en" ? b.description_en || b.description : b.description) ?? "";
      }
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY manquant" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gateway = createLovableAiGatewayProvider(key);
    const plain = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200);

    const result = await generateText({
      model: gateway(MODEL),
      prompt: [
        lang === "en"
          ? "You write short, immersive video copy for a Morocco travel platform. Answer in English."
          : "Tu rédiges des textes courts et immersifs pour des vidéos verticales d'une plateforme de voyage au Maroc. Réponds en français.",
        "",
        `Établissement : ${name || "—"}`,
        `Hook existant : ${plain(hook) || "—"}`,
        `Description : ${plain(description) || "—"}`,
        `Titre de la vidéo source : ${sourceTitle || "—"}`,
        durationSeconds ? `Durée de la vidéo source : ${durationSeconds}s` : "",
        "",
        "Produis exactement 2 lignes, sans markdown, sans guillemets :",
        "TITRE: <un titre percutant, max 60 caractères>",
        "TEXTE: <un texte immersif de 2 à 3 phrases, max 320 caractères>",
      ].filter(Boolean).join("\n"),
    });

    const raw = (result.text ?? "").trim();
    const titleMatch = raw.match(/TITRE\s*:\s*(.+)/i) ?? raw.match(/TITLE\s*:\s*(.+)/i);
    const textMatch = raw.match(/TEXTE\s*:\s*([\s\S]+)/i) ?? raw.match(/TEXT\s*:\s*([\s\S]+)/i);
    const title = (titleMatch?.[1] ?? raw.split("\n")[0] ?? "").trim().slice(0, 60);
    const text = (textMatch?.[1] ?? "").trim().replace(/\s+/g, " ").slice(0, 320);

    return Response.json(
      {
        title,
        text,
        source_title: sourceTitle,
        source_duration_seconds: durationSeconds,
        estimated_seconds: estimateSeconds(`${title} ${text}`),
      },
      { headers: corsHeaders },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Erreur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
