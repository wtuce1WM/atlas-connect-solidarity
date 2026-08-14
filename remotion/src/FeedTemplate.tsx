import React from "react";
import { AbsoluteFill, Img, staticFile, interpolate, useCurrentFrame, Easing } from "remotion";
import {
  FeedEffectsOverlay,
  FeedMotionBlurWrapper,
  type FeedEffectsConfig,
} from "./effects/FeedEffects";

/**
 * Template de montage vidéo « feed in-app » entièrement piloté par un manifest.
 *
 * Aucune constante de calibrage n'est codée ici : géométrie, nombre d'étapes,
 * nombre de frames vidéo, hauteur réelle de l'overlay Full Description et
 * positions des sections d'arrêt viennent de public/feed/<slug>/manifest.json,
 * produit automatiquement par remotion/capture/capture_feed.py.
 *
 * Deux formats depuis le même manifest :
 *  - portrait  : le stage natif (viewport de capture, ex. 720x1280)
 *  - landscape : le même stage centré et mis à l'échelle sur une scène 16:9,
 *                sur un fond composé de la frame vidéo courante floutée.
 */

export type FeedStep = {
  index: number;
  name: string;
  chrome: string;
  frameDir: string;
  frameCount: number;
  /** Frames 16:9 plein cadre (montage paysage), si la capture les a produites. */
  wideFrameDir?: string | null;
  wideFrameCount?: number;
};

export type FeedSection = { label: string; top: number };

export type FeedManifest = {
  slug: string;
  base: string;
  label?: string;
  sourceUrl?: string;
  viewport: { width: number; height: number };
  /** Suréchantillonnage de capture (device scale factor). */
  captureScale?: number;
  /** Agrandissement du rendu portrait (720x1280 -> 1080x1920 si 1.5). */
  outputScale?: number;
  fps: number;
  /** Effets optionnels choisis en back-office (aucun par défaut). */
  effects?: FeedEffectsConfig | null;
  steps: FeedStep[];
  detail: {
    step: number;
    open: string;
    tall: string;
    /** Fond de l'overlay seul (scrim + image), sans contenu ni barres. */
    bg?: string | null;

    headerTop?: number;
    headerHeight: number;
    viewTop?: number;
    progressTop?: number;
    viewHeight: number;
    contentHeight: number;
    bottomTop?: number | null;
    bottomHeight?: number;
    tapX?: number;
    tapY?: number;
    sections: FeedSection[];
  } | null;
  timing: {
    stepFrames: number;
    slideFrames: number;
    detailHold: number;
    tapFrames: number;
    openFrames: number;
    hookHold: number;
    firstMove: number;
    sectionMove: number;
    sectionPause: number;
    finalMove: number;
    stopOffset: number;
    tail: number;
  };
};

/** Scène 16:9 de sortie pour le format paysage. */
export const LANDSCAPE = { width: 1920, height: 1080 } as const;

export type FeedTemplateProps = {

  manifestPath: string;
  format: "portrait" | "landscape";
  manifest: FeedManifest | null;
};

export const loadFeedManifest = async (manifestPath: string): Promise<FeedManifest> => {
  const res = await fetch(staticFile(manifestPath));
  if (!res.ok) throw new Error(`Manifest introuvable: ${manifestPath}`);
  return (await res.json()) as FeedManifest;
};

/** Plan de montage déterministe déduit du manifest. */
export const buildPlan = (m: FeedManifest) => {
  const t = m.timing;
  const stepCount = m.steps.length;
  const swipeEnd = (stepCount - 1) * t.stepFrames; // fin des swipes = arrivée sur la dernière étape
  const detail = m.detail;

  if (!detail) {
    const total = swipeEnd + t.stepFrames + t.tail;
    return { stepCount, swipeEnd, detail: null, total, scrollFrames: [], scrollValues: [], tapStart: 0, openStart: 0, scrollStart: 0, scrollBegin: 0 };
  }

  const scrollMax = Math.max(0, detail.contentHeight - detail.viewHeight);
  const tapStart = swipeEnd + t.detailHold;
  const openStart = tapStart + t.tapFrames;
  const scrollStart = openStart + t.openFrames;
  const scrollBegin = scrollStart + t.hookHold;

  const segments: { move: number; pause: number; to: number }[] = detail.sections.map((s, i) => ({
    move: i === 0 ? t.firstMove : t.sectionMove,
    pause: t.sectionPause,
    to: Math.min(Math.max(s.top - t.stopOffset, 0), scrollMax),
  }));
  segments.push({ move: t.finalMove, pause: 0, to: scrollMax });

  const scrollFrames: number[] = [];
  const scrollValues: number[] = [];
  let f = scrollBegin;
  let v = 0;
  for (const s of segments) {
    scrollFrames.push(f, f + s.move);
    scrollValues.push(v, s.to);
    f += s.move + s.pause;
    v = s.to;
  }
  const scrollDur = segments.reduce((a, s) => a + s.move + s.pause, 0);

  return {
    stepCount,
    swipeEnd,
    detail: { ...detail, scrollMax },
    tapStart,
    openStart,
    scrollStart,
    scrollBegin,
    scrollFrames,
    scrollValues,
    total: scrollBegin + scrollDur + t.tail,
  };
};

