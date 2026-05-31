import { supabase } from "@/integrations/supabase/client";

// Matches a trailing proximity clause like "… à proximité de Riad Dar Najat",
// "… près de la Mamounia", "… near Royal Mansour", etc.
const PROXIMITY_RE =
  /\s*(?:à\s+côté\s+de|a\s+cote\s+de|à\s+coté\s+de|près\s+de|pres\s+de|proche\s+de|autour\s+de|aux\s+alentours\s+de|à\s+proximité\s+de|a\s+proximite\s+de|near|around|close\s+to|next\s+to)\s+(.+?)\s*$/i;

// Optional distance qualifier ("moins de 500 m", "dans un rayon de 2 km", "within 1 km").
const DISTANCE_RE =
  /(?:à\s+)?moins\s+de\s+(\d+(?:[.,]\d+)?)\s*(kilom[èe]tres?|m[èe]tres?|km|m)\b/i;
const ALT_DISTANCE_RE =
  /\b(?:dans\s+un\s+rayon\s+de|rayon\s+de|within)\s+(\d+(?:[.,]\d+)?)\s*(kilom[èe]tres?|m[èe]tres?|km|m)\b/i;

export interface ProximitySearchParams {
  /** Cleaned keyword query (proximity + question words stripped). */
  query: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  targetName?: string;
}

/**
 * Detects a natural-language proximity sentence in `rawQuery` and resolves it
 * into geo search parameters. Returns null when no proximity phrase is found
 * (caller should fall through to the regular full-text search).
 */
export async function resolveProximityQuery(
  rawQuery: string,
  opts: { cityHint?: string | null } = {}
): Promise<ProximitySearchParams | null> {
  if (!rawQuery) return null;

  const distMatch = rawQuery.match(DISTANCE_RE) || rawQuery.match(ALT_DISTANCE_RE);
  let overrideRadiusKm: number | undefined;
  let working = rawQuery;
  if (distMatch) {
    const value = parseFloat(distMatch[1].replace(",", "."));
    const unit = distMatch[2].toLowerCase();
    overrideRadiusKm = /^k/i.test(unit) ? value : value / 1000;
    working = working.replace(distMatch[0], "").trim();
  }

  const proxMatch = working.match(PROXIMITY_RE);
  if (!proxMatch) return null;

  const rawTarget = proxMatch[1].trim().replace(/[?.!,;:]+$/, "");
  if (!rawTarget) return null;

  const variants = [
    ...new Set(
      [
        rawTarget,
        rawTarget
          .replace(
            /^(riad|hôtel|hotel|appartement|villa|maison\s+d['’ ]?hôtes?)\s+/i,
            ""
          )
          .trim(),
      ].filter(Boolean)
    ),
  ];

  let targets: Array<{ id: string; name: string; latitude: number | null; longitude: number | null; city: string | null }> = [];
  for (const variant of variants) {
    const { data } = await supabase
      .from("businesses")
      .select("id, name, latitude, longitude, city")
      .ilike("name", `%${variant}%`)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(5);
    if (data?.length) {
      targets = data as typeof targets;
      break;
    }
  }

  const cityHint = opts.cityHint?.toLowerCase() || "";
  const target =
    targets.find((t) => cityHint && t.city && t.city.toLowerCase() === cityHint) ||
    targets[0];

  if (!target?.latitude || !target?.longitude) return null;

  const cleanedQuery = working
    .replace(PROXIMITY_RE, "")
    .replace(/\?+\s*$/g, "")
    .replace(
      /^\s*(quels?|quelles?|qui|que|quoi|où|ou|comment|combien|liste(?:-moi|moi)?|donne(?:-moi|moi)?|montre(?:-moi|moi)?|trouve(?:-moi|moi)?|cherche(?:-moi|moi)?|peux-tu|peut-on|y\s+a-t-il)\b[\s,]*/i,
      ""
    )
    .replace(/\b(sont|est|sont-ils|sont-elles|il\s+y\s+a|stp|svp)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    query: cleanedQuery || rawTarget,
    latitude: Number(target.latitude),
    longitude: Number(target.longitude),
    radiusKm: overrideRadiusKm ?? 2,
    targetName: target.name,
  };
}
