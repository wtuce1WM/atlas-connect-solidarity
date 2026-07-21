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

export type TextPosition = "top" | "middle" | "bottom";
export type Tone = "immersif" | "dynamique" | "elegant";

const textPositionStyle = (position: TextPosition = "middle"): React.CSSProperties => {
  switch (position) {
    case "top": return { justifyContent: "flex-start", paddingTop: 100, paddingBottom: 40 };
    case "bottom": return { justifyContent: "flex-end", paddingTop: 40, paddingBottom: 140 };
    default: return { justifyContent: "center", paddingTop: 60, paddingBottom: 60 };
  }
};

// Tone drives visual pacing + finishing:
// - immersif : lent, ample, chaleureux (Ken Burns fort, fondus longs, vignette profonde)
// - dynamique : rapide, punchy (Ken Burns bref, fondus courts, contraste chaud)
// - elegant   : posé, minimal (mouvement doux, fondus longs, désaturation légère)
export type ToneConfig = {
  kenBurnsZoom: number;     // amplitude du zoom Ken Burns
  fadeFrames: number;       // frames de fondu entrée/sortie
  overlay: string;          // finition globale (superposition CSS)
};
export const TONE_CONFIG: Record<Tone, ToneConfig> = {
  immersif:  { kenBurnsZoom: 0.22, fadeFrames: 16, overlay: "radial-gradient(80% 100% at 50% 50%,rgba(0,0,0,0) 40%,rgba(0,0,0,0.35) 100%)" },
  dynamique: { kenBurnsZoom: 0.10, fadeFrames: 6,  overlay: "linear-gradient(180deg,rgba(192,79,23,0.10) 0%,rgba(0,0,0,0.15) 100%)" },
  elegant:   { kenBurnsZoom: 0.06, fadeFrames: 20, overlay: "linear-gradient(180deg,rgba(255,255,255,0.04) 0%,rgba(0,0,0,0.10) 100%)" },
};
const ToneContext = React.createContext<Tone>("immersif");
const useTone = (): ToneConfig => TONE_CONFIG[React.useContext(ToneContext)] ?? TONE_CONFIG.immersif;

export type ShowcaseProps = {
  name?: string;
  hook?: string;
  tagline?: string;
  city?: string;
  neighborhood?: string | null;
  category?: string;
  images?: string[];
  videos?: string[];
  offer?: { title?: string; price?: string; lines?: string[]; background_video_url?: string; background_image_url?: string } | null;
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
  showDigitalId?: boolean;
  slug?: string | null;
  logoUrl?: string | null;
  whatsapp?: string | null;
  instagramUrl?: string | null;
  ficheScreenshotUrl?: string | null;
  durationSec?: number;
  useFullHookScene?: boolean;
  scene_media?: Partial<Record<"hook" | "name" | "media" | "offer" | "reviews" | "hours" | "map" | "digital" | "cta" | "outro", Array<{ url: string; kind: "image" | "video" }>>>;
  scene_order?: Array<"hook" | "name" | "media" | "offer" | "reviews" | "hours" | "map" | "digital" | "cta" | "outro">;
  scene_durations?: Partial<Record<"hook" | "name" | "media" | "offer" | "reviews" | "hours" | "map" | "digital" | "cta" | "outro", number>>;
  textPosition?: TextPosition;
  tone?: Tone;
};

export const DIGITAL_ID_FRAMES = 150; // 5s — 2 phases (fiche, QR)

const splitHookInTwo = (h: string): [string, string] => {
  const t = (h || "").trim();
  if (!t) return ["", ""];
  const m = t.match(/^(.+?[,;:—–-])\s+(.+)$/);
  if (m && m[1].length > 10 && m[2].length > 10) return [m[1].trim(), m[2].trim()];
  const words = t.split(/\s+/);
  if (words.length < 4) return [t, ""];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
};

type SceneKind = "hook" | "name" | "media" | "offer" | "reviews" | "hours" | "map" | "digital" | "cta" | "outro";

const DEFAULT_SCENE_ORDER: SceneKind[] = ["hook", "name", "media", "offer", "reviews", "hours", "map", "digital", "cta"];

