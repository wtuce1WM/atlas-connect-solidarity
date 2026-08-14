import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
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
  /** Contexte fiche : sert de repli aux scènes hook/photos/video/outro. */
  businessName?: string | null;
  city?: string | null;
  hook?: string | null;
  photos?: string[] | null;
  videoUrl?: string | null;
  sections: StoryboardSection[];
};

export const storyboardDefaults: StoryboardProps = {
  format: "portrait",
  brandLogoUrl: null,
  logoUrl: null,
  businessName: null,
  city: null,
  hook: null,
  photos: null,
  videoUrl: null,
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

/* ------------------------------------------------- helpers de configuration */

const num = (cfg: Record<string, unknown> | null | undefined, key: string) => {
  const v = cfg?.[key];
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const list = (cfg: Record<string, unknown> | null | undefined, key: string) => {
  const v = cfg?.[key];
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Record<string, unknown>[]) : [];
};

/** Séparateur de milliers en espace fine insécable (typographie FR). */
const frNumber = (n: number, decimals: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).replace(/\u202f|\u00a0/g, "\u202f");

/** Filet d'or commun à toutes les scènes (largeur animable). */
const GoldRule: React.FC<{ width: number; stageWidth: number }> = ({ width, stageWidth }) => (
  <div
    style={{
      width,
      height: Math.max(3, stageWidth * 0.0028),
      background: palette.gold,
      borderRadius: 999,
      boxShadow: `0 0 ${Math.round(stageWidth * 0.02)}px ${alpha("gold", 0.5)}`,
    }}
  />
);

/** Entrée/sortie standard d'une scène : même respiration partout. */
const useSceneFade = (outSec = 0.45) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 24, stiffness: 74, mass: 1 } });
  const out = interpolate(frame, [durationInFrames - Math.round(fps * outSec), durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });
  return { frame, fps, durationInFrames, enter, out };
};

/**
 * `counter` — chiffres clés animés.
 * config : { kicker, title, body, decimals, items: [{ value, prefix, suffix, label }] }
 * Sans `items`, la scène retombe sur { value, label } pour un chiffre unique.
 */
