import { haversineKm } from "@/lib/haversine";
import type { City } from "@/lib/homeHelpers";

/**
 * Extensible mapping of cities to their geographic anchor + detection radius.
 * The first matching entry (within radiusKm of user coords) wins.
 * The fallback (radiusKm: Infinity) is always used when nothing else matches.
 *
 * To add a new city homepage: add an entry here AND ensure the City literal
 * type in homeHelpers.ts includes its name.
 */
export interface CityHomepageEntry {
  city: City;
  coords: { lat: number; lng: number };
  radiusKm: number;
}

export const CITY_HOMEPAGES: CityHomepageEntry[] = [
  { city: "Essaouira", coords: { lat: 31.5085, lng: -9.7595 }, radiusKm: 80 },
  // Marrakech is the default fallback (matches everything)
  { city: "Marrakech", coords: { lat: 31.6295, lng: -7.9811 }, radiusKm: Infinity },
];

const LAST_CITY_KEY = "home_last_city";

/** Resolve the best homepage city for the given user coords. */
export function resolveHomepageCity(coords: { lat: number; lng: number } | null): City {
  if (!coords) return "Marrakech";
  for (const entry of CITY_HOMEPAGES) {
    const d = haversineKm(coords.lat, coords.lng, entry.coords.lat, entry.coords.lng);
    if (d <= entry.radiusKm) return entry.city;
  }
  return "Marrakech";
}

/** Read the last viewed homepage city from localStorage (avoids first-paint flash). */
export function readLastHomepageCity(): City | null {
  try {
    const v = localStorage.getItem(LAST_CITY_KEY);
    if (v && CITY_HOMEPAGES.some((e) => e.city === v)) return v as City;
  } catch {
    // ignore
  }
  return null;
}

/** Persist the currently displayed homepage city. */
export function writeLastHomepageCity(city: City): void {
  try {
    localStorage.setItem(LAST_CITY_KEY, city);
  } catch {
    // ignore
  }
}
