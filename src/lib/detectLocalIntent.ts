/**
 * Détecte une intention de recherche locale dans une question tapée ou vocale.
 * Déclenche la proposition de géolocalisation quand l'utilisateur mentionne
 * explicitement sa position actuelle ("près de moi", "à côté de moi", "near me"…).
 *
 * Les motifs sont appliqués sur une version normalisée du texte (minuscules,
 * accents retirés) : les frontières de mots \b de JavaScript ne fonctionnent
 * pas devant un caractère accentué comme "à".
 */

const LOCAL_INTENT_PATTERNS: RegExp[] = [
  // français (texte normalisé sans accents)
  /\b(pres|autour|proche|proches|a\s+cote|a\s+proximite|aux?\s+alentours)\s+(de\s+)?(moi|chez\s+moi|ma\s+position|ou\s+je\s+suis)\b/i,
  /\b(les?|des)\s+plus\s+proches?\b/i,
  /\bproximite\s+immediate\b/i,
  /\bautour\s+de\s+moi\b/i,
  // "à côté", "à proximité", "autour d'ici", "dans le coin" sans référence explicite à soi
  /\b(a\s+cote|a\s+proximite|autour\s+d'?ici|dans\s+le\s+coin|pres\s+d'?ici|aux?\s+alentours)\b/i,
  /\bdans\s+mon\s+(quartier|coin|secteur)\b/i,
  // anglais
  /\b(near|around|close\s+to|nearby|next\s+to)\s+(me|my\s+(location|position|area))\b/i,
  /\bin\s+my\s+(area|vicinity|neighborhood|neighbourhood)\b/i,
  // arabe (pas de normalisation nécessaire)
  /(قربي|بجواري|بالقرب\s+مني|قريب\s+مني|حولي)/,
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function detectLocalIntent(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const normalized = normalize(text);
  if (!normalized) return false;
  return LOCAL_INTENT_PATTERNS.some((re) => re.test(normalized) || re.test(text));
}
