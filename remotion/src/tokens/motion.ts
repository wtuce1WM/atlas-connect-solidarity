import type { SpringConfig } from "remotion";

/** Springs nommés — aucun composant ne définit son propre config */
export const springs: Record<string, Partial<SpringConfig>> = {
  /** Aucun rebond, glissé net (défaut) */
  soft: { damping: 200 },
  /** Rebond léger, entrée d'élément */
  snappy: { damping: 22, stiffness: 90 },
  /** Entrée douce sans overshoot marqué */
  gentle: { damping: 18 },
  /** Réactif, accents */
  quick: { damping: 24, stiffness: 110 },
  /** Révélation lente (clip-path, panneaux) */
  reveal: { damping: 200, stiffness: 80 },
  /** Moment héroïque, léger overshoot */
  hero: { damping: 14, stiffness: 90 },
  /** Lourd, dramatique */
  heavy: { damping: 15, stiffness: 80, mass: 2 },
};

/** Durées d'animation en frames (30 fps) */
export const dur = {
  flash: 8,
  fast: 15,
  base: 20,
  slow: 30,
  cine: 45,
} as const;

/** Décalages de stagger */
export const stagger = {
  tight: 8,
  base: 12,
  loose: 18,
} as const;

/** Fenêtres in/out standard d'une scène de 120 frames */
export const beat = {
  in: [0, dur.slow] as const,
  hold: [dur.slow, 105] as const,
  out: [105, 120] as const,
} as const;

export const motion = { springs, dur, stagger, beat } as const;
