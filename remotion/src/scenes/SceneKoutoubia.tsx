import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { COLORS, display, body } from "../theme";

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
    <AbsoluteFill style={{ backgroundColor: COLORS.night, overflow: "hidden" }}>
      <Img
        src={staticFile("images/home-bg.webp")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${x}px)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(14,11,8,0.85) 0%, rgba(14,11,8,0.55) 45%, rgba(14,11,8,0.15) 100%)",
        }}
      />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "0 140px",
        }}
      >
        <div
          style={{
            opacity: kickerOp,
            fontFamily: body,
            color: COLORS.gold,
            letterSpacing: "0.6em",
            fontSize: 16,
            fontWeight: 400,
            textTransform: "uppercase",
            marginBottom: 26,
          }}
        >
          Marrakech · Atlas · Sahara · Atlantique
        </div>

        <div
          style={{
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            fontFamily: display,
            color: COLORS.cream,
            fontWeight: 300,
            fontSize: 128,
            lineHeight: 0.98,
            letterSpacing: "-0.02em",
          }}
        >
          Votre Maroc,
        </div>
        <div
          style={{
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            fontFamily: display,
            color: COLORS.terracotta,
            fontWeight: 600,
            fontSize: 128,
            lineHeight: 0.98,
            letterSpacing: "-0.02em",
            marginTop: 6,
          }}
        >
          sur mesure.
        </div>

        <div
          style={{
            marginTop: 40,
            width: lineW,
            height: 2,
            backgroundColor: COLORS.gold,
            opacity: kickerOp,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
