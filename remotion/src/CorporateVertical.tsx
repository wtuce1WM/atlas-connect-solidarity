import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  Img,
} from "remotion";
import { V } from "./tokens";

const { palette: C, type: T, space, motion: M, layout } = V;

export const CORP_TOTAL_FRAMES = 840; // 28s at 30fps

// ---------- helpers ----------
const ease = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// ---------- persistent background ----------
const Background: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: layout.surfaces.brownVertical }} />
      <AbsoluteFill style={{ background: layout.surfaces.corporateGlow }} />
    </AbsoluteFill>
  );
};

// ---------- scenes ----------
const SceneOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const iconSpring = spring({ frame, fps, config: M.springs.hero });
  const iconScale = interpolate(iconSpring, [0, 1], [0.6, 1]);
  const titleY = interpolate(
    spring({ frame: frame - M.stagger.loose, fps, config: M.springs.gentle }),
    [0, 1],
    [space[8], 0],
  );
  const titleO = ease(frame, M.stagger.loose, 40);
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
          marginTop: space[9],
          fontFamily: T.family.display,
          fontWeight: T.weight.bold,
          letterSpacing: T.tracking.wide,
          color: C.cream,
          fontSize: T.size.h3xl,
          textTransform: "uppercase",
          opacity: titleO,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
          lineHeight: T.leading.snug,
        }}
      >
        One World<br />Morocco
      </div>
      <div
        style={{
          marginTop: space[6],
          width: 900,
          textAlign: "center",
          fontFamily: T.family.body,
          fontWeight: T.weight.regular,
          color: C.gold,
          fontSize: T.size.body,
          letterSpacing: T.tracking.normal,
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
  const out = 1 - ease(frame, M.beat.out[0], M.beat.out[1]);
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", padding: space[13], opacity: out }}
    >
      <div
        style={{
          fontFamily: T.family.display,
          fontWeight: T.weight.bold,
          color: C.cream,
          fontSize: T.size.h1,
          lineHeight: T.leading.snug,
          textAlign: "center",
        }}
      >
        {words.map((w, i) => {
          const start = i * M.stagger.tight;
          const o = ease(frame, start, start + M.stagger.loose);
          const y = interpolate(o, [0, 1], [space[8], 0]);
          const isAccent = w === "POSITIF.";
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: o,
                transform: `translateY(${y}px)`,
                color: isAccent ? C.terracotta : C.cream,
                marginRight: space[4],
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
  const s = spring({ frame: frame - delay, fps, config: M.springs.gentle });
  const y = interpolate(s, [0, 1], [space[12], 0]);
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${y}px)`,
        textAlign: "center",
        padding: `${space[7]}px ${space[5]}px`,
        borderTop: `${layout.rule.hairline}px solid ${V.hexA("gold", 0.2)}`,
        borderBottom: `${layout.rule.hairline}px solid ${V.hexA("gold", 0.2)}`,
        marginBottom: space[5],
      }}
    >
      <div
        style={{
          fontFamily: T.family.display,
          fontWeight: T.weight.bold,
          fontSize: T.size.displayXl,
          color,
          lineHeight: T.leading.tight,
        }}
      >
        {big}
      </div>
      <div
        style={{
          fontFamily: T.family.display,
          fontWeight: T.weight.semibold,
          fontSize: T.size.h4,
          color: C.cream,
          marginTop: space[3],
          letterSpacing: T.tracking.normal,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: T.family.body,
          fontWeight: T.weight.regular,
          fontSize: T.size.lead,
          color: C.bone,
          marginTop: space[3],
          lineHeight: T.leading.normal,
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
    <AbsoluteFill style={{ padding: space[12], justifyContent: "center", opacity: out }}>
      <Pillar
        delay={0}
        big="0"
        color={C.terracotta}
        title="Zéro Commission"
        text="Vous gardez l'intégralité de votre chiffre d'affaires."
      />
      <Pillar
        delay={M.stagger.loose}
        big="∞"
        color={C.gold}
        title="Abonnement Mensuel"
        text="Transparent, prévisible — sans intermédiaire prédateur."
      />
      <Pillar
        delay={M.stagger.loose * 2}
        big="20%"
        color={C.terracotta}
        title="Reversés"
        text="À des causes humanitaires au Maroc, via séquestre bancaire."
      />
    </AbsoluteFill>
  );
};

const SceneCompare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleO = ease(frame, 0, M.stagger.loose);
  const leftS = spring({ frame: frame - M.stagger.loose, fps, config: M.springs.gentle });
  const rightS = spring({ frame: frame - M.stagger.loose * 2, fps, config: M.springs.gentle });
  const out = 1 - ease(frame, M.beat.out[0], M.beat.out[1]);
  return (
    <AbsoluteFill
      style={{ padding: space[12], justifyContent: "center", alignItems: "center", opacity: out }}
    >
      <div
        style={{
          opacity: titleO,
          fontFamily: T.family.display,
          fontWeight: T.weight.semibold,
          color: C.cream,
          fontSize: T.size.h3,
          textAlign: "center",
          letterSpacing: T.tracking.normal,
          marginBottom: space[12],
        }}
      >
        Un modèle inversé.
      </div>
      <div
        style={{
          opacity: leftS,
          transform: `translateY(${interpolate(leftS, [0, 1], [space[10], 0])}px)`,
          textAlign: "center",
          marginBottom: space[13],
        }}
      >
        <div
          style={{
            fontFamily: T.family.body,
            color: C.bone,
            fontSize: T.size.lead,
            letterSpacing: T.tracking.wide,
            textTransform: "uppercase",
          }}
        >
          One World Morocco
        </div>
        <div
          style={{
            fontFamily: T.family.display,
            fontWeight: T.weight.bold,
            color: C.gold,
            fontSize: T.size.hero,
            lineHeight: T.leading.tight,
          }}
        >
          ≈ 1,75%
        </div>
        <div
          style={{
            fontFamily: T.family.body,
            color: C.cream,
            fontSize: T.size.lead,
            marginTop: space[2],
          }}
        >
          du CA · zéro commission
        </div>
      </div>
      <div
        style={{
          opacity: rightS,
          transform: `translateY(${interpolate(rightS, [0, 1], [space[10], 0])}px)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: T.family.body,
            color: C.bone,
            fontSize: T.size.lead,
            letterSpacing: T.tracking.wide,
            textTransform: "uppercase",
          }}
        >
          Plateformes classiques
        </div>
        <div
          style={{
            fontFamily: T.family.display,
            fontWeight: T.weight.bold,
            color: C.terracotta,
            fontSize: T.size.displayXl,
            lineHeight: T.leading.tight,
            textDecoration: "line-through",
            textDecorationThickness: layout.rule.thick * 3,
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
  const titleO = ease(frame, 0, M.stagger.loose);
  const mS = spring({ frame: frame - M.stagger.base, fps, config: M.springs.gentle });
  const eS = spring({ frame: frame - M.stagger.base * 2, fps, config: M.springs.gentle });
  const tagO = ease(frame, 50, 70);
  const out = 1 - ease(frame, 75, 90);
  return (
    <AbsoluteFill
      style={{ padding: space[12], justifyContent: "center", alignItems: "center", opacity: out }}
    >
      <div
        style={{
          opacity: titleO,
          fontFamily: T.family.body,
          color: C.gold,
          fontSize: T.size.lead,
          letterSpacing: T.tracking.tracked,
          textTransform: "uppercase",
          marginBottom: space[9],
        }}
      >
        Villes pionnières
      </div>
      <div
        style={{
          opacity: mS,
          transform: `translateX(${interpolate(mS, [0, 1], [-space[12], 0])}px)`,
          fontFamily: T.family.display,
          fontWeight: T.weight.bold,
          color: C.cream,
          fontSize: T.size.h1xl,
          lineHeight: T.leading.snug,
        }}
      >
        Marrakech
      </div>
      <div
        style={{
          opacity: eS,
          transform: `translateX(${interpolate(eS, [0, 1], [space[12], 0])}px)`,
          fontFamily: T.family.display,
          fontWeight: T.weight.bold,
          color: C.cream,
          fontSize: T.size.h1xl,
          lineHeight: T.leading.snug,
        }}
      >
        Essaouira
      </div>
      <div
        style={{
          marginTop: space[10],
          opacity: tagO,
          fontFamily: T.family.body,
          color: C.bone,
          fontSize: T.size.body,
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
  const titleO = ease(frame, 0, M.stagger.loose);
  const tiers = ["Micro", "Intermédiaire", "Premium", "Branding"];
  const out = 1 - ease(frame, 135, 150);
  return (
    <AbsoluteFill
      style={{ padding: space[12], justifyContent: "center", alignItems: "center", opacity: out }}
    >
      <div
        style={{
          opacity: titleO,
          fontFamily: T.family.body,
          color: C.gold,
          fontSize: T.size.lead,
          letterSpacing: T.tracking.tracked,
          textTransform: "uppercase",
        }}
      >
        Adhésion professionnelle
      </div>
      <div
        style={{
          opacity: titleO,
          marginTop: space[5],
          fontFamily: T.family.display,
          fontWeight: T.weight.bold,
          color: C.cream,
          fontSize: T.size.h2,
          textAlign: "center",
          lineHeight: T.leading.snug,
        }}
      >
        Un engagement,<br />quatre paliers.
      </div>

      <div style={{ marginTop: space[11], width: "100%" }}>
        {tiers.map((t, i) => {
          const s = spring({
            frame: frame - (space[5] + i * M.stagger.base),
            fps,
            config: M.springs.gentle,
          });
          const y = interpolate(s, [0, 1], [space[8], 0]);
          return (
            <div
              key={t}
              style={{
                opacity: s,
                transform: `translateY(${y}px)`,
                fontFamily: T.family.display,
                fontWeight: T.weight.semibold,
                fontSize: T.size.h3,
                color: C.cream,
                textAlign: "center",
                padding: `${space[4]}px 0`,
                borderBottom: `${layout.rule.hairline}px solid ${V.hexA("gold", 0.27)}`,
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
  const iconS = spring({ frame, fps, config: M.springs.hero });
  const lineO = ease(frame, M.stagger.loose, 36);
  const ctaS = spring({ frame: frame - M.dur.slow, fps, config: M.springs.hero });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Img
        src={staticFile("images/app-icon-1wm.png")}
        style={{
          width: 220,
          height: 220,
          transform: `scale(${interpolate(iconS, [0, 1], [0.7, 1])})`,
          opacity: iconS,
        }}
      />
      <div
        style={{
          opacity: lineO,
          marginTop: space[7],
          fontFamily: T.family.display,
          fontWeight: T.weight.bold,
          color: C.cream,
          fontSize: T.size.h3xl,
          letterSpacing: T.tracking.wide,
          textTransform: "uppercase",
          textAlign: "center",
          lineHeight: T.leading.snug,
        }}
      >
        Rejoignez<br />le mouvement.
      </div>
      <div
        style={{
          opacity: ctaS,
          marginTop: space[8],
          fontFamily: T.family.body,
          color: C.gold,
          fontSize: T.size.body,
          letterSpacing: T.tracking.wide,
        }}
      >
        oneworldmorocco.com
      </div>
    </AbsoluteFill>
  );
};

export const CorporateVertical: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
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
