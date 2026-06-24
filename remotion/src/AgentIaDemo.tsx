import React from "react";
import {
  AbsoluteFill,
  Series,
  Img,
  Video,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { display, body, COLORS } from "./theme";

// Agent IA Demo — 17s vertical 720x1280 (510 frames @ 30fps)
const S1 = 60;   // 0-2s   Hook
const S2 = 90;   // 2-5s   Question utilisateur (typing)
const S3 = 150;  // 5-10s  Réponse IA + 3 vignettes
const S4 = 90;   // 10-13s Mini-carte avec marqueurs
const S5 = 60;   // 13-15s Affinage "médina"
const S6 = 60;   // 15-17s CTA logo

export const AGENT_IA_TOTAL_FRAMES = S1 + S2 + S3 + S4 + S5 + S6; // 510

const W = 720;
const H = 1280;

// ── Persistent backdrop (zellige + voile) ──────────────────────────────────
const Backdrop: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at top, #1b1410 0%, ${COLORS.night} 70%)` }}>
    <AbsoluteFill style={{ opacity: 0.12 }}>
      <Img
        src={staticFile("images/koutoubia.webp")}
        style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(8px) saturate(0.6)" }}
      />
    </AbsoluteFill>
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.85) 100%)" }} />
  </AbsoluteFill>
);

const Caret: React.FC = () => {
  const f = useCurrentFrame();
  const op = Math.floor(f / 8) % 2 === 0 ? 1 : 0;
  return (
    <span
      style={{
        display: "inline-block",
        width: 4,
        height: "0.95em",
        background: COLORS.gold,
        marginLeft: 6,
        verticalAlign: "text-bottom",
        opacity: op,
      }}
    />
  );
};

