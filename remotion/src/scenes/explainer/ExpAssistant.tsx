// Scène 5/8 — ASSISTANT IA / CONCIERGE LOCAL
// Capture RÉELLE de /embed/ask/lola-sky-lounge : question posée et réponse produite
// par le moteur IA de production (186 adresses actives à moins de 1 km).
import React from "react";
import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { palette, alpha, hexA } from "../../tokens/palette";
import { display, body } from "../../tokens/type";
import { ExpBackground, ExpHeader, ExpKeyMessage, ExpBrowserFrame } from "./ExpChrome";

export const ASSISTANT_FRAMES = 300;

const FACTS = [
  ["24/7", "disponible en continu"],
  ["Texte & voix", "deux modes d'entrée"],
  ["Vos données", "services, offres, vidéos"],
];

export const ExpAssistant: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const frameIn = spring({ frame: frame - 12, fps, config: { damping: 18, stiffness: 80 } });
  // Scroll lent de la capture pour dérouler la réponse réelle.
  const scroll = interpolate(frame, [55, 250], [-30, -520], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <ExpBackground />
      <ExpHeader index={5} kicker="Assistant IA" title={"Un concierge IA\npropre à votre établissement"} />

      <div
        style={{
          position: "absolute",
          right: 120,
          top: 130,
          opacity: frameIn,
          transform: `translateY(${(1 - frameIn) * 60}px) scale(${0.96 + frameIn * 0.04})`,
        }}
      >
        <ExpBrowserFrame
          src={staticFile("explainer/shots/ask.png")}
          width={840}
          height={820}
          label="oneworldmorocco.com/embed/ask"
          offsetY={scroll}
          imageScale={1.12}
        />
      </div>

      <div style={{ position: "absolute", left: 96, top: 480, width: 640 }}>
        {FACTS.map(([k, v], i) => {
          const t = spring({ frame: frame - 70 - i * 16, fps, config: { damping: 20, stiffness: 110 } });
          return (
            <div
              key={k}
              style={{
                opacity: t,
                transform: `translateY(${(1 - t) * 22}px)`,
                marginBottom: 34,
                borderLeft: `2px solid ${hexA("terracotta", 0.8)}`,
                paddingLeft: 22,
              }}
            >
              <div style={{ fontFamily: display, fontWeight: 600, fontSize: 46, color: palette.cream }}>{k}</div>
              <div style={{ fontFamily: body, fontSize: 24, color: alpha("cream", 0.6), marginTop: 6 }}>{v}</div>
            </div>
          );
        })}
      </div>

      <ExpKeyMessage text="Un concierge IA propre à votre établissement, disponible 24/7." from={190} />
    </AbsoluteFill>
  );
};
