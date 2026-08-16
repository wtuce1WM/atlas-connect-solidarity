// Extrait verbatim de supabase/functions/embed-ai-chat/index.ts (moteur A/B/C, étape 3).
// Aucune réécriture : le rendu est déjà validé en production.

export function pickLang(v: unknown): "fr" | "en" | "ar" {
  return v === "en" || v === "ar" ? v : "fr";
}

export function fmtHours(oh: any): string {
  if (!oh || typeof oh !== "object") return "";
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const keys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const lines: string[] = [];
  keys.forEach((k, i) => {
    const d = oh[k]; if (!d) return;
    if (d.closed) { lines.push(`${days[i]}: fermé`); return; }
    const slots = Array.isArray(d.slots) ? d.slots : [];
    const parts = slots.filter((s: any) => s?.open && s?.close).map((s: any) => `${s.open}–${s.close}`);
    if (parts.length) lines.push(`${days[i]}: ${parts.join(", ")}`);
  });
  return lines.join(" · ");
}

export const normalize = (s: any) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const v0 = new Array(bl + 1);
  const v1 = new Array(bl + 1);
  for (let i = 0; i <= bl; i++) v0[i] = i;
  for (let i = 0; i < al; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < bl; j++) {
      const cost = a.charCodeAt(i) === b.charCodeAt(j) ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= bl; j++) v0[j] = v1[j];
  }
  return v0[bl];
}

export const DAY_LABELS = {
  fr: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  ar: ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"],
};

export const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export async function fetchPriorFull(admin: any, ids: string[]): Promise<any[]> {
  if (!ids.length) return [];
  const { data } = await admin.from("businesses").select(
    "id, name, slug, city, neighborhood, address, main_category, latitude, longitude, logo_url, images, computed_rating, rating, total_review_count, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, engagements, opening_hours, is_open_24h, vacation_dates, show_opening_hours, hook_fr, hook_en, hook_ar"
  ).in("id", ids.slice(0, 30));
  return Array.isArray(data) ? data : [];
}

export function orderByIds<T extends { id: string }>(arr: T[], ids: string[]): T[] {
  const map = new Map(arr.map((x) => [x.id, x]));
  const out: T[] = [];
  for (const id of ids) { const v = map.get(id); if (v) out.push(v); }
  return out;
}

