// Paramètre commun `fit` des widgets embarqués : contrôle l'étirement du widget
// dans son iframe hôte pour éviter les scrolls inutiles et un rendu trop étroit.
//   fit=w  → toute la largeur
//   fit=h  → toute la hauteur
//   fit=wh → toute la largeur & hauteur
export type EmbedFit = "" | "w" | "h" | "wh";

export const parseFit = (raw: string | null | undefined): EmbedFit => {
  const v = (raw || "").toLowerCase();
  if (v === "wh" || v === "hw" || v === "both" || v === "1" || v === "full") return "wh";
  if (v === "w" || v === "width") return "w";
  if (v === "h" || v === "height") return "h";
  return "";
};

export const fitFlags = (fit: EmbedFit) => ({
  fullWidth: fit === "w" || fit === "wh",
  fullHeight: fit === "h" || fit === "wh",
});

export const FIT_OPTIONS: { value: EmbedFit; label: string }[] = [
  { value: "", label: "Taille recommandée" },
  { value: "w", label: "Toute la largeur du widget" },
  { value: "h", label: "Toute la hauteur du widget" },
  { value: "wh", label: "Toute la largeur & hauteur" },
];

/** Style inline d'iframe adapté au mode `fit` choisi. */
export const fitIframeStyle = (
  fit: EmbedFit,
  base: { maxWidth?: number; height: number; radius?: number; extra?: string },
) => {
  const { fullWidth, fullHeight } = fitFlags(fit);
  const parts = ["width:100%", "display:block"];
  if (!fullWidth && base.maxWidth) parts.push(`max-width:${base.maxWidth}px`);
  parts.push(fullHeight ? `height:100%;min-height:${base.height}px` : `height:${base.height}px`);
  parts.push("border:0");
  parts.push(`border-radius:${base.radius ?? 16}px`);
  if (base.extra) parts.push(base.extra);
  return parts.join(";");
};

/** Suffixe d'URL (`&fit=…`) à ajouter aux URLs de widget. */
export const fitParam = (fit: EmbedFit) => (fit ? `&fit=${fit}` : "");
