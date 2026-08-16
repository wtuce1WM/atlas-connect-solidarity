// Route « curatée » (Classe A, zéro token) — autorité des entrées choisies en backoffice.
//
// Portée verbatim depuis embed-ai-chat (v1) pour que les deux moteurs partagent
// exactement la même logique :
//   1. lecture des cibles d'une suggestion / relance (blog_post_ids, business_ids, mode…)
//   2. liens par établissement (business_embed_ai_item_links)
//   3. rendu éditorial d'un article de blog (ARTICLE_CARD + entrées classées + disclosure)
//   4. corpus clos : uniquement les business_ids épinglés, dans l'ordre défini
//
// Règle : quand une cible curatée existe, ni le classifieur ni le résolveur
// taxonomique ne doivent pouvoir la remplacer ou la « compléter ».
import { stripText } from "./nearby.ts";
import { CTA_SELECT_FIELDS, ctaFieldsOf } from "./shared.ts";
import { buildImmersiveLines } from "./immersive.ts";
import type { CompetitorGuard } from "./competitors.ts";

export type Lang = "fr" | "en" | "ar";

export type BlogRow = {
  id: string; slug: string;
  title_fr: string | null; title_en: string | null; title_ar: string | null;
  custom_hero_image_url: string | null; cover_image_url: string | null;
  anchor_business_id: string | null;
  /** "video_feed" = page vidéo éditoriale (/videos/:slug), sinon article de blog. */
  kind?: "blog" | "video_feed";
};

let BLOG_CACHE: { at: number; items: BlogRow[] } | null = null;
export async function fetchBlogPostsCached(admin: any): Promise<BlogRow[]> {
  const now = Date.now();
  if (BLOG_CACHE && now - BLOG_CACHE.at < 5 * 60 * 1000) return BLOG_CACHE.items;
  const { data } = await admin
    .from("blog_posts")
    .select("id, slug, title_fr, title_en, title_ar, custom_hero_image_url, cover_image_url, anchor_business_id")
    .eq("is_published", true)
    .limit(300);
  const { data: vfeeds } = await admin
    .from("video_feed_pages")
    .select("id, slug, hero_title_bottom_fr, hero_title_bottom_en, hero_title_bottom_ar, cover_image_url, custom_hero_image_url")
    .eq("is_published", true)
    .limit(200);
  const videoRows: BlogRow[] = ((vfeeds as any[]) || []).map((v) => ({
    id: v.id, slug: v.slug,
    title_fr: v.hero_title_bottom_fr, title_en: v.hero_title_bottom_en, title_ar: v.hero_title_bottom_ar,
    custom_hero_image_url: v.custom_hero_image_url, cover_image_url: v.cover_image_url,
    anchor_business_id: null, kind: "video_feed",
  }));
  BLOG_CACHE = { at: now, items: [...(((data as BlogRow[]) || []).map((r) => ({ ...r, kind: "blog" as const }))), ...videoRows] };
  return BLOG_CACHE.items;
}

const BLOG_STOPWORDS = new Set<string>([
  "le","la","les","un","une","des","de","du","au","aux","en","sur","dans","ou","et","pour","avec",
  "a","à","d","l","s","c","que","qui","quoi","où","est","sont","ce","ces","cet","cette","mon","ma","mes",
  "the","an","of","to","in","on","at","and","or","for","with","near","close","by",
  "plus","proche","proches","autour",
  "je","tu","il","elle","nous","vous","ils","elles","me","te","se","moi","toi",
  "veux","voudrais","cherche","chercher","trouver","montre","montrer","voir",
  "comment","quel","quelle","quels","quelles","what","which","how",
  "marrakech","marrakesh","essaouira","casablanca","rabat","tanger","tangier",
  "fes","fez","agadir","chefchaouen","ouarzazate","meknes","meknès","oujda",
  "morocco","maroc","maghreb",
]);

function tokenizeForBlog(s: string): string[] {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !BLOG_STOPWORDS.has(t));
}

export function matchBlogArticle(
  userText: string, lang: Lang, posts: BlogRow[], hostId: string, hostName?: string | null,
): BlogRow | null {
  const hostTokens = new Set(tokenizeForBlog(hostName || ""));
  const stripHost = (tokens: string[]) => tokens.filter((t) => !hostTokens.has(t));
  const qTokens = new Set(stripHost(tokenizeForBlog(userText)));
  if (qTokens.size < 2) return null;
  let best: { row: BlogRow; score: number } | null = null;
  for (const p of posts) {
    const titles = [p.title_fr, p.title_en, p.title_ar].filter(Boolean) as string[];
    if (!titles.length) continue;
    let bestForRow = 0;
    for (const t of titles) {
      const tTokens = new Set(stripHost(tokenizeForBlog(t)));
      if (tTokens.size < 2) continue;
      let overlap = 0;
      for (const w of qTokens) if (tTokens.has(w)) overlap++;
      if (overlap < 2) continue;
      const score = overlap / Math.min(qTokens.size, tTokens.size);
      if (score > bestForRow) bestForRow = score;
    }
    if (bestForRow < 0.5) continue;
    const finalScore = bestForRow + (p.anchor_business_id === hostId ? 0.15 : 0);
    if (!best || finalScore > best.score) best = { row: p, score: finalScore };
  }
  return best ? best.row : null;
}

