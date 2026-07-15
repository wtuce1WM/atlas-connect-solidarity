// Static translations for the front_structure grouping names used in the
// POI map overlay category pill. These names are not stored in the
// subcategories table, so they are maintained here until they get their own
// translated columns in the database.
export const FRONT_STRUCTURE_TRANSLATIONS: Record<string, { en: string; ar: string }> = {
  "Restauration": { en: "Restaurants", ar: "المطاعم" },
  "Hébergement": { en: "Accommodation", ar: "الإقامة" },
  "Bien-être": { en: "Wellness", ar: "العافية" },
  "Vie nocturne": { en: "Nightlife", ar: "الحياة الليلية" },
  "Culture": { en: "Culture", ar: "الثقافة" },
  "Artisanat marocain": { en: "Moroccan crafts", ar: "الحرف المغربية" },
  "Décoration": { en: "Decoration", ar: "الديكور" },
  "Sport & Loisirs": { en: "Sports & Leisure", ar: "الرياضة والترفيه" },
  "Shopping": { en: "Shopping", ar: "التسوق" },
  "Alimentation": { en: "Food", ar: "الأغذية" },
  "Transport": { en: "Transport", ar: "النقل" },
  "Informatique": { en: "IT", ar: "المعلوماتية" },
  "Immobilier": { en: "Real estate", ar: "العقارات" },
  "Santé": { en: "Health", ar: "الصحة" },
  "Auto / Moto": { en: "Auto / Moto", ar: "السيارات / الدراجات" },
};

export function translateFrontStructure(name: string | null | undefined, lang: string): string {
  if (!name) return "";
  const row = FRONT_STRUCTURE_TRANSLATIONS[name];
  if (!row) return name;
  return lang === "en" ? row.en : lang === "ar" ? row.ar : name;
}
