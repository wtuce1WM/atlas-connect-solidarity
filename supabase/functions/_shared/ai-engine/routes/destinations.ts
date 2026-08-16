/**
 * Route déterministe DESTINATIONS (zéro token).
 *
 * Une suggestion / relance curatée peut être liée à des destinations
 * (`destination_ids`). Elles ne remplacent pas les résultats établissements :
 * elles les complètent, sous forme d'un bloc court + carrousel horizontal
 * (marqueur `DESTINATION_CARDS`), classé par distance depuis l'établissement hôte.
 */

export interface DestinationCardOut {
  id: string;
  name: string;
  hook: string | null;
  image: string | null;
  latitude: number | null;
  longitude: number | null;
  distKm: number | null;
}

const toRad = (v: number) => (v * Math.PI) / 180;
function kmBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function stripHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&(lt|gt|quot|#39);/gi, (_m, e) =>
      (({ lt: "<", gt: ">", quot: '"', "#39": "'" }) as Record<string, string>)[e] ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function destinationCardsMarker(payload: { title?: string | null; destinations: DestinationCardOut[] }) {
  const safe = JSON.stringify(payload).replace(/-->/g, "--&gt;");
  return `<!--DESTINATION_CARDS:${safe}-->`;
}

/**
 * Charge les destinations liées, triées par distance depuis l'hôte, et
 * construit le bloc texte court + le marqueur du carrousel.
 */
export async function buildDestinationsBlock(
  admin: any,
  destinationIds: string[],
  host: { name?: string | null; latitude?: number | null; longitude?: number | null } | null,
  lang: string,
  title?: string | null,
): Promise<{ text: string; marker: string; count: number } | null> {
  const ids = (destinationIds || []).filter(Boolean);
  if (!ids.length) return null;

  const { data: raw } = await admin
    .from("destinations")
    .select("id, name_fr, name_en, name_ar, hook_fr, hook_en, hook_ar, description_fr, description_en, description_ar, image_url, images, latitude, longitude")
    .in("id", ids);
  if (!raw || !raw.length) return null;

  const hostLat = Number(host?.latitude);
  const hostLng = Number(host?.longitude);
  const hasHost = Number.isFinite(hostLat) && Number.isFinite(hostLng);
  const pick = <T,>(fr: T, en: T, ar: T): T => (lang === "en" ? (en ?? fr) : lang === "ar" ? (ar ?? fr) : fr);

  const dests: DestinationCardOut[] = raw.map((d: any) => {
    const name = pick(d.name_fr, d.name_en, d.name_ar) || d.name_fr;
    const hook = stripHtml(pick(d.hook_fr, d.hook_en, d.hook_ar) || d.hook_fr || d.description_fr) || null;
    const image = d.image_url || (Array.isArray(d.images) && d.images.length ? d.images[0] : null);
    const lat = Number.isFinite(Number(d.latitude)) ? Number(d.latitude) : null;
    const lng = Number.isFinite(Number(d.longitude)) ? Number(d.longitude) : null;
    const distKm = hasHost && lat != null && lng != null ? kmBetween(hostLat, hostLng, lat, lng) : null;
    return { id: d.id, name, hook, image, latitude: lat, longitude: lng, distKm };
  });

  if (hasHost) {
    dests.sort((a, b) => (a.distKm ?? Infinity) - (b.distKm ?? Infinity));
  } else {
    const order = new Map(ids.map((id, i) => [id, i]));
    dests.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  }

  const hostName = host?.name || "";
  const n = dests.length;
  const text =
    lang === "en"
      ? `\n\n**${n} destinations** to explore${hostName ? ` from ${hostName}` : ""} — closest first. Tap a card to open its immersive page, or open them all on the map.`
      : lang === "ar"
      ? `\n\n**${n} وجهة** للاستكشاف${hostName ? ` انطلاقاً من ${hostName}` : ""} — الأقرب أولاً. اضغط على بطاقة لفتح صفحتها، أو افتحها كلها على الخريطة.`
      : `\n\n**${n} destinations** à explorer${hostName ? ` au départ de ${hostName}` : ""} — la plus proche d'abord. Clique une vignette pour ouvrir sa fiche immersive, ou affiche-les toutes sur la carte.`;

  return {
    text,
    marker: `\n\n${destinationCardsMarker({ title: title || null, destinations: dests.slice(0, 20) })}`,
    count: n,
  };
}
