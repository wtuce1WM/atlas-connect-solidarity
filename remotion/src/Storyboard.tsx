import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { assetUrl } from "./lib/assetUrl";
import { palette, alpha, display, body, size, weight } from "./tokens";
import { PromoLogo } from "./promo/PromoLogo";
import { resolveStoryboardIcon } from "./icons/registry";
import {
  EffectsContext,
  FeedEffectsOverlay,
  FeedMotionBlurWrapper,
  SectionTransitionWrapper,
  SimpleFadesOverlay,
  audioFadeVolume,
  kenBurnsTransform,
  mergeEffects,
  type FeedEffectsConfig,
} from "./effects/FeedEffects";

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
  | "icon_grid"
  | "svg_flow"
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
  /** Effets de motion design du montage (grade global). Absent = aucun effet. */
  effects?: FeedEffectsConfig | null;
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
  effects: null,
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

/** Résolution partagée (voir `lib/assetUrl`) : une seule source de vérité. */

const str = (cfg: Record<string, unknown> | null | undefined, key: string) => {
  const v = cfg?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

/* ------------------------------------------------------------------ fond média partagé */

/**
 * Certaines scènes (accroche, texte, compteur, outro, carte, écran partagé)
 * peuvent recevoir un fond média : SOIT une suite d'images (jusqu'à 30), SOIT
 * une vidéo — jamais les deux. Quand un fond média est actif, le dégradé de
 * `SceneBackdrop` devient un simple voile lisible au lieu d'un aplat opaque.
 */
const BgMediaContext = React.createContext(false);

const bgImagesOf = (cfg: Record<string, unknown> | null | undefined): string[] =>
  Array.isArray(cfg?.bgImages)
    ? (cfg!.bgImages as unknown[]).filter((v): v is string => typeof v === "string" && !!v.trim()).slice(0, 30)
    : [];

const bgVideoOf = (cfg: Record<string, unknown> | null | undefined) => str(cfg, "bgVideoUrl");

/** Extension vidéo reconnue : sert à choisir Img ou OffthreadVideo dans une liste mixte. */
export const isVideoAsset = (url: string) => /\.(mp4|m4v|mov|webm|ogv)(\?|#|$)/i.test(url);

/**
 * Playlist de fond d'une scène : liste ordonnée mixte (images ET vidéos, 30 max).
 * Compatibilité descendante : `bgImages` puis `bgVideoUrl` si `bgMedia` est absent.
 */
const bgMediaOf = (cfg: Record<string, unknown> | null | undefined): string[] => {
  const mixed = Array.isArray(cfg?.bgMedia)
    ? (cfg!.bgMedia as unknown[]).filter((v): v is string => typeof v === "string" && !!v.trim())
    : [];
  if (mixed.length) return mixed.slice(0, 30);
  const images = bgImagesOf(cfg);
  if (images.length) return images;
  const video = bgVideoOf(cfg);
  return video ? [video] : [];
};

const hasBgMedia = (section: StoryboardSection) => {
  const cfg = section.config ?? {};
  const mode = str(cfg, "bgMode");
  if (!mode || mode === "none") return false;
  return bgMediaOf(cfg).length > 0;
};

/* ------------------------------------------------------------------ voix off par étape */

/**
 * Voix off d'une étape : le back-office génère un MP3 (ElevenLabs) et le stocke
 * dans le bucket `video-assets`, puis persiste l'URL dans `config.voice`.
 * Le moteur ne synthétise jamais à la volée — le rendu reste déterministe.
 * `duckBg` atténue le son du média de l'étape pendant la voix (0 = silence).
 */
export type StoryboardVoice = { url: string; gain: number; duckBg: number; delaySec: number };

/** Borne une valeur numérique libre (config voix off) entre min et max. */
const clampNum = (v: unknown, fallback: number, min: number, max: number) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

export const voiceOf = (cfg: Record<string, unknown> | null | undefined): StoryboardVoice | null => {
  const raw = cfg?.voice as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== "object") return null;
  const url = typeof raw.url === "string" && raw.url.trim() ? raw.url.trim() : null;
  if (!url) return null;
  if (raw.enabled === false) return null;
  return {
    url,
    gain: clampNum(raw.gain, 1, 0, 2),
    duckBg: clampNum(raw.duckBg, 0.15, 0, 1),
    delaySec: clampNum(raw.delaySec, 0, 0, 30),
  };
};

/** Multiplicateur de volume appliqué aux médias de la scène (1 = pas de voix). */
const VoiceDuckContext = React.createContext(1);



/** Un plan de la playlist : image en Ken Burns ou vidéo muette, en fondu. */
const MediaShot: React.FC<{ src: string; frames: number; seed?: number }> = ({ src, frames, seed = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const effects = React.useContext(EffectsContext);
  const fadeFrames = Math.min(Math.round(fps * 0.4), Math.max(1, Math.round(frames / 3)));
  const fade = Math.min(
    interpolate(frame, [0, fadeFrames], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(frame, [frames - fadeFrames, frames], [1, 0], { extrapolateLeft: "clamp" }),
  );
  const resolved = assetUrl(src);
  if (!resolved) return null;
  const cover: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    opacity: fade,
  };
  if (isVideoAsset(src)) return <OffthreadVideo src={resolved} muted style={cover} />;
  // Ken Burns paramétrable ; sans réglage, on garde le léger zoom historique.
  const kb = kenBurnsTransform(effects, frame, frames, seed);
  const scale = interpolate(frame, [0, frames], [1.02, 1.1], { extrapolateRight: "clamp" });
  return <Img src={resolved} style={{ ...cover, transform: kb ?? `scale(${scale})` }} />;
};


/** Couche de fond média (playlist mixte images/vidéos), derrière la scène. */
const SceneMediaBackdrop: React.FC<{ section: StoryboardSection }> = ({ section }) => {
  const { durationInFrames } = useVideoConfig();
  const media = bgMediaOf(section.config ?? {});
  if (!media.length) return null;

  const per = Math.max(1, Math.floor(durationInFrames / media.length));

  return (
    <AbsoluteFill>
      {media.map((src, i) => {
        const from = i * per;
        const frames = i === media.length - 1 ? Math.max(1, durationInFrames - from) : per;
        return (
          <Sequence key={`${src}-${i}`} from={from} durationInFrames={frames} layout="none">
            <MediaShot src={src} frames={frames} seed={i} />
          </Sequence>
        );
      })}
      <AbsoluteFill style={{ background: alpha("night", 0.45) }} />
    </AbsoluteFill>
  );
};


/* ------------------------------------------------------------------ scènes */

/** Fond commun : nuit 1WM + halo braise, aucun aplat plat. */
const SceneBackdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const overMedia = React.useContext(BgMediaContext);
  return (
    <AbsoluteFill
      style={{
        background: overMedia
          ? `linear-gradient(to top, ${alpha("night", 0.72)} 0%, ${alpha("night", 0.18)} 55%, ${alpha("night", 0.4)} 100%)`
          : `radial-gradient(circle at 50% 42%, ${palette.emberDeep}, ${palette.night})`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/* --------------------------------------------------- typographie GLOBALE
 * SOURCE UNIQUE des textes de toutes les scènes : sur-titre (kicker),
 * titre et corps. Modifier ici = modifier partout (accroche, vidéo, photos,
 * compteur, carte, écran partagé, texte, outro). Aucune scène ne redéfinit
 * sa police, sa taille ni son ombre.
 */

const useOnMediaShadow = () => {
  const overMedia = React.useContext(BgMediaContext);
  return overMedia ? `0 4px 24px ${alpha("night", 0.85)}` : undefined;
};

export const SceneKicker: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span
    style={{
      fontFamily: bodyFont,
      fontSize: size.caption,
      letterSpacing: 3,
      textTransform: "uppercase",
      color: palette.gold,
      textShadow: useOnMediaShadow(),
      ...style,
    }}
  >
    {children}
  </span>
);

export const SceneTitle: React.FC<{
  children: React.ReactNode;
  wide: boolean;
  /** 1 = titre principal, 2 = titre de scène, 3 = titre secondaire */
  level?: 1 | 2 | 3;
  style?: React.CSSProperties;
}> = ({ children, wide, level = 2, style }) => {
  const scale =
    level === 1 ? (wide ? size.h1 : size.h2) : level === 2 ? (wide ? size.h2 : size.h3) : wide ? size.h3 : size.h4;
  return (
    <span
      style={{
        fontFamily: displayFont,
        fontSize: scale,
        fontWeight: weight.bold,
        lineHeight: 1.1,
        color: palette.cream,
        textShadow: useOnMediaShadow(),
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export const SceneBody: React.FC<{
  children: React.ReactNode;
  small?: boolean;
  style?: React.CSSProperties;
}> = ({ children, small, style }) => (
  <span
    style={{
      fontFamily: bodyFont,
      fontSize: small ? size.caption : size.lead,
      lineHeight: 1.42,
      color: alpha("cream", 0.85),
      textShadow: useOnMediaShadow(),
      ...style,
    }}
  >
    {children}
  </span>
);




/**
 * `logo_merge` — signature de partenariat.
 * Paysage : les deux logos convergent horizontalement, trait d'or entre eux.
 * Portrait : ils convergent verticalement (empilés) — c'est la seule façon de
 * ne jamais rogner deux logos larges sur les bords d'un cadre 1080 de large.
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
  // Zone utile : 86 % de la largeur du cadre, halo du logo inclus (PromoLogo
  // déborde de ~45 % de sa taille). Le logo ne peut donc jamais être rogné.
  const safeWidth = stage.width * 0.86;
  const logoSize = wide ? Math.min(stage.width * 0.22, safeWidth * 0.4) : safeWidth * 0.55;
  const spread = wide ? stage.width * 0.19 : stage.height * 0.14;

  // Convergence : ressort d'entrée puis rapprochement vers le centre.
  const enter = spring({ frame, fps, config: { damping: 22, stiffness: 80, mass: 1.1 } });
  const merge = spring({
    frame: frame - Math.round(fps * 0.9),
    fps,
    config: { damping: 26, stiffness: 60, mass: 1.2 },
  });
  const offset = interpolate(enter, [0, 1], [spread * 1.8, spread]) - interpolate(merge, [0, 1], [0, spread * 0.34]);

  // Trait d'or : se dessine quand la convergence est engagée.
  const ruleLength = interpolate(merge, [0, 1], [0, wide ? stage.width * 0.1 : safeWidth * 0.34]);
  const ruleThickness = Math.max(3, stage.width * 0.0028);
  const captionIn = interpolate(frame, [Math.round(fps * 1.6), Math.round(fps * 2.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const out = interpolate(frame, [durationInFrames - Math.round(fps * 0.5), durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  const shift = (dir: -1 | 1) =>
    wide ? `translateX(${dir * offset}px)` : `translateY(${dir * offset}px)`;

  return (
    <SceneBackdrop>
      <div
        style={{
          opacity: out,
          width: safeWidth,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: stage.width * 0.05,
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: wide ? "row" : "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ transform: shift(-1), display: "flex", justifyContent: "center", width: logoSize }}>
            {brandLogoUrl ? (
              <PromoLogo src={brandLogoUrl} size={logoSize} />
            ) : (
              <SceneTitle wide={wide}>1WM</SceneTitle>
            )}
          </div>
          <div
            style={{
              width: wide ? ruleLength : ruleThickness,
              height: wide ? ruleThickness : ruleLength,
              background: palette.gold,
              borderRadius: 999,
              boxShadow: `0 0 ${Math.round(stage.width * 0.02)}px ${alpha("gold", 0.55)}`,
            }}
          />
          <div style={{ transform: shift(1), display: "flex", justifyContent: "center", width: logoSize }}>
            {partner ? (
              <PromoLogo src={partner} size={logoSize} delay={4} />
            ) : (
              <SceneTitle wide={wide} style={{ color: alpha("cream", 0.5), fontWeight: weight.medium }}>
                ?
              </SceneTitle>
            )}
          </div>
        </div>
        {caption && (
          <SceneKicker
            style={{
              opacity: captionIn,
              transform: `translateY(${interpolate(captionIn, [0, 1], [10, 0])}px)`,
              fontSize: size.lead,
              letterSpacing: 2,
              textAlign: "center",
            }}
          >
            {caption}
          </SceneKicker>
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

/**
 * Décompte animé — SOURCE UNIQUE partagée par la scène `counter` et les
 * battements `metric` de `svg_flow`. Toute autre implémentation d'un compteur
 * serait une seconde source de vérité pour le même effet.
 */
export const countUpText = ({
  frame,
  fps,
  to,
  from = 0,
  delaySec = 0,
  decimals = 0,
  rollSec = 1.4,
}: {
  frame: number;
  fps: number;
  to: number;
  from?: number;
  delaySec?: number;
  decimals?: number;
  rollSec?: number;
}) => {
  const roll = spring({
    frame: frame - Math.round(fps * delaySec),
    fps,
    durationInFrames: Math.max(1, Math.round(fps * rollSec)),
    config: { damping: 200 },
  });
  return frNumber(from + (to - from) * roll, decimals);
};

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
        {kicker && <SceneKicker>{kicker}</SceneKicker>}
        {title && (
          <SceneTitle wide={wide} level={3} style={{ fontWeight: weight.semibold, lineHeight: 1.12 }}>
            {title}
          </SceneTitle>
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
            const shown = countUpText({ frame, fps, delaySec: 0.25 + i * 0.22, to: target, decimals });
            const label = typeof it.label === "string" ? it.label : "";
            const prefix = typeof it.prefix === "string" ? it.prefix : "";
            const suffix = typeof it.suffix === "string" ? it.suffix : "";
            return (
              <div
                key={i}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: stage.width * 0.008 }}
              >
                <SceneTitle
                  wide={wide}
                  style={{ fontSize: valueSize, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
                >
                  {prefix}
                  {shown}
                  {suffix}
                </SceneTitle>
                {label && (
                  <SceneBody
                    small
                    style={{ lineHeight: 1.3, maxWidth: stage.width * (cols >= 3 ? 0.2 : 0.3) }}
                  >
                    {label}
                  </SceneBody>
                )}
              </div>
            );
          })}
        </div>
        <GoldRule width={interpolate(enter, [0, 1], [0, stage.width * 0.08])} stageWidth={stage.width} />
        {bodyText && <SceneBody>{bodyText}</SceneBody>}

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
                <SceneBody
                  small
                  style={{
                    fontSize: size.label,
                    color: palette.cream,
                    whiteSpace: "nowrap",
                    textShadow: `0 2px 12px ${alpha("night", 0.9)}`,
                  }}
                >
                  {label}
                </SceneBody>
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
            {kicker && <SceneKicker>{kicker}</SceneKicker>}
            {title && (
              <SceneTitle wide={wide} style={{ textShadow: `0 4px 24px ${alpha("night", 0.85)}` }}>
                {title}
              </SceneTitle>
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
                  <SceneTitle wide={wide} level={3}>
                    {title}
                  </SceneTitle>
                )}
                <GoldRule width={interpolate(enter, [0, 1], [0, stage.width * 0.05])} stageWidth={stage.width} />
                {bodyText && (
                  <SceneBody small style={{ lineHeight: 1.4, maxWidth: stage.width * (row ? 0.4 : 0.8) }}>
                    {bodyText}
                  </SceneBody>
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
 * `hook` — accroche d'ouverture : logo de la fiche, accroche, ville.
 * config : { title, subtitle, kicker } — repli sur les props fiche.
 */
const HookScene: React.FC<{ wide: boolean; p: StoryboardProps; section: StoryboardSection }> = ({ wide, p, section }) => {
  const { enter, out } = useSceneFade();
  const cfg = section.config ?? {};
  const stage = wide ? STAGE_LANDSCAPE : STAGE_PORTRAIT;
  const logo = assetUrl(p.logoUrl ?? p.brandLogoUrl);
  const title = str(cfg, "title") ?? str(cfg, "hook") ?? p.hook ?? p.businessName ?? "";
  const subtitle = str(cfg, "subtitle") ?? p.city ?? null;

  return (
    <SceneBackdrop>
      <div
        style={{
          opacity: out * enter,
          transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
          width: stage.width * 0.8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: stage.width * 0.03,
          textAlign: "center",
        }}
      >
        {logo && <PromoLogo src={logo} size={stage.width * (wide ? 0.16 : 0.28)} />}
        {title && (
          <SceneTitle wide={wide} level={1}>
            {title}
          </SceneTitle>
        )}
        <GoldRule width={interpolate(enter, [0, 1], [0, stage.width * 0.09])} stageWidth={stage.width} />
        {subtitle && (
          <SceneBody style={{ letterSpacing: 3, textTransform: "uppercase", color: alpha("cream", 0.82) }}>
            {subtitle}
          </SceneBody>
        )}

      </div>
    </SceneBackdrop>
  );
};

/**
 * `video` — une ou plusieurs vidéos plein cadre, montées à la suite dans la
 * durée de la section (parts égales).
 * config : { assetUrls: string[] } — repli : { assetUrl | videoUrl } puis la
 * vidéo de la fiche. `sound` conserve la piste audio.
 */
const VideoScene: React.FC<{ wide: boolean; p: StoryboardProps; section: StoryboardSection }> = ({ wide, p, section }) => {
  const { enter, out } = useSceneFade();
  const { durationInFrames } = useVideoConfig();
  const cfg = section.config ?? {};
  const stage = wide ? STAGE_LANDSCAPE : STAGE_PORTRAIT;
  const many = Array.isArray(cfg.assetUrls)
    ? (cfg.assetUrls as unknown[]).filter((v): v is string => typeof v === "string" && !!v.trim())
    : [];
  const single = str(cfg, "assetUrl") ?? str(cfg, "videoUrl") ?? p.videoUrl ?? null;
  const clips = (many.length ? many : single ? [single] : []).slice(0, 30);
  const title = str(cfg, "title");
  const duck = React.useContext(VoiceDuckContext);
  const muted = !cfg.sound;
  /** Bornes de lecture par URL, saisies dans « Médias du montage ». */
  const trims = (cfg.assetTrims && typeof cfg.assetTrims === "object" ? cfg.assetTrims : {}) as Record<
    string,
    { start?: number; end?: number }
  >;
  const { fps } = useVideoConfig();

  /**
   * Répartition des clips : quand des bornes (start/end) sont définies, chaque
   * clip occupe exactement sa durée utile (end - start) au lieu d'une part
   * égale — sinon un clip court laissait du noir dans son créneau.
   * Si la somme dépasse la durée de la section, tout est réduit au prorata.
   */
  const slots = React.useMemo(() => {
    const n = clips.length;
    if (n === 0) return [] as { from: number; frames: number }[];
    const equal = Math.max(1, Math.floor(durationInFrames / n));
    const weights = clips.map((raw) => {
      const t = trims[raw] ?? {};
      const s = t.start && t.start > 0 ? t.start : 0;
      const e = t.end && t.end > s ? t.end : 0;
      return e > s ? Math.max(1, Math.round((e - s) * fps)) : equal;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    const scale = total > durationInFrames ? durationInFrames / total : 1;
    const out: { from: number; frames: number }[] = [];
    let cursor = 0;
    weights.forEach((w, i) => {
      const isLast = i === n - 1;
      let frames = Math.max(1, Math.round(w * scale));
      if (cursor + frames > durationInFrames) frames = Math.max(1, durationInFrames - cursor);
      if (isLast && scale < 1) frames = Math.max(1, durationInFrames - cursor);
      out.push({ from: cursor, frames });
      cursor += frames;
    });
    return out;
  }, [clips, trims, durationInFrames, fps]);

  return (
    <SceneBackdrop>
      <AbsoluteFill style={{ opacity: out }}>
        {clips.map((raw, i) => {
          const src = assetUrl(raw);
          const slot = slots[i];
          if (!src || !slot) return null;
          const t = trims[raw] ?? {};
          const startFrom = t.start && t.start > 0 ? Math.round(t.start * fps) : undefined;
          const endAtRaw = t.end && t.end > 0 ? Math.round(t.end * fps) : undefined;
          const endAt = endAtRaw != null && endAtRaw > (startFrom ?? 0) + 1 ? endAtRaw : undefined;
          return (
            <Sequence key={`${raw}-${i}`} from={slot.from} durationInFrames={slot.frames} layout="none">
              <OffthreadVideo
                src={src}
                muted={muted}
                volume={muted ? 0 : duck}
                startFrom={startFrom}
                endAt={endAt}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Sequence>
          );
        })}


        <AbsoluteFill
          style={{
            background: `linear-gradient(to top, ${alpha("night", 0.78)} 4%, ${alpha("night", 0)} 45%)`,
          }}
        />
        {title && (
          <div
            style={{
              position: "absolute",
              left: stage.width * 0.07,
              bottom: stage.height * 0.09,
              maxWidth: stage.width * 0.72,
              display: "flex",
              flexDirection: "column",
              gap: stage.width * 0.012,
              opacity: enter,
              transform: `translateY(${interpolate(enter, [0, 1], [22, 0])}px)`,
            }}
          >
            <SceneTitle wide={wide} level={3} style={{ textShadow: `0 4px 24px ${alpha("night", 0.85)}` }}>
              {title}
            </SceneTitle>
            <GoldRule width={interpolate(enter, [0, 1], [0, stage.width * 0.06])} stageWidth={stage.width} />
          </div>
        )}
      </AbsoluteFill>
    </SceneBackdrop>
  );
};


/**
 * `photos` — jusqu'à 30 médias plein cadre (images en Ken Burns ET vidéos),
 * la durée de la section étant partagée à parts égales. Les URLs explicites
 * (`media`, sinon `images`) priment sur les photos de la fiche.
 */
const PhotosScene: React.FC<{ wide: boolean; p: StoryboardProps; section: StoryboardSection }> = ({ wide, p, section }) => {
  const { durationInFrames } = useVideoConfig();
  const cfg = section.config ?? {};
  const stage = wide ? STAGE_LANDSCAPE : STAGE_PORTRAIT;
  const pick = (key: string) =>
    Array.isArray(cfg[key])
      ? (cfg[key] as unknown[]).filter((v): v is string => typeof v === "string" && !!v.trim())
      : [];
  const explicit = pick("media").length ? pick("media") : pick("images");
  const count = Math.min(30, Math.max(1, num(cfg, "count") ?? 30));
  const pool = (explicit.length ? explicit : (p.photos ?? []).filter(Boolean)).slice(0, count);
  const title = str(cfg, "title");

  const shots = pool.length ? pool : [];
  const per = shots.length ? Math.max(1, Math.floor(durationInFrames / shots.length)) : durationInFrames;

  return (
    <SceneBackdrop>
      <AbsoluteFill>
        {shots.map((src, i) => {
          const from = i * per;
          const frames = i === shots.length - 1 ? Math.max(1, durationInFrames - from) : per;
          return (
            <Sequence key={`${src}-${i}`} from={from} durationInFrames={frames} layout="none">
              <MediaShot src={src} frames={frames} seed={i} />
            </Sequence>
          );
        })}
        <AbsoluteFill
          style={{ background: `linear-gradient(to top, ${alpha("night", 0.7)} 6%, ${alpha("night", 0)} 48%)` }}
        />
        {title && (
          <SceneTitle
            wide={wide}
            level={3}
            style={{
              position: "absolute",
              left: stage.width * 0.07,
              bottom: stage.height * 0.09,
              maxWidth: stage.width * 0.75,
              textShadow: `0 4px 24px ${alpha("night", 0.85)}`,
            }}
          >
            {title}
          </SceneTitle>
        )}
      </AbsoluteFill>
    </SceneBackdrop>
  );
};


/**
 * `text_overlay` — texte riche (H1/H2/p/strong/em, emojis) sur fond nuit.
 * config : { html }
 */
const TextOverlayScene: React.FC<{ wide: boolean; section: StoryboardSection }> = ({ wide, section }) => {
  const { enter, out } = useSceneFade();
  const cfg = section.config ?? {};
  const stage = wide ? STAGE_LANDSCAPE : STAGE_PORTRAIT;
  const html = str(cfg, "html") ?? str(cfg, "text") ?? "";
  // Balises tolérées uniquement : le reste est neutralisé (pas de script/style).
  const safe = html.replace(/<\s*\/?\s*(?!\/?(h1|h2|h3|p|br|strong|b|em|i|ul|ol|li|span)\b)[^>]*>/gi, "");

  return (
    <SceneBackdrop>
      <div
        style={{
          opacity: out * enter,
          transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
          width: stage.width * 0.78,
          textAlign: "center",
          fontFamily: bodyFont,
          fontSize: wide ? size.lead : size.h4,
          lineHeight: 1.4,
          color: palette.cream,
        }}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </SceneBackdrop>
  );
};

/**
 * `outro` — signature de fin : logo 1WM, tagline, ville. Pas de nom d'établissement.
 * config : { tagline, city }
 */
const OutroScene: React.FC<{ wide: boolean; p: StoryboardProps; section: StoryboardSection }> = ({ wide, p, section }) => {
  const { enter, out } = useSceneFade(0.6);
  const cfg = section.config ?? {};
  const stage = wide ? STAGE_LANDSCAPE : STAGE_PORTRAIT;
  const logo = assetUrl(p.brandLogoUrl ?? p.logoUrl);
  const tagline = str(cfg, "tagline");
  const city = str(cfg, "city") ?? p.city ?? null;

  return (
    <SceneBackdrop>
      <div
        style={{
          opacity: out * enter,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: stage.width * 0.03,
          textAlign: "center",
        }}
      >
        {logo && <PromoLogo src={logo} size={stage.width * (wide ? 0.18 : 0.32)} />}
        <GoldRule width={interpolate(enter, [0, 1], [0, stage.width * 0.1])} stageWidth={stage.width} />
        {tagline && (
          <SceneTitle wide={wide} level={3} style={{ fontWeight: weight.semibold }}>
            {tagline}
          </SceneTitle>
        )}
        {city && <SceneKicker style={{ letterSpacing: 4 }}>{city}</SceneKicker>}

      </div>
    </SceneBackdrop>
  );
};

/**
 * `icon_grid` — icônes vectorielles (bibliothèque curatée) avec Titre et/ou Texte.
 * config : {
 *   kicker, title,
 *   display: "grid" | "beats",           // grille simultanée ou temps découpé
 *   items: [{ icon: "tb:TbBed", title?, text? }]  // 1 à 8
 * }
 * En mode `beats`, la durée de l'étape est découpée à parts égales entre les
 * items : chaque battement affiche une icône plein cadre avec son message.
 */
const IconMark: React.FC<{ iconKey: string | null; boxSize: number; delay?: number }> = ({
  iconKey,
  boxSize,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const Icon = resolveStoryboardIcon(iconKey);
  const pop = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 110, mass: 0.9 } });
  const scale = interpolate(pop, [0, 1], [0.6, 1]);
  return (
    <div
      style={{
        width: boxSize,
        height: boxSize,
        borderRadius: boxSize * 0.28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: alpha("cream", 0.06),
        border: `${Math.max(2, boxSize * 0.012)}px solid ${alpha("gold", 0.45)}`,
        boxShadow: `0 ${boxSize * 0.06}px ${boxSize * 0.2}px ${alpha("night", 0.55)}`,
        transform: `scale(${scale})`,
        opacity: pop,
      }}
    >
      {Icon ? (
        <Icon size={Math.round(boxSize * 0.52)} color={palette.gold} />
      ) : (
        <div style={{ width: boxSize * 0.3, height: boxSize * 0.3, borderRadius: 999, background: alpha("gold", 0.3) }} />
      )}
    </div>
  );
};

const IconGridScene: React.FC<{ wide: boolean; section: StoryboardSection }> = ({ wide, section }) => {
  const { fps, enter, out, durationInFrames, frame } = useSceneFade();
  const cfg = section.config ?? {};
  const stage = wide ? STAGE_LANDSCAPE : STAGE_PORTRAIT;
  const items = list(cfg, "items").slice(0, 8);
  const kicker = str(cfg, "kicker") ?? section.label ?? null;
  const title = str(cfg, "title");
  const beats = str(cfg, "display") === "beats";

  if (!items.length) return <PlaceholderScene wide={wide} section={section} />;

  /* ---- mode battements : un item après l'autre, plein cadre ---- */
  if (beats) {
    const per = Math.max(1, Math.floor(durationInFrames / items.length));
    const index = Math.min(items.length - 1, Math.floor(frame / per));
    const localFrame = frame - index * per;
    const item = items[index];
    const boxSize = wide ? stage.height * 0.3 : stage.width * 0.42;
    const beatIn = spring({ frame: localFrame, fps, config: { damping: 22, stiffness: 90, mass: 1 } });

    return (
      <SceneBackdrop>
        <div
          style={{
            opacity: out * beatIn,
            transform: `translateY(${interpolate(beatIn, [0, 1], [26, 0])}px)`,
            width: stage.width * 0.76,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: stage.width * 0.028,
          }}
        >
          {kicker && <SceneKicker>{kicker}</SceneKicker>}
          <IconMark iconKey={typeof item.icon === "string" ? item.icon : null} boxSize={boxSize} />
          {typeof item.title === "string" && item.title.trim() && (
            <SceneTitle wide={wide} level={2}>
              {item.title}
            </SceneTitle>
          )}
          {typeof item.text === "string" && item.text.trim() && <SceneBody>{item.text}</SceneBody>}
          <div style={{ display: "flex", gap: stage.width * 0.008 }}>
            {items.map((_, i) => (
              <div
                key={i}
                style={{
                  width: stage.width * (i === index ? 0.03 : 0.012),
                  height: Math.max(3, stage.width * 0.0028),
                  borderRadius: 999,
                  background: i === index ? palette.gold : alpha("cream", 0.3),
                }}
              />
            ))}
          </div>
        </div>
      </SceneBackdrop>
    );
  }

  /* ---- mode grille : entrée en cascade, tout reste à l'écran ---- */
  const cols = wide ? Math.min(items.length, 4) : Math.min(items.length, 2);
  const boxSize = wide ? stage.width * (cols >= 4 ? 0.105 : 0.13) : stage.width * (cols >= 2 ? 0.2 : 0.3);

  return (
    <SceneBackdrop>
      <div
        style={{
          opacity: out,
          width: stage.width * 0.82,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: stage.width * 0.03,
        }}
      >
        {kicker && <SceneKicker style={{ opacity: enter }}>{kicker}</SceneKicker>}
        {title && (
          <SceneTitle wide={wide} level={2} style={{ opacity: enter }}>
            {title}
          </SceneTitle>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: stage.width * 0.03,
            width: "100%",
          }}
        >
          {items.map((item, i) => {
            const delay = Math.round(fps * 0.14 * i);
            const cardIn = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 90, mass: 1 } });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: stage.width * 0.012,
                  opacity: cardIn,
                  transform: `translateY(${interpolate(cardIn, [0, 1], [22, 0])}px)`,
                }}
              >
                <IconMark iconKey={typeof item.icon === "string" ? item.icon : null} boxSize={boxSize} delay={delay} />
                {typeof item.title === "string" && item.title.trim() && (
                  <SceneTitle wide={wide} level={3} style={{ fontSize: size.lead, fontWeight: weight.semibold }}>
                    {item.title}
                  </SceneTitle>
                )}
                {typeof item.text === "string" && item.text.trim() && <SceneBody small>{item.text}</SceneBody>}
              </div>
            );
          })}
        </div>
      </div>
    </SceneBackdrop>
  );
};

/**
 * `svg_flow` — animation SVG déclarative : nœuds à icônes, liaisons tracées,
 * et une TIMELINE INTERNE (battements) pour titres, hook, sous-hook et chiffres.
 *
 * config : {
 *   kicker, title, body,
 *   layout: "chain" | "hub" | "loop",   // enchaînement, étoile, circuit fermé
 *   speed: "slow" | "normal" | "fast",  // vitesse du tracé (mode auto)
 *   strokeColor?: string,               // défaut : or de la charte
 *   nodes: [{ id?, icon: "tb:TbBed", title?, text? }]   // 2 à 8
 *   timing?: "auto" | "sequence" | "manual",
 *   beats?: [{
 *     type: "node" | "link" | "title" | "hook" | "subhook" | "metric",
 *     ref?: number|string,       // nœud (1..n ou id) / liaison (1..n)
 *     at?: number, atPct?: number,   // début en secondes OU en % de l'étape
 *     dur?: number,                  // durée d'affichage (s)
 *     text?, label?, value?, from?, to?, prefix?, suffix?, decimals?,
 *     in?: "fade" | "pop" | "slide-up" | "draw" | "count",
 *     anchor?: "center" | "top" | "bottom" | "node:<ref>",
 *   }]
 * }
 *
 * Sans `beats`, le comportement historique est conservé : chaque nœud est révélé
 * après le tracé de la liaison qui y mène, puis tout reste à l'écran.
 * Avec `beats`, la durée de l'étape (3 à 30 s) est pilotée par la timeline :
 * `sequence` répartit les battements à parts égales, `manual` respecte les `at`.
 * Aucun CSS animé : tout est piloté au frame.
 */
const FLOW_SPEEDS: Record<string, number> = { slow: 1.4, normal: 1, fast: 0.62 };

/** Durées minimales de lisibilité (s) — un texte trop court est illisible au montage. */
const BEAT_MIN_SEC: Record<string, number> = { title: 1.2, hook: 1.2, subhook: 1.2, metric: 1.5 };
const BEAT_IN_SEC = 0.4;

const numOf = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

type ResolvedBeat = {
  raw: Record<string, unknown>;
  type: string;
  start: number;
  dur: number;
  end: number;
};

/** Traduit les battements déclarés en frames, en % ou à parts égales. */
const resolveFlowBeats = (
  raw: Record<string, unknown>[],
  fps: number,
  durationInFrames: number,
  manual: boolean,
): ResolvedBeat[] => {
  if (!raw.length) return [];
  const per = durationInFrames / raw.length;
  return raw.map((b, i) => {
    const type = typeof b.type === "string" ? b.type : "title";
    const atSec = numOf(b.at);
    const atPct = numOf(b.atPct);
    const startRaw = manual
      ? atSec != null
        ? atSec * fps
        : atPct != null
          ? (atPct / 100) * durationInFrames
          : i * per
      : i * per;
    const minSec = BEAT_MIN_SEC[type] ?? BEAT_IN_SEC;
    const durSec = Math.max(minSec, numOf(b.dur) ?? Math.max(minSec, per / fps));
    const start = Math.max(0, Math.round(startRaw));
    const dur = Math.max(1, Math.round(durSec * fps));
    return { raw: b, type, start, dur, end: Math.min(durationInFrames, start + dur) };
  });
};

/** Opacité/transform d'un battement : entrée courte, maintien, sortie courte. */
const beatMotion = (
  frame: number,
  fps: number,
  beat: ResolvedBeat,
  kind: "fade" | "pop" | "slide-up",
) => {
  const inF = Math.round(fps * BEAT_IN_SEC);
  const outF = Math.round(fps * 0.3);
  const opacity =
    interpolate(frame, [beat.start, beat.start + inF], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) *
    interpolate(frame, [beat.end - outF, beat.end], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const p = interpolate(frame, [beat.start, beat.start + inF], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const transform =
    kind === "pop"
      ? `scale(${interpolate(p, [0, 1], [0.72, 1])})`
      : kind === "slide-up"
        ? `translateY(${interpolate(p, [0, 1], [30, 0])}px)`
        : "none";
  return { opacity, transform };
};

const SvgFlowScene: React.FC<{ wide: boolean; section: StoryboardSection }> = ({ wide, section }) => {
  const { fps, out, durationInFrames, frame } = useSceneFade();
  const cfg = section.config ?? {};
  const stage = wide ? STAGE_LANDSCAPE : STAGE_PORTRAIT;
  const nodes = list(cfg, "nodes").slice(0, 8);
  const kicker = str(cfg, "kicker") ?? section.label ?? null;
  const title = str(cfg, "title");
  const bodyText = str(cfg, "body");
  const layoutRaw = str(cfg, "layout");
  const layout = layoutRaw === "hub" || layoutRaw === "loop" ? layoutRaw : "chain";
  const stroke = str(cfg, "strokeColor") ?? palette.gold;
  const speed = FLOW_SPEEDS[str(cfg, "speed") ?? "normal"] ?? 1;

  if (nodes.length < 2) return <PlaceholderScene wide={wide} section={section} />;

  /* --- géométrie du graphe dans le repère de la scène (viewBox 1000 x 1000) --- */
  const boardW = wide ? stage.width * 0.72 : stage.width * 0.86;
  const boardH = wide ? stage.height * 0.52 : stage.height * 0.42;
  const cx = 500;
  const cy = 500;
  const radius = 340;

  const points = nodes.map((_, i) => {
    if (layout === "hub") {
      if (i === 0) return { x: cx, y: cy };
      const a = (-Math.PI / 2) + ((i - 1) / Math.max(1, nodes.length - 1)) * Math.PI * 2;
      return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
    }
    if (layout === "loop") {
      const a = (-Math.PI / 2) + (i / nodes.length) * Math.PI * 2;
      return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
    }
    // chaîne : ligne unique (paysage) ou serpentin sur 2 colonnes (portrait)
    if (wide || nodes.length <= 3) {
      const step = nodes.length > 1 ? 820 / (nodes.length - 1) : 0;
      return { x: 90 + step * i, y: cy };
    }
    const rows = Math.ceil(nodes.length / 2);
    const row = Math.floor(i / 2);
    const col = row % 2 === 0 ? i % 2 : 1 - (i % 2);
    return { x: 250 + col * 500, y: 140 + (row * 720) / Math.max(1, rows - 1 || 1) };
  });

  /** Liaisons : chaîne/loop = successives ; hub = centre → satellites. */
  const links: Array<[number, number]> =
    layout === "hub"
      ? nodes.slice(1).map((_, i) => [0, i + 1] as [number, number])
      : nodes.slice(1).map((_, i) => [i, i + 1] as [number, number]);
  if (layout === "loop" && nodes.length > 2) links.push([nodes.length - 1, 0]);

  /* --- timing automatique : intro, puis un battement par liaison, puis maintien --- */
  const intro = Math.round(fps * 0.5);
  const drawFrames = Math.max(6, Math.round(fps * 0.55 * speed));
  const holdFrames = Math.max(4, Math.round(fps * 0.25 * speed));
  const beat = drawFrames + holdFrames;
  const needed = intro + links.length * beat;
  const scale = needed > durationInFrames ? (durationInFrames - intro) / Math.max(1, links.length * beat) : 1;
  const beatF = Math.max(4, beat * scale);
  const drawF = Math.max(3, drawFrames * scale);

  /* --- timeline interne (battements déclarés en back-office) --- */
  const timing = str(cfg, "timing");
  const rawBeats = list(cfg, "beats");
  const beats = resolveFlowBeats(rawBeats, fps, durationInFrames, timing === "manual");

  /** Index de nœud pour une référence de battement (1..n ou `id`). */
  const nodeIndexOf = (ref: unknown): number | null => {
    if (typeof ref === "number" && ref >= 1 && ref <= nodes.length) return ref - 1;
    if (typeof ref === "string" && ref.trim()) {
      const byId = nodes.findIndex((n) => typeof n.id === "string" && n.id === ref.trim());
      if (byId >= 0) return byId;
      const n = Number(ref);
      if (Number.isFinite(n) && n >= 1 && n <= nodes.length) return n - 1;
    }
    return null;
  };

  const nodeBeat = (i: number) => beats.find((b) => b.type === "node" && nodeIndexOf(b.raw.ref) === i) ?? null;
  const linkBeat = (i: number) => {
    const idx = i + 1;
    return (
      beats.find((b) => {
        if (b.type !== "link") return false;
        const n = numOf(b.raw.ref);
        return n != null && Math.round(n) === idx;
      }) ?? null
    );
  };

  const nodeAppear = (i: number) => {
    const declared = nodeBeat(i);
    if (declared) return declared.start;
    if (i === 0) return 0;
    const linkIndex = links.findIndex(([, to]) => to === i);
    if (linkIndex < 0) return intro;
    return intro + linkIndex * beatF + drawF * 0.75;
  };

  const boxSize = (wide ? stage.height : stage.width) * (nodes.length > 5 ? 0.11 : 0.15);
  const px = (v: number) => (v / 1000) * boardW;
  const py = (v: number) => (v / 1000) * boardH;

  /** Rendu du contenu d'un battement de texte / chiffre. */
  const beatContent = (b: ResolvedBeat) => {
    const text = typeof b.raw.text === "string" ? b.raw.text : "";
    if (b.type === "metric") {
      const to = numOf(b.raw.value) ?? numOf(b.raw.to) ?? 0;
      const from = numOf(b.raw.from) ?? 0;
      const decimals = Math.min(2, Math.max(0, numOf(b.raw.decimals) ?? 0));
      const prefix = typeof b.raw.prefix === "string" ? b.raw.prefix : "";
      const suffix = typeof b.raw.suffix === "string" ? b.raw.suffix : "";
      const label = typeof b.raw.label === "string" ? b.raw.label : text;
      const shown = countUpText({
        frame: frame - b.start,
        fps,
        to,
        from,
        decimals,
        rollSec: Math.min(1.6, Math.max(0.8, b.dur / fps - 0.3)),
      });
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: stage.width * 0.008 }}>
          <SceneTitle
            wide={wide}
            level={1}
            style={{ lineHeight: 1, fontVariantNumeric: "tabular-nums", color: palette.gold }}
          >
            {prefix}
            {shown}
            {suffix}
          </SceneTitle>
          {label && <SceneBody small>{label}</SceneBody>}
        </div>
      );
    }
    if (!text) return null;
    if (b.type === "hook") {
      return (
        <SceneTitle wide={wide} level={1}>
          {text}
        </SceneTitle>
      );
    }
    if (b.type === "subhook") return <SceneBody>{text}</SceneBody>;
    return (
      <SceneTitle wide={wide} level={2}>
        {text}
      </SceneTitle>
    );
  };

  const overlayBeats = beats.filter((b) => ["title", "hook", "subhook", "metric"].includes(b.type));
  const anchorOf = (b: ResolvedBeat) => (typeof b.raw.anchor === "string" ? b.raw.anchor : "center");
  const inOf = (b: ResolvedBeat): "fade" | "pop" | "slide-up" => {
    const v = typeof b.raw.in === "string" ? b.raw.in : null;
    if (v === "pop" || v === "count") return "pop";
    if (v === "slide-up") return "slide-up";
    return v === "fade" ? "fade" : b.type === "metric" ? "pop" : "slide-up";
  };

  /** Battements ancrés sur un nœud : rendus dans le repère du graphe. */
  const nodeAnchored = overlayBeats
    .map((b) => {
      const a = anchorOf(b);
      if (!a.startsWith("node:")) return null;
      const idx = nodeIndexOf(a.slice(5).trim());
      return idx == null ? null : { b, idx };
    })
    .filter(Boolean) as Array<{ b: ResolvedBeat; idx: number }>;

  const stageAnchored = overlayBeats.filter((b) => !anchorOf(b).startsWith("node:"));
  const zone = (b: ResolvedBeat) => {
    const a = anchorOf(b);
    return a === "top" ? "flex-start" : a === "bottom" ? "flex-end" : "center";
  };

  return (
    <SceneBackdrop>
      <div
        style={{
          opacity: out,
          width: stage.width * 0.9,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: stage.width * 0.02,
        }}
      >
        {kicker && <SceneKicker>{kicker}</SceneKicker>}
        {title && (
          <SceneTitle wide={wide} level={2}>
            {title}
          </SceneTitle>
        )}

        <div style={{ position: "relative", width: boardW, height: boardH }}>
          <svg
            width={boardW}
            height={boardH}
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0 }}
          >
            {links.map(([from, to], i) => {
              const a = points[from];
              const b = points[to];
              const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
              const declared = linkBeat(i);
              const start = declared ? declared.start : intro + i * beatF;
              const span = declared ? declared.dur : drawF;
              const progress = interpolate(frame, [start, start + span], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <g key={i}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={alpha("cream", 0.12)}
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={stroke}
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeDasharray={len}
                    strokeDashoffset={len * (1 - progress)}
                  />
                </g>
              );
            })}
          </svg>

          {nodes.map((node, i) => {
            const p = points[i];
            const delay = nodeAppear(i);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: px(p.x),
                  top: py(p.y),
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: stage.width * 0.008,
                  width: boxSize * 2.2,
                }}
              >
                <IconMark iconKey={typeof node.icon === "string" ? node.icon : null} boxSize={boxSize} delay={delay} />
                {typeof node.title === "string" && node.title.trim() && (
                  <SceneTitle wide={wide} level={3} style={{ fontSize: size.lead, fontWeight: weight.semibold }}>
                    {node.title}
                  </SceneTitle>
                )}
                {typeof node.text === "string" && node.text.trim() && <SceneBody small>{node.text}</SceneBody>}
              </div>
            );
          })}

          {/* Battements ancrés sur un nœud (chiffre, %, mini-titre) */}
          {nodeAnchored.map(({ b, idx }, i) => {
            const p = points[idx];
            const m = beatMotion(frame, fps, b, inOf(b));
            if (m.opacity <= 0.001) return null;
            return (
              <div
                key={`na-${i}`}
                style={{
                  position: "absolute",
                  left: px(p.x),
                  top: py(p.y) + boxSize * 0.95,
                  transform: `translate(-50%, 0) ${m.transform}`,
                  opacity: m.opacity,
                  width: boxSize * 3,
                  textAlign: "center",
                }}
              >
                {beatContent(b)}
              </div>
            );
          })}
        </div>

        {bodyText && <SceneBody>{bodyText}</SceneBody>}
      </div>

      {/* Battements ancrés au cadre : haut / centre / bas */}
      {stageAnchored.map((b, i) => {
        const m = beatMotion(frame, fps, b, inOf(b));
        if (m.opacity <= 0.001) return null;
        return (
          <AbsoluteFill
            key={`sa-${i}`}
            style={{
              justifyContent: zone(b),
              alignItems: "center",
              padding: stage.width * 0.06,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                opacity: m.opacity * out,
                transform: m.transform,
                width: stage.width * 0.8,
                textAlign: "center",
              }}
            >
              {beatContent(b)}
            </div>
          </AbsoluteFill>
        );
      })}
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

