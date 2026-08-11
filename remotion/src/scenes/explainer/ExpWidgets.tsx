// Scène 4/8 — WIDGETS ET MINI-OUTILS EMBARQUÉS
// Captures RÉELLES des routes /embed/weather, /embed/tides, /embed/reviews en production.
import React from "react";
import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { palette, alpha } from "../../tokens/palette";
import { body } from "../../tokens/type";
import { ExpBackground, ExpHeader, ExpKeyMessage, ExpBrowserFrame } from "./ExpChrome";

export const WIDGETS_FRAMES = 240;

const CARDS = [
  { shot: "weather.png", label: "/embed/weather", x: 0, y: 40, rot: -2.5 },
  { shot: "tides.png", label: "/embed/tides", x: 420, y: 0, rot: 1.5 },
  { shot: "reviews.png", label: "/embed/reviews", x: 840, y: 60, rot: -1.2 },
];

export const ExpWidgets: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <ExpBackground />
      <ExpHeader index={4} kicker="Widgets embarqués" title={"Vos outils, sur votre site\ncomme sur 1WM"} />

      <div style={{ position: "absolute", left: 150, top: 330 }}>
        {CARDS.map((c, i) => {
          const t = spring({ frame: frame - 20 - i * 14, fps, config: { damping: 17, stiffness: 85 } });
          const float = Math.sin((frame - i * 30) / 42) * 9;
          return (
            <div
              key={c.shot}
              style={{
                position: "absolute",
                left: c.x,
                top: c.y + float,
                opacity: t,
                transform: `translateY(${(1 - t) * 70}px) rotate(${c.rot}deg) scale(${0.94 + t * 0.06})`,
              }}
            >
              <ExpBrowserFrame
                src={staticFile(`explainer/shots/${c.shot}`)}
                width={380}
                height={470}
                label={c.label}
                imageScale={1}
              />
            </div>
          );
        })}
      </div>

      {/* Destinations d'intégration */}
      <div
        style={{
          position: "absolute",
          right: 110,
          top: 360,
          width: 320,
          opacity: interpolate(frame, [80, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {["Sur votre site", "Sur votre fiche 1WM", "Dans vos articles", "Dans vos vidéos"].map((d, i) => {
          const t = spring({ frame: frame - 85 - i * 10, fps, config: { damping: 20 } });
          return (
            <div
              key={d}
              style={{
                fontFamily: body,
                fontSize: 26,
                color: palette.cream,
                padding: "16px 0",
                borderBottom: `1px solid ${alpha("cream", 0.12)}`,
                opacity: t,
                transform: `translateX(${(1 - t) * 26}px)`,
                display: "flex",
                gap: 14,
                alignItems: "center",
              }}
            >
              <span style={{ color: palette.terracotta }}>—</span>
              {d}
            </div>
          );
        })}
      </div>

      <ExpKeyMessage
        text="1WM devient un fournisseur d'outils numériques, pas seulement un site de référencement."
        from={140}
      />
    </AbsoluteFill>
  );
};
