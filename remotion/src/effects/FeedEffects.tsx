import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing, random } from "remotion";
import { evolvePath } from "@remotion/paths";
import { LightLeak } from "@remotion/light-leaks";
import { noise2D } from "@remotion/noise";
import { CameraMotionBlur } from "@remotion/motion-blur";

/**
 * Couche d'effets optionnels pour les montages Remotion (Feed, Promo…).
 *
 * Règle : aucun effet n'est câblé en dur dans un template. Tout passe par cet
 * objet de configuration, transmis par le manifest / les template_props et
 * piloté depuis le back-office. Par défaut tout est désactivé, donc un rendu
 * existant reste bit-pour-bit identique tant qu'aucun flag n'est activé.
 */
export type FeedEffectsConfig = {
  /** Grain argentique subtil (look premium/cinéma). */
  grain?: boolean;
  /** Vignettage doux sur les bords. */
  vignette?: boolean;
  /** Fuites de lumière organiques (@remotion/light-leaks). */
  lightLeaks?: boolean;
  /** Tracé SVG animé (cadre d'accroche dessiné au fil des frames, @remotion/paths). */
  pathDraw?: boolean;
  /** Flou de mouvement caméra sur toute la scène (coûteux : samples x frames). */
  motionBlur?: boolean;

  /** Intensité 0..1 appliquée au grain / vignette / light leaks. */
  intensity?: number;
  /** Couleur du tracé SVG. */
  strokeColor?: string;
  /** Frames de tracé du path (défaut 45). */
  pathFrames?: number;
  /** Échantillons du motion blur (défaut 3, max utile 4). */
  motionBlurSamples?: number;
  /** Portée du tracé SVG dans un montage Feed : toute la vidéo, l'accroche ou la fiche. */
  pathScope?: "all" | "hook" | "detail";

  /* ---------------------------------------------------------- effets simples */
  /** Fondu d'entrée depuis la couleur de fondu. */
  fadeIn?: boolean;
  /** Fondu (dip to black/white) entre chaque étape du montage. */
  fadeCross?: boolean;
  /** Fondu de sortie vers la couleur de fondu. */
  fadeOut?: boolean;
  /** Couleur des fondus : noir ou blanc. */
  fadeColor?: "black" | "white";
  /** Durée d'un fondu en frames (défaut 15 ≈ 0,5 s à 30 fps). */
  fadeFrames?: number;
  /** Ken Burns sur les images de fond : amplitude du travelling. */
  kenBurns?: "off" | "soft" | "strong";
  /** Fondu audio en entrée/sortie des voix-off. */
  audioFade?: boolean;
};


/**
 * Clés autorisées en surcharge par étape : uniquement des accents. Le grade du
 * film (grain, vignette, motion blur) reste piloté au niveau du montage.
 */
export const STEP_EFFECT_KEYS = ["pathDraw", "lightLeaks", "intensity", "strokeColor", "pathFrames"] as const;

/**
 * Héritage explicite : une étape sans surcharge hérite intégralement du
 * montage. Une seule source de vérité (le global), l'étape ne fait que
 * surcharger des accents.
 */
