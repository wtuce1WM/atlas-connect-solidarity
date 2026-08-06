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
  { value: "", label: "Proportions conservées (hauteur auto)" },
  { value: "w", label: "Toute la largeur du widget" },
  { value: "h", label: "Toute la hauteur du widget" },
  { value: "wh", label: "Toute la largeur & hauteur" },
];

/** Échelle du contenu d'un widget embarqué (`?size=sm|md|lg`). */
export type EmbedSize = "sm" | "md" | "lg";

export const parseSize = (raw: string | null | undefined): EmbedSize => {
  const v = (raw || "").toLowerCase();
  if (v === "sm" || v === "compact" || v === "mobile") return "sm";
  if (v === "lg" || v === "large" || v === "desktop") return "lg";
  return "md";
};

export const sizeZoom = (s: EmbedSize) => (s === "sm" ? 0.85 : s === "lg" ? 1.15 : 1);

export const SIZE_OPTIONS: { value: EmbedSize; label: string }[] = [
  { value: "sm", label: "Compact (mobile)" },
  { value: "md", label: "Standard" },
  { value: "lg", label: "Large (desktop)" },
];

/** Largeur d'affichage conseillée selon l'échelle choisie. */
export const sizeMaxWidth = (s: EmbedSize) => (s === "sm" ? 380 : s === "lg" ? 620 : 460);


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

/** Couleur de fond forcée (`?bg=EFE6D8` ou `#EFE6D8`) — "" si absente/invalide. */
export const parseBg = (raw: string | null | undefined): string => {
  const v = (raw || "").trim().replace(/^#/, "");
  return /^[0-9a-fA-F]{6}$/.test(v) ? `#${v.toUpperCase()}` : "";
};

/** Suffixe d'URL (`&bg=…`) à ajouter aux URLs de widget. */
export const bgParam = (color: string | null | undefined) => {
  const c = parseBg(color);
  return c ? `&bg=${c.slice(1)}` : "";
};

/**
 * Suffixe d'URL « page transparente + intérieur coloré » :
 * `&bg=transparent&card=EFE6D8`. Le fond du site hôte reste visible autour du
 * widget, seule la carte du widget prend la couleur choisie.
 */
export const cardParam = (color: string | null | undefined) => {
  const c = parseBg(color);
  return c ? `&bg=transparent&card=${c.slice(1)}` : "&bg=transparent";
};

/** Applique la couleur de fond du widget (ou transparent) sur html/body. */
export const applyEmbedBg = (color: string | null | undefined) => {
  const bg = parseBg(color) || "transparent";
  const prevHtml = document.documentElement.style.background;
  const prevBody = document.body.style.background;
  const prevScheme = document.documentElement.style.colorScheme;
  document.documentElement.style.background = bg;
  document.body.style.background = bg;
  // Sans ceci, `color-scheme: dark` fait peindre le canvas de l'iframe en noir
  // même avec html/body transparents → le widget n'apparaît pas transparent.
  document.documentElement.style.colorScheme = "light";
  return () => {
    document.documentElement.style.background = prevHtml;
    document.body.style.background = prevBody;
    document.documentElement.style.colorScheme = prevScheme;
  };
};


/** Luminance relative approximative d'une couleur hex (#RRGGBB) → 0..1. */
export const bgLuminance = (color: string | null | undefined): number | null => {
  const c = parseBg(color);
  if (!c) return null;
  const r = parseInt(c.slice(1, 3), 16) / 255;
  const g = parseInt(c.slice(3, 5), 16) / 255;
  const b = parseInt(c.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export type EmbedInk = "light" | "dark";

/**
 * Encre lisible d'un widget embarqué.
 * `raw` = paramètre `?ink=light|dark|auto`. En auto : déduite de la couleur de
 * fond forcée ; sans couleur (fond transparent) on suppose un site hôte clair.
 */
export const resolveEmbedInk = (raw: string | null | undefined, bg: string | null | undefined): EmbedInk => {
  const v = (raw || "").toLowerCase();
  if (v === "light" || v === "clair") return "light";
  if (v === "dark" || v === "sombre") return "dark";
  const lum = bgLuminance(bg);
  if (lum === null) return "dark";
  return lum > 0.55 ? "dark" : "light";
};

/**
 * Snippet iframe « proportions conservées » avec auto-hauteur : le widget publie
 * sa hauteur réelle (`postMessage`) et l'hôte redimensionne l'iframe → aucun
 * scroll interne, aucune zone vide. Utilisé quand `fit` est vide.
 */
export const autoHeightSnippet = (o: {
  id: string;
  msgType: string;
  url: string;
  title: string;
  maxWidth?: number;
  height: number;
  radius?: number;
  /** Style du conteneur (ex. position:fixed pour un bandeau footer sticky). */
  wrapperStyle?: string;
}) =>
  `<div style="${o.wrapperStyle ?? `width:100%;${o.maxWidth ? `max-width:${o.maxWidth}px;` : ""}margin:0 auto`}">
  <iframe id="${o.id}" src="${o.url}" style="width:100%;display:block;height:${o.height}px;border:0;border-radius:${o.radius ?? 20}px;background:transparent" title="${o.title}" loading="lazy"></iframe>
</div>
<script>
  window.addEventListener("message", function (e) {
    if (!e.data || e.data.type !== "${o.msgType}") return;
    var f = document.getElementById("${o.id}");
    if (f) f.style.height = Math.ceil(e.data.height) + "px";
  });
</script>`
