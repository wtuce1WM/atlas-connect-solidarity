import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { V } from "./tokens";
import { SceneOpen } from "./scenes/SceneOpen";
import { SceneKoutoubia } from "./scenes/SceneKoutoubia";
import { SceneTriptych } from "./scenes/SceneTriptych";
import { SceneAgent } from "./scenes/SceneAgent";
import { SceneClose } from "./scenes/SceneClose";

const SCENE = 120;
const T = 18;

export const TOTAL_FRAMES = SCENE * 5 - T * 4; // 520 frames @ 30fps = 17.3s

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: V.palette.night }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <SceneOpen />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <SceneKoutoubia />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <SceneTriptych />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <SceneAgent />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <SceneClose />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* vignette persistante */}
      <AbsoluteFill
        style={{
          background: V.vignette(0.55),
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
