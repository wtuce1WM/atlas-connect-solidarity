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

// 4 scenes, total 19s = 570 frames @ 30fps
const S1 = 120; // 0-4s    Hook
const S2 = 150; // 4-9s    Signature line
const S3 = 150; // 9-14s   Avis 19,55/20 + 1813 avis (count below to avoid jump)
const S4 = 150; // 14-19s  Install CTA

export const NAJAT_TOTAL_FRAMES = S1 + S2 + S3 + S4; // 570 = 19s

// ── Helpers ──────────────────────────────────────────────────────────────────
const Veil: React.FC<{ opacity?: number }> = ({ opacity = 0.55 }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, rgba(0,0,0,${opacity * 0.7}) 0%, rgba(0,0,0,${opacity * 0.35}) 45%, rgba(0,0,0,${opacity * 0.95}) 100%)`,
    }}
  />
);

const useFadeInOut = (dur: number, fadeIn = 12, fadeOut = 12) => {
  const f = useCurrentFrame();
  return interpolate(f, [0, fadeIn, dur - fadeOut, dur], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

// ── Persistent background — YouTube clip in cover with slight pan ────────────
// Source: 1280x720 horizontal scaled to 1280 height → ~2276 wide. ~998px of slack.
const PersistentBg: React.FC = () => {
  const frame = useCurrentFrame();
  // Slow horizontal pan across the full 19s
  const panX = interpolate(frame, [0, NAJAT_TOTAL_FRAMES], [-220, 220]);
  // Audio: full volume until last scene, fade out across CTA
  const ctaStart = S1 + S2 + S3;
  const volume = interpolate(
    frame,
    [ctaStart + 30, ctaStart + 110],
    [1, 0.05],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#000" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateX(${panX}px) scale(1.05)`,
        }}
      >
        <Video
          src={staticFile("dar-najat/source.mp4")}
          volume={volume}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 1 — Hook ───────────────────────────────────────────────────────────
const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleY = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 90 } });
  const hookOp = interpolate(frame, [30, 55], [0, 1], { extrapolateRight: "clamp" });
  const fade = useFadeInOut(S1, 8, 16);

  return (
    <AbsoluteFill style={{ opacity: fade }}>
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
          Marrakech · Médina
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 84,
            lineHeight: 1.02,
            transform: `translateY(${interpolate(titleY, [0, 1], [40, 0])}px)`,
            opacity: titleY,
            textShadow: "0 4px 24px rgba(0,0,0,0.6)",
          }}
        >
          Riad
          <br />
          <span style={{ color: COLORS.gold, fontWeight: 600 }}>Dar Najat</span>
        </div>
        <div
          style={{
            marginTop: 28,
            fontFamily: body,
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: 30,
            lineHeight: 1.3,
            opacity: hookOp,
            maxWidth: 600,
            color: COLORS.cream,
            textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          }}
        >
          « Maison d'hôtes au cœur de la Médina, à 5 min de Jemaa El Fna. »
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 2 — Signature ──────────────────────────────────────────────────────
const SceneSignature: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S2, 14, 16);

  const lines = [
    { label: "AUTHENTICITÉ", delay: 6 },
    { label: "&", delay: 22 },
    { label: "HOSPITALITÉ", delay: 36 },
  ];

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <Veil opacity={0.6} />
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
                fontSize: isAccent ? 48 : 72,
                lineHeight: 1.05,
                color: isAccent ? COLORS.gold : COLORS.cream,
                opacity: s,
                transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px) scale(${interpolate(s, [0, 1], [0.92, 1])})`,
                letterSpacing: isAccent ? 0 : 2,
                textShadow: "0 4px 24px rgba(0,0,0,0.65)",
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
            opacity: interpolate(frame, [70, 95], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          L'âme marocaine, en intimité
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 3 — Avis (count below rating, no layout jump) ──────────────────────
const SceneAvis: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S3, 12, 16);
  const badge = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 110 } });
  const ratingNum = interpolate(frame, [14, 50], [0, 19.55], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
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

        {/* Liquid-glass pill — rating + count stacked vertically */}
        <div
          style={{
            transform: `translateY(${interpolate(badge, [0, 1], [24, 0])}px) scale(${interpolate(badge, [0, 1], [0.85, 1])})`,
            opacity: badge,
            position: "relative",
            overflow: "hidden",
            borderRadius: 36,
            background: "rgba(0,0,0,0.4)",
            padding: "32px 46px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
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
              borderRadius: 36,
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
              borderTopLeftRadius: 36,
              borderTopRightRadius: 36,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)",
              filter: "blur(1px)",
              pointerEvents: "none",
            }}
          />

          {/* Star + rating row */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill={COLORS.gold} style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.45))" }}>
              <path d="M12 2l2.95 6.36L22 9.27l-5.5 4.73L18.18 22 12 18.27 5.82 22 7.5 14 2 9.27l7.05-.91L12 2z" />
            </svg>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 220, justifyContent: "center" }}>
              <span
                style={{
                  fontFamily: display,
                  fontWeight: 800,
                  fontSize: 92,
                  lineHeight: 1,
                  color: COLORS.gold,
                  letterSpacing: -1,
                  textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                  fontVariantNumeric: "tabular-nums",
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
          </div>

          {/* Divider */}
          <div
            style={{
              position: "relative",
              width: 60,
              height: 1,
              background: "rgba(255,255,255,0.35)",
            }}
          />

          {/* Reviews count BELOW the rating — no layout jump while the number ticks up */}
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
            1&nbsp;813 avis
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
            textShadow: "0 2px 8px rgba(0,0,0,0.55)",
          }}
        >
          L'art de recevoir, à la marocaine
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

// ── Scene 4 — Install CTA ────────────────────────────────────────────────────
const SceneInstall: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const iconS = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 110 } });
  const btnS = spring({ frame: frame - 28, fps, config: { damping: 13, stiffness: 120 } });
  const pulse = 1 + Math.sin(frame / 6) * 0.015;

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      {/* Dark veil over the persistent video bg */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(14,11,8,0.88) 0%, rgba(14,11,8,0.78) 50%, rgba(14,11,8,0.96) 100%)`,
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
export const RiadDarNajat: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.night }}>
      {/* Continuous YouTube clip with audio across the whole video */}
      <PersistentBg />
      <Series>
        <Series.Sequence durationInFrames={S1}>
          <SceneHook />
        </Series.Sequence>
        <Series.Sequence durationInFrames={S2}>
          <SceneSignature />
        </Series.Sequence>
        <Series.Sequence durationInFrames={S3}>
          <SceneAvis />
        </Series.Sequence>
        <Series.Sequence durationInFrames={S4}>
          <SceneInstall />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
