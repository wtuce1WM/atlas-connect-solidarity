/**
 * Bloc déterministe VILLES (zéro token).
 *
 * L'assistant ne propose plus de « destinations » : le périmètre géographique
 * proposé à l'utilisateur est une VILLE (`cities`). Une suggestion curatée peut
 * rester liée à des destinations (`ai_suggestions.destination_ids`) : les villes
 * affichées sont alors celles que ces destinations couvrent
 * (`destinations.city_ids`). Aucun périmètre n'est inventé.
 */

export interface CityCardOut {
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
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
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

export function cityCardsMarker(payload: { title?: string | null; cities: CityCardOut[] }) {
  const safe = JSON.stringify(payload).replace(/-->/g, "--&gt;");
  return `<!--CITY_CARDS:${safe}-->`;
}

/**
 * Villes couvertes par les destinations liées à la suggestion, triées par
 * distance depuis l'hôte (sinon dans l'ordre de la curatelle), et construit le
 * bloc texte court + le marqueur du carrousel.
 */
export async function buildCitiesBlockFromDestinations(
  admin: any,
  destinationIds: string[],
  host: { name?: string | null; latitude?: number | null; longitude?: number | null } | null,
  lang: string,
  title?: string | null,
): Promise<{ text: string; marker: string; count: number } | null> {
  const ids = (destinationIds || []).filter(Boolean);
  if (!ids.length) return null;

  // 1) Les destinations liées portent la liste des villes qu'elles couvrent.
  const { data: dests } = await admin
    .from("destinations")
    .select("id, city_ids")
    .in("id", ids);
  if (!dests || !dests.length) return null;

  const cityOrder: string[] = [];
  const seen = new Set<string>();
  for (const d of (dests as any[])) {
    for (const cid of (Array.isArray(d?.city_ids) ? d.city_ids : [])) {
      const key = String(cid || "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      cityOrder.push(key);
    }
  }
  if (!cityOrder.length) return null;

  // 2) Villes actives uniquement.
  const { data: rows } = await admin
    .from("cities")
    .select("id, name_fr, name_en, name_ar, description_fr, description_en, description_ar, image_url, latitude, longitude")
    .in("id", cityOrder)
    .eq("is_active", true);
  if (!rows || !rows.length) return null;

  const hostLat = Number(host?.latitude);
  const hostLng = Number(host?.longitude);
  const hasHost = Number.isFinite(hostLat) && Number.isFinite(hostLng);
  const pick = <T,>(fr: T, en: T, ar: T): T => (lang === "en" ? (en ?? fr) : lang === "ar" ? (ar ?? fr) : fr);

  const cities: CityCardOut[] = (rows as any[]).map((c: any) => {
    const name = pick(c.name_fr, c.name_en, c.name_ar) || c.name_fr;
    const hook = stripHtml(pick(c.description_fr, c.description_en, c.description_ar) || c.description_fr) || null;
    const lat = Number.isFinite(Number(c.latitude)) ? Number(c.latitude) : null;
    const lng = Number.isFinite(Number(c.longitude)) ? Number(c.longitude) : null;
    const distKm = hasHost && lat != null && lng != null ? kmBetween(hostLat, hostLng, lat, lng) : null;
    return {
      id: String(c.id),
      name: String(name || ""),
      hook,
      image: c.image_url || null,
      latitude: lat,
      longitude: lng,
      distKm,
    };
  }).filter((c) => c.name);
  if (!cities.length) return null;

  if (hasHost) {
    cities.sort((a, b) => (a.distKm ?? Infinity) - (b.distKm ?? Infinity));
  } else {
    const order = new Map(cityOrder.map((id, i) => [id, i]));
    cities.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  }

  const hostName = host?.name || "";
  const n = cities.length;
  const text =
    lang === "en"
      ? `\n\n**${n} cities** to explore${hostName ? ` from ${hostName}` : ""} — closest first. Tap a card to filter on that city, or open them all on the map.`
      : lang === "ar"
      ? `\n\n**${n} مدن** للاستكشاف${hostName ? ` انطلاقاً من ${hostName}` : ""} — الأقرب أولاً. اضغط على بطاقة للتصفية حسب هذه المدينة، أو افتحها كلها على الخريطة.`
      : `\n\n**${n} villes** à explorer${hostName ? ` au départ de ${hostName}` : ""} — la plus proche d'abord. Clique une vignette pour filtrer sur cette ville, ou affiche-les toutes sur la carte.`;

  return {
    text,
    marker: `\n\n${cityCardsMarker({ title: title || null, cities: cities.slice(0, 20) })}`,
    count: n,
  };
}
