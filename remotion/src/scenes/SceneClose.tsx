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

const { palette, type: T, space, radius, elevation, dropShadow, scrim, motion, layout } = V;

export const SceneClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgScale = interpolate(frame, [0, 120], [1.15, 1.05]);
  const hamsaIn = spring({ frame, fps, config: motion.springs.snappy });
  const hamsaScale = interpolate(hamsaIn, [0, 1], [0.7, 1]);

  const titleOp = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [20, 50], [20, 0], { extrapolateRight: "clamp" });

  const lineW = interpolate(frame, [40, 80], [0, 460], { extrapolateRight: "clamp" });

  const urlOp = interpolate(frame, [55, 80], [0, 1], { extrapolateRight: "clamp" });
  const urlY = interpolate(frame, [55, 80], [14, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: palette.night, overflow: "hidden" }}>
      <Img
        src={staticFile("images/koutoubia.webp")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${bgScale})`,
          opacity: 0.55,
        }}
      />
      <AbsoluteFill style={{ background: scrim("center", 0.35, 0.95) }} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            transform: `scale(${hamsaScale})`,
            opacity: hamsaIn,
            filter: dropShadow(elevation.glowGold),
            marginBottom: space[9],
          }}
        >
          <Img
            src={staticFile("images/hamsa.webp")}
            style={{ width: 140, height: 140, borderRadius: radius.lg }}
          />
        </div>

        <div
          style={{
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            fontFamily: T.family.display,
            color: palette.cream,
            fontWeight: T.weight.light,
            fontSize: T.size.h1,
            letterSpacing: T.tracking.normal,
            lineHeight: T.leading.tight,
          }}
        >
          One <span style={{ fontStyle: "italic", color: palette.gold }}>World</span> Morocco
        </div>

        <div
          style={{
            marginTop: space[8],
            width: lineW,
            height: layout.rule.hairline,
            backgroundColor: palette.gold,
          }}
        />

        <div
          style={{
            marginTop: space[7],
            opacity: urlOp,
            transform: `translateY(${urlY}px)`,
            fontFamily: T.family.body,
            color: palette.bone,
            letterSpacing: T.tracking.tracked,
            fontSize: 20,
            textTransform: "uppercase",
            fontWeight: T.weight.regular,
          }}
        >
          oneworldmorocco.com
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
