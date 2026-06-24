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
      {/* gold ring */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "absolute",
            top: "calc(50% - 240px)",
            width: 360,
            height: 360,
            borderRadius: "50%",
            border: `1px solid ${COLORS.gold}55`,
            transform: `scale(${interpolate(frame, [0, 90], [0.7, 1.05])})`,
            opacity: interpolate(frame, [10, 40, 100, 118], [0, 1, 1, 0]),
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "calc(50% - 210px)",
            width: 300,
            height: 300,
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
            transform: `translateY(-120px) scale(${hamsaScale})`,
            opacity: hamsaOpacity,
            filter: "drop-shadow(0 12px 40px rgba(212,175,55,0.35))",
          }}
        >
          <Img
            src={staticFile("images/hamsa-gold.png")}
            style={{ width: 200, height: "auto" }}
          />
        </div>

        <div
          style={{
            marginTop: 60,
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
            marginTop: 40,
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            fontFamily: sans,
            color: COLORS.bone,
            letterSpacing: "0.5em",
            fontSize: 18,
            fontWeight: 300,
            textTransform: "uppercase",
          }}
        >
          Présente
        </div>

        <div
          style={{
            marginTop: 14,
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            fontFamily: serif,
            color: COLORS.cream,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 48,
          }}
        >
          un voyage au Maroc
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
