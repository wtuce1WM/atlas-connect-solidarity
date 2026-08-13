// Sélection de fond par miniatures rondes uniquement (pas de saisie hex, pas de color picker).
const PRESETS = [
  { hex: "#FFFFFF", label: "Blanc" },
  { hex: "#000000", label: "Noir" },
  { hex: "#C04F17", label: "Terracotta" },
  { hex: "#ECD6B8", label: "Sable" },
];
const CHECKER = "repeating-conic-gradient(#9ca3af 0% 25%, transparent 0% 50%) 50% / 12px 12px";

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label?: string;
}

export default function WidgetHexField({ value, onChange, disabled, label }: Props) {
  const hex = (value || "").replace(/^#/, "").toUpperCase();
  const current = hex ? `#${hex}` : "";
  return (
    <div className="space-y-1.5">
      {label && <div className="text-xs font-medium text-muted-foreground">{label}</div>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          title="Transparent"
          onClick={() => onChange("")}
          className={`h-7 w-7 rounded-full border overflow-hidden transition ${!current ? "border-primary ring-2 ring-primary/40" : "border-input hover:border-foreground/40"}`}
          aria-label="Transparent"
        >
          <span className="block w-full h-full opacity-40" style={{ background: CHECKER }} />
        </button>
        {PRESETS.map((p) => (
          <button
            key={p.hex}
            type="button"
            disabled={disabled}
            title={p.label}
            onClick={() => onChange(p.hex)}
            className={`h-7 w-7 rounded-full border transition ${current === p.hex ? "border-primary ring-2 ring-primary/40" : "border-input hover:border-foreground/40"}`}
            style={{ background: p.hex }}
            aria-label={p.label}
          />
        ))}
        <span className="text-[11px] text-muted-foreground">{current || "Transparent"}</span>
      </div>
    </div>
  );
}
