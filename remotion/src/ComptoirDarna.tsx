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

const FPS = 30;
export const COMPTOIR_TOTAL_FRAMES = 17 * FPS; // 510

// Scene durations
const S1 = 90;   // 0-3s   Hook
const S2 = 120;  // 3-7s   Dîner spectacle & gastronomie
const S3 = 120;  // 7-11s  Horaires
const S4 = 90;   // 11-14s Avis 18,45/20
const S5 = 90;   // 14-17s CTA Install

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// ── Scene 1 — Hook ───────────────────────────────────────────────────────────
const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleY = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 90 } });
  const hookOp = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const fade = useFadeInOut(S1, 8, 14);

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="comptoir/clip1.mp4" />
      <Veil opacity={0.6} />
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
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: COLORS.gold,
            opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" }),
            marginBottom: 22,
          }}
        >
          Marrakech · Hivernage
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 78,
            lineHeight: 1.02,
            transform: `translateY(${interpolate(titleY, [0, 1], [40, 0])}px)`,
            opacity: titleY,
            textShadow: "0 4px 24px rgba(0,0,0,0.55)",
          }}
        >
          Comptoir Darna
          <br />
          <span style={{ color: COLORS.gold, fontWeight: 600 }}>Patio &amp; Club</span>
        </div>
        <div
          style={{
            marginTop: 32,
            fontFamily: body,
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: 34,
            lineHeight: 1.3,
            opacity: hookOp,
            maxWidth: 600,
            color: COLORS.cream,
          }}
        >
          « Club iconique &amp; nuits sans limites — vibrez au rythme des DJ et live shows jusqu'à l'aube. »
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 2 — Dîner spectacle & gastronomie ──────────────────────────────────
const SceneDinerSpectacle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S2, 14, 16);

  const lines = [
    { label: "DÎNER", delay: 6 },
    { label: "SPECTACLE", delay: 20 },
    { label: "&", delay: 34 },
    { label: "GASTRONOMIE", delay: 46 },
  ];

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="comptoir/clip2.mp4" />
      <Veil opacity={0.65} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "0 60px",
          textAlign: "center",
        }}
      >
        {lines.map((l, i) => {
          const s = spring({ frame: frame - l.delay, fps, config: { damping: 16, stiffness: 110 } });
          const isAccent = l.label === "&";
          return (
            <div
              key={i}
              style={{
                fontFamily: display,
                fontWeight: isAccent ? 300 : 700,
                fontStyle: isAccent ? "italic" : "normal",
                fontSize: isAccent ? 70 : 92,
                lineHeight: 1.04,
                color: isAccent ? COLORS.gold : COLORS.cream,
                opacity: s,
                transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px) scale(${interpolate(s, [0, 1], [0.92, 1])})`,
                letterSpacing: isAccent ? 0 : 2,
                textShadow: "0 4px 24px rgba(0,0,0,0.6)",
              }}
            >
              {l.label}
            </div>
          );
        })}
        <div
          style={{
            marginTop: 36,
            fontFamily: body,
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: COLORS.gold,
            opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Une expérience signature
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 3 — Horaires ───────────────────────────────────────────────────────
const SceneHoraires: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S3, 14, 16);
  const cardS = spring({ frame: frame - 10, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="comptoir/clip3.mp4" />
      <Veil opacity={0.7} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "0 60px",
        }}
      >
        <div
          style={{
            fontFamily: body,
            fontSize: 24,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: COLORS.gold,
            marginBottom: 26,
            opacity: interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Ouvert tous les soirs
        </div>

        <div
          style={{
            transform: `scale(${interpolate(cardS, [0, 1], [0.85, 1])})`,
            opacity: cardS,
            background: "rgba(14,11,8,0.65)",
            border: `1px solid ${COLORS.gold}`,
            borderRadius: 18,
            padding: "44px 56px",
            textAlign: "center",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            style={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: 96,
              color: COLORS.cream,
              lineHeight: 1,
              letterSpacing: 2,
            }}
          >
            19:00
            <span style={{ color: COLORS.gold, margin: "0 18px", fontWeight: 300 }}>→</span>
            03:00
          </div>
          <div
            style={{
              marginTop: 18,
              fontFamily: body,
              fontSize: 28,
              color: COLORS.bone,
              letterSpacing: 2,
            }}
          >
            du lundi au dimanche
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            fontFamily: body,
            fontStyle: "italic",
            fontSize: 28,
            color: COLORS.cream,
            opacity: interpolate(frame, [55, 75], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Réservez votre soirée
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 4 — Badge avis ─────────────────────────────────────────────────────
const SceneAvis: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S4, 12, 14);
  const badge = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 110 } });
  const ratingNum = interpolate(frame, [14, 50], [0, 18.45], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="comptoir/clip1.mp4" startFrom={300} />
      <Veil opacity={0.72} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 60px" }}>
        <div
          style={{
            fontFamily: body,
            fontSize: 24,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: COLORS.gold,
            marginBottom: 36,
            opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Plébiscité par les voyageurs
        </div>

        <div
          style={{
            transform: `scale(${interpolate(badge, [0, 1], [0.6, 1])})`,
            opacity: badge,
            width: 460,
            height: 460,
            borderRadius: "50%",
            background: `conic-gradient(${COLORS.gold} 0deg, ${COLORS.terracotta} 360deg)`,
            padding: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: COLORS.night,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${COLORS.gold}`,
            }}
          >
            <div
              style={{
                fontFamily: display,
                fontWeight: 700,
                fontSize: 150,
                lineHeight: 1,
                color: COLORS.cream,
              }}
            >
              {ratingNum.toFixed(2).replace(".", ",")}
            </div>
            <div
              style={{
                fontFamily: body,
                fontSize: 36,
                color: COLORS.gold,
                letterSpacing: 4,
                marginTop: 4,
              }}
            >
              / 20
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            fontFamily: display,
            fontWeight: 600,
            fontSize: 44,
            color: COLORS.cream,
            opacity: interpolate(frame, [30, 55], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          53&nbsp;221 avis
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: body,
            fontSize: 22,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: COLORS.bone,
            opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          clients vérifiés
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
      {/* subtle ambient back layer */}
      <AbsoluteFill style={{ opacity: 0.18 }}>
        <BgVideo src="comptoir/clip2.mp4" startFrom={150} />
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
        {/* App icon — square w/ terracotta accent */}
        <div
          style={{
            transform: `scale(${interpolate(iconS, [0, 1], [0.5, 1]) * pulse})`,
            opacity: iconS,
            width: 240,
            height: 240,
            borderRadius: 52,
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
            marginTop: 56,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 64,
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
            fontSize: 28,
            color: COLORS.bone,
            opacity: interpolate(frame, [24, 44], [0, 1], { extrapolateRight: "clamp" }),
            maxWidth: 700,
          }}
        >
          Le Maroc, autrement — à portée de main.
        </div>

        {/* CTA button */}
        <div
          style={{
            marginTop: 56,
            transform: `scale(${interpolate(btnS, [0, 1], [0.85, 1])})`,
            opacity: btnS,
            padding: "22px 48px",
            background: COLORS.terracotta,
            borderRadius: 999,
            fontFamily: body,
            fontWeight: 700,
            fontSize: 30,
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
            bottom: 90,
            left: 0,
            right: 0,
            fontFamily: body,
            fontSize: 22,
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

// ── Main ─────────────────────────────────────────────────────────────────────
export const ComptoirDarna: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: COLORS.night }}>
      <Sequence from={from} durationInFrames={S1}>
        <SceneHook />
      </Sequence>
      {(from += S1, null)}
      <Sequence from={from} durationInFrames={S2}>
        <SceneDinerSpectacle />
      </Sequence>
      {(from += S2, null)}
      <Sequence from={from} durationInFrames={S3}>
        <SceneHoraires />
      </Sequence>
      {(from += S3, null)}
      <Sequence from={from} durationInFrames={S4}>
        <SceneAvis />
      </Sequence>
      {(from += S4, null)}
      <Sequence from={from} durationInFrames={S5}>
        <SceneInstall />
      </Sequence>
    </AbsoluteFill>
  );
};
