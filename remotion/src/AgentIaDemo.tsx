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
import { V } from "./tokens";

const { palette: C, type: T, space, radius, motion: M, elevation, layout, alpha, scrim } = V;

// Agent IA Demo — 17s vertical 720x1280 (510 frames @ 30fps)
const S1 = 60;   // 0-2s   Hook
const S2 = 90;   // 2-5s   Question utilisateur (typing)
const S3 = 150;  // 5-10s  Réponse IA + 3 vignettes
const S4 = 90;   // 10-13s Mini-carte avec marqueurs
const S5 = 60;   // 13-15s Affinage "médina"
const S6 = 60;   // 15-17s CTA logo

export const AGENT_IA_TOTAL_FRAMES = S1 + S2 + S3 + S4 + S5 + S6; // 510

const W = layout.canvas.story.width;
const H = layout.canvas.story.height;

// ── Persistent backdrop (zellige + voile) ──────────────────────────────────
const Backdrop: React.FC = () => (
  <AbsoluteFill style={{ background: layout.surfaces.agentBackdrop }}>
    <AbsoluteFill style={{ opacity: 0.12 }}>
      <Img
        src={staticFile("images/koutoubia.webp")}
        style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(8px) saturate(0.6)" }}
      />
    </AbsoluteFill>
    <AbsoluteFill style={{ background: scrim("bottom", 0.55, 0.85) }} />
  </AbsoluteFill>
);

