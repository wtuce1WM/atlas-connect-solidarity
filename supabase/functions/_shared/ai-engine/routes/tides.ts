// Route déterministe « marées » (classe A, zéro token).
// Miroir de routes/weather.ts : on détecte l'intention et la ville côtière,
// le rendu réel est fait par le widget marées côté client (marqueur TIDES_FORECAST).

import { normalize } from "./shared.ts";

/** Villes côtières servies par la fonction `tides` (slug + alias). */
const COASTAL: { slug: string; name: string; aliases: string[] }[] = [
  { slug: "essaouira", name: "Essaouira", aliases: ["mogador", "essaouria", "souira", "sidi kaouki"] },
  { slug: "agadir", name: "Agadir", aliases: [] },
  { slug: "taghazout", name: "Taghazout", aliases: ["taghazoute", "tamraght"] },
  { slug: "casablanca", name: "Casablanca", aliases: ["casa", "ain diab"] },
  { slug: "mohammedia", name: "Mohammedia", aliases: [] },
  { slug: "rabat", name: "Rabat", aliases: ["sale", "salé"] },
  { slug: "el-jadida", name: "El Jadida", aliases: ["mazagan", "jadida"] },
  { slug: "oualidia", name: "Oualidia", aliases: ["walidia"] },
  { slug: "safi", name: "Safi", aliases: ["asfi", "sidi bouzid"] },
  { slug: "larache", name: "Larache", aliases: [] },
  { slug: "asilah", name: "Asilah", aliases: ["arzila"] },
  { slug: "tanger", name: "Tanger", aliases: ["tangier", "tanja"] },
  { slug: "sidi-ifni", name: "Sidi Ifni", aliases: ["legzira", "mirleft"] },
  { slug: "tarfaya", name: "Tarfaya", aliases: [] },
  { slug: "dakhla", name: "Dakhla", aliases: [] },
  { slug: "laayoune", name: "Laâyoune-Plage", aliases: ["laayoune plage", "foum el oued"] },
  { slug: "martil", name: "Martil", aliases: ["tetouan", "mdiq", "cabo negro"] },
  { slug: "al-hoceima", name: "Al Hoceïma", aliases: ["hoceima", "alhucemas"] },
  { slug: "saidia", name: "Saïdia", aliases: ["nador"] },
];

export function isTidesIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\b(maree|marees|marnage|coefficient de maree|basse mer|pleine mer|haute mer|maree haute|maree basse|houle|vagues?|surf|niveau de la mer)\b/i.test(n)) return true;
  if (/\b(tide|tides|tidal|low tide|high tide|swell|sea level)\b/i.test(n)) return true;
  if (/(المد|الجزر|المد والجزر|الأمواج)/.test(text)) return true;
  return false;
}

/** Résout la ville côtière : message > ville de scope > Essaouira (côte la plus proche de Marrakech). */
export function resolveTidesCity(text: string, scopeCity?: string | null): { slug: string; name: string } {
  const n = normalize(text);
  for (const c of COASTAL) {
    const keys = [normalize(c.name), c.slug.replace(/-/g, " "), ...c.aliases.map(normalize)];
    if (keys.some((k) => k && n.includes(k))) return { slug: c.slug, name: c.name };
  }
  if (scopeCity) {
    const s = normalize(scopeCity);
    for (const c of COASTAL) {
      const keys = [normalize(c.name), c.slug.replace(/-/g, " "), ...c.aliases.map(normalize)];
      if (keys.some((k) => k && s.includes(k))) return { slug: c.slug, name: c.name };
    }
  }
  return { slug: "essaouira", name: "Essaouira" };
}

export function tidesIntro(cityName: string, lang: "fr" | "en" | "ar"): string {
  return {
    fr: `Voici les marées, la houle et le vent à **${cityName}**. 👇`,
    en: `Here are the tides, swell and wind in **${cityName}**. 👇`,
    ar: `إليك المد والجزر والأمواج والريح في **${cityName}**. 👇`,
  }[lang];
}
