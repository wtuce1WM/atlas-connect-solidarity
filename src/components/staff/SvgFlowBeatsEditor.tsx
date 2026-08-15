import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";

/**
 * Timeline interne d'une étape « Tracé SVG animé » (`svg_flow`).
 *
 * Un battement = une ligne de données. Un nouveau scénario ne crée jamais de
 * template : il déclare des battements sur la scène générique du moteur.
 * Les durées minimales de lisibilité sont celles du moteur (Storyboard.tsx).
 */

export type FlowBeat = {
  type: "node" | "link" | "title" | "hook" | "subhook" | "metric";
  ref?: number | string;
  at?: number;
  atPct?: number;
  dur?: number;
  text?: string;
  label?: string;
  value?: number;
  from?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  in?: "fade" | "pop" | "slide-up";
  anchor?: string;
};

export const BEAT_TYPES: Array<{ value: FlowBeat["type"]; label: string }> = [
  { value: "node", label: "Nœud (icône)" },
  { value: "link", label: "Liaison (tracé)" },
  { value: "title", label: "Titre" },
  { value: "hook", label: "Hook" },
  { value: "subhook", label: "Sous-hook" },
  { value: "metric", label: "Chiffre / %" },
];

/** Durée minimale d'affichage par type (s) — identique au moteur. */
export const BEAT_MIN_SEC: Record<string, number> = {
  node: 0.4,
  link: 0.4,
  title: 1.2,
  hook: 1.2,
  subhook: 1.2,
  metric: 1.5,
};

const BEAT_COLORS: Record<string, string> = {
  node: "bg-primary/70",
  link: "bg-gold/80",
  title: "bg-sky-500/70",
  hook: "bg-emerald-500/70",
  subhook: "bg-emerald-400/60",
  metric: "bg-amber-500/80",
};

const isOverlay = (t: string) => ["title", "hook", "subhook", "metric"].includes(t);

/** Début effectif d'un battement (s), selon le mode de répartition. */
const startSec = (b: FlowBeat, i: number, count: number, duration: number, manual: boolean) => {
  if (!manual) return (duration / Math.max(1, count)) * i;
  if (typeof b.at === "number" && Number.isFinite(b.at)) return b.at;
  if (typeof b.atPct === "number" && Number.isFinite(b.atPct)) return (b.atPct / 100) * duration;
  return (duration / Math.max(1, count)) * i;
};

const durSec = (b: FlowBeat, count: number, duration: number) => {
  const min = BEAT_MIN_SEC[b.type] ?? 0.4;
  const fallback = Math.max(min, duration / Math.max(1, count));
  return Math.max(min, typeof b.dur === "number" && Number.isFinite(b.dur) ? b.dur : fallback);
};

