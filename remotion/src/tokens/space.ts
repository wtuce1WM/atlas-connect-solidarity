/** Échelle d'espacement (px) */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 22,
  6: 26,
  7: 32,
  8: 38,
  9: 48,
  10: 60,
  11: 70,
  12: 80,
  13: 90,
  14: 120,
  15: 140,
  16: 160,
} as const;

/** Marges de sécurité par orientation de canvas */
export const safe = {
  horizontal: { x: space[15], y: space[12] },
  vertical: { x: space[12], y: space[14] },
} as const;

export const radius = {
  none: 0,
  sm: 8,
  md: 16,
  lg: 28,
  xl: 56,
  pill: 999,
  circle: "50%",
} as const;
