import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { palette, alpha, display, body, size, weight } from "./tokens";
import { PhoneFrame, phoneGeometry } from "./PhoneFrame";
import { PromoLogo } from "./promo/PromoLogo";
import { FeedBackdrop, useFeedManifest } from "./promo/FeedBackdrop";
import type { FeedManifest } from "./FeedTemplate";

/**
 * Template « Promo business » — aucun Playwright, aucun appel IA.
 * Assets = vidéo interne + images de la fiche, résolus en back-office et
 * passés en props. Blocs activables et durées paramétrables.
 *
 * Deux enrichissements optionnels :
 *  - `logoUrl` : logo transparent animé dans l'intro et l'outro.
 *  - `bgFeedManifest` : décor plein écran issu d'une capture feed (/search),
 *    swipe vertical continu derrière le logo / le hook.
 */

export type PromoBlocks = {
  hook: boolean;
  video: boolean;
  photos: boolean;
  text: boolean;
  outro: boolean;
};

export type PromoSeconds = {
  hook: number;
  video: number;
  photo: number;
  text: number;
  outro: number;
};

export type BusinessPromoProps = {
  name: string;
  city?: string | null;
  hook: string;
  tagline?: string | null;
  /** texte riche (HTML, ≤ 500 caractères) affiché en carte plein écran */
  text?: string | null;
  /** logo transparent de l'établissement (webp/png) */
  logoUrl?: string | null;
  /** manifest d'une capture feed servant de fond d'écran animé */
  bgFeedManifest?: string | null;
  videoUrl?: string | null;
  images: string[];
  format: "portrait" | "landscape";
  variant: "fullscreen" | "mockup";
  /** fond uni de la variante mockup */
  mockupBg?: string;
  blocks: PromoBlocks;
  seconds: PromoSeconds;
};

export const PROMO_FPS = 30;
export const PROMO_PORTRAIT = { width: 1080, height: 1920 } as const;
export const PROMO_LANDSCAPE = { width: 1920, height: 1080 } as const;

export const promoDefaults: BusinessPromoProps = {
  name: "Établissement",
  city: null,
  hook: "Une adresse à découvrir.",
  tagline: null,
  text: null,
  logoUrl: null,
  bgFeedManifest: null,
  videoUrl: null,
  images: [],
  format: "portrait",
  variant: "fullscreen",
  mockupBg: palette.ink,
  blocks: { hook: true, video: true, photos: true, text: false, outro: true },
  seconds: { hook: 3, video: 5, photo: 1.5, text: 4, outro: 2.5 },
};

const f = (sec: number) => Math.max(1, Math.round(sec * PROMO_FPS));

/** Découpe du montage en segments effectifs (blocs décochés = ignorés). */
export const promoSegments = (p: BusinessPromoProps) => {
  const images = (p.images || []).slice(0, 4);
  const segs: { kind: "hook" | "video" | "photo" | "text" | "outro"; frames: number; index?: number }[] = [];
  if (p.blocks?.hook) segs.push({ kind: "hook", frames: f(p.seconds?.hook ?? 3) });
  if (p.blocks?.video && p.videoUrl) segs.push({ kind: "video", frames: f(p.seconds?.video ?? 5) });
  if (p.blocks?.photos) {
    images.forEach((_, i) => segs.push({ kind: "photo", frames: f(p.seconds?.photo ?? 1.5), index: i }));
  }
  if (p.blocks?.text && (p.text || "").trim()) segs.push({ kind: "text", frames: f(p.seconds?.text ?? 4) });
  if (p.blocks?.outro) segs.push({ kind: "outro", frames: f(p.seconds?.outro ?? 2.5) });
  return segs.length ? segs : [{ kind: "outro" as const, frames: f(2) }];
};

export const computePromoFrames = (p: BusinessPromoProps) =>
  promoSegments(p).reduce((acc, s) => acc + s.frames, 0);

/** Zoom lent commun à tous les plans média — évite les images figées. */
const useKenBurns = (durationFrames: number, from = 1.04, to = 1.14) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [0, durationFrames], [from, to], {
    extrapolateRight: "clamp",
  });
};


