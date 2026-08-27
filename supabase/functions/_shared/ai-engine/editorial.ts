// Contexte éditorial partagé pour le moteur IA A/B/C.
// Source d'autorité unique : les contenus éditoriaux voyageur.
// Les notes de connaissances (knowledge_entries) sont INTERNES (technique / staff)
// et ne doivent JAMAIS être injectées dans un prompt voyageur.

// Priorité explicite du contexte éditorial, du plus au moins important :
// 1. Description  (businesses.description)
// 2. Hook        (businesses.hook_*)
// 3. Popup       (business_image_titles)
// 4. Services    (businesses.services)
// 5. Offres      (affiliate_business_promotions)
// 6. TXT IA      (business_ai_texts) — dernier recours, textes générés moins prioritaires
// 3bis. Vidéos    (business_documents type=video, business_youtube_videos, generic_videos)
const PRIORITY_ORDER = ["description", "hook", "popup", "video", "service", "offer", "text"] as const;
type EditorialType = typeof PRIORITY_ORDER[number];
const PRIORITY_RANK: Record<EditorialType, number> = Object.fromEntries(
  PRIORITY_ORDER.map((t, i) => [t, i + 1]),
) as Record<EditorialType, number>;

export interface EditorialItem {
  business_id: string;
  type: EditorialType;
  title: string;
  content: string;
}

interface LoadOptions {
  businessIds: string[];
  /** Nombre max d'éléments par établissement, toutes sources confondues (défaut 5 : desc, hook, popup, services, offres). */
  perBusiness?: number;
  /** Nombre max d'éléments au total (défaut 12). */
  limit?: number;
  /** Longueur max de chaque extrait (défaut 600). */
  maxChars?: number;
  lang?: string;
}