const Caret: React.FC = () => {
  const f = useCurrentFrame();
  const op = Math.floor(f / M.dur.flash) % 2 === 0 ? 1 : 0;
  return (
    <span
      style={{
        display: "inline-block",
        width: 4,
        height: "0.95em",
        background: C.gold,
        marginLeft: space[1] + 2,
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
  const chars = Math.floor(
    interpolate(f, [4, 50], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  const shown = text.slice(0, chars);

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <AbsoluteFill style={{ padding: `0 ${space[10]}px`, justifyContent: "center", alignItems: "flex-start" }}>
        <div
          style={{
            fontFamily: T.family.body,
            fontSize: T.size.label,
            letterSpacing: T.tracking.tracked,
            textTransform: "uppercase",
            color: C.gold,
            marginBottom: space[6],
            opacity: interpolate(f, [0, M.dur.fast], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Agent IA · One World Morocco
        </div>
        <div
          style={{
            fontFamily: T.family.display,
            fontWeight: T.weight.bold,
            fontSize: T.size.h3,
            lineHeight: T.leading.normal,
            color: C.cream,
            textShadow: elevation.readOnPhotoStrong,
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
      gap: space[3] + 2,
      padding: `${space[6]}px ${space[6]}px ${space[4]}px`,
      borderBottom: `${layout.rule.hairline}px solid ${alpha("white", 0.08)}`,
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: radius.sm + 4,
        background: C.terracotta,
        overflow: "hidden",
        boxShadow: elevation.glowEmber,
      }}
    >
      <Img src={staticFile("images/app-icon-1wm.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontFamily: T.family.display, fontWeight: T.weight.bold, fontSize: T.size.caption, color: C.cream }}>
        Agent IA
      </span>
      <span
        style={{
          fontFamily: T.family.body,
          fontSize: T.size.micro + 2,
          color: C.gold,
          letterSpacing: T.tracking.normal,
        }}
      >
        oneworldmorocco.com
      </span>
    </div>
  </div>
);

const UserBubble: React.FC<{ text: string; typingChars?: number }> = ({ text, typingChars }) => {
  const shown = typingChars != null ? text.slice(0, typingChars) : text;
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", padding: `0 ${space[5]}px`, marginTop: space[4] }}>
      <div
        style={{
          background: C.terracotta,
          color: C.white,
          fontFamily: T.family.body,
          fontSize: T.size.caption,
          lineHeight: T.leading.normal,
          padding: `${space[4]}px ${space[5]}px`,
          borderRadius: `${radius.md + 6}px ${radius.md + 6}px ${radius.sm - 2}px ${radius.md + 6}px`,
          maxWidth: "85%",
          boxShadow: elevation.glowEmber,
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
    <div style={{ display: "flex", gap: space[2], padding: `0 ${space[5]}px`, marginTop: space[4] }}>
      <div
        style={{
          background: alpha("white", 0.08),
          padding: `${space[4]}px ${space[5]}px`,
          borderRadius: `${radius.md + 6}px ${radius.md + 6}px ${radius.md + 6}px ${radius.sm - 2}px`,
          display: "flex",
          gap: space[2],
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: radius.pill,
              background: C.gold,
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
  const chars = Math.floor(
    interpolate(f, [8, 70], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
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
  const introChars = Math.floor(
    interpolate(f, [6, 36], [0, intro.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <ChatHeader />

      {/* Assistant bubble (no background) */}
      <div style={{ padding: `${space[5]}px ${space[6]}px 0`, marginTop: space[2] }}>
        <div
          style={{
            fontFamily: T.family.body,
            fontSize: T.size.caption,
            lineHeight: T.leading.normal,
            color: C.cream,
          }}
        >
          {intro.slice(0, introChars)}
          {introChars < intro.length && <Caret />}
        </div>
      </div>

      {/* Cards stagger */}
      <div
        style={{
          padding: `${space[5]}px ${space[5]}px 0`,
          display: "flex",
          flexDirection: "column",
          gap: space[4],
        }}
      >
        {SPOTS.map((s, i) => {
          const enter = spring({
            frame: f - 40 - i * (space[3] + 2),
            fps,
            config: M.springs.quick,
          });
          return (
            <div
              key={s.name}
              style={{
                opacity: enter,
                transform: `translateY(${interpolate(enter, [0, 1], [space[8], 0])}px)`,
                display: "flex",
                gap: space[3] + 2,
                background: alpha("white", 0.04),
                border: `${layout.rule.hairline}px solid ${alpha("gold", 0.18)}`,
                borderRadius: radius.md + 2,
                padding: space[3],
                alignItems: "center",
                boxShadow: elevation.liftCardSoft,
              }}
            >
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: radius.sm + 6,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: C.black,
                }}
              >
                <Video
                  src={staticFile(s.video)}
                  muted
                  startFrom={20 + i * 30}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: space[1] + 2 }}>
                <div
                  style={{
                    fontFamily: T.family.display,
                    fontWeight: T.weight.bold,
                    fontSize: T.size.caption + 2,
                    color: C.cream,
                  }}
                >
                  {s.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: space[2] + 2 }}>
                  <span
                    style={{
                      fontFamily: T.family.display,
                      fontWeight: T.weight.bold,
                      fontSize: T.size.kicker,
                      color: C.night,
                      background: C.gold,
                      padding: `3px ${space[2] + 2}px`,
                      borderRadius: radius.pill,
                    }}
                  >
                    ★ {s.rating}/20
                  </span>
                  <span
                    style={{
                      fontFamily: T.family.body,
                      fontSize: T.size.kicker,
                      color: alpha("white", 0.65),
                    }}
                  >
                    Médina · Marrakech
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: T.family.body,
                    fontSize: T.size.label,
                    color: C.gold,
                    fontWeight: T.weight.bold,
                  }}
                >
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
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "saturate(0.7) brightness(0.55) hue-rotate(-10deg)",
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: scrim("center", 0, 0.9) }} />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: space[10],
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: T.family.body,
          fontSize: T.size.kicker,
          letterSpacing: T.tracking.tracked,
          textTransform: "uppercase",
          color: C.gold,
          opacity: interpolate(f, [0, M.dur.fast], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        Marrakech · Médina
      </div>

      {/* Markers */}
      {markers.map((m, i) => {
        const s = spring({ frame: f - m.delay, fps, config: M.springs.heavy });
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
                  width: space[10],
                  height: space[10],
                  marginLeft: -space[10] / 2,
                  marginTop: -space[10] / 2,
                  borderRadius: radius.pill,
                  border: `${layout.rule.thick}px solid ${C.terracotta}`,
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
                  background: C.terracotta,
                  boxShadow: elevation.liftCardSoft,
                  border: `3px solid ${C.white}`,
                }}
              />
              <div
                style={{
                  marginTop: space[2] + 2,
                  fontFamily: T.family.body,
                  fontWeight: T.weight.bold,
                  fontSize: T.size.micro + 2,
                  color: C.white,
                  background: alpha("night", 0.6),
                  padding: `3px ${space[2]}px`,
                  borderRadius: radius.sm - 2,
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
          bottom: space[13],
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: interpolate(f, [M.dur.slow, 50], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <span
          style={{
            display: "inline-block",
            background: C.slate,
            color: C.white,
            fontFamily: T.family.body,
            fontSize: T.size.label,
            fontWeight: T.weight.bold,
            padding: `${space[2] + 2}px ${space[4] + 2}px`,
            borderRadius: radius.pill,
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
  const chars = Math.floor(
    interpolate(f, [6, 36], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  const checkS = spring({ frame: f - 40, fps, config: M.springs.hero });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <ChatHeader />
      <UserBubble text={text} typingChars={chars} />

      <div
        style={{
          marginTop: space[8],
          padding: `0 ${space[6]}px`,
          opacity: checkS,
          transform: `translateY(${interpolate(checkS, [0, 1], [space[4], 0])}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: space[3],
            fontFamily: T.family.body,
            fontSize: T.size.caption,
            color: C.cream,
          }}
        >
          <span
            style={{
              width: space[6] + 2,
              height: space[6] + 2,
              borderRadius: radius.pill,
              background: C.gold,
              color: C.night,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: T.weight.bold,
              fontSize: T.size.label,
            }}
          >
            ✓
          </span>
          <span>
            Filtre appliqué : <b style={{ color: C.gold }}>Médina</b>
          </span>
        </div>
        <div
          style={{
            marginTop: space[3] + 2,
            fontFamily: T.family.body,
            fontSize: T.size.label,
            color: alpha("white", 0.7),
            paddingLeft: space[8] + 2,
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
  const fadeIn = interpolate(f, [0, M.dur.fast], [0, 1], { extrapolateRight: "clamp" });
  const iconS = spring({ frame: f - 6, fps, config: M.springs.hero });
  const pulse = 1 + Math.sin(f / 6) * 0.015;

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <AbsoluteFill style={{ background: layout.surfaces.glow }} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: `${space[12]}px ${space[10]}px`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: radius.lg + space[4],
            background: C.terracotta,
            overflow: "hidden",
            transform: `scale(${interpolate(iconS, [0, 1], [0.5, 1]) * pulse})`,
            opacity: iconS,
            boxShadow: elevation.glowEmber,
          }}
        >
          <Img
            src={staticFile("images/app-icon-1wm.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div
          style={{
            marginTop: space[8],
            fontFamily: T.family.display,
            fontWeight: T.weight.bold,
            fontSize: T.size.h4 + 6,
            color: C.cream,
            lineHeight: T.leading.snug,
            opacity: interpolate(f, [M.dur.fast, 32], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Agent IA<br />One World Morocco
        </div>
        <div
          style={{
            marginTop: space[4],
            fontFamily: T.family.body,
            fontStyle: "italic",
            fontSize: T.size.caption + 2,
            color: C.gold,
            opacity: interpolate(f, [22, 42], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Votre Maroc, en une conversation.
        </div>
        <div
          style={{
            position: "absolute",
            bottom: space[13],
            left: 0,
            right: 0,
            fontFamily: T.family.body,
            fontSize: T.size.label,
            letterSpacing: T.tracking.wide,
            textTransform: "uppercase",
            color: alpha("white", 0.7),
            textAlign: "center",
            opacity: interpolate(f, [M.dur.slow, 50], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          oneworldmorocco.com
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const AgentIaDemo: React.FC = () => (
  <AbsoluteFill style={{ background: C.night, width: W, height: H }}>
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
