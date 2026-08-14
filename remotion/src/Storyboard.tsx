import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { palette, alpha, display, body, size, weight } from "./tokens";
import { PromoLogo } from "./promo/PromoLogo";

/**
 * Moteur de storyboard manuel — SOURCE UNIQUE.
 *
 * Ce composant ne contient AUCUNE logique propre à un scénario donné :
 * il reçoit une liste de sections (`step_type` + `config` + durée) issue du
 * back-office (`video_storyboards` / `video_scenario_steps`) et délègue chaque
 * section à une scène générique de la bibliothèque motion 1WM.
 *
 * Ajouter un scénario = créer un storyboard en base, jamais un nouveau template.
 * Ajouter une grammaire visuelle = ajouter un `step_type` ici, jamais un fork.
 */

const EMOJI = `"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", "Twemoji Mozilla"`;
const displayFont = `${display}, ${EMOJI}`;
const bodyFont = `${body}, ${EMOJI}`;

export const STORYBOARD_FPS = 30;
export const STORYBOARD_PORTRAIT = { width: 1080, height: 1920 } as const;
export const STORYBOARD_LANDSCAPE = { width: 1920, height: 1080 } as const;

/** Cadre de référence du dessin : les scènes composent toujours dans ce repère,
 *  puis l'ensemble est mis à l'échelle vers la sortie (0.5x en aperçu, 1x en final). */
export const STAGE_PORTRAIT = { width: 1080, height: 1920 } as const;
export const STAGE_LANDSCAPE = { width: 1920, height: 1080 } as const;

export type StoryboardStepType =
  | "hook"
  | "video"
  | "photos"
  | "text_overlay"
  | "counter"
  | "map_reveal"
  | "split_screen"
  | "logo_merge"
  | "outro";

export type StoryboardSection = {
  step_type: StoryboardStepType;
  label?: string | null;
  duration_sec: number;
  config?: Record<string, unknown> | null;
};

export type StoryboardProps = {
  format: "portrait" | "landscape";
  /** Logo 1WM (transparent) utilisé par les scènes de marque. */
  brandLogoUrl?: string | null;
  /** Logo de l'établissement (transparent). */
  logoUrl?: string | null;
  sections: StoryboardSection[];
};

export const storyboardDefaults: StoryboardProps = {
  format: "portrait",
  brandLogoUrl: null,
  logoUrl: null,
  sections: [{ step_type: "logo_merge", duration_sec: 6, config: {} }],
};

const clampSec = (v: unknown, fallback = 6) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(30, Math.max(1, n));
};

export const computeStoryboardFrames = (p: StoryboardProps) => {
  const total = (p.sections ?? []).reduce((acc, s) => acc + clampSec(s.duration_sec), 0);
  return Math.max(STORYBOARD_FPS, Math.round(total * STORYBOARD_FPS));
};

/** URL absolue laissée telle quelle ; chemin relatif résolu dans `remotion/public`. */
const assetUrl = (src: string | null | undefined) => {
  if (!src) return null;
  const v = src.trim();
  if (!v) return null;
  return /^(https?:|data:|blob:)/.test(v) ? v : staticFile(v.replace(/^\/+/, ""));
};