const stripHtml = (html: string): string => {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const truncate = (text: string, maxChars: number): string => {
  if (!text) return "";
  const clean = text.trim();
  return clean.length > maxChars ? clean.slice(0, maxChars) + "…" : clean;
};

const pickLang = (row: any, base: string, lang: string): string => {
  const suffixed = row?.[`${base}_${lang}`];
  return String(suffixed || row?.[`${base}_fr`] || row?.[base] || "").trim();
};

/** Description principale de l'établissement (businesses.description). */
export async function loadDescriptions(
  admin: any,
  { businessIds, maxChars = 600 }: Pick<LoadOptions, "businessIds" | "maxChars">,
): Promise<EditorialItem[]> {
  const ids = [...new Set((businessIds || []).filter(Boolean))];
  if (ids.length === 0) return [];
  try {
    const { data } = await admin
      .from("businesses")
      .select("id, description")
      .in("id", ids);

    const out: EditorialItem[] = [];
    for (const row of (data || []) as any[]) {
      const raw = String(row?.description || "").trim();
      if (!raw) continue;
      const text = truncate(stripHtml(raw), maxChars);
      if (!text) continue;
      out.push({ business_id: String(row.id), type: "description", title: "", content: text });
    }
    return out;
  } catch (e) {
    console.error("[editorial] description_error", String(e));
    return [];
  }
}

/** Hook de l'établissement (businesses.hook_fr / hook_en / hook_ar). */
export async function loadHooks(
  admin: any,
  { businessIds, lang = "fr", maxChars = 300 }: Pick<LoadOptions, "businessIds" | "lang" | "maxChars">,
): Promise<EditorialItem[]> {
  const ids = [...new Set((businessIds || []).filter(Boolean))];
  if (ids.length === 0) return [];
  try {
    const { data } = await admin
      .from("businesses")
      .select("id, hook_fr, hook_en, hook_ar")
      .in("id", ids);

    const out: EditorialItem[] = [];
    for (const row of (data || []) as any[]) {
      const text = truncate(pickLang(row, "hook", lang), maxChars);
      if (!text) continue;
      out.push({ business_id: String(row.id), type: "hook", title: "", content: text });
    }
    return out;
  } catch (e) {
    console.error("[editorial] hook_error", String(e));
    return [];
  }
}

/** Services de l'établissement (businesses.services), regroupés en un seul élément par business. */
export async function loadBusinessServices(
  admin: any,
  { businessIds }: Pick<LoadOptions, "businessIds">,
): Promise<EditorialItem[]> {
  const ids = [...new Set((businessIds || []).filter(Boolean))];
  if (ids.length === 0) return [];
  try {
    const { data } = await admin
      .from("businesses")
      .select("id, services")
      .in("id", ids);

    const out: EditorialItem[] = [];
    for (const row of (data || []) as any[]) {
      const services = (row?.services || []).filter((s: any) => s && String(s).trim()).map((s: any) => String(s).trim());
      if (!services.length) continue;
      out.push({
        business_id: String(row.id),
        type: "service",
        title: "",
        content: services.join(", "),
      });
    }
    return out;
  } catch (e) {
    console.error("[editorial] services_error", String(e));
    return [];
  }
}

/** TXT IA actifs des établissements (business_ai_texts), triés par position. */
export async function loadEditorialTexts(
  admin: any,
  { businessIds, maxChars = 600 }: Pick<LoadOptions, "businessIds" | "maxChars">,
): Promise<EditorialItem[]> {
  const ids = [...new Set((businessIds || []).filter(Boolean))];
  if (ids.length === 0) return [];
  try {
    const { data } = await admin
      .from("business_ai_texts")
      .select("business_id, title, hook, content, position")
      .in("business_id", ids)
      .eq("is_active", true)
      .order("position", { ascending: true });

    const out: EditorialItem[] = [];
    for (const row of (data || []) as any[]) {
      const content = String(row?.content || "").trim();
      if (!content) continue;
      out.push({
        business_id: String(row.business_id),
        type: "text",
        title: String(row?.title || "").trim(),
        content: truncate(content, maxChars),
      });
    }
    return out;
  } catch (e) {
    console.error("[editorial] text_error", String(e));
    return [];
  }
}

/** Titre + texte des popups d'images (business_image_titles). */
export async function loadImagePopupTexts(
  admin: any,
  { businessIds, lang = "fr", maxChars = 400 }: Pick<LoadOptions, "businessIds" | "lang" | "maxChars">,
): Promise<EditorialItem[]> {
  const ids = [...new Set((businessIds || []).filter(Boolean))];
  if (ids.length === 0) return [];
  try {
    const { data } = await admin
      .from("business_image_titles")
      .select(
        "business_id, title, description, title_fr, title_en, title_ar, description_fr, description_en, description_ar, created_at",
      )
      .in("business_id", ids)
      .order("created_at", { ascending: true });

    const out: EditorialItem[] = [];
    for (const row of (data || []) as any[]) {
      const title = pickLang(row, "title", lang);
      const description = truncate(pickLang(row, "description", lang), maxChars);
      if (!title && !description) continue;
      out.push({
        business_id: String(row.business_id),
        type: "popup",
        title,
        content: description,
      });
    }
    return out;
  } catch (e) {
    console.error("[editorial] popup_error", String(e));
    return [];
  }
}

/** Offres / promotions de l'établissement (affiliate_business_promotions). */
export async function loadOffers(
  admin: any,
  { businessIds, lang = "fr", maxChars = 400 }: Pick<LoadOptions, "businessIds" | "lang" | "maxChars">,
): Promise<EditorialItem[]> {
  const ids = [...new Set((businessIds || []).filter(Boolean))];
  if (ids.length === 0) return [];
  try {
    const { data } = await admin
      .from("affiliate_business_promotions")
      .select(
        "business_id, title, title_fr, title_en, title_ar, promotion_message, promotion_message_fr, promotion_message_en, promotion_message_ar, promotion_type, promotion_value, promotion_currency, savings_amount, sort_order",
      )
      .in("business_id", ids)
      .order("sort_order", { ascending: true });

    const out: EditorialItem[] = [];
    for (const row of (data || []) as any[]) {
      const title = pickLang(row, "title", lang);
      let message = pickLang(row, "promotion_message", lang);
      const value = row?.promotion_value != null
        ? `${row.promotion_value}${row?.promotion_type === "percent" ? " %" : ` ${row?.promotion_currency || ""}`.trimEnd()}`
        : "";
      const savings = row?.savings_amount != null ? `économie ${row.savings_amount} ${row?.promotion_currency || ""}`.trim() : "";
      if (!title && !message && !value) continue;
      const extra = [value, savings].filter(Boolean).join(" · ");
      const content = [truncate(message, maxChars), extra].filter(Boolean).join(" — ");
      out.push({ business_id: String(row.business_id), type: "offer", title, content });
    }
    return out;
  } catch (e) {
    console.error("[editorial] offers_error", String(e));
    return [];
  }
}

/** Titres et textes des vidéos liées (internes, YouTube, génériques). */
export async function loadVideoTexts(
  admin: any,
  { businessIds, maxChars = 400 }: Pick<LoadOptions, "businessIds" | "maxChars">,
): Promise<EditorialItem[]> {
  const ids = [...new Set((businessIds || []).filter(Boolean))];
  if (ids.length === 0) return [];
  try {
    const [internal, yt, generic] = await Promise.all([
      admin
        .from("business_documents")
        .select("business_id, name, description, sort_order")
        .in("business_id", ids)
        .eq("type", "video")
        .order("sort_order", { ascending: true })
        .limit(ids.length * 8),
      admin
        .from("business_youtube_videos")
        .select("business_id, title, sort_order")
        .in("business_id", ids)
        .eq("is_visible", true)
        .not("title", "is", null)
        .order("sort_order", { ascending: true })
        .limit(ids.length * 8),
      admin
        .from("generic_video_businesses")
        .select("business_id, generic_videos(title, name, description)")
        .in("business_id", ids)
        .limit(ids.length * 8),
    ]);

    const out: EditorialItem[] = [];
    const push = (bid: any, title: string, content: string) => {
      const t = String(title || "").trim();
      const c = truncate(stripHtml(String(content || "")), maxChars);
      if (!t && !c) return;
      out.push({ business_id: String(bid), type: "video", title: t, content: c });
    };
    for (const row of (internal?.data || []) as any[]) push(row.business_id, row.name, row.description);
    for (const row of (yt?.data || []) as any[]) push(row.business_id, row.title, "");
    for (const row of (generic?.data || []) as any[]) {
      const g = row?.generic_videos;
      if (!g) continue;
      push(row.business_id, g.title || g.name, g.description);
    }
    return out;
  } catch (e) {
    console.error("[editorial] video_error", String(e));
    return [];
  }
}

/** Applique la priorité globale et les limites par établissement / globale. */
function applyPriorityLimits(
  items: EditorialItem[],
  businessIds: string[],
  perBusiness: number,
  limit: number,
): EditorialItem[] {
  const ordered = [...items].sort((a, b) => PRIORITY_RANK[a.type] - PRIORITY_RANK[b.type]);
  const perCount: Record<string, number> = {};
  const out: EditorialItem[] = [];
  for (const item of ordered) {
    perCount[item.business_id] = (perCount[item.business_id] || 0) + 1;
    if (perCount[item.business_id] > perBusiness) continue;
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

export interface EditorialBundle {
  items: EditorialItem[];
}

/** Charge en parallèle toutes les sources éditoriales, puis applique priorité + limites. */
export async function loadEditorialBundle(
  admin: any,
  opts: LoadOptions,
): Promise<EditorialBundle> {
  const { businessIds, perBusiness = 5, maxChars = 600, lang = "fr" } = opts;
  const ids = [...new Set((businessIds || []).filter(Boolean))];
  // Plafond global proportionnel au corpus : un plafond fixe (12) faisait manger
  // toute la place par les descriptions (rang 1) dès 6 établissements, si bien que
  // Services / Offres n'atteignaient JAMAIS le prompt. On réserve donc perBusiness
  // slots par établissement, borné à 30 éléments pour maîtriser les tokens.
  const limit = Math.min(Math.max(opts.limit ?? 12, ids.length * perBusiness), Math.max(30, opts.limit ?? 30));
  if (ids.length === 0) return { items: [] };

  const [descriptions, hooks, popups, videos, offers, services, texts] = await Promise.all([
    loadDescriptions(admin, { businessIds: ids, maxChars }),
    loadHooks(admin, { businessIds: ids, lang, maxChars: 300 }),
    loadImagePopupTexts(admin, { businessIds: ids, lang, maxChars }),
    loadVideoTexts(admin, { businessIds: ids, maxChars: Math.min(maxChars, 500) }),
    loadOffers(admin, { businessIds: ids, lang, maxChars }),
    loadBusinessServices(admin, { businessIds: ids }),
    loadEditorialTexts(admin, { businessIds: ids, maxChars }),
  ]);

  const all = [...descriptions, ...hooks, ...popups, ...videos, ...offers, ...services, ...texts];
  const items = applyPriorityLimits(all, ids, perBusiness, limit);

  console.log(
    `[editorial] bundle: ${descriptions.length} desc, ${hooks.length} hooks, ${popups.length} popups, ${videos.length} vidéos, ${offers.length} offers, ${services.length} services, ${texts.length} txtia → ${items.length} retenus (perBusiness=${perBusiness}, limit=${limit})`,
  );

  return { items };
}

const LABEL_BY_TYPE: Record<EditorialType, string> = {
  description: "[DESCRIPTION]",
  hook: "[HOOK]",
  popup: "[IMAGE POPUP]",
  video: "[VIDÉO]",
  offer: "[OFFRE]",
  service: "[SERVICE]",
  text: "[TXT IA]",
};

/** Rend le bundle complet en bloc injectable dans un prompt, ou "" si vide. */
export function formatEditorialBundle(
  bundle: EditorialBundle,
  nameById: Record<string, string> = {},
): string {
  const items = (bundle?.items || []).sort((a, b) => PRIORITY_RANK[a.type] - PRIORITY_RANK[b.type]);
  if (!items.length) return "";

  return items
    .map((item) => {
      const name = nameById[item.business_id] || "";
      const label = LABEL_BY_TYPE[item.type];
      const head = [name, item.title].filter(Boolean).join(" — ");
      const body = item.content ? `: ${item.content}` : "";
      return `${label} ${head}${body}`;
    })
    .join("\n");
}