function isSceneActive(kind: SceneKind, p: ShowcaseProps): boolean {
  switch (kind) {
    case "hook":
    case "name":
    case "media":
    case "cta": return true;
    case "offer": return !!p.offer;
    case "reviews": return !!(p.showReviews && (p.rating || p.reviewsCount));
    case "hours": return !!(p.showOpeningHours && p.openingHours);
    case "map": return !!(p.showMap && p.latitude && p.longitude);
    case "digital": return !!(p.showDigitalId && p.slug);
    case "outro": return false; // merged into cta scene
  }
}

function defaultSceneFrames(kind: SceneKind, p: ShowcaseProps): number {
  switch (kind) {
    case "hook": return 120;
    case "name": return 120;
    case "media": return 150;
    case "offer": {
      const lines = p.offer && Array.isArray(p.offer.lines) ? p.offer.lines.length : 0;
      return 120 + Math.min(lines, 6) * 22;
    }
    case "reviews":
    case "hours":
    case "map": return OPTION_SCENE_FRAMES;
    case "digital": return DIGITAL_ID_FRAMES;
    case "cta":
    case "outro": return 150;
  }
}

export function buildScenePlan(p: ShowcaseProps): Array<{ kind: SceneKind; from: number; duration: number }> {
  const active = DEFAULT_SCENE_ORDER.filter((k) => isSceneActive(k, p));
  let order = active;
  if (Array.isArray(p.scene_order) && p.scene_order.length) {
    const requested = (p.scene_order as SceneKind[]).filter((k) => active.includes(k));
    for (const k of active) if (!requested.includes(k)) requested.push(k);
    order = requested;
  }
  const durOverride = (k: SceneKind): number | null => {
    const v = p.scene_durations?.[k];
    return v != null && Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v) * 30) : null;
  };
  const durations: Record<string, number> = {};
  for (const k of order) durations[k] = durOverride(k) ?? defaultSceneFrames(k, p);

  // Stretch CTA to reach requested total if not explicitly overridden
  const requestedFrames = Number.isFinite(p.durationSec) && p.durationSec
    ? Math.round(Number(p.durationSec) * 30)
    : SHOWCASE_TOTAL_FRAMES;
  if (order.includes("cta") && durOverride("cta") == null) {
    const nonCta = order.filter((k) => k !== "cta").reduce((acc, k) => acc + durations[k], 0);
    durations.cta = Math.max(150, requestedFrames - nonCta);
  }

  const plan: Array<{ kind: SceneKind; from: number; duration: number }> = [];
  let cursor = 0;
  for (const k of order) {
    plan.push({ kind: k, from: cursor, duration: durations[k] });
    cursor += durations[k];
  }
  return plan;
}

