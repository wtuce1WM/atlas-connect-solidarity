// Translations for homepage vignette labels persisted in
// `homepage_cards_snapshots.payload[*].data.label`. Labels are stored in
// French (source of truth) — translate at render time based on active locale.
// Extend the map when a new label is introduced from the back-office.

type Lang = "fr" | "en" | "ar";

const MAP: Record<string, { en: string; ar: string }> = {
  "Auto / Moto": { en: "Auto / Moto", ar: "سيارات ودراجات" },
  "Mariage": { en: "Wedding", ar: "زفاف" },
  "Désert d'Agafay": { en: "Agafay Desert", ar: "صحراء أكافاي" },
  "Pour les enfants": { en: "For kids", ar: "للأطفال" },
  "Hébergement": { en: "Accommodation", ar: "الإقامة" },
  "Authentique": { en: "Authentic", ar: "أصيل" },
  "Culture": { en: "Culture", ar: "ثقافة" },
  "Ateliers": { en: "Workshops", ar: "ورش عمل" },
  "Suivez le guide": { en: "Follow the guide", ar: "اتبع الدليل" },
  "Vie nocturne": { en: "Nightlife", ar: "الحياة الليلية" },
  "Rooftops": { en: "Rooftops", ar: "التراسات" },
  "Sites touristiques": { en: "Tourist sites", ar: "المواقع السياحية" },
  "Décoration": { en: "Decoration", ar: "ديكور" },
  "#Vlogs": { en: "#Vlogs", ar: "#فلوغز" },
  "Solidarité": { en: "Solidarity", ar: "تضامن" },
  "Excursions": { en: "Excursions", ar: "رحلات" },
  "Alimentation": { en: "Food", ar: "تغذية" },
  "Sport & Loisirs": { en: "Sport & Leisure", ar: "رياضة وترفيه" },
  "Piscines": { en: "Pools", ar: "مسابح" },
  "Art Déco": { en: "Art Deco", ar: "آرت ديكو" },
  "Agenda": { en: "Events", ar: "أجندة" },
  "Bien-être": { en: "Wellness", ar: "العافية" },
  "Festival Gnaoua d'Essaouira": { en: "Gnaoua Festival Essaouira", ar: "مهرجان كناوة الصويرة" },
  "L'épicurien": { en: "The Epicurean", ar: "المتذوق" },
  "Artisanat marocain": { en: "Moroccan crafts", ar: "الحرف المغربية" },
  "Immobilier": { en: "Real Estate", ar: "العقارات" },
  "Restauration": { en: "Dining", ar: "المطاعم" },
  "Eco-Tourisme": { en: "Eco-Tourism", ar: "السياحة البيئية" },
  "Gnaoua": { en: "Gnaoua", ar: "كناوة" },
  "Shopping": { en: "Shopping", ar: "تسوق" },
  "Instagrammable": { en: "Instagrammable", ar: "قابل للنشر على إنستغرام" },
};

export function translateVignetteLabel(label: string | null | undefined, lang: Lang): string {
  if (!label) return "";
  if (lang === "fr") return label;
  const entry = MAP[label.trim()];
  if (!entry) return label; // fallback: keep FR source
  return entry[lang];
}
