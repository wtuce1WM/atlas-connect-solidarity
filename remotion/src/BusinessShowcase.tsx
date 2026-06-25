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

// Base 22s @ 30fps — étendu dynamiquement par les options
export const SHOWCASE_TOTAL_FRAMES = 660;
export const OPTION_SCENE_FRAMES = 90; // 3s par scène optionnelle

export type ShowcaseProps = {
  name?: string;
  hook?: string;
  tagline?: string;
  city?: string;
  category?: string;
  images?: string[];
  videos?: string[];
  offer?: { title?: string; price?: string } | null;
  rating?: number | null;
  reviewsCount?: number | null;
  openingHours?: string | Record<string, string> | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  showReviews?: boolean;
  showOpeningHours?: boolean;
  showMap?: boolean;
  showAppInstall?: boolean;
  durationSec?: number;
};

export const computeShowcaseFrames = (p: ShowcaseProps): number => {
  let cursor = 390;
  if (p.offer) cursor += 120;
  if (p.showReviews && (p.rating || p.reviewsCount)) cursor += OPTION_SCENE_FRAMES;
  if (p.showOpeningHours && p.openingHours) cursor += OPTION_SCENE_FRAMES;
  if (p.showMap && p.latitude && p.longitude) cursor += OPTION_SCENE_FRAMES;
  const naturalEnd = cursor + 150;
  const requestedEnd = Number.isFinite(p.durationSec) && p.durationSec ? Math.round(Number(p.durationSec) * 30) : SHOWCASE_TOTAL_FRAMES;
  return Math.max(naturalEnd, requestedEnd);
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

const SceneInstallCta: React.FC<{ name: string }> = ({ name }) => {
  const frame = useCurrentFrame();
  const iconS = spring({ frame, fps: 30, config: { damping: 14 } });
  const titleO = ease(frame, 12, 30);
  const badgeO = ease(frame, 34, 54);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 64 }}>
      <Img
        src={staticFile("images/app-icon-1wm.png")}
        style={{ width: 190, height: 190, transform: `scale(${interpolate(iconS, [0, 1], [0.72, 1])})`, opacity: iconS }}
      />
      <div
        style={{
          opacity: titleO,
          marginTop: 34,
          fontFamily: display,
          fontWeight: 700,
          color: COLORS.cream,
          fontSize: 46,
          textAlign: "center",
          lineHeight: 1.12,
          textShadow: "0 4px 24px rgba(0,0,0,0.65)",
        }}
      >
        Emportez {name}
        <br />dans votre Maroc
      </div>
      <div
        style={{
          opacity: badgeO,
          marginTop: 38,
          width: 330,
          height: 74,
          borderRadius: 18,
          background: COLORS.terracotta,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: body,
          fontWeight: 800,
          color: COLORS.cream,
          fontSize: 26,
          letterSpacing: 1,
          boxShadow: "0 18px 54px rgba(192,79,23,0.35)",
        }}
      >
        Installer l'app
      </div>
      <div style={{ opacity: badgeO, marginTop: 24, fontFamily: body, color: COLORS.gold, fontSize: 24 }}>
        One World Morocco
      </div>
    </AbsoluteFill>
  );
};

