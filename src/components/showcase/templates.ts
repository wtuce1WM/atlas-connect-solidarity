// Registre des modèles de vitrine /site/:slug.
// Ajouter un modèle = une entrée ici + la valeur dans la contrainte SQL business_showcase_site_template_check.
export const SHOWCASE_TEMPLATES = [
  { id: "premium", label: "Premium", description: "Sombre, hero vidéo plein écran, galerie et réservation intégrée." },
] as const;

export type ShowcaseTemplateId = (typeof SHOWCASE_TEMPLATES)[number]["id"];

export const resolveShowcaseTemplate = (value: unknown): ShowcaseTemplateId =>
  (SHOWCASE_TEMPLATES.find((t) => t.id === value)?.id ?? "premium") as ShowcaseTemplateId;
