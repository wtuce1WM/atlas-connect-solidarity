// Extrait verbatim de supabase/functions/embed-ai-chat/index.ts (moteur A/B/C, étape 3).
// Route `engagement` — filtrage sur engagements/certifications/commodités + recherche ville entière.
// Aucune réécriture : le rendu est déjà validé en production.

import { normalize, toMapMarker } from "./shared.ts";
import { buildDisclosureFromCounts, stripText } from "./nearby.ts";

/**
 * Deterministic: ENGAGEMENT / CERTIFICATION / COMMODITÉ filter on priors.
 * Reads businesses.engagements (raw values include "Certification:X", "Logistique:Y", "Marché:Z"
 * plus standalone tokens like "Vegan", "WiFi", "Livraison Glovo"). Matches the user's free-text
 * follow-up against the vocabulary present in the prior results, and returns those that carry
 * at least one matched engagement. No LLM, no re-search.
 */
export function stripEngPrefix(s: string): string {
  return String(s || "").replace(/^\s*(Certification|Logistique|Marché|Marche)\s*:\s*/i, "").trim();
}

export function matchEngagementsFromPriors(userText: string, priors: any[]): string[] {
  const nq = " " + normalize(userText) + " ";
  if (!nq.trim()) return [];
  const uniq = new Map<string, string>(); // normalized -> raw (prefix stripped)
  for (const b of priors) {
    for (const e of (b?.engagements || [])) {
      const raw = stripEngPrefix(e);
      if (!raw) continue;
      const norm = normalize(raw);
      if (norm.length < 3) continue;
      if (!uniq.has(norm)) uniq.set(norm, raw);
    }
  }
  const matches: string[] = [];
  for (const [norm, raw] of uniq) {
    if (nq.includes(norm)) { matches.push(raw); continue; }
    // Word-level: every "significant" word of the engagement (len>=4) must appear in query
    const words = norm.split(/\s+/).filter((w) => w.length >= 4);
    if (words.length && words.every((w) => nq.includes(w))) {
      matches.push(raw);
    }
  }
  return matches;
}
/**
 * Deterministic: CITY-WIDE ENGAGEMENT / COMMODITÉ / CERTIFICATION SEARCH.
 * Ex: "tous les commerçants de la ville qui ont la livraison glovo",
 *     "tous les établissements de Marrakech avec wifi",
 *     "commerçants qui proposent le paiement cash".
 * Does a fresh DB search across the whole city, not a filter on previous results.
 */
export function isCityEngagementSearchIntent(text: string): boolean {
  const n = normalize(text || "");
  if (!n) return false;
  // Broad / city-wide scope marker
  const broad = /\b(tous les|tous les commercants|tous les etablissements|commercants de la ville|commerçants de la ville|commercant de la ville|commerçant de la ville|etablissements de la ville|de la ville|dans la ville|en ville|toute la ville|ville entiere|tout commercant|tout commerçant|tout etablissement|tous les magasins|all merchants|all businesses in the city|all places in)\b/.test(n);

  if (!broad) return false;
  // Engagement qualifier marker
  return /\b(avec|qui ont|qui proposent|ayant|disposent de|proposent|offrent|proposant|offrant|have|offering|with)\b/.test(n);
}

