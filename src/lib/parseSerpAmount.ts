// SerpAPI renvoie les montants déjà formatés selon la locale de la requête
// (ex. "1.007 €" = mille sept euros, "45 €", "1 007,50 €").
// parseFloat("1.007") donnait 1.007 → un séjour de 5 nuits affiché à 5 €.
// Ce parseur interprète correctement séparateurs de milliers et décimales.
export function parseSerpAmount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? raw : null;
  if (raw && typeof raw === "object") return parseSerpAmount((raw as any).amount);
  if (typeof raw !== "string") return null;

  // Garde uniquement chiffres et séparateurs.
  let s = raw.replace(/[^\d.,\s]/g, "").replace(/\s+/g, "").trim();
  if (!s) return null;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");

  if (lastDot >= 0 && lastComma >= 0) {
    // Les deux présents : le dernier est le séparateur décimal.
    const dec = Math.max(lastDot, lastComma);
    s = s.slice(0, dec).replace(/[.,]/g, "") + "." + s.slice(dec + 1).replace(/[.,]/g, "");
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? lastDot : lastComma;
    const decimals = s.length - sep - 1;
    const groupsOk = /^[\d]{1,3}([.,][\d]{3})+$/.test(s);
    if (decimals === 3 && groupsOk) {
      // Séparateur de milliers ("1.007", "1,007", "12.345.678").
      s = s.replace(/[.,]/g, "");
    } else {
      s = s.slice(0, sep).replace(/[.,]/g, "") + "." + s.slice(sep + 1);
    }
  }

  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Formatage FR sans décimales inutiles (1 007 €). */
export function formatEuro(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
}
