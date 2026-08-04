// Champ de couleur hexadécimal explicite (sans color picker) :
// saisie « # RRGGBB », aperçu, presets cliquables et remise à transparent.
import { Check, Loader2 } from "lucide-react";

const PRESETS: { hex: string; label: string }[] = [
  { hex: "#FFFFFF", label: "Blanc" },
  { hex: "#EFE6D8", label: "Beige 1WM" },
  { hex: "#F5F1EA", label: "Sable clair" },
  { hex: "#1C1917", label: "Sombre" },
];

const CHECKER = "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 12px 12px";

interface Props {
  /** Valeur courante : "" (transparent) ou "#RRGGBB" */
  value: string;
  /** Saisie en cours (déjà normalisée en majuscules, avec « # ») */
  onChange: (v: string) => void;
  /** Validation (blur / preset / reset) — pour sauvegarder */
  onCommit?: (v: string) => void;
  disabled?: boolean;
  saving?: boolean;
  saved?: boolean;
}

export default function HexColorField({ value, onChange, onCommit, disabled, saving, saved }: Props) {
  const hex = (value || "").replace(/^#/, "").toUpperCase();
  const valid = /^[0-9A-F]{6}$/.test(hex);
  const norm = (raw: string) => {
    const clean = raw.replace(/[^0-9a-fA-F]/g, "").slice(0, 6).toUpperCase();
    return clean ? `#${clean}` : "";
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Saisie hexadécimale explicite */}
        <div
          className={`flex items-center rounded-md bg-white/10 border ${
            hex && !valid ? "border-red-400/60" : "border-white/20"
          } overflow-hidden`}
        >
          <span className="px-2.5 py-2 text-sm font-mono text-white/50 border-r border-white/15 select-none">#</span>
          <input
            type="text"
            inputMode="text"
            spellCheck={false}
            maxLength={6}
            placeholder="RRGGBB"
            value={hex}
            onChange={(e) => onChange(norm(e.target.value))}
            onBlur={(e) => onCommit?.(norm(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCommit?.(norm((e.target as HTMLInputElement).value));
              }
            }}
            disabled={disabled}
            className="w-[7.5rem] bg-transparent text-white text-sm px-3 py-2 font-mono tracking-widest uppercase outline-none placeholder:text-white/30 placeholder:tracking-normal"
          />
        </div>

        {/* Aperçu (non cliquable) */}
        <div
          className="h-9 w-9 rounded-md border border-white/20 overflow-hidden shrink-0"
          style={{ background: valid ? `#${hex}` : "transparent" }}
          title={valid ? `#${hex}` : "Transparent"}
        >
          {!valid && <div className="w-full h-full opacity-30" style={{ background: CHECKER }} />}
        </div>

        {/* Presets */}
        <div className="flex items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.hex}
              type="button"
              disabled={disabled}
              title={`${p.label} ${p.hex}`}
              onClick={() => {
                onChange(p.hex);
                onCommit?.(p.hex);
              }}
              className={`h-7 w-7 rounded-full border transition ${
                `#${hex}` === p.hex ? "border-primary ring-2 ring-primary/50" : "border-white/25 hover:border-white/60"
              }`}
              style={{ background: p.hex }}
              aria-label={p.label}
            />
          ))}
          <button
            type="button"
            disabled={disabled}
            title="Transparent (fond du site hôte)"
            onClick={() => {
              onChange("");
              onCommit?.("");
            }}
            className={`h-7 w-7 rounded-full border overflow-hidden transition ${
              !hex ? "border-primary ring-2 ring-primary/50" : "border-white/25 hover:border-white/60"
            }`}
            aria-label="Transparent"
          >
            <span className="block w-full h-full opacity-40" style={{ background: CHECKER }} />
          </button>
        </div>

        {hex && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange("");
              onCommit?.("");
            }}
            className="text-xs text-white/60 underline hover:text-white"
          >
            Effacer
          </button>
        )}

        {saving && <Loader2 className="h-4 w-4 animate-spin text-white/60" />}
        {!saving && saved && <Check className="h-4 w-4 text-emerald-400" />}
      </div>

      <p className="text-[11px] text-white/45 font-mono">
        {valid ? `Valeur enregistrée : #${hex}` : "Aucune couleur : fond transparent"}
        {hex && !valid ? " — code incomplet (6 caractères hexadécimaux attendus)" : ""}
      </p>
    </div>
  );
}
