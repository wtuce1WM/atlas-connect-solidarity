import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, display, body } from "../theme";

const PANELS: { bg: string; word: string; tone: string }[] = [
  { bg: "linear-gradient(160deg, #2a1a0e 0%, #0e0b08 100%)", word: "Découvrir", tone: COLORS.gold },
  { bg: "linear-gradient(160deg, #1c1612 0%, #0e0b08 100%)", word: "Vivre", tone: COLORS.cream },
  { bg: "linear-gradient(160deg, #2a0f08 0%, #0e0b08 100%)", word: "Partager", tone: COLORS.terracotta },
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

        return (
          <div
            key={p.word}
            style={{
              flex: 1,
              position: "relative",
              overflow: "hidden",
              clipPath: `inset(${(1 - reveal) * 100}% 0 0 0)`,
              background: p.bg,
            }}
          >
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
                  fontFamily: body,
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
                  fontFamily: display,
                  color: p.tone,
                  fontWeight: 600,
                  fontSize: 78,
                  lineHeight: 1,
                  letterSpacing: "-0.01em",
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
                  background: `linear-gradient(180deg, transparent, ${COLORS.gold}55, transparent)`,
                }}
              />
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
