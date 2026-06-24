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

const STATS = [
  { num: "1 200+", label: "lieux d'exception" },
  { num: "60", label: "villes & villages" },
  { num: "1", label: "agent IA personnel" },
];

export const SceneAgent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgScale = interpolate(frame, [0, 120], [1.1, 1.2]);
  const imgX = interpolate(frame, [0, 120], [10, -30]);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "55%",
          overflow: "hidden",
        }}
      >
        <Img
          src={staticFile("images/marrakech.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${imgScale}) translateX(${imgX}px)`,
          }}
        />
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(90deg, rgba(14,11,8,0.25) 0%, rgba(14,11,8,0.85) 100%)",
          }}
        />
      </div>

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "0 140px 0 calc(55% + 90px)",
        }}
      >
        <div
          style={{
            opacity: interpolate(frame, [10, 30, 105, 120], [0, 1, 1, 0]),
            fontFamily: sans,
            color: COLORS.gold,
            letterSpacing: "0.5em",
            fontSize: 14,
            textTransform: "uppercase",
            marginBottom: 30,
          }}
        >
          Un guide qui vous connaît
        </div>

        <div
          style={{
            opacity: interpolate(frame, [20, 45, 105, 120], [0, 1, 1, 0]),
            transform: `translateY(${interpolate(frame, [20, 45], [20, 0], { extrapolateRight: "clamp" })}px)`,
            fontFamily: serif,
            color: COLORS.cream,
            fontWeight: 300,
            fontSize: 64,
            lineHeight: 1.05,
            marginBottom: 60,
            maxWidth: 720,
          }}
        >
          Demandez. <span style={{ fontStyle: "italic", color: COLORS.terracotta }}>Le Maroc répond.</span>
        </div>

        {STATS.map((s, i) => {
          const d = 35 + i * 12;
          const op = spring({ frame: frame - d, fps, config: { damping: 200 } });
          return (
            <div
              key={s.label}
              style={{
                opacity: op * interpolate(frame, [0, 1, 105, 120], [1, 1, 1, 0]),
                transform: `translateY(${interpolate(op, [0, 1], [20, 0])}px)`,
                display: "flex",
                alignItems: "baseline",
                gap: 26,
                marginBottom: 22,
                borderTop: `1px solid ${COLORS.gold}33`,
                paddingTop: 16,
                width: 600,
              }}
            >
              <div
                style={{
                  fontFamily: serif,
                  color: COLORS.gold,
                  fontWeight: 500,
                  fontSize: 56,
                  minWidth: 180,
                }}
              >
                {s.num}
              </div>
              <div
                style={{
                  fontFamily: sans,
                  color: COLORS.bone,
                  fontSize: 18,
                  fontWeight: 300,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
