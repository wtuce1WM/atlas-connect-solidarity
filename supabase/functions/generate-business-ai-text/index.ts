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
  very_short: { min: 320, max: 460, label: "très courte", paragraphs: "1 à 2 paragraphes" },
  short: { min: 700, max: 880, label: "courte", paragraphs: "2 à 3 paragraphes" },
  medium: { min: 1200, max: 1380, label: "moyenne", paragraphs: "3 à 4 paragraphes" },
  // max volontairement < MAX_CONTENT (2000) pour laisser une marge : sans ça,
  // le modèle vise pile la limite et la coupe dure tronquait la dernière phrase.
  long: { min: 1600, max: 1850, label: "longue", paragraphs: "4 à 6 paragraphes" },
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
  menu_links:
    "Objectif : rédiger à partir du contenu des menus / cartes fournis (plats, sections, spécialités, produits). Ne mentionne jamais de prix même s'ils figurent dans la source.",
  external_links:
    "Objectif : rédiger à partir du contenu des liens externes fournis (site web, boutique, PDF, flipbook, pages de réservation). N'utilise que ce qui figure dans ces sources.",
};

// Liens candidats « menus » et « liens externes » de la fiche.
const MENU_URL_KEYS = [
  ["menu_url", "Menu"],
  ["n", "Menu (lien)"],
  ["flipbook_url", "Flipbook"],
  ["pdf_url", "PDF 1"],
  ["pdf_2_url", "PDF 2"],
  ["pdf_3_url", "PDF 3"],
] as const;

const EXTERNAL_URL_KEYS = [
  ["website", "Site web"],
  ["online_shop_url", "Boutique en ligne"],
  ["reserve_now_url", "Réservation"],
  ["booking_url", "Booking"],
  ["other_booking_url", "Autre réservation"],
  ["glovo_url", "Glovo"],
  ["matterport_url", "Visite virtuelle"],
  ["url_4", "Lien 4"],
  ["url_5", "Lien 5"],
  ["url_6", "Lien 6"],
] as const;

