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

// Agent IA Demo V2 — Centre aquatique / Ourika / Golf — 22s vertical 720x1280
const S1 = 60;   // 0-2s   Hook
const S2 = 120;  // 2-6s   Question multi-critères (typing)
const S3 = 90;   // 6-9s   IA extrait les critères
const S4 = 180;  // 9-15s  Carte géolocalisée + POIs
const S5 = 120;  // 15-19s Carte résultat
const S6 = 90;   // 19-22s CTA

export const AGENT_IA_V2_TOTAL_FRAMES = S1 + S2 + S3 + S4 + S5 + S6; // 660

const W = 720;
const H = 1280;

// ── Backdrop ───────────────────────────────────────────────────────────────
const Backdrop: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at top, #1b1410 0%, ${COLORS.night} 70%)` }}>
    <AbsoluteFill style={{ opacity: 0.1 }}>
      <Img
        src={staticFile("images/koutoubia.webp")}
        style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(8px) saturate(0.6)" }}
      />
    </AbsoluteFill>
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.88) 100%)" }} />
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

// ── Chat shell ─────────────────────────────────────────────────────────────
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

// ── Scene 1 — Hook ────────────────────────────────────────────────────────
const SceneHook: React.FC = () => {
  const f = useCurrentFrame();
  const fade = useFadeInOut(S1, 6, 14);
  const text = "Une journée parfaite, en famille ?";
  const chars = Math.floor(interpolate(f, [4, 40], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

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
            fontSize: 64,
            lineHeight: 1.15,
            color: COLORS.cream,
            textShadow: "0 4px 24px rgba(0,0,0,0.7)",
          }}
        >
          {text.slice(0, chars)}
          <Caret />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 2 — Question ────────────────────────────────────────────────────
const SceneQuestion: React.FC = () => {
  const f = useCurrentFrame();
  const fade = useFadeInOut(S2, 8, 14);
  const text =
    "Je cherche un centre aquatique à Marrakech pour passer la journée avec les enfants, sur la route de l'Ourika, avec un golf à côté";
  const chars = Math.floor(
    interpolate(f, [8, 105], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  );

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <ChatHeader />
      <UserBubble text={text} typingChars={chars} />
    </AbsoluteFill>
  );
};

// ── Scene 3 — IA extrait les critères ─────────────────────────────────────
const Chip: React.FC<{ label: string; delay: number; icon: string }> = ({ label, delay, icon }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 14, stiffness: 130 } });
  return (
    <div
      style={{
        opacity: s,
        transform: `translateX(${interpolate(s, [0, 1], [-30, 0])}px)`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "rgba(212,175,55,0.12)",
        border: "1.5px solid rgba(212,175,55,0.45)",
        borderRadius: 999,
        padding: "12px 22px",
        fontFamily: body,
        fontSize: 22,
        fontWeight: 600,
        color: COLORS.cream,
      }}
    >
      <span style={{ fontSize: 26 }}>{icon}</span>
      {label}
    </div>
  );
};