export type CuratedTargets = {
  blogPostIds: string[];
  pinnedBusinessIds: string[];
  subcategoryNames: string[];
  /** Noms de services curatés → filtre dur sur businesses.services */
  serviceNames: string[];
  badgeIds: string[];
  /** Valeurs de commodités (sans le préfixe « Logistique: ») → filtre dur sur businesses.engagements */
  commodities: string[];
  destinationIds: string[];
  /** Périmètre géo défini par l'entrée curatée elle-même (null = aucun filtre ville) */
  city: string | null;
  mode: string | null;
  /** Route imposée en back-office (`route_override`) : la relance gagne sur la suggestion. */
  routeOverride: string | null;
  /** Rayon imposé par la relance (km), null = rayon de l'hôte. */
  radiusKm: number | null;
  label: string | null;
  aiTexts: Array<{ title: string; hook: string; content: string }>;
};

const EMPTY_TARGETS: CuratedTargets = {
  blogPostIds: [], pinnedBusinessIds: [], subcategoryNames: [], serviceNames: [], badgeIds: [], commodities: [],
  destinationIds: [], city: null, mode: null, routeOverride: null, radiusKm: null, label: null, aiTexts: [],
};




/** Lit les cibles curatées d'une suggestion / relance + les liens propres à l'établissement. */
export async function loadCuratedTargets(
  admin: any,
  opts: { suggestionId?: string | null; followupId?: string | null; businessId?: string | null },
): Promise<CuratedTargets> {
  const suggestionId = opts.suggestionId || null;
  const followupId = opts.followupId || null;
  if (!suggestionId && !followupId) return { ...EMPTY_TARGETS };
  const out: CuratedTargets = { ...EMPTY_TARGETS, blogPostIds: [], pinnedBusinessIds: [], subcategoryNames: [], serviceNames: [], badgeIds: [], destinationIds: [], city: null, aiTexts: [] };

  if (suggestionId) {
    try {
      const { data: sugg } = await admin
        .from("ai_suggestions")
        .select("subcategory_ids, service_ids, badge_ids, commodity_filters, business_ids, destination_ids, blog_post_ids, city, mode, route_override, label_fr, label_en, label_ar")
        .eq("id", suggestionId)
        .maybeSingle();
      if (sugg) {
        out.mode = (sugg.mode as string | null) || null;
        out.routeOverride = (String(sugg.route_override || "").trim() || null);
        out.city = (String(sugg.city || "").trim() || null);
        out.label = (sugg.label_fr || sugg.label_en || sugg.label_ar || null) as string | null;

        out.badgeIds = Array.isArray(sugg.badge_ids) ? sugg.badge_ids.filter(Boolean) : [];
        out.commodities = Array.isArray(sugg.commodity_filters) ? sugg.commodity_filters.filter(Boolean) : [];
        out.destinationIds = Array.isArray(sugg.destination_ids) ? sugg.destination_ids.filter(Boolean) : [];
        if (!followupId) {
          out.pinnedBusinessIds = Array.isArray(sugg.business_ids) ? sugg.business_ids.filter(Boolean) : [];
          out.blogPostIds = Array.isArray(sugg.blog_post_ids) ? sugg.blog_post_ids.filter(Boolean) : [];
        }

        const subIds: string[] = Array.isArray(sugg.subcategory_ids) ? sugg.subcategory_ids.filter(Boolean) : [];
        if (subIds.length) {
          const { data: subs } = await admin.from("subcategories").select("name_fr").in("id", subIds);
          out.subcategoryNames = (subs || []).map((s: any) => s.name_fr).filter(Boolean);
        }

        const svcIds: string[] = Array.isArray(sugg.service_ids) ? sugg.service_ids.filter(Boolean) : [];
        if (svcIds.length) {
          const { data: svcs } = await admin.from("services").select("name_fr").in("id", svcIds);
          // Dédup par nom : la table `services` contient des doublons de nom (1 ligne par sous-catégorie).
          const seenSvc = new Set<string>();
          out.serviceNames = (svcs || [])
            .map((s: any) => String(s?.name_fr || "").trim())
            .filter((n: string) => {
              if (!n) return false;
              const k = n.toLowerCase();
              if (seenSvc.has(k)) return false;
              seenSvc.add(k);
              return true;
            });

        }
      }
    } catch (e) {
      console.error("[curated] suggestion_lookup_error", String(e));
    }
  }

  // Relance : elle est la SEULE autorité. Une relance n'est jamais un ré-exécution
  // de la suggestion parente : on n'hérite donc d'aucun filtre taxonomique du parent
  // (badges, sous-catégories, services, commodités, destinations). Sans quoi la
  // branche « filtre curaté » court-circuitait les routes déterministes de la relance
  // (météo, réservation, horaires, distances…). Seuls les réglages propres de la
  // relance comptent ; le contexte des résultats précédents est porté par les
  // marqueurs de conversation (KNOWN_BUSINESSES / POOL_BUSINESS_IDS).
  if (followupId) {
    try {
      const { data: fup } = await admin
        .from("ai_followups")
        // `ai_followups` n'a PAS de colonne `service_ids` : la demander faisait
        // échouer toute la requête (data null) et perdait `mode` / `route_override`.
        .select("mode, route_override, city, radius_km, label_fr, label_en, label_ar, badge_ids, subcategory_ids, commodity_filters, business_ids, destination_ids")
        .eq("id", followupId)
        .maybeSingle();

      // Réinitialisation des filtres hérités du parent.
      out.badgeIds = [];
      out.commodities = [];
      out.destinationIds = [];
      out.subcategoryNames = [];
      out.serviceNames = [];
      out.pinnedBusinessIds = [];

      if (fup) {
        const fRoute = String(fup.route_override || "").trim();
        if (fRoute) out.routeOverride = fRoute;
        const fMode = String(fup.mode || "").trim();
        if (fMode) out.mode = fMode;
        const fCity = String(fup.city || "").trim();
        if (fCity) out.city = fCity;
        out.radiusKm = typeof fup.radius_km === "number" ? fup.radius_km : null;
        out.label = (fup.label_fr || fup.label_en || fup.label_ar || out.label || null) as string | null;

        // Filtres propres à la relance (s'ils existent).
        out.badgeIds = Array.isArray(fup.badge_ids) ? fup.badge_ids.filter(Boolean) : [];
        out.commodities = Array.isArray(fup.commodity_filters) ? fup.commodity_filters.filter(Boolean) : [];
        out.destinationIds = Array.isArray(fup.destination_ids) ? fup.destination_ids.filter(Boolean) : [];
        out.pinnedBusinessIds = Array.isArray(fup.business_ids) ? fup.business_ids.filter(Boolean) : [];

        const fSubIds: string[] = Array.isArray(fup.subcategory_ids) ? fup.subcategory_ids.filter(Boolean) : [];
        if (fSubIds.length) {
          const { data: subs } = await admin.from("subcategories").select("name_fr").in("id", fSubIds);
          out.subcategoryNames = (subs || []).map((s: any) => s.name_fr).filter(Boolean);
        }

        // Pas de services propres à une relance (colonne inexistante).
        out.serviceNames = [];

      }
    } catch (e) {
      console.error("[curated] followup_lookup_error", String(e));
    }
  }




  // Liens curatés par établissement (onglet affilié « Agent IA ») : ils gagnent
  // sur les mappings staff génériques car l'owner les a choisis pour ce widget.
  try {
    const linkKind = followupId ? "followup" : "suggestion";
    const linkItemId = followupId || suggestionId;
    if (linkItemId && opts.businessId) {
      const { data: link } = await admin
        .from("business_embed_ai_item_links")
        .select("blog_post_ids, ai_text_ids")
        .eq("business_id", opts.businessId)
        .eq("item_kind", linkKind)
        .eq("item_id", linkItemId)
        .maybeSingle();
      const linkedBlogIds: string[] = Array.isArray(link?.blog_post_ids) ? link!.blog_post_ids.filter(Boolean) : [];
      if (linkedBlogIds.length) out.blogPostIds = [...new Set([...linkedBlogIds, ...out.blogPostIds])];
      const textIds: string[] = Array.isArray(link?.ai_text_ids) ? link!.ai_text_ids.filter(Boolean) : [];
      if (textIds.length) {
        const { data: txts } = await admin
          .from("business_ai_texts")
          .select("title, hook, content, position")
          .in("id", textIds)
          .order("position", { ascending: true });
        out.aiTexts = (txts || [])
          .map((t: any) => ({
            title: String(t?.title || "").trim(),
            hook: String(t?.hook || "").trim(),
            content: String(t?.content || "").trim(),
          }))
          .filter((t) => t.content);
      }
    }
  } catch (e) {
    console.error("[curated] item_links_lookup_error", String(e));
  }

  return out;
}

