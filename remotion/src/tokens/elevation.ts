import { alpha, type PaletteKey } from "./palette";

/** Ombres & lueurs nommées — autorité unique pour textShadow / boxShadow / drop-shadow */
export const elevation = {
  none: "none",
  /** Lisibilité d'un texte posé sur une photo */
  readOnPhoto: `0 2px 12px ${alpha("night", 0.75)}`,
  readOnPhotoStrong: `0 4px 24px ${alpha("night", 0.9)}`,
  /** Lueur or (badges, icônes premium) */
  glowGold: `0 8px 32px ${alpha("gold", 0.5)}`,
  glowGoldSoft: `0 4px 18px ${alpha("gold", 0.28)}`,
  /** Lueur terracotta (accents chauds) */
  glowEmber: `0 14px 48px ${alpha("terracotta", 0.45)}`,
  /** Cartes surélevées */
  liftCard: `0 18px 48px ${alpha("night", 0.55)}`,
  liftCardSoft: `0 8px 24px ${alpha("night", 0.35)}`,
} as const;

/** Version filter: drop-shadow(...) prête à l'emploi */
export const dropShadow = (value: string) => `drop-shadow(${value})`;

/**
 * Ombre paramétrée (autorité unique) — évite tout littéral `rgba()` dans les scènes.
 * `shadowOn(2, 10, "black", 0.6)` → "0 2px 10px rgba(0, 0, 0, 0.6)"
 */
export const shadowOn = (
  offsetY: number,
  blur: number,
  key: PaletteKey = "night",
  a = 0.6,
): string => `0 ${offsetY}px ${blur}px ${alpha(key, a)}`;

/** Suffixe hex 8-digit pour une couleur arbitraire (non palette) */
const suffix = (a: number) =>
  Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");

/** Ombre portée sur une couleur dynamique (marque tierce, accent calculé) */
export const shadowOf = (offsetY: number, blur: number, color: string, a: number): string =>
  `0 ${offsetY}px ${blur}px ${color}${suffix(a)}`;

/** Lueur centrée (halo) sur une couleur dynamique */
export const glowOf = (blur: number, color: string, a: number): string =>
  `0 0 ${blur}px ${color}${suffix(a)}`;

/** Composition d'ombres (`textShadow` / `boxShadow` multi-couches) */
export const stack = (...parts: string[]): string => parts.join(", ");