const STYLE_BRIEFS: Record<string, string> = {
  default:
    "Style : rédaction éditoriale standard, français naturel, fluide et concret.",
  immersive:
    "Style : IMMERSIF et poétique. Écris une prose sensorielle (lumière, matières, sons, parfums, atmosphère), rythmée, à la deuxième personne du singulier ou en narration neutre. Reste ancré dans les faits fournis : aucune invention, mais une évocation.",
  factual:
    "Style : FACTUEL et linéaire. Restitue les informations détectées dans la source (sections, plats, produits, prestations, équipements, horaires) telles quelles, dans l'ordre de la source, en phrases courtes ou en énumérations séparées par des sauts de ligne. Aucune envolée littéraire, aucun adjectif promotionnel, aucun commentaire personnel.",
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
    const styleKey = STYLE_BRIEFS[String(body?.style ?? "")] ? String(body.style) : "default";
    const requestedUrls: string[] = Array.isArray(body?.urls)
      ? body.urls.map((u: unknown) => String(u ?? "").trim()).filter(Boolean).slice(0, 6)
      : [];


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
        `name, city, neighborhood, hook_fr, description, website, opening_hours, show_opening_hours, is_open_24h, vacation_dates, ${PLATFORM_URL_KEYS.map(([k]) => k).join(", ")}, ${MENU_URL_KEYS.map(([k]) => k).join(", ")}, ${EXTERNAL_URL_KEYS.map(([k]) => k).filter((k) => k !== "website").join(", ")}`,
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

    // Contexte factuel de la fiche : sans ça, une consigne complémentaire du type
    // « mets en avant les horaires » ne pouvait pas être suivie, la règle
    // « n'invente rien » interdisant au modèle de parler d'une donnée absente.
    const factsBlock = (() => {
      const lines: string[] = [];
      const oh = (biz as any).opening_hours;
      if ((biz as any).is_open_24h) lines.push("Ouvert 24h/24.");
      if (oh) {
        const txt = typeof oh === "string" ? oh : JSON.stringify(oh);
        if (txt && txt !== "{}" && txt !== "[]") lines.push(`Horaires d'ouverture : ${txt.slice(0, 900)}`);
      }
      const vac = (biz as any).vacation_dates;
      if (vac) {
        const txt = typeof vac === "string" ? vac : JSON.stringify(vac);
        if (txt && txt !== "{}" && txt !== "[]") lines.push(`Périodes de fermeture : ${txt.slice(0, 400)}`);
      }
      return lines.join("\n");
    })();

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
        const keys =
          mode === "menu_links" ? MENU_URL_KEYS : mode === "external_links" ? EXTERNAL_URL_KEYS : PLATFORM_URL_KEYS;
        let urls = keys
          .map(([k, label]) => [String((biz as any)[k] ?? "").trim(), label] as const)
          .filter(([u]) => !!u);
        // Sélection explicite côté affilié : on ne garde que les liens de la fiche.
        if (requestedUrls.length > 0) {
          const wanted = new Set(requestedUrls);
          const filtered = urls.filter(([u]) => wanted.has(u));
          if (filtered.length > 0) urls = filtered;
        }
        urls = urls.slice(0, 4);
        const emptyMsg =
          mode === "menu_links"
            ? "Aucun lien menu / carte détecté sur la fiche."
            : mode === "external_links"
              ? "Aucun lien externe détecté sur la fiche."
              : "Aucune fiche plateforme renseignée (onglet Avis clients).";
        if (urls.length === 0) {
          return new Response(JSON.stringify({ error: emptyMsg }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const parts = await Promise.all(
          urls.map(async ([u, label]) => {
            const md = await firecrawlScrape(u, fcKey);
            return md ? `### ${label} (${u})\n${md}` : "";
          }),
        );
        sourceBlock = parts.filter(Boolean).join("\n\n").slice(0, 16000);
        sourceLabel =
          mode === "menu_links"
            ? `menus ${urls.map(([, l]) => l).join(", ")}`
            : mode === "external_links"
              ? `liens ${urls.map(([, l]) => l).join(", ")}`
              : `fiches ${urls.map(([, l]) => l).join(", ")}`;
        if (!sourceBlock) {
          return new Response(
            JSON.stringify({ error: "Impossible de lire les liens fournis (contenu bloqué ou illisible)." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }


    const systemPrompt = `Tu rédiges des contenus éditoriaux pour One World Morocco, plateforme de découverte du Maroc.
${MODE_BRIEFS[mode]}
Règles absolues :
- N'invente RIEN : uniquement ce qui est présent dans les sources et les données de la fiche fournies.
- Ne mentionne jamais de prix, tarif, budget ou "moins cher".
- Français naturel et immersif, pas de markdown, pas de listes à puces, pas de guillemets superflus.
- Réponds STRICTEMENT en JSON : {"title": string, "hook": string, "content": string}
- title ≤ 70 caractères, hook ≤ 120 caractères.
- LONGUEUR IMPÉRATIVE du champ content : version ${len.label}, entre ${len.min} et ${len.max} caractères (${len.paragraphs} séparés par un saut de ligne). Ne descends jamais sous ${len.min} caractères et ne dépasse jamais ${Math.min(len.max, MAX_CONTENT - 100)} caractères.
- Le texte doit IMPÉRATIVEMENT se terminer par une phrase complète et ponctuée. Si tu approches la limite, conclus la phrase en cours au lieu de la couper.${
      extra
        ? `
CONSIGNE PRIORITAIRE DE L'ÉTABLISSEMENT (à respecter avant tout choix éditorial) : « ${extra} ».
Structure le texte autour de cette consigne : elle doit être traitée explicitement et occuper une place visible (dès le titre/l'accroche si pertinent), en t'appuyant sur les DONNÉES DE LA FICHE et les SOURCES. Si l'information demandée est absente des données fournies, dis-le sobrement dans le texte plutôt que de l'inventer, et traite l'angle le plus proche disponible.`
        : ""
    }`;

    const userPrompt = [
      `Établissement : ${biz.name}`,
      `Ville / quartier : ${[biz.city, biz.neighborhood].filter(Boolean).join(" — ") || "—"}`,
      `Accroche actuelle : ${plain(biz.hook_fr) || "—"}`,
      `Description actuelle : ${plain(biz.description).slice(0, 800) || "—"}`,
      extra ? `Consigne complémentaire de l'établissement (PRIORITAIRE) : ${extra}` : "",
      factsBlock ? `\nDONNÉES DE LA FICHE :\n${factsBlock}` : "",
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
        metadata: { mode, length: lengthKey },
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

    // Coupe uniquement sur une fin de phrase : évite les textes tronqués en
    // plein mot quand le modèle dépasse la limite de caractères.
    const cleanSentences = (s: unknown, max: number) => {
      const txt = String(s ?? "").replace(/^["'\s]+|["'\s]+$/g, "");
      if (txt.length <= max) return txt;
      const cut = txt.slice(0, max);
      const lastEnd = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"), cut.lastIndexOf("…"));
      if (lastEnd > max * 0.55) return cut.slice(0, lastEnd + 1).trim();
      const lastSpace = cut.lastIndexOf(" ");
      return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + ".";
    };

    return new Response(
      JSON.stringify({
        title: clean(parsed.title, 70),
        hook: clean(parsed.hook, 120),
        content: cleanSentences(parsed.content, MAX_CONTENT),
        mode,
        source_label: sourceLabel,
        length: lengthKey,
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
