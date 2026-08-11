import React from "react";
import { Composition } from "remotion";
import { MainVideo, TOTAL_FRAMES } from "./MainVideo";
import { CorporateVertical, CORP_TOTAL_FRAMES } from "./CorporateVertical";
import { ComptoirDarna, COMPTOIR_TOTAL_FRAMES } from "./ComptoirDarna";
import { RiadDarNajat, NAJAT_TOTAL_FRAMES } from "./RiadDarNajat";
import { MaisonBrummell, BRUMMELL_TOTAL_FRAMES } from "./MaisonBrummell";
import { JnaneRumi, JNANE_TOTAL_FRAMES } from "./JnaneRumi";
import { AgentIaDemo, AGENT_IA_TOTAL_FRAMES } from "./AgentIaDemo";
import { AgentIaDemoV2, AGENT_IA_V2_TOTAL_FRAMES } from "./AgentIaDemoV2";
import { NarComplexe, NAR_TOTAL_FRAMES } from "./NarComplexe";
import { Farasha, FARASHA_TOTAL_FRAMES } from "./Farasha";
import { BoZin, BOZIN_TOTAL_FRAMES } from "./BoZin";
import { ExplainerAffiliates, EXPLAINER_TOTAL_FRAMES } from "./ExplainerAffiliates";
import { BusinessShowcase, SHOWCASE_TOTAL_FRAMES, computeShowcaseFrames, type ShowcaseProps } from "./BusinessShowcase";

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
      id="explainer-affiliates"
      component={ExplainerAffiliates}
      durationInFrames={EXPLAINER_TOTAL_FRAMES}
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
    <Composition
      id="jnane-rumi"
      component={JnaneRumi}
      durationInFrames={JNANE_TOTAL_FRAMES}
      fps={30}
      width={720}
      height={1280}
    />
    <Composition
      id="agent-ia-demo"
      component={AgentIaDemo}
      durationInFrames={AGENT_IA_TOTAL_FRAMES}
      fps={30}
      width={720}
      height={1280}
    />
    <Composition
      id="agent-ia-demo-v2"
      component={AgentIaDemoV2}
      durationInFrames={AGENT_IA_V2_TOTAL_FRAMES}
      fps={30}
      width={720}
      height={1280}
    />
    <Composition
      id="nar-complexe"
      component={NarComplexe}
      durationInFrames={NAR_TOTAL_FRAMES}
      fps={30}
      width={720}
      height={1280}
    />
    <Composition
      id="farasha-farmhouse"
      component={Farasha}
      durationInFrames={FARASHA_TOTAL_FRAMES}
      fps={30}
      width={720}
      height={1280}
    />
    <Composition
      id="bo-zin"
      component={BoZin}
      durationInFrames={BOZIN_TOTAL_FRAMES}
      fps={30}
      width={720}
      height={1280}
    />
    <Composition
      id="business-showcase"
      component={BusinessShowcase}
      durationInFrames={SHOWCASE_TOTAL_FRAMES}
      fps={30}
      width={720}
      height={1280}
      defaultProps={{
        name: "Établissement",
        hook: "Une adresse à découvrir.",
        tagline: "L'art de vivre marocain.",
        city: undefined,
        images: [],
        offer: null,
      } as ShowcaseProps}
      calculateMetadata={({ props }) => {
        const p = props as ShowcaseProps;
        const clamp = (v: unknown, fallback: number) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 320 || n > 3840) return fallback;
          // Les dimensions doivent être paires pour l'encodage H.264.
          return Math.round(n / 2) * 2;
        };
        return {
          durationInFrames: computeShowcaseFrames(p),
          width: clamp(p.canvas_width, 720),
          height: clamp(p.canvas_height, 1280),
          props,
        };
      }}

    />
  </>
);
