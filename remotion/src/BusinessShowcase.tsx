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
  staticFile,
} from "remotion";
import { display, body, COLORS } from "./theme";

// 22s @ 30fps
export const SHOWCASE_TOTAL_FRAMES = 660;

export type ShowcaseProps = {
  name?: string;
  hook?: string;
  tagline?: string;
  city?: string;
  category?: string;
  images?: string[];
  offer?: { title?: string; price?: string } | null;
  rating?: number | null;
  reviews?: number | null;
};

const ease = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const Background: React.FC = () => (
  <AbsoluteFill style={{ background: COLORS.night, overflow: "hidden" }}>
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#1a120a 0%,#0e0b08 50%,#1a120a 100%)" }} />
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(60% 40% at 50% 0%,rgba(192,79,23,0.22) 0%,rgba(14,11,8,0) 60%),radial-gradient(70% 50% at 50% 100%,rgba(212,175,55,0.14) 0%,rgba(14,11,8,0) 60%)",
      }}
    />
  </AbsoluteFill>
);

const KenBurns: React.FC<{ src: string; from: number; duration: number }> = ({ src, from, duration }) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  const progress = Math.max(0, Math.min(1, local / duration));
  const scale = 1.05 + progress * 0.18;
  const o = Math.min(ease(local, 0, 12), 1 - ease(local, duration - 12, duration));
  return (
    <AbsoluteFill style={{ opacity: o, overflow: "hidden" }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
      <AbsoluteFill
        style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.05) 40%,rgba(14,11,8,0.85) 100%)" }}
      />
    </AbsoluteFill>
  );
};