const BIZ_FIELDS =
  "id, name, slug, city, neighborhood, address, main_category, categories, hook_fr, hook_en, hook_ar, " +
  "latitude, longitude, logo_url, images, google_rating, google_review_count, tripadvisor_rating, " +
  "tripadvisor_review_count, computed_rating, total_review_count, engagements, closure_message, is_active, is_featured, rating, " +
  "description_fr, description_en, description_ar, services, " +
  "opening_hours, is_open_24h, show_opening_hours, " + CTA_SELECT_FIELDS;

export type CuratedAnswer = {
  text: string;
  knownBusinesses: Array<{ id: string; slug: string | null; name: string }>;
  mapPayload: { title: string | null; businesses: any[]; order?: "given" } | null;
  shown: number;
  total: number;
  route: string;
  /** Corpus COMPLET trouvé (pas seulement les résultats affichés) — sert aux relances. */
  poolIds?: string[];
};


function mapBusinessesOf(list: any[]) {
  return list.map((b: any) => ({
    id: b.id, slug: b.slug, name: b.name, city: b.city, neighborhood: b.neighborhood,
    address: b.address ?? null, main_category: b.main_category,
    categories: Array.isArray(b.categories) ? b.categories : [],
    latitude: b.latitude, longitude: b.longitude, logo_url: b.logo_url,
    images: Array.isArray(b.images) ? b.images : [],
    google_rating: b.google_rating, google_review_count: b.google_review_count,
    tripadvisor_rating: b.tripadvisor_rating, tripadvisor_review_count: b.tripadvisor_review_count,
    computed_rating: b.computed_rating ?? null, total_review_count: b.total_review_count ?? null,
    // Champs de la carte résultat IA (hook, horaires) — présentation unifiée côté client.
    hook_fr: b.hook_fr ?? null, hook_en: b.hook_en ?? null, hook_ar: b.hook_ar ?? null,
    opening_hours: b.opening_hours ?? null,
    is_open_24h: b.is_open_24h ?? null,
    show_opening_hours: b.show_opening_hours ?? null,
    ...ctaFieldsOf(b),
    engagements: b.engagements,
  }));
}