const SectionSceneInner: React.FC<{ wide: boolean; p: StoryboardProps; section: StoryboardSection }> = ({
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
    case "icon_grid":
      return <IconGridScene wide={wide} section={section} />;
    case "svg_flow":
      return <SvgFlowScene wide={wide} section={section} />;
    case "hook":
      return <HookScene wide={wide} p={p} section={section} />;
    case "video":
      return <VideoScene wide={wide} p={p} section={section} />;
    case "photos":
      return <PhotosScene wide={wide} p={p} section={section} />;
    case "text_overlay":
      return <TextOverlayScene wide={wide} section={section} />;
    case "outro":
      return <OutroScene wide={wide} p={p} section={section} />;
    default:
      return <PlaceholderScene wide={wide} section={section} />;
  }
};

/**
 * Enveloppe commune : si la section porte un fond média (images OU vidéo),
 * il est dessiné derrière la scène et le voile de `SceneBackdrop` s'adapte.
 */
const SectionScene: React.FC<{ wide: boolean; p: StoryboardProps; section: StoryboardSection }> = ({
  wide,
  p,
  section,
}) => {
  const media = hasBgMedia(section);
  if (!media) return <SectionSceneInner wide={wide} p={p} section={section} />;
  return (
    <AbsoluteFill>
      <SceneMediaBackdrop section={section} />
      <BgMediaContext.Provider value>
        <SectionSceneInner wide={wide} p={p} section={section} />
      </BgMediaContext.Provider>
    </AbsoluteFill>
  );
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

  const totalFrames = Math.max(1, cursor);
  const boundaries = plans.slice(1).map((pl) => pl.from);

  return (
    <AbsoluteFill style={{ background: palette.night }}>
      <AbsoluteFill>
        <EffectsContext.Provider value={p.effects ?? null}>
        <FeedMotionBlurWrapper effects={p.effects ?? null}>
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
          {plans.map((plan, index) => {
            // Héritage : `config.effects` de l'étape surcharge seulement les
            // accents du montage (voir STEP_EFFECT_KEYS).
            const stepEffects = mergeEffects(
              p.effects ?? null,
              (plan.section.config?.effects as Partial<FeedEffectsConfig> | undefined) ?? null,
            );
            const voice = voiceOf(plan.section.config ?? {});
            const voiceSrc = voice ? assetUrl(voice.url) : null;
            const voiceFrom = voice ? Math.round(voice.delaySec * STORYBOARD_FPS) : 0;
            const voiceFrames = Math.max(1, plan.frames - voiceFrom);
            return (
              <Sequence key={plan.key} from={plan.from} durationInFrames={plan.frames} layout="none">
                <SectionTransitionWrapper effects={p.effects ?? null} index={index}>
                  <VoiceDuckContext.Provider value={voiceSrc ? voice!.duckBg : 1}>
                    <SectionScene wide={wide} p={p} section={plan.section} />
                  </VoiceDuckContext.Provider>
                </SectionTransitionWrapper>
                {stepEffects && <FeedEffectsOverlay effects={{ ...stepEffects, motionBlur: false }} />}
                {voiceSrc && (
                  <Sequence
                    from={Math.min(voiceFrom, Math.max(0, plan.frames - 1))}
                    durationInFrames={voiceFrames}
                    layout="none"
                  >
                    <Audio src={voiceSrc} volume={audioFadeVolume(p.effects ?? null, voice!.gain, voiceFrames)} />
                  </Sequence>
                )}
              </Sequence>
            );
          })}

          <SimpleFadesOverlay effects={p.effects ?? null} boundaries={boundaries} totalFrames={totalFrames} />
        </div>
        </FeedMotionBlurWrapper>
        </EffectsContext.Provider>
      </AbsoluteFill>
    </AbsoluteFill>
  );

};