const SceneReviews: React.FC<{ rating?: number | null; count?: number | null }> = ({ rating, count }) => {
  const frame = useCurrentFrame();
  const labelO = ease(frame, 0, 18);
  const noteTarget = rating ? (rating > 5 ? rating : rating * 4) : null;
  // Défilement visuel de la note /20 (comme le compteur d'avis)
  const noteProgress = ease(frame, 8, 50);
  const animatedNote = noteTarget != null ? (noteTarget * noteProgress).toFixed(1) : null;
  const noteScale = interpolate(ease(frame, 8, 30), [0, 1], [0.7, 1]);
  const countProgress = ease(frame, 14, 50);
  const animatedCount = count ? Math.round(count * countProgress) : 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div style={{ opacity: labelO, fontFamily: body, color: COLORS.gold, fontSize: 22, letterSpacing: 6, textTransform: "uppercase" }}>
        Avis clients
      </div>
      {animatedNote && (
        <div
          style={{
            opacity: ease(frame, 8, 24),
            transform: `scale(${noteScale})`,
            marginTop: 30,
            fontFamily: display,
            fontWeight: 700,
            color: COLORS.terracotta,
            fontSize: 180,
            lineHeight: 1,
            textShadow: "0 4px 24px rgba(0,0,0,0.6)",
          }}
        >
          {animatedNote}
          <span style={{ fontSize: 70, color: COLORS.cream }}>/20</span>
        </div>
      )}
      {count != null && count > 0 && (
        <div style={{ marginTop: 30, fontFamily: display, fontWeight: 700, color: COLORS.cream, fontSize: 56, textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>
          {animatedCount.toLocaleString("fr-FR")}
          <span style={{ fontSize: 26, color: COLORS.gold, marginLeft: 14, letterSpacing: 3, textTransform: "uppercase" }}>avis</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

const SceneHours: React.FC<{ openingHours: string | Record<string, string> }> = ({ openingHours }) => {
  const frame = useCurrentFrame();
  const labelO = ease(frame, 0, 18);
  const entries: Array<[string, string]> = typeof openingHours === "string"
    ? openingHours.split(/\n|;/).map((l) => l.trim()).filter(Boolean).map((l) => {
        const m = l.match(/^([^:]+):\s*(.+)$/);
        return m ? [m[1].trim(), m[2].trim()] : ["", l];
      }).slice(0, 7) as Array<[string, string]>
    : Object.entries(openingHours).slice(0, 7);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div style={{ opacity: labelO, fontFamily: body, color: COLORS.gold, fontSize: 22, letterSpacing: 6, textTransform: "uppercase" }}>
        Horaires
      </div>
      <div style={{ marginTop: 30, width: "85%", maxWidth: 620 }}>
        {entries.map(([day, hours], i) => {
          const o = ease(frame, 12 + i * 4, 26 + i * 4);
          const y = interpolate(o, [0, 1], [20, 0]);
          return (
            <div
              key={i}
              style={{
                opacity: o,
                transform: `translateY(${y}px)`,
                display: "flex",
                justifyContent: "space-between",
                padding: "14px 0",
                borderBottom: "1px solid rgba(212,175,55,0.18)",
                fontFamily: body,
                fontSize: 28,
              }}
            >
              <span style={{ color: COLORS.cream, fontWeight: 600 }}>{day}</span>
              <span style={{ color: COLORS.gold }}>{hours}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const SceneMap: React.FC<{ lat: number; lng: number; name: string; address?: string | null }> = ({ lat, lng, name, address }) => {
  const frame = useCurrentFrame();
  const labelO = ease(frame, 0, 18);
  const mapO = ease(frame, 10, 30);
  // Google Maps Static via edge proxy (clé stockée côté serveur)
  const mapUrl = `https://plnphgdrawpsnumnejzc.supabase.co/functions/v1/static-map?lat=${lat}&lng=${lng}&zoom=16&size=640x640&scale=2&maptype=roadmap`;
  const pinScale = spring({ frame: frame - 28, fps: 30, config: { damping: 10, stiffness: 180 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", padding: 50 }}>
      <div style={{ opacity: labelO, marginTop: 30, fontFamily: body, color: COLORS.gold, fontSize: 22, letterSpacing: 6, textTransform: "uppercase" }}>
        Localisation
      </div>
      <div
        style={{
          opacity: mapO,
          marginTop: 30,
          width: 620,
          height: 620,
          borderRadius: 24,
          overflow: "hidden",
          position: "relative",
          border: `2px solid ${COLORS.gold}`,
          boxShadow: "0 18px 60px rgba(0,0,0,0.6)",
        }}
      >
        <Img src={mapUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {/* Pin custom au-dessus */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -100%) scale(${interpolate(pinScale, [0, 1], [0, 1])})`,
            transformOrigin: "bottom center",
            fontSize: 80,
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.6))",
          }}
        >
          📍
        </div>
      </div>
      <div style={{ opacity: mapO, marginTop: 24, fontFamily: display, fontWeight: 700, color: COLORS.cream, fontSize: 32, textAlign: "center" }}>
        {name}
      </div>
      {address && (
        <div style={{ opacity: mapO, marginTop: 8, fontFamily: body, color: COLORS.gold, fontSize: 22, textAlign: "center" }}>
          {address}
        </div>
      )}
    </AbsoluteFill>
  );
};

const BAD_HOSTS = ["example.com", "example.org", "placeholder", "test.com", "localhost"];
const sanitizeUrls = (arr: string[]): string[] =>
  (arr || []).filter((u) => {
    if (typeof u !== "string") return false;
    if (!/^https?:\/\//i.test(u)) return false;
    const lower = u.toLowerCase();
    return !BAD_HOSTS.some((h) => lower.includes(h));
  });

const VideoCover: React.FC<{ src: string; from: number; duration: number }> = ({ src, from, duration }) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  const o = Math.min(ease(local, 0, 12), 1 - ease(local, duration - 12, duration));
  return (
    <AbsoluteFill style={{ opacity: o, overflow: "hidden" }}>
      <OffthreadVideo src={src} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <AbsoluteFill
        style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.05) 40%,rgba(14,11,8,0.85) 100%)" }}
      />
    </AbsoluteFill>
  );
};

// Fond vidéo en boucle + voile sombre — pour scènes Avis / Horaires / Map / CTA
const VideoBackdrop: React.FC<{ src?: string; image?: string }> = ({ src, image }) => {
  if (src) {
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <OffthreadVideo src={src} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <AbsoluteFill style={{ background: "rgba(14,11,8,0.72)" }} />
      </AbsoluteFill>
    );
  }
  if (image) {
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img src={image} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <AbsoluteFill style={{ background: "rgba(14,11,8,0.72)" }} />
      </AbsoluteFill>
    );
  }
  return null;
};

const removeDecorativeTaglineWords = (value: string): string =>
  value
    .replace(/\bterracotta(?:é|e|s)?\b/gi, "")
    .replace(/\s+([,.:;!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.:;!?-]+|[\s,.:;!?-]+$/g, "")
    .trim();

export const BusinessShowcase: React.FC<ShowcaseProps> = ({
  name = "Établissement",
  hook = "Une adresse à découvrir.",
  tagline = "L'art de vivre marocain.",
  city,
  images = [],
  videos = [],
  offer = null,
  rating,
  reviewsCount,
  openingHours,
  address,
  latitude,
  longitude,
  showReviews,
  showOpeningHours,
  showMap,
  showAppInstall,
  durationSec,
}) => {
  const safeVideos = sanitizeUrls(videos);
  const safeImages = sanitizeUrls(images);
  const useVideos = safeVideos.length > 0;
  const heroMedia = useVideos ? safeVideos[0] : safeImages[0];
  const galleryMedia = useVideos ? safeVideos.slice(1) : safeImages.slice(1);
  const galleryList = galleryMedia.length ? galleryMedia : (useVideos ? safeVideos : safeImages);
  const safeTagline = removeDecorativeTaglineWords(tagline) || hook;

  // Position courante après les scènes de base
  let cursor = 390;
  if (offer) cursor += 120;

  const reviewsActive = !!(showReviews && (rating || reviewsCount));
  const hoursActive = !!(showOpeningHours && openingHours);
  const mapActive = !!(showMap && latitude && longitude);

  const reviewsFrom = reviewsActive ? cursor : null;
  if (reviewsActive) cursor += OPTION_SCENE_FRAMES;
  const hoursFrom = hoursActive ? cursor : null;
  if (hoursActive) cursor += OPTION_SCENE_FRAMES;
  const mapFrom = mapActive ? cursor : null;
  if (mapActive) cursor += OPTION_SCENE_FRAMES;

  const ctaFrom = cursor;
  const totalFrames = computeShowcaseFrames({
    offer,
    rating,
    reviewsCount,
    openingHours,
    latitude,
    longitude,
    showReviews,
    showOpeningHours,
    showMap,
    durationSec,
  });
  const ctaDuration = Math.max(150, totalFrames - ctaFrom);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.night }}>
      <Background />
      <Sequence from={0} durationInFrames={120}>
        {useVideos && heroMedia ? (
          <AbsoluteFill>
            <VideoCover src={heroMedia} from={0} duration={120} />
            <SceneHook name={name} hook={hook} />
          </AbsoluteFill>
        ) : (
          <SceneHook name={name} hook={hook} img={heroMedia} />
        )}
      </Sequence>
      <Sequence from={120} durationInFrames={120}>
        <SceneTagline tagline={safeTagline} />
      </Sequence>
      <Sequence from={240} durationInFrames={150}>
        {useVideos ? (
          <AbsoluteFill>
            {galleryList.slice(0, 3).map((src, i) => (
              <VideoCover key={src + i} src={src} from={i * 50} duration={70} />
            ))}
          </AbsoluteFill>
        ) : (
          <SceneGallery images={galleryList} />
        )}
      </Sequence>

      {offer && (
        <Sequence from={390} durationInFrames={120}>
          <SceneOffer offer={offer} city={city} />
        </Sequence>
      )}

      {reviewsFrom !== null && (
        <Sequence from={reviewsFrom} durationInFrames={OPTION_SCENE_FRAMES}>
          <VideoBackdrop src={safeVideos[0]} image={safeImages[0]} />
          <SceneReviews rating={rating} count={reviewsCount} />
        </Sequence>
      )}
      {hoursFrom !== null && openingHours && (
        <Sequence from={hoursFrom} durationInFrames={OPTION_SCENE_FRAMES}>
          <VideoBackdrop src={safeVideos[1] ?? safeVideos[0]} image={safeImages[1] ?? safeImages[0]} />
          <SceneHours openingHours={openingHours} />
        </Sequence>
      )}
      {mapFrom !== null && (
        <Sequence from={mapFrom} durationInFrames={OPTION_SCENE_FRAMES}>
          <VideoBackdrop src={safeVideos[2] ?? safeVideos[0]} image={safeImages[2] ?? safeImages[0]} />
          <SceneMap lat={latitude!} lng={longitude!} name={name} address={address} />
        </Sequence>
      )}

      <Sequence from={ctaFrom} durationInFrames={ctaDuration}>
        <VideoBackdrop src={safeVideos[0]} image={safeImages[0]} />
        {showAppInstall ? <SceneInstallCta name={name} /> : <SceneCta name={name} />}
      </Sequence>
    </AbsoluteFill>
  );
};


