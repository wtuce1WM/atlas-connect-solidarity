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

// Bô Zin — Signature 27s vertical 720x1280
// Beats: Hook · Name · Identity · Signature · Avis · CTA · Outro
const S1 = 60;   // 0-2s    Hook visuel
const S2 = 90;   // 2-5s    Name + hook éditorial
const S3 = 150;  // 5-10s   Identité (fusion + lounge)
const S4 = 180;  // 10-16s  Signature : DJ live & nightlife
const S5 = 120;  // 16-20s  Avis 18.00/20 · 9 834 avis
const S6 = 120;  // 20-24s  Localisation / cuisine fusion
const S7 = 90;   // 24-27s  CTA Install

export const BOZIN_TOTAL_FRAMES = S1 + S2 + S3 + S4 + S5 + S6 + S7; // 810 = 27s

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

// ── Scene 1 — Hook visuel ────────────────────────────────────────────────────
const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = useFadeInOut(S1, 8, 12);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="bozin/bz_0.mp4" />
      <Veil opacity={0.45} />
      <AbsoluteFill style={{ padding: "120px 60px", justifyContent: "flex-end" }}>
        <div
          style={{
            fontFamily: body,
            fontSize: 24,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: COLORS.gold,
            opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Marrakech · Nightlife
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 2 — Nom + hook éditorial ───────────────────────────────────────────
const SceneName: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S2, 10, 14);
  const titleS = spring({ frame: frame - 6, fps, config: { damping: 16, stiffness: 95 } });
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="bozin/bz_1.mp4" />
      <Veil opacity={0.6} />
      <AbsoluteFill style={{ padding: "0 60px", justifyContent: "center", alignItems: "flex-start", color: COLORS.cream }}>
        <div
          style={{
            fontFamily: display,
            fontWeight: 800,
            fontSize: 120,
            lineHeight: 0.95,
            letterSpacing: -2,
            transform: `translateY(${interpolate(titleS, [0, 1], [40, 0])}px)`,
            opacity: titleS,
            textShadow: "0 6px 28px rgba(0,0,0,0.7)",
          }}
        >
          Bô Zin
        </div>
        <div
          style={{
            marginTop: 28,
            fontFamily: display,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 30,
            lineHeight: 1.25,
            color: COLORS.cream,
            opacity: interpolate(frame, [24, 50], [0, 1], { extrapolateRight: "clamp" }),
            textShadow: "0 3px 16px rgba(0,0,0,0.7)",
            maxWidth: 560,
          }}
        >
          « Dîner chic & ambiance électrisante — entre gastronomie et nightlife »
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 3 — Identité (3 mots clés) ─────────────────────────────────────────
const SceneIdentity: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S3, 12, 14);
  const words = ["Fusion asiatique", "Jardin luxuriant", "Lounge cosmopolite"];
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="bozin/bz_2.mp4" />
      <Veil opacity={0.65} />
      <AbsoluteFill style={{ padding: "120px 60px", justifyContent: "center", alignItems: "flex-start" }}>
        {words.map((w, i) => {
          const delay = 10 + i * 28;
          const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 110 } });
          return (
            <div
              key={i}
              style={{
                fontFamily: display,
                fontWeight: 700,
                fontSize: 52,
                color: i === 1 ? COLORS.gold : COLORS.cream,
                lineHeight: 1.15,
                marginBottom: 12,
                transform: `translateX(${interpolate(s, [0, 1], [-50, 0])}px)`,
                opacity: s,
                textShadow: "0 4px 18px rgba(0,0,0,0.7)",
              }}
            >
              {w}
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 4 — Signature : DJ live & nightlife (carte glassmorphism) ──────────
const SceneSignature: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S4, 14, 18);
  const cardS = spring({ frame: frame - 12, fps, config: { damping: 14, stiffness: 95 } });
  const pulse = 1 + Math.sin(frame / 8) * 0.015;
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="bozin/bz_3.mp4" />
      <Veil opacity={0.55} />
      <AbsoluteFill style={{ padding: "0 60px", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            transform: `translateY(${interpolate(cardS, [0, 1], [40, 0])}px) scale(${interpolate(cardS, [0, 1], [0.9, 1]) * pulse})`,
            opacity: cardS,
            width: "100%",
            maxWidth: 600,
            padding: "36px 32px",
            borderRadius: 32,
            background: "rgba(0,0,0,0.42)",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow:
              "inset 0 1px 0 0 rgba(255,255,255,0.3), 0 12px 38px -6px rgba(0,0,0,0.6)",
            color: COLORS.cream,
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 50%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              fontFamily: body,
              fontSize: 18,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: COLORS.gold,
              marginBottom: 14,
            }}
          >
            La signature
          </div>
          <div
            style={{
              fontFamily: display,
              fontWeight: 800,
              fontSize: 56,
              lineHeight: 1.05,
              marginBottom: 14,
              textShadow: "0 3px 14px rgba(0,0,0,0.6)",
            }}
          >
            DJ sets &<br />nightlife chic
          </div>
          <div
            style={{
              fontFamily: body,
              fontSize: 22,
              lineHeight: 1.45,
              color: "rgba(255,255,255,0.86)",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            D'un dîner raffiné à une soirée vibrante, le lieu se transforme au fil des heures — bar à cocktails inventif, atmosphère cosmopolite.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 5 — Avis ───────────────────────────────────────────────────────────
const SceneAvis: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S5, 12, 14);
  const badge = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 110 } });
  const ratingNum = interpolate(frame, [14, 60], [0, 18.0], { extrapolateRight: "clamp" });
  const countNum = Math.round(interpolate(frame, [22, 70], [0, 9834], { extrapolateRight: "clamp" }));

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="bozin/bz_4.mp4" />
      <Veil opacity={0.65} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 50px" }}>
        <div
          style={{
            fontFamily: body,
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: COLORS.gold,
            marginBottom: 30,
            opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Plébiscité depuis 2007
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
              "inset 0 1px 0 0 rgba(255,255,255,0.35), 0 8px 28px -4px rgba(0,0,0,0.55)",
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
            <svg width="50" height="50" viewBox="0 0 24 24" fill={COLORS.gold}>
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
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            {countNum.toLocaleString("fr-FR")} avis
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 6 — Cuisine fusion / mots cuisine ──────────────────────────────────
const SceneCuisine: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S6, 12, 16);
  const tags = ["Sushi", "Sashimi", "Dim Sum", "Thaï revisité", "Cocktails signature"];
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <BgVideo src="bozin/bz_5.mp4" />
      <Veil opacity={0.6} />
      <AbsoluteFill style={{ padding: "120px 60px", justifyContent: "flex-end" }}>
        <div
          style={{
            fontFamily: body,
            fontSize: 22,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: COLORS.gold,
            marginBottom: 18,
            opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Cuisine fusion
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 800,
            fontSize: 56,
            lineHeight: 1.05,
            color: COLORS.cream,
            marginBottom: 28,
            opacity: interpolate(frame, [8, 32], [0, 1], { extrapolateRight: "clamp" }),
            textShadow: "0 4px 18px rgba(0,0,0,0.7)",
          }}
        >
          Voyage<br />gourmand
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {tags.map((t, i) => {
            const delay = 30 + i * 14;
            const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 120 } });
            return (
              <div
                key={i}
                style={{
                  transform: `scale(${interpolate(s, [0, 1], [0.6, 1])})`,
                  opacity: s,
                  padding: "10px 18px",
                  borderRadius: 999,
                  background: "rgba(0,0,0,0.55)",
                  border: "1px solid rgba(212,175,55,0.45)",
                  color: COLORS.cream,
                  fontFamily: body,
                  fontWeight: 600,
                  fontSize: 20,
                }}
              >
                {t}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 7 — CTA Install ────────────────────────────────────────────────────
const SceneInstall: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const iconS = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 110 } });
  const pulse = 1 + Math.sin(frame / 6) * 0.02;
  const shimmer = interpolate(frame, [22, 60], [-120, 220], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        opacity: fadeIn,
        background: `radial-gradient(ellipse at center top, ${COLORS.ink} 0%, ${COLORS.night} 70%)`,
      }}
    >
      <AbsoluteFill style={{ opacity: 0.18 }}>
        <BgVideo src="bozin/bz_6.mp4" />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(14,11,8,0.85) 0%, rgba(14,11,8,0.72) 50%, rgba(14,11,8,0.95) 100%)`,
        }}
      />
      <AbsoluteFill style={{ padding: "120px 70px", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
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
            marginTop: 40,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 52,
            lineHeight: 1.05,
            color: COLORS.cream,
            opacity: interpolate(frame, [18, 38], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Réservez Bô Zin
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: body,
            fontSize: 22,
            color: COLORS.bone,
            opacity: interpolate(frame, [24, 44], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          sur l'App One World Morocco
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const BoZin: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.night }}>
      <Series>
        <Series.Sequence durationInFrames={S1}><SceneHook /></Series.Sequence>
        <Series.Sequence durationInFrames={S2}><SceneName /></Series.Sequence>
        <Series.Sequence durationInFrames={S3}><SceneIdentity /></Series.Sequence>
        <Series.Sequence durationInFrames={S4}><SceneSignature /></Series.Sequence>
        <Series.Sequence durationInFrames={S5}><SceneAvis /></Series.Sequence>
        <Series.Sequence durationInFrames={S6}><SceneCuisine /></Series.Sequence>
        <Series.Sequence durationInFrames={S7}><SceneInstall /></Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