const MediaFill: React.FC<{ src: string; kind: "img" | "video"; durationFrames: number }> = ({
  src,
  kind,
  durationFrames,
}) => {
  const scale = useKenBurns(durationFrames);
  const styleFill: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: `scale(${scale})`,
  };
  return kind === "video" ? (
    <OffthreadVideo src={src} muted style={styleFill} />
  ) : (
    <Img src={src} style={styleFill} />
  );
};

/** Fond d'écran : capture feed animée si disponible, sinon média flouté. */
const SceneBackdrop: React.FC<{
  p: BusinessPromoProps;
  manifest: FeedManifest | null;
  frames: number;
}> = ({ p, manifest, frames }) => {
  const frame = useCurrentFrame();
  const bg = p.videoUrl || p.images?.[0] || null;
  if (manifest) {
    return (
      <AbsoluteFill style={{ opacity: 0.85 }}>
        <FeedBackdrop manifest={manifest} frame={frame} />
      </AbsoluteFill>
    );
  }
  if (!bg) return null;
  return (
    <AbsoluteFill style={{ filter: "blur(14px)", opacity: 0.5 }}>
      <MediaFill src={bg} kind={p.videoUrl ? "video" : "img"} durationFrames={frames} />
    </AbsoluteFill>
  );
};

const HookScene: React.FC<{ p: BusinessPromoProps; frames: number; manifest: FeedManifest | null }> = ({
  p,
  frames,
  manifest,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 200 } });
  const y = interpolate(rise, [0, 1], [60, 0]);
  const words = (p.hook || "").split(/\s+/).filter(Boolean);

  return (
    <AbsoluteFill style={{ background: palette.night }}>
      <SceneBackdrop p={p} manifest={manifest} frames={frames} />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${alpha("night", 0.55)}, ${alpha("night", 0.9)})`,
        }}
      />
      {p.logoUrl && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: "18%" }}>
          <PromoLogo src={p.logoUrl} size={PROMO_PORTRAIT.width * 0.52} />
        </AbsoluteFill>
      )}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          padding: "0 7% 12%",
        }}
      >
        <div style={{ transform: `translateY(${y}px)` }}>
          <div
            style={{
              width: 84,
              height: 5,
              background: palette.terracotta,
              marginBottom: 28,
              borderRadius: 999,
            }}
          />
          <h1
            style={{
              fontFamily: display,
              fontWeight: weight.medium,
              fontSize: size.h2,
              lineHeight: 1.08,
              color: palette.cream,
              margin: 0,
              textWrap: "balance",
            }}
          >
            {words.map((w, i) => {
              const o = interpolate(frame, [i * 3, i * 3 + 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <span key={`${w}-${i}`} style={{ opacity: o }}>
                  {w}{" "}
                </span>
              );
            })}
          </h1>
          {p.city && (
            <p
              style={{
                fontFamily: body,
                fontSize: size.caption,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: palette.gold,
                marginTop: 26,
              }}
            >
              {p.city}
            </p>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Carte texte plein écran (HTML riche ≤ 500 caractères, saisi en back-office). */
const TextScene: React.FC<{ p: BusinessPromoProps; manifest: FeedManifest | null; frames: number }> = ({
  p,
  manifest,
  frames,
}) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, 24], [40, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: palette.night }}>
      <SceneBackdrop p={p} manifest={manifest} frames={frames} />
      <AbsoluteFill style={{ background: alpha("night", 0.82) }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 9%" }}>
        <div style={{ opacity: fade, transform: `translateY(${y}px)`, textAlign: "center" }}>
          <div style={{ ...{ width: 96, height: 4, background: palette.gold, borderRadius: 999 }, margin: "0 auto 34px" }} />
          <div
            style={{
              fontFamily: body,
              fontSize: size.lead,
              lineHeight: 1.42,
              color: palette.cream,
            }}
            dangerouslySetInnerHTML={{ __html: p.text || "" }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};


const MediaScene: React.FC<{
  src: string;
  kind: "img" | "video";
  frames: number;
  caption?: string | null;
}> = ({ src, kind, frames, caption }) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: palette.black, opacity: fade }}>
      <MediaFill src={src} kind={kind} durationFrames={frames} />
      {caption && (
        <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 7% 7%" }}>
          <div
            style={{
              background: alpha("night", 0.62),
              padding: "14px 22px",
              borderRadius: 14,
              alignSelf: "flex-start",
              fontFamily: body,
              fontSize: size.label,
              color: palette.cream,
              letterSpacing: 1,
            }}
          >
            {caption}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

const OutroScene: React.FC<{ p: BusinessPromoProps; manifest: FeedManifest | null; frames: number }> = ({
  p,
  manifest,
  frames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 40%, ${palette.emberDeep}, ${palette.night})`,
        justifyContent: "center",
        alignItems: "center",
        padding: "0 9%",
        textAlign: "center",
      }}
    >
      {manifest && (
        <>
          <AbsoluteFill style={{ opacity: 0.35 }}>
            <SceneBackdrop p={p} manifest={manifest} frames={frames} />
          </AbsoluteFill>
          <AbsoluteFill style={{ background: alpha("night", 0.6) }} />
        </>
      )}
      <div style={{ transform: `scale(${interpolate(pop, [0, 1], [0.9, 1])})`, position: "relative" }}>
        {p.logoUrl && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 44 }}>
            <PromoLogo src={p.logoUrl} size={PROMO_PORTRAIT.width * 0.46} delay={4} />
          </div>
        )}

        <h2
          style={{
            fontFamily: display,
            fontWeight: weight.semibold,
            fontSize: size.h3,
            color: palette.cream,
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {p.name}
        </h2>
        <div
          style={{
            width: 120,
            height: 4,
            background: palette.gold,
            borderRadius: 999,
            margin: "30px auto",
          }}
        />
        <p
          style={{
            fontFamily: body,
            fontSize: size.lead,
            color: palette.bone,
            margin: 0,
          }}
        >
          {p.tagline || p.city || "One World Morocco"}
        </p>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Le montage se joue toujours dans un cadre 9:16 calibré 1080×1920
 * (échelle typographique). `scale` ramène ce cadre à la taille réelle du
 * conteneur (mockup ou bandes noires en paysage).
 */
const Stage: React.FC<{ p: BusinessPromoProps; scale?: number }> = ({ p, scale = 1 }) => {
  const segs = promoSegments(p);
  const images = (p.images || []).slice(0, 4);
  let cursor = 0;
  return (
    <AbsoluteFill
      style={{
        background: palette.black,
        width: PROMO_PORTRAIT.width,
        height: PROMO_PORTRAIT.height,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      {segs.map((s, i) => {
        const from = cursor;
        cursor += s.frames;
        return (
          <Sequence key={`${s.kind}-${i}`} from={from} durationInFrames={s.frames}>
            {s.kind === "hook" && <HookScene p={p} frames={s.frames} />}
            {s.kind === "video" && p.videoUrl && (
              <MediaScene src={p.videoUrl} kind="video" frames={s.frames} />
            )}
            {s.kind === "photo" && images[s.index ?? 0] && (
              <MediaScene src={images[s.index ?? 0]} kind="img" frames={s.frames} />
            )}
            {s.kind === "outro" && <OutroScene p={p} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const BusinessPromo: React.FC<BusinessPromoProps> = (raw) => {
  const p = { ...promoDefaults, ...raw } as BusinessPromoProps;
  const { height } = useVideoConfig();
  const isMockup = p.variant === "mockup";

  // Portrait plein écran : le stage occupe tout le cadre (échelle 1:1).
  if (p.format !== "landscape" && !isMockup) {
    return <Stage p={p} />;
  }

  // Mockup : cadre téléphone centré sur fond uni coloré.
  if (isMockup) {
    const phoneH = Math.round(height * (p.format === "landscape" ? 0.88 : 0.78));
    const { screenW } = phoneGeometry(phoneH);
    return (
      <AbsoluteFill
        style={{
          background: p.mockupBg || palette.ink,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <PhoneFrame height={phoneH}>
          <Stage p={p} scale={screenW / PROMO_PORTRAIT.width} />
        </PhoneFrame>
      </AbsoluteFill>
    );
  }

  // Paysage plein écran : stage 9:16 centré, bandes noires sur les côtés.
  const stageW = Math.round((height * 9) / 16);
  return (
    <AbsoluteFill style={{ background: palette.black, justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: stageW, height, position: "relative", overflow: "hidden" }}>
        <Stage p={p} scale={stageW / PROMO_PORTRAIT.width} />
      </div>
    </AbsoluteFill>
  );
};