const SvgFlowBeatsEditor = ({
  beats,
  duration,
  nodeCount,
  linkCount,
  timing,
  onTiming,
  onChange,
}: {
  beats: FlowBeat[];
  duration: number;
  nodeCount: number;
  linkCount: number;
  timing: "sequence" | "manual";
  onTiming: (t: "sequence" | "manual") => void;
  onChange: (next: FlowBeat[]) => void;
}) => {
  const manual = timing === "manual";
  const count = beats.length;

  const setBeat = (i: number, patch: Partial<FlowBeat>) =>
    onChange(beats.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= beats.length) return;
    const next = [...beats];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const rows = beats.map((b, i) => {
    const s = startSec(b, i, count, duration, manual);
    const d = durSec(b, count, duration);
    return { b, i, s, d, end: s + d };
  });

  const overflow = rows.filter((r) => r.end > duration + 0.01);
  // Chevauchement pénalisant : deux textes/chiffres sur la même ancre en même temps.
  const clashes = rows.filter((r, idx) =>
    rows.some(
      (o, oIdx) =>
        oIdx !== idx &&
        isOverlay(r.b.type) &&
        isOverlay(o.b.type) &&
        (r.b.anchor ?? "center") === (o.b.anchor ?? "center") &&
        r.s < o.end - 0.01 &&
        o.s < r.end - 0.01,
    ),
  );

  return (
    <div className="grid gap-2 rounded-md border border-dashed p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-black">Timeline interne (battements)</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onTiming("sequence")}
            className={`rounded-md px-2 py-1 text-[11px] font-medium ${
              !manual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Séquence (parts égales)
          </button>
          <button
            type="button"
            onClick={() => onTiming("manual")}
            className={`rounded-md px-2 py-1 text-[11px] font-medium ${
              manual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Manuel (secondes / %)
          </button>
        </div>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {count} battement(s) sur {duration} s
        </span>
      </div>

      {/* Frise proportionnelle à la durée de l'étape */}
      {count > 0 && (
        <div className="relative h-auto space-y-1 rounded bg-muted/50 p-2">
          {rows.map(({ b, i, s, d }) => (
            <div key={i} className="relative h-4">
              <div
                className={`absolute top-0 h-4 rounded ${BEAT_COLORS[b.type] ?? "bg-muted-foreground/60"}`}
                style={{
                  left: `${Math.min(100, (s / Math.max(1, duration)) * 100)}%`,
                  width: `${Math.max(1.5, Math.min(100, (d / Math.max(1, duration)) * 100))}%`,
                }}
                title={`${b.type} — ${s.toFixed(1)}s → ${(s + d).toFixed(1)}s`}
              />
              <span className="absolute left-1 top-0 text-[9px] leading-4 text-black/70">{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-2">
        {beats.map((b, i) => {
          const s = rows[i].s;
          const d = rows[i].d;
          const bad = overflow.includes(rows[i]) || clashes.includes(rows[i]);
          return (
            <div
              key={i}
              className={`grid gap-2 rounded-md border p-2 md:grid-cols-[9rem_5rem_5rem_1fr_1fr_auto] md:items-end ${
                bad ? "border-destructive" : ""
              }`}
            >
              <label className="grid gap-1 text-[11px] text-muted-foreground">
                Type
                <select
                  value={b.type}
                  onChange={(e) => setBeat(i, { type: e.target.value as FlowBeat["type"] })}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                >
                  {BEAT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              {b.type === "node" || b.type === "link" ? (
                <label className="grid gap-1 text-[11px] text-muted-foreground">
                  {b.type === "node" ? `N° nœud (1-${Math.max(1, nodeCount)})` : `N° liaison (1-${Math.max(1, linkCount)})`}
                  <Input
                    type="number"
                    min={1}
                    value={typeof b.ref === "number" ? b.ref : Number(b.ref) || 1}
                    onChange={(e) => setBeat(i, { ref: Math.max(1, Number(e.target.value) || 1) })}
                    className="h-8 text-xs"
                  />
                </label>
              ) : (
                <label className="grid gap-1 text-[11px] text-muted-foreground">
                  Ancre
                  <select
                    value={b.anchor ?? "center"}
                    onChange={(e) => setBeat(i, { anchor: e.target.value })}
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="center">Centre</option>
                    <option value="top">Haut</option>
                    <option value="bottom">Bas</option>
                    {Array.from({ length: nodeCount }, (_, n) => (
                      <option key={n} value={`node:${n + 1}`}>
                        Nœud {n + 1}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="grid gap-1 text-[11px] text-muted-foreground">
                Début (s)
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={duration}
                  disabled={!manual}
                  value={manual ? (b.at ?? Number(s.toFixed(1))) : Number(s.toFixed(1))}
                  onChange={(e) => setBeat(i, { at: Math.max(0, Number(e.target.value) || 0), atPct: undefined })}
                  className="h-8 text-xs"
                />
              </label>

              <label className="grid gap-1 text-[11px] text-muted-foreground">
                Durée (s) — min {BEAT_MIN_SEC[b.type] ?? 0.4}
                <Input
                  type="number"
                  step="0.1"
                  min={BEAT_MIN_SEC[b.type] ?? 0.4}
                  value={b.dur ?? Number(d.toFixed(1))}
                  onChange={(e) => setBeat(i, { dur: Math.max(0.2, Number(e.target.value) || 0.4) })}
                  className="h-8 text-xs"
                />
              </label>

              {b.type === "metric" ? (
                <div className="grid grid-cols-[1fr_4rem_4rem] gap-1">
                  <label className="grid gap-1 text-[11px] text-muted-foreground">
                    Légende
                    <Input
                      value={b.label ?? ""}
                      onChange={(e) => setBeat(i, { label: e.target.value.slice(0, 80) })}
                      className="h-8 text-xs"
                    />
                  </label>
                  <label className="grid gap-1 text-[11px] text-muted-foreground">
                    Valeur
                    <Input
                      type="number"
                      value={b.value ?? 0}
                      onChange={(e) => setBeat(i, { value: Number(e.target.value) || 0 })}
                      className="h-8 text-xs"
                    />
                  </label>
                  <label className="grid gap-1 text-[11px] text-muted-foreground">
                    Suffixe
                    <Input
                      value={b.suffix ?? ""}
                      onChange={(e) => setBeat(i, { suffix: e.target.value.slice(0, 6) })}
                      placeholder="%"
                      className="h-8 text-xs"
                    />
                  </label>
                </div>
              ) : isOverlay(b.type) ? (
                <label className="grid gap-1 text-[11px] text-muted-foreground">
                  Texte
                  <Input
                    value={b.text ?? ""}
                    onChange={(e) => setBeat(i, { text: e.target.value.slice(0, 140) })}
                    className="h-8 text-xs"
                  />
                </label>
              ) : (
                <label className="grid gap-1 text-[11px] text-muted-foreground">
                  Entrée
                  <select
                    value={b.in ?? "pop"}
                    onChange={(e) => setBeat(i, { in: e.target.value as FlowBeat["in"] })}
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="pop">Apparition (pop)</option>
                    <option value="fade">Fondu</option>
                    <option value="slide-up">Glissement vers le haut</option>
                  </select>
                </label>
              )}

              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => move(i, -1)}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => move(i, 1)}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-destructive"
                  onClick={() => onChange(beats.filter((_, idx) => idx !== i))}
                >
                  ×
                </Button>
              </div>
            </div>
          );
        })}

        {beats.length < 25 && (
          <div className="flex flex-wrap gap-1">
            {BEAT_TYPES.map((t) => (
              <Button
                key={t.value}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() =>
                  onChange([
                    ...beats,
                    t.value === "node" || t.value === "link"
                      ? { type: t.value, ref: 1, in: "pop" }
                      : t.value === "metric"
                        ? { type: t.value, value: 0, suffix: "%", label: "", anchor: "center", in: "pop" }
                        : { type: t.value, text: "", anchor: "center", in: "slide-up" },
                  ])
                }
              >
                <Plus className="mr-1 h-3 w-3" />
                {t.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {overflow.length > 0 && (
        <p className="text-[11px] font-medium text-destructive">
          {overflow.length} battement(s) dépassent la durée de l'étape ({duration} s) : ils seront tronqués au rendu.
        </p>
      )}
      {clashes.length > 0 && (
        <p className="text-[11px] font-medium text-destructive">
          Deux textes ou chiffres se superposent sur la même ancre — décale les débuts ou change l'ancre.
        </p>
      )}
      <p className="text-[11px] leading-snug text-muted-foreground">
        Sans battement, la scène garde son comportement automatique (chaque nœud apparaît quand sa liaison est tracée).
        En « Séquence », les battements se partagent la durée à parts égales : changer 8 s en 25 s ne demande aucune
        ressaisie. Un battement <strong>nœud</strong> ou <strong>liaison</strong> impose le moment d'apparition de
        l'élément correspondant ; les <strong>titres, hooks, sous-hooks et chiffres</strong> se posent au cadre (haut,
        centre, bas) ou se collent à un nœud.
      </p>
    </div>
  );
};

export default SvgFlowBeatsEditor;