/**
 * Teaser d'article (non intrusif) : le moteur calcule SES propres résultats et
 * propose seulement de consulter l'article. Carte compacte cliquable côté front
 * (ARTICLE_CARD avec `inline: false`) → l'article ne s'affiche que si sélectionné.
 * Aucune lecture DB supplémentaire, aucun token.
 */
export function buildArticleTeaser(post: BlogRow, lang: Lang): string {
  const title =
    (lang === "en" && post.title_en) || (lang === "ar" && post.title_ar) ||
    post.title_fr || post.title_en || post.title_ar || "";
  if (!post.slug || !title) return "";
  const image = post.custom_hero_image_url || post.cover_image_url || null;
  const isVideoFeed = post.kind === "video_feed";
  const payload = {
    id: post.id, slug: post.slug, title, image, hero: image, inline: false,
    kind: isVideoFeed ? "video_feed" : "blog",
    url: isVideoFeed ? `/videos/${post.slug}` : null,
  };
  const line = lang === "en"
    ? `📖 Want to go further? Our article **${title}** covers this in detail — open it below.`
    : lang === "ar"
      ? `📖 لمزيد من التفاصيل، مقالنا **${title}** يغطي الموضوع — افتحه أدناه.`
      : `📖 Pour aller plus loin, notre article **${title}** détaille le sujet — ouvre-le ci-dessous.`;
  return `\n\n${line}\n\n<!--ARTICLE_CARD:${JSON.stringify(payload)}-->\n\n`;
}

/**
 * Rendu éditorial complet d'un article : ARTICLE_CARD inline + entrées classées.
 * Conservé pour la page article dédiée ; n'est plus utilisé comme réponse de chat.
 */

