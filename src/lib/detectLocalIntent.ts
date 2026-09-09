/**
 * Détecte une intention de recherche locale dans une question tapée ou vocale.
 * Déclenche la proposition de géolocalisation quand l'utilisateur mentionne
 * explicitement sa position actuelle ("près de moi", "near me", etc.).
 */

const LOCAL_INTENT_PATTERNS: RegExp[] = [
  // français
  /\b(près|autour|proche|à côté|à proximité)\s+(de\s+)?(moi|chez\s+moi)\b/i,
  /\b(les?|des)\s+plus\s+proches?\b/i,
  /\bproximité\s+immédiate\b/i,
  // anglais
  /\b(near|around|close\s+to|nearby)\s+(me|my\s+(location|position|area))\b/i,
  /\bin\s+my\s+(area|vicinity|neighborhood)\b/i,
  // arabe
  /\b(قربي|بجواري|بالقرب\s+مني|قريب\s+مني|حولي)\b/i,
];

export function detectLocalIntent(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const normalized = text.trim();
  if (!normalized) return false;
  return LOCAL_INTENT_PATTERNS.some((re) => re.test(normalized));
}
