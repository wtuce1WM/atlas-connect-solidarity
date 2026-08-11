// Contexte éditorial partagé pour le moteur IA A/B/C.
// Source d'autorité unique : les TXT IA (business_ai_texts).
// Les notes de connaissances (knowledge_entries) sont INTERNES (technique / staff)
// et ne doivent JAMAIS être injectées dans un prompt voyageur.

export interface EditorialText {
  business_id: string;
  title: string;
  hook: string;
  content: string;
}

interface LoadOptions {
  businessIds: string[];
  /** Nombre max de textes par établissement (défaut 2). */
  perBusiness?: number;
  /** Nombre max de textes au total (défaut 12). */
  limit?: number;
  /** Longueur max de chaque extrait (défaut 600). */
  maxChars?: number;
}

/** Charge les TXT IA actifs des établissements donnés, triés par position. */
export async function loadEditorialTexts(
  admin: any,
  { businessIds, perBusiness = 2, limit = 12, maxChars = 600 }: LoadOptions,
): Promise<EditorialText[]> {
  const ids = [...new Set((businessIds || []).filter(Boolean))];
  if (ids.length === 0) return [];
  try {
    const { data } = await admin
      .from("business_ai_texts")
      .select("business_id, title, hook, content, position")
      .in("business_id", ids)
      .eq("is_active", true)
      .order("position", { ascending: true });

    const perCount: Record<string, number> = {};
    const out: EditorialText[] = [];
    for (const row of (data || []) as any[]) {
      const content = String(row?.content || "").trim();
      if (!content) continue;
      const bid = String(row.business_id);
      perCount[bid] = (perCount[bid] || 0) + 1;
      if (perCount[bid] > perBusiness) continue;
      out.push({
        business_id: bid,
        title: String(row?.title || "").trim(),
        hook: String(row?.hook || "").trim(),
        content: content.length > maxChars ? content.slice(0, maxChars) + "…" : content,
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch (e) {
    console.error("[editorial] load_error", String(e));
    return [];
  }
}

/** Rend un bloc texte prêt à injecter dans un prompt, ou "" si rien. */
export function formatEditorialContext(
  texts: EditorialText[],
  nameById: Record<string, string> = {},
): string {
  if (!texts.length) return "";
  return texts
    .map((t) => {
      const name = nameById[t.business_id] || "";
      const head = [name, t.title].filter(Boolean).join(" — ");
      const hook = t.hook ? ` (${t.hook})` : "";
      return `[TXT IA] ${head}${hook}: ${t.content}`;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Sources éditoriales complémentaires : titres/textes des images (popup)
// et offres de l'établissement (promotions affiliées).
// ---------------------------------------------------------------------------

export interface EditorialImageText {
  business_id: string;
  title: string;
  description: string;
}

export interface EditorialOffer {
  business_id: string;
  title: string;
  message: string;
}

const pickLang = (row: any, base: string, lang: string): string => {
  const suffixed = row?.[`${base}_${lang}`];
  return String(suffixed || row?.[`${base}_fr`] || row?.[base] || "").trim();
};

/** Titre + texte des popups d'images (business_image_titles). */
export async function loadImagePopupTexts(
  admin: any,
  { businessIds, perBusiness = 3, limit = 18, maxChars = 400, lang = "fr" }: LoadOptions & { lang?: string },
): Promise<EditorialImageText[]> {
  const ids = [...new Set((businessIds || []).filter(Boolean))];
  if (ids.length === 0) return [];
  try {
    const { data } = await admin
      .from("business_image_titles")
      .select("business_id, title, description, title_fr, title_en, title_ar, description_fr, description_en, description_ar")
      .in("business_id", ids);

    const perCount: Record<string, number> = {};
    const out: EditorialImageText[] = [];
    for (const row of (data || []) as any[]) {
      const title = pickLang(row, "title", lang);
      let description = pickLang(row, "description", lang);
      if (!title && !description) continue;
      const bid = String(row.business_id);
      perCount[bid] = (perCount[bid] || 0) + 1;
      if (perCount[bid] > perBusiness) continue;
      if (description.length > maxChars) description = description.slice(0, maxChars) + "…";
      out.push({ business_id: bid, title, description });
      if (out.length >= limit) break;
    }
    return out;
  } catch (e) {
    console.error("[editorial] image_popup_error", String(e));
    return [];
  }
}

/** Offres / promotions de l'établissement (affiliate_business_promotions). */
export async function loadOffers(
  admin: any,
  { businessIds, perBusiness = 5, limit = 20, maxChars = 400, lang = "fr" }: LoadOptions & { lang?: string },
): Promise<EditorialOffer[]> {
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

    const perCount: Record<string, number> = {};
    const out: EditorialOffer[] = [];
    for (const row of (data || []) as any[]) {
      const title = pickLang(row, "title", lang);
      let message = pickLang(row, "promotion_message", lang);
      const value = row?.promotion_value != null
        ? `${row.promotion_value}${row?.promotion_type === "percent" ? " %" : ` ${row?.promotion_currency || ""}`.trimEnd()}`
        : "";
      const savings = row?.savings_amount != null ? `économie ${row.savings_amount} ${row?.promotion_currency || ""}`.trim() : "";
      if (!title && !message && !value) continue;
      const bid = String(row.business_id);
      perCount[bid] = (perCount[bid] || 0) + 1;
      if (perCount[bid] > perBusiness) continue;
      if (message.length > maxChars) message = message.slice(0, maxChars) + "…";
      const extra = [value, savings].filter(Boolean).join(" · ");
      out.push({ business_id: bid, title, message: [message, extra].filter(Boolean).join(" — ") });
      if (out.length >= limit) break;
    }
    return out;
  } catch (e) {
    console.error("[editorial] offers_error", String(e));
    return [];
  }
}

export interface EditorialBundle {
  texts: EditorialText[];
  images: EditorialImageText[];
  offers: EditorialOffer[];
}

/** Charge en parallèle TXT IA + popups d'images + offres. */
export async function loadEditorialBundle(
  admin: any,
  opts: LoadOptions & { lang?: string },
): Promise<EditorialBundle> {
  const [texts, images, offers] = await Promise.all([
    loadEditorialTexts(admin, opts),
    loadImagePopupTexts(admin, opts),
    loadOffers(admin, opts),
  ]);
  return { texts, images, offers };
}

/** Rend le bundle complet en bloc injectable dans un prompt, ou "" si vide. */
export function formatEditorialBundle(
  bundle: EditorialBundle,
  nameById: Record<string, string> = {},
): string {
  const lines: string[] = [];
  const base = formatEditorialContext(bundle.texts || [], nameById);
  if (base) lines.push(base);
  for (const img of bundle.images || []) {
    const name = nameById[img.business_id] || "";
    const head = [name, img.title].filter(Boolean).join(" — ");
    lines.push(`[IMAGE POPUP] ${head}${img.description ? `: ${img.description}` : ""}`);
  }
  for (const off of bundle.offers || []) {
    const name = nameById[off.business_id] || "";
    const head = [name, off.title].filter(Boolean).join(" — ");
    lines.push(`[OFFRE] ${head}${off.message ? `: ${off.message}` : ""}`);
  }
  return lines.join("\n");
}
