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
import { FeedSwipe, TOTAL as FEED_TOTAL } from "./FeedSwipe";
import {
  FeedTemplate,
  loadFeedManifest,
  computeFeedFrames,
  LANDSCAPE,
  type FeedTemplateProps,
} from "./FeedTemplate";
import { BusinessShowcase, SHOWCASE_TOTAL_FRAMES, computeShowcaseFrames, type ShowcaseProps } from "./BusinessShowcase";
import {
  BusinessPromo,
  computePromoFrames,
  promoDefaults,
  PROMO_FPS,
  PROMO_PORTRAIT,
  PROMO_LANDSCAPE,
  type BusinessPromoProps,
} from "./BusinessPromo";
import {
  Storyboard,
  computeStoryboardFrames,
  storyboardDefaults,
  STORYBOARD_FPS,
  STORYBOARD_PORTRAIT,
  STORYBOARD_LANDSCAPE,
  type StoryboardProps,
} from "./Storyboard";

/**
 * Storyboard manuel : la durée, le format et l'échelle de sortie viennent
 * intégralement du storyboard enregistré en back-office.
 */
const storyboardMetadata = (format: "portrait" | "landscape") => ({ props }: { props: Record<string, unknown> }) => {
  const p = { ...storyboardDefaults, ...(props as StoryboardProps), format };
  const base = format === "landscape" ? STORYBOARD_LANDSCAPE : STORYBOARD_PORTRAIT;
  const raw = (props as { previewScale?: number }).previewScale;
  const scale = typeof raw === "number" && raw > 0 && raw <= 1 ? raw : 1;
  return {
    durationInFrames: computeStoryboardFrames(p),
    fps: STORYBOARD_FPS,
    width: Math.round((base.width * scale) / 2) * 2,
    height: Math.round((base.height * scale) / 2) * 2,
    props: p,
  };
};


/** Promo business : durée déduite des blocs actifs et de leurs durées. */
const promoMetadata = (format: "portrait" | "landscape") => ({ props }: { props: Record<string, unknown> }) => {
  const p = { ...promoDefaults, ...(props as BusinessPromoProps), format };
  const dims = format === "landscape" ? PROMO_LANDSCAPE : PROMO_PORTRAIT;
  return {
    durationInFrames: computePromoFrames(p),
    fps: PROMO_FPS,
    width: dims.width,
    height: dims.height,
    props: p,
  };
};

const feedDefaults = (format: "portrait" | "landscape"): FeedTemplateProps => ({
  manifestPath: "feed/manifest.json",
  format,
  manifest: null,
});

/** Toute la géométrie et le rythme viennent du manifest de capture. */
const feedMetadata = async ({ props }: { props: Record<string, unknown> }) => {
  const p = props as FeedTemplateProps;
  const manifest = await loadFeedManifest(p.manifestPath);
  const portrait = p.format !== "landscape";
  return {
    durationInFrames: computeFeedFrames(manifest),
    fps: manifest.fps,
    width: portrait
      ? Math.round((manifest.viewport.width * (manifest.outputScale || 1)) / 2) * 2
      : LANDSCAPE.width,
    height: portrait
      ? Math.round((manifest.viewport.height * (manifest.outputScale || 1)) / 2) * 2
      : LANDSCAPE.height,
    props: { ...p, manifest },
  };
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="feed-template"
      component={FeedTemplate}
      durationInFrames={1000}
      fps={25}
      width={720}
      height={1280}
      defaultProps={feedDefaults("portrait")}
      calculateMetadata={feedMetadata}
    />
    <Composition
      id="feed-template-landscape"
      component={FeedTemplate}
      durationInFrames={1000}
      fps={25}
      width={LANDSCAPE.width}
      height={LANDSCAPE.height}
      defaultProps={feedDefaults("landscape")}
      calculateMetadata={feedMetadata}
    />
    <Composition
      id="business-promo"
      component={BusinessPromo}
      durationInFrames={computePromoFrames(promoDefaults)}
      fps={PROMO_FPS}
      width={PROMO_PORTRAIT.width}
      height={PROMO_PORTRAIT.height}
      defaultProps={{ ...promoDefaults, format: "portrait" } as BusinessPromoProps}
      calculateMetadata={promoMetadata("portrait")}
    />
    <Composition
      id="business-promo-landscape"
      component={BusinessPromo}
      durationInFrames={computePromoFrames(promoDefaults)}
      fps={PROMO_FPS}
      width={PROMO_LANDSCAPE.width}
      height={PROMO_LANDSCAPE.height}
      defaultProps={{ ...promoDefaults, format: "landscape" } as BusinessPromoProps}
      calculateMetadata={promoMetadata("landscape")}
    />
    <Composition
      id="storyboard"
      component={Storyboard}
      durationInFrames={computeStoryboardFrames(storyboardDefaults)}
      fps={STORYBOARD_FPS}
      width={STORYBOARD_PORTRAIT.width}
      height={STORYBOARD_PORTRAIT.height}
      defaultProps={{ ...storyboardDefaults, format: "portrait" } as StoryboardProps}
      calculateMetadata={storyboardMetadata("portrait")}
    />
    <Composition
      id="storyboard-landscape"
      component={Storyboard}
      durationInFrames={computeStoryboardFrames(storyboardDefaults)}
      fps={STORYBOARD_FPS}
      width={STORYBOARD_LANDSCAPE.width}
      height={STORYBOARD_LANDSCAPE.height}
      defaultProps={{ ...storyboardDefaults, format: "landscape" } as StoryboardProps}
      calculateMetadata={storyboardMetadata("landscape")}
    />

    <Composition
      id="feed-swipe"
      component={FeedSwipe}
      durationInFrames={FEED_TOTAL}
      fps={25}
      width={720}
      height={1280}
    />

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
