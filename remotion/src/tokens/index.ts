export { palette, alpha, hexA, transparent } from "./palette";
export { type, family, size, weight, tracking, leading, display, body } from "./type";
export { space, safe, radius } from "./space";
export { elevation, dropShadow, shadowOn, shadowOf, glowOf, stack } from "./elevation";
export { motion, springs, sp, dur, stagger, beat } from "./motion";
export { scrim, vignette } from "./scrim";
export { layout, canvas, surfaces, rule } from "./layout";

import { palette, alpha, hexA } from "./palette";
import { type } from "./type";
import { space, safe, radius } from "./space";
import { elevation, dropShadow } from "./elevation";
import { motion } from "./motion";
import { scrim, vignette } from "./scrim";
import { layout } from "./layout";

/** Feuille de style vidéo — autorité unique. Aucun style en dur dans les scènes. */
export const V = {
  palette,
  alpha,
  hexA,
  type,
  space,
  safe,
  radius,
  elevation,
  dropShadow,
  motion,
  scrim,
  vignette,
  layout,
} as const;
