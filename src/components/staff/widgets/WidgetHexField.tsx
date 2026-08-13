// Saisie hexadécimale explicite (pas de color picker) adaptée au fond clair du backoffice.
const PRESETS = ["#FFFFFF", "#EFE6D8", "#F5F1EA", "#1C1917", "#3B3B3B"];
const CHECKER = "repeating-conic-gradient(#9ca3af 0% 25%, transparent 0% 50%) 50% / 12px 12px";

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label?: string;
}

const norm = (raw: string) => {
  const clean = raw.replace(/[^0-9a-fA-F]/g, "").slice(0, 6).toUpperCase();
  return clean ? `#${clean}` : "";
};

export default function WidgetHexField({ value, onChange, disabled, label }: Props) {
  const hex = (value || "").replace(/^#/, "").toUpperCase();
  const valid = /^[0-9A-F]{6}$/.test(hex);
  return (
    <div className="space-y-1.5">
      {label && <div className="text-xs font-medium text-muted-foreground">{label}</div>}
      <div className="flex flex-wrap items-center gap-2">
        <div className={`flex items-center rounded-md border overflow-hidden ${hex && !valid ? "border-destructive" : "border-input"}`}>
          <span className="px-2 py-1.5 text-xs font-mono text-muted-foreground border-r border-input select-none">#</span>
          <input
            type="text"
            spellCheck={false}
            maxLength={6}
            placeholder="RRGGBB"
            value={hex}
            disabled={disabled}
            onChange={(e) => onChange(norm(e.target.value))}
            className="w-[6.5rem] bg-transparent text-sm px-2 py-1.5 font-mono tracking-widest uppercase outline-none"
          />
        </div>
        <div
          className="h-8 w-8 rounded-md border border-input overflow-hidden shrink-0"
          style={{ background: valid ? `#${hex}` : "transparent" }}
          title={valid ? `#${hex}` : "Transparent"}
        >
          {!valid && <div className="w-full h-full opacity-40" style={{ background: CHECKER }} />}
        </div>
        <div className="flex items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={disabled}
              title={p}
              onClick={() => onChange(p)}
              className={`h-6 w-6 rounded-full border transition ${`#${hex}` === p ? "border-primary ring-2 ring-primary/40" : "border-input hover:border-foreground/40"}`}
              style={{ background: p }}
              aria-label={p}
            />
          ))}
          <button
            type="button"
            disabled={disabled}
            title="Transparent"
            onClick={() => onChange("")}
            className={`h-6 w-6 rounded-full border overflow-hidden transition ${!hex ? "border-primary ring-2 ring-primary/40" : "border-input hover:border-foreground/40"}`}
            aria-label="Transparent"
          >
            <span className="block w-full h-full opacity-40" style={{ background: CHECKER }} />
          </button>
        </div>
      </div>
    </div>
  );
}
