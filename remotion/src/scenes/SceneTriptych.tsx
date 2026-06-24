import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, serif, sans } from "../theme";

const PANELS: { src: string; word: string; tone: string }[] = [
  { src: "images/idee-cadeau.jpg", word: "Découvrir", tone: COLORS.gold },
  { src: "images/essaouira-sunset.jpg", word: "Vivre", tone: COLORS.cream },
  { src: "images/essaouira-lobster.jpg", word: "Partager", tone: COLORS.terracotta },
];

export const SceneTriptych: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.night, flexDirection: "row" }}>
      {PANELS.map((p, i) => {
        const delay = i * 8;
        const reveal = spring({
          frame: frame - delay,
          fps,
          config: { damping: 200, stiffness: 80 },
        });
        const wordIn = spring({
          frame: frame - delay - 18,
          fps,
          config: { damping: 24, stiffness: 110 },
        });
        const wordY = interpolate(wordIn, [0, 1], [40, 0]);
        const scale = interpolate(frame, [0, 120], [1.08, 1.18]);

        return (
          <div
            key={p.word}
            style={{
              flex: 1,
              position: "relative",
              overflow: "hidden",
              clipPath: `inset(${(1 - reveal) * 100}% 0 0 0)`,
            }}
          >
            <Img
              src={staticFile(p.src)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${scale})`,
              }}
            />
            <AbsoluteFill
              style={{
                background:
                  "linear-gradient(180deg, rgba(14,11,8,0.15) 0%, rgba(14,11,8,0.85) 100%)",
              }}
            />
            <AbsoluteFill
              style={{
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
                padding: "0 0 120px 0",
              }}
            >
              <div
                style={{
                  opacity: interpolate(wordIn, [0, 1], [0, 1]),
                  transform: `translateY(${wordY}px)`,
                  fontFamily: sans,
                  color: COLORS.bone,
                  letterSpacing: "0.5em",
                  fontSize: 12,
                  textTransform: "uppercase",
                  marginBottom: 14,
                }}
              >
                0{i + 1}
              </div>
              <div
                style={{
                  opacity: interpolate(wordIn, [0, 1], [0, 1]),
                  transform: `translateY(${wordY}px)`,
                  fontFamily: serif,
                  color: p.tone,
                  fontStyle: "italic",
                  fontWeight: 400,
                  fontSize: 86,
                  lineHeight: 1,
                }}
              >
                {p.word}
              </div>
            </AbsoluteFill>
            {i < PANELS.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  width: 1,
                  height: "100%",
                  background: `linear-gradient(180deg, transparent, ${COLORS.gold}44, transparent)`,
                }}
              />
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