export const computeFeedFrames = (m: FeedManifest) => Math.round(buildPlan(m).total);

const pad = (n: number) => String(n).padStart(4, "0");

const frameSrc = (m: FeedManifest, step: FeedStep, i: number) =>
  staticFile(`${m.base}/${step.frameDir}/${pad(Math.min(Math.max(i, 0), step.frameCount - 1) + 1)}.jpg`);

const Screen: React.FC<{ m: FeedManifest; step: FeedStep; localFrame: number; noVideo?: boolean }> = ({
  m,
  step,
  localFrame,
  noVideo,
}) => {
  const { width: W, height: H } = m.viewport;
  // Une fiche peut n'avoir aucune vidéo interne (frameCount = 0) : on garde
  // alors le fond noir + la UI détourée, sans tenter de charger 0000.jpg.
  const hasFrames = (step?.frameCount ?? 0) > 0 && !!step?.frameDir;
  return (
    <AbsoluteFill style={{ backgroundColor: noVideo ? "transparent" : "#000" }}>
      {!noVideo && hasFrames && (
        <Img src={frameSrc(m, step, localFrame)} style={{ width: W, height: H, objectFit: "cover" }} />
      )}
      <Img
        src={staticFile(`${m.base}/${step.chrome}`)}
        style={{ position: "absolute", inset: 0, width: W, height: H }}
      />
    </AbsoluteFill>
  );
};