export async function buildBlogArticleAnswer(
  admin: any, post: BlogRow, host: any, lang: Lang,
): Promise<CuratedAnswer | null> {
  const { data: full } = await admin
    .from("blog_posts")
    .select("entries_fr, entries_en, entries_ar, hero_subtitle_fr, hero_subtitle_en, hero_subtitle_ar, tldr_fr, tldr_en, tldr_ar, intro_fr, intro_en, intro_ar, excerpt_fr, excerpt_en, excerpt_ar")
    .eq("id", post.id)
    .maybeSingle();
  if (!full) return null;

  const title =
    (lang === "en" && post.title_en) || (lang === "ar" && post.title_ar) ||
    post.title_fr || post.title_en || post.title_ar || "";
  const image = post.custom_hero_image_url || post.cover_image_url || null;
  const f: any = full;
  const articlePayload: any = {
    id: post.id, slug: post.slug, title, image, hero: image,
    tldr:
      (lang === "en" && (f.tldr_en || f.excerpt_en)) || (lang === "ar" && (f.tldr_ar || f.excerpt_ar)) ||
      f.tldr_fr || f.tldr_en || f.tldr_ar || f.excerpt_fr || f.excerpt_en || f.excerpt_ar || null,
    hook:
      (lang === "en" && f.hero_subtitle_en) || (lang === "ar" && f.hero_subtitle_ar) ||
      f.hero_subtitle_fr || f.hero_subtitle_en || f.hero_subtitle_ar || null,
    intro:
      (lang === "en" && f.intro_en) || (lang === "ar" && f.intro_ar) ||
      f.intro_fr || f.intro_en || f.intro_ar || null,
    inline: false,
    // Surfaces sans hôte (/search, /club) : jamais de propriétaire.
    isOwner: !!host?.id && post.anchor_business_id === host.id,
  };

  const entriesRaw: any[] =
    (lang === "en" && Array.isArray(f.entries_en) && f.entries_en.length ? f.entries_en : null) ||
    (lang === "ar" && Array.isArray(f.entries_ar) && f.entries_ar.length ? f.entries_ar : null) ||
    (Array.isArray(f.entries_fr) ? f.entries_fr : []);
  const entries = Array.isArray(entriesRaw) ? entriesRaw : [];
  const businessIds = entries.map((e: any) => e?.id).filter(Boolean).slice(0, 12);

  if (businessIds.length < 3) {
    return {
      text: `\n\n<!--ARTICLE_CARD:${JSON.stringify(articlePayload)}-->\n\n`,
      knownBusinesses: [], mapPayload: null, shown: 0, total: 0, route: "blog_article",
    };
  }

  const { data: bizRows } = await admin
    .from("businesses").select(BIZ_FIELDS)
    .in("id", businessIds).eq("is_active", true).is("closure_message", null);
  const byId = new Map<string, any>((bizRows || []).map((b: any) => [b.id, b]));
  const paired = entries
    .map((entry: any, originalIdx: number) => ({ entry, originalIdx, biz: byId.get(entry?.id) }))
    .filter((p: any) => p.biz);
  paired.sort((a: any, b: any) => {
    const fa = a.biz?.is_featured ? 1 : 0;
    const fb = b.biz?.is_featured ? 1 : 0;
    if (fb !== fa) return fb - fa;
    const ra = a.biz?.computed_rating ?? a.biz?.rating ?? -1;
    const rb = b.biz?.computed_rating ?? b.biz?.rating ?? -1;
    if (rb !== ra) return rb - ra;
    const ca = a.biz?.total_review_count ?? 0;
    const cb = b.biz?.total_review_count ?? 0;
    if (cb !== ca) return cb - ca;
    return a.originalIdx - b.originalIdx;
  });
  const orderedBiz = paired.map((p: any) => p.biz);
  const orderedEntries = paired.map((p: any) => p.entry);
  if (orderedBiz.length < 3) {
    return {
      text: `\n\n<!--ARTICLE_CARD:${JSON.stringify(articlePayload)}-->\n\n`,
      knownBusinesses: [], mapPayload: null, shown: 0, total: 0, route: "blog_article",
    };
  }

  const shown = orderedBiz.slice(0, Math.min(orderedBiz.length, 10));
  const shownEntries = orderedEntries.slice(0, shown.length);

  articlePayload.inline = true;
  // Surfaces sans hôte : la ville vient du pseudo-hôte, sinon des fiches de l'article.
  const cityForCopy = host?.city || shown.find((b: any) => b?.city)?.city || "Marrakech";

  // Nom, quartier/ville, hook, note /20, avis et horaires sont rendus par la carte
  // résultat IA côté client (payload SHOW_ON_MAP) : ne restent ici que les
  // paragraphes ÉDITORIAUX de l'article, qu'aucune carte ne peut porter.
  const body = shown.map((biz: any, idx: number) => {
    const entry = shownEntries[idx] || {};
    const rank = Number(entry.rank) || idx + 1;
    const paragraphs = Array.isArray(entry.paragraphs) && entry.paragraphs.length
      ? entry.paragraphs.map((p: any) => stripText(String(p || ""))).filter(Boolean).join("\n\n")
      : "";
    if (!paragraphs) return "";
    return `${rank}. **${biz.name}**\n\n${paragraphs}`;
  }).filter(Boolean).join("\n\n---\n\n");


  const total = orderedBiz.length;
  const disclosure = shown.length < total
    ? (lang === "en"
        ? `📍 Showing **${shown.length}** of **${total}** picks from **${title}** in ${cityForCopy} — want me to keep going, focus on the top 3, or refine by neighborhood / vibe / budget?`
        : lang === "ar"
          ? `📍 أعرض **${shown.length}** من **${total}** اختيارًا من **${title}** في ${cityForCopy} — هل أواصل، أو أركّز على أفضل 3، أو أُضيّق حسب الحي / الأجواء / الميزانية؟`
          : `📍 Je te déroule **${shown.length}** adresses sur **${total}** issues de **${title}** à ${cityForCopy} — tu veux la suite, le podium en zoom, ou qu'on affine par quartier / ambiance / budget ?`)
    : (lang === "en"
        ? `📍 That's the full **${title}** shortlist in ${cityForCopy} — say the word for the podium detailed, an alternative neighborhood, or the map view.`
        : lang === "ar"
          ? `📍 هذه هي القائمة الكاملة **${title}** في ${cityForCopy} — أخبرني إن أردت تفصيل المنصة أو حيًا آخر أو عرض الخريطة.`
          : `📍 Voici la sélection complète **${title}** à ${cityForCopy} — dis-moi si tu veux le podium détaillé, un autre quartier, ou la vue carte.`);

  const text = `\n\n<!--ARTICLE_CARD:${JSON.stringify(articlePayload)}-->\n\n${body}\n\n${disclosure}`;
  return {
    text,
    knownBusinesses: shown.filter((b: any) => b?.id && b?.name).map((b: any) => ({ id: b.id, slug: b.slug || null, name: b.name })),
    mapPayload: { title, businesses: mapBusinessesOf(shown), order: "given" },
    shown: shown.length,
    total,
    route: "blog_article",
  };
}

/**
 * Corpus clos : uniquement les établissements épinglés par le staff, dans l'ordre défini.
 * Aucune recherche, aucun LLM, aucune adresse ajoutée.
 */
