import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Loop,
  OffthreadVideo,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  Img,
} from "remotion";
import { display, body, COLORS } from "./theme";

export const CORP_TOTAL_FRAMES = 840; // 28s at 30fps

// ---------- helpers ----------
const ease = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// ---------- persistent background ----------
const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 12;
  return (
    <AbsoluteFill style={{ background: COLORS.night, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(60% 40% at 50% 0%, rgba(192,79,23,0.35) 0%, rgba(14,11,8,0) 60%), radial-gradient(70% 50% at 50% 100%, rgba(212,175,55,0.18) 0%, rgba(14,11,8,0) 60%)",
        }}
      />
      <AbsoluteFill style={{ opacity: 0.07 }}>
        <Img
          src={staticFile("images/hamsa.webp")}
          style={{
            position: "absolute",
            width: 1400,
            height: 1400,
            left: "50%",
            top: "50%",
            transform: `translate(-50%, calc(-50% + ${drift}px))`,
            filter: "blur(2px)",
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(14,11,8,0.55) 0%, rgba(14,11,8,0.1) 35%, rgba(14,11,8,0.1) 65%, rgba(14,11,8,0.7) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- scenes ----------
const SceneOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const iconSpring = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const iconScale = interpolate(iconSpring, [0, 1], [0.6, 1]);
  const titleY = interpolate(spring({ frame: frame - 18, fps, config: { damping: 18 } }), [0, 1], [40, 0]);
  const titleO = ease(frame, 18, 40);
  const subO = ease(frame, 40, 65);
  const out = 1 - ease(frame, 75, 90);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out }}>
      <Img
        src={staticFile("images/app-icon-1wm.png")}
        style={{ width: 320, height: 320, transform: `scale(${iconScale})` }}
      />
      <div
        style={{
          marginTop: 48,
          fontFamily: display,
          fontWeight: 700,
          letterSpacing: 6,
          color: COLORS.cream,
          fontSize: 64,
          textTransform: "uppercase",
          opacity: titleO,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
          lineHeight: 1.05,
        }}
      >
        One World<br />Morocco
      </div>
      <div
        style={{
          marginTop: 28,
          width: 900,
          textAlign: "center",
          fontFamily: body,
          fontWeight: 400,
          color: COLORS.gold,
          fontSize: 30,
          letterSpacing: 1,
          opacity: subO,
        }}
      >
        Le premier écosystème numérique éthique
        <br />
        dédié à l'économie locale.
      </div>
    </AbsoluteFill>
  );
};

