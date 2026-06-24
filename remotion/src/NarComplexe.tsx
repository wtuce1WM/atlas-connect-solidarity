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

// N.A.R Complexe Sportif — 17s vertical 720x1280
const S1 = 75;   // 0-2.5s   Hook
const S2 = 240;  // 2.5-10.5s 4 offers
const S3 = 105;  // 10.5-14s Avis 19.18/20
const S4 = 90;   // 14-17s   Install CTA

export const NAR_TOTAL_FRAMES = S1 + S2 + S3 + S4; // 510 = 17s

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
  const fade = useFadeInOut(S1, 8, 14);

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="nar/nar_so0.mp4" />
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
            opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" }),
            marginBottom: 22,
          }}
        >
          Marrakech · Sport & Adrénaline
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 800,
            fontSize: 64,
            lineHeight: 1.02,
            transform: `translateY(${interpolate(titleY, [0, 1], [40, 0])}px)`,
            opacity: titleY,
            textShadow: "0 4px 24px rgba(0,0,0,0.7)",
          }}
        >
          N.A.R
          <br />
          <span style={{ color: COLORS.gold, fontWeight: 600, fontSize: 48 }}>
            Complexe Sportif
          </span>
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: display,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 32,
            lineHeight: 1.2,
            color: COLORS.cream,
            opacity: interpolate(frame, [22, 44], [0, 1], { extrapolateRight: "clamp" }),
            textShadow: "0 3px 16px rgba(0,0,0,0.7)",
            maxWidth: 560,
          }}
        >
          « Expériences tout-terrain inoubliables à Marrakech »
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 2 — 4 Offres ──────────────────────────────────────────────────────
const SceneOffers: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S2, 14, 16);
  const headerS = spring({ frame: frame - 4, fps, config: { damping: 18 } });

  const offers = [
    { title: "Waterkarting", sub: "1 session achetée, 1 à −50%", save: "−300 MAD" },
    { title: "Quad", sub: "1 session achetée, 1 offerte", save: "−600 MAD" },
    { title: "Karting", sub: "1 session achetée, 1 offerte", save: "−200 MAD" },
    { title: "Paintball", sub: "1 session achetée, 1 offerte", save: "−200 MAD" },
  ];

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="nar/nar_so2.mp4" />
      <Veil opacity={0.78} />
      <AbsoluteFill
        style={{
          padding: "120px 50px 80px",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            transform: `scale(${interpolate(headerS, [0, 1], [0.7, 1])})`,
            opacity: headerS,
            background: COLORS.terracotta,
            color: "#FFFFFF",
            fontFamily: body,
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            padding: "10px 22px",
            borderRadius: 999,
            marginBottom: 28,
            boxShadow: "0 6px 22px rgba(192,79,23,0.45)",
          }}
        >
          4 offres exclusives
        </div>

        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 36,
            color: COLORS.cream,
            textAlign: "center",
            marginBottom: 36,
            opacity: interpolate(frame, [18, 40], [0, 1], { extrapolateRight: "clamp" }),
            textShadow: "0 3px 14px rgba(0,0,0,0.7)",
          }}
        >
          1 session achetée<br />= 1 session bonus
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%", maxWidth: 580 }}>
          {offers.map((o, i) => {
            const delay = 40 + i * 22;
            const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 110 } });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "18px 22px",
                  borderRadius: 22,
                  background: "rgba(0,0,0,0.55)",
                  border: "1px solid rgba(212,175,55,0.35)",
                  transform: `translateX(${interpolate(s, [0, 1], [-40, 0])}px)`,
                  opacity: s,
                  boxShadow: "0 8px 22px rgba(0,0,0,0.45)",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: COLORS.terracotta,
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: display,
                    fontWeight: 800,
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: display,
                      fontWeight: 700,
                      fontSize: 28,
                      color: COLORS.cream,
                      lineHeight: 1.1,
                    }}
                  >
                    {o.title}
                  </div>
                  <div
                    style={{
                      fontFamily: body,
                      fontSize: 18,
                      color: "rgba(255,255,255,0.78)",
                      marginTop: 2,
                    }}
                  >
                    {o.sub}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: display,
                    fontWeight: 800,
                    fontSize: 22,
                    color: COLORS.gold,
                    background: "rgba(212,175,55,0.12)",
                    padding: "8px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(212,175,55,0.4)",
                  }}
                >
                  {o.save}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 3 — Avis ───────────────────────────────────────────────────────────
