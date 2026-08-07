import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadNunito } from "@remotion/google-fonts/NunitoSans";

// Headings / display → Montserrat (marque)
export const { fontFamily: display } = loadMontserrat("normal", {
  weights: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});
// Body → Nunito Sans (fallback Avenir, charte)
export const { fontFamily: body } = loadNunito("normal", {
  weights: ["300", "400", "600", "700"],
  subsets: ["latin"],
});

export const family = { display, body } as const;

/** Échelle typographique (px, canvas de référence) */
export const size = {
  micro: 12,
  kicker: 16,
  label: 18,
  caption: 22,
  lead: 26,
  body: 30,
  h4: 42,
  h3: 56,
  h3xl: 64,
  h2: 72,
  h2xl: 84,
  h1: 96,
  h1xl: 110,
  display: 128,
  displayXl: 140,
  hero: 160,
} as const;

export const weight = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const tracking = {
  tight: "-0.02em",
  snug: "-0.01em",
  normal: "0.02em",
  wide: "0.18em",
  tracked: "0.45em",
  spaced: "0.5em",
  ultra: "0.6em",
} as const;

export const leading = {
  none: 0.98,
  tight: 1,
  snug: 1.05,
  normal: 1.35,
} as const;

export const type = { family, size, weight, tracking, leading } as const;
