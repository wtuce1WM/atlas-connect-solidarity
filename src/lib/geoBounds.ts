/**
 * Bounding box approximative du Maroc continental.
 * Exclut les coordonnées nulles / géocodées à l'étranger qui polluent la carte.
 */
export const MOROCCO_BOUNDS = {
  minLat: 21,
  maxLat: 36.5,
  minLng: -17.5,
  maxLng: -1,
} as const;

export function isInMoroccoBounds(
  latitude: number | string | null | undefined,
  longitude: number | string | null | undefined
): boolean {
  if (latitude == null || longitude == null) return false;
  const lat = typeof latitude === "string" ? Number(latitude) : latitude;
  const lng = typeof longitude === "string" ? Number(longitude) : longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return (
    lat >= MOROCCO_BOUNDS.minLat &&
    lat <= MOROCCO_BOUNDS.maxLat &&
    lng >= MOROCCO_BOUNDS.minLng &&
    lng <= MOROCCO_BOUNDS.maxLng
  );
}
