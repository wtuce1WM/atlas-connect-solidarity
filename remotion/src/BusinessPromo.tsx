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
import { assetUrl } from "./lib/assetUrl";

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
  /** obsolète : le texte est désormais en surimpression, plus une étape */
  text?: boolean;
  outro: boolean;
};

export type PromoSeconds = {
  hook: number;
  video: number;
  photo: number;
  /** obsolète (conservé pour les anciens jobs) */
  text?: number;
  outro: number;
};

export type BusinessPromoProps = {
  name: string;
  city?: string | null;
  hook: string;
  tagline?: string | null;
  /** texte riche (HTML, ≤ 500 caractères) en surimpression sur Vidéo et Photos */
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
/** Cadre logique du montage paysage (mis à l'échelle vers 1920×1080). */
export const LANDSCAPE_STAGE = { width: 1440, height: 810 } as const;

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
  blocks: { hook: true, video: true, photos: true, outro: true },
  seconds: { hook: 3, video: 5, photo: 1.5, outro: 2.5 },
};

const f = (sec: number) => Math.max(1, Math.round(sec * PROMO_FPS));

/** Polices avec repli emoji : sans ce repli, les emojis du Rich Text sortent en tofu. */
const EMOJI = `"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", "Twemoji Mozilla"`;
const displayFont = `${display}, ${EMOJI}`;
const bodyFont = `${body}, ${EMOJI}`;

