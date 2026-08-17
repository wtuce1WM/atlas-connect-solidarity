import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Sparkles, Wand2 } from "lucide-react";

/**
 * Effets de motion design — source unique du vocabulaire côté back-office.
 *
 * Deux niveaux, avec héritage explicite :
 *  - **Montage (global)** : le « grade » du film — grain, vignettage, fuites de
 *    lumière, flou de mouvement + intensité. C'est ce qui donne sa cohérence.
 *  - **Étape (accents)** : uniquement `pathDraw`, `lightLeaks` et l'intensité
 *    locale. Une étape sans surcharge hérite intégralement du montage : pas de
 *    seconde source de vérité, et un montage sans effet reste inchangé au rendu.
 */

export type MontageEffects = {
  grain?: boolean;
  vignette?: boolean;
  lightLeaks?: boolean;
  motionBlur?: boolean;
  pathDraw?: boolean;
  intensity?: number;
  strokeColor?: string;
  pathFrames?: number;
  motionBlurSamples?: number;
  /* effets simples */
  fadeIn?: boolean;
  fadeCross?: boolean;
  fadeOut?: boolean;
  fadeColor?: "black" | "white";
  fadeFrames?: number;
  crossStyle?: "dip" | "slide" | "wipe";
  crossDir?: "left" | "right" | "up" | "down";
  flashCut?: boolean;
  kenBurns?: "off" | "soft" | "strong";
  audioFade?: boolean;
};

export const FADE_SPEEDS = [
  { label: "Rapide (~0,3 s)", value: 9 },
  { label: "Normal (~0,5 s)", value: 15 },
  { label: "Lent (~1 s)", value: 30 },
];

export const hasAnySimpleEffect = (e?: MontageEffects | null) =>
  !!e &&
  !!(e.fadeIn || e.fadeOut || e.fadeCross || e.flashCut || e.audioFade || (e.kenBurns && e.kenBurns !== "off"));

export const STROKE_PRESETS = [
  { label: "Or", value: "#D4AF37" },
  { label: "Terracotta", value: "#C1663F" },
  { label: "Blanc", value: "#FFFFFF" },
  { label: "WhatsApp", value: "#25D366" },
];

export const PATH_SPEEDS = [
  { label: "Rapide (~1 s)", value: 30 },
  { label: "Normal (~1,5 s)", value: 45 },
  { label: "Lent (~2,5 s)", value: 75 },
];

const GLOBAL_EFFECTS: Array<{ key: keyof MontageEffects; label: string; hint: string }> = [
  { key: "grain", label: "Grain argentique", hint: "Bruit animé, look cinéma." },
  { key: "vignette", label: "Vignettage", hint: "Assombrissement radial des bords." },
  { key: "lightLeaks", label: "Fuites de lumière", hint: "Halos organiques." },
  {
    key: "motionBlur",
    label: "Flou de mouvement caméra",
    hint: "Coûteux : multiplie le temps de rendu par le nombre d'échantillons.",
  },
];

export const hasAnyMontageEffect = (e?: MontageEffects | null) =>
  !!e && !!(e.grain || e.vignette || e.lightLeaks || e.motionBlur);

const ColorPresets = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex flex-wrap gap-2">
    {STROKE_PRESETS.map((p) => (
      <Button
        key={p.value}
        type="button"
        size="sm"
        variant={value === p.value ? "default" : "outline"}
        className="h-7 text-[11px] gap-2"
        onClick={() => onChange(p.value)}
      >
        <span className="h-3 w-3 rounded-full border border-black/20" style={{ backgroundColor: p.value }} />
        {p.label}
      </Button>
    ))}
  </div>
);

