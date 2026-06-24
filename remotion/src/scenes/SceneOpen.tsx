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
import { COLORS, display, body } from "../theme";

export const SceneOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hamsaIn = spring({ frame, fps, config: { damping: 22, stiffness: 90 } });
  const hamsaScale = interpolate(hamsaIn, [0, 1], [0.6, 1]);
  const hamsaOpacity = interpolate(frame, [0, 25, 90, 118], [0, 1, 1, 0]);

  const lineOpacity = interpolate(frame, [20, 45, 100, 118], [0, 1, 1, 0]);
  const lineScale = interpolate(frame, [20, 60], [0, 1], { extrapolateRight: "clamp" });

  const subOpacity = interpolate(frame, [55, 80, 100, 118], [0, 1, 1, 0]);
  const subY = interpolate(frame, [55, 80], [12, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.night,
        background: `radial-gradient(ellipse at 50% 40%, #1c150d 0%, ${COLORS.night} 70%)`,
      }}
    >
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "absolute",
            top: "calc(50% - 250px)",
            width: 380,
            height: 380,
            borderRadius: "50%",
            border: `1px solid ${COLORS.gold}55`,
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
            borderRadius: "50%",
            border: `1px solid ${COLORS.gold}88`,
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
            filter: "drop-shadow(0 14px 48px rgba(192,79,23,0.45))",
          }}
        >
          <Img
            src={staticFile("images/app-icon-1wm.webp")}
            style={{ width: 240, height: 240, borderRadius: 56 }}
          />
        </div>

        <div
          style={{
            marginTop: 70,
            opacity: lineOpacity,
            transform: `scaleX(${lineScale})`,
            transformOrigin: "center",
            width: 320,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`,
          }}
        />

        <div
          style={{
            marginTop: 38,
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            fontFamily: body,
            color: COLORS.bone,
            letterSpacing: "0.5em",
            fontSize: 16,
            fontWeight: 400,
            textTransform: "uppercase",
          }}
        >
          One World Morocco
        </div>

        <div
          style={{
            marginTop: 16,
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            fontFamily: display,
            color: COLORS.cream,
            fontWeight: 300,
            fontSize: 42,
            letterSpacing: "0.02em",
          }}
        >
          Un voyage au Maroc
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
