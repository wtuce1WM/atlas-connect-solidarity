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
import { V } from "../tokens";

const { palette, hexA, type: T, space, scrim, motion, layout } = V;

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
    <AbsoluteFill style={{ backgroundColor: palette.ink }}>
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
        <AbsoluteFill style={{ background: scrim("right", 0.25, 0.85) }} />
      </div>

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: `0 ${layout.safe.horizontal.x}px 0 calc(55% + ${space[13]}px)`,
        }}
      >
        <div
          style={{
            opacity: interpolate(frame, [10, 30, 105, 120], [0, 1, 1, 0]),
            fontFamily: T.family.body,
            color: palette.gold,
            letterSpacing: T.tracking.spaced,
            fontSize: 14,
            textTransform: "uppercase",
            marginBottom: space[7],
          }}
        >
          Un guide qui vous connaît
        </div>

        <div
          style={{
            opacity: interpolate(frame, [20, 45, 105, 120], [0, 1, 1, 0]),
            transform: `translateY(${interpolate(frame, [20, 45], [20, 0], { extrapolateRight: "clamp" })}px)`,
            fontFamily: T.family.display,
            color: palette.cream,
            fontWeight: T.weight.light,
            fontSize: 64,
            lineHeight: T.leading.snug,
            marginBottom: space[10],
            maxWidth: 720,
          }}
        >
          Demandez.{" "}
          <span style={{ fontStyle: "italic", color: palette.terracotta }}>
            Le Maroc répond.
          </span>
        </div>

        {STATS.map((s, i) => {
          const d = 35 + i * motion.stagger.base;
          const op = spring({ frame: frame - d, fps, config: motion.springs.soft });
          return (
            <div
              key={s.label}
              style={{
                opacity: op * interpolate(frame, [0, 1, 105, 120], [1, 1, 1, 0]),
                transform: `translateY(${interpolate(op, [0, 1], [20, 0])}px)`,
                display: "flex",
                alignItems: "baseline",
                gap: space[6],
                marginBottom: space[5],
                borderTop: `${layout.rule.hairline}px solid ${hexA("gold", 0.2)}`,
                paddingTop: space[4],
                width: 600,
              }}
            >
              <div
                style={{
                  fontFamily: T.family.display,
                  color: palette.gold,
                  fontWeight: T.weight.medium,
                  fontSize: T.size.h3,
                  minWidth: 180,
                }}
              >
                {s.num}
              </div>
              <div
                style={{
                  fontFamily: T.family.body,
                  color: palette.bone,
                  fontSize: T.size.label,
                  fontWeight: T.weight.light,
                  letterSpacing: T.tracking.wide,
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