/** Grade global du montage. */
export const MontageEffectsBlock = ({
  value,
  onChange,
}: {
  value: MontageEffects | null;
  onChange: (v: MontageEffects | null) => void;
}) => {
  const e = value ?? {};
  const set = (patch: Partial<MontageEffects>) => {
    const next = { ...e, ...patch };
    const any = !!(next.grain || next.vignette || next.lightLeaks || next.motionBlur);
    onChange(any ? next : null);
  };
  const any = hasAnyMontageEffect(e);
  const intensity = Math.round((e.intensity ?? 0.5) * 100);

  return (
    <div className="grid gap-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Effets de motion design du montage (grade global)
        </span>
        {!any && (
          <Badge variant="outline" className="text-[10px]">
            aucun — rendu standard
          </Badge>
        )}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {GLOBAL_EFFECTS.map((g) => (
          <label
            key={String(g.key)}
            className="flex items-start gap-3 rounded-md border p-2 cursor-pointer"
            htmlFor={`montage-effect-${String(g.key)}`}
          >
            <Switch
              id={`montage-effect-${String(g.key)}`}
              checked={!!e[g.key]}
              onCheckedChange={(v) => set({ [g.key]: v } as Partial<MontageEffects>)}
            />
            <span className="grid gap-0.5">
              <span className="text-xs text-black">{g.label}</span>
              <span className="text-[10px] text-muted-foreground leading-snug">{g.hint}</span>
            </span>
          </label>
        ))}
      </div>
      {any && (
        <div className="grid gap-3 border-t pt-3 md:grid-cols-2">
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">Intensité générale : {intensity}%</span>
            <Slider
              value={[intensity]}
              onValueChange={(v) => set({ intensity: (v[0] ?? 50) / 100 })}
              min={0}
              max={100}
              step={5}
            />
          </div>
          {e.motionBlur && (
            <label className="grid gap-1 text-xs text-muted-foreground">
              Échantillons de flou (coût ×{e.motionBlurSamples ?? 3})
              <Input
                type="number"
                min={2}
                max={4}
                value={e.motionBlurSamples ?? 3}
                onChange={(ev) =>
                  set({ motionBlurSamples: Math.max(2, Math.min(4, Number(ev.target.value) || 3)) })
                }
                className="h-8 text-xs"
              />
              <span className="text-[10px]">Plafonné à 4 : au-delà, le rendu explose sans gain visible.</span>
            </label>
          )}
        </div>
      )}
      <span className="text-[11px] text-muted-foreground">
        Ces effets s'appliquent à toute la vidéo. Chaque étape peut ensuite surcharger des accents (tracé SVG,
        fuites de lumière, intensité) — sans surcharge, elle hérite d'ici.
      </span>
    </div>
  );
};