const SceneCriteria: React.FC = () => {
  const f = useCurrentFrame();
  const fade = useFadeInOut(S3, 8, 12);
  const introChars = Math.floor(
    interpolate(f, [4, 30], [0, "J'ai compris.".length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  );

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <ChatHeader />
      <div style={{ padding: "28px 28px 0" }}>
        <div style={{ fontFamily: body, fontSize: 24, color: COLORS.cream, lineHeight: 1.4 }}>
          {"J'ai compris.".slice(0, introChars)}
          {introChars < 13 && <Caret />}
        </div>
        <div
          style={{
            marginTop: 16,
            fontFamily: body,
            fontSize: 18,
            color: "rgba(255,255,255,0.65)",
            letterSpacing: 3,
            textTransform: "uppercase",
            opacity: interpolate(f, [22, 36], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Vos critères
        </div>
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
          <Chip label="Centre aquatique · Famille" delay={32} icon="💦" />
          <Chip label="Route de l'Ourika" delay={46} icon="📍" />
          <Chip label="Golf à proximité" delay={60} icon="⛳" />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 4 — Carte géolocalisée ──────────────────────────────────────────
// Stylized Marrakech map: medina center (user), Ourika road going SE,
// aquatic POI + golf POI south of city.
const StyledMap: React.FC<{ progress: number }> = ({ progress }) => {
  // progress 0→1 over the scene drives slight zoom toward POIs
  const scale = interpolate(progress, [0, 1], [1, 1.08]);
  const tx = interpolate(progress, [0, 1], [0, -30]);
  const ty = interpolate(progress, [0, 1], [0, -60]);
  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(160deg, #e8ddc4 0%, #d9c89e 35%, #c4ad7a 65%, #a8915d 100%)",
        transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
      }}
    >
      {/* Grid streets */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
        {/* radial roads from medina */}
        <g stroke="#7a6038" strokeWidth="1.5" fill="none">
          <circle cx="360" cy="430" r="80" />
          <circle cx="360" cy="430" r="160" />
          <circle cx="360" cy="430" r="260" />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={360 + Math.cos(a) * 60}
                y1={430 + Math.sin(a) * 60}
                x2={360 + Math.cos(a) * 380}
                y2={430 + Math.sin(a) * 380}
              />
            );
          })}
        </g>
        {/* green zones */}
        <g fill="#9bb87a" opacity={0.55}>
          <ellipse cx="180" cy="700" rx="120" ry="60" />
          <ellipse cx="540" cy="820" rx="100" ry="50" />
          <ellipse cx="120" cy="350" rx="70" ry="50" />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

const YouAreHerePin: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 6, fps, config: { damping: 10, stiffness: 130 } });
  const pulse = (f % 60) / 60;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)" }}>
      {/* outer expanding ring */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 24,
          height: 24,
          marginLeft: -12,
          marginTop: -12,
          borderRadius: 999,
          border: "3px solid #1A73E8",
          opacity: (1 - pulse) * 0.7 * s,
          transform: `scale(${1 + pulse * 4})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 24,
          height: 24,
          marginLeft: -12,
          marginTop: -12,
          borderRadius: 999,
          background: "rgba(26,115,232,0.25)",
          transform: `scale(${1 + pulse * 2.5})`,
          opacity: s,
        }}
      />
      {/* inner blue dot */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: "#1A73E8",
          border: "3px solid #fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          transform: `scale(${s})`,
        }}
      />
      {/* Label */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: -42,
          transform: "translateX(-50%)",
          background: "#1A73E8",
          color: "#fff",
          fontFamily: body,
          fontWeight: 700,
          fontSize: 14,
          padding: "5px 12px",
          borderRadius: 8,
          whiteSpace: "nowrap",
          opacity: s,
          boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
        }}
      >
        Vous êtes ici
      </div>
    </div>
  );
};

const PoiPin: React.FC<{
  x: number;
  y: number;
  label: string;
  icon: string;
  color: string;
  delay: number;
}> = ({ x, y, label, icon, color, delay }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 11, stiffness: 140 } });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -100%) scale(${s})`,
        opacity: s,
      }}
    >
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: "50% 50% 50% 0",
          transform: "rotate(-45deg)",
          background: color,
          border: "3px solid #fff",
          boxShadow: "0 6px 16px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ transform: "rotate(45deg)", fontSize: 22 }}>{icon}</span>
      </div>
      <div
        style={{
          marginTop: 8,
          fontFamily: body,
          fontWeight: 700,
          fontSize: 13,
          color: "#fff",
          background: "rgba(0,0,0,0.75)",
          padding: "4px 9px",
          borderRadius: 6,
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        {label}
      </div>
    </div>
  );
};