const SceneMission: React.FC = () => {
  const frame = useCurrentFrame();
  const words = ["Transformons", "chaque", "transaction", "en impact", "POSITIF."];
  const out = 1 - ease(frame, 105, 120);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 90, opacity: out }}>
      <div
        style={{
          fontFamily: display,
          fontWeight: 700,
          color: COLORS.cream,
          fontSize: 96,
          lineHeight: 1.05,
          textAlign: "center",
        }}
      >
        {words.map((w, i) => {
          const start = i * 8;
          const o = ease(frame, start, start + 18);
          const y = interpolate(o, [0, 1], [40, 0]);
          const isAccent = w === "POSITIF.";
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: o,
                transform: `translateY(${y}px)`,
                color: isAccent ? COLORS.terracotta : COLORS.cream,
                marginRight: 18,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Pillar: React.FC<{ big: string; title: string; text: string; delay: number; color: string }> = ({
  big,
  title,
  text,
  delay,
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  const y = interpolate(s, [0, 1], [80, 0]);
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${y}px)`,
        textAlign: "center",
        padding: "32px 24px",
        borderTop: `1px solid ${COLORS.gold}33`,
        borderBottom: `1px solid ${COLORS.gold}33`,
        marginBottom: 24,
      }}
    >
      <div style={{ fontFamily: display, fontWeight: 700, fontSize: 140, color, lineHeight: 1 }}>{big}</div>
      <div
        style={{
          fontFamily: display,
          fontWeight: 600,
          fontSize: 42,
          color: COLORS.cream,
          marginTop: 12,
          letterSpacing: 1,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: body,
          fontWeight: 400,
          fontSize: 26,
          color: COLORS.bone,
          marginTop: 12,
          lineHeight: 1.35,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const ScenePillars: React.FC = () => {
  const frame = useCurrentFrame();
  const out = 1 - ease(frame, 135, 150);
  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center", opacity: out }}>
      <Pillar
        delay={0}
        big="0"
        color={COLORS.terracotta}
        title="Zéro Commission"
        text="Vous gardez l'intégralité de votre chiffre d'affaires."
      />
      <Pillar
        delay={18}
        big="∞"
        color={COLORS.gold}
        title="Abonnement Mensuel"
        text="Transparent, prévisible — sans intermédiaire prédateur."
      />
      <Pillar
        delay={36}
        big="20%"
        color={COLORS.terracotta}
        title="Reversés"
        text="À des causes humanitaires au Maroc, via séquestre bancaire."
      />
    </AbsoluteFill>
  );
};

const SceneCompare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleO = ease(frame, 0, 18);
  const leftS = spring({ frame: frame - 18, fps, config: { damping: 18 } });
  const rightS = spring({ frame: frame - 36, fps, config: { damping: 18 } });
  const out = 1 - ease(frame, 105, 120);
  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center", alignItems: "center", opacity: out }}>
      <div
        style={{
          opacity: titleO,
          fontFamily: display,
          fontWeight: 600,
          color: COLORS.cream,
          fontSize: 52,
          textAlign: "center",
          letterSpacing: 1,
          marginBottom: 80,
        }}
      >
        Un modèle inversé.
      </div>
      <div
        style={{
          opacity: leftS,
          transform: `translateY(${interpolate(leftS, [0, 1], [60, 0])}px)`,
          textAlign: "center",
          marginBottom: 100,
        }}
      >
        <div style={{ fontFamily: body, color: COLORS.bone, fontSize: 28, letterSpacing: 2, textTransform: "uppercase" }}>
          One World Morocco
        </div>
        <div style={{ fontFamily: display, fontWeight: 700, color: COLORS.gold, fontSize: 160, lineHeight: 1 }}>
          ≈ 1,75%
        </div>
        <div style={{ fontFamily: body, color: COLORS.cream, fontSize: 26, marginTop: 8 }}>
          du CA · zéro commission
        </div>
      </div>
      <div
        style={{
          opacity: rightS,
          transform: `translateY(${interpolate(rightS, [0, 1], [60, 0])}px)`,
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: body, color: COLORS.bone, fontSize: 26, letterSpacing: 2, textTransform: "uppercase" }}>
          Plateformes classiques
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            color: COLORS.terracotta,
            fontSize: 140,
            lineHeight: 1,
            textDecoration: "line-through",
            textDecorationThickness: 6,
          }}
        >
          jusqu'à 25%
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneCities: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleO = ease(frame, 0, 18);
  const mS = spring({ frame: frame - 15, fps, config: { damping: 18 } });
  const eS = spring({ frame: frame - 30, fps, config: { damping: 18 } });
  const tagO = ease(frame, 50, 70);
  const out = 1 - ease(frame, 75, 90);
  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center", alignItems: "center", opacity: out }}>
      <div
        style={{
          opacity: titleO,
          fontFamily: body,
          color: COLORS.gold,
          fontSize: 28,
          letterSpacing: 6,
          textTransform: "uppercase",
          marginBottom: 50,
        }}
      >
        Villes pionnières
      </div>
      <div
        style={{
          opacity: mS,
          transform: `translateX(${interpolate(mS, [0, 1], [-80, 0])}px)`,
          fontFamily: display,
          fontWeight: 700,
          color: COLORS.cream,
          fontSize: 110,
          lineHeight: 1.05,
        }}
      >
        Marrakech
      </div>
      <div
        style={{
          opacity: eS,
          transform: `translateX(${interpolate(eS, [0, 1], [80, 0])}px)`,
          fontFamily: display,
          fontWeight: 700,
          color: COLORS.cream,
          fontSize: 110,
          lineHeight: 1.05,
        }}
      >
        Essaouira
      </div>
      <div
        style={{
          marginTop: 60,
          opacity: tagO,
          fontFamily: body,
          color: COLORS.bone,
          fontSize: 30,
          fontStyle: "italic",
        }}
      >
        Du Maroc vers le reste du Monde.
      </div>
    </AbsoluteFill>
  );
};

const SceneTiers: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleO = ease(frame, 0, 18);
  const tiers = ["Micro", "Intermédiaire", "Premium", "Branding"];
  const out = 1 - ease(frame, 135, 150);
  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center", alignItems: "center", opacity: out }}>
      <div
        style={{
          opacity: titleO,
          fontFamily: body,
          color: COLORS.gold,
          fontSize: 26,
          letterSpacing: 6,
          textTransform: "uppercase",
        }}
      >
        Adhésion professionnelle
      </div>
      <div
        style={{
          opacity: titleO,
          marginTop: 24,
          fontFamily: display,
          fontWeight: 700,
          color: COLORS.cream,
          fontSize: 72,
          textAlign: "center",
          lineHeight: 1.05,
        }}
      >
        Un engagement,<br />quatre paliers.
      </div>

      <div style={{ marginTop: 70, width: "100%" }}>
        {tiers.map((t, i) => {
          const s = spring({ frame: frame - (24 + i * 12), fps, config: { damping: 18 } });
          const y = interpolate(s, [0, 1], [40, 0]);
          return (
            <div
              key={t}
              style={{
                opacity: s,
                transform: `translateY(${y}px)`,
                fontFamily: display,
                fontWeight: 600,
                fontSize: 56,
                color: COLORS.cream,
                textAlign: "center",
                padding: "18px 0",
                borderBottom: `1px solid ${COLORS.gold}44`,
              }}
            >
              {t}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const SceneClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const iconS = spring({ frame, fps, config: { damping: 14 } });
  const lineO = ease(frame, 18, 36);
  const ctaS = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Img
        src={staticFile("images/app-icon-1wm.png")}
        style={{ width: 220, height: 220, transform: `scale(${interpolate(iconS, [0, 1], [0.7, 1])})`, opacity: iconS }}
      />
      <div
        style={{
          opacity: lineO,
          marginTop: 36,
          fontFamily: display,
          fontWeight: 700,
          color: COLORS.cream,
          fontSize: 64,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        Rejoignez<br />le mouvement.
      </div>
      <div
        style={{
          opacity: ctaS,
          marginTop: 40,
          fontFamily: body,
          color: COLORS.gold,
          fontSize: 30,
          letterSpacing: 3,
        }}
      >
        oneworldmorocco.com
      </div>
    </AbsoluteFill>
  );
};

export const CorporateVertical: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.night }}>
      <Background />
      <Sequence from={0} durationInFrames={90}><SceneOpen /></Sequence>
      <Sequence from={90} durationInFrames={120}><SceneMission /></Sequence>
      <Sequence from={210} durationInFrames={150}><ScenePillars /></Sequence>
      <Sequence from={360} durationInFrames={120}><SceneCompare /></Sequence>
      <Sequence from={480} durationInFrames={90}><SceneCities /></Sequence>
      <Sequence from={570} durationInFrames={150}><SceneTiers /></Sequence>
      <Sequence from={720} durationInFrames={120}><SceneClose /></Sequence>
    </AbsoluteFill>
  );
};
