/**
 * Villes proposées dans les étapes « Widget Météo » et « Widget Marées, Vents & Météo »
 * du Studio Vidéo IA. Les coordonnées réelles sont résolues côté serveur
 * (edge function video-scenario-generate) à partir du slug.
 */
export type WidgetCityOption = { slug: string; name: string };

export const WEATHER_CITY_OPTIONS: WidgetCityOption[] = [
  { slug: "marrakech", name: "Marrakech" },
  { slug: "essaouira", name: "Essaouira" },
  { slug: "agadir", name: "Agadir" },
  { slug: "taghazout", name: "Taghazout" },
  { slug: "casablanca", name: "Casablanca" },
  { slug: "rabat", name: "Rabat" },
  { slug: "fes", name: "Fès" },
  { slug: "tanger", name: "Tanger" },
  { slug: "chefchaouen", name: "Chefchaouen" },
  { slug: "ouarzazate", name: "Ouarzazate" },
  { slug: "merzouga", name: "Merzouga" },
  { slug: "dakhla", name: "Dakhla" },
];

/** Villes côtières (marées disponibles). */
export const TIDES_CITY_OPTIONS: WidgetCityOption[] = [
  { slug: "essaouira", name: "Essaouira" },
  { slug: "agadir", name: "Agadir" },
  { slug: "taghazout", name: "Taghazout" },
  { slug: "casablanca", name: "Casablanca" },
  { slug: "mohammedia", name: "Mohammedia" },
  { slug: "rabat", name: "Rabat" },
  { slug: "el-jadida", name: "El Jadida" },
  { slug: "oualidia", name: "Oualidia" },
  { slug: "safi", name: "Safi" },
  { slug: "asilah", name: "Asilah" },
  { slug: "tanger", name: "Tanger" },
  { slug: "sidi-ifni", name: "Sidi Ifni" },
  { slug: "dakhla", name: "Dakhla" },
  { slug: "martil", name: "Martil" },
  { slug: "al-hoceima", name: "Al Hoceïma" },
  { slug: "saidia", name: "Saïdia" },
];

export const cityNameFromSlug = (slug: string, list: WidgetCityOption[]): string =>
  list.find((c) => c.slug === slug)?.name || slug;
