// Vidéo explicative affiliés — PILOTE 3 scènes (1/8, 4/8, 5/8) en 1920x1080.
// Toutes les illustrations proviennent réellement de One World Morocco :
// photos/logo/note issues de la base, captures des routes /embed en production.
import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";
import { palette } from "./tokens/palette";
import { ExpProfil, PROFIL_FRAMES } from "./scenes/explainer/ExpProfil";
import { ExpWidgets, WIDGETS_FRAMES } from "./scenes/explainer/ExpWidgets";
import { ExpAssistant, ASSISTANT_FRAMES } from "./scenes/explainer/ExpAssistant";

const T = 22;
export const EXPLAINER_TOTAL_FRAMES = PROFIL_FRAMES + WIDGETS_FRAMES + ASSISTANT_FRAMES - 2 * T;

export const ExplainerAffiliates: React.FC = () => (
  <AbsoluteFill style={{ background: palette.night }}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={PROFIL_FRAMES}>
        <ExpProfil />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-right" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
      />
      <TransitionSeries.Sequence durationInFrames={WIDGETS_FRAMES}>
        <ExpWidgets />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
      />
      <TransitionSeries.Sequence durationInFrames={ASSISTANT_FRAMES}>
        <ExpAssistant />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
