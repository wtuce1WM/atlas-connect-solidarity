import { palette } from "./palette";
import { space, safe } from "./space";

/** Canvas de référence */
export const canvas = {
  horizontal: { width: 1920, height: 1080 },
  vertical: { width: 1080, height: 1920 },
  story: { width: 720, height: 1280 },
} as const;

/** Fonds de scène (dégradés) — dérivés de la palette, jamais de hex en dur */
export const surfaces = {
  night: palette.night,
  ink: palette.ink,
  glow: `radial-gradient(ellipse at 50% 40%, ${palette.glowCore} 0%, ${palette.night} 70%)`,
  columnEmber: `linear-gradient(160deg, ${palette.emberDeep} 0%, ${palette.night} 100%)`,
  columnSoft: `linear-gradient(160deg, ${palette.emberSoft} 0%, ${palette.night} 100%)`,
  columnHot: `linear-gradient(160deg, ${palette.emberHot} 0%, ${palette.night} 100%)`,
  corporateGlow: `radial-gradient(60% 40% at 50% 0%, ${palette.terracotta}38 0%, ${palette.night}00 60%), radial-gradient(70% 50% at 50% 100%, ${palette.gold}24 0%, ${palette.night}00 60%)`,
  brownVertical: `linear-gradient(180deg, ${palette.brown} 0%, ${palette.night} 50%, ${palette.brown} 100%)`,
} as const;

/** Filets / séparateurs */
export const rule = {
  hairline: 1,
  thick: 2,
} as const;

export const layout = { canvas, surfaces, rule, safe, pad: space } as const;