const CounterScene: React.FC<{ wide: boolean; section: StoryboardSection }> = ({ wide, section }) => {
  const { frame, fps, enter, out } = useSceneFade();
  const cfg = section.config ?? {};
  const stage = wide ? STAGE_LANDSCAPE : STAGE_PORTRAIT;
  const decimals = Math.min(2, Math.max(0, num(cfg, "decimals") ?? 0));

  const raw = list(cfg, "items");
  const items = (raw.length ? raw : [{ value: num(cfg, "value") ?? 0, label: str(cfg, "label") ?? "" }]).slice(0, 4);

  const kicker = str(cfg, "kicker") ?? section.label ?? null;
  const title = str(cfg, "title");
  const bodyText = str(cfg, "body");
  const cols = items.length;
  const valueSize = cols >= 3 ? (wide ? size.h2 : size.h3) : wide ? size.display : size.h1;

  return (
    <SceneBackdrop>
      <div
        style={{
          opacity: out * enter,
          transform: `translateY(${interpolate(enter, [0, 1], [26, 0])}px)`,
          width: stage.width * 0.82,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: stage.width * 0.026,
          textAlign: "center",
        }}
      >
        {kicker && (
          <span
            style={{
              fontFamily: bodyFont,
              fontSize: size.caption,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: palette.gold,
            }}
          >
            {kicker}
          </span>
        )}
        {title && (
          <span
            style={{
              fontFamily: displayFont,
              fontSize: wide ? size.h3 : size.h4,
              fontWeight: weight.semibold,
              lineHeight: 1.12,
              color: palette.cream,
            }}
          >
            {title}
          </span>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: wide || cols <= 2 ? "row" : "column",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: stage.width * (cols >= 3 ? 0.045 : 0.07),
          }}
        >
          {items.map((it, i) => {
            const target = (() => {
              const v = it.value;
              const n = typeof v === "number" ? v : Number(v);
              return Number.isFinite(n) ? n : 0;
            })();
            // Décompte échelonné : chaque chiffre démarre légèrement après le précédent.
            const roll = spring({
              frame: frame - Math.round(fps * (0.25 + i * 0.22)),
              fps,
              durationInFrames: Math.round(fps * 1.4),
              config: { damping: 200 },
            });
            const shown = frNumber(target * roll, decimals);
            const label = typeof it.label === "string" ? it.label : "";
            const prefix = typeof it.prefix === "string" ? it.prefix : "";
            const suffix = typeof it.suffix === "string" ? it.suffix : "";
            return (
              <div
                key={i}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: stage.width * 0.008 }}
              >
                <span
                  style={{
                    fontFamily: displayFont,
                    fontSize: valueSize,
                    fontWeight: weight.bold,
                    lineHeight: 1,
                    color: palette.cream,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {prefix}
                  {shown}
                  {suffix}
                </span>
                {label && (
                  <span
                    style={{
                      fontFamily: bodyFont,
                      fontSize: size.caption,
                      lineHeight: 1.3,
                      color: alpha("cream", 0.78),
                      maxWidth: stage.width * (cols >= 3 ? 0.2 : 0.3),
                    }}
                  >
                    {label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <GoldRule width={interpolate(enter, [0, 1], [0, stage.width * 0.08])} stageWidth={stage.width} />
        {bodyText && (
          <span style={{ fontFamily: bodyFont, fontSize: size.lead, lineHeight: 1.42, color: alpha("cream", 0.82) }}>
            {bodyText}
          </span>
        )}
      </div>
    </SceneBackdrop>
  );
};

/**
 * `map_reveal` — révélation d'une carte avec points d'intérêt.
 * config : { mapUrl, title, kicker, zoom, points: [{ x, y, label }] } — x/y en % de l'image.
 */
const MapRevealScene: React.FC<{ wide: boolean; section: StoryboardSection }> = ({ wide, section }) => {
  const { frame, fps, enter, out } = useSceneFade();
  const cfg = section.config ?? {};
  const stage = wide ? STAGE_LANDSCAPE : STAGE_PORTRAIT;
  const mapUrl = assetUrl(str(cfg, "mapUrl") ?? str(cfg, "mapImageUrl") ?? str(cfg, "imageUrl"));
  const title = str(cfg, "title");
  const kicker = str(cfg, "kicker") ?? section.label ?? null;
  const points = list(cfg, "points").slice(0, 8);
  const zoom = Math.min(1.6, Math.max(1, num(cfg, "zoom") ?? 1.12));

  // Léger travelling avant : la carte respire, jamais figée.
  const scale = interpolate(enter, [0, 1], [zoom, 1.005]);

  return (
    <SceneBackdrop>
      <AbsoluteFill style={{ opacity: out }}>
        {mapUrl ? (
          <Img
            src={mapUrl}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${scale})`,
              filter: "saturate(0.85) contrast(1.05) brightness(0.75)",
            }}
          />
        ) : null}
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 50% 45%, ${alpha("night", 0.15)}, ${alpha("night", 0.82)})`,
          }}
        />
        {points.map((pt, i) => {
          const x = (() => {
            const n = Number(pt.x);
            return Number.isFinite(n) ? n : 50;
          })();
          const y = (() => {
            const n = Number(pt.y);
            return Number.isFinite(n) ? n : 50;
          })();
          const pop = spring({
            frame: frame - Math.round(fps * (0.5 + i * 0.16)),
            fps,
            config: { damping: 14, stiffness: 140, mass: 0.7 },
          });
          const dot = Math.max(10, stage.width * 0.011);
          const label = typeof pt.label === "string" ? pt.label : "";
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%, -50%) scale(${pop})`,
                opacity: Math.min(1, pop),
                display: "flex",
                alignItems: "center",
                gap: dot * 0.9,
              }}
            >
              <div
                style={{
                  width: dot,
                  height: dot,
                  borderRadius: 999,
                  background: palette.gold,
                  boxShadow: `0 0 ${dot * 2.4}px ${alpha("gold", 0.75)}`,
                }}
              />
              {label && (
                <span
                  style={{
                    fontFamily: bodyFont,
                    fontSize: size.label,
                    color: palette.cream,
                    whiteSpace: "nowrap",
                    textShadow: `0 2px 12px ${alpha("night", 0.9)}`,
                  }}
                >
                  {label}
                </span>
              )}
            </div>
          );
        })}
        {(kicker || title) && (
          <div
            style={{
              position: "absolute",
              left: stage.width * 0.07,
              bottom: stage.height * 0.09,
              display: "flex",
              flexDirection: "column",
              gap: stage.width * 0.014,
              maxWidth: stage.width * 0.6,
              transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
              opacity: enter,
            }}
          >
            {kicker && (
              <span
                style={{
                  fontFamily: bodyFont,
                  fontSize: size.caption,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: palette.gold,
                }}
              >
                {kicker}
              </span>
            )}
            {title && (
              <span
                style={{
                  fontFamily: displayFont,
                  fontSize: wide ? size.h2 : size.h3,
                  fontWeight: weight.bold,
                  lineHeight: 1.08,
                  color: palette.cream,
                  textShadow: `0 4px 24px ${alpha("night", 0.85)}`,
                }}
              >
                {title}
              </span>
            )}
            <GoldRule width={interpolate(enter, [0, 1], [0, stage.width * 0.07])} stageWidth={stage.width} />
          </div>
        )}
      </AbsoluteFill>
    </SceneBackdrop>
  );
};

/**
 * `split_screen` — comparaison ou mise en regard de deux panneaux.
 * config : { left: { imageUrl, title, body }, right: { … }, divider }
 */
const SplitScreenScene: React.FC<{ wide: boolean; section: StoryboardSection }> = ({ wide, section }) => {
  const { enter, out } = useSceneFade();
  const cfg = section.config ?? {};
  const stage = wide ? STAGE_LANDSCAPE : STAGE_PORTRAIT;
  const panels = ["left", "right"].map((side) => {
    const raw = cfg[side];
    return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  });
  // Paysage : deux colonnes ; portrait : deux bandes empilées.
  const row = wide;

  return (
    <SceneBackdrop>
      <AbsoluteFill style={{ opacity: out, flexDirection: row ? "row" : "column" }}>
        {panels.map((panel, i) => {
          const img = assetUrl(str(panel, "imageUrl") ?? str(panel, "image"));
          const title = str(panel, "title");
          const bodyText = str(panel, "body") ?? str(panel, "subtitle");
          const dir = i === 0 ? -1 : 1;
          const shift = interpolate(enter, [0, 1], [dir * stage.width * 0.06, 0]);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "flex-end",
                transform: row ? `translateX(${shift}px)` : `translateY(${shift}px)`,
              }}
            >
              {img ? (
                <Img
                  src={img}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: `scale(${interpolate(enter, [0, 1], [1.1, 1.01])})`,
                  }}
                />
              ) : null}
              <AbsoluteFill
                style={{
                  background: `linear-gradient(to top, ${alpha("night", 0.92)} 12%, ${alpha("night", 0.28)} 62%)`,
                }}
              />
              <div
                style={{
                  position: "relative",
                  padding: stage.width * 0.045,
                  display: "flex",
                  flexDirection: "column",
                  gap: stage.width * 0.012,
                }}
              >
                {title && (
                  <span
                    style={{
                      fontFamily: displayFont,
                      fontSize: wide ? size.h3 : size.h4,
                      fontWeight: weight.bold,
                      lineHeight: 1.1,
                      color: palette.cream,
                    }}
                  >
                    {title}
                  </span>
                )}
                <GoldRule width={interpolate(enter, [0, 1], [0, stage.width * 0.05])} stageWidth={stage.width} />
                {bodyText && (
                  <span
                    style={{
                      fontFamily: bodyFont,
                      fontSize: size.caption,
                      lineHeight: 1.4,
                      color: alpha("cream", 0.85),
                      maxWidth: stage.width * (row ? 0.4 : 0.8),
                    }}
                  >
                    {bodyText}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {/* Ligne de partage dorée, dessinée depuis le centre. */}
        <div
          style={{
            position: "absolute",
            left: row ? "50%" : 0,
            top: row ? 0 : "50%",
            width: row ? Math.max(3, stage.width * 0.0022) : "100%",
            height: row ? "100%" : Math.max(3, stage.width * 0.0022),
            background: palette.gold,
            opacity: 0.9,
            transform: row
              ? `translateX(-50%) scaleY(${enter})`
              : `translateY(-50%) scaleX(${enter})`,
            boxShadow: `0 0 ${Math.round(stage.width * 0.014)}px ${alpha("gold", 0.5)}`,
          }}
        />
      </AbsoluteFill>
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
    case "counter":
      return <CounterScene wide={wide} section={section} />;
    case "map_reveal":
      return <MapRevealScene wide={wide} section={section} />;
    case "split_screen":
      return <SplitScreenScene wide={wide} section={section} />;
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