const str = (cfg: Record<string, unknown> | null | undefined, key: string) => {
  const v = cfg?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

/* ------------------------------------------------------------------ scènes */

/** Fond commun : nuit 1WM + halo braise, aucun aplat plat. */
const SceneBackdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle at 50% 42%, ${palette.emberDeep}, ${palette.night})`,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {children}
  </AbsoluteFill>
);

/**
 * `logo_merge` — premier type finalisé.
 * Les deux logos entrent depuis les bords opposés, convergent vers le centre,
 * puis un trait d'or se dessine entre eux : la signature du partenariat.
 * Aucune boîte, aucun cadre : on n'anime que les silhouettes détourées.
 */
const LogoMergeScene: React.FC<{
  wide: boolean;
  brandLogoUrl?: string | null;
  section: StoryboardSection;
}> = ({ wide, brandLogoUrl: rawBrandLogo, section }) => {
  const brandLogoUrl = assetUrl(rawBrandLogo);
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const cfg = section.config ?? {};
  const partner = assetUrl(str(cfg, "partnerLogoUrl"));
  const caption = str(cfg, "caption");

  const stage = wide ? STAGE_LANDSCAPE : STAGE_PORTRAIT;
  const logoSize = stage.width * (wide ? 0.22 : 0.36);
  const spread = stage.width * (wide ? 0.19 : 0.24);

  // Convergence : ressort d'entrée puis rapprochement vers le centre.
  const enter = spring({ frame, fps, config: { damping: 22, stiffness: 80, mass: 1.1 } });
  const merge = spring({
    frame: frame - Math.round(fps * 0.9),
    fps,
    config: { damping: 26, stiffness: 60, mass: 1.2 },
  });
  const offset = interpolate(enter, [0, 1], [spread * 2.1, spread]) - interpolate(merge, [0, 1], [0, spread * 0.34]);

  // Trait d'or : se dessine quand la convergence est engagée.
  const ruleWidth = interpolate(merge, [0, 1], [0, stage.width * (wide ? 0.1 : 0.16)]);
  const captionIn = interpolate(frame, [Math.round(fps * 1.6), Math.round(fps * 2.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const out = interpolate(frame, [durationInFrames - Math.round(fps * 0.5), durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <SceneBackdrop>
      <div style={{ opacity: out, display: "flex", flexDirection: "column", alignItems: "center", gap: stage.width * 0.05 }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: `translateX(${-offset}px)` }}>
            {brandLogoUrl ? (
              <PromoLogo src={brandLogoUrl} size={logoSize} />
            ) : (
              <span style={{ fontFamily: displayFont, fontSize: size.h2, fontWeight: weight.bold, color: palette.cream }}>
                1WM
              </span>
            )}
          </div>
          <div
            style={{
              width: ruleWidth,
              height: Math.max(3, stage.width * 0.0028),
              background: palette.gold,
              borderRadius: 999,
              boxShadow: `0 0 ${Math.round(stage.width * 0.02)}px ${alpha("gold", 0.55)}`,
            }}
          />
          <div style={{ transform: `translateX(${offset}px)` }}>
            {partner ? (
              <PromoLogo src={partner} size={logoSize} delay={4} />
            ) : (
              <span style={{ fontFamily: displayFont, fontSize: size.h2, fontWeight: weight.medium, color: alpha("cream", 0.5) }}>
                ?
              </span>
            )}
          </div>
        </div>
        {caption && (
          <span
            style={{
              opacity: captionIn,
              transform: `translateY(${interpolate(captionIn, [0, 1], [10, 0])}px)`,
              fontFamily: bodyFont,
              fontSize: size.lead,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: palette.gold,
            }}
          >
            {caption}
          </span>
        )}
      </div>
    </SceneBackdrop>
  );
};

/**
 * Carte typographique neutre : filet de sécurité pour tout `step_type` dont la
 * grammaire visuelle n'est pas encore implémentée. Le film ne casse jamais et
 * le timing du storyboard reste exact — la scène affiche son intention.
 */
const PlaceholderScene: React.FC<{ wide: boolean; section: StoryboardSection }> = ({ wide, section }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const cfg = section.config ?? {};
  const title = str(cfg, "title") ?? str(cfg, "hook") ?? section.label ?? section.step_type;
  const bodyText = str(cfg, "body") ?? str(cfg, "subtitle") ?? str(cfg, "tagline");
  const stage = wide ? STAGE_LANDSCAPE : STAGE_PORTRAIT;

  const enter = spring({ frame, fps, config: { damping: 24, stiffness: 74, mass: 1 } });
  const out = interpolate(frame, [durationInFrames - Math.round(fps * 0.4), durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <SceneBackdrop>
      <div
        style={{
          opacity: out * interpolate(enter, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
          width: stage.width * 0.72,
          display: "flex",
          flexDirection: "column",
          gap: stage.width * 0.024,
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: bodyFont,
            fontSize: size.caption,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: palette.gold,
          }}
        >
          {section.step_type}
        </span>
        <span
          style={{
            fontFamily: displayFont,
            fontSize: wide ? size.h2 : size.h1,
            fontWeight: weight.bold,
            lineHeight: 1.08,
            color: palette.cream,
          }}
        >
          {title}
        </span>
        <div style={{ width: stage.width * 0.08, height: 4, background: palette.gold, borderRadius: 999 }} />
        {bodyText && (
          <span style={{ fontFamily: bodyFont, fontSize: size.lead, lineHeight: 1.42, color: alpha("cream", 0.82) }}>
            {bodyText}
          </span>
        )}
      </div>
    </SceneBackdrop>
  );
};

const SectionScene: React.FC<{ wide: boolean; p: StoryboardProps; section: StoryboardSection }> = ({
  wide,
  p,
  section,
}) => {
  switch (section.step_type) {
    case "logo_merge":
      return <LogoMergeScene wide={wide} brandLogoUrl={p.brandLogoUrl ?? p.logoUrl ?? null} section={section} />;
    default:
      return <PlaceholderScene wide={wide} section={section} />;
  }
};

/* ------------------------------------------------------------------ montage */

export const Storyboard: React.FC<StoryboardProps> = (props) => {
  const p = { ...storyboardDefaults, ...props };
  const { width, height } = useVideoConfig();
  const wide = p.format === "landscape";
  const stage = wide ? STAGE_LANDSCAPE : STAGE_PORTRAIT;
  // Une seule mise à l'échelle globale : l'aperçu 540p et le final 1080p
  // partagent exactement la même géométrie de dessin.
  const scale = Math.min(width / stage.width, height / stage.height);

  let cursor = 0;
  const plans = (p.sections ?? []).map((section, i) => {
    const frames = Math.max(1, Math.round(clampSec(section.duration_sec) * STORYBOARD_FPS));
    const from = cursor;
    cursor += frames;
    return { key: `${section.step_type}-${i}`, section, from, frames };
  });

  return (
    <AbsoluteFill style={{ background: palette.night }}>
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: stage.width,
            height: stage.height,
            // `translate` avant `scale` : le repère de dessin reste centré et
            // n'est jamais rétréci par le flex parent (flex-shrink).
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: "center center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {plans.map((plan) => (
            <Sequence key={plan.key} from={plan.from} durationInFrames={plan.frames} layout="none">
              <SectionScene wide={wide} p={p} section={plan.section} />
            </Sequence>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