export async function buildPinnedAnswer(
  admin: any, ids: string[], host: any, lang: Lang, label?: string | null,
  overrides?: {
    route?: string; heading?: string; outro?: string; total?: number; poolIds?: string[];
    /** Garde-fou concurrents (surface embed) : écarte les rivaux directs de l'hôte. */
    isCompetitor?: (b: any) => boolean;
  },
): Promise<CuratedAnswer | null> {

  const wanted = ids.filter(Boolean).slice(0, 20);
  if (!wanted.length) return null;
  const { data } = await admin
    .from("businesses").select(BIZ_FIELDS)
    .in("id", wanted).eq("is_active", true).is("closure_message", null);
  const byId = new Map<string, any>((data || []).map((b: any) => [b.id, b]));
  let ordered = wanted.map((id) => byId.get(id)).filter(Boolean);
  if (overrides?.isCompetitor) {
    const before = ordered.length;
    ordered = ordered.filter((b: any) => !overrides.isCompetitor!(b));
    if (before !== ordered.length) {
      console.log("[curated] competitor_guard", JSON.stringify({ before, after: ordered.length }));
    }
  }
  if (!ordered.length) return null;

  // Nom, quartier/ville, hook, note /20, avis, horaires : rendus par la carte
  // résultat IA côté client (payload SHOW_ON_MAP) — plus aucune duplication ici.
  const heading = overrides?.heading ?? (label
    ? (lang === "en" ? `**${label}** — hand-picked selection:` : lang === "ar" ? `**${label}** — اختيار مُنتقى:` : `**${label}** — sélection choisie à la main :`)
    : (lang === "en" ? "Hand-picked selection:" : lang === "ar" ? "اختيار مُنتقى:" : "Sélection choisie à la main :"));
  const outro = overrides?.outro ?? (lang === "en"
    ? `📍 That's the full curated shortlist${host?.city ? ` in ${host.city}` : ""} — want the map view, opening hours, or booking links?`
    : lang === "ar"
      ? `📍 هذه هي القائمة المختارة كاملة${host?.city ? ` في ${host.city}` : ""} — تريد الخريطة أو أوقات العمل أو روابط الحجز؟`
      : `📍 C'est la sélection curatée complète${host?.city ? ` à ${host.city}` : ""} — tu veux la carte, les horaires, ou les liens de réservation ?`);

  // Texte immersif (zéro token) inséré AVANT les cartes résultat.
  const immersive = buildImmersiveLines(ordered, lang);

  return {
    text: [heading, immersive, outro].filter((p) => p && String(p).trim()).join("\n\n"),

    knownBusinesses: ordered.map((b: any) => ({ id: b.id, slug: b.slug || null, name: b.name })),
    mapPayload: { title: label || null, businesses: mapBusinessesOf(ordered) },
    shown: ordered.length,
    total: overrides?.total ?? ordered.length,
    route: overrides?.route ?? "curated_pinned",
    poolIds: overrides?.poolIds ?? ordered.map((b: any) => String(b.id)),
  };

}

/**
 * Filtre déterministe curaté (parité V1 `_badgeIds` / `_subcategoryNames`) :
 * une suggestion liée à des badges (commodités) ou sous-catégories fait loi.
 * On interroge `business-search` avec ces filtres DURS — jamais le message libre —
 * puis on rend la liste sans aucun appel génératif (classe A, zéro token).
 */
