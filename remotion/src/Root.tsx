import React from "react";
import { Composition } from "remotion";
import { MainVideo, TOTAL_FRAMES } from "./MainVideo";
import { CorporateVertical, CORP_TOTAL_FRAMES } from "./CorporateVertical";
import { ComptoirDarna, COMPTOIR_TOTAL_FRAMES } from "./ComptoirDarna";
import { RiadDarNajat, NAJAT_TOTAL_FRAMES } from "./RiadDarNajat";
import { MaisonBrummell, BRUMMELL_TOTAL_FRAMES } from "./MaisonBrummell";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="corporate-vertical"
      component={CorporateVertical}
      durationInFrames={CORP_TOTAL_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="comptoir-darna"
      component={ComptoirDarna}
      durationInFrames={COMPTOIR_TOTAL_FRAMES}
      fps={30}
      width={720}
      height={1280}
    />
    <Composition
      id="riad-dar-najat"
      component={RiadDarNajat}
      durationInFrames={NAJAT_TOTAL_FRAMES}
      fps={30}
      width={720}
      height={1280}
    />
    <Composition
      id="maison-brummell"
      component={MaisonBrummell}
      durationInFrames={BRUMMELL_TOTAL_FRAMES}
      fps={30}
      width={720}
      height={1280}
    />
  </>
);