const useFadeInOut = (dur: number, fin = 10, fout = 14) => {
  const f = useCurrentFrame();
  return interpolate(f, [0, fin, dur - fout, dur], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

// ── Scene 1 — Hook ────────────────────────────────────────────────────────
const SceneHook: React.FC = () => {
  const f = useCurrentFrame();
  const fade = useFadeInOut(S1, 6, 14);
  const text = "Et si une IA connaissait le Maroc mieux que personne ?";
  const chars = Math.floor(interpolate(f, [4, 50], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const shown = text.slice(0, chars);

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <AbsoluteFill style={{ padding: "0 60px", justifyContent: "center", alignItems: "flex-start" }}>
        <div
          style={{
            fontFamily: body,
            fontSize: 18,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: COLORS.gold,
            marginBottom: 28,
            opacity: interpolate(f, [0, 14], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Agent IA · One World Morocco
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 54,
            lineHeight: 1.2,
            color: COLORS.cream,
            textShadow: "0 4px 24px rgba(0,0,0,0.7)",
          }}
        >
          {shown}
          <Caret />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Chat shell shared by scenes 2/3/5 ─────────────────────────────────────
const ChatHeader: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "26px 28px 18px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: COLORS.terracotta,
        overflow: "hidden",
        boxShadow: "0 4px 14px rgba(192,79,23,0.5)",
      }}
    >
      <Img src={staticFile("images/app-icon-1wm.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontFamily: display, fontWeight: 700, fontSize: 22, color: COLORS.cream }}>
        Agent IA
      </span>
      <span style={{ fontFamily: body, fontSize: 14, color: COLORS.gold, letterSpacing: 1 }}>
        oneworldmorocco.com
      </span>
    </div>
  </div>
);

const UserBubble: React.FC<{ text: string; typingChars?: number }> = ({ text, typingChars }) => {
  const shown = typingChars != null ? text.slice(0, typingChars) : text;
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 24px", marginTop: 18 }}>
      <div
        style={{
          background: COLORS.terracotta,
          color: "#FFFFFF",
          fontFamily: body,
          fontSize: 22,
          lineHeight: 1.35,
          padding: "16px 20px",
          borderRadius: "22px 22px 6px 22px",
          maxWidth: "85%",
          boxShadow: "0 6px 18px rgba(192,79,23,0.35)",
        }}
      >
        {shown}
        {typingChars != null && typingChars < text.length && <Caret />}
      </div>
    </div>
  );
};

const TypingDots: React.FC = () => {
  const f = useCurrentFrame();
  const dot = (i: number) => {
    const v = Math.sin((f - i * 4) / 4);
    return Math.max(0.3, (v + 1) / 2);
  };
  return (
    <div style={{ display: "flex", gap: 8, padding: "0 24px", marginTop: 18 }}>
      <div
        style={{
          background: "rgba(255,255,255,0.08)",
          padding: "16px 22px",
          borderRadius: "22px 22px 22px 6px",
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: COLORS.gold,
              opacity: dot(i),
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ── Scene 2 — Question utilisateur ────────────────────────────────────────
const SceneQuestion: React.FC = () => {
  const f = useCurrentFrame();
  const fade = useFadeInOut(S2, 8, 14);
  const text = "Je cherche un riad à Marrakech avec piscine, du 20 au 25 septembre pour 2 adultes";
  const chars = Math.floor(interpolate(f, [8, 70], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const showDots = f > 72;

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <ChatHeader />
      <UserBubble text={text} typingChars={chars} />
      {showDots && <TypingDots />}
    </AbsoluteFill>
  );
};

// ── Scene 3 — Réponse IA + vignettes ──────────────────────────────────────
type Spot = { name: string; video: string; rating: string; price: string };
const SPOTS: Spot[] = [
  { name: "Riad Dar Najat", video: "dar-najat/source.mp4", rating: "18.6", price: "180 €" },
  { name: "Jnane Rumi", video: "jnane/jnane_so0.mp4", rating: "18.4", price: "240 €" },
  { name: "Maison Brummell", video: "brummell/brummell_so0.mp4", rating: "18.2", price: "210 €" },
];

const SceneAnswer: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S3, 10, 14);

  const intro = "Voici 3 riads d'exception dans la médina :";
  const introChars = Math.floor(interpolate(f, [6, 36], [0, intro.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <ChatHeader />

      {/* Assistant bubble (no background) */}
      <div style={{ padding: "20px 28px 0", marginTop: 8 }}>
        <div
          style={{
            fontFamily: body,
            fontSize: 22,
            lineHeight: 1.4,
            color: COLORS.cream,
          }}
        >
          {intro.slice(0, introChars)}
          {introChars < intro.length && <Caret />}
        </div>
      </div>

      {/* Cards stagger */}
      <div style={{ padding: "24px 24px 0", display: "flex", flexDirection: "column", gap: 16 }}>
        {SPOTS.map((s, i) => {
          const enter = spring({
            frame: f - 40 - i * 14,
            fps,
            config: { damping: 18, stiffness: 110 },
          });
          return (
            <div
              key={s.name}
              style={{
                opacity: enter,
                transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px)`,
                display: "flex",
                gap: 14,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(212,175,55,0.18)",
                borderRadius: 18,
                padding: 12,
                alignItems: "center",
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              }}
            >
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 14,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "#000",
                }}
              >
                <Video
                  src={staticFile(s.video)}
                  muted
                  startFrom={20 + i * 30}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontFamily: display, fontWeight: 700, fontSize: 24, color: COLORS.cream }}>
                  {s.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      fontFamily: display,
                      fontWeight: 700,
                      fontSize: 16,
                      color: "#0E0B08",
                      background: COLORS.gold,
                      padding: "3px 10px",
                      borderRadius: 999,
                    }}
                  >
                    ★ {s.rating}/20
                  </span>
                  <span style={{ fontFamily: body, fontSize: 16, color: "rgba(255,255,255,0.65)" }}>
                    Médina · Marrakech
                  </span>
                </div>
                <div style={{ fontFamily: body, fontSize: 18, color: COLORS.gold, fontWeight: 700 }}>
                  dès {s.price}/nuit
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 4 — Mini-carte ──────────────────────────────────────────────────
const SceneMap: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S4, 10, 14);

  // Stylized "map" — koutoubia bg tinted + grid + markers
  const markers = [
    { x: 0.28, y: 0.42, label: "Dar Najat", delay: 6 },
    { x: 0.58, y: 0.36, label: "Jnane Rumi", delay: 16 },
    { x: 0.46, y: 0.58, label: "Brummell", delay: 26 },
  ];

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <AbsoluteFill>
        <Img
          src={staticFile("images/marrakech.jpg")}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.7) brightness(0.55) hue-rotate(-10deg)" }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(14,11,8,0) 0%, rgba(14,11,8,0.55) 70%, rgba(14,11,8,0.9) 100%)",
        }}
      />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: body,
          fontSize: 16,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: COLORS.gold,
          opacity: interpolate(f, [0, 14], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        Marrakech · Médina
      </div>

      {/* Markers */}
      {markers.map((m, i) => {
        const s = spring({ frame: f - m.delay, fps, config: { damping: 12, stiffness: 140 } });
        const pulse = 0.6 + 0.4 * Math.sin((f - m.delay) / 4);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${m.x * 100}%`,
              top: `${m.y * 100}%`,
              transform: `translate(-50%, -100%) scale(${s})`,
              opacity: s,
            }}
          >
            <div style={{ position: "relative" }}>
              {/* pulse ring */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 60,
                  height: 60,
                  marginLeft: -30,
                  marginTop: -30,
                  borderRadius: 999,
                  border: `2px solid ${COLORS.terracotta}`,
                  opacity: pulse * 0.5,
                  transform: `scale(${1 + (1 - pulse) * 0.8})`,
                }}
              />
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50% 50% 50% 0",
                  transform: "rotate(-45deg)",
                  background: COLORS.terracotta,
                  boxShadow: "0 6px 16px rgba(0,0,0,0.6)",
                  border: "3px solid #fff",
                }}
              />
              <div
                style={{
                  marginTop: 10,
                  fontFamily: body,
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#fff",
                  background: "rgba(0,0,0,0.6)",
                  padding: "3px 8px",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                  textAlign: "center",
                }}
              >
                {m.label}
              </div>
            </div>
          </div>
        );
      })}

      {/* Bottom badge */}
      <div
        style={{
          position: "absolute",
          bottom: 90,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: interpolate(f, [30, 50], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <span
          style={{
            display: "inline-block",
            background: "#3B3B3B",
            color: "#fff",
            fontFamily: body,
            fontSize: 18,
            fontWeight: 700,
            padding: "10px 18px",
            borderRadius: 999,
          }}
        >
          À proximité · 3 km
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 5 — Affinage ────────────────────────────────────────────────────
const SceneRefine: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S5, 8, 14);
  const text = "…et plutôt dans la médina";
  const chars = Math.floor(interpolate(f, [6, 36], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const checkS = spring({ frame: f - 40, fps, config: { damping: 14, stiffness: 110 } });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <ChatHeader />
      <UserBubble text={text} typingChars={chars} />

      <div
        style={{
          marginTop: 38,
          padding: "0 28px",
          opacity: checkS,
          transform: `translateY(${interpolate(checkS, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: body,
            fontSize: 22,
            color: COLORS.cream,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: COLORS.gold,
              color: COLORS.night,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            ✓
          </span>
          <span>Filtre appliqué : <b style={{ color: COLORS.gold }}>Médina</b></span>
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: body,
            fontSize: 18,
            color: "rgba(255,255,255,0.7)",
            paddingLeft: 40,
          }}
        >
          3 résultats sur la carte · prix & disponibilité mis à jour
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 6 — CTA ─────────────────────────────────────────────────────────
const SceneCta: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = interpolate(f, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const iconS = spring({ frame: f - 6, fps, config: { damping: 14, stiffness: 110 } });
  const pulse = 1 + Math.sin(f / 6) * 0.015;

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, ${COLORS.ink} 0%, ${COLORS.night} 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 60px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: 44,
            background: COLORS.terracotta,
            overflow: "hidden",
            transform: `scale(${interpolate(iconS, [0, 1], [0.5, 1]) * pulse})`,
            opacity: iconS,
            boxShadow: `0 20px 50px rgba(192,79,23,0.5)`,
          }}
        >
          <Img src={staticFile("images/app-icon-1wm.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div
          style={{
            marginTop: 40,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 48,
            color: COLORS.cream,
            lineHeight: 1.1,
            opacity: interpolate(f, [14, 32], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Agent IA<br />One World Morocco
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: body,
            fontStyle: "italic",
            fontSize: 24,
            color: COLORS.gold,
            opacity: interpolate(f, [22, 42], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Votre Maroc, en une conversation.
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 90,
            left: 0,
            right: 0,
            fontFamily: body,
            fontSize: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.7)",
            textAlign: "center",
            opacity: interpolate(f, [30, 50], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          oneworldmorocco.com
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const AgentIaDemo: React.FC = () => (
  <AbsoluteFill style={{ background: COLORS.night, width: W, height: H }}>
    <Backdrop />
    <Series>
      <Series.Sequence durationInFrames={S1}><SceneHook /></Series.Sequence>
      <Series.Sequence durationInFrames={S2}><SceneQuestion /></Series.Sequence>
      <Series.Sequence durationInFrames={S3}><SceneAnswer /></Series.Sequence>
      <Series.Sequence durationInFrames={S4}><SceneMap /></Series.Sequence>
      <Series.Sequence durationInFrames={S5}><SceneRefine /></Series.Sequence>
      <Series.Sequence durationInFrames={S6}><SceneCta /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);
