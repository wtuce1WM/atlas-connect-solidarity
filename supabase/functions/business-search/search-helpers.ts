// Extracted pure functions from business-search for testability
// These are imported by both index.ts and index.test.ts

export const stripAccentsGlobal = (s: string): string =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const FRENCH_STOP_WORDS = new Set([
  "je", "tu", "il", "elle", "nous", "vous", "ils", "elles", "on",
  "un", "une", "des", "le", "la", "les", "du", "de", "d",
  "à", "au", "aux", "en", "pour", "par", "avec", "sans", "sur", "dans",
  "qui", "que", "quoi", "où", "comment", "quel", "quelle", "quels", "quelles",
  "est", "sont", "suis", "ai", "a", "ont", "être", "avoir", "faire",
  "cherche", "chercher", "veux", "voudrais", "vouloir", "peux", "pouvoir",
  "trouve", "trouver", "besoin", "faut", "aimer", "aller",
  "me", "te", "se", "ce", "cette", "ces", "mon", "ma", "mes", "son", "sa", "ses",
  "ne", "pas", "plus", "très", "aussi", "bien", "comme", "mais", "ou", "et",
]);

export function normalizeMatchingText(value: string): string {
  return stripAccentsGlobal(value.toLowerCase())
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeForMatching(value: string): string[] {
  const normalized = normalizeMatchingText(value);
  if (!normalized) return [];
  const baseTokens = normalized.split(" ").filter(Boolean);
  const expanded = new Set<string>(baseTokens);

  for (const token of baseTokens) {
    if (token.length > 3 && token.endsWith("s")) {
      expanded.add(token.slice(0, -1));
    }
    if (token.length > 4 && token.endsWith("es")) {
      expanded.add(token.slice(0, -2));
    }
  }

  return [...expanded];
}

export function tagsMatchCandidate(candidate: string, tags: string[]): boolean {
  const candidateNorm = normalizeMatchingText(candidate);
  const candidateTokensAll = new Set(tokenizeForMatching(candidate));
  // Build content-only token set (exclude stop words and very short words)
  const candidateContentTokensSet = new Set(
    [...candidateTokensAll].filter(t => t.length > 1 && !FRENCH_STOP_WORDS.has(t))
  );
  const candidateContentTokensList = candidateNorm.split(" ").filter(w => w.length > 1 && !FRENCH_STOP_WORDS.has(w));
  const isMultiWordCandidate = candidateContentTokensList.length >= 2;
  // For multi-word candidates, require at least 2 content tokens to match
  const minTokenMatches = isMultiWordCandidate ? Math.max(2, Math.ceil(candidateContentTokensList.length * 0.5)) : 1;

  return tags.some((tag) => {
    const tagNorm = normalizeMatchingText(tag);
    if (!tagNorm) return false;

    // Exact match
    if (tagNorm === candidateNorm) return true;
    // Multi-word: check if one fully contains the other as a word sequence
    if (candidateNorm.includes(" ") && tagNorm.includes(candidateNorm)) return true;
    if (tagNorm.includes(" ") && candidateNorm.includes(tagNorm)) return true;

    // Token matching: only count CONTENT tokens (exclude stop words like "de", "du", "à")
    const tagContentTokens = tokenizeForMatching(tag).filter(t => t.length > 1 && !FRENCH_STOP_WORDS.has(t));
    const matchCount = tagContentTokens.filter((token) => candidateContentTokensSet.has(token)).length;
    return matchCount >= minTokenMatches;
  });
}

export function isNaturalLanguageQuery(query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (words.length < 4) return false;
  const stopCount = words.filter(w => FRENCH_STOP_WORDS.has(w)).length;
  return stopCount >= 2;
}

export function sanitizeTerm(term: string): string {
  return term.replace(/['']/g, "").replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ]/g, "");
}

export function detectSuperlative(query: string): boolean {
  const superlatives = [
    "meilleur", "meilleurs", "meilleure", "meilleures",
    "top", "best", "le plus note", "les plus notes",
    "le mieux note", "les mieux notes",
    "le plus recommande", "les plus recommandes",
    "le plus populaire", "les plus populaires",
  ];
  const lower = stripAccentsGlobal(query.toLowerCase());
  return superlatives.some(s => lower.includes(s));
}
