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

// Scene durations — sort_order de fond : clip_so2 → clip_so8 → clip1 → clip2 → clip3
const S1 = 90;   // 0-3s    Hook                       (clip_so2)
const S2 = 120;  // 3-7s    Dîner spectacle & gastronomie (clip_so8)
const S3 = 120;  // 7-11s   Horaires                   (clip1)
const S4 = 150;  // 11-16s  Avis 18,45/20 (+2s)        (clip2)
const S5 = 90;   // 16-19s  CTA Install                (clip3)

export const COMPTOIR_TOTAL_FRAMES = S1 + S2 + S3 + S4 + S5; // 570 = 19s

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
      <BgVideo src="comptoir/clip_so2.mp4" />
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
      <BgVideo src="comptoir/clip_so8.mp4" />
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
                fontSize: isAccent ? 48 : 64,
                lineHeight: 1.05,
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
            marginTop: 28,
            fontFamily: body,
            fontSize: 22,
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
      <BgVideo src="comptoir/clip1.mp4" />
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
      <BgVideo src="comptoir/clip2.mp4" />
      <Veil opacity={0.6} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 50px" }}>
        <div
          style={{
            fontFamily: body,
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: COLORS.gold,
            marginBottom: 36,
            opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Plébiscité par les voyageurs
        </div>

        {/* Liquid-glass pill — identique au slidepanel /search */}
        <div
          style={{
            transform: `translateY(${interpolate(badge, [0, 1], [24, 0])}px) scale(${interpolate(badge, [0, 1], [0.85, 1])})`,
            opacity: badge,
            position: "relative",
            overflow: "hidden",
            borderRadius: 9999,
            background: "rgba(0,0,0,0.4)",
            padding: "22px 38px",
            display: "flex",
            alignItems: "center",
            gap: 18,
            color: "#FFFFFF",
            boxShadow:
              "inset 0 1px 0 0 rgba(255,255,255,0.35), inset 0 -1px 0 0 rgba(0,0,0,0.25), 0 8px 28px -4px rgba(0,0,0,0.55)",
          }}
        >
          {/* glass highlights */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 9999,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 45%, rgba(255,255,255,0.05) 100%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: "50%",
              borderTopLeftRadius: 9999,
              borderTopRightRadius: 9999,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)",
              filter: "blur(1px)",
              pointerEvents: "none",
            }}
          />

          {/* Star */}
          <svg width="56" height="56" viewBox="0 0 24 24" fill={COLORS.gold} style={{ position: "relative", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.45))" }}>
            <path d="M12 2l2.95 6.36L22 9.27l-5.5 4.73L18.18 22 12 18.27 5.82 22 7.5 14 2 9.27l7.05-.91L12 2z" />
          </svg>

          <div style={{ position: "relative", display: "flex", alignItems: "baseline", gap: 6 }}>
            <span
              style={{
                fontFamily: display,
                fontWeight: 800,
                fontSize: 86,
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

          <div
            style={{
              position: "relative",
              width: 6,
              height: 6,
              borderRadius: 9999,
              background: "rgba(255,255,255,0.55)",
              margin: "0 4px",
            }}
          />

          <span
            style={{
              position: "relative",
              fontFamily: display,
              fontWeight: 700,
              fontSize: 30,
              color: "#FFFFFF",
              letterSpacing: 0.5,
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            53&nbsp;221 avis
          </span>
        </div>

        <div
          style={{
            marginTop: 44,
            fontFamily: body,
            fontStyle: "italic",
            fontSize: 26,
            color: COLORS.cream,
            opacity: interpolate(frame, [40, 65], [0, 1], { extrapolateRight: "clamp" }),
            textAlign: "center",
            maxWidth: 560,
          }}
        >
          La référence des nuits marrakchies
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: body,
            fontSize: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: COLORS.bone,
            opacity: interpolate(frame, [55, 80], [0, 1], { extrapolateRight: "clamp" }),
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
        <BgVideo src="comptoir/clip3.mp4" />
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
  return (
    <AbsoluteFill style={{ background: COLORS.night }}>
      <Series>
        <Series.Sequence durationInFrames={S1}>
          <SceneHook />
        </Series.Sequence>
        <Series.Sequence durationInFrames={S2}>
          <SceneDinerSpectacle />
        </Series.Sequence>
        <Series.Sequence durationInFrames={S3}>
          <SceneHoraires />
        </Series.Sequence>
        <Series.Sequence durationInFrames={S4}>
          <SceneAvis />
        </Series.Sequence>
        <Series.Sequence durationInFrames={S5}>
          <SceneInstall />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
