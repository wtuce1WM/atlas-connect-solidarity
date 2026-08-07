// Compat: `theme.ts` ré-exporte désormais la feuille de tokens.
// Nouveau code → importer depuis `./tokens`.
import { palette } from "./tokens/palette";

export { display, body } from "./tokens/type";
export { V } from "./tokens";

// Alias historiques (scènes existantes)
export { display as serif, body as sans } from "./tokens/type";

export const COLORS = palette;