export const computeShowcaseFrames = (p: ShowcaseProps): number => {
  const plan = buildScenePlan(p);
  const sum = plan.reduce((acc, s) => acc + s.duration, 0);
  return Math.max(sum, 300);
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
  const tone = useTone();
  const local = frame - from;
  const progress = Math.max(0, Math.min(1, local / duration));
  const scale = 1.04 + progress * tone.kenBurnsZoom;
  const o = Math.min(ease(local, 0, tone.fadeFrames), 1 - ease(local, duration - tone.fadeFrames, duration));
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

const SceneHook: React.FC<{ name: string; location: string; img?: string; textPosition?: TextPosition }> = ({ name, location, img, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const titleY = interpolate(spring({ frame: frame - 8, fps: 30, config: { damping: 18 } }), [0, 1], [40, 0]);
  const titleO = ease(frame, 8, 28);
  const locO = ease(frame, 30, 55);
  const out = 1 - ease(frame, 100, 120);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      {img && <KenBurns src={img} from={0} duration={120} />}
      <AbsoluteFill style={{ padding: 60, ...textPositionStyle(textPosition) }}>
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
        {location && (
          <div
            style={{
              opacity: locO,
              marginTop: 18,
              fontFamily: body,
              color: COLORS.gold,
              fontSize: 30,
              lineHeight: 1.3,
              textShadow: "0 2px 12px rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 32 }}>📍</span>
            {location}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const HookOverlay: React.FC<{ text: string; duration: number; textPosition?: TextPosition }> = ({ text, duration, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const o = Math.min(ease(frame, 6, 26), 1 - ease(frame, duration - 20, duration - 2));
  if (!text) return null;
  return (
    <AbsoluteFill style={{ padding: 70, ...textPositionStyle(textPosition), opacity: o }}>
      <div
        style={{
          fontFamily: display,
          fontWeight: 700,
          color: COLORS.cream,
          fontSize: 52,
          lineHeight: 1.18,
          textAlign: "center",
          textShadow: "0 4px 24px rgba(0,0,0,0.75)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

const SceneTagline: React.FC<{ tagline: string; fullHook?: string; showFullHook?: boolean }> = ({ tagline, fullHook, showFullHook }) => {
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
      {showFullHook && fullHook && fullHook !== tagline && (
        <div
          style={{
            opacity: ease(frame, 34, 58),
            marginTop: 34,
            fontFamily: body,
            color: COLORS.gold,
            fontSize: 28,
            lineHeight: 1.28,
            textAlign: "center",
            maxWidth: 620,
          }}
        >
          {fullHook}
        </div>
      )}
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

const SceneOffer: React.FC<{
  offer: { title?: string; price?: string; lines?: string[] };
  city?: string;
  durationFrames?: number;
  textPosition?: TextPosition;
}> = ({ offer, city, durationFrames = 120, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const labelO = ease(frame, 0, 18);
  const titleO = ease(frame, 14, 36);
  const priceS = spring({ frame: frame - 24, fps: 30, config: { damping: 14 } });
  const outStart = Math.max(30, durationFrames - 20);
  const out = 1 - ease(frame, outStart, durationFrames);
  const lines = Array.isArray(offer.lines) ? offer.lines.filter(Boolean).slice(0, 6) : [];
  const hasPrice = !!offer.price;
  return (
    <AbsoluteFill style={{ alignItems: "center", padding: 60, ...textPositionStyle(textPosition), opacity: out }}>
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
          marginTop: 24,
          fontFamily: display,
          fontWeight: 700,
          color: COLORS.cream,
          fontSize: lines.length ? 46 : 54,
          textAlign: "center",
          lineHeight: 1.1,
          padding: "0 20px",
        }}
      >
        {offer.title || "Une expérience signature"}
      </div>
      {hasPrice && (
        <div
          style={{
            opacity: priceS,
            transform: `scale(${interpolate(priceS, [0, 1], [0.85, 1])})`,
            marginTop: lines.length ? 20 : 40,
            fontFamily: display,
            fontWeight: 700,
            color: COLORS.terracotta,
            fontSize: lines.length ? 82 : 130,
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          {offer.price}
        </div>
      )}
      {lines.length > 0 && (
        <div
          style={{
            marginTop: 28,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignItems: "center",
            maxWidth: 620,
          }}
        >
          {lines.map((line, i) => {
            const lineO = ease(frame, 30 + i * 8, 48 + i * 8);
            return (
              <div
                key={i}
                style={{
                  opacity: lineO,
                  fontFamily: body,
                  color: COLORS.cream,
                  fontSize: 24,
                  lineHeight: 1.35,
                  textAlign: "center",
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};

const SceneCta: React.FC<{ name: string; textPosition?: TextPosition }> = ({ name, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const iconS = spring({ frame, fps: 30, config: { damping: 14 } });
  const lineO = ease(frame, 18, 36);
  const ctaO = ease(frame, 36, 60);
  return (
    <AbsoluteFill style={{ alignItems: "center", padding: 60, ...textPositionStyle(textPosition) }}>
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

const SceneInstallCta: React.FC<{ name: string; textPosition?: TextPosition }> = ({ name, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const iconS = spring({ frame, fps: 30, config: { damping: 14 } });
  const titleO = ease(frame, 12, 30);
  const badgeO = ease(frame, 34, 54);
  return (
    <AbsoluteFill style={{ alignItems: "center", padding: 64, ...textPositionStyle(textPosition) }}>
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

const SceneReviews: React.FC<{ rating?: number | null; count?: number | null; textPosition?: TextPosition }> = ({ rating, count, textPosition = "middle" }) => {
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
    <AbsoluteFill style={{ alignItems: "center", padding: 60, ...textPositionStyle(textPosition) }}>
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

const SceneHours: React.FC<{ openingHours: string | Record<string, string>; textPosition?: TextPosition }> = ({ openingHours, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const labelO = ease(frame, 0, 18);
  const entries: Array<[string, string]> = typeof openingHours === "string"
    ? openingHours.split(/\n|;/).map((l) => l.trim()).filter(Boolean).map((l) => {
        const m = l.match(/^([^:]+):\s*(.+)$/);
        return m ? [m[1].trim(), m[2].trim()] : ["", l];
      }).slice(0, 7) as Array<[string, string]>
    : Object.entries(openingHours).slice(0, 7);
  return (
    <AbsoluteFill style={{ alignItems: "center", padding: 60, ...textPositionStyle(textPosition) }}>
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

const SceneMap: React.FC<{ lat: number; lng: number; name: string; address?: string | null; textPosition?: TextPosition }> = ({ lat, lng, name, address, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const labelO = ease(frame, 0, 18);
  const mapO = ease(frame, 10, 30);
  // Google Maps Static via edge proxy (clé stockée côté serveur)
  const mapUrl = `https://plnphgdrawpsnumnejzc.supabase.co/functions/v1/static-map?lat=${lat}&lng=${lng}&zoom=16&size=640x640&scale=2&maptype=roadmap`;
  const pinScale = spring({ frame: frame - 28, fps: 30, config: { damping: 10, stiffness: 180 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", padding: 50, ...textPositionStyle(textPosition) }}>
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

const SceneDigitalId: React.FC<{
  name: string;
  slug: string;
  city?: string;
  tagline?: string;
  hook?: string;
  image?: string;
  logoUrl?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  ficheScreenshotUrl?: string | null;
  textPosition?: TextPosition;
}> = ({ name, slug, city, tagline, hook, image, logoUrl, ficheScreenshotUrl, rating, reviewsCount, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const labelO = ease(frame, 0, 18);
  const shareUrl = `https://oneworldmorocco.com/b/${encodeURIComponent(slug)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=8&data=${encodeURIComponent(shareUrl)}`;
  // Phases: 0-90 fiche dynamique, 90-150 QR
  const phase1O = Math.min(ease(frame, 6, 22), 1 - ease(frame, 85, 95));
  const phase2O = ease(frame, 92, 108);

  const heroImage = logoUrl || image;
  const ratingStr = rating ? rating.toFixed(1) : null;
  const teaser = (hook || tagline || "").replace(/\s+/g, " ").trim().slice(0, 140);

  // Shimmer animation on CTAs (sweeps left→right then repeats with delay)
  const shimmerPeriod = 60; // frames
  const shimmerProgress = ((frame % shimmerPeriod) / shimmerPeriod) * 200 - 50; // -50% → 150%

  const ctaBase: React.CSSProperties = {
    color: "#fff",
    fontFamily: body,
    fontWeight: 700,
    fontSize: 16,
    padding: "14px 18px",
    borderRadius: 14,
    textAlign: "center",
    letterSpacing: 1,
    position: "relative",
    overflow: "hidden",
  };
  const shimmerEl = (
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: `${shimmerProgress}%`,
        width: "40%",
        background: "linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.45) 50%,rgba(255,255,255,0) 100%)",
        transform: "skewX(-20deg)",
        pointerEvents: "none",
      }}
    />
  );

  return (
    <AbsoluteFill style={{ alignItems: "center", padding: 40, ...textPositionStyle(textPosition) }}>
      <div style={{ opacity: labelO, fontFamily: body, color: COLORS.gold, fontSize: 22, letterSpacing: 6, textTransform: "uppercase", marginBottom: 18 }}>
        ID numérique
      </div>

      {/* Device frame */}
      <div
        style={{
          width: 560,
          height: 1020,
          borderRadius: 48,
          background: "#0a0a0a",
          padding: 14,
          position: "relative",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        }}
      >
        {/* Phase 1 — fiche réelle (screenshot live) sinon mockup reconstruit */}
        <AbsoluteFill style={{ opacity: phase1O, padding: 14 }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 36, overflow: "hidden", background: "#0a0807", display: "flex", flexDirection: "column" }}>
            {ficheScreenshotUrl ? (
              <Img src={ficheScreenshotUrl} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
            ) : (
              <>
                <div style={{ position: "relative", width: "100%", height: 360, background: "#1a1410" }}>
                  {heroImage ? (
                    <Img src={heroImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#3a2418,#1a1006)" }} />
                  )}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,0.0) 50%,rgba(10,8,7,0.95) 100%)" }} />
                  {ratingStr && (
                    <div style={{ position: "absolute", top: 16, right: 16, background: "rgba(0,0,0,0.65)", color: "#fff", fontFamily: body, fontWeight: 700, fontSize: 18, padding: "6px 12px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: COLORS.gold }}>★</span> {ratingStr}{reviewsCount ? ` (${reviewsCount})` : ""}
                    </div>
                  )}
                </div>
                <div style={{ padding: "22px 24px", color: "#fff", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ fontFamily: display, fontWeight: 800, fontSize: 30, lineHeight: 1.1 }}>{name}</div>
                  {city && (
                    <div style={{ fontFamily: body, color: COLORS.gold, fontSize: 16, letterSpacing: 1.5, textTransform: "uppercase" }}>
                      📍 {city}
                    </div>
                  )}
                  {teaser && (
                    <div style={{ fontFamily: body, fontStyle: "italic", color: "rgba(255,255,255,0.85)", fontSize: 17, lineHeight: 1.4 }}>
                      « {teaser} »
                    </div>
                  )}
                  <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ ...ctaBase, background: COLORS.terracotta }}>
                      Voir la fiche complète
                      {shimmerEl}
                    </div>
                    <div style={{ ...ctaBase, background: "#1a1410", border: "1px solid rgba(212,175,55,0.4)", fontWeight: 600, fontSize: 14 }}>
                      oneworldmorocco.com/b/{slug}
                      {shimmerEl}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </AbsoluteFill>

        {/* Phase 2 — QR code */}
        <AbsoluteFill style={{ opacity: phase2O, padding: 14 }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 36, background: "#0e0b08", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 36 }}>
            <div style={{ fontFamily: display, fontWeight: 800, color: "#fff", fontSize: 30, textAlign: "center", marginBottom: 22 }}>{name}</div>
            <div style={{ background: "#fff", padding: 18, borderRadius: 22, boxShadow: "0 12px 40px rgba(212,175,55,0.25)" }}>
              <Img src={qrUrl} style={{ width: 340, height: 340, display: "block" }} />
            </div>
            <div style={{ marginTop: 20, fontFamily: body, color: COLORS.gold, fontSize: 17, letterSpacing: 4, textTransform: "uppercase" }}>
              Scannez pour découvrir
            </div>
          </div>
        </AbsoluteFill>
      </div>
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
      <OffthreadVideo src={src} muted loop style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
        <OffthreadVideo src={src} muted loop style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
  neighborhood,
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
  showDigitalId,
  slug,
  logoUrl,
  whatsapp,
  instagramUrl,
  ficheScreenshotUrl,
  durationSec,
  useFullHookScene,
  scene_media,
  scene_order,
  scene_durations,
  textPosition = "middle",
  tone = "immersif",
}) => {
  const safeVideos = sanitizeUrls(videos);
  const safeImages = sanitizeUrls(images);
  const hasVideos = safeVideos.length > 0;
  const hasImages = safeImages.length > 0;
  const mixedMode = hasVideos && hasImages;
  const useVideos = hasVideos && !mixedMode;

  // Per-scene overrides (if provided). Fall back to computed defaults otherwise.
  const sm = scene_media || {};
  const hookOverride = Array.isArray(sm.hook) ? sm.hook : [];
  const nameOverride = Array.isArray(sm.name) ? sm.name : [];
  const mediaOverride = Array.isArray(sm.media) ? sm.media : [];
  const offerOverride = Array.isArray(sm.offer) ? sm.offer : [];
  const outroOverride = Array.isArray(sm.outro) ? sm.outro : [];

  const defaultHero = mixedMode ? safeImages[0] : (useVideos ? safeVideos[0] : safeImages[0]);
  const defaultGallery = mixedMode
    ? safeVideos
    : (useVideos ? safeVideos.slice(1) : safeImages.slice(1));
  const defaultGalleryList = defaultGallery.length ? defaultGallery : (useVideos ? safeVideos : safeImages);

  // Scene 1 (Hook 0-120)
  const hookItem = hookOverride[0];
  const heroMedia = hookItem?.url ?? defaultHero;
  const heroIsVideo = hookItem ? hookItem.kind === "video" : (mixedMode ? false : useVideos);

  // Scene 2 (Name/Hook overlay 120-240)
  const nameItem = nameOverride[0] ?? hookOverride[1];
  const nameMediaUrl = nameItem?.url ?? defaultGalleryList[0];
  const nameIsVideo = nameItem ? nameItem.kind === "video" : (mixedMode || useVideos);

  // Scene 3 (Media montage 240-390)
  const mediaList = mediaOverride.length ? mediaOverride : null;
  const defaultMediaSlice = defaultGalleryList.slice(1, 4);

  // Outro/CTA backdrop
  const outroItem = outroOverride[0];


  const locationLine = [city, neighborhood].filter(Boolean).join(" · ");
  const [hookPart1, hookPart2] = splitHookInTwo(hook);

  // Build the ordered scene plan (honors props.scene_order + props.scene_durations)
  const plan = buildScenePlan({
    offer,
    rating,
    reviewsCount,
    openingHours,
    latitude,
    longitude,
    showReviews,
    showOpeningHours,
    showMap,
    showDigitalId,
    slug,
    durationSec,
    scene_order,
    scene_durations,
  });

  const renderScene = (kind: SceneKind, duration: number): React.ReactNode => {
    switch (kind) {
      case "hook":
        return heroIsVideo && heroMedia ? (
          <AbsoluteFill>
            <VideoCover src={heroMedia} from={0} duration={duration} />
            <SceneHook name={name} location={locationLine} textPosition={textPosition} />
          </AbsoluteFill>
        ) : (
          <SceneHook name={name} location={locationLine} img={heroMedia} textPosition={textPosition} />
        );
      case "name":
        return (
          <AbsoluteFill>
            {nameMediaUrl ? (
              nameIsVideo ? (
                <VideoCover src={nameMediaUrl} from={0} duration={duration} />
              ) : (
                <KenBurns src={nameMediaUrl} from={0} duration={duration} />
              )
            ) : null}
            <HookOverlay text={hookPart1} duration={duration} textPosition={textPosition} />
          </AbsoluteFill>
        );
      case "media":
        return (
          <AbsoluteFill>
            {mediaList ? (
              <AbsoluteFill>
                {mediaList.slice(0, 3).map((m, i) => (
                  m.kind === "video" ? (
                    <VideoCover key={m.url + i} src={m.url} from={i * 50} duration={70} />
                  ) : (
                    <KenBurns key={m.url + i} src={m.url} from={i * 50} duration={70} />
                  )
                ))}
              </AbsoluteFill>
            ) : (mixedMode || useVideos) ? (
              <AbsoluteFill>
                {defaultMediaSlice.map((src, i) => (
                  <VideoCover key={src + i} src={src} from={i * 50} duration={70} />
                ))}
              </AbsoluteFill>
            ) : (
              <SceneGallery images={defaultGalleryList.slice(1)} />
            )}
            <HookOverlay text={hookPart2 || hookPart1} duration={duration} textPosition={textPosition} />
          </AbsoluteFill>
        );
      case "offer":
        if (!offer) return null;
        return (
          <AbsoluteFill>
            {(() => {
              const offerBgItem = offerOverride[0];
              const bgVideo = offerBgItem?.kind === "video" ? offerBgItem.url : offer.background_video_url;
              const bgImage = offerBgItem?.kind === "image" ? offerBgItem.url : offer.background_image_url;
              if (bgVideo || bgImage) {
                return (
                  <>
                    <VideoBackdrop src={bgVideo} image={bgImage} />
                    <AbsoluteFill style={{ background: "linear-gradient(180deg,rgba(14,11,8,0.55) 0%,rgba(14,11,8,0.78) 100%)" }} />
                  </>
                );
              }
              return null;
            })()}
            <SceneOffer offer={offer} city={city} durationFrames={duration} textPosition={textPosition} />
          </AbsoluteFill>
        );
      case "reviews": {
        const it = (sm.reviews || [])[0];
        return (
          <>
            {it
              ? <VideoBackdrop src={it.kind === "video" ? it.url : undefined} image={it.kind === "image" ? it.url : undefined} />
              : <VideoBackdrop src={safeVideos[0]} image={safeImages[0]} />}
            <SceneReviews rating={rating} count={reviewsCount} textPosition={textPosition} />
          </>
        );
      }
      case "hours": {
        const it = (sm.hours || [])[0];
        return (
          <>
            {it
              ? <VideoBackdrop src={it.kind === "video" ? it.url : undefined} image={it.kind === "image" ? it.url : undefined} />
              : <VideoBackdrop src={safeVideos[1] ?? safeVideos[0]} image={safeImages[1] ?? safeImages[0]} />}
            <SceneHours openingHours={openingHours!} textPosition={textPosition} />
          </>
        );
      }
      case "map": {
        const it = (sm.map || [])[0];
        return (
          <>
            {it
              ? <VideoBackdrop src={it.kind === "video" ? it.url : undefined} image={it.kind === "image" ? it.url : undefined} />
              : <VideoBackdrop src={safeVideos[2] ?? safeVideos[0]} image={safeImages[2] ?? safeImages[0]} />}
            <SceneMap lat={latitude!} lng={longitude!} name={name} address={address} textPosition={textPosition} />
          </>
        );
      }
      case "digital": {
        const it = (sm.digital || [])[0];
        return (
          <>
            {it
              ? <VideoBackdrop src={it.kind === "video" ? it.url : undefined} image={it.kind === "image" ? it.url : undefined} />
              : <VideoBackdrop src={safeVideos[3] ?? safeVideos[0]} image={safeImages[3] ?? safeImages[0]} />}
            <SceneDigitalId
              name={name}
              slug={slug!}
              city={city}
              tagline={tagline}
              hook={hook}
              image={safeImages[0]}
              logoUrl={logoUrl}
              whatsapp={whatsapp}
              instagram={instagramUrl}
              rating={rating}
              reviewsCount={reviewsCount}
              ficheScreenshotUrl={ficheScreenshotUrl}
              textPosition={textPosition}
            />
          </>
        );
      }
      case "cta":
      case "outro": {
        const it = (sm.cta || [])[0] ?? outroItem;
        return (
          <>
            {it
              ? <VideoBackdrop src={it.kind === "video" ? it.url : undefined} image={it.kind === "image" ? it.url : undefined} />
              : <VideoBackdrop src={safeVideos[0]} image={safeImages[0]} />}
            {showAppInstall
              ? <SceneInstallCta name={name} textPosition={textPosition} />
              : <SceneCta name={name} textPosition={textPosition} />}
          </>
        );
      }
    }
  };

  const toneOverlay = TONE_CONFIG[tone]?.overlay ?? TONE_CONFIG.immersif.overlay;
  return (
    <ToneContext.Provider value={tone}>
      <AbsoluteFill style={{ backgroundColor: COLORS.night }}>
        <Background />
        {plan.map((s) => (
          <Sequence key={`${s.kind}-${s.from}`} from={s.from} durationInFrames={s.duration}>
            {renderScene(s.kind, s.duration)}
          </Sequence>
        ))}
        {/* Finition visuelle liée au ton (vignette / teinte / désaturation) */}
        <AbsoluteFill style={{ background: toneOverlay, pointerEvents: "none" }} />
      </AbsoluteFill>
    </ToneContext.Provider>
  );
};


