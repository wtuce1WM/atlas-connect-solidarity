export type ShowcaseGroupLayout = "carousel" | "stacking_cards";

export function resolveShowcaseGroupLayout(value?: string | null): ShowcaseGroupLayout {
  return value === "stacking_cards" ? "stacking_cards" : "carousel";
}