/** Découpe du montage en segments effectifs (blocs décochés = ignorés). */
export const promoSegments = (p: BusinessPromoProps) => {
  const images = (p.images || []).slice(0, 4);
  const segs: { kind: "hook" | "video" | "photo" | "outro"; frames: number; index?: number }[] = [];
  if (p.blocks?.hook) segs.push({ kind: "hook", frames: f(p.seconds?.hook ?? 3) });
  if (p.blocks?.video && p.videoUrl) segs.push({ kind: "video", frames: f(p.seconds?.video ?? 5) });
  if (p.blocks?.photos) {
    images.forEach((_, i) => segs.push({ kind: "photo", frames: f(p.seconds?.photo ?? 1.5), index: i }));
  }
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
  // Médias internalisés par le worker (`dl/…`) : résolution obligatoire via staticFile.
  const resolved = assetUrl(src);
  if (!resolved) return null;
  return kind === "video" ? (
    <OffthreadVideo src={resolved} muted style={styleFill} />
  ) : (
    <Img src={resolved} style={styleFill} />
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

const HookScene: React.FC<{
  p: BusinessPromoProps;
  frames: number;
  manifest: FeedManifest | null;
  wide?: boolean;
}> = ({ p, frames, manifest, wide = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 200 } });
  const y = interpolate(rise, [0, 1], [60, 0]);
  const words = (p.hook || "").split(/\s+/).filter(Boolean);

  const textBlock = (
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
          fontFamily: displayFont,
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
            fontFamily: bodyFont,
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
  );

  return (
    <AbsoluteFill style={{ background: palette.night }}>
      <SceneBackdrop p={p} manifest={manifest} frames={frames} />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${alpha("night", 0.55)}, ${alpha("night", 0.9)})`,
        }}
      />
      {/* Paysage : logo à gauche, accroche à droite. Portrait : logo centré, accroche en bas. */}
      {wide ? (
        <AbsoluteFill
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: "5%",
            padding: "0 7%",
          }}
        >
          {p.logoUrl && (
            <div style={{ flex: "0 0 34%", display: "flex", justifyContent: "center" }}>
              <PromoLogo src={p.logoUrl} size={LANDSCAPE_STAGE.width * 0.3} />
            </div>
          )}
          <div style={{ flex: 1 }}>{textBlock}</div>
        </AbsoluteFill>
      ) : (
        <>
          {p.logoUrl && (
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: "18%" }}>
              <PromoLogo src={p.logoUrl} size={PROMO_PORTRAIT.width * 0.52} />
            </AbsoluteFill>
          )}
          <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 7% 12%" }}>{textBlock}</AbsoluteFill>
        </>
      )}
    </AbsoluteFill>
  );
};


/**
 * Surimpression du texte riche (≤ 500 caractères) sur les plans Vidéo et Photos.
 * Une seule échelle typographique pour tout le montage : titres (h1/h2/h3) en
 * Montserrat via `display`, corps en Avenir/Nunito via `body`, mêmes tailles et
 * mêmes espacements que l'intro et l'outro.
 */
const RichOverlay: React.FC<{ html: string; frames: number }> = ({ html, frames }) => {
  const frame = useCurrentFrame();
  const fade = interpolate(
    frame,
    [0, 12, Math.max(14, frames - 10), frames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const y = interpolate(frame, [0, 22], [26, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 7% 8%", opacity: fade }}>
      <div
        style={{
          transform: `translateY(${y}px)`,
          background: alpha("night", 0.62),
          borderRadius: 18,
          padding: "30px 34px",
        }}
      >
        <div
          style={{
            width: 84,
            height: 5,
            background: palette.gold,
            borderRadius: 999,
            marginBottom: 22,
          }}
        />
        <div
          className="promo-rich"
          style={{ fontFamily: bodyFont, fontSize: size.lead, lineHeight: 1.42, color: palette.cream }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      <style>{`
        .promo-rich > *:first-child { margin-top: 0; }
        .promo-rich > *:last-child { margin-bottom: 0; }
        .promo-rich h1, .promo-rich h2, .promo-rich h3, .promo-rich h4 {
          font-family: ${displayFont}; font-weight: ${weight.medium}; color: ${palette.cream};
          line-height: 1.08; margin: 0 0 16px;
        }
        .promo-rich h1 { font-size: ${size.h3}px; }
        .promo-rich h2 { font-size: ${size.h4}px; }
        .promo-rich h3, .promo-rich h4 { font-size: ${size.body}px; }
        .promo-rich p { margin: 0 0 14px; }
        .promo-rich strong { font-weight: ${weight.bold}; color: ${palette.cream}; }
        .promo-rich em { font-style: italic; }
        .promo-rich ul, .promo-rich ol { margin: 0 0 14px; padding-left: 1.3em; }
        .promo-rich li { margin: 0 0 8px; }
        .promo-rich a { color: ${palette.gold}; text-decoration: none; }
      `}</style>
    </AbsoluteFill>
  );
};

const MediaScene: React.FC<{
  src: string;
  kind: "img" | "video";
  frames: number;
  caption?: string | null;
  /** texte riche en surimpression (bloc « Texte ») */
  overlayHtml?: string | null;
}> = ({ src, kind, frames, caption, overlayHtml }) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: palette.black, opacity: fade }}>
      <MediaFill src={src} kind={kind} durationFrames={frames} />
      {overlayHtml ? (
        <AbsoluteFill
          style={{
            background: `linear-gradient(180deg, transparent 35%, ${alpha("night", 0.78)} 100%)`,
          }}
        />
      ) : null}
      {caption && (
        <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 7% 7%" }}>
          <div
            style={{
              background: alpha("night", 0.62),
              padding: "14px 22px",
              borderRadius: 14,
              alignSelf: "flex-start",
              fontFamily: bodyFont,
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


const OutroScene: React.FC<{
  p: BusinessPromoProps;
  manifest: FeedManifest | null;
  frames: number;
  wide?: boolean;
}> = ({ p, manifest, frames, wide = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  const base = wide ? LANDSCAPE_STAGE.width : PROMO_PORTRAIT.width;
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
        {/* Logo présent : il tient le rôle du nom, on ne réécrit pas la raison sociale. */}
        {p.logoUrl ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PromoLogo src={p.logoUrl} size={base * (wide ? 0.34 : 0.52)} delay={4} />
          </div>
        ) : (
          <h2
            style={{
              fontFamily: displayFont,
              fontWeight: weight.medium,
              fontSize: size.h2,
              color: palette.cream,
              margin: 0,
              lineHeight: 1.08,
            }}
          >
            {p.name}
          </h2>
        )}
        <div
          style={{
            width: 120,
            height: 4,
            background: palette.gold,
            borderRadius: 999,
            margin: "34px auto 26px",
          }}
        />
        {/* Même échelle typographique que la ligne ville de l'intro. */}
        <p
          style={{
            fontFamily: bodyFont,
            fontSize: size.caption,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: palette.gold,
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
 * Cadre logique du montage : 1080×1920 en portrait/mockup, 1440×810 en paysage
 * (l'échelle typographique reste celle du canvas de référence, `scale` ramène
 * le cadre à la taille réelle de la composition).
 */
const Stage: React.FC<{ p: BusinessPromoProps; scale?: number; wide?: boolean }> = ({
  p,
  scale = 1,
  wide = false,
}) => {
  const segs = promoSegments(p);
  const images = (p.images || []).slice(0, 4);
  const manifest = useFeedManifest(p.bgFeedManifest);
  const stage = wide ? LANDSCAPE_STAGE : PROMO_PORTRAIT;
  const overlayHtml = (p.text || "").trim() || null;
  // Fenêtre continue du texte : du premier au dernier plan média, sans réapparition
  // à chaque changement de fond.
  let acc = 0;
  let overlayFrom = -1;
  let overlayTo = 0;
  for (const s of segs) {
    if (s.kind === "video" || s.kind === "photo") {
      if (overlayFrom < 0) overlayFrom = acc;
      overlayTo = acc + s.frames;
    }
    acc += s.frames;
  }
  const overlayFrames = overlayFrom >= 0 ? overlayTo - overlayFrom : 0;
  let cursor = 0;
  return (
    <AbsoluteFill
      style={{
        background: palette.black,
        width: stage.width,
        height: stage.height,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      {segs.map((s, i) => {
        const from = cursor;
        cursor += s.frames;
        const overlay = overlayHtml;
        return (
          <Sequence key={`${s.kind}-${i}`} from={from} durationInFrames={s.frames}>
            {s.kind === "hook" && <HookScene p={p} frames={s.frames} manifest={manifest} wide={wide} />}
            {s.kind === "video" && p.videoUrl && (
              <MediaScene src={p.videoUrl} kind="video" frames={s.frames} overlayHtml={overlay} />
            )}
            {s.kind === "photo" && images[s.index ?? 0] && (
              <MediaScene src={images[s.index ?? 0]} kind="img" frames={s.frames} overlayHtml={overlay} />
            )}
            {s.kind === "outro" && <OutroScene p={p} frames={s.frames} manifest={manifest} wide={wide} />}
          </Sequence>
        );
      })}

      {overlayHtml && overlayFrames > 0 && (
        <Sequence from={overlayFrom} durationInFrames={overlayFrames}>
          <RichOverlay html={overlayHtml} frames={overlayFrames} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

export const BusinessPromo: React.FC<BusinessPromoProps> = (raw) => {
  const p = { ...promoDefaults, ...raw } as BusinessPromoProps;
  const { width, height } = useVideoConfig();
  const isMockup = p.variant === "mockup";

  // Portrait plein écran : le stage occupe tout le cadre (échelle 1:1).
  if (p.format !== "landscape" && !isMockup) {
    return <Stage p={p} />;
  }

  // Mockup : cadre téléphone centré sur fond uni coloré (le stage reste 9:16).
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

  // Paysage plein écran : cadre 16:9 natif, aucune bande noire.
  return (
    <AbsoluteFill style={{ background: palette.black, overflow: "hidden" }}>
      <Stage p={p} scale={width / LANDSCAPE_STAGE.width} wide />
    </AbsoluteFill>
  );
};

