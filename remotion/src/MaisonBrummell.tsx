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

// Maison Brummell Majorelle — 19s vertical 720x1280
// Videos: business_documents sort_order 0..4 (interne)
// Popup title + popup text mis en avant

const S1 = 75;   // 0-2.5s  Hook                        (so0)
const S2 = 135;  // 2.5-7s  Popup title                 (so1)
const S3 = 165;  // 7-12.5s Popup text (bullets)        (so2)
const S4 = 105;  // 12.5-16s Avis 19.60/20              (so3)
const S5 = 90;   // 16-19s  CTA Install                 (so4)

export const BRUMMELL_TOTAL_FRAMES = S1 + S2 + S3 + S4 + S5; // 570 = 19s

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
      <BgVideo src="brummell/brummell_so0.mp4" />
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
          Marrakech · Majorelle
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 72,
            lineHeight: 1.02,
            transform: `translateY(${interpolate(titleY, [0, 1], [40, 0])}px)`,
            opacity: titleY,
            textShadow: "0 4px 24px rgba(0,0,0,0.55)",
          }}
        >
          Maison
          <br />
          <span style={{ color: COLORS.gold, fontWeight: 600 }}>Brummell</span>
          <br />
          Majorelle
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 2 — Popup title ────────────────────────────────────────────────────
const ScenePopupTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S2, 14, 16);
  const badgeS = spring({ frame: frame - 4, fps, config: { damping: 18 } });
  const titleS = spring({ frame: frame - 18, fps, config: { damping: 16, stiffness: 100 } });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="brummell/brummell_so1.mp4" startFrom={20} />
      <Veil opacity={0.72} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "0 70px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            transform: `scale(${interpolate(badgeS, [0, 1], [0.7, 1])})`,
            opacity: badgeS,
            background: COLORS.terracotta,
            color: "#FFFFFF",
            fontFamily: body,
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            padding: "10px 22px",
            borderRadius: 999,
            marginBottom: 38,
            boxShadow: "0 6px 22px rgba(192,79,23,0.45)",
          }}
        >
          Offre directe
        </div>

        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontStyle: "italic",
            fontSize: 56,
            lineHeight: 1.15,
            color: COLORS.cream,
            transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
            opacity: titleS,
            textShadow: "0 4px 24px rgba(0,0,0,0.7)",
            maxWidth: 620,
          }}
        >
          « Oui, autant de cadeaux en réservant directement avec nous ! »
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 3 — Popup bullets ──────────────────────────────────────────────────
const SceneBullets: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S3, 14, 16);

  const bullets = [
    "5% de réduction sur tous nos tarifs en ligne",
    "10% de réduction sur les produits du magasin",
    "1 sac Brummell en coton imprimé à la main",
    "Enregistrement anticipé gratuit (selon dispo)",
  ];

  const footS = spring({ frame: frame - 95, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="brummell/brummell_so2.mp4" />
      <Veil opacity={0.78} />
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
            marginBottom: 36,
            opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          En réservant en direct
        </div>

        {bullets.map((b, i) => {
          const delay = 10 + i * 14;
          const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 110 } });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 18,
                marginBottom: 28,
                transform: `translateX(${interpolate(s, [0, 1], [-30, 0])}px)`,
                opacity: s,
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  marginTop: 12,
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: COLORS.gold,
                  boxShadow: "0 0 0 4px rgba(212,175,55,0.18)",
                }}
              />
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 600,
                  fontSize: 32,
                  lineHeight: 1.25,
                  color: COLORS.cream,
                  textShadow: "0 3px 16px rgba(0,0,0,0.6)",
                  maxWidth: 540,
                }}
              >
                {b}
              </div>
            </div>
          );
        })}

        <div
          style={{
            marginTop: 24,
            fontFamily: body,
            fontStyle: "italic",
            fontSize: 26,
            color: COLORS.gold,
            opacity: footS,
            transform: `translateY(${interpolate(footS, [0, 1], [16, 0])}px)`,
            maxWidth: 560,
          }}
        >
          Mais surtout, soutenez une entreprise indépendante.
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
  const ratingNum = interpolate(frame, [14, 50], [0, 19.6], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="brummell/brummell_so3.mp4" />
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
                fontSize: 82,
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
                fontSize: 36,
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
              fontSize: 26,
              color: "#FFFFFF",
              letterSpacing: 0.5,
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            205 avis
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
          Une maison d'hôtes confidentielle au cœur de Majorelle
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
        <BgVideo src="brummell/brummell_so4.mp4" />
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

export const MaisonBrummell: React.FC = () => (
  <AbsoluteFill style={{ background: COLORS.night }}>
    <Series>
      <Series.Sequence durationInFrames={S1}><SceneHook /></Series.Sequence>
      <Series.Sequence durationInFrames={S2}><ScenePopupTitle /></Series.Sequence>
      <Series.Sequence durationInFrames={S3}><SceneBullets /></Series.Sequence>
      <Series.Sequence durationInFrames={S4}><SceneAvis /></Series.Sequence>
      <Series.Sequence durationInFrames={S5}><SceneInstall /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);