export async function buildFilteredAnswer(
  admin: any,
  host: any,
  lang: Lang,
  opts: {
    badgeIds?: string[];
    subcategoryNames?: string[];
    serviceNames?: string[];
    commodities?: string[];
    label?: string | null;
    /** Établissements épinglés sur l'entrée curatée → mis en avant en tête. */
    pinnedIds?: string[];

    /**
     * Périmètre géographique — RÈGLE UNIQUE (voir `../city-scope.ts`) :
     * ville du business master, sauf ville explicitement nommée par l'utilisateur.
     * `ai_suggestions.city` ne pilote QUE la visibilité de la suggestion.
     */
    scopeCity?: string | null;
    maxResults?: number;
    /** Garde-fou concurrents (surface embed). */
    isCompetitor?: (b: any) => boolean;
    supabaseUrl: string;
    serviceKey: string;
  },
): Promise<CuratedAnswer | null> {
  const badgeIds = (opts.badgeIds || []).filter(Boolean);
  const subcategoryNames = (opts.subcategoryNames || []).filter(Boolean);
  const commodities = (opts.commodities || []).filter(Boolean);
  const serviceNames = (opts.serviceNames || []).filter(Boolean);
  if (!badgeIds.length && !subcategoryNames.length && !commodities.length && !serviceNames.length) return null;
  const city = String(opts.scopeCity || host?.city || "").trim() || null;
  const max = opts.maxResults ?? 6;


  const runQuery = async (cityFilter: string | null): Promise<any[] | null> => {
  let all: any[] = [];
  if (commodities.length) {
    // Commodités (Structure du Front → Commodités / Logistique) : filtre dur sur
    // `businesses.engagements`, aucune recherche sémantique, aucun LLM.
    const variants = commodities.flatMap((c) => [c, `Logistique:${c}`]);
    try {
      let q = admin
        .from("businesses")
        .select("id, is_featured, computed_rating, total_review_count")
        .eq("is_active", true)
        .overlaps("engagements", variants)
        .order("is_featured", { ascending: false })
        .order("computed_rating", { ascending: false, nullsFirst: false })
        .limit(60);
      if (cityFilter) q = q.eq("city", cityFilter);
      if (serviceNames.length) q = q.overlaps("services", serviceNames);
      const { data, error } = await q;
      if (error) throw error;
      all = data || [];
    } catch (e) {
      console.error("[curated] commodity_filter_failed", String(e));
      return null;
    }
  } else if (badgeIds.length) {
    // Badges curatés : filtre DUR en base (business_badges), jamais via
    // `business-search` — celui-ci n'applique `badgeIds` que si `city` est fourni.
    try {
      const { data: links, error: linkErr } = await admin
        .from("business_badges")
        .select("business_id")
        .in("badge_id", badgeIds)
        .limit(2000);
      if (linkErr) throw linkErr;
      const bizIds = [...new Set((links || []).map((l: any) => l.business_id).filter(Boolean))];
      if (!bizIds.length) return null;
      let q = admin
        .from("businesses")
        .select("id, is_featured, computed_rating, total_review_count")
        .eq("is_active", true)
        .in("id", bizIds)
        .order("is_featured", { ascending: false })
        .order("computed_rating", { ascending: false, nullsFirst: false })
        .limit(60);
      if (cityFilter) q = q.eq("city", cityFilter);
      if (serviceNames.length) q = q.overlaps("services", serviceNames);
      const { data, error } = await q;
      if (error) throw error;
      all = data || [];
    } catch (e) {
      console.error("[curated] badge_filter_failed", String(e));
      return null;
    }
  } else if (!subcategoryNames.length && serviceNames.length) {
    // Services curatés seuls : filtre DUR sur businesses.services, zéro LLM.
    try {
      let q = admin
        .from("businesses")
        .select("id, is_featured, computed_rating, total_review_count")
        .eq("is_active", true)
        .overlaps("services", serviceNames)
        .order("is_featured", { ascending: false })
        .order("computed_rating", { ascending: false, nullsFirst: false })
        .limit(60);
      if (cityFilter) q = q.eq("city", cityFilter);
      const { data, error } = await q;
      if (error) throw error;
      all = data || [];
    } catch (e) {
      console.error("[curated] service_filter_failed", String(e));
      return null;
    }
  } else {
    try {
      const r = await fetch(`${opts.supabaseUrl}/functions/v1/business-search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${opts.serviceKey}`,
          apikey: opts.serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: lang,
          pageSize: 30,
          offset: 0,
          compact: "card",
          // `business-search` n'applique les filtres taxonomiques que si `city`
          // est présent → ville de l'hôte par défaut.
          city: cityFilter || host?.city || "Marrakech",
          subcategoryNames: subcategoryNames.length ? subcategoryNames : undefined,
        }),
      });
      const json = await r.json().catch(() => null);
      all = Array.isArray(json?.businesses) ? json.businesses : [];
      // Sous-catégories + services : le service reste un filtre DUR appliqué après coup.
      if (serviceNames.length && all.length) {
        const wanted = new Set(serviceNames.map((s) => s.toLowerCase().trim()));
        const { data: svcRows } = await admin
          .from("businesses")
          .select("id, services")
          .in("id", all.map((b: any) => b?.id).filter(Boolean));
        const keep = new Set(
          (svcRows || [])
            .filter((r2: any) => (Array.isArray(r2?.services) ? r2.services : []).some((s: any) => wanted.has(String(s || "").toLowerCase().trim())))
            .map((r2: any) => r2.id),
        );
        const filtered = all.filter((b: any) => keep.has(b?.id));
        if (filtered.length) all = filtered;
      }
    } catch (e) {
      console.error("[curated] filtered_search_failed", String(e));
      return null;
    }
  }
    return all;
  };

  // Aucun relâchement du filtre ville : mieux vaut peu de résultats dans la bonne
  // ville que des adresses d'une autre ville (règle unique de périmètre).
  const all = await runQuery(city);
  const effCity = city;

  if (!all) return null;


  const found = all.map((b: any) => b?.id).filter((id: string) => id && id !== host?.id);
  // Établissements épinglés sur la même entrée curatée : mise en avant en tête
  // de liste (ils ne ferment plus le corpus), puis les résultats taxonomiques.
  // Ils subissent la même règle de périmètre : hors ville → écartés.
  let pinned = (opts.pinnedIds || []).filter((id) => id && id !== host?.id);
  if (pinned.length && city) {
    try {
      const { data: pinRows } = await admin
        .from("businesses")
        .select("id")
        .in("id", pinned)
        .eq("city", city);
      const keep = new Set((pinRows || []).map((r: any) => r.id));
      pinned = pinned.filter((id) => keep.has(id));
    } catch (e) {
      console.error("[curated] pinned_city_filter_failed", String(e));
    }
  }
  const ids = [...new Set([...pinned, ...found])];

  if (!ids.length) return null;
  const total = ids.length;
  const shownIds = ids.slice(0, Math.max(max, pinned.length));


  const inCity = effCity ? (lang === "en" ? ` in ${effCity}` : lang === "ar" ? ` في ${effCity}` : ` à ${effCity}`) : "";
  const heading = opts.label
    ? (lang === "en" ? `**${opts.label}** — matching addresses${inCity}:`
      : lang === "ar" ? `**${opts.label}** — عناوين مطابقة${inCity}:`
      : `**${opts.label}** — les adresses qui correspondent${inCity} :`)
    : (lang === "en" ? `Matching addresses${inCity}:` : lang === "ar" ? `عناوين مطابقة${inCity}:` : `Les adresses qui correspondent${inCity} :`);
  const rest = total - shownIds.length;
  // Les horaires, statuts et liens de réservation sont déjà portés par les cartes
  // résultat IA : ne reste que l'option d'afficher le lot suivant.
  const outro = lang === "en"
    ? `📍 ${shownIds.length} of ${total} matching addresses${rest > 0 ? " — want me to show the others?" : "."}`
    : lang === "ar"
      ? `📍 ${shownIds.length} من ${total} عنوانًا مطابقًا${rest > 0 ? " — أعرض الباقي؟" : "."}`
      : `📍 ${shownIds.length} adresses sur ${total} qui correspondent${rest > 0 ? " — je te montre les suivantes ?" : "."}`;


  const built = await buildPinnedAnswer(admin, shownIds, host, lang, opts.label, {
    route: "curated_filter",
    heading,
    outro,
    total,
    // Corpus complet trouvé : les relances (proximité, distances…) doivent
    // pouvoir travailler sur les 19 adresses, pas seulement sur les 6 affichées.
    poolIds: ids.map((id) => String(id)),
    isCompetitor: opts.isCompetitor,
  });

  return built;
}