/** Accents surchargeables au niveau d'une étape. */
export const StepEffectsBlock = ({
  value,
  onChange,
}: {
  value: Partial<MontageEffects> | null;
  onChange: (v: Partial<MontageEffects> | null) => void;
}) => {
  const overridden = !!value;
  const e = value ?? {};
  const set = (patch: Partial<MontageEffects>) => onChange({ ...e, ...patch });

  return (
    <div className="grid gap-2 rounded-md border p-2 md:col-span-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Effets de cette étape
        </span>
        <Badge variant={overridden ? "default" : "outline"} className="text-[10px]">
          {overridden ? "surchargé" : "hérité du montage"}
        </Badge>
        <Switch
          checked={overridden}
          onCheckedChange={(v) => onChange(v ? { pathDraw: true, strokeColor: STROKE_PRESETS[0].value, pathFrames: 45 } : null)}
        />
      </div>
      {overridden && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={!!e.pathDraw} onCheckedChange={(v) => set({ pathDraw: v })} />
            Tracé SVG (cadre dessiné)
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={!!e.lightLeaks} onCheckedChange={(v) => set({ lightLeaks: v })} />
            Fuites de lumière (accent)
          </label>
          {e.pathDraw && (
            <>
              <div className="grid gap-1">
                <span className="text-xs text-muted-foreground">Couleur du tracé</span>
                <ColorPresets
                  value={e.strokeColor || STROKE_PRESETS[0].value}
                  onChange={(v) => set({ strokeColor: v })}
                />
              </div>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Vitesse du tracé
                <select
                  value={String(e.pathFrames ?? 45)}
                  onChange={(ev) => set({ pathFrames: Number(ev.target.value) || 45 })}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                >
                  {PATH_SPEEDS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <div className="grid gap-1 md:col-span-2">
            <span className="text-xs text-muted-foreground">
              Intensité locale : {Math.round((e.intensity ?? 0.5) * 100)}%
            </span>
            <Slider
              value={[Math.round((e.intensity ?? 0.5) * 100)]}
              onValueChange={(v) => set({ intensity: (v[0] ?? 50) / 100 })}
              min={0}
              max={100}
              step={5}
            />
          </div>
        </div>
      )}
      <span className="text-[11px] text-muted-foreground">
        Le grain, le vignettage et le flou de mouvement restent pilotés au niveau du montage : ils ne sont pas
        surchargeables ici, pour garder un rendu cohérent.
      </span>
    </div>
  );
};

/**
 * Effets simples — fondus, transitions, Ken Burns, fondu audio.
 *
 * Contrat : aucun de ces effets ne change la durée du montage (les transitions
 * sont jouées à l'intérieur des sections). Tout est désactivé par défaut, donc
 * un montage existant se rend à l'identique tant qu'on ne touche à rien.
 */
export const SimpleEffectsBlock = ({
  value,
  onChange,
}: {
  value: MontageEffects | null;
  onChange: (v: MontageEffects | null) => void;
}) => {
  const e = value ?? {};
  const set = (patch: Partial<MontageEffects>) => {
    const next = { ...e, ...patch };
    // On conserve l'objet dès qu'un effet (simple OU grade) est actif.
    const keep = hasAnySimpleEffect(next) || hasAnyMontageEffect(next);
    onChange(keep ? next : null);
  };
  const cross = e.crossStyle ?? "dip";

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Effets simples
        </span>
        {!hasAnySimpleEffect(e) && (
          <Badge variant="outline" className="text-[10px]">
            aucun — coupes franches
          </Badge>
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex items-center gap-3 rounded-md border p-2 cursor-pointer">
          <Switch checked={!!e.fadeIn} onCheckedChange={(v) => set({ fadeIn: v })} />
          <span className="grid gap-0.5">
            <span className="text-xs text-black">Fondu d'entrée</span>
            <span className="text-[10px] text-muted-foreground">Ouverture depuis la couleur de fondu.</span>
          </span>
        </label>
        <label className="flex items-center gap-3 rounded-md border p-2 cursor-pointer">
          <Switch checked={!!e.fadeOut} onCheckedChange={(v) => set({ fadeOut: v })} />
          <span className="grid gap-0.5">
            <span className="text-xs text-black">Fondu de sortie</span>
            <span className="text-[10px] text-muted-foreground">Fermeture vers la couleur de fondu.</span>
          </span>
        </label>
        <label className="flex items-center gap-3 rounded-md border p-2 cursor-pointer">
          <Switch checked={!!e.fadeCross} onCheckedChange={(v) => set({ fadeCross: v })} />
          <span className="grid gap-0.5">
            <span className="text-xs text-black">Transition entre les étapes</span>
            <span className="text-[10px] text-muted-foreground">Fondu (dip), slide/push ou balayage.</span>
          </span>
        </label>
        <label className="flex items-center gap-3 rounded-md border p-2 cursor-pointer">
          <Switch checked={!!e.flashCut} onCheckedChange={(v) => set({ flashCut: v })} />
          <span className="grid gap-0.5">
            <span className="text-xs text-black">Flash blanc sur la coupe</span>
            <span className="text-[10px] text-muted-foreground">2-3 frames, look « social ».</span>
          </span>
        </label>
        <label className="flex items-center gap-3 rounded-md border p-2 cursor-pointer">
          <Switch checked={!!e.audioFade} onCheckedChange={(v) => set({ audioFade: v })} />
          <span className="grid gap-0.5">
            <span className="text-xs text-black">Fondu audio in/out</span>
            <span className="text-[10px] text-muted-foreground">Évite les coupes sèches de voix-off.</span>
          </span>
        </label>
        <label className="grid gap-1 rounded-md border p-2 text-xs text-muted-foreground">
          Ken Burns (images fixes)
          <select
            value={e.kenBurns ?? "off"}
            onChange={(ev) => set({ kenBurns: ev.target.value as MontageEffects["kenBurns"] })}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            <option value="off">Par défaut (zoom léger)</option>
            <option value="soft">Doux</option>
            <option value="strong">Marqué</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 border-t pt-3 md:grid-cols-3">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Vitesse des fondus
          <select
            value={String(e.fadeFrames ?? 15)}
            onChange={(ev) => set({ fadeFrames: Number(ev.target.value) || 15 })}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            {FADE_SPEEDS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Couleur du fondu</span>
          <div className="flex gap-2">
            {(["black", "white"] as const).map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={(e.fadeColor ?? "black") === c ? "default" : "outline"}
                className="h-7 text-[11px] gap-2"
                onClick={() => set({ fadeColor: c })}
              >
                <span
                  className="h-3 w-3 rounded-full border border-black/20"
                  style={{ backgroundColor: c === "black" ? "#000000" : "#FFFFFF" }}
                />
                {c === "black" ? "Noir" : "Blanc"}
              </Button>
            ))}
          </div>
        </div>
        {e.fadeCross && (
          <div className="grid gap-1">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Style de transition
              <select
                value={cross}
                onChange={(ev) => set({ crossStyle: ev.target.value as MontageEffects["crossStyle"] })}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value="dip">Fondu (dip to color)</option>
                <option value="slide">Slide / push</option>
                <option value="wipe">Balayage (wipe)</option>
              </select>
            </label>
            {cross !== "dip" && (
              <label className="grid gap-1 text-xs text-muted-foreground">
                Direction
                <select
                  value={e.crossDir ?? "left"}
                  onChange={(ev) => set({ crossDir: ev.target.value as MontageEffects["crossDir"] })}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                >
                  <option value="left">Depuis la droite →</option>
                  <option value="right">Depuis la gauche ←</option>
                  <option value="up">Depuis le bas ↑</option>
                  <option value="down">Depuis le haut ↓</option>
                </select>
              </label>
            )}
          </div>
        )}
      </div>

      <span className="text-[11px] text-muted-foreground">
        Ces effets ne modifient jamais la durée totale : les transitions sont jouées sur les premières frames de
        chaque étape.
      </span>
    </div>
  );
};
