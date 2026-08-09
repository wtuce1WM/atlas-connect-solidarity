/** Petite puce "Label: valeur" pour les résumés de paramètres des cartes IA (backoffice). */
export const Chip = ({ label, value }: { label: string; value: string }) => (
  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground">
    <span className="font-medium text-foreground/70">{label}</span>
    <span>{value}</span>
  </span>
);

export default Chip;
