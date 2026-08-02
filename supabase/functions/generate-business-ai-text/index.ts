// Génère un texte IA (Titre + Accroche + Texte ≤ 2000 caractères) pour un établissement.
// 4 modes :
//  - reviews_suggestions : suggestions exprimées par les clients dans les avis
//  - reviews_pros_cons   : pour / contre d'après les avis
//  - google_search       : recherche web "Nom + Ville" (Firecrawl search)
//  - platform_pages      : lecture des fiches des plateformes renseignées (Firecrawl scrape)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "npm:@supabase/supabase-js@2";
import { assertStaffOrAffiliateBusiness } from "../_shared/auth-helpers.ts";
import { fetchAiGateway, GATEWAY_URL, resolveCallerContext } from "../_shared/ai-gateway.ts";

const MODEL = "openai/gpt-5.6-sol";
const MAX_CONTENT = 2000;

const PLATFORM_URL_KEYS = [
  ["google_reviews_url", "Google"],
  ["tripadvisor_review_url", "TripAdvisor"],
  ["restaurant_guru_url", "Restaurant Guru"],
  ["getyourguide_url", "GetYourGuide"],
  ["viator_url", "Viator"],
  ["tourradar_url", "TourRadar"],
  ["avis_verifies_url", "Avis Vérifiés"],
  ["trustpilot_url", "Trustpilot"],
  ["kayak_url", "Kayak"],
] as const;

const LENGTH_SPECS: Record<string, { min: number; max: number; label: string; paragraphs: string }> = {
  very_short: { min: 320, max: 480, label: "très courte", paragraphs: "1 à 2 paragraphes" },
  short: { min: 700, max: 900, label: "courte", paragraphs: "2 à 3 paragraphes" },
  medium: { min: 1200, max: 1400, label: "moyenne", paragraphs: "3 à 4 paragraphes" },
  long: { min: 1750, max: 2000, label: "longue", paragraphs: "4 à 6 paragraphes" },
};

const MODE_BRIEFS: Record<string, string> = {
  reviews_suggestions:
    "Objectif : mettre en avant ce que les clients suggèrent, recommandent ou conseillent de faire/goûter/réserver sur place, uniquement d'après les avis fournis.",
  reviews_pros_cons:
    "Objectif : présenter honnêtement les points forts puis les points d'attention (pour / contre) d'après les avis fournis. Reste factuel et bienveillant, sans exagérer les défauts.",
  google_search:
    "Objectif : rédiger une présentation immersive à partir des résultats de recherche web fournis (presse, blogs, annuaires). N'utilise que ce qui figure dans les extraits.",
  platform_pages:
    "Objectif : rédiger une présentation immersive à partir du contenu des fiches des plateformes fournies (descriptions, équipements, spécialités).",
};

