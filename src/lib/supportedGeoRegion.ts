/**
 * Périmètre géographique réellement couvert par le catalogue : région
 * Marrakech-Safi (Marrakech, Essaouira, Safi, El Jadida sud…).
 * Hors de cette zone, la géolocalisation réelle n'a aucun résultat pertinent :
 * on retombe sur le point GPS de la Koutoubia (Marrakech).
 */
export const KOUTOUBIA_COORDS = { lat: 31.6242, lng: -7.9931 } as const;

export const MARRAKECH_SAFI_BOUNDS = {
  minLat: 30.5,
  maxLat: 32.9,
  minLng: -10.2,
  maxLng: -6.4,
} as const;

export function isInMarrakechSafi(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return (
    lat >= MARRAKECH_SAFI_BOUNDS.minLat &&
    lat <= MARRAKECH_SAFI_BOUNDS.maxLat &&
    lng >= MARRAKECH_SAFI_BOUNDS.minLng &&
    lng <= MARRAKECH_SAFI_BOUNDS.maxLng
  );
}

/** Position réelle si dans Marrakech-Safi, sinon Koutoubia. */
export function clampToSupportedRegion(coords: { lat: number; lng: number }): { lat: number; lng: number } {
  return isInMarrakechSafi(coords.lat, coords.lng) ? coords : { ...KOUTOUBIA_COORDS };
}
