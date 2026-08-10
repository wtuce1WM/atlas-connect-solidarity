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

export type Lang = "fr" | "en" | "ar";

export type BlogRow = {
  id: string; slug: string;
  title_fr: string | null; title_en: string | null; title_ar: string | null;
  custom_hero_image_url: string | null; cover_image_url: string | null;
  anchor_business_id: string | null;
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
  BLOG_CACHE = { at: now, items: (data as BlogRow[]) || [] };
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
  badgeIds: string[];
  /** Valeurs de commodités (sans le préfixe « Logistique: ») → filtre dur sur businesses.engagements */
  commodities: string[];
  destinationIds: string[];
  mode: string | null;
  label: string | null;
  aiTexts: Array<{ title: string; hook: string; content: string }>;
};

const EMPTY_TARGETS: CuratedTargets = {
  blogPostIds: [], pinnedBusinessIds: [], subcategoryNames: [], badgeIds: [], commodities: [],
  destinationIds: [], mode: null, label: null, aiTexts: [],
};


/** Lit les cibles curatées d'une suggestion / relance + les liens propres à l'établissement. */
export async function loadCuratedTargets(
  admin: any,
  opts: { suggestionId?: string | null; followupId?: string | null; businessId: string },
): Promise<CuratedTargets> {
  const suggestionId = opts.suggestionId || null;
  const followupId = opts.followupId || null;
  if (!suggestionId && !followupId) return { ...EMPTY_TARGETS };
  const out: CuratedTargets = { ...EMPTY_TARGETS, blogPostIds: [], pinnedBusinessIds: [], subcategoryNames: [], badgeIds: [], destinationIds: [], aiTexts: [] };

  if (suggestionId) {
    try {
      const { data: sugg } = await admin
        .from("embed_ai_suggestions")
        .select("subcategory_ids, badge_ids, commodity_filters, business_ids, destination_ids, blog_post_ids, mode, label_fr, label_en, label_ar")
        .eq("id", suggestionId)
        .maybeSingle();
      if (sugg) {
        out.mode = (sugg.mode as string | null) || null;
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
      }
    } catch (e) {
      console.error("[curated] suggestion_lookup_error", String(e));
    }
  }

  // Liens curatés par établissement (onglet affilié « Agent IA ») : ils gagnent
  // sur les mappings staff génériques car l'owner les a choisis pour ce widget.
  try {
    const linkKind = followupId ? "followup" : "suggestion";
    const linkItemId = followupId || suggestionId;
    if (linkItemId) {
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
  "tripadvisor_review_count, computed_rating, total_review_count, engagements, closure_message, is_active, is_featured, rating";

export type CuratedAnswer = {
  text: string;
  knownBusinesses: Array<{ id: string; slug: string | null; name: string }>;
  mapPayload: { title: string | null; businesses: any[]; order?: "given" } | null;
  shown: number;
  total: number;
  route: string;
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
    engagements: b.engagements,
  }));
}

async function defaultReviews(admin: any, ids: string[]): Promise<Map<string, any>> {
  const revByBiz = new Map<string, any>();
  if (!ids.length) return revByBiz;
  try {
    const { data } = await admin
      .from("reviews")
      .select("business_id, author_name, rating, text, text_fr, text_en, text_ar, source, is_default")
      .in("business_id", ids)
      .neq("is_hidden", true)
      .order("is_default", { ascending: false });
    for (const r of data || []) {
      const bid = String((r as any).business_id);
      if (!revByBiz.has(bid)) revByBiz.set(bid, r);
    }
  } catch { /* noop */ }
  return revByBiz;
}

