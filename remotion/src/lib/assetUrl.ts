import { staticFile } from "remotion";

/**
 * URL absolue (http/data/blob) laissée telle quelle ; chemin relatif résolu
 * dans `remotion/public` via staticFile.
 *
 * Indispensable pour les médias internalisés par le worker de rendu
 * (`public/dl/…`) : sans staticFile, le bundle sert ces fichiers sous son
 * préfixe statique et une URL brute `dl/x.mp4` renvoie 404.
 */
export const assetUrl = (src: string | null | undefined): string | null => {
  if (!src) return null;
  const v = src.trim();
  if (!v) return null;
  return /^(https?:|data:|blob:)/.test(v) ? v : staticFile(v.replace(/^\/+/, ""));
};