const SceneMap: React.FC = () => {
  const f = useCurrentFrame();
  const fade = useFadeInOut(S4, 12, 14);
  const progress = interpolate(f, [0, S4], [0, 1]);

  // Coordinates inside 720×1280 canvas
  const me = { x: 360, y: 430 }; // medina center
  const aqua = { x: 470, y: 870 };
  const golf = { x: 555, y: 985 };

  // Animated dashed road Marrakech → Ourika (SE)
  const roadDraw = interpolate(f, [10, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fade, background: "#000" }}>
      <StyledMap progress={progress} />

      {/* Road to Ourika */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="roadgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C04F17" />
            <stop offset="100%" stopColor="#D4AF37" />
          </linearGradient>
        </defs>
        <path
          d={`M ${me.x} ${me.y} Q ${me.x + 60} ${me.y + 220}, ${aqua.x} ${aqua.y} T ${golf.x} ${golf.y}`}
          stroke="url(#roadgrad)"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="14 10"
          pathLength={1}
          strokeDashoffset={1 - roadDraw}
          style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.45))" }}
        />
        {/* Road label */}
        <text
          x={me.x + 110}
          y={me.y + 240}
          fill="#3B1F0A"
          fontFamily={body}
          fontWeight="700"
          fontSize="20"
          opacity={interpolate(f, [40, 60], [0, 1], { extrapolateRight: "clamp" })}
          transform={`rotate(58 ${me.x + 110} ${me.y + 240})`}
        >
          Route de l'Ourika
        </text>
      </svg>

      <YouAreHerePin x={me.x} y={me.y} />
      <PoiPin
        x={aqua.x}
        y={aqua.y}
        label="Eden Aquapark"
        icon="💦"
        color="#1A73E8"
        delay={72}
      />
      <PoiPin
        x={golf.x}
        y={golf.y}
        label="PalmGolf Ourika"
        icon="⛳"
        color={COLORS.terracotta}
        delay={92}
      />

      {/* Top status badge */}
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: interpolate(f, [0, 16], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.78)",
            backdropFilter: "blur(8px)",
            color: "#fff",
            fontFamily: body,
            fontSize: 16,
            fontWeight: 700,
            padding: "10px 18px",
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "#22c55e",
              boxShadow: "0 0 8px #22c55e",
            }}
          />
          Localisation activée · Marrakech
        </div>
      </div>

      {/* Bottom proximity badge */}
      <div
        style={{
          position: "absolute",
          bottom: 70,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 10,
          opacity: interpolate(f, [100, 120], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <span
          style={{
            background: "#3B3B3B",
            color: "#fff",
            fontFamily: body,
            fontSize: 16,
            fontWeight: 700,
            padding: "10px 18px",
            borderRadius: 999,
          }}
        >
          À proximité · 15 km
        </span>
        <span
          style={{
            background: COLORS.terracotta,
            color: "#fff",
            fontFamily: body,
            fontSize: 16,
            fontWeight: 700,
            padding: "10px 18px",
            borderRadius: 999,
          }}
        >
          2 lieux trouvés
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 5 — Carte résultat ──────────────────────────────────────────────
const SceneResult: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFadeInOut(S5, 10, 14);
  const cardS = spring({ frame: f - 14, fps, config: { damping: 16, stiffness: 110 } });
  const golfS = spring({ frame: f - 50, fps, config: { damping: 14, stiffness: 120 } });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <ChatHeader />
      <div style={{ padding: "24px 28px 0", fontFamily: body, fontSize: 22, color: COLORS.cream, lineHeight: 1.4 }}>
        Voici votre journée idéale :
      </div>

      {/* Main result card */}
      <div
        style={{
          margin: "20px 24px 0",
          opacity: cardS,
          transform: `translateY(${interpolate(cardS, [0, 1], [40, 0])}px)`,
          borderRadius: 22,
          overflow: "hidden",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(212,175,55,0.25)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ position: "relative", width: "100%", height: 280, background: "#0a0a0a" }}>
          {/* Use an aquatic-flavored hero — fallback to map image */}
          <Img
            src={staticFile("images/marrakech.jpg")}
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(1.1)" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              background: COLORS.gold,
              color: "#0E0B08",
              fontFamily: display,
              fontWeight: 700,
              fontSize: 16,
              padding: "5px 12px",
              borderRadius: 999,
            }}
          >
            ★ 17.8/20
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 18,
              left: 18,
              right: 18,
              fontFamily: display,
              fontWeight: 700,
              fontSize: 34,
              color: "#fff",
              textShadow: "0 2px 12px rgba(0,0,0,0.7)",
            }}
          >
            Eden Aquapark
          </div>
        </div>
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                background: "rgba(26,115,232,0.18)",
                color: "#7BB7FF",
                fontFamily: body,
                fontSize: 14,
                fontWeight: 700,
                padding: "5px 11px",
                borderRadius: 999,
              }}
            >
              💦 Famille · Toboggans
            </span>
            <span
              style={{
                background: "rgba(212,175,55,0.18)",
                color: COLORS.gold,
                fontFamily: body,
                fontSize: 14,
                fontWeight: 700,
                padding: "5px 11px",
                borderRadius: 999,
              }}
            >
              📍 Route de l'Ourika
            </span>
          </div>
          <div style={{ fontFamily: body, fontSize: 17, color: "rgba(255,255,255,0.8)", lineHeight: 1.4 }}>
            Parc aquatique familial avec piscines à vagues, toboggans et zones enfants — à 15 min du centre.
          </div>
        </div>
      </div>

      {/* Golf nearby chip */}
      <div
        style={{
          margin: "16px 24px 0",
          opacity: golfS,
          transform: `translateX(${interpolate(golfS, [0, 1], [40, 0])}px)`,
          display: "flex",
          gap: 12,
          alignItems: "center",
          background: `linear-gradient(90deg, rgba(192,79,23,0.25), rgba(192,79,23,0.05))`,
          border: `1.5px solid ${COLORS.terracotta}`,
          borderRadius: 16,
          padding: "12px 16px",
        }}
      >
        <span style={{ fontSize: 30 }}>⛳</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 20, color: COLORS.cream }}>
            PalmGolf Ourika
          </div>
          <div style={{ fontFamily: body, fontSize: 15, color: COLORS.gold }}>
            Golf 18 trous · à 4 km
          </div>
        </div>
        <span
          style={{
            background: COLORS.terracotta,
            color: "#fff",
            fontFamily: body,
            fontWeight: 700,
            fontSize: 13,
            padding: "6px 12px",
            borderRadius: 999,
          }}
        >
          À côté
        </span>
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
        style={{ background: `radial-gradient(ellipse at center, ${COLORS.ink} 0%, ${COLORS.night} 70%)` }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "80px 60px", textAlign: "center" }}>
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

export const AgentIaDemoV2: React.FC = () => (
  <AbsoluteFill style={{ background: COLORS.night, width: W, height: H }}>
    <Backdrop />
    <Series>
      <Series.Sequence durationInFrames={S1}><SceneHook /></Series.Sequence>
      <Series.Sequence durationInFrames={S2}><SceneQuestion /></Series.Sequence>
      <Series.Sequence durationInFrames={S3}><SceneCriteria /></Series.Sequence>
      <Series.Sequence durationInFrames={S4}><SceneMap /></Series.Sequence>
      <Series.Sequence durationInFrames={S5}><SceneResult /></Series.Sequence>
      <Series.Sequence durationInFrames={S6}><SceneCta /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);
