// Route déterministe « Livraison Glovo » (zéro token).
// Règle : quand l'utilisateur parle de Glovo, la seule vérité est la présence
// d'une URL Glovo (`businesses.glovo_url`) parmi les plateformes de réservation.
// Aucune recherche sémantique : sinon le moteur remontait des commerces sans
// Glovo (ex. Mon Quotidien) simplement parce que « livraison » figurait dans
// leurs textes.

import { normalize } from "./shared.ts";

export function isGlovoIntent(text: string): boolean {
  return /\bglovo\b/.test(normalize(text || ""));
}

export type GlovoRow = { id: string; city: string | null; latitude: number | null; longitude: number | null };

function distKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Retourne les IDs (triés) des établissements de la ville qui publient une URL
 * Glovo. Si l'hôte a des coordonnées et un rayon, les adresses dans le rayon
 * passent devant ; on n'exclut personne pour ne pas vider la réponse.
 */
export async function loadGlovoBusinessIds(
  admin: any,
  opts: { city: string | null; host?: any; radiusKm?: number | null },
): Promise<string[]> {
  let q = admin
    .from("businesses")
    .select("id, city, latitude, longitude, is_featured, computed_rating, total_review_count")
    .eq("is_active", true)
    .is("closure_message", null)
    .not("glovo_url", "is", null)
    .neq("glovo_url", "")
    .order("is_featured", { ascending: false })
    .order("computed_rating", { ascending: false, nullsFirst: false })
    .limit(200);
  if (opts.city) q = q.eq("city", opts.city);
  const { data, error } = await q;
  if (error) {
    console.error("[glovo] query_failed", String(error?.message || error));
    return [];
  }
  let rows = (data || []).filter((b: any) => b?.id && b.id !== opts.host?.id);
  const hLat = Number(opts.host?.latitude);
  const hLng = Number(opts.host?.longitude);
  const radius = Number(opts.radiusKm);
  if (Number.isFinite(hLat) && Number.isFinite(hLng) && Number.isFinite(radius) && radius > 0) {
    const withDist = rows.map((b: any) => ({
      b,
      d: Number.isFinite(Number(b.latitude)) && Number.isFinite(Number(b.longitude))
        ? distKm(hLat, hLng, Number(b.latitude), Number(b.longitude))
        : Number.POSITIVE_INFINITY,
    }));
    const inside = withDist.filter((x) => x.d <= radius).sort((a, b2) => a.d - b2.d);
    const outside = withDist.filter((x) => x.d > radius);
    rows = [...inside.map((x) => x.b), ...outside.map((x) => x.b)];
  }
  return rows.map((b: any) => String(b.id));
}

export function glovoHeading(lang: "fr" | "en" | "ar", city: string | null): string {
  const where = city ? (lang === "en" ? ` in ${city}` : lang === "ar" ? ` في ${city}` : ` à ${city}`) : "";
  return lang === "en"
    ? `**Glovo delivery**${where} — addresses with an active Glovo link:`
    : lang === "ar"
      ? `**التوصيل عبر Glovo**${where} — العناوين التي لديها رابط Glovo:`
      : `**Livraison Glovo**${where} — les adresses avec un lien Glovo actif :`;
}

export function glovoEmpty(lang: "fr" | "en" | "ar", city: string | null): string {
  const where = city ? (lang === "en" ? ` in ${city}` : lang === "ar" ? ` في ${city}` : ` à ${city}`) : "";
  return lang === "en"
    ? `I don't have any address${where} with a Glovo link in the guide yet.`
    : lang === "ar"
      ? `لا يوجد حاليًا أي عنوان${where} بربط Glovo في الدليل.`
      : `Je n'ai encore aucune adresse${where} avec un lien Glovo dans le guide.`;
}
