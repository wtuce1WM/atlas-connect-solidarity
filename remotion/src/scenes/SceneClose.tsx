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

export const SceneClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgScale = interpolate(frame, [0, 120], [1.15, 1.05]);
  const hamsaIn = spring({ frame, fps, config: { damping: 22, stiffness: 90 } });
  const hamsaScale = interpolate(hamsaIn, [0, 1], [0.7, 1]);

  const titleOp = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [20, 50], [20, 0], { extrapolateRight: "clamp" });

  const lineW = interpolate(frame, [40, 80], [0, 460], { extrapolateRight: "clamp" });

  const urlOp = interpolate(frame, [55, 80], [0, 1], { extrapolateRight: "clamp" });
  const urlY = interpolate(frame, [55, 80], [14, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.night, overflow: "hidden" }}>
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
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(14,11,8,0.35) 0%, rgba(14,11,8,0.95) 80%)",
        }}
      />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            transform: `scale(${hamsaScale})`,
            opacity: hamsaIn,
            filter: "drop-shadow(0 8px 32px rgba(212,175,55,0.5))",
            marginBottom: 50,
          }}
        >
          <Img
            src={staticFile("images/hamsa.webp")}
            style={{ width: 140, height: 140, borderRadius: 28 }}
          />
        </div>

        <div
          style={{
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            fontFamily: serif,
            color: COLORS.cream,
            fontWeight: 300,
            fontSize: 96,
            letterSpacing: "0.02em",
            lineHeight: 1,
          }}
        >
          One <span style={{ fontStyle: "italic", color: COLORS.gold }}>World</span> Morocco
        </div>

        <div
          style={{
            marginTop: 36,
            width: lineW,
            height: 1,
            backgroundColor: COLORS.gold,
          }}
        />

        <div
          style={{
            marginTop: 32,
            opacity: urlOp,
            transform: `translateY(${urlY}px)`,
            fontFamily: sans,
            color: COLORS.bone,
            letterSpacing: "0.45em",
            fontSize: 20,
            textTransform: "uppercase",
            fontWeight: 400,
          }}
        >
          oneworldmorocco.com
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
