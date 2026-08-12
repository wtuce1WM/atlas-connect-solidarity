import React from "react";
import { AbsoluteFill, Img, staticFile, interpolate, useCurrentFrame, Easing } from "remotion";

/**
 * Feed vidéo in-app 720x1280 — 6 premiers résultats de /search?q=riad+marrakech&city=Marrakech.
 * Les frames vidéo (JPEG extraits des MP4 internes) sont composées avec les captures
 * réelles de l'UI du slidepanel détourées en alpha (public/feed/chrome*.png).
 */

export const FPS = 25;
const W = 720;
const H = 1280;

const STEP = 75; // 3 s
const SLIDE = 10; // transition swipe
const STEPS = 5; // étapes 1..5 (swipe)
const STEP6_START = STEPS * STEP; // 375
const STEP6_HOLD = 100; // 4 s
const TAP_START = STEP6_START + STEP6_HOLD; // 475
const TAP_DUR = 20;
const OPEN_START = TAP_START + TAP_DUR; // 495
const OPEN_DUR = 12;
const SCROLL_START = OPEN_START + OPEN_DUR; // 507
const HOOK_HOLD = 50; // 2 s d'arrêt sur le hook en haut de l'overlay
const SCROLL_BEGIN = SCROLL_START + HOOK_HOLD; // 557
const SEG_COUNT = 6; // paliers de défilement
const SEG_MOVE = 96; // ~3.8 s de défilement par palier
const SEG_PAUSE = 25; // 1 s d'arrêt à chaque palier
const SCROLL_DUR = SEG_COUNT * (SEG_MOVE + SEG_PAUSE); // 726 (≈29 s)
const TAIL = 25;
export const TOTAL = SCROLL_BEGIN + SCROLL_DUR + TAIL;

const DESC_TOP = 93;
const DESC_VIEW = 1127;
const DESC_TALL = 6756;
const SCROLL_MAX = DESC_TALL - DESC_VIEW;

// Défilement par paliers : mouvement puis léger arrêt, répété SEG_COUNT fois.
const SCROLL_FRAMES: number[] = [];
const SCROLL_VALUES: number[] = [];
for (let i = 0; i < SEG_COUNT; i++) {
  const base = SCROLL_BEGIN + i * (SEG_MOVE + SEG_PAUSE);
  SCROLL_FRAMES.push(base, base + SEG_MOVE);
  SCROLL_VALUES.push((SCROLL_MAX * i) / SEG_COUNT, (SCROLL_MAX * (i + 1)) / SEG_COUNT);
}

const pad = (n: number) => String(n).padStart(4, "0");
const videoFrame = (step: number, i: number, max: number) =>
  staticFile(`feed/frames/v${step}/${pad(Math.min(Math.max(i, 0), max - 1) + 1)}.jpg`);


const Screen: React.FC<{ step: number; localFrame: number; count: number }> = ({
  step,
  localFrame,
  count,
}) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <Img
      src={videoFrame(step, localFrame, count)}
      style={{ width: W, height: H, objectFit: "cover" }}
    />
    <Img
      src={staticFile(`feed/chrome${step}.png`)}
      style={{ position: "absolute", inset: 0, width: W, height: H }}
    />
  </AbsoluteFill>
);

/** Pouce stylisé qui remonte pour illustrer le swipe vertical. */
const SwipeThumb: React.FC<{ progress: number }> = ({ progress }) => {
  const y = interpolate(progress, [0, 1], [990, 430], {
    easing: Easing.bezier(0.32, 0, 0.28, 1),
  });
  const opacity = interpolate(progress, [0, 0.12, 0.78, 1], [0, 1, 1, 0]);
  const press = interpolate(progress, [0, 0.15, 0.85, 1], [0.86, 1, 1, 0.9]);
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      {/* traînée du geste */}
      <div
        style={{
          position: "absolute",
          left: W / 2 - 3,
          top: y,
          width: 6,
          height: interpolate(progress, [0, 1], [0, 520]),
          borderRadius: 6,
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0))",
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
const TapPulse: React.FC<{ progress: number }> = ({ progress }) => {
  const x = W / 2 - 300;
  const y = 1155;
  const scale = interpolate(progress, [0, 1], [0.5, 2.4]);
  const opacity = interpolate(progress, [0, 0.15, 1], [0, 0.85, 0]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: x + 40,
          top: y - 46,
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
          left: x + 40,
          top: y - 46,
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

export const FeedSwipe: React.FC = () => {
  const frame = useCurrentFrame();

  // --- Étapes 1 à 5 : swipe vertical
  if (frame < STEP6_START) {
    const k = Math.min(Math.floor(frame / STEP), STEPS - 1);
    const local = frame - k * STEP;
    const transStart = STEP - SLIDE;
    const inTrans = local >= transStart;
    const t = inTrans
      ? interpolate(local, [transStart, STEP], [0, 1], {
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          extrapolateRight: "clamp",
        })
      : 0;
    const cur = k + 1;
    const next = Math.min(cur + 1, 6);
    const curCount = 95;
    const nextCount = next === 6 ? 525 : 95;
    const swipeProgress = interpolate(local, [45, STEP], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${-t * H}px)` }}>
          <Screen step={cur} localFrame={local} count={curCount} />
        </div>
        {inTrans && (
          <div
            style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - t) * H}px)` }}
          >
            <Screen step={next} localFrame={0} count={nextCount} />
          </div>
        )}
        <SwipeThumb progress={swipeProgress} />
      </AbsoluteFill>
    );
  }

  // --- Étape 6 : Jnane Rumi + ouverture et scroll de la description complète
  const local6 = frame - STEP6_START;
  const base = (
    <Screen step={6} localFrame={local6} count={525} />
  );

  if (frame < TAP_START) {
    return <AbsoluteFill style={{ backgroundColor: "#000" }}>{base}</AbsoluteFill>;
  }

  if (frame < OPEN_START) {
    const p = (frame - TAP_START) / TAP_DUR;
    return (
      <AbsoluteFill style={{ backgroundColor: "#000" }}>
        {base}
        <TapPulse progress={p} />
      </AbsoluteFill>
    );
  }

  const opening = frame < SCROLL_START;
  const openP = opening
    ? interpolate(frame, [OPEN_START, SCROLL_START], [0, 1], {
        easing: Easing.bezier(0.16, 0.84, 0.24, 1),
      })
    : 1;
  const scroll =
    frame <= SCROLL_BEGIN
      ? 0
      : interpolate(frame, SCROLL_FRAMES, SCROLL_VALUES, {
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });


  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {base}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateY(${(1 - openP) * H}px)`,
          opacity: openP,
        }}
      >
        {/* contenu scrollable réel, clippé sur la zone du panneau */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: DESC_TOP,
            width: W,
            height: DESC_VIEW,
            overflow: "hidden",
          }}
        >
          <Img
            src={staticFile("feed/desctall.png")}
            style={{
              position: "absolute",
              left: 0,
              top: -scroll,
              width: W,
              height: DESC_TALL,
            }}
          />
        </div>
        {/* barre d'en-tête de l'overlay (sticky) */}
        <div
          style={{ position: "absolute", left: 0, top: 0, width: W, height: DESC_TOP, overflow: "hidden" }}
        >
          <Img
            src={staticFile("feed/descopen.png")}
            style={{ position: "absolute", left: 0, top: 0, width: W, height: H }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default FeedSwipe;
