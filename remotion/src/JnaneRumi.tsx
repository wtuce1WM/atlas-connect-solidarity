import React from "react";
import {
  AbsoluteFill,
  Series,
  Video,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { display, body, COLORS } from "./theme";

// Jnane Rumi — 17s vertical 720x1280
const S1 = 60;   // 0-2s    Intro nom
const S2 = 135;  // 2-6.5s  Hook part 1
const S3 = 120;  // 6.5-10.5s Hook part 2
const S4 = 105;  // 10.5-14s Avis 18.40/20 · 72 avis
const S5 = 90;   // 14-17s  CTA Install

export const JNANE_TOTAL_FRAMES = S1 + S2 + S3 + S4 + S5; // 510 = 17s

const Veil: React.FC<{ opacity?: number }> = ({ opacity = 0.55 }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, rgba(0,0,0,${opacity * 0.7}) 0%, rgba(0,0,0,${opacity * 0.35}) 45%, rgba(0,0,0,${opacity * 0.95}) 100%)`,
    }}
  />
);

const BgVideo: React.FC<{ src: string; startFrom?: number }> = ({ src, startFrom = 0 }) => (
  <AbsoluteFill>
    <Video
      src={staticFile(src)}
      muted
      startFrom={startFrom}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  </AbsoluteFill>
);

const useFadeInOut = (dur: number, fadeIn = 12, fadeOut = 12) => {
  const f = useCurrentFrame();
  return interpolate(f, [0, fadeIn, dur - fadeOut, dur], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

// ── Scene 1 — Intro nom ──────────────────────────────────────────────────────
const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleY = spring({ frame: frame - 6, fps, config: { damping: 18, stiffness: 90 } });
  const fade = useFadeInOut(S1, 6, 12);

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="jnane/jnane_so0.mp4" />
      <Veil opacity={0.55} />
      <AbsoluteFill
        style={{
          padding: "120px 70px",
          justifyContent: "flex-end",
          alignItems: "flex-start",
          color: COLORS.cream,
        }}
      >
        <div
          style={{
            fontFamily: body,
            fontSize: 26,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: COLORS.gold,
            opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" }),
            marginBottom: 22,
          }}
        >
          Marrakech · Palmeraie
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 88,
            lineHeight: 1,
            transform: `translateY(${interpolate(titleY, [0, 1], [40, 0])}px)`,
            opacity: titleY,
            textShadow: "0 4px 24px rgba(0,0,0,0.55)",
          }}
        >
          Jnane
          <br />
          <span style={{ color: COLORS.gold, fontWeight: 600, fontStyle: "italic" }}>Rumi</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 2 — Hook part 1 ────────────────────────────────────────────────────
const SceneHook1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S2, 14, 16);
  const titleS = spring({ frame: frame - 10, fps, config: { damping: 16, stiffness: 100 } });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="jnane/jnane_so1.mp4" startFrom={15} />
      <Veil opacity={0.7} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "0 70px",
        }}
      >
        <div
          style={{
            fontFamily: body,
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: COLORS.gold,
            marginBottom: 32,
            opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Une parenthèse rare
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontStyle: "italic",
            fontSize: 54,
            lineHeight: 1.18,
            color: COLORS.cream,
            transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
            opacity: titleS,
            textShadow: "0 4px 24px rgba(0,0,0,0.7)",
            maxWidth: 600,
          }}
        >
          « Des jardins luxuriants, l'art omniprésent… »
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 3 — Hook part 2 ────────────────────────────────────────────────────
const SceneHook2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S3, 14, 16);
  const titleS = spring({ frame: frame - 10, fps, config: { damping: 16, stiffness: 100 } });
  const subS = spring({ frame: frame - 40, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="jnane/jnane_so2.mp4" />
      <Veil opacity={0.72} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "0 70px",
        }}
      >
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontStyle: "italic",
            fontSize: 52,
            lineHeight: 1.18,
            color: COLORS.cream,
            transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
            opacity: titleS,
            textShadow: "0 4px 24px rgba(0,0,0,0.7)",
            maxWidth: 600,
          }}
        >
          « …un service irréprochable. »
        </div>
        <div
          style={{
            marginTop: 36,
            fontFamily: display,
            fontWeight: 600,
            fontSize: 38,
            lineHeight: 1.2,
            color: COLORS.gold,
            opacity: subS,
            transform: `translateY(${interpolate(subS, [0, 1], [16, 0])}px)`,
            maxWidth: 560,
            textShadow: "0 3px 14px rgba(0,0,0,0.6)",
          }}
        >
          Un séjour suspendu.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 4 — Avis ───────────────────────────────────────────────────────────
const SceneAvis: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S4, 12, 14);
  const badge = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 110 } });
  const ratingNum = interpolate(frame, [14, 50], [0, 18.4], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="jnane/jnane_so3.mp4" />
      <Veil opacity={0.6} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 50px" }}>
        <div
          style={{
            fontFamily: body,
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: COLORS.gold,
            marginBottom: 32,
            opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Plébiscité par les voyageurs
        </div>

        <div
          style={{
            transform: `translateY(${interpolate(badge, [0, 1], [24, 0])}px) scale(${interpolate(badge, [0, 1], [0.85, 1])})`,
            opacity: badge,
            position: "relative",
            overflow: "hidden",
            borderRadius: 36,
            background: "rgba(0,0,0,0.42)",
            padding: "28px 44px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            color: "#FFFFFF",
            boxShadow:
              "inset 0 1px 0 0 rgba(255,255,255,0.35), inset 0 -1px 0 0 rgba(0,0,0,0.25), 0 8px 28px -4px rgba(0,0,0,0.55)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 36,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 45%, rgba(255,255,255,0.05) 100%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="50" height="50" viewBox="0 0 24 24" fill={COLORS.gold} style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.45))" }}>
              <path d="M12 2l2.95 6.36L22 9.27l-5.5 4.73L18.18 22 12 18.27 5.82 22 7.5 14 2 9.27l7.05-.91L12 2z" />
            </svg>
            <span
              style={{
                fontFamily: display,
                fontWeight: 800,
                fontSize: 90,
                lineHeight: 1,
                color: COLORS.gold,
                letterSpacing: -1,
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              }}
            >
              {ratingNum.toFixed(2)}
            </span>
            <span
              style={{
                fontFamily: display,
                fontWeight: 600,
                fontSize: 38,
                color: "rgba(255,255,255,0.85)",
                letterSpacing: 1,
              }}
            >
              /20
            </span>
          </div>
          <span
            style={{
              position: "relative",
              fontFamily: display,
              fontWeight: 700,
              fontSize: 28,
              color: "#FFFFFF",
              letterSpacing: 0.5,
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            72 avis
          </span>
        </div>

        <div
          style={{
            marginTop: 38,
            fontFamily: body,
            fontStyle: "italic",
            fontSize: 26,
            color: COLORS.cream,
            opacity: interpolate(frame, [40, 65], [0, 1], { extrapolateRight: "clamp" }),
            textAlign: "center",
            maxWidth: 560,
          }}
        >
          L'art de vivre à la ferme, au cœur de la Palmeraie
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 5 — Install CTA ────────────────────────────────────────────────────
const SceneInstall: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const iconS = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 110 } });
  const btnS = spring({ frame: frame - 28, fps, config: { damping: 13, stiffness: 120 } });
  const pulse = 1 + Math.sin(frame / 6) * 0.015;

  return (
    <AbsoluteFill
      style={{
        opacity: fadeIn,
        background: `radial-gradient(ellipse at center top, ${COLORS.ink} 0%, ${COLORS.night} 70%)`,
      }}
    >
      <AbsoluteFill style={{ opacity: 0.18 }}>
        <BgVideo src="jnane/jnane_so4.mp4" />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(14,11,8,0.85) 0%, rgba(14,11,8,0.7) 50%, rgba(14,11,8,0.95) 100%)`,
        }}
      />

      <AbsoluteFill
        style={{
          padding: "120px 70px",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            transform: `scale(${interpolate(iconS, [0, 1], [0.5, 1]) * pulse})`,
            opacity: iconS,
            width: 220,
            height: 220,
            borderRadius: 48,
            background: COLORS.terracotta,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 24px 60px rgba(192,79,23,0.45), 0 0 0 1px rgba(255,255,255,0.08) inset`,
            overflow: "hidden",
          }}
        >
          <Img
            src={staticFile("images/app-icon-1wm.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <div
          style={{
            marginTop: 48,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 60,
            lineHeight: 1.05,
            color: COLORS.cream,
            opacity: interpolate(frame, [18, 38], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Installez l'App
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: body,
            fontSize: 26,
            color: COLORS.bone,
            opacity: interpolate(frame, [24, 44], [0, 1], { extrapolateRight: "clamp" }),
            maxWidth: 620,
          }}
        >
          Le Maroc, autrement — à portée de main.
        </div>

        <div
          style={{
            marginTop: 48,
            transform: `scale(${interpolate(btnS, [0, 1], [0.85, 1])})`,
            opacity: btnS,
            padding: "20px 44px",
            background: COLORS.terracotta,
            borderRadius: 999,
            fontFamily: body,
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: 1,
            color: "#FFFFFF",
            boxShadow: "0 12px 30px rgba(192,79,23,0.5)",
          }}
        >
          Installer maintenant
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: 0,
            right: 0,
            fontFamily: body,
            fontSize: 20,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: COLORS.gold,
            opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          oneworldmorocco.com/install
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const JnaneRumi: React.FC = () => (
  <AbsoluteFill style={{ background: COLORS.night }}>
    <Series>
      <Series.Sequence durationInFrames={S1}><SceneIntro /></Series.Sequence>
      <Series.Sequence durationInFrames={S2}><SceneHook1 /></Series.Sequence>
      <Series.Sequence durationInFrames={S3}><SceneHook2 /></Series.Sequence>
      <Series.Sequence durationInFrames={S4}><SceneAvis /></Series.Sequence>
      <Series.Sequence durationInFrames={S5}><SceneInstall /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);