export const mergeEffects = (
  base?: FeedEffectsConfig | null,
  override?: Partial<FeedEffectsConfig> | null,
): FeedEffectsConfig | null => {
  if (!base && !override) return null;
  const out: FeedEffectsConfig = { ...(base ?? {}) };
  if (override) {
    for (const k of STEP_EFFECT_KEYS) {
      const v = (override as Record<string, unknown>)[k];
      if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
};

export const DEFAULT_EFFECTS: FeedEffectsConfig = {
  grain: false,
  vignette: false,
  lightLeaks: false,
  pathDraw: false,
  motionBlur: false,
  intensity: 0.5,
  strokeColor: "#D4AF37",
  pathFrames: 45,
  motionBlurSamples: 3,
  pathScope: "all",
};

/** Angle d'obturation fixe : aucune différence perceptible entre 150 et 210. */
const SHUTTER_ANGLE = 180;

export const hasAnyEffect = (e?: FeedEffectsConfig | null) =>
  !!e && (e.grain || e.vignette || e.lightLeaks || e.pathDraw || e.motionBlur);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Grain animé : bruit Perlin échantillonné sur une grille, redessiné par frame. */
const Grain: React.FC<{ intensity: number }> = ({ intensity }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cell = 6;
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const dots: string[] = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const n = noise2D("owm-grain", (x + frame * 0.7) / 12, (y - frame * 0.5) / 12);
      if (n > 0.55) {
        const a = ((n - 0.55) / 0.45) * 0.5;
        dots.push(
          `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="rgba(255,255,255,${a.toFixed(3)})"/>`
        );
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${dots.join("")}</svg>`;
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
        mixBlendMode: "overlay",
        opacity: 0.12 + intensity * 0.18,
        pointerEvents: "none",
      }}
    />
  );
};

/** Vignettage : assombrissement radial des bords. */
const Vignette: React.FC<{ intensity: number }> = ({ intensity }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${(0.25 + intensity * 0.4).toFixed(
        2
      )}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

/** Fuites de lumière : deux passes décalées pour éviter la boucle visible. */
const Leaks: React.FC<{ intensity: number }> = ({ intensity }) => (
  <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.25 + intensity * 0.45, pointerEvents: "none" }}>
    <LightLeak seed={4} hueShift={18} />
  </AbsoluteFill>
);

/**
 * Tracé SVG animé : cadre d'accroche dessiné au fil des frames, puis effacé.
 * C'est le primitif de motion design de `@remotion/paths` : on calcule la
 * longueur du chemin et on anime strokeDasharray / strokeDashoffset.
 */
const PathDraw: React.FC<{ color: string; drawFrames: number; startFrame?: number }> = ({
  color,
  drawFrames,
  startFrame = 0,
}) => {
  const frame = Math.max(0, useCurrentFrame() - startFrame);
  const { width, height } = useVideoConfig();
  const inset = Math.round(Math.min(width, height) * 0.045);
  const w = width - inset * 2;
  const h = height - inset * 2;
  const r = Math.round(Math.min(width, height) * 0.035);
  const d = [
    `M ${inset + r} ${inset}`,
    `H ${inset + w - r}`,
    `A ${r} ${r} 0 0 1 ${inset + w} ${inset + r}`,
    `V ${inset + h - r}`,
    `A ${r} ${r} 0 0 1 ${inset + w - r} ${inset + h}`,
    `H ${inset + r}`,
    `A ${r} ${r} 0 0 1 ${inset} ${inset + h - r}`,
    `V ${inset + r}`,
    `A ${r} ${r} 0 0 1 ${inset + r} ${inset}`,
    "Z",
  ].join(" ");

  const progress = interpolate(frame, [0, drawFrames], [0, 1], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const { strokeDasharray, strokeDashoffset } = evolvePath(progress, d);
  const opacity = interpolate(frame, [0, 6, drawFrames + 40, drawFrames + 70], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (opacity <= 0) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
    </AbsoluteFill>
  );
};

/** Overlays purement additifs, à poser au-dessus du montage. */
export const FeedEffectsOverlay: React.FC<{
  effects?: FeedEffectsConfig | null;
  /** Phase courante d'un montage Feed (sert au ciblage du tracé SVG). */
  phase?: "hook" | "detail";
  /** Frame de départ de la phase (le tracé repart de zéro à chaque phase). */
  phaseStartFrame?: number;
}> = ({ effects, phase, phaseStartFrame = 0 }) => {
  if (!effects) return null;
  const scope = effects.pathScope ?? "all";
  const pathVisible = !phase || scope === "all" || scope === phase;
  const intensity = clamp01(effects.intensity ?? DEFAULT_EFFECTS.intensity!);
  return (
    <>
      {effects.lightLeaks && <Leaks intensity={intensity} />}
      {effects.vignette && <Vignette intensity={intensity} />}
      {effects.grain && <Grain intensity={intensity} />}
      {effects.pathDraw && pathVisible && (
        <PathDraw
          key={phase ?? "all"}
          color={effects.strokeColor || DEFAULT_EFFECTS.strokeColor!}
          drawFrames={Math.max(6, effects.pathFrames ?? DEFAULT_EFFECTS.pathFrames!)}
          startFrame={phaseStartFrame}
        />
      )}
    </>
  );
};

/**
 * Wrapper de scène : n'introduit aucune couche DOM quand le motion blur est
 * désactivé (donc rendu inchangé), sinon échantillonne la scène via
 * CameraMotionBlur.
 */
export const FeedMotionBlurWrapper: React.FC<{ effects?: FeedEffectsConfig | null; children: React.ReactNode }> = ({
  effects,
  children,
}) => {
  if (!effects?.motionBlur) return <>{children}</>;
  return (
    <CameraMotionBlur
      samples={Math.max(2, Math.min(4, effects.motionBlurSamples ?? DEFAULT_EFFECTS.motionBlurSamples!))}
      shutterAngle={SHUTTER_ANGLE}
    >
      {children}
    </CameraMotionBlur>
  );
};

/** Utilitaire exposé pour d'autres templates : jitter déterministe léger. */
export const seededJitter = (seed: string, frame: number, amp: number) =>
  (random(`${seed}-${Math.floor(frame / 3)}`) - 0.5) * 2 * amp;