export function extractEngagementQueryTerm(text: string): string | null {
  const n = normalize(text || "");
  const patterns = [
    /\b(avec|qui ont|qui proposent|ayant|disposent de|proposent|offrent|proposant|offrant|have|offering|with)\s+(.{3,80})/,
    /\b(ont|proposent|offrent)\s+(?:la|le|les|l'|the|a|an)?\s*(.{3,80})/,
  ];
  for (const re of patterns) {
    const m = n.match(re);
    if (m) {
      const raw = m[m.length - 1].trim();
      // Strip leading articles and punctuation
      const cleaned = raw
        .replace(/^(?:la|le|les|l'|the|a|an)\s+/, "")
        .replace(/[.,!?;:|]$/, "")
        .trim();
      return cleaned.length >= 3 ? cleaned : null;
    }
  }
  return null;
}

export async function resolveCityEngagementTerm(
  admin: any,
  city: string,
  queryTerm: string,
): Promise<string | null> {
  const q = normalize(queryTerm);
  if (!q || q.length < 3) return null;

  // Fetch candidate engagement values in the city (prefix stripped for matching).
  const { data } = await admin
    .from("businesses")
    .select("engagements")
    .eq("is_active", true)
    .eq("city", city)
    .is("closure_message", null)
    .not("engagements", "is", null)
    .limit(1000);

  const candidates = new Map<string, string>(); // normalized -> raw (prefix stripped)
  for (const row of data || []) {
    for (const e of row.engagements || []) {
      const raw = stripEngPrefix(e);
      const norm = normalize(raw);
      if (norm.length < 3) continue;
      if (!candidates.has(norm)) candidates.set(norm, raw);
    }
  }

  if (candidates.has(q)) return candidates.get(q)!;

  let best: { raw: string; score: number } | null = null;
  for (const [norm, raw] of candidates) {
    if (norm.includes(q) || q.includes(norm)) {
      const score = norm.length + 10;
      if (!best || score > best.score) best = { raw, score };
    }
    // Word-level overlap (len >= 4 to avoid noisy matches)
    const qWords = q.split(/\s+/).filter((w) => w.length >= 4);
    const eWords = norm.split(/\s+/).filter((w) => w.length >= 4);
    const overlap = qWords.filter((w) => eWords.includes(w)).length;
    if (overlap > 0) {
      const score = overlap * 100 + norm.length;
      if (!best || score > best.score) best = { raw, score };
    }
  }
  return best?.raw || null;
}

export async function buildCityEngagementSearch(
  admin: any,
  host: any,
  userMessage: string,
  lang: "fr" | "en" | "ar",
): Promise<{ text: string; markers: string } | null> {
  const city = host.city || "Marrakech";
  const term = extractEngagementQueryTerm(userMessage);
  if (!term) return null;

  const resolved = await resolveCityEngagementTerm(admin, city, term);
  if (!resolved) return null;

  const { data: allRows } = await admin
    .from("businesses")
    .select("id, name, slug, city, neighborhood, address, main_category, categories, latitude, longitude, logo_url, images, hook_fr, hook_en, hook_ar, description, description_en, description_ar, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, computed_rating, total_review_count, engagements, is_featured, is_open_24h, opening_hours, show_opening_hours, default_service")
    .eq("is_active", true)
    .eq("city", city)
    .is("closure_message", null)
    .not("engagements", "is", null)
    .limit(1200);

  const targetNorm = normalize(resolved);
  const rows = (allRows || []).filter((b: any) =>
    (b.engagements || []).some((e: string) => normalize(stripEngPrefix(e)) === targetNorm)
  );

  if (!rows.length) return null;

  rows.sort((a: any, b: any) => {
    const fa = a.is_featured ? 1 : 0;
    const fb = b.is_featured ? 1 : 0;
    if (fb !== fa) return fb - fa;
    const ra = a.computed_rating ?? a.rating ?? -1;
    const rb = b.computed_rating ?? b.rating ?? -1;
    if (rb !== ra) return rb - ra;
    const ca = a.total_review_count ?? 0;
    const cb = b.total_review_count ?? 0;
    if (cb !== ca) return cb - ca;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  const shown = rows.slice(0, 10);
  const total = rows.length;

  const intro = lang === "en"
    ? `Here are the merchants in **${city}** offering **${resolved}** — a city-wide selection from the One World Morocco guide.`
    : lang === "ar"
      ? `إليك التجار في **${city}** الذين يقدمون **${resolved}** — اختيار من دليل One World Morocco.`
      : `Voici les commerçants à **${city}** qui proposent **${resolved}** — une sélection dans tout le guide One World Morocco.`;

  const body = shown.map((b: any) => {
    const hook = stripText(b.hook_fr || b.hook_en || b.description || b.description_en || "");
    const area = [b.neighborhood, b.city].filter(Boolean).join(", ");
    const detail = hook || [b.main_category, Array.isArray(b.categories) ? b.categories.join(", ") : null].filter(Boolean).join(" · ");
    return `**${b.name}**${area ? `, ${area}` : ""}. ${detail || "Une adresse One World Morocco."}`;
  }).join("\n\n");

  const disclosure = buildDisclosureFromCounts(shown.length, total, city);
  const closing = lang === "en"
    ? `Want me to narrow this by neighborhood, vibe, or proximity to **${host.name}**?`
    : lang === "ar"
      ? `هل تريد أن أضيّق حسب الحي أو الأجواء أو القرب من **${host.name}**؟`
      : `Tu veux que je resserre par quartier, ambiance, ou proximité avec **${host.name}** ?`;

  const text = `${intro}\n\n${body}\n\n${disclosure}\n\n${closing}`;
  return { text, markers: toMapMarker(shown) };
}
