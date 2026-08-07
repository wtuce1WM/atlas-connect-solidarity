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

const { palette, hexA, type: T, space, radius, elevation, dropShadow, motion, layout } = V;

export const SceneOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hamsaIn = spring({ frame, fps, config: motion.springs.snappy });
  const hamsaScale = interpolate(hamsaIn, [0, 1], [0.6, 1]);
  const hamsaOpacity = interpolate(frame, [0, 25, 90, 118], [0, 1, 1, 0]);

  const lineOpacity = interpolate(frame, [20, 45, 100, 118], [0, 1, 1, 0]);
  const lineScale = interpolate(frame, [20, 60], [0, 1], { extrapolateRight: "clamp" });

  const subOpacity = interpolate(frame, [55, 80, 100, 118], [0, 1, 1, 0]);
  const subY = interpolate(frame, [55, 80], [12, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.night,
        background: layout.surfaces.glow,
      }}
    >
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "absolute",
            top: "calc(50% - 250px)",
            width: 380,
            height: 380,
            borderRadius: radius.circle,
            border: `${layout.rule.hairline}px solid ${hexA("gold", 0.33)}`,
            transform: `scale(${interpolate(frame, [0, 90], [0.7, 1.05])})`,
            opacity: interpolate(frame, [10, 40, 100, 118], [0, 1, 1, 0]),
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "calc(50% - 215px)",
            width: 310,
            height: 310,
            borderRadius: radius.circle,
            border: `${layout.rule.hairline}px solid ${hexA("gold", 0.53)}`,
            transform: `scale(${interpolate(frame, [0, 90], [0.6, 1])})`,
            opacity: interpolate(frame, [15, 45, 100, 118], [0, 1, 1, 0]),
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            transform: `translateY(-130px) scale(${hamsaScale})`,
            opacity: hamsaOpacity,
            filter: dropShadow(elevation.glowEmber),
          }}
        >
          <Img
            src={staticFile("images/app-icon-1wm.png")}
            style={{ width: 240, height: 240, borderRadius: radius.xl }}
          />
        </div>

        <div
          style={{
            marginTop: space[11],
            opacity: lineOpacity,
            transform: `scaleX(${lineScale})`,
            transformOrigin: "center",
            width: 320,
            height: layout.rule.hairline,
            background: `linear-gradient(90deg, transparent, ${palette.gold}, transparent)`,
          }}
        />

        <div
          style={{
            marginTop: space[8],
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            fontFamily: T.family.body,
            color: palette.bone,
            letterSpacing: T.tracking.spaced,
            fontSize: T.size.kicker,
            fontWeight: T.weight.regular,
            textTransform: "uppercase",
          }}
        >
          One World Morocco
        </div>

        <div
          style={{
            marginTop: space[4],
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            fontFamily: T.family.display,
            color: palette.cream,
            fontWeight: T.weight.light,
            fontSize: T.size.h4,
            letterSpacing: T.tracking.normal,
          }}
        >
          Un voyage au Maroc
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