/** Pouce stylisé qui remonte pour illustrer le swipe vertical. */
const SwipeThumb: React.FC<{ W: number; progress: number }> = ({ W, progress }) => {
  const y = interpolate(progress, [0, 1], [990, 430], { easing: Easing.bezier(0.32, 0, 0.28, 1) });
  const opacity = interpolate(progress, [0, 0.12, 0.78, 1], [0, 1, 1, 0]);
  const press = interpolate(progress, [0, 0.15, 0.85, 1], [0.86, 1, 1, 0.9]);
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: W / 2 - 3,
          top: y,
          width: 6,
          height: interpolate(progress, [0, 1], [0, 520]),
          borderRadius: 6,
          background: "linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0))",
          filter: "blur(1px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: W / 2 - 62,
          top: y - 62,
          width: 124,
          height: 124,
          borderRadius: 999,
          border: "3px solid rgba(255,255,255,0.85)",
          background: "rgba(255,255,255,0.16)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
          transform: `scale(${press})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: W / 2 - 20,
          top: y - 20,
          width: 40,
          height: 40,
          borderRadius: 999,
          background: "rgba(255,255,255,0.95)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Tap dans le bas du panneau pour ouvrir la description complète. */
const TapPulse: React.FC<{ x: number; y: number; progress: number }> = ({ x, y, progress }) => {
  const scale = interpolate(progress, [0, 1], [0.5, 2.4]);
  const opacity = interpolate(progress, [0, 0.15, 1], [0, 0.85, 0]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: 92,
          height: 92,
          marginLeft: -46,
          marginTop: -46,
          borderRadius: 999,
          border: "3px solid rgba(255,255,255,0.9)",
          transform: `scale(${scale})`,
          opacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: 60,
          height: 60,
          marginLeft: -30,
          marginTop: -30,
          borderRadius: 999,
          background: "rgba(255,255,255,0.9)",
          opacity: interpolate(progress, [0, 0.25, 0.6], [0, 1, 0]),
        }}
      />
    </AbsoluteFill>
  );
};

/** Contenu du stage natif (dimensions = viewport de capture). */
const Stage: React.FC<{ m: FeedManifest; noVideo?: boolean }> = ({ m, noVideo }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = m.viewport;
  const t = m.timing;
  const plan = buildPlan(m);
  const lastStep = m.steps[m.steps.length - 1];

  // --- Étapes 1..n-1 : swipe vertical
  if (frame < plan.swipeEnd) {
    const k = Math.min(Math.floor(frame / t.stepFrames), plan.stepCount - 2);
    const local = frame - k * t.stepFrames;
    const transStart = t.stepFrames - t.slideFrames;
    const inTrans = local >= transStart;
    const tr = inTrans
      ? interpolate(local, [transStart, t.stepFrames], [0, 1], {
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          extrapolateRight: "clamp",
        })
      : 0;
    const cur = m.steps[k];
    const next = m.steps[Math.min(k + 1, m.steps.length - 1)];
    const swipeProgress = interpolate(local, [transStart - 30, t.stepFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <AbsoluteFill style={{ backgroundColor: noVideo ? "transparent" : "#000", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${-tr * H}px)` }}>
          <Screen m={m} step={cur} localFrame={local} noVideo={noVideo} />
        </div>
        {inTrans && (
          <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - tr) * H}px)` }}>
            <Screen m={m} step={next} localFrame={0} noVideo={noVideo} />
          </div>
        )}
        <SwipeThumb W={W} progress={swipeProgress} />
      </AbsoluteFill>
    );
  }

  // --- Dernière étape : hold, puis ouverture et scroll de la description complète
  const localLast = frame - plan.swipeEnd;
  const base = <Screen m={m} step={lastStep} localFrame={localLast} noVideo={noVideo} />;
  const detail = plan.detail;

  if (!detail) return <AbsoluteFill style={{ backgroundColor: noVideo ? "transparent" : "#000" }}>{base}</AbsoluteFill>;

  if (frame < plan.tapStart) {
    return <AbsoluteFill style={{ backgroundColor: noVideo ? "transparent" : "#000" }}>{base}</AbsoluteFill>;
  }

  if (frame < plan.openStart) {
    const p = (frame - plan.tapStart) / t.tapFrames;
    return (
      <AbsoluteFill style={{ backgroundColor: noVideo ? "transparent" : "#000" }}>
        {base}
        <TapPulse x={detail.tapX ?? W / 2} y={detail.tapY ?? H - 120} progress={p} />
      </AbsoluteFill>
    );
  }

  const openP =
    frame < plan.scrollStart
      ? interpolate(frame, [plan.openStart, plan.scrollStart], [0, 1], {
          easing: Easing.bezier(0.16, 0.84, 0.24, 1),
        })
      : 1;

  const scroll =
    frame <= plan.scrollBegin
      ? 0
      : interpolate(frame, plan.scrollFrames, plan.scrollValues, {
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  const progress = detail.scrollMax > 0
    ? Math.min(1, Math.max(0, scroll / detail.scrollMax))
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: noVideo ? "transparent" : "#000" }}>
      {base}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateY(${(1 - openP) * H}px)`,
          opacity: openP,
        }}
      >
        {/* Fond de l'overlay : sans lui, la fiche (et sa barre liquid glass)
            reste visible à travers les bandes transparentes du contenu. */}
        {detail.bg && (
          <Img
            src={staticFile(`${m.base}/${detail.bg}`)}
            style={{ position: "absolute", left: 0, top: 0, width: W, height: H }}
          />
        )}
        {/* contenu scrollable réel, clippé sur la zone du panneau */}
        <div
          style={{

            position: "absolute",
            left: 0,
            top: detail.viewTop ?? detail.headerHeight,
            width: W,
            height: detail.viewHeight,
            overflow: "hidden",
          }}
        >
          <Img
            src={staticFile(`${m.base}/${detail.tall}`)}
             style={{ position: "absolute", left: 0, top: -scroll, width: W, height: detail.contentHeight }}
          />
        </div>
        {/* barre d'en-tête de l'overlay (sticky) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: detail.headerTop ?? 0,
            width: W,
            height: detail.headerHeight,
            overflow: "hidden",
          }}
        >
          <Img
            src={staticFile(`${m.base}/${detail.open}`)}
             style={{ position: "absolute", left: 0, top: -(detail.headerTop ?? 0), width: W, height: H }}
          />
        </div>
        {/* Progression fixe : elle appartient au header, jamais à l'image
            stitchée qui défile derrière. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: detail.progressTop ?? ((detail.headerTop ?? 0) + detail.headerHeight),
            width: W,
            height: 2,
            backgroundColor: "rgba(255,255,255,0.10)",
            overflow: "hidden",
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              backgroundColor: "#D4AF37",
            }}
          />
        </div>
        {/* Barre fixe basse de Full Description, capturée une seule fois. Elle
            reste hors du contenu stitché afin de ne jamais défiler avec lui. */}
        {detail.bottomTop != null && (detail.bottomHeight ?? 0) > 0 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: detail.bottomTop,
              width: W,
              height: detail.bottomHeight,
              overflow: "hidden",
            }}
          >
            <Img
              src={staticFile(`${m.base}/${detail.open}`)}
              style={{ position: "absolute", left: 0, top: -detail.bottomTop, width: W, height: H }}
            />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