/**
 * Rendu éditorial d'un article : ARTICLE_CARD + entrées classées (max 10) + disclosure.
 * Corpus clos : uniquement les établissements présents dans l'article.
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
    isOwner: post.anchor_business_id === host.id,
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
  const revByBiz = await defaultReviews(admin, shown.map((b: any) => b.id));

  articlePayload.inline = true;
  const cityForCopy = host.city || "Marrakech";
  const reviewsLabel = lang === "en" ? "reviews" : lang === "ar" ? "مراجعة" : "avis";
  const anonLabel = lang === "en" ? "Anonymous" : lang === "ar" ? "مجهول" : "Anonyme";

  const body = shown.map((biz: any, idx: number) => {
    const entry = shownEntries[idx] || {};
    const pretitle = stripText(entry.pretitle || "");
    const rank = Number(entry.rank) || idx + 1;
    const hook = stripText(entry.hook || "") || stripText(
      lang === "en" ? (biz.hook_en || biz.hook_fr || "") :
      lang === "ar" ? (biz.hook_ar || biz.hook_fr || "") :
      (biz.hook_fr || biz.hook_en || ""),
    );
    const paragraphs = Array.isArray(entry.paragraphs) && entry.paragraphs.length
      ? entry.paragraphs.map((p: any) => stripText(String(p || ""))).filter(Boolean).join("\n\n")
      : "";
    const hours = stripText(entry.hours || "");
    const area = pretitle || [biz.neighborhood, biz.city].filter(Boolean).join(" · ");
    const detail = [hook, paragraphs].filter(Boolean).join("\n\n");
    const hoursLine = hours ? `\n\n_${hours}_` : "";
    const fallback = lang === "en" ? "A curated One World Morocco address."
      : lang === "ar" ? "عنوان مختار ضمن دليل One World Morocco."
      : "Une adresse sélectionnée dans le guide One World Morocco.";
    const rating20 = biz.computed_rating != null ? Number(biz.computed_rating) : null;
    const revCount = biz.total_review_count ?? null;
    const ratingLine = rating20 != null
      ? `\n\n⭐ **${rating20.toFixed(1)}/20**${revCount ? ` · ${revCount.toLocaleString(lang === "en" ? "en-US" : "fr-FR")} ${reviewsLabel}` : ""}`
      : "";
    const rev = revByBiz.get(String(biz.id));
    const revText = rev
      ? (lang === "en" ? (rev.text_en || rev.text || rev.text_fr)
        : lang === "ar" ? (rev.text_ar || rev.text || rev.text_fr)
        : (rev.text_fr || rev.text))
      : null;
    const revLine = revText
      ? `\n\n> « ${stripText(String(revText))} »\n> — _${rev.author_name || anonLabel}${rev.source ? ` · ${rev.source}` : ""}_`
      : "";
    return `${rank}. **${biz.name}**${area ? ` — _${area}_` : ""}\n\n${detail || fallback}${ratingLine}${revLine}${hoursLine}`;
  }).join("\n\n---\n\n");

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
  overrides?: { route?: string; heading?: string; outro?: string; total?: number },
): Promise<CuratedAnswer | null> {
  const wanted = ids.filter(Boolean).slice(0, 20);
  if (!wanted.length) return null;
  const { data } = await admin
    .from("businesses").select(BIZ_FIELDS)
    .in("id", wanted).eq("is_active", true).is("closure_message", null);
  const byId = new Map<string, any>((data || []).map((b: any) => [b.id, b]));
  const ordered = wanted.map((id) => byId.get(id)).filter(Boolean);
  if (!ordered.length) return null;

  const revByBiz = await defaultReviews(admin, ordered.map((b: any) => b.id));
  const reviewsLabel = lang === "en" ? "reviews" : lang === "ar" ? "مراجعة" : "avis";
  const anonLabel = lang === "en" ? "Anonymous" : lang === "ar" ? "مجهول" : "Anonyme";

  const body = ordered.map((biz: any, idx: number) => {
    const hook = stripText(
      lang === "en" ? (biz.hook_en || biz.hook_fr || "") :
      lang === "ar" ? (biz.hook_ar || biz.hook_fr || "") :
      (biz.hook_fr || biz.hook_en || ""),
    );
    const area = [biz.neighborhood, biz.city].filter(Boolean).join(" · ");
    const rating20 = biz.computed_rating != null ? Number(biz.computed_rating) : null;
    const revCount = biz.total_review_count ?? null;
    const ratingLine = rating20 != null
      ? `\n\n⭐ **${rating20.toFixed(1)}/20**${revCount ? ` · ${revCount.toLocaleString(lang === "en" ? "en-US" : "fr-FR")} ${reviewsLabel}` : ""}`
      : "";
    const rev = revByBiz.get(String(biz.id));
    const revText = rev
      ? (lang === "en" ? (rev.text_en || rev.text || rev.text_fr)
        : lang === "ar" ? (rev.text_ar || rev.text || rev.text_fr)
        : (rev.text_fr || rev.text))
      : null;
    const revLine = revText
      ? `\n\n> « ${stripText(String(revText))} »\n> — _${rev.author_name || anonLabel}${rev.source ? ` · ${rev.source}` : ""}_`
      : "";
    const fallback = lang === "en" ? "A curated One World Morocco address."
      : lang === "ar" ? "عنوان مختار ضمن دليل One World Morocco."
      : "Une adresse sélectionnée dans le guide One World Morocco.";
    return `${idx + 1}. **${biz.name}**${area ? ` — _${area}_` : ""}\n\n${hook || fallback}${ratingLine}${revLine}`;
  }).join("\n\n---\n\n");

  const heading = overrides?.heading ?? (label
    ? (lang === "en" ? `**${label}** — hand-picked selection:` : lang === "ar" ? `**${label}** — اختيار مُنتقى:` : `**${label}** — sélection choisie à la main :`)
    : (lang === "en" ? "Hand-picked selection:" : lang === "ar" ? "اختيار مُنتقى:" : "Sélection choisie à la main :"));
  const outro = overrides?.outro ?? (lang === "en"
    ? `📍 That's the full curated shortlist${host?.city ? ` in ${host.city}` : ""} — want the map view, opening hours, or booking links?`
    : lang === "ar"
      ? `📍 هذه هي القائمة المختارة كاملة${host?.city ? ` في ${host.city}` : ""} — تريد الخريطة أو أوقات العمل أو روابط الحجز؟`
      : `📍 C'est la sélection curatée complète${host?.city ? ` à ${host.city}` : ""} — tu veux la carte, les horaires, ou les liens de réservation ?`);

  return {
    text: `${heading}\n\n${body}\n\n${outro}`,
    knownBusinesses: ordered.map((b: any) => ({ id: b.id, slug: b.slug || null, name: b.name })),
    mapPayload: { title: label || null, businesses: mapBusinessesOf(ordered) },
    shown: ordered.length,
    total: overrides?.total ?? ordered.length,
    route: overrides?.route ?? "curated_pinned",
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
    label?: string | null;
    city?: string | null;
    maxResults?: number;
    supabaseUrl: string;
    serviceKey: string;
  },
): Promise<CuratedAnswer | null> {
  const badgeIds = (opts.badgeIds || []).filter(Boolean);
  const subcategoryNames = (opts.subcategoryNames || []).filter(Boolean);
  const commodities = (opts.commodities || []).filter(Boolean);
  if (!badgeIds.length && !subcategoryNames.length && !commodities.length) return null;
  const city = opts.city || host?.city || "Marrakech";
  const max = opts.maxResults ?? 6;

  let all: any[] = [];
  if (commodities.length) {
    // Commodités (Structure du Front → Commodités / Logistique) : filtre dur sur
    // `businesses.engagements`, aucune recherche sémantique, aucun LLM.
    const variants = commodities.flatMap((c) => [c, `Logistique:${c}`]);
    try {
      const { data, error } = await admin
        .from("businesses")
        .select("id, is_featured, computed_rating, total_review_count")
        .eq("is_active", true)
        .eq("city", city)
        .overlaps("engagements", variants)
        .order("is_featured", { ascending: false })
        .order("computed_rating", { ascending: false, nullsFirst: false })
        .limit(60);
      if (error) throw error;
      all = data || [];
    } catch (e) {
      console.error("[curated] commodity_filter_failed", String(e));
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
          city,
          badgeIds: badgeIds.length ? badgeIds : undefined,
          subcategoryNames: subcategoryNames.length ? subcategoryNames : undefined,
        }),
      });
      const json = await r.json().catch(() => null);
      all = Array.isArray(json?.businesses) ? json.businesses : [];
    } catch (e) {
      console.error("[curated] filtered_search_failed", String(e));
      return null;
    }
  }


  const ids = all.map((b: any) => b?.id).filter((id: string) => id && id !== host?.id);
  if (!ids.length) return null;
  const total = ids.length;
  const shownIds = ids.slice(0, max);

  const heading = opts.label
    ? (lang === "en" ? `**${opts.label}** — matching addresses in ${city}:`
      : lang === "ar" ? `**${opts.label}** — عناوين مطابقة في ${city}:`
      : `**${opts.label}** — les adresses qui correspondent à ${city} :`)
    : (lang === "en" ? `Matching addresses in ${city}:` : lang === "ar" ? `عناوين مطابقة في ${city}:` : `Les adresses qui correspondent à ${city} :`);
  const rest = total - shownIds.length;
  const outro = lang === "en"
    ? `📍 ${shownIds.length} of ${total} matching addresses${rest > 0 ? " — want me to show the others" : " — want the map view"}, opening hours, or booking links?`
    : lang === "ar"
      ? `📍 ${shownIds.length} من ${total} عنوانًا مطابقًا${rest > 0 ? " — أعرض الباقي؟" : " — تريد الخريطة؟"}`
      : `📍 ${shownIds.length} adresses sur ${total} qui correspondent${rest > 0 ? " — je te montre les autres" : " — tu veux la carte"}, les horaires, ou les liens de réservation ?`;

  const built = await buildPinnedAnswer(admin, shownIds, host, lang, opts.label, {
    route: "curated_filter",
    heading,
    outro,
    total,
  });
  return built;
}
