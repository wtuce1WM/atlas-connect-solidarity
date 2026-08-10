/** Petite puce "Label: valeur" pour les résumés de paramètres des cartes IA (backoffice). */
export const Chip = ({ label, value, alert }: { label: string; value: string; alert?: boolean }) => (
  <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] ${alert ? "border-destructive bg-destructive text-destructive-foreground" : "border-border bg-muted/40 text-muted-foreground"}`}>
    <span className={`font-medium ${alert ? "text-destructive-foreground" : "text-foreground/70"}`}>{label}</span>
    <span>{value}</span>
  </span>
);

export default Chip;
