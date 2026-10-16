// Registre des modèles de vitrine /site/:slug.
// Ajouter un modèle = une entrée ici + la valeur dans la contrainte SQL business_showcase_site_template_check.
export const SHOWCASE_TEMPLATES = [
  { id: "premium", label: "Images only", description: "Hero en image fixe (paysage/portrait), sans vidéo." },
  { id: "hero_video", label: "Hero video", description: "Hero vidéo plein écran en boucle, image en repli." },
] as const;

export type ShowcaseTemplateId = (typeof SHOWCASE_TEMPLATES)[number]["id"];

export const resolveShowcaseTemplate = (value: unknown): ShowcaseTemplateId =>
  (SHOWCASE_TEMPLATES.find((t) => t.id === value)?.id ?? "premium") as ShowcaseTemplateId;
