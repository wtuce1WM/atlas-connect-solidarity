import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { V } from "../tokens";

const { palette, type: T, space, scrim, layout } = V;

export const SceneKoutoubia: React.FC = () => {
  const frame = useCurrentFrame();

  // Ken Burns
  const scale = interpolate(frame, [0, 120], [1.05, 1.18]);
  const x = interpolate(frame, [0, 120], [-20, 20]);

  const titleOp = interpolate(frame, [25, 55, 105, 120], [0, 1, 1, 0]);
  const titleY = interpolate(frame, [25, 55], [30, 0], { extrapolateRight: "clamp" });

  const kickerOp = interpolate(frame, [10, 35, 105, 120], [0, 1, 1, 0]);
  const lineW = interpolate(frame, [40, 90], [0, 220], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: palette.night, overflow: "hidden" }}>
      <Img
        src={staticFile("images/home-bg.webp")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${x}px)`,
        }}
      />
      <AbsoluteFill style={{ background: scrim("left", 0.15, 0.85) }} />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: `0 ${layout.safe.horizontal.x}px`,
        }}
      >
        <div
          style={{
            opacity: kickerOp,
            fontFamily: T.family.body,
            color: palette.gold,
            letterSpacing: T.tracking.ultra,
            fontSize: T.size.kicker,
            fontWeight: T.weight.regular,
            textTransform: "uppercase",
            marginBottom: space[6],
          }}
        >
          Marrakech · Atlas · Sahara · Atlantique
        </div>

        <div
          style={{
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            fontFamily: T.family.display,
            color: palette.cream,
            fontWeight: T.weight.light,
            fontSize: T.size.display,
            lineHeight: T.leading.none,
            letterSpacing: T.tracking.tight,
          }}
        >
          Votre Maroc,
        </div>
        <div
          style={{
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            fontFamily: T.family.display,
            color: palette.terracotta,
            fontWeight: T.weight.semibold,
            fontSize: T.size.display,
            lineHeight: T.leading.none,
            letterSpacing: T.tracking.tight,
            marginTop: 6,
          }}
        >
          sur mesure.
        </div>

        <div
          style={{
            marginTop: space[9],
            width: lineW,
            height: layout.rule.thick,
            backgroundColor: palette.gold,
            opacity: kickerOp,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
