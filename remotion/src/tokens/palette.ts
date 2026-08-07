// Autorité UNIQUE des couleurs de Studio Vidéo IA.
// Seul fichier autorisé à contenir des littéraux hex / rgba.

export const palette = {
  night: "#0E0B08",
  ink: "#1A130D",
  terracotta: "#C04F17",
  gold: "#D4AF37",
  cream: "#F2E6D2",
  bone: "#E8D9BE",
  white: "#FFFFFF",
  black: "#000000",
  slate: "#3B3B3B",

  // Teintes de fond dérivées (dégradés de scène)
  emberDeep: "#2a1a0e",
  emberSoft: "#1c1612",
  emberHot: "#2a0f08",
  glowCore: "#1c150d",
  emberNight: "#1b1410",
  brown: "#1a120a",
  nightWarm: "#1A1410",
  emberLight: "#3A2418",
  emberDark: "#1A1006",
  nearBlack: "#0A0A0A",
  shadowDeep: "#0A0807",
  charcoal: "#0C0C0E",
  inkWarm: "#1C160C",
  parchment: "#F5F0E6",

  // Accent « flashy » (extraits d'avis, étoiles)
  flash: "#FFE21A",

  // Couleurs de marques tierces (logos / accents de source)
  whatsapp: "#25D366",
  google: "#4285F4",
  googleAccent: "#EA4335",
  tripadvisor: "#34E0A1",
  tripadvisorAccent: "#F2B203",
  restaurantGuru: "#CB2027",

  // Widgets météo / marées
  sky: "#7FD3F7",
  skyDeep: "#2F7FB0",
  tide: "#4FA8D8",
  wind: "#63C7A6",
} as const;

export type PaletteKey = keyof typeof palette;

/** Alpha sur une couleur de la palette. `alpha("gold", 0.33)` → rgba(...) */
export const alpha = (key: PaletteKey, a: number): string => {
  const hex = palette[key].replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/** Suffixe hex 8-digit (usage bordures : `hexA("gold", 0.33)`) */
export const hexA = (key: PaletteKey, a: number): string => {
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${palette[key]}${v}`;
};

export const transparent = "transparent";
