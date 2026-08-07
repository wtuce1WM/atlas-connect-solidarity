import { alpha } from "./palette";

type ScrimDirection = "left" | "right" | "top" | "bottom" | "center";

/**
 * Helper UNIQUE de voile assombrissant sur média.
 * Remplace tous les `linear-gradient(..., rgba(14,11,8,...))` en dur.
 */
export const scrim = (
  direction: ScrimDirection = "bottom",
  from = 0.15,
  to = 0.85,
): string => {
  const a = alpha("night", from);
  const b = alpha("night", to);
  switch (direction) {
    case "left":
      return `linear-gradient(90deg, ${b} 0%, ${alpha("night", (from + to) / 2)} 45%, ${a} 100%)`;
    case "right":
      return `linear-gradient(90deg, ${a} 0%, ${alpha("night", (from + to) / 2)} 55%, ${b} 100%)`;
    case "top":
      return `linear-gradient(0deg, ${a} 0%, ${b} 100%)`;
    case "center":
      return `radial-gradient(ellipse at center, ${a} 0%, ${b} 80%)`;
    case "bottom":
    default:
      return `linear-gradient(180deg, ${a} 0%, ${b} 100%)`;
  }
};

/** Vignette persistante (bords assombris) */
export const vignette = (strength = 0.55): string =>
  `radial-gradient(ellipse at center, transparent 55%, ${alpha("night", strength)} 100%)`;
