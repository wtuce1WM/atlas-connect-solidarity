import React from "react";
import {
  AbsoluteFill,
  Series,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { display, body, COLORS } from "./theme";

// The Farasha Farmhouse — 17s vertical 720x1280, IMAGES ONLY
// Ferme pédagogique angle + Popup + Offre + Avis 18.00/20 + CTA Install

const S1 = 90;   // 0-3s   Hook (ferme pédagogique)
const S2 = 150;  // 3-8s   Popup title + texte
const S3 = 120;  // 8-12s  Offre -10% directe
const S4 = 90;   // 12-15s Avis 18.00/20
const S5 = 60;   // 15-17s Install CTA

export const FARASHA_TOTAL_FRAMES = S1 + S2 + S3 + S4 + S5; // 510 = 17s

const Veil: React.FC<{ opacity?: number }> = ({ opacity = 0.55 }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, rgba(0,0,0,${opacity * 0.7}) 0%, rgba(0,0,0,${opacity * 0.35}) 45%, rgba(0,0,0,${opacity * 0.95}) 100%)`,
    }}
  />
);

// Ken Burns image background. progress 0..1 across the scene duration.
const KenBurns: React.FC<{
  src: string;
  duration: number;
  zoomFrom?: number;
  zoomTo?: number;
  panX?: [number, number];
  panY?: [number, number];
}> = ({ src, duration, zoomFrom = 1.05, zoomTo = 1.18, panX = [0, 0], panY = [0, 0] }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(p, [0, 1], [zoomFrom, zoomTo]);
  const tx = interpolate(p, [0, 1], panX);
  const ty = interpolate(p, [0, 1], panY);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
          transformOrigin: "center",
        }}
      />
    </AbsoluteFill>
  );
};

const useFadeInOut = (dur: number, fadeIn = 12, fadeOut = 12) => {
  const f = useCurrentFrame();
  return interpolate(f, [0, fadeIn, dur - fadeOut, dur], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

// ── Scene 1 — Hook : Ferme pédagogique ───────────────────────────────────────
const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S1, 8, 14);
  const titleS = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 90 } });
  const subS = spring({ frame: frame - 26, fps, config: { damping: 18 } });

  // Cross between two images at half duration
  const half = S1 / 2;
  const op1 = interpolate(frame, [0, half - 6, half + 6], [1, 1, 0], { extrapolateRight: "clamp" });
  const op2 = interpolate(frame, [half - 6, half + 6, S1], [0, 1, 1], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fade, background: COLORS.night }}>
      <AbsoluteFill style={{ opacity: op1 }}>
        <KenBurns src="farasha/garden.jpg" duration={S1} zoomFrom={1.08} zoomTo={1.22} panX={[-15, 15]} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: op2 }}>
        <KenBurns src="farasha/hook.jpg" duration={S1} zoomFrom={1.12} zoomTo={1.0} panY={[-12, 12]} />
      </AbsoluteFill>
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
            fontSize: 24,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: COLORS.gold,
            opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" }),
            marginBottom: 22,
          }}
        >
          Marrakech · Ferme régénératrice
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 68,
            lineHeight: 1.02,
            transform: `translateY(${interpolate(titleS, [0, 1], [40, 0])}px)`,
            opacity: titleS,
            textShadow: "0 4px 24px rgba(0,0,0,0.6)",
          }}
        >
          The
          <br />
          <span style={{ color: COLORS.gold, fontWeight: 600 }}>Farasha</span>
          <br />
          Farmhouse
        </div>
        <div
          style={{
            marginTop: 22,
            fontFamily: body,
            fontStyle: "italic",
            fontSize: 26,
            lineHeight: 1.35,
            color: COLORS.cream,
            opacity: subS,
            transform: `translateY(${interpolate(subS, [0, 1], [16, 0])}px)`,
            maxWidth: 560,
            textShadow: "0 3px 14px rgba(0,0,0,0.55)",
          }}
        >
          Une ferme pédagogique entre deux chaînes de montagnes,
          <br />
          oliveraie, potager & papillons.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 2 — Popup title + texte ────────────────────────────────────────────
const ScenePopup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S2, 14, 16);
  const badgeS = spring({ frame: frame - 4, fps, config: { damping: 18 } });
  const titleS = spring({ frame: frame - 18, fps, config: { damping: 16, stiffness: 100 } });
  const priceS = spring({ frame: frame - 36, fps, config: { damping: 14, stiffness: 110 } });
  const lineS = spring({ frame: frame - 60, fps, config: { damping: 18 } });
  const line2S = spring({ frame: frame - 78, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <KenBurns src="farasha/popup.jpg" duration={S2} zoomFrom={1.05} zoomTo={1.18} panX={[10, -10]} />
      <Veil opacity={0.7} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "0 60px",
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
            marginBottom: 34,
            boxShadow: "0 6px 22px rgba(192,79,23,0.45)",
          }}
        >
          L'offre signature
        </div>

        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 52,
            lineHeight: 1.12,
            color: COLORS.cream,
            transform: `translateY(${interpolate(titleS, [0, 1], [24, 0])}px)`,
            opacity: titleS,
            textShadow: "0 4px 24px rgba(0,0,0,0.7)",
            maxWidth: 620,
          }}
        >
          Pass journée
          <br />
          & déjeuner
        </div>

        <div
          style={{
            marginTop: 28,
            transform: `scale(${interpolate(priceS, [0, 1], [0.6, 1])})`,
            opacity: priceS,
            fontFamily: display,
            fontWeight: 800,
            fontSize: 96,
            lineHeight: 1,
            color: COLORS.gold,
            letterSpacing: -1,
            textShadow: "0 4px 20px rgba(0,0,0,0.6)",
          }}
        >
          60€
          <span style={{ fontSize: 38, color: COLORS.cream, fontWeight: 500, marginLeft: 16 }}>
            / 600 MAD
          </span>
        </div>

        <div
          style={{
            marginTop: 32,
            fontFamily: body,
            fontSize: 24,
            color: COLORS.cream,
            opacity: lineS,
            transform: `translateY(${interpolate(lineS, [0, 1], [16, 0])}px)`,
            maxWidth: 560,
            lineHeight: 1.4,
            textShadow: "0 2px 10px rgba(0,0,0,0.6)",
          }}
        >
          Jardins, piscine olympique de 50 m & déjeuner aux produits locaux.
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: body,
            fontSize: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: COLORS.gold,
            opacity: line2S,
          }}
        >
          11h – 19h · Transat & serviettes inclus
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 3 — Offre directe ──────────────────────────────────────────────────
const SceneOffer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S3, 14, 16);
  const headS = spring({ frame: frame - 4, fps, config: { damping: 18 } });

  const bullets = [
    "Service fast track à l'aéroport de Marrakech",
    "Transferts privés depuis & vers l'aéroport",
  ];

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <KenBurns src="farasha/offer.jpg" duration={S3} zoomFrom={1.1} zoomTo={1.0} panX={[-10, 10]} />
      <Veil opacity={0.78} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "0 60px",
        }}
      >
        <div
          style={{
            fontFamily: body,
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: COLORS.gold,
            marginBottom: 22,
            opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Réservez en direct
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 14,
            transform: `translateY(${interpolate(headS, [0, 1], [20, 0])}px)`,
            opacity: headS,
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontFamily: display,
              fontWeight: 800,
              fontSize: 140,
              lineHeight: 1,
              color: COLORS.terracotta,
              letterSpacing: -3,
              textShadow: "0 4px 24px rgba(0,0,0,0.55)",
            }}
          >
            −10%
          </span>
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 600,
            fontStyle: "italic",
            fontSize: 32,
            lineHeight: 1.25,
            color: COLORS.cream,
            opacity: interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" }),
            maxWidth: 560,
            marginBottom: 36,
            textShadow: "0 3px 14px rgba(0,0,0,0.6)",
          }}
        >
          vs. les grandes plateformes de réservation.
        </div>

        {bullets.map((b, i) => {
          const delay = 42 + i * 16;
          const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 110 } });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                marginBottom: 20,
                transform: `translateX(${interpolate(s, [0, 1], [-30, 0])}px)`,
                opacity: s,
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  marginTop: 12,
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: COLORS.gold,
                  boxShadow: "0 0 0 4px rgba(212,175,55,0.18)",
                }}
              />
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 500,
                  fontSize: 26,
                  lineHeight: 1.3,
                  color: COLORS.cream,
                  textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                  maxWidth: 520,
                }}
              >
                {b}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 4 — Avis 18.00/20 ──────────────────────────────────────────────────
const SceneAvis: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S4, 12, 14);
  const badge = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 110 } });
  const ratingNum = interpolate(frame, [14, 50], [0, 18.0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <KenBurns src="farasha/avis.jpg" duration={S4} zoomFrom={1.08} zoomTo={1.18} panY={[10, -10]} />
      <Veil opacity={0.6} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 50px" }}>
        <div
          style={{
            fontFamily: body,
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: COLORS.gold,
            marginBottom: 28,
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
                fontSize: 92,
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
            84 avis
          </span>
        </div>

        <div
          style={{
            marginTop: 36,
            fontFamily: body,
            fontStyle: "italic",
            fontSize: 24,
            color: COLORS.cream,
            opacity: interpolate(frame, [40, 65], [0, 1], { extrapolateRight: "clamp" }),
            textAlign: "center",
            maxWidth: 560,
          }}
        >
          « Un havre de créativité, d'artisanat et d'hospitalité contemporaine. »
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 5 — Install CTA (/install inspired) ────────────────────────────────
const SceneInstall: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const iconS = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 110 } });
  const btnS = spring({ frame: frame - 24, fps, config: { damping: 13, stiffness: 120 } });
  const pulse = 1 + Math.sin(frame / 6) * 0.02;
  const shimmer = interpolate(frame, [18, 50], [-120, 220], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        opacity: fadeIn,
        background: `radial-gradient(ellipse at center top, ${COLORS.ink} 0%, ${COLORS.night} 70%)`,
      }}
    >
      <AbsoluteFill style={{ opacity: 0.22 }}>
        <KenBurns src="farasha/install.jpg" duration={S5} zoomFrom={1.1} zoomTo={1.22} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(14,11,8,0.85) 0%, rgba(14,11,8,0.72) 50%, rgba(14,11,8,0.95) 100%)`,
        }}
      />

      <AbsoluteFill
        style={{
          padding: "100px 70px",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
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
            marginTop: 36,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 52,
            lineHeight: 1.05,
            color: COLORS.cream,
            opacity: interpolate(frame, [14, 30], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Installez l'App
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: body,
            fontSize: 22,
            color: COLORS.bone,
            opacity: interpolate(frame, [20, 38], [0, 1], { extrapolateRight: "clamp" }),
            maxWidth: 560,
          }}
        >
          Le Maroc, autrement — à portée de main.
        </div>

        <div
          style={{
            marginTop: 32,
            transform: `scale(${interpolate(btnS, [0, 1], [0.85, 1])})`,
            opacity: btnS,
            padding: "16px 36px",
            background: "#C04F17",
            borderRadius: 999,
            fontFamily: body,
            fontWeight: 700,
            fontSize: 24,
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
            bottom: 60,
            left: 0,
            right: 0,
            fontFamily: body,
            fontSize: 18,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: COLORS.gold,
            opacity: interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          oneworldmorocco.com/install
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Farasha: React.FC = () => (
  <AbsoluteFill style={{ background: COLORS.night }}>
    <Series>
      <Series.Sequence durationInFrames={S1}><SceneHook /></Series.Sequence>
      <Series.Sequence durationInFrames={S2}><ScenePopup /></Series.Sequence>
      <Series.Sequence durationInFrames={S3}><SceneOffer /></Series.Sequence>
      <Series.Sequence durationInFrames={S4}><SceneAvis /></Series.Sequence>
      <Series.Sequence durationInFrames={S5}><SceneInstall /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);