export function fmtKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`;
}

export function toMapMarker(businesses: any[], title: string | null = null): string {
  const mapBusinesses = businesses.slice(0, 20).map((p: any) => ({
    id: p.id, slug: p.slug, name: p.name,
    city: p.city, neighborhood: p.neighborhood, address: p.address,
    main_category: p.main_category || "",
    categories: p.main_category ? [p.main_category] : [],
    latitude: p.latitude, longitude: p.longitude,
    logo_url: p.logo_url,
    images: Array.isArray(p.images) ? p.images : [],
    google_rating: p.google_rating, google_review_count: p.google_review_count,
    tripadvisor_rating: p.tripadvisor_rating, tripadvisor_review_count: p.tripadvisor_review_count,
    // Champs de la carte résultat IA (présentation unifiée côté client).
    computed_rating: p.computed_rating ?? null,
    total_review_count: p.total_review_count ?? null,
    hook_fr: p.hook_fr ?? null, hook_en: p.hook_en ?? null, hook_ar: p.hook_ar ?? null,
    opening_hours: p.opening_hours ?? null,
    is_open_24h: p.is_open_24h ?? null,
    show_opening_hours: p.show_opening_hours ?? null,
    engagements: p.engagements,
  }));
  return `\n\n<!--SHOW_ON_MAP:${JSON.stringify({ title, businesses: mapBusinesses })}-->`;
}


export function haversineKmLocal(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const FS_EMOJI: Record<string, string> = {
  "Restauration": "🍽️", "Hébergement": "🏨", "Bien-être": "🌿", "Vie nocturne": "🌙",
  "Culture": "🎭", "Artisanat marocain": "🧵", "Décoration": "🛋️", "Sport & Loisirs": "🏄",
  "Shopping": "🛍️", "Alimentation": "🥖", "Transport": "🚕", "Informatique": "💻",
  "Immobilier": "🏡", "Santé": "🩺", "Auto / Moto": "🚗",
};

export const FS_I18N: Record<string, { en: string; ar: string }> = {
  "Restauration": { en: "Restaurants", ar: "المطاعم" },
  "Hébergement": { en: "Accommodation", ar: "الإقامة" },
  "Bien-être": { en: "Wellness", ar: "العافية" },
  "Vie nocturne": { en: "Nightlife", ar: "الحياة الليلية" },
  "Culture": { en: "Culture", ar: "الثقافة" },
  "Artisanat marocain": { en: "Moroccan crafts", ar: "الحرف المغربية" },
  "Décoration": { en: "Decoration", ar: "الديكور" },
  "Sport & Loisirs": { en: "Sports & Leisure", ar: "الرياضة والترفيه" },
  "Shopping": { en: "Shopping", ar: "التسوق" },
  "Alimentation": { en: "Food", ar: "الأغذية" },
  "Transport": { en: "Transport", ar: "النقل" },
  "Informatique": { en: "IT", ar: "المعلوماتية" },
  "Immobilier": { en: "Real estate", ar: "العقارات" },
  "Santé": { en: "Health", ar: "الصحة" },
  "Auto / Moto": { en: "Auto / Moto", ar: "السيارات" },
};

/**
 * Autorité « nom propre » : une demande nominative prime sur toute résolution
 * taxonomique (« Le Chalet de la Plage - Chez Jeannot » ne doit pas devenir la
 * sous-catégorie « Plages »).
 *
 * Le test est BIDIRECTIONNEL : l'utilisateur tape presque toujours un préfixe du
 * nom réel (« Le Chalet de la Plage »), jamais le nom complet. On accepte donc :
 *   - message ⊃ nom (nom complet cité),
 *   - message ⊂ nom (préfixe / nom raccourci),
 *   - recouvrement de tokens ≥ 60 % du nom.
 *
 * Garde-fou anti-taxonomie : il faut au moins un token DISTINCTIF (hors mots de
 * catégorie / ville), sinon « un bar avec vue sur la Koutoubia » serait capté
 * comme une demande nominative.
 */
const NAME_STOP = new Set([
  "le", "la", "les", "l", "de", "des", "du", "d", "un", "une", "au", "aux", "a",
  "et", "chez", "the", "of", "and", "by", "at", "in",
]);

/** Mots présents dans la taxonomie ou la géographie : jamais distinctifs seuls. */
const NAME_GENERIC = new Set([
  "bar", "bars", "restaurant", "restaurants", "cafe", "cafes", "riad", "riads",
  "hotel", "hotels", "maison", "villa", "appartement", "auberge", "hostel",
  "plage", "plages", "piscine", "spa", "hammam", "jardin", "jardins", "souk",
  "boutique", "galerie", "musee", "palais", "terrasse", "rooftop", "club",
  "beach", "resort", "lodge", "camp", "kasbah", "medina", "marrakech",
  "essaouira", "agadir", "casablanca", "rabat", "tanger", "fes", "maroc",
  "morocco", "gueliz", "hivernage", "palmeraie", "koutoubia", "agafay",
  "restauration", "hebergement", "activite", "activites", "sport", "sports",
]);

const nameStrip = (v: unknown) =>
  normalize(v).replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

const nameTokens = (v: string) =>
  v.split(" ").filter((t) => t.length > 2 && !NAME_STOP.has(t));

export async function matchBusinessNameInMessage(
  admin: any,
  message: string,
): Promise<{ id: string; name: string; city: string | null } | null> {
  const msg = nameStrip(message);
  if (msg.length < 8) return null;
  const msgTokens = nameTokens(msg);
  if (msgTokens.length < 2) return null;
  const msgSet = new Set(msgTokens);

  const { data } = await admin.from("businesses").select("id, name, city").eq("is_active", true);
  if (!Array.isArray(data)) return null;

  let best: { id: string; name: string; city: string | null } | null = null;
  let bestScore = 0;

  for (const b of data as any[]) {
    const n = nameStrip(b?.name);
    if (!n || n.length < 8 || n.split(" ").length < 2) continue;
    const nTok = nameTokens(n);
    if (nTok.length < 2) continue;
    // Une question longue n'est pas une demande nominative.
    if (msgTokens.length > nTok.length + 3) continue;

    const matched = nTok.filter(
      (t) =>
        msgSet.has(t) ||
        (t.length >= 6 && msgTokens.some((m) => m.length >= 6 && levenshtein(t, m) <= 1)),
    );
    if (matched.length < 2) continue;
    // Au moins un token distinctif (« chalet »), pas seulement « bar », « plage »…
    if (!matched.some((t) => !NAME_GENERIC.has(t))) continue;

    const coverage = matched.length / nTok.length;
    const contains = msg.includes(n) || n.includes(msg);
    if (!contains && coverage < 0.6) continue;

    // Score : recouvrement d'abord, inclusion littérale ensuite, longueur en dernier.
    const score = coverage * 1000 + (contains ? 500 : 0) + Math.min(n.length, 60);
    if (score > bestScore) {
      bestScore = score;
      best = { id: String(b.id), name: String(b.name), city: b.city ?? null };
    }
  }
  return best;
}


/**
 * CTA de réservation unique d'un établissement (même règle que la barre fixe du
 * slidepanel : premier lien dont le CTA/mode est un CTA de réservation).
 * Retourne aussi le WhatsApp, pour que la carte résultat IA porte les mêmes CTA.
 */
export function bookingCtaOf(b: any, lang: "fr" | "en" | "ar" = "fr"): { url: string; label: string } | null {
  const isReserve = (cta: any, mode: any) => {
    const n = String(`${cta || ""} ${mode || ""}`).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return /reserv/.test(n) || /\bbook(?:ing)?\b/.test(n) || /billet/.test(n) || /\btickets?\b/.test(n);
  };
  const fallback = lang === "en" ? "Book" : lang === "ar" ? "احجز" : "Réservez";
  const pairs: Array<[any, any, any]> = [
    [b?.reserve_now_url, b?.reserve_now_cta, b?.presentation_mode],
    [b?.online_shop_url, b?.online_shop_cta, b?.online_shop_presentation_mode],
    [b?.url_4, b?.url_4_cta, b?.url_4_presentation_mode],
    [b?.url_5, b?.url_5_cta, b?.url_5_presentation_mode],
  ];
  for (const [url, cta, mode] of pairs) {
    if (!url || typeof url !== "string") continue;
    if (!isReserve(cta, mode)) continue;
    const label = String(cta || "").trim();
    const isWa = label.toLowerCase().replace(/[\s_-]/g, "") === "whatsapp";
    if (isWa) continue; // le CTA WhatsApp est déjà rendu séparément
    return { url: url.startsWith("http") ? url : `https://${url}`, label: fallback };
  }
  return null;
}

/** Champs CTA à ajouter au payload de carte résultat IA. */
export function ctaFieldsOf(b: any) {
  const booking = bookingCtaOf(b);
  return {
    whatsapp: b?.whatsapp ?? null,
    booking_url: booking?.url ?? null,
    booking_label: booking?.label ?? null,
  };
}

export const CTA_SELECT_FIELDS =
  "phone, whatsapp, reserve_now_url, reserve_now_cta, presentation_mode, " +
  "online_shop_url, online_shop_cta, online_shop_presentation_mode, " +
  "url_4, url_4_cta, url_4_presentation_mode, url_5, url_5_cta, url_5_presentation_mode";
