/**
 * Libellés des champs BIENVENUE (`carousel_badge`) et PROPOSITION (`poi_business_style`)
 * configurés dans Présence en ligne / CTAs.
 * Source unique utilisée par la fiche, l'overlay POI et le Studio Vidéo IA.
 */

export const welcomeBadgeLabel = (
  code: string | null | undefined,
  businessName: string | null | undefined,
  lang: "fr" | "en" = "fr"
): string | null => {
  const cb = (code || "").trim();
  if (!cb || cb === "__none__" || cb === "aucun") return null;
  const name = (businessName || "").trim();
  const en = lang === "en";
  switch (cb) {
    case "immergez_vous": return en ? "Immerse yourself" : "Immergez-vous";
    case "nos_offres": return en ? "Our offers" : "Nos offres";
    case "bienvenue": return en ? "Welcome" : "Bienvenue";
    case "bienvenue_a": return `${en ? "Welcome to" : "Bienvenue à"} ${name}`.trim();
    case "bienvenue_au": return `${en ? "Welcome to" : "Bienvenue au"} ${name}`.trim();
    case "bienvenue_chez": return `${en ? "Welcome to" : "Bienvenue chez"} ${name}`.trim();
    case "bienvenue_a_l": return en ? `Welcome to ${name}`.trim() : `Bienvenue à l'${name}`.trim();
    case "bienvenue_a_la": return `${en ? "Welcome to" : "Bienvenue à la"} ${name}`.trim();
    case "bienvenue_aux": return `${en ? "Welcome to" : "Bienvenue aux"} ${name}`.trim();
    default: return null;
  }
};

export const propositionLabel = (
  code: string | null | undefined,
  businessName: string | null | undefined,
  lang: "fr" | "en" = "fr"
): string | null => {
  const st = (code || "").trim();
  if (!st || st === "aucun" || st === "__none__") return null;
  const name = (businessName || "").trim();
  const en = lang === "en";
  if (st === "emmene_a") return en ? `${name} takes you to` : `${name} vous emmène à`;
  if (st === "propose") return en ? `${name} offers you` : `${name} vous propose`;
  return null;
};

/** Codes disponibles pour BIENVENUE (`carousel_badge`) — ordre du menu déroulant de Présence en ligne / CTAs. */
export const WELCOME_BADGE_CODES = [
  "immergez_vous",
  "nos_offres",
  "bienvenue",
  "bienvenue_a",
  "bienvenue_au",
  "bienvenue_chez",
  "bienvenue_a_l",
  "bienvenue_a_la",
  "bienvenue_aux",
] as const;

/** Codes disponibles pour PROPOSITION (`poi_business_style`). */
export const PROPOSITION_CODES = ["emmene_a", "propose"] as const;
