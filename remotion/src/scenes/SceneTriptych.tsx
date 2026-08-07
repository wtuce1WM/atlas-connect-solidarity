import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { V } from "../tokens";

const { palette, hexA, type: T, space, scrim, motion, layout } = V;

const PANELS: { bg: string; word: string; tone: string }[] = [
  { bg: layout.surfaces.columnEmber, word: "Découvrir", tone: palette.gold },
  { bg: layout.surfaces.columnSoft, word: "Vivre", tone: palette.cream },
  { bg: layout.surfaces.columnHot, word: "Partager", tone: palette.terracotta },
];

export const SceneTriptych: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: palette.night, flexDirection: "row" }}>
      {PANELS.map((p, i) => {
        const delay = i * motion.stagger.tight;
        const reveal = spring({
          frame: frame - delay,
          fps,
          config: motion.springs.reveal,
        });
        const wordIn = spring({
          frame: frame - delay - motion.stagger.loose,
          fps,
          config: motion.springs.quick,
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
            <AbsoluteFill style={{ background: scrim("bottom", 0.15, 0.85) }} />
            <AbsoluteFill
              style={{
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
                padding: `0 0 ${space[14]}px 0`,
              }}
            >
              <div
                style={{
                  opacity: interpolate(wordIn, [0, 1], [0, 1]),
                  transform: `translateY(${wordY}px)`,
                  fontFamily: T.family.body,
                  color: palette.bone,
                  letterSpacing: T.tracking.spaced,
                  fontSize: T.size.micro,
                  textTransform: "uppercase",
                  marginBottom: space[3],
                }}
              >
                0{i + 1}
              </div>
              <div
                style={{
                  opacity: interpolate(wordIn, [0, 1], [0, 1]),
                  transform: `translateY(${wordY}px)`,
                  fontFamily: T.family.display,
                  color: p.tone,
                  fontWeight: T.weight.semibold,
                  fontSize: 78,
                  lineHeight: T.leading.tight,
                  letterSpacing: T.tracking.snug,
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
                  width: layout.rule.hairline,
                  height: "100%",
                  background: `linear-gradient(180deg, transparent, ${hexA("gold", 0.33)}, transparent)`,
                }}
              />
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