// ============ Matcher texte libre → entrée curatée (partagé 3 surfaces) ============
// Aujourd'hui l'autorité curatée ne se déclenche que sur CLIC d'une suggestion
// (suggestionId transmis). En texte libre, la même phrase tapée à la main
// retombait sur la recherche générique. Ce matcher rapproche la phrase tapée du
// libellé d'une suggestion staff : match normalisé exact, sinon recouvrement de
// tokens (≥ 2 mots communs et ≥ 0.7 de similarité). Zéro token de génération.

export type CuratedMatch = {
  id: string;
  label: string;
  score: number;
  /** Surface de l'entrée matchée (peut différer de la surface courante). */
  surface: string;
};

const normLabel = (s: unknown) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[?!.…]+$/g, "")
    .replace(/\s+/g, " ");

export async function matchCuratedByText(
  admin: any,
  opts: {
    text: string;
    surface: "club" | "embed" | "search";
    minScore?: number;
    /**
     * Autorise le repli sur une entrée d'une autre surface (les cibles éditoriales
     * — article de blog, établissements épinglés — ne dépendent pas de la surface).
     * La surface courante garde toujours la priorité.
     */
    crossSurface?: boolean;
  },
): Promise<CuratedMatch | null> {
  const raw = String(opts.text || "").trim();
  if (raw.length < 6) return null;
  const minScore = opts.minScore ?? 0.7;

  let rows: any[] = [];
  try {
    let q = admin
      .from("ai_suggestions")
      .select("id, label_fr, label_en, label_ar, surface")
      .eq("is_active", true);
    if (!opts.crossSurface) q = q.eq("surface", opts.surface);
    const { data } = await q;
    rows = data || [];
  } catch (e) {
    console.error("[curated] match_by_text_lookup_failed", String(e));
    return null;
  }
  if (!rows.length) return null;

  const key = normLabel(raw);
  const qTokens = new Set(tokenizeForBlog(raw));

  let best: CuratedMatch | null = null;
  for (const r of rows) {
    const labels = [r.label_fr, r.label_en, r.label_ar].filter(Boolean) as string[];
    if (!labels.length) continue;
    const primary = (r.label_fr || r.label_en || r.label_ar) as string;
    // La surface courante fait autorité : bonus de départage.
    const bonus = r.surface === opts.surface ? 0.15 : 0;

    // 1. Match exact normalisé (le clic d'origine, ou une recopie fidèle).
    if (labels.some((l) => normLabel(l) === key)) {
      const cand = { id: r.id, label: primary, score: 1 + bonus, surface: String(r.surface) };
      if (r.surface === opts.surface) return cand;
      if (!best || cand.score > best.score) best = cand;
      continue;
    }

    // 2. Recouvrement de tokens.
    if (qTokens.size < 2) continue;
    for (const l of labels) {
      const lTokens = new Set(tokenizeForBlog(l));
      if (lTokens.size < 2) continue;
      let overlap = 0;
      for (const w of qTokens) if (lTokens.has(w)) overlap++;
      if (overlap < 2) continue;
      const score = overlap / Math.min(qTokens.size, lTokens.size);
      if (score >= minScore && (!best || score + bonus > best.score)) {
        best = { id: r.id, label: primary, score: score + bonus, surface: String(r.surface) };
      }
    }
  }
  return best;
}


/**
 * Substitution UNIQUE, côté moteur, des placeholders des libellés staff
 * (`ai_suggestions.label_*`) : le libellé est réinjecté verbatim dans la réponse,
 * donc `{businessName}` doit être résolu ici, pas seulement côté client.
 */
export function applyLabelPlaceholders(label: string | null | undefined, host: any): string | null {
  const raw = String(label ?? "");
  if (!raw) return label ?? null;
  const name = String(host?.name || "").trim();
  return raw
    .replace(/\{\{?\s*businessName\s*\}?\}/gi, name)
    .replace(/\{\{?\s*business_name\s*\}?\}/gi, name)
    .replace(/\s{2,}/g, " ")
    .trim();
}
