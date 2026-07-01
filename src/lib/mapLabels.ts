// Shared translations for the Google map overlays used across
// /search tabs (Results, IA, POI, Destinations).

type Lang = "fr" | "en" | "ar" | string;

const DICT = {
  youAreHere: { fr: "Vous êtes ici", en: "You are here", ar: "أنت هنا" },
  top20: { fr: "Top 20", en: "Top 20", ar: "أفضل 20" },
  all: { fr: "Tous", en: "All", ar: "الكل" },
  proximity: { fr: "À proximité", en: "Nearby", ar: "بالقرب" },
  allDistances: { fr: "Toutes distances", en: "All distances", ar: "كل المسافات" },
  lt500m: { fr: "Moins de 500 m", en: "Under 500 m", ar: "أقل من 500 م" },
  lt1km: { fr: "Moins de 1 km", en: "Under 1 km", ar: "أقل من 1 كم" },
  lt5km: { fr: "Moins de 5 km", en: "Under 5 km", ar: "أقل من 5 كم" },
  lt10km: { fr: "Moins de 10 km", en: "Under 10 km", ar: "أقل من 10 كم" },
  attractions: { fr: "Attractions", en: "Attractions", ar: "معالم" },
  allAttractions: { fr: "Toutes les attractions", en: "All attractions", ar: "كل المعالم" },
} as const;

type Key = keyof typeof DICT;

export function mapLabel(key: Key, language: Lang): string {
  const entry = DICT[key];
  const l = (language === "en" || language === "ar" ? language : "fr") as "fr" | "en" | "ar";
  return entry[l] ?? entry.fr;
}

export function proximityOptions(language: Lang): { km: number; label: string }[] {
  return [
    { km: 0.5, label: mapLabel("lt500m", language) },
    { km: 1, label: mapLabel("lt1km", language) },
    { km: 5, label: mapLabel("lt5km", language) },
    { km: 10, label: mapLabel("lt10km", language) },
  ];
}