const SceneHook: React.FC<{ name: string; hook: string; img?: string }> = ({ name, hook, img }) => {
  const frame = useCurrentFrame();
  const titleY = interpolate(spring({ frame: frame - 8, fps: 30, config: { damping: 18 } }), [0, 1], [40, 0]);
  const titleO = ease(frame, 8, 28);
  const hookO = ease(frame, 30, 55);
  const out = 1 - ease(frame, 100, 120);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      {img && <KenBurns src={img} from={0} duration={120} />}
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: 60, paddingBottom: 120 }}>
        <div
          style={{
            opacity: titleO,
            transform: `translateY(${titleY}px)`,
            fontFamily: display,
            fontWeight: 700,
            color: COLORS.cream,
            fontSize: 64,
            lineHeight: 1.05,
            textShadow: "0 4px 24px rgba(0,0,0,0.6)",
          }}
        >
          {name}
        </div>
        <div
          style={{
            opacity: hookO,
            marginTop: 18,
            fontFamily: body,
            color: COLORS.gold,
            fontSize: 28,
            lineHeight: 1.3,
            textShadow: "0 2px 12px rgba(0,0,0,0.7)",
          }}
        >
          {hook}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const SceneTagline: React.FC<{ tagline: string }> = ({ tagline }) => {
  const frame = useCurrentFrame();
  const words = tagline.split(" ");
  const out = 1 - ease(frame, 100, 120);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60, opacity: out }}>
      <div
        style={{
          fontFamily: display,
          fontWeight: 700,
          color: COLORS.cream,
          fontSize: 68,
          lineHeight: 1.1,
          textAlign: "center",
        }}
      >
        {words.map((w, i) => {
          const start = i * 5;
          const o = ease(frame, start, start + 14);
          const y = interpolate(o, [0, 1], [30, 0]);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: o,
                transform: `translateY(${y}px)`,
                color: i === words.length - 1 ? COLORS.terracotta : COLORS.cream,
                marginRight: 14,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const SceneGallery: React.FC<{ images: string[] }> = ({ images }) => {
  const frame = useCurrentFrame();
  const out = 1 - ease(frame, 130, 150);
  const imgs = images.slice(0, 3);
  if (imgs.length === 0) return null;
  const perDuration = 50;
  return (
    <AbsoluteFill style={{ opacity: out }}>
      {imgs.map((src, i) => (
        <KenBurns key={src + i} src={src} from={i * perDuration} duration={perDuration + 20} />
      ))}
    </AbsoluteFill>
  );
};

const SceneOffer: React.FC<{ offer: { title?: string; price?: string }; city?: string }> = ({ offer, city }) => {
  const frame = useCurrentFrame();
  const labelO = ease(frame, 0, 18);
  const titleO = ease(frame, 14, 36);
  const priceS = spring({ frame: frame - 24, fps: 30, config: { damping: 14 } });
  const out = 1 - ease(frame, 100, 120);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 70, opacity: out }}>
      <div
        style={{
          opacity: labelO,
          fontFamily: body,
          color: COLORS.gold,
          fontSize: 22,
          letterSpacing: 6,
          textTransform: "uppercase",
        }}
      >
        {city ? `Offre · ${city}` : "Offre signature"}
      </div>
      <div
        style={{
          opacity: titleO,
          marginTop: 30,
          fontFamily: display,
          fontWeight: 700,
          color: COLORS.cream,
          fontSize: 54,
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        {offer.title || "Une expérience signature"}
      </div>
      {offer.price && (
        <div
          style={{
            opacity: priceS,
            transform: `scale(${interpolate(priceS, [0, 1], [0.85, 1])})`,
            marginTop: 40,
            fontFamily: display,
            fontWeight: 700,
            color: COLORS.terracotta,
            fontSize: 130,
            lineHeight: 1,
          }}
        >
          {offer.price}
        </div>
      )}
    </AbsoluteFill>
  );
};

const SceneCta: React.FC<{ name: string }> = ({ name }) => {
  const frame = useCurrentFrame();
  const iconS = spring({ frame, fps: 30, config: { damping: 14 } });
  const lineO = ease(frame, 18, 36);
  const ctaO = ease(frame, 36, 60);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Img
        src={staticFile("images/app-icon-1wm.png")}
        style={{ width: 200, height: 200, transform: `scale(${interpolate(iconS, [0, 1], [0.7, 1])})`, opacity: iconS }}
      />
      <div
        style={{
          opacity: lineO,
          marginTop: 32,
          fontFamily: display,
          fontWeight: 700,
          color: COLORS.cream,
          fontSize: 48,
          textAlign: "center",
          padding: "0 60px",
          lineHeight: 1.15,
        }}
      >
        Découvrez {name}
        <br />sur One World Morocco
      </div>
      <div
        style={{
          opacity: ctaO,
          marginTop: 32,
          fontFamily: body,
          color: COLORS.gold,
          fontSize: 26,
          letterSpacing: 3,
        }}
      >
        oneworldmorocco.com
      </div>
    </AbsoluteFill>
  );
};

const BAD_HOSTS = ["example.com", "example.org", "placeholder", "test.com", "localhost"];
const sanitizeImages = (arr: string[]): string[] =>
  (arr || []).filter((u) => {
    if (typeof u !== "string") return false;
    if (!/^https?:\/\//i.test(u)) return false;
    const lower = u.toLowerCase();
    return !BAD_HOSTS.some((h) => lower.includes(h));
  });

export const BusinessShowcase: React.FC<ShowcaseProps> = ({
  name = "Établissement",
  hook = "Une adresse à découvrir.",
  tagline = "L'art de vivre marocain.",
  city,
  images = [],
  offer = null,
}) => {
  const safeImages = sanitizeImages(images);
  const heroImg = safeImages[0];
  const galleryImgs = safeImages.slice(1);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.night }}>
      <Background />
      <Sequence from={0} durationInFrames={120}>
        <SceneHook name={name} hook={hook} img={heroImg} />
      </Sequence>
      <Sequence from={120} durationInFrames={120}>
        <SceneTagline tagline={tagline} />
      </Sequence>
      <Sequence from={240} durationInFrames={150}>
        <SceneGallery images={galleryImgs.length ? galleryImgs : safeImages} />
      </Sequence>

      {offer && (
        <Sequence from={390} durationInFrames={120}>
          <SceneOffer offer={offer} city={city} />
        </Sequence>
      )}
      <Sequence from={offer ? 510 : 390} durationInFrames={offer ? 150 : 270}>
        <SceneCta name={name} />
      </Sequence>
    </AbsoluteFill>
  );
};