async function firecrawlSearch(query: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 6 }),
  });
  if (!res.ok) throw new Error(`Firecrawl search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const items: any[] = json?.data ?? [];
  return items
    .map((it, i) => `[${i + 1}] ${it.title ?? ""} — ${it.url ?? ""}\n${(it.description ?? it.markdown ?? "").slice(0, 900)}`)
    .join("\n\n")
    .slice(0, 12000);
}

async function firecrawlScrape(url: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, timeout: 25000 }),
  });
  if (!res.ok) return "";
  const json = await res.json();
  return String(json?.data?.markdown ?? "").slice(0, 4000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const businessId = body?.business_id ? String(body.business_id) : "";
    const mode = String(body?.mode ?? "");
    const extra = String(body?.extra_instructions ?? "").slice(0, 500);
    const lengthKey = LENGTH_SPECS[String(body?.length ?? "")] ? String(body.length) : "short";
    const len = LENGTH_SPECS[lengthKey];

    if (!businessId || !MODE_BRIEFS[mode]) {
      return new Response(JSON.stringify({ error: "business_id et mode valides requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = await assertStaffOrAffiliateBusiness(req, corsHeaders, businessId);
    if (auth instanceof Response) return auth;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY non configuré" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: biz } = await supabase
      .from("businesses")
      .select(
        `name, city, neighborhood, hook_fr, description, website, ${PLATFORM_URL_KEYS.map(([k]) => k).join(", ")}`,
      )
      .eq("id", businessId)
      .maybeSingle();

    if (!biz) {
      return new Response(JSON.stringify({ error: "Établissement introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plain = (s: string | null | undefined) =>
      String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    let sourceBlock = "";
    let sourceLabel = "";

    if (mode === "reviews_suggestions" || mode === "reviews_pros_cons") {
      const { data: reviews } = await supabase
        .from("reviews")
        .select("source, rating, text")
        .eq("business_id", businessId)
        .not("text", "is", null)
        .order("published_at", { ascending: false })
        .limit(120);
      if (!reviews || reviews.length < 3) {
        return new Response(
          JSON.stringify({ error: `Pas assez d'avis avec texte (${reviews?.length ?? 0}). Récupérez d'abord les avis.` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      sourceLabel = `${reviews.length} avis clients`;
      sourceBlock = reviews
        .map((r, i) => `[${i + 1}] (${r.source}, ${r.rating}/5) ${plain(r.text).slice(0, 600)}`)
        .join("\n")
        .slice(0, 24000);
    } else {
      const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (!fcKey) {
        return new Response(JSON.stringify({ error: "Recherche web indisponible (Firecrawl non configuré)" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (mode === "google_search") {
        const query = `${biz.name} ${biz.city ?? ""}`.trim();
        sourceLabel = `recherche web « ${query} »`;
        sourceBlock = await firecrawlSearch(query, fcKey);
      } else {
        const urls = PLATFORM_URL_KEYS
          .map(([k, label]) => [String((biz as any)[k] ?? "").trim(), label] as const)
          .filter(([u]) => !!u)
          .slice(0, 4);
        if (urls.length === 0) {
          return new Response(
            JSON.stringify({ error: "Aucune fiche plateforme renseignée (onglet Avis clients)." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const parts = await Promise.all(
          urls.map(async ([u, label]) => {
            const md = await firecrawlScrape(u, fcKey);
            return md ? `### ${label} (${u})\n${md}` : "";
          }),
        );
        sourceBlock = parts.filter(Boolean).join("\n\n").slice(0, 16000);
        sourceLabel = `fiches ${urls.map(([, l]) => l).join(", ")}`;
        if (!sourceBlock) {
          return new Response(
            JSON.stringify({ error: "Impossible de lire les fiches plateformes (contenu bloqué)." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    const systemPrompt = `Tu rédiges des contenus éditoriaux pour One World Morocco, plateforme de découverte du Maroc.
${MODE_BRIEFS[mode]}
Règles absolues :
- N'invente RIEN : uniquement ce qui est présent dans les sources fournies.
- Ne mentionne jamais de prix, tarif, budget ou "moins cher".
- Français naturel et immersif, pas de markdown, pas de listes à puces, pas de guillemets superflus.
- Réponds STRICTEMENT en JSON : {"title": string, "hook": string, "content": string}
- title ≤ 70 caractères, hook ≤ 120 caractères.
- LONGUEUR IMPÉRATIVE du champ content : version ${len.label}, entre ${len.min} et ${len.max} caractères (${len.paragraphs} séparés par un saut de ligne). Ne descends jamais sous ${len.min} caractères et ne dépasse jamais ${Math.min(len.max, MAX_CONTENT)} caractères. Compte les caractères avant de répondre.`;

    const userPrompt = [
      `Établissement : ${biz.name}`,
      `Ville / quartier : ${[biz.city, biz.neighborhood].filter(Boolean).join(" — ") || "—"}`,
      `Accroche actuelle : ${plain(biz.hook_fr) || "—"}`,
      `Description actuelle : ${plain(biz.description).slice(0, 800) || "—"}`,
      extra ? `Consigne complémentaire de l'établissement : ${extra}` : "",
      "",
      `SOURCES (${sourceLabel}) :`,
      sourceBlock,
    ].filter(Boolean).join("\n");

    const { userId, affiliateId } = await resolveCallerContext(supabase, auth.userId);

    const resp = await fetchAiGateway(
      GATEWAY_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          reasoning_effort: "none",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      },
      {
        supabase,
        userId,
        affiliateId,
        businessId,
        context: "affiliate_ai_text",
        model: MODEL,
        metadata: { mode },
      },
    );

    if (!resp.ok) {
      const errText = (await resp.text()).slice(0, 300);
      const status = resp.status === 429 ? 429 : resp.status === 402 ? 402 : 500;
      const message =
        status === 429
          ? "Trop de requêtes IA, réessayez dans un instant."
          : status === 402
            ? "Crédits IA épuisés."
            : `Erreur IA : ${errText}`;
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { title: "", hook: "", content: String(raw) };
    }

    const clean = (s: unknown, max: number) =>
      String(s ?? "").replace(/^["'\s]+|["'\s]+$/g, "").slice(0, max);

    return new Response(
      JSON.stringify({
        title: clean(parsed.title, 70),
        hook: clean(parsed.hook, 120),
        content: clean(parsed.content, MAX_CONTENT),
        mode,
        source_label: sourceLabel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Erreur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