/** Étape et frame locale à un instant donné (même logique que le Stage). */
export const stepAtFrame = (m: FeedManifest, frame: number) => {
  const t = m.timing;
  const plan = buildPlan(m);
  if (frame < plan.swipeEnd) {
    const k = Math.min(Math.floor(frame / t.stepFrames), Math.max(plan.stepCount - 2, 0));
    return { step: m.steps[k], local: frame - k * t.stepFrames };
  }
  return { step: m.steps[m.steps.length - 1], local: frame - plan.swipeEnd };
};

/** Couche vidéo 16:9 plein cadre (frames non recadrées de l'étape courante). */
const WideVideo: React.FC<{ m: FeedManifest }> = ({ m }) => {
  const frame = useCurrentFrame();
  const { step, local } = stepAtFrame(m, frame);
  const dir = step?.wideFrameDir;
  const count = step?.wideFrameCount ?? 0;
  const hasPortrait = (step?.frameCount ?? 0) > 0 && !!step?.frameDir;
  const src =
    dir && count > 0
      ? staticFile(`${m.base}/${dir}/${pad(Math.min(Math.max(local, 0), count - 1) + 1)}.jpg`)
      : hasPortrait
        ? frameSrc(m, step, local)
        : null;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {src && <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
    </AbsoluteFill>
  );

};


/**
 * Couche d'effets ciblée : les accents (tracé SVG) peuvent être limités à la
 * phase « accroche » (défilement) ou « fiche » (détail ouvert). Le grade
 * global (grain, vignette, fuites) reste appliqué en continu.
 */
const ScopedFeedEffects: React.FC<{ m: FeedManifest; effects: FeedEffectsConfig | null }> = ({ m, effects }) => {
  const frame = useCurrentFrame();
  if (!effects) return null;
  const plan = buildPlan(m);
  const inHook = frame < plan.swipeEnd;
  return (
    <FeedEffectsOverlay
      effects={effects}
      phase={inHook ? "hook" : "detail"}
      phaseStartFrame={inHook ? 0 : plan.swipeEnd}
    />
  );
};

export const FeedTemplate: React.FC<FeedTemplateProps> = ({ manifest, format }) => {
  if (!manifest) return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  const m = manifest;
  const { width: W, height: H } = m.viewport;

  const effects = m.effects ?? null;

  if (format !== "landscape") {
    const os = m.outputScale && m.outputScale > 0 ? m.outputScale : 1;
    return (
      <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
        <FeedMotionBlurWrapper effects={effects}>
          {os === 1 ? (
            <Stage m={m} />
          ) : (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: W,
                height: H,
                overflow: "hidden",
                transform: `scale(${os})`,
                transformOrigin: "top left",
              }}
            >
              <Stage m={m} />
            </div>
          )}
        </FeedMotionBlurWrapper>
        <ScopedFeedEffects m={m} effects={effects} />
      </AbsoluteFill>
    );
  }

  const { width: outW, height: outH } = LANDSCAPE;
  const scale = outH / H;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {/* Pillarbox : le stage vertical in-app est centré, bandes noires sur les côtés. */}
      <FeedMotionBlurWrapper effects={effects}>
        <div
          style={{
            position: "absolute",
            left: (outW - W * scale) / 2,
            top: 0,
            width: W,
            height: H,
            overflow: "hidden",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <Stage m={m} />
        </div>
      </FeedMotionBlurWrapper>
      <ScopedFeedEffects m={m} effects={effects} />
    </AbsoluteFill>
  );
};

export default FeedTemplate;