const SceneAvis: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S3, 12, 14);
  const badge = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 110 } });
  const ratingNum = interpolate(frame, [14, 52], [0, 19.18], { extrapolateRight: "clamp" });
  const countNum = Math.round(interpolate(frame, [20, 60], [0, 3150], { extrapolateRight: "clamp" }));

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="nar/nar_so3.mp4" />
      <Veil opacity={0.62} />
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
          Plébiscité par les visiteurs
        </div>

        <div
          style={{
            transform: `translateY(${interpolate(badge, [0, 1], [24, 0])}px) scale(${interpolate(badge, [0, 1], [0.85, 1])})`,
            opacity: badge,
            position: "relative",
            overflow: "hidden",
            borderRadius: 36,
            background: "rgba(0,0,0,0.45)",
            padding: "30px 50px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
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
                "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 45%, rgba(255,255,255,0.05) 100%)",
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
                fontSize: 88,
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
            {countNum.toLocaleString("fr-FR")} avis
          </span>
        </div>

        <div
          style={{
            marginTop: 38,
            fontFamily: body,
            fontStyle: "italic",
            fontSize: 26,
            color: COLORS.cream,
            opacity: interpolate(frame, [50, 75], [0, 1], { extrapolateRight: "clamp" }),
            textAlign: "center",
            maxWidth: 560,
          }}
        >
          Karting, Quad, Paintball, Waterkarting — la référence sport-loisirs à Marrakech.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 4 — Install CTA (inspired by /install mobile) ─────────────────────
const SceneInstall: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const iconS = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 110 } });
  const btnS = spring({ frame: frame - 28, fps, config: { damping: 13, stiffness: 120 } });
  const pulse = 1 + Math.sin(frame / 6) * 0.02;
  // Shimmer sweep on the square icon (single pass)
  const shimmer = interpolate(frame, [22, 60], [-120, 220], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        opacity: fadeIn,
        background: `radial-gradient(ellipse at center top, ${COLORS.ink} 0%, ${COLORS.night} 70%)`,
      }}
    >
      <AbsoluteFill style={{ opacity: 0.2 }}>
        <BgVideo src="nar/nar_so4.mp4" />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(14,11,8,0.85) 0%, rgba(14,11,8,0.72) 50%, rgba(14,11,8,0.95) 100%)`,
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
        {/* Square rounded terracotta button, /install inspired */}
        <div
          style={{
            position: "relative",
            transform: `scale(${interpolate(iconS, [0, 1], [0.5, 1]) * pulse})`,
            opacity: iconS,
            width: 220,
            height: 220,
            borderRadius: 44,
            background: "#C04F17",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.35)",
            boxShadow:
              "0 24px 60px rgba(192,79,23,0.5), inset 0 1px 1px rgba(255,255,255,0.4)",
          }}
        >
          {/* top glossy highlight */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "45%",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0))",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
          <Img
            src={staticFile("images/app-icon-1wm.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {/* Shimmer single pass */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: shimmer,
              width: 80,
              background:
                "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)",
              transform: "skewX(-18deg)",
              pointerEvents: "none",
              zIndex: 3,
            }}
          />
        </div>

        <div
          style={{
            marginTop: 44,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 56,
            lineHeight: 1.05,
            color: COLORS.cream,
            opacity: interpolate(frame, [18, 38], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Installez l'App
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: body,
            fontSize: 24,
            color: COLORS.bone,
            opacity: interpolate(frame, [24, 44], [0, 1], { extrapolateRight: "clamp" }),
            maxWidth: 620,
          }}
        >
          Le Maroc, autrement — à portée de main.
        </div>

        <div
          style={{
            marginTop: 40,
            transform: `scale(${interpolate(btnS, [0, 1], [0.85, 1])})`,
            opacity: btnS,
            padding: "18px 38px",
            background: "#C04F17",
            borderRadius: 999,
            fontFamily: body,
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: 0.5,
            color: "#FFFFFF",
            boxShadow: "0 12px 30px rgba(192,79,23,0.5)",
          }}
        >
          Installer maintenant
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 70,
            left: 0,
            right: 0,
            fontFamily: body,
            fontSize: 18,
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

export const NarComplexe: React.FC = () => (
  <AbsoluteFill style={{ background: COLORS.night }}>
    <Series>
      <Series.Sequence durationInFrames={S1}><SceneHook /></Series.Sequence>
      <Series.Sequence durationInFrames={S2}><SceneOffers /></Series.Sequence>
      <Series.Sequence durationInFrames={S3}><SceneAvis /></Series.Sequence>
      <Series.Sequence durationInFrames={S4}><SceneInstall /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);
