import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Img,
  OffthreadVideo,
  Audio,
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

// ===== Transitions entre les plans =====
export type TransitionEffect = "crossfade" | "fade_black" | "wipe" | "zoom" | "kenburns" | "slide" | "cut" | "fast" | "mix";
// Effets réellement utilisables quand "Mix" est choisi (tout sauf fast / mix)
const MIX_POOL: TransitionEffect[] = ["kenburns", "crossfade", "slide", "fade_black", "wipe", "zoom"];
const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};
const resolveMix = (effect: TransitionEffect, seed: string): TransitionEffect =>
  effect === "mix" ? MIX_POOL[hashString(seed) % MIX_POOL.length] : effect;
export type TransitionStyle = "auto" | "doux" | "dynamique" | "minimal";
export type TransitionsConfig = {
  style?: TransitionStyle;
  differentiate?: boolean;
  video?: TransitionEffect;
  image?: TransitionEffect;
};
const STYLE_PRESETS: Record<TransitionStyle, { video: TransitionEffect; image: TransitionEffect }> = {
  auto: { video: "crossfade", image: "kenburns" },
  doux: { video: "crossfade", image: "crossfade" },
  dynamique: { video: "zoom", image: "slide" },
  minimal: { video: "cut", image: "fade_black" },
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
// Mode "vidéo unique en fond continu" : neutralise tous les fonds de scène
const SuppressBgContext = React.createContext<boolean>(false);
const useSuppressBg = (): boolean => React.useContext(SuppressBgContext);
const useTone = (): ToneConfig => TONE_CONFIG[React.useContext(ToneContext)] ?? TONE_CONFIG.immersif;

// ===== Langue du montage (indépendante de la langue du front) =====
export type VideoLang = "fr" | "en";
const LABELS = {
  fr: {
    offer: "Offre",
    reviews: "Avis clients",
    reviewsWord: "avis",
    reviewsOf: (platform: string) => `Avis ${platform}`,
    hours: "Horaires",
    discover: (name: string) => `Découvrez ${name}`,
    onPlatform: "sur One World Morocco",
    installApp: "Installer l'app",
    viewFullPage: "Voir la fiche complète",
    scanToDiscover: "Scannez pour découvrir",
    whatsappDirect: "WhatsApp direct",
    numberLocale: "fr-FR",
    defaultName: "Établissement",
    defaultHook: "Une adresse à découvrir.",
    defaultTagline: "L'art de vivre marocain.",
  },
  en: {
    offer: "Offer",
    reviews: "Customer reviews",
    reviewsWord: "reviews",
    reviewsOf: (platform: string) => `${platform} reviews`,
    hours: "Opening hours",
    discover: (name: string) => `Discover ${name}`,
    onPlatform: "on One World Morocco",
    installApp: "Get the app",
    viewFullPage: "View full listing",
    scanToDiscover: "Scan to discover",
    whatsappDirect: "Direct WhatsApp",
    numberLocale: "en-GB",
    defaultName: "Venue",
    defaultHook: "An address worth discovering.",
    defaultTagline: "The Moroccan art of living.",
  },
} as const;
const LangContext = React.createContext<VideoLang>("fr");
const useL = () => LABELS[React.useContext(LangContext)] ?? LABELS.fr;



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
  offers?: Array<{ title?: string; price?: string; lines?: string[]; background_video_url?: string; background_image_url?: string }> | null;
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
  openWithLogo?: boolean;
  whatsapp?: string | null;
  instagramUrl?: string | null;
  ficheScreenshotUrl?: string | null;
  showBlogArticles?: boolean;
  blogMode?: "scroll" | "hero_map";
  blogArticles?: Array<{ id: string; slug: string; mode?: "scroll" | "hero_map"; title: string; excerpt?: string | null; heroUrl?: string | null; url?: string | null; scrollShotUrl?: string | null }>;
  scenePois?: Record<string, PlaceItem[]>;
  sceneDestinations?: Record<string, PlaceItem[]>;
  /** Média des lieux liés : vidéo 1 (défaut) ou image 1. */
  placesMediaMode?: "videos" | "images";
  durationSec?: number;
  useFullHookScene?: boolean;
  lang?: VideoLang;
  scene_media?: Partial<Record<"logo" | "hook" | "name" | "media" | "popup" | "offer" | "highlight" | "reviews" | "google_review" | "tripadvisor" | "restaurant_guru" | "customer_review" | "hours" | "map" | "digital" | "whatsapp" | "cta" | "outro", Array<{ url: string; kind: "image" | "video" }>>>;
  scene_order?: Array<string>; // built-in kinds or `custom:<id>`
  scene_durations?: Partial<Record<string, number>>;
  custom_scenes?: Array<{
    id: string;
    mode: "fullscreen" | "overlay";
    title: string;
    subtitle?: string;
    duration: number; // seconds
    media?: { url: string; kind: "image" | "video" };
    mediaList?: Array<{ url: string; kind: "image" | "video" }>;
    priceBadge?: string;
  }>;
  textPosition?: TextPosition;
  tone?: Tone;
  freeZone?: boolean;
  freeZoneTitle?: string;
  freeZoneSubtitle?: string;
  showPopup?: boolean;
  popupImageUrl?: string | null;
  popupTitle?: string | null;
  popupDescription?: string | null;
  highlights?: Array<{ id?: string; icon?: string | null; image_url?: string | null; title?: string; description?: string; metric_title?: string; metric_value?: string }> | null;
  showGoogleReviews?: boolean;
  googleReview?: { rating: number | null; count: number | null; url: string | null } | null;
  showTripAdvisor?: boolean;
  tripAdvisor?: { rating: number | null; count: number | null; url: string | null } | null;
  showRestaurantGuru?: boolean;
  restaurantGuru?: { rating: number | null; count: number | null; url: string | null } | null;
  showCustomerReview?: boolean;
  customerReview?: { id?: string; author?: string | null; rating?: number | null; text?: string; highlight?: string; source?: string | null } | null;
  showWhatsapp?: boolean;
  whatsappNumber?: string | null;
  textSplits?: Record<string, number>;
  // Overrides manuels du texte des scènes (clé = kind de scène, ex. "hook" | "name")
  textOverrides?: Record<string, { label?: string; description?: string }>;
  splitCount?: number;
  // Vidéo unique jouée en fond continu sur toute la durée (les fonds de scène sont neutralisés)
  continuousBgVideoUrl?: string | null;
  continuousBgSound?: boolean;
  // Bande son extraite d'une vidéo (prioritaire sur continuousBgSound), bouclée si trop courte
  soundtrackUrl?: string | null;
  // Transitions entre les plans (vidéos / images)
  transitions?: TransitionsConfig | null;


};

// Animation graphique discrète de l'offre (ex. « Vente — Prix: Sur demande ») :
// pastille dorée qui glisse depuis le bas, respire légèrement puis s'estompe.
const PriceBadge: React.FC<{ label: string; duration: number }> = ({ label, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = Math.max(1, Math.round(duration * fps));
  const inAt = Math.round(0.6 * fps);
  const outAt = Math.max(inAt + fps, total - Math.round(0.7 * fps));
  const appear = interpolate(frame, [inAt, inAt + Math.round(0.5 * fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const disappear = interpolate(frame, [outAt, total], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(appear, disappear);
  const slide = interpolate(appear, [0, 1], [24, 0]);
  const breathe = 1 + 0.015 * Math.sin((frame / fps) * 1.6);
  const shine = interpolate(frame % Math.round(3.2 * fps), [0, Math.round(1.2 * fps)], [-140, 320], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 190, pointerEvents: "none" }}>
      <div
        style={{
          opacity,
          transform: `translateY(${slide}px) scale(${breathe})`,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 28px",
          borderRadius: 999,
          border: `1px solid ${COLORS.gold}`,
          background: "rgba(0,0,0,0.42)",
          backdropFilter: "blur(6px)",
          boxShadow: "0 8px 28px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: 999, background: COLORS.gold, opacity: 0.85 }} />
        <div
          style={{
            fontFamily: display,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: "#fff",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: shine,
            width: 90,
            background: "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0) 100%)",
            transform: "skewX(-18deg)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const DIGITAL_ID_FRAMES = 90; // 3s — 2 phases (fiche, QR)

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

type SceneKind = "logo" | "hook" | "name" | "media" | "popup" | "offer" | "highlight" | "reviews" | "google_review" | "tripadvisor" | "restaurant_guru" | "customer_review" | "hours" | "map" | "digital" | "blog" | "whatsapp" | "cta" | "outro";

const DEFAULT_SCENE_ORDER: SceneKind[] = ["logo", "hook", "name", "offer", "popup", "media", "highlight", "reviews", "google_review", "tripadvisor", "restaurant_guru", "customer_review", "hours", "map", "digital", "blog", "whatsapp", "cta"];

function isSceneActive(kind: SceneKind, p: ShowcaseProps): boolean {
  switch (kind) {
    case "logo": return !!(p.openWithLogo && p.logoUrl);
    case "hook":
    case "name": return true;
    case "media": return !!p.freeZone;
    case "popup": return !!(p.showPopup && p.popupImageUrl);
    case "highlight": return Array.isArray(p.highlights) && p.highlights.length > 0;
    case "cta": return p.showAppInstall !== false;
    case "offer": return !!p.offer || (Array.isArray(p.offers) && p.offers.length > 0);
    case "reviews": return !!(p.showReviews && (p.rating || p.reviewsCount));
    case "google_review": {
      const g = p.googleReview;
      return !!(p.showGoogleReviews && g && (g.rating || g.count || g.url));
    }
    case "tripadvisor": {
      const t = p.tripAdvisor;
      return !!(p.showTripAdvisor && t && (t.rating || t.count || t.url));
    }
    case "restaurant_guru": {
      const r = p.restaurantGuru;
      return !!(p.showRestaurantGuru && r && (r.rating || r.count || r.url));
    }
    case "customer_review": {
      const c = p.customerReview;
      return !!(p.showCustomerReview && c && (c.text || c.highlight));
    }
    case "hours": return !!(p.showOpeningHours && p.openingHours);
    case "map": return !!(p.showMap && p.latitude && p.longitude);
    case "digital": return !!(p.showDigitalId && p.slug);
    case "blog": return !!(p.showBlogArticles && Array.isArray(p.blogArticles) && p.blogArticles.length > 0);
    case "whatsapp": return !!(p.showWhatsapp && p.whatsappNumber);
    case "outro": return p.showAppInstall !== false;
  }
}

function defaultSceneFrames(kind: SceneKind, p: ShowcaseProps): number {
  switch (kind) {
    case "logo": return 60;
    case "hook": return 120;
    case "name": return 120;
    case "media": return 150;
    case "popup": return 120;
    case "highlight": return 140;
    case "offer": {
      const lines = p.offer && Array.isArray(p.offer.lines) ? p.offer.lines.length : 0;
      return 120 + Math.min(lines, 6) * 22;
    }
    case "reviews":
    case "hours":
    case "map": return OPTION_SCENE_FRAMES;
    case "google_review":
    case "tripadvisor":
    case "restaurant_guru": return 120;
    case "customer_review": return 210;
    case "whatsapp": return 120;
    case "digital": return DIGITAL_ID_FRAMES;
    case "blog": return 150;
    case "cta":
    case "outro": return 150;
  }
}

export type ScenePlanItem = {
  kind: SceneKind | "custom";
  customId?: string;
  offerIndex?: number;
  from: number;
  duration: number;
};

export function buildScenePlan(p: ShowcaseProps): ScenePlanItem[] {
  const active = DEFAULT_SCENE_ORDER.filter((k) => isSceneActive(k, p));
  const customById = new Map<string, NonNullable<ShowcaseProps["custom_scenes"]>[number]>();
  for (const c of p.custom_scenes ?? []) customById.set(c.id, c);

  type Tok = { kind: SceneKind | "custom"; customId?: string; offerIndex?: number };
  let order: Tok[];
  if (Array.isArray(p.scene_order) && p.scene_order.length) {
    const seen = new Set<string>();
    const requested: Tok[] = [];
    for (const raw of p.scene_order) {
      if (typeof raw !== "string" || seen.has(raw)) continue;
      if (raw.startsWith("custom:")) {
        const id = raw.slice("custom:".length);
        if (customById.has(id)) {
          seen.add(raw);
          requested.push({ kind: "custom", customId: id });
        }
        continue;
      }
      // Accept outro explicitly when the CTA is enabled, even though outro is
      // not in DEFAULT_SCENE_ORDER (it shares rendering with cta).
      const isRequested = (active as string[]).includes(raw)
        || (raw === "outro" && isSceneActive("outro", p));
      if (isRequested) {
        seen.add(raw);
        requested.push({ kind: raw as SceneKind });
      }
    }
    // L'ordre explicite envoyé par l'aperçu est autoritaire : une étape retirée
    // par l'utilisateur ne doit PAS être réinjectée automatiquement.
    // Seule garantie : une scène de clôture (cta/outro) si aucune n'est présente.
    if (
      !requested.some((t) => t.kind === "cta" || t.kind === "outro") &&
      (active as string[]).includes("cta")
    ) {
      requested.push({ kind: "cta" });
    }
    // cta and outro are two names for the same closing scene: keep only one.
    const hasOutro = requested.some((t) => t.kind === "outro");
    const hasCta = requested.some((t) => t.kind === "cta");
    if (hasOutro && hasCta) {
      // Drop the auto-appended cta; honor user's explicit outro position.
      const idxCta = requested.findIndex((t) => t.kind === "cta");
      if (idxCta >= 0) requested.splice(idxCta, 1);
    }
    order = requested;
  } else {
    order = active.map((k) => ({ kind: k as SceneKind }));
  }

  // Expand a single "offer" token into N tokens (one per selected offer).
  const offersArr = Array.isArray(p.offers) ? p.offers : (p.offer ? [p.offer] : []);
  if (offersArr.length > 1) {
    const expanded: Tok[] = [];
    for (const t of order) {
      if (t.kind === "offer") {
        for (let i = 0; i < offersArr.length; i++) {
          expanded.push({ kind: "offer", offerIndex: i });
        }
      } else {
        expanded.push(t);
      }
    }
    order = expanded;
  } else if (offersArr.length === 1) {
    for (const t of order) if (t.kind === "offer") t.offerIndex = 0;
  }

  // Expand a single "highlight" token into N tokens (one per highlight block).
  const highlightsArr = Array.isArray(p.highlights) ? p.highlights : [];
  if (highlightsArr.length > 1) {
    const expanded: Tok[] = [];
    for (const t of order) {
      if (t.kind === "highlight") {
        for (let i = 0; i < highlightsArr.length; i++) {
          expanded.push({ kind: "highlight", offerIndex: i });
        }
      } else {
        expanded.push(t);
      }
    }
    order = expanded;
  } else if (highlightsArr.length === 1) {
    for (const t of order) if (t.kind === "highlight") t.offerIndex = 0;
  }

  // Expand a single "blog" token into N tokens (one per selected article).
  const blogArr = Array.isArray(p.blogArticles) ? p.blogArticles : [];
  if (blogArr.length > 1) {
    const expanded: Tok[] = [];
    for (const t of order) {
      if (t.kind === "blog") {
        for (let i = 0; i < blogArr.length; i++) expanded.push({ kind: "blog", offerIndex: i });
      } else {
        expanded.push(t);
      }
    }
    order = expanded;
  } else if (blogArr.length === 1) {
    for (const t of order) if (t.kind === "blog") t.offerIndex = 0;
  }



  const durOverride = (k: SceneKind): number | null => {
    const v = p.scene_durations?.[k];
    return v != null && Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v) * 30) : null;
  };
  const durationFor = (tok: Tok): number => {
    if (tok.kind === "custom" && tok.customId) {
      const c = customById.get(tok.customId);
      const d = Number(c?.duration ?? 4);
      return Math.max(30, Math.round((Number.isFinite(d) && d > 0 ? d : 4) * 30));
    }
    return durOverride(tok.kind as SceneKind) ?? defaultSceneFrames(tok.kind as SceneKind, p);
  };
  const durations = order.map(durationFor);

  // Stretch CTA to reach requested total ONLY when no explicit per-scene durations were provided.
  // If the user edited the scenario timings (scene_durations present), honor the sum as-is —
  // do not inflate the CTA to fill the remaining time.
  const hasAnyDurationOverride = !!p.scene_durations && Object.values(p.scene_durations).some(
    (v) => v != null && Number.isFinite(Number(v)) && Number(v) > 0
  );
  const hasCustomScenes = Array.isArray(p.custom_scenes) && p.custom_scenes.length > 0;
  const requestedFrames = Number.isFinite(p.durationSec) && p.durationSec
    ? Math.round(Number(p.durationSec) * 30)
    : SHOWCASE_TOTAL_FRAMES;
  const closingIdx = order.findIndex((t) => t.kind === "cta" || t.kind === "outro");
  const closingKind = closingIdx >= 0 ? (order[closingIdx].kind as SceneKind) : null;
  if (closingIdx >= 0 && closingKind && durOverride(closingKind) == null && !hasAnyDurationOverride && !hasCustomScenes) {
    const nonClosing = durations.reduce((acc, d, i) => (i === closingIdx ? acc : acc + d), 0);
    durations[closingIdx] = Math.max(150, requestedFrames - nonClosing);
  }

  const plan: ScenePlanItem[] = [];
  let cursor = 0;
  order.forEach((tok, i) => {
    plan.push({ kind: tok.kind, customId: tok.customId, offerIndex: tok.offerIndex, from: cursor, duration: durations[i] });
    cursor += durations[i];
  });
  return plan;
}

export const computeShowcaseFrames = (p: ShowcaseProps): number => {
  const plan = buildScenePlan(p);
  const sum = plan.reduce((acc, s) => acc + s.duration, 0);
  return Math.max(sum, 300);
};


const ease = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// Enveloppe une scène avec une transition d'entrée / sortie
const SceneTransition: React.FC<{ effect: TransitionEffect; duration: number; children: React.ReactNode }> = ({ effect, duration, children }) => {
  const frame = useCurrentFrame();
  if (effect === "cut") return <AbsoluteFill>{children}</AbsoluteFill>;
  const d = effect === "fast" ? 4 : Math.max(5, Math.min(18, Math.round(duration * 0.18)));
  const inP = ease(frame, 0, d);
  const outP = 1 - ease(frame, duration - d, duration);
  const p = Math.min(inP, outP);
  let style: React.CSSProperties = {};
  switch (effect) {
    case "crossfade":
    case "fast":
      style = { opacity: p };
      break;
    case "fade_black":
      style = { opacity: p * p };
      break;
    case "zoom":
      style = { opacity: p, transform: `scale(${1 + (1 - inP) * 0.08 - (1 - outP) * 0.05})` };
      break;
    case "kenburns":
      style = { opacity: p, transform: `scale(${1.02 + inP * 0.035})` };
      break;
    case "slide":
      style = { opacity: Math.min(1, p * 1.6), transform: `translateX(${(1 - inP) * 12 - (1 - outP) * 12}%)` };
      break;
    case "wipe":
      style = { clipPath: `inset(0 ${(1 - inP) * 100}% 0 0)`, opacity: outP };
      break;
    default:
      style = { opacity: p };
  }
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};


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

const isVideoSrc = (u?: string | null): boolean =>
  typeof u === "string" && /\.(mp4|mov|webm|m4v|avi|mkv)(\?|#|$)/i.test(u);

const KenBurns: React.FC<{ src: string; from: number; duration: number }> = ({ src, from, duration }) => {
  const frame = useCurrentFrame();
  const tone = useTone();
  const suppressBg = useSuppressBg();
  const local = frame - from;
  const progress = Math.max(0, Math.min(1, local / duration));
  const scale = 1.04 + progress * tone.kenBurnsZoom;
  const o = Math.min(ease(local, 0, tone.fadeFrames), 1 - ease(local, duration - tone.fadeFrames, duration));
  if (suppressBg) return null;
  return (
    <AbsoluteFill style={{ opacity: o, overflow: "hidden" }}>
      {isVideoSrc(src) ? (
        <OffthreadVideo src={src} muted loop style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
          }}
        />
      )}
      <AbsoluteFill
        style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.02) 40%,rgba(14,11,8,0.55) 100%)" }}
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

const HookOverlay: React.FC<{ text: string; duration: number; textPosition?: TextPosition; title?: string }> = ({ text, duration, textPosition = "middle", title }) => {
  const frame = useCurrentFrame();
  const o = Math.min(ease(frame, 6, 26), 1 - ease(frame, duration - 20, duration - 2));
  if (!text && !title) return null;
  // Taille adaptative : le hook est monté intégralement, on réduit si le texte est long.
  const len = (text || "").length;
  const textSize = len > 260 ? 30 : len > 180 ? 34 : len > 120 ? 40 : len > 70 ? 46 : 52;
  return (
    <AbsoluteFill style={{ padding: 70, ...textPositionStyle(textPosition), opacity: o }}>
      {title ? (
        <div
          style={{
            fontFamily: body,
            color: COLORS.gold,
            fontSize: 30,
            letterSpacing: 3,
            textTransform: "uppercase",
            textAlign: "center",
            marginBottom: 18,
            textShadow: "0 2px 12px rgba(0,0,0,0.7)",
          }}
        >
          {title}
        </div>
      ) : null}
      {text ? (
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            color: COLORS.cream,
            fontSize: textSize,
            lineHeight: 1.18,
            textAlign: "center",
            textShadow: "0 4px 24px rgba(0,0,0,0.75)",
          }}
        >
          {text}
        </div>
      ) : null}
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
  const suppressBg = useSuppressBg();
  const frame = useCurrentFrame();
  const out = 1 - ease(frame, 130, 150);
  if (suppressBg) return null;
  const imgs = images.slice(0, 3);
  if (imgs.length === 0) return null;
  const perDuration = 35;
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
  const L = useL();
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
        {city ? `${L.offer} · ${city}` : L.offer}
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
        {offer.title || lines[0] || L.offer}
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
  const L = useL();
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
        {L.discover(name)}
        <br />{L.onPlatform}
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
  const L = useL();
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
        {L.installApp}
      </div>
      <div style={{ opacity: badgeO, marginTop: 24, fontFamily: body, color: COLORS.gold, fontSize: 24 }}>
        One World Morocco
      </div>
    </AbsoluteFill>
  );
};

const SceneReviews: React.FC<{ rating?: number | null; count?: number | null; textPosition?: TextPosition }> = ({ rating, count, textPosition = "middle" }) => {
  const L = useL();
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
        {L.reviews}
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
          {animatedCount.toLocaleString(L.numberLocale)}
          <span style={{ fontSize: 26, color: COLORS.gold, marginLeft: 14, letterSpacing: 3, textTransform: "uppercase" }}>{L.reviewsWord}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

const SceneHours: React.FC<{ openingHours: string | Record<string, string>; textPosition?: TextPosition }> = ({ openingHours, textPosition = "middle" }) => {
  const L = useL();
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
        {L.hours}
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

export type PlaceItem = {
  id: string;
  name: string;
  hook?: string | null;
  image_url?: string | null;
  media_url?: string | null;
  media_kind?: "image" | "video" | null;
  latitude?: number | null;
  longitude?: number | null;
};

/**
 * Montage des lieux liés à une étape : un plan par lieu (vidéo 1 ou image 1),
 * avec libellé animé (nom + accroche). Sert de fond de la scène.
 */
const LinkedPlacesMontage: React.FC<{ places: PlaceItem[]; duration: number; mode: "videos" | "images" }> = ({
  places,
  duration,
  mode,
}) => {
  const withMedia = (places ?? []).filter((p) => {
    const url = mode === "images" ? (p.image_url || p.media_url) : (p.media_url || p.image_url);
    return !!url;
  });
  if (withMedia.length === 0) return null;
  const per = Math.max(24, Math.floor(duration / withMedia.length));
  return (
    <AbsoluteFill>
      {withMedia.map((pl, i) => {
        const url = (mode === "images" ? (pl.image_url || pl.media_url) : (pl.media_url || pl.image_url)) as string;
        const isVid = isVideoSrc(url) && !(mode === "images" && pl.image_url);
        const from = i * per;
        const dur = i === withMedia.length - 1 ? Math.max(per, duration - from) : per;
        return (
          <Sequence key={`${pl.id}-${i}`} from={from} durationInFrames={dur}>
            <PlaceShot url={url} isVideo={isVid} duration={dur} name={pl.name} hook={pl.hook ?? null} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const PlaceShot: React.FC<{ url: string; isVideo: boolean; duration: number; name: string; hook?: string | null }> = ({
  url,
  isVideo,
  duration,
  name,
  hook,
}) => {
  const frame = useCurrentFrame();
  const o = ease(frame, 0, 14);
  const p = duration > 0 ? Math.max(0, Math.min(1, frame / duration)) : 0;
  const scale = 1.04 + p * 0.08;
  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity: o }}>
      {isVideo ? (
        <OffthreadVideo src={url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <Img src={url} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }} />
      )}
      <AbsoluteFill style={{ background: "linear-gradient(180deg,rgba(14,11,8,0.30) 0%,rgba(14,11,8,0.78) 100%)" }} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: 70, pointerEvents: "none" }}>
        <div style={{ textAlign: "center", maxWidth: 900 }}>
          <div
            style={{
              display: "inline-block",
              fontFamily: body,
              fontSize: 22,
              color: COLORS.gold,
              border: `1px solid ${COLORS.gold}`,
              borderRadius: 999,
              padding: "6px 16px",
              marginBottom: 14,
              opacity: ease(frame, 6, 22),
            }}
          >
            📍 {name}
          </div>
          {hook && (
            <div
              style={{
                fontFamily: display,
                fontWeight: 700,
                fontSize: 40,
                lineHeight: 1.2,
                color: COLORS.cream,
                opacity: ease(frame, 14, 32),
              }}
            >
              {hook}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const LinkedPlacesOverlay: React.FC<{ places: Array<{ id: string; name: string }> }> = ({ places }) => {
  const frame = useCurrentFrame();
  if (!places || places.length === 0) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: 60, pointerEvents: "none" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 900 }}>
        {places.slice(0, 8).map((pl, i) => {
          const o = ease(frame, 8 + i * 5, 24 + i * 5);
          return (
            <div
              key={pl.id}
              style={{
                opacity: o,
                transform: `translateY(${interpolate(o, [0, 1], [14, 0])}px)`,
                fontFamily: body,
                fontSize: 24,
                color: COLORS.cream,
                background: "rgba(14,11,8,0.6)",
                border: `1px solid ${COLORS.gold}`,
                borderRadius: 999,
                padding: "8px 18px",
              }}
            >
              📍 {pl.name}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const SceneBlogArticle: React.FC<{
  article: { title: string; excerpt?: string | null; heroUrl?: string | null; scrollShotUrl?: string | null };
  mode: "scroll" | "hero_map";
  duration: number;
  lat?: number | null;
  lng?: number | null;
  textPosition?: TextPosition;
}> = ({ article, mode, duration, lat, lng, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const labelO = ease(frame, 0, 18);
  const bodyO = ease(frame, 10, 30);

  if (mode === "scroll" && article.scrollShotUrl) {
    // Défilement vertical de la capture pleine page de l'article
    const progress = interpolate(frame, [12, Math.max(24, duration - 8)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
        <div
          style={{
            opacity: bodyO,
            width: 720,
            height: 1180,
            borderRadius: 28,
            overflow: "hidden",
            position: "relative",
            border: `2px solid ${COLORS.gold}`,
            boxShadow: "0 24px 70px rgba(0,0,0,0.65)",
            background: "#fff",
          }}
        >
          <Img
            src={article.scrollShotUrl}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${-progress * 78}%)`,
            }}
          />
        </div>
        <div style={{ opacity: labelO, marginTop: 22, fontFamily: display, fontWeight: 700, color: COLORS.cream, fontSize: 34, textAlign: "center", maxWidth: 860 }}>
          {article.title}
        </div>
      </AbsoluteFill>
    );
  }

  // hero_map : hero de l'article + zoom progressif sur la carte avec marqueur animé
  const hasGeo = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  const zoom = Math.round(interpolate(frame, [0, Math.max(30, duration - 10)], [12, 17], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }));
  const mapUrl = hasGeo
    ? `https://plnphgdrawpsnumnejzc.supabase.co/functions/v1/static-map?lat=${lat}&lng=${lng}&zoom=${zoom}&size=640x640&scale=2&maptype=roadmap`
    : null;
  const mapO = ease(frame, Math.round(duration * 0.35), Math.round(duration * 0.35) + 20);
  const heroScale = interpolate(frame, [0, duration], [1.06, 1.16], { extrapolateRight: "clamp" });
  const pinScale = spring({ frame: frame - Math.round(duration * 0.45), fps: 30, config: { damping: 10, stiffness: 180 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", padding: 50, ...textPositionStyle(textPosition) }}>
      <div style={{ opacity: labelO, marginTop: 20, fontFamily: body, color: COLORS.gold, fontSize: 20, letterSpacing: 6, textTransform: "uppercase" }}>
        Article
      </div>
      <div
        style={{
          opacity: bodyO,
          marginTop: 22,
          width: 660,
          height: 420,
          borderRadius: 24,
          overflow: "hidden",
          border: `2px solid ${COLORS.gold}`,
          boxShadow: "0 18px 60px rgba(0,0,0,0.6)",
          position: "relative",
          background: "#000",
        }}
      >
        {article.heroUrl && (
          <Img src={article.heroUrl} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${heroScale})` }} />
        )}
        {mapUrl && (
          <div style={{ position: "absolute", inset: 0, opacity: mapO }}>
            <Img src={mapUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -100%) scale(${interpolate(pinScale, [0, 1], [0, 1])})`,
                transformOrigin: "bottom center",
                fontSize: 76,
                filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.6))",
              }}
            >
              📍
            </div>
          </div>
        )}
      </div>
      <div style={{ opacity: bodyO, marginTop: 22, fontFamily: display, fontWeight: 700, color: COLORS.cream, fontSize: 36, textAlign: "center", maxWidth: 860, lineHeight: 1.2 }}>
        {article.title}
      </div>
      {article.excerpt && (
        <div style={{ opacity: bodyO, marginTop: 12, fontFamily: body, color: COLORS.gold, fontSize: 24, textAlign: "center", maxWidth: 820 }}>
          {article.excerpt.slice(0, 140)}
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
  const L = useL();
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
              <Img src={ficheScreenshotUrl} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", background: "#0a0807" }} />
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
                      {L.viewFullPage}
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
              {L.scanToDiscover}
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
  const suppressBg = useSuppressBg();
  const local = frame - from;
  const o = Math.min(ease(local, 0, 12), 1 - ease(local, duration - 12, duration));
  if (suppressBg) return null;
  return (
    <AbsoluteFill style={{ opacity: o, overflow: "hidden" }}>
      {isVideoSrc(src) ? (
        <OffthreadVideo src={src} muted loop style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      <AbsoluteFill
        style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.02) 40%,rgba(14,11,8,0.55) 100%)" }}
      />
    </AbsoluteFill>
  );
};

// Fond vidéo en boucle + voile sombre — pour scènes Avis / Horaires / Map / CTA
const VideoBackdrop: React.FC<{ src?: string; image?: string }> = ({ src, image }) => {
  const suppressBg = useSuppressBg();
  if (suppressBg) return null;
  const url = src || image;
  if (!url) return null;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {isVideoSrc(url) ? (
        <OffthreadVideo src={url} muted loop style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <Img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      <AbsoluteFill style={{ background: "rgba(14,11,8,0.46)" }} />
    </AbsoluteFill>
  );
};

// Fond animé — applique l'effet sélectionné (Ken Burns, zoom, slide…) sur les images fixes.
// Les vidéos gardent leur lecture en boucle. Utilisé par toutes les scènes "info"
// (avis, plateformes, horaires, carte, ID numérique, offres, WhatsApp, outro).
const MotionBackdrop: React.FC<{
  src?: string;
  image?: string;
  duration: number;
  effect: TransitionEffect;
  veil?: string;
}> = ({ src, image, duration, effect, veil = "rgba(14,11,8,0.46)" }) => {
  const frame = useCurrentFrame();
  const tone = useTone();
  const suppressBg = useSuppressBg();
  const url = src || image;
  if (suppressBg || !url) return null;
  const isVid = isVideoSrc(url);
  const p = duration > 0 ? Math.max(0, Math.min(1, frame / duration)) : 0;
  let transform = "scale(1.02)";
  if (!isVid) {
    switch (effect) {
      case "kenburns":
        transform = `scale(${1.04 + p * (tone.kenBurnsZoom || 0.1)}) translate(${(p - 0.5) * 1.6}%, ${(0.5 - p) * 1.1}%)`;
        break;
      case "zoom":
        transform = `scale(${1.16 - p * 0.12})`;
        break;
      case "slide":
        transform = `scale(1.12) translateX(${(0.5 - p) * 4}%)`;
        break;
      case "wipe":
        transform = `scale(${1.06 + p * 0.04})`;
        break;
      default:
        transform = `scale(${1.03 + p * 0.03})`;
    }
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {isVid ? (
        <OffthreadVideo src={url} muted loop style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <Img src={url} style={{ width: "100%", height: "100%", objectFit: "cover", transform }} />
      )}
      <AbsoluteFill style={{ background: veil }} />
    </AbsoluteFill>
  );
};

// ===== Diaporama global d'images =====
// Utilisé quand AUCUNE étape du scénario n'a de média assigné et que seules des
// images sont sélectionnées : toutes les images défilent linéairement sur toute
// la durée de la vidéo, à fréquence constante (indépendante de la durée des étapes).
const SLIDESHOW_FAST_FRAMES = 22;

const SlideshowSlide: React.FC<{ src: string; duration: number; effect: TransitionEffect; fade: number }> = ({ src, duration, effect, fade }) => {
  const frame = useCurrentFrame();
  const tone = useTone();
  const p = duration > 0 ? Math.max(0, Math.min(1, frame / duration)) : 0;
  const o = Math.min(ease(frame, 0, fade), 1 - ease(frame, duration - fade, duration));
  let transform = `scale(${1.03 + p * 0.03})`;
  let clipPath: string | undefined;
  let opacity = o;
  switch (effect) {
    case "kenburns":
      transform = `scale(${1.04 + p * (tone.kenBurnsZoom || 0.1)}) translate(${(p - 0.5) * 1.6}%, ${(0.5 - p) * 1.1}%)`;
      break;
    case "zoom":
      transform = `scale(${1.16 - p * 0.12})`;
      break;
    case "slide":
      transform = `scale(1.12) translateX(${(0.5 - p) * 5}%)`;
      break;
    case "wipe":
      clipPath = `inset(0 ${(1 - ease(frame, 0, fade)) * 100}% 0 0)`;
      opacity = 1 - ease(frame, duration - fade, duration);
      break;
    case "fade_black":
      opacity = o * o;
      break;
    case "cut":
      opacity = 1;
      break;
  }
  return (
    <AbsoluteFill style={{ opacity, clipPath, overflow: "hidden" }}>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", transform }} />
    </AbsoluteFill>
  );
};

const GlobalImageSlideshow: React.FC<{ images: string[]; total: number; effect: TransitionEffect }> = ({ images, total, effect }) => {
  const n = images.length;
  if (!n || total <= 0) return null;
  const fast = effect === "fast";
  const per = fast ? SLIDESHOW_FAST_FRAMES : Math.max(12, Math.floor(total / n));
  const count = fast ? Math.max(1, Math.ceil(total / per)) : n;
  const fade = fast ? 5 : 16;
  const slides: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const start = fast ? i * per : Math.round((i * total) / n);
    const end = fast ? Math.min(total, (i + 1) * per) : Math.round(((i + 1) * total) / n);
    const base = Math.max(1, end - start);
    const dur = i < count - 1 ? base + fade : base;
    const src = images[i % n];
    const eff = resolveMix(fast ? "crossfade" : effect, `${src}#${i}`);
    slides.push(
      <Sequence key={`slide-${i}`} from={start} durationInFrames={dur}>
        <SlideshowSlide src={src} duration={dur} effect={eff} fade={fade} />
      </Sequence>,
    );
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {slides}
      <AbsoluteFill style={{ background: "linear-gradient(180deg,rgba(14,11,8,0.34) 0%,rgba(14,11,8,0.56) 100%)" }} />
    </AbsoluteFill>
  );
};



const removeDecorativeTaglineWords = (value: string): string =>
  value
    .replace(/\bterracotta(?:é|e|s)?\b/gi, "")
    .replace(/\s+([,.:;!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.:;!?-]+|[\s,.:;!?-]+$/g, "")
    .trim();

const SceneLogo: React.FC<{ logoUrl: string; durationFrames?: number; background?: { url: string; kind: "image" | "video" } | null }> = ({ logoUrl, durationFrames = 60, background = null }) => {
  const frame = useCurrentFrame();
  const s = spring({ frame, fps: 30, config: { damping: 18, stiffness: 120 } });
  const outStart = Math.max(20, durationFrames - 14);
  const out = 1 - ease(frame, outStart, durationFrames);
  const scale = interpolate(s, [0, 1], [0.85, 1]);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      {background ? (
        background.kind === "video" ? (
          <VideoCover src={background.url} from={0} duration={durationFrames} />
        ) : (
          <KenBurns src={background.url} from={0} duration={durationFrames} />
        )
      ) : (
        <AbsoluteFill
          style={{ background: `radial-gradient(circle at 50% 50%, ${COLORS.terracotta}22 0%, ${COLORS.night} 70%)` }}
        />
      )}
      {background && (
        <AbsoluteFill style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.35) 0%,rgba(0,0,0,0.55) 100%)" }} />
      )}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Img
          src={logoUrl}
          style={{
            maxWidth: "58%",
            maxHeight: "58%",
            objectFit: "contain",
            opacity: s,
            transform: `scale(${scale})`,
            filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.55))",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const ScenePopup: React.FC<{ imageUrl: string; title?: string | null; description?: string | null; durationFrames: number; textPosition?: TextPosition }> = ({ imageUrl, title, description, durationFrames, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const inO = ease(frame, 0, 16);
  const out = 1 - ease(frame, durationFrames - 14, durationFrames);
  const desc = (description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return (
    <AbsoluteFill style={{ opacity: Math.min(inO, out) }}>
      <KenBurns src={imageUrl} from={0} duration={durationFrames} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.15) 0%,rgba(0,0,0,0.7) 100%)" }} />
      <AbsoluteFill style={{ padding: 60, ...textPositionStyle(textPosition) }}>
        {title && (
          <div style={{ fontFamily: display, fontWeight: 800, color: COLORS.cream, fontSize: 54, lineHeight: 1.1, textShadow: "0 4px 20px rgba(0,0,0,0.7)", textAlign: "center" }}>
            {title}
          </div>
        )}
        {desc && (
          <div style={{ marginTop: 18, fontFamily: body, color: "rgba(255,255,255,0.94)", fontSize: 26, lineHeight: 1.35, textAlign: "center", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>
            {desc.slice(0, 240)}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const SceneHighlight: React.FC<{ data: NonNullable<ShowcaseProps["highlights"]>[number]; background?: string | null; backgroundIsVideo?: boolean; durationFrames: number; textPosition?: TextPosition }> = ({ data, background, backgroundIsVideo, durationFrames, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const inO = ease(frame, 0, 16);
  const out = 1 - ease(frame, durationFrames - 14, durationFrames);
  const titleY = interpolate(spring({ frame: frame - 6, fps: 30, config: { damping: 18 } }), [0, 1], [30, 0]);
  const heroImg = data.image_url || background || undefined;
  return (
    <AbsoluteFill style={{ opacity: Math.min(inO, out) }}>
      {heroImg && (backgroundIsVideo && background === heroImg
        ? <VideoCover src={heroImg} from={0} duration={durationFrames} />
        : <KenBurns src={heroImg} from={0} duration={durationFrames} />)}
      <AbsoluteFill style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.4) 0%,rgba(0,0,0,0.75) 100%)" }} />
      <AbsoluteFill style={{ padding: 60, ...textPositionStyle(textPosition) }}>
        {!data.title && (
          <div style={{ fontFamily: body, color: COLORS.gold, fontSize: 20, letterSpacing: 6, textTransform: "uppercase", textAlign: "center" }}>
            Signature
          </div>
        )}
        {data.title && (
          <div style={{ marginTop: 14, transform: `translateY(${titleY}px)`, fontFamily: display, fontWeight: 800, color: COLORS.cream, fontSize: 56, lineHeight: 1.1, textAlign: "center", textShadow: "0 4px 20px rgba(0,0,0,0.7)" }}>
            {data.title}
          </div>
        )}
        {data.description && (
          <div style={{ marginTop: 20, fontFamily: body, color: "rgba(255,255,255,0.94)", fontSize: 26, lineHeight: 1.4, textAlign: "center", textShadow: "0 2px 10px rgba(0,0,0,0.6)", maxWidth: 620 }}>
            {(data.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280)}
          </div>
        )}
        {(data.metric_title || data.metric_value) && (
          <div style={{ marginTop: 28, padding: "14px 26px", border: `1px solid ${COLORS.gold}`, borderRadius: 14, fontFamily: display, color: COLORS.gold, fontSize: 28, textAlign: "center", background: "rgba(212,175,55,0.08)" }}>
            {[data.metric_value, data.metric_title].filter(Boolean).join(" · ")}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const PLATFORM_META: Record<"google_review" | "tripadvisor" | "restaurant_guru", { label: string; brand: string; accent: string; logo: string }> = {
  google_review:   { label: "Google",          brand: "#4285F4", accent: "#EA4335", logo: "brands/google-logo.png" },
  tripadvisor:     { label: "TripAdvisor",     brand: "#34E0A1", accent: "#F2B203", logo: "brands/logo_tripadvisor.webp" },
  restaurant_guru: { label: "Restaurant Guru", brand: "#CB2027", accent: "#F2B203", logo: "brands/logo_restaurant_guru.webp" },
};

/** Logo géant en filigrane qui déborde du cadre + dérive lente : signature visuelle des séquences de marque */
const BrandBleedLogo: React.FC<{ src: string; color: string; durationFrames: number; side?: "left" | "right" }> = ({ src, color, durationFrames, side = "left" }) => {
  const frame = useCurrentFrame();
  const enter = spring({ frame, fps: 30, config: { damping: 22, stiffness: 90 } });
  const drift = interpolate(frame, [0, durationFrames], [0, side === "left" ? 60 : -60]);
  const rot = interpolate(frame, [0, durationFrames], [side === "left" ? -14 : 14, side === "left" ? -4 : 4]);
  const scale = interpolate(enter, [0, 1], [1.35, 1]);
  const fade = ease(frame, 0, 18) * (1 - ease(frame, durationFrames - 14, durationFrames));
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none", opacity: fade }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          [side]: -260,
          transform: `translateY(-50%) translateX(${drift}px) rotate(${rot}deg) scale(${scale})`,
          width: 760,
          height: 760,
          filter: `drop-shadow(0 0 90px ${color}88)`,
          opacity: 0.22,
        } as React.CSSProperties}
      >
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 55% at ${side === "left" ? "12%" : "88%"} 50%, ${color}33 0%, transparent 70%)`,
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};

const ScenePlatformReview: React.FC<{ kind: "google_review" | "tripadvisor" | "restaurant_guru"; rating: number | null; count: number | null; durationFrames: number; textPosition?: TextPosition }> = ({ kind, rating, count, durationFrames, textPosition = "middle" }) => {
  const L = useL();
  const meta = PLATFORM_META[kind];
  const frame = useCurrentFrame();
  const inO = ease(frame, 0, 16);
  const out = 1 - ease(frame, durationFrames - 14, durationFrames);
  const badgeS = spring({ frame: frame - 10, fps: 30, config: { damping: 12, stiffness: 140 } });
  const chipS = spring({ frame: frame - 4, fps: 30, config: { damping: 10, stiffness: 180 } });
  const ringPulse = 1 + 0.05 * Math.sin(frame / 9);
  return (
    <AbsoluteFill>
      <BrandBleedLogo src={meta.logo} color={meta.brand} durationFrames={durationFrames} side={kind === "tripadvisor" ? "right" : "left"} />
      <AbsoluteFill style={{ opacity: Math.min(inO, out), padding: 60, ...textPositionStyle(textPosition) }}>
        {/* Pastille logo en avant-plan, débordant du bloc note */}
        <div
          style={{
            alignSelf: "center",
            width: 132,
            height: 132,
            borderRadius: 66,
            background: "rgba(255,255,255,0.96)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${interpolate(chipS, [0, 1], [0.4, 1]) * ringPulse}) rotate(${interpolate(chipS, [0, 1], [-25, 0])}deg)`,
            boxShadow: `0 0 0 6px ${meta.brand}, 0 18px 60px ${meta.brand}66`,
            marginBottom: -34,
            zIndex: 2,
            overflow: "hidden",
          }}
        >
          <Img src={staticFile(meta.logo)} style={{ width: 132, height: 132, objectFit: "cover" }} />
        </div>
        <div style={{ marginTop: 24, alignSelf: "center", transform: `scale(${interpolate(badgeS, [0, 1], [0.85, 1])})`, padding: "48px 46px 30px", background: "rgba(14,11,8,0.72)", border: `2px solid ${meta.brand}`, borderRadius: 26, textAlign: "center", boxShadow: `0 12px 60px ${meta.brand}55` }}>
          <div style={{ fontFamily: body, color: meta.brand, fontSize: 20, letterSpacing: 6, textTransform: "uppercase" }}>
            {L.reviewsOf(meta.label)}
          </div>
          {rating != null && (
            <div style={{ marginTop: 10, fontFamily: display, fontWeight: 800, color: COLORS.cream, fontSize: 100, lineHeight: 1 }}>
              {rating.toFixed(1)}<span style={{ fontSize: 40, color: meta.accent }}>/5</span>
            </div>
          )}
          <div style={{ marginTop: 6, fontFamily: body, fontSize: 32, color: meta.accent }}>
            {"★★★★★".slice(0, Math.round(rating ?? 0))}<span style={{ opacity: 0.3 }}>{"★★★★★".slice(Math.round(rating ?? 0))}</span>
          </div>
          {count != null && (
            <div style={{ marginTop: 12, fontFamily: body, color: COLORS.cream, fontSize: 26 }}>
              {count.toLocaleString(L.numberLocale)} {L.reviewsWord}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};


const platformKeyFromSource = (source?: string | null): "google_review" | "tripadvisor" | "restaurant_guru" | null => {
  const s = (source || "").toLowerCase();
  if (s.includes("google")) return "google_review";
  if (s.includes("trip")) return "tripadvisor";
  if (s.includes("guru")) return "restaurant_guru";
  return null;
};

const reviewFontSize = (len: number) => (len > 700 ? 20 : len > 500 ? 23 : len > 340 ? 26 : len > 180 ? 29 : 33);

const SceneCustomerReview: React.FC<{
  author?: string | null;
  rating?: number | null;
  /** extrait à mettre en avant (optionnel) */
  highlight?: string;
  /** avis complet */
  fullText?: string;
  source?: string | null;
  durationFrames: number;
  textPosition?: TextPosition;
}> = ({ author, rating, highlight, fullText, source, durationFrames, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const inO = ease(frame, 0, 20);
  const out = 1 - ease(frame, durationFrames - 16, durationFrames);
  const y = interpolate(spring({ frame: frame - 8, fps: 30, config: { damping: 18 } }), [0, 1], [40, 0]);

  const full = (fullText || "").trim();
  const excerpt = (highlight || "").trim();
  const hasExcerpt = excerpt.length > 0 && full.length > 0 && excerpt.length < full.length;

  // Découpe avant / extrait / après (recherche insensible à la casse)
  const idx = hasExcerpt ? full.toLowerCase().indexOf(excerpt.toLowerCase()) : -1;
  const before = idx >= 0 ? full.slice(0, idx) : "";
  const mid = idx >= 0 ? full.slice(idx, idx + excerpt.length) : excerpt;
  const after = idx >= 0 ? full.slice(idx + excerpt.length) : "";

  // Phases : 1) avis entier  2) surlignage doré  3) focus sur l'extrait
  const swipeStart = Math.round(durationFrames * 0.3);
  const swipeEnd = Math.round(durationFrames * 0.48);
  const focusStart = Math.round(durationFrames * 0.55);
  const focusEnd = Math.round(durationFrames * 0.7);
  const swipe = hasExcerpt ? ease(frame, swipeStart, swipeEnd) : 0;
  const focus = hasExcerpt ? ease(frame, focusStart, focusEnd) : 0;

  const displayText = hasExcerpt ? full : full || excerpt;
  const baseSize = reviewFontSize(displayText.length);
  // Pas de redimensionnement du texte ni de la carte pendant la phase de focus :
  // seuls les côtés s'estompent, ce qui évite le saut visuel de re-cadrage.
  const size = baseSize;
  const sideOpacity = interpolate(focus, [0, 1], [1, 0]);
  const sideBlur = interpolate(focus, [0, 1], [0, 6]);
  const cardScale = 1;


  const platform = platformKeyFromSource(source);
  const meta = platform ? PLATFORM_META[platform] : null;

  return (
    <AbsoluteFill>
      {meta && <BrandBleedLogo src={meta.logo} color={meta.brand} durationFrames={durationFrames} side="right" />}
      <AbsoluteFill style={{ opacity: Math.min(inO, out), padding: 60, ...textPositionStyle(textPosition) }}>
        <div
          style={{
            transform: `translateY(${y}px) scale(${cardScale})`,
            alignSelf: "center",
            maxWidth: 660,
            padding: 40,
            background: "rgba(14,11,8,0.78)",
            border: `1px solid ${meta ? meta.brand + "99" : COLORS.gold + "55"}`,
            borderRadius: 22,
            textAlign: "center",
            boxShadow: meta ? `0 16px 60px ${meta.brand}44` : undefined,
          }}
        >
          {meta && (
            <div
              style={{
                position: "absolute",
                marginTop: -96,
                marginLeft: -18,
                width: 96,
                height: 96,
                borderRadius: 48,
                background: "rgba(255,255,255,0.97)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                transform: `scale(${interpolate(spring({ frame: frame - 6, fps: 30, config: { damping: 11, stiffness: 160 } }), [0, 1], [0.3, 1]) * (1 + 0.04 * Math.sin(frame / 9))}) rotate(${interpolate(spring({ frame: frame - 6, fps: 30, config: { damping: 11, stiffness: 160 } }), [0, 1], [-30, 0])}deg)`,
                boxShadow: `0 0 0 5px ${meta.brand}, 0 14px 40px ${meta.brand}66`,
                zIndex: 3,
              }}
            >
              <Img src={staticFile(meta.logo)} style={{ width: 96, height: 96, objectFit: "cover" }} />
            </div>
          )}
          <div style={{ fontFamily: display, fontSize: 90, color: meta ? meta.brand : COLORS.gold, lineHeight: 0.7, marginBottom: 12 }}>“</div>
          <div style={{ fontFamily: body, color: COLORS.cream, fontSize: size, lineHeight: 1.45 }}>
            {hasExcerpt ? (
              <>
                {before && (
                  <span style={{ opacity: sideOpacity, filter: `blur(${sideBlur}px)` }}>{before}</span>
                )}
                <span
                  style={{
                    position: "relative",
                    display: "inline",
                    padding: "2px 4px",
                    borderRadius: 6,
                    backgroundImage: `linear-gradient(90deg, ${COLORS.gold}55 0%, ${COLORS.gold}55 100%)`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: `${swipe * 100}% 100%`,
                    color: COLORS.cream,
                    fontWeight: 600,
                  }}
                >
                  {mid}
                </span>
                {after && (
                  <span style={{ opacity: sideOpacity, filter: `blur(${sideBlur}px)` }}>{after}</span>
                )}
              </>
            ) : (
              displayText
            )}
          </div>
          {rating != null && Number.isFinite(rating) && (
            <div style={{ marginTop: 20, fontFamily: body, color: meta ? meta.accent : COLORS.gold, fontSize: 30 }}>
              {"★★★★★".slice(0, Math.round(rating))}<span style={{ opacity: 0.3 }}>{"★★★★★".slice(Math.round(rating))}</span>
            </div>
          )}
          {author && (
            <div style={{ marginTop: 16, fontFamily: body, color: "rgba(255,255,255,0.7)", fontSize: 24, letterSpacing: 2, textTransform: "uppercase" }}>
              — {author}{meta ? ` · ${meta.label}` : ""}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};


const SceneWhatsapp: React.FC<{ number: string; durationFrames: number; textPosition?: TextPosition }> = ({ number, durationFrames, textPosition = "middle" }) => {
  const L = useL();
  const frame = useCurrentFrame();
  const inO = ease(frame, 0, 16);
  const out = 1 - ease(frame, durationFrames - 14, durationFrames);
  const pop = spring({ frame: frame - 4, fps: 30, config: { damping: 9, stiffness: 190 } });
  const pulse = 1 + 0.05 * Math.sin(frame / 8);
  // Onde radar qui part du logo
  const wave = (frame % 40) / 40;
  return (
    <AbsoluteFill>
      <BrandBleedLogo src="brands/logo_whatsapp.webp" color="#25D366" durationFrames={durationFrames} side="right" />
      <AbsoluteFill style={{ opacity: Math.min(inO, out), padding: 60, ...textPositionStyle(textPosition), alignItems: "center" }}>
        <div style={{ position: "relative", width: 200, height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              position: "absolute",
              width: 180,
              height: 180,
              borderRadius: 999,
              border: "3px solid #25D366",
              transform: `scale(${1 + wave * 1.1})`,
              opacity: 0.55 * (1 - wave),
            }}
          />
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: 90,
              overflow: "hidden",
              transform: `scale(${interpolate(pop, [0, 1], [0.5, 1]) * pulse}) rotate(${interpolate(pop, [0, 1], [-18, 0])}deg)`,
              boxShadow: "0 18px 60px rgba(37,211,102,0.55)",
            }}
          >
            <Img src={staticFile("brands/logo_whatsapp.webp")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>
        <div style={{ marginTop: 24, fontFamily: display, fontWeight: 800, color: COLORS.cream, fontSize: 44, letterSpacing: 1, textAlign: "center", textShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>
          {number}
        </div>
        <div style={{ marginTop: 14, fontFamily: body, color: "#25D366", fontSize: 26, letterSpacing: 4, textTransform: "uppercase" }}>
          {L.whatsappDirect}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};


export const BusinessShowcase: React.FC<ShowcaseProps> = ({
  lang = "fr",
  name: nameProp,
  hook: hookProp,
  tagline: taglineProp,
  city,
  neighborhood,
  images = [],
  videos = [],
  offer = null,
  offers = null,
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
  openWithLogo,
  whatsapp,
  instagramUrl,
  ficheScreenshotUrl,
  showBlogArticles,
  blogMode,
  blogArticles,
  scenePois,
  sceneDestinations,
  placesMediaMode = "videos",
  durationSec,
  useFullHookScene,
  scene_media,
  scene_order,
  scene_durations,
  custom_scenes,
  textPosition = "middle",
  tone = "immersif",
  freeZone,
  freeZoneTitle,
  freeZoneSubtitle,
  showPopup,
  popupImageUrl,
  popupTitle,
  popupDescription,
  highlights,
  showGoogleReviews,
  googleReview,
  showTripAdvisor,
  tripAdvisor,
  showRestaurantGuru,
  restaurantGuru,
  showCustomerReview,
  customerReview,
  showWhatsapp,
  whatsappNumber,
  textOverrides,
  textSplits,
  splitCount,
  continuousBgVideoUrl,
  continuousBgSound,
  soundtrackUrl,
  transitions,


}) => {
  const _lang: VideoLang = lang === "en" ? "en" : "fr";
  const _L = LABELS[_lang];
  const name = nameProp || _L.defaultName;
  const hook = hookProp || _L.defaultHook;
  const tagline = taglineProp || _L.defaultTagline;
  const continuousMode = typeof continuousBgVideoUrl === "string" && /^https?:\/\//i.test(continuousBgVideoUrl);

  // Bande son sélectionnée dans l'aperçu du scénario : prioritaire sur le son de la vidéo de fond continue
  const soundtrack = typeof soundtrackUrl === "string" && /^https?:\/\//i.test(soundtrackUrl) ? soundtrackUrl : null;
  const bgSoundOn = !soundtrack && !!continuousBgSound;
  const sceneBaseBg = continuousMode ? "transparent" : COLORS.night;
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

  // Diaporama global : aucune étape n'a de média assigné + uniquement des images
  // sélectionnées → toutes les images défilent à fréquence constante sur toute la vidéo.
  const noSceneMediaAssigned =
    Object.values(sm as Record<string, unknown>).every((v) => !Array.isArray(v) || v.length === 0) &&
    !(Array.isArray(custom_scenes) && custom_scenes.some((c) => c?.media?.url));
  const slideshowMode = !continuousMode && hasImages && !hasVideos && noSceneMediaAssigned;



  const defaultHero = mixedMode ? safeImages[0] : (useVideos ? safeVideos[0] : safeImages[0]);
  const defaultGallery = mixedMode
    ? safeVideos
    : (useVideos ? safeVideos.slice(1) : safeImages.slice(1));
  const defaultGalleryList = defaultGallery.length ? defaultGallery : (useVideos ? safeVideos : safeImages);
  // Fond par défaut pour les scènes "info" sans média dédié (avis plateformes, WhatsApp…)
  // Les vidéos sont prioritaires pour que le fond animé persiste sur ces étapes.
  const bgFallback = (i: number): string | undefined => {
    if (safeVideos.length) return safeVideos[i % safeVideos.length];
    if (safeImages.length) return safeImages[i % safeImages.length];
    return undefined;
  };
  const isVideoUrl = (u?: string) => !!u && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);
  /** Répartit une URL de repli sur le bon prop de MotionBackdrop (src vidéo vs image). */
  const fallbackBackdrop = (u?: string) => ({
    src: isVideoUrl(u) ? u : undefined,
    image: isVideoUrl(u) ? undefined : u,
  });


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
  // Montage : consomme jusqu'à 5 clips distincts (indices 1→5), en plus du héro (index 0) = 6 clips max
  const defaultMediaSlice = defaultGalleryList.slice(1, 6);

  // Outro/CTA backdrop
  const outroItem = outroOverride[0];


  const ovHook = textOverrides?.hook ?? {};
  const ovName = textOverrides?.name ?? {};
  const displayName = (ovHook.label || "").trim() || name;
  const locationLine =
    (ovHook.description || "").trim().replace(/^📍\s*/, "") ||
    [city, neighborhood].filter(Boolean).join(" · ");
  const [, hookPart2] = splitHookInTwo(hook);
  const nameSceneTitle = (ovName.label || "").trim();
  // Le hook est monté INTÉGRALEMENT dans la scène dédiée (override manuel prioritaire).
  const hookFull = (ovName.description || "").trim() || (hook || "").trim();


  // Build the ordered scene plan (honors props.scene_order + props.scene_durations)
  const plan = buildScenePlan({
    offer,
    offers,
    rating,
    reviewsCount,
    openingHours,
    latitude,
    longitude,
    showReviews,
    showOpeningHours,
    showMap,
    showAppInstall,
    showDigitalId,
    slug,
    logoUrl,
    openWithLogo,
    durationSec,
    scene_order,
    scene_durations,
    custom_scenes,
    showPopup,
    popupImageUrl,
    highlights,
    showGoogleReviews,
    googleReview,
    showTripAdvisor,
    tripAdvisor,
    showRestaurantGuru,
    restaurantGuru,
    showCustomerReview,
    customerReview,
    showWhatsapp,
    whatsappNumber,
  });

  const customById = new Map<string, NonNullable<ShowcaseProps["custom_scenes"]>[number]>();
  for (const c of custom_scenes ?? []) customById.set(c.id, c);

  const renderScene = (item: ScenePlanItem): React.ReactNode => {
    const { kind, customId, duration } = item;
    if (kind === "custom") {
      const c = customId ? customById.get(customId) : undefined;
      if (!c) return null;
      const list = (Array.isArray(c.mediaList) && c.mediaList.length ? c.mediaList : (c.media ? [c.media] : []));
      const align = textPositionStyle(textPosition);
      // Aucun média assigné → même comportement que les autres étapes :
      // repli sur les médias de l'établissement avec effet de mouvement.
      const cIdx = Math.max(0, (custom_scenes ?? []).findIndex((x) => x.id === c.id));
      const fallbackUrl = bgFallback(cIdx);
      const seg = list.length > 0 ? duration / list.length : duration;
      return (
        <AbsoluteFill>
          {list.length > 0
            ? list.map((m, i) => (
                <Sequence
                  key={`${m.url}-${i}`}
                  from={Math.round(i * seg * 30)}
                  durationInFrames={Math.max(1, Math.round(seg * 30))}
                >
                  {m.kind === "video"
                    ? <VideoCover src={m.url} from={0} duration={seg} />
                    : <VideoBackdrop image={m.url} />}
                </Sequence>
              ))
            : (
              <AbsoluteFill style={{ backgroundColor: sceneBaseBg }}>
                {fallbackUrl && (
                  <MotionBackdrop
                    src={/\.(mp4|webm|mov)(\?|$)/i.test(fallbackUrl) ? fallbackUrl : undefined}
                    image={/\.(mp4|webm|mov)(\?|$)/i.test(fallbackUrl) ? undefined : fallbackUrl}
                    duration={duration}
                    effect={trImageEffect}
                  />
                )}
              </AbsoluteFill>
            )}


          {c.mode === "overlay" && (
            <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 50%, rgba(0,0,0,0.45) 100%)" }} />
          )}
          {(() => {
            const rawSplit = Number(
              (textSplits ?? {})[`custom:${c.id}`] ?? (c as any).splitCount ?? splitCount ?? 1,
            );
            const nSplit = Number.isFinite(rawSplit) ? Math.max(1, Math.min(10, Math.round(rawSplit))) : 1;
            const words = (c.subtitle ?? "").trim().split(/\s+/).filter(Boolean);
            const chunks: string[] = [];
            if (nSplit > 1 && words.length > 1) {
              const per = Math.ceil(words.length / nSplit);
              for (let i = 0; i < words.length; i += per) chunks.push(words.slice(i, i + per).join(" "));
            }
            const titleBlock = (
              <div style={{
                color: "#fff",
                fontFamily: display,
                fontSize: 68,
                fontWeight: 800,
                lineHeight: 1.1,
                textAlign: "center",
                textShadow: "0 4px 24px rgba(0,0,0,0.55)",
              }}>{c.title}</div>
            );
            const textStyle: React.CSSProperties = {
              marginTop: 20,
              color: "rgba(255,255,255,0.92)",
              fontFamily: body,
              fontSize: 34,
              lineHeight: 1.3,
              textAlign: "center",
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            };
            if (chunks.length > 1) {
              const segFrames = Math.max(1, Math.round((duration * 30) / chunks.length));
              return (
                <>
                  <AbsoluteFill style={{ display: "flex", flexDirection: "column", padding: "80px 60px", ...align }}>
                    {titleBlock}
                  </AbsoluteFill>
                  {chunks.map((txt, i) => (
                    <Sequence key={`split-${i}`} from={i * segFrames} durationInFrames={segFrames}>
                      <AbsoluteFill style={{ display: "flex", flexDirection: "column", padding: "80px 60px", ...align }}>
                        <div style={{ opacity: 0, fontSize: 68, lineHeight: 1.1 }}>{c.title}</div>
                        <div style={textStyle}>{txt}</div>
                      </AbsoluteFill>
                    </Sequence>
                  ))}
                </>
              );
            }
            return (
              <AbsoluteFill style={{ display: "flex", flexDirection: "column", padding: "80px 60px", ...align }}>
                {titleBlock}
                {c.subtitle && <div style={textStyle}>{c.subtitle}</div>}
              </AbsoluteFill>
            );
          })()}

          {c.priceBadge && <PriceBadge label={c.priceBadge} duration={duration} />}
        </AbsoluteFill>
      );
    }
    return renderBuiltinScene(kind as SceneKind, duration, item.offerIndex);
  };

  const offersArr: NonNullable<ShowcaseProps["offers"]> = Array.isArray(offers) && offers.length > 0
    ? offers
    : (offer ? [offer] : []);

  const renderBuiltinScene = (kind: SceneKind, duration: number, offerIndex?: number): React.ReactNode => {
    switch (kind) {
      case "logo": {
        const logoBg = Array.isArray((scene_media as any)?.logo) ? (scene_media as any).logo[0] : null;
        return (
          <AbsoluteFill style={{ backgroundColor: sceneBaseBg }}>
            <SceneLogo logoUrl={logoUrl!} durationFrames={duration} background={logoBg} />
          </AbsoluteFill>
        );
      }
      case "popup": {
        if (!popupImageUrl) return null;
        return (
          <AbsoluteFill style={{ backgroundColor: sceneBaseBg }}>
            <ScenePopup imageUrl={popupImageUrl} title={popupTitle} description={popupDescription} durationFrames={duration} textPosition={textPosition} />
          </AbsoluteFill>
        );
      }
      case "highlight": {
        const idx = typeof offerIndex === "number" ? offerIndex : 0;
        const list = Array.isArray(highlights) ? highlights : [];
        const h = list[idx];
        if (!h) return null;
        const hArr = Array.isArray((scene_media as any)?.highlight) ? (scene_media as any).highlight : [];
        const bgItem = hArr[idx] ?? hArr[0];
        return (
          <AbsoluteFill style={{ backgroundColor: sceneBaseBg }}>
            <SceneHighlight
              data={h}
              background={bgItem?.url ?? h.image_url ?? defaultGalleryList[idx % Math.max(defaultGalleryList.length, 1)] ?? null}
              backgroundIsVideo={bgItem?.kind === "video"}
              durationFrames={duration}
              textPosition={textPosition}
            />
          </AbsoluteFill>
        );
      }
      case "google_review":
      case "tripadvisor":
      case "restaurant_guru": {
        const data = kind === "google_review" ? googleReview : kind === "tripadvisor" ? tripAdvisor : restaurantGuru;
        if (!data) return null;
        const bgArr = Array.isArray((scene_media as any)?.[kind]) ? (scene_media as any)[kind] : [];
        const bg = bgArr[0];
        const fbIdx = kind === "google_review" ? 0 : kind === "tripadvisor" ? 1 : 2;
        return (
          <AbsoluteFill style={{ backgroundColor: sceneBaseBg }}>
            <MotionBackdrop
              src={bg?.kind === "video" ? bg.url : (bg ? undefined : fallbackBackdrop(bgFallback(fbIdx)).src)}
              image={bg?.kind === "image" ? bg.url : (bg ? undefined : fallbackBackdrop(bgFallback(fbIdx)).image)}
              duration={duration}
              effect={trImageEffect}
            />
            <ScenePlatformReview kind={kind} rating={data.rating ?? null} count={data.count ?? null} durationFrames={duration} textPosition={textPosition} />
          </AbsoluteFill>
        );
      }
      case "customer_review": {
        if (!customerReview) return null;
        const bgArr = Array.isArray((scene_media as any)?.customer_review) ? (scene_media as any).customer_review : [];
        const bg = bgArr[0];
        const clean = (s?: string | null) => (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const fullText = clean(customerReview.text) || clean(customerReview.highlight);
        const excerpt = clean(customerReview.highlight);
        return (
          <AbsoluteFill style={{ backgroundColor: sceneBaseBg }}>
            <MotionBackdrop
              src={bg?.kind === "video" ? bg.url : (bg ? undefined : fallbackBackdrop(bgFallback(0)).src)}
              image={bg?.kind === "image" ? bg.url : (bg ? undefined : fallbackBackdrop(bgFallback(0)).image)}
              duration={duration}
              effect={trImageEffect}
            />
            <SceneCustomerReview author={customerReview.author} rating={customerReview.rating ?? null} highlight={excerpt} fullText={fullText} source={customerReview.source ?? null} durationFrames={duration} textPosition={textPosition} />

          </AbsoluteFill>
        );
      }
      case "whatsapp": {
        if (!whatsappNumber) return null;
        const bgArr = Array.isArray((scene_media as any)?.whatsapp) ? (scene_media as any).whatsapp : [];
        const bg = bgArr[0];
        return (
          <AbsoluteFill style={{ backgroundColor: sceneBaseBg }}>
            <MotionBackdrop
              src={bg?.kind === "video" ? bg.url : (bg ? undefined : fallbackBackdrop(bgFallback(3)).src)}
              image={bg?.kind === "image" ? bg.url : (bg ? undefined : fallbackBackdrop(bgFallback(3)).image)}
              duration={duration}
              effect={trImageEffect}
            />
            <SceneWhatsapp number={whatsappNumber} durationFrames={duration} textPosition={textPosition} />
          </AbsoluteFill>
        );
      }
      case "hook":
        return heroIsVideo && heroMedia ? (
          <AbsoluteFill>
            <VideoCover src={heroMedia} from={0} duration={duration} />
            <SceneHook name={displayName} location={locationLine} textPosition={textPosition} />
          </AbsoluteFill>
        ) : (
          <SceneHook name={displayName} location={locationLine} img={heroMedia} textPosition={textPosition} />
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
            <HookOverlay title={nameSceneTitle} text={hookFull} duration={duration} textPosition={textPosition} />
          </AbsoluteFill>
        );

      case "media":
        return (
          <AbsoluteFill>
            {mediaList ? (
              <AbsoluteFill>
                {mediaList.slice(0, 3).map((m, i) => (
                  m.kind === "video" ? (
                    <VideoCover key={m.url + i} src={m.url} from={i * 35} duration={70} />
                  ) : (
                    <KenBurns key={m.url + i} src={m.url} from={i * 35} duration={70} />
                  )
                ))}
              </AbsoluteFill>
            ) : (mixedMode || useVideos) ? (
              <AbsoluteFill>
                {defaultMediaSlice.map((src, i) => (
                  <VideoCover key={src + i} src={src} from={i * 35} duration={70} />
                ))}
              </AbsoluteFill>
            ) : (
              <SceneGallery images={defaultGalleryList.slice(1)} />
            )}
            {(() => {
              const fzT = (freeZoneTitle || "").trim();
              const fzS = (freeZoneSubtitle || "").trim();
              const primary = fzT || hookPart2 || hookFull;
              const secondary = fzS || (fzT ? "" : "");
              return (
                <>
                  <HookOverlay text={primary} duration={duration} textPosition={textPosition} />
                  {secondary ? (
                    <AbsoluteFill style={{ pointerEvents: "none" }}>
                      <div style={{ position: "absolute", left: 0, right: 0, bottom: 120, textAlign: "center", padding: "0 40px", fontFamily: "'Avenir Next', 'Nunito Sans', sans-serif", fontSize: 30, lineHeight: 1.3, color: "rgba(255,255,255,0.92)", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>{secondary}</div>
                    </AbsoluteFill>
                  ) : null}
                </>
              );
            })()}
          </AbsoluteFill>
        );
      case "offer": {
        const idx = typeof offerIndex === "number" ? offerIndex : 0;
        const currentOffer = offersArr[idx] ?? offer;
        if (!currentOffer) return null;
        return (
          <AbsoluteFill>
            {(() => {
              const offerBgItem = offerOverride[idx] ?? offerOverride[0];
              const bgVideo = offerBgItem?.kind === "video" ? offerBgItem.url : currentOffer.background_video_url;
              const bgImage = offerBgItem?.kind === "image" ? offerBgItem.url : currentOffer.background_image_url;
              // Fallback to the global media selection (or AI-picked list) so the offer scene
              // is never left with just the dark default background.
              const fallbackVideo = !bgVideo && !bgImage ? safeVideos[idx % Math.max(1, safeVideos.length)] : undefined;
              const fallbackImage = !bgVideo && !bgImage && !fallbackVideo ? safeImages[idx % Math.max(1, safeImages.length)] : undefined;
              const finalVideo = bgVideo || fallbackVideo;
              const finalImage = bgImage || fallbackImage;
              if (finalVideo || finalImage) {
                return (
                  <>
                    <MotionBackdrop src={finalVideo} image={finalImage} duration={duration} effect={trImageEffect} veil="rgba(14,11,8,0.35)" />
                    <AbsoluteFill style={{ background: "linear-gradient(180deg,rgba(14,11,8,0.22) 0%,rgba(14,11,8,0.48) 100%)" }} />
                  </>
                );
              }
              return null;
            })()}
            <SceneOffer offer={currentOffer} city={city} durationFrames={duration} textPosition={textPosition} />
          </AbsoluteFill>
        );
      }
      case "reviews": {
        const it = (sm.reviews || [])[0];
        return (
          <>
            <MotionBackdrop
              src={it ? (it.kind === "video" ? it.url : undefined) : safeVideos[0]}
              image={it ? (it.kind === "image" ? it.url : undefined) : safeImages[0]}
              duration={duration}
              effect={trImageEffect}
            />
            <SceneReviews rating={rating} count={reviewsCount} textPosition={textPosition} />
          </>
        );
      }
      case "hours": {
        const it = (sm.hours || [])[0];
        return (
          <>
            <MotionBackdrop
              src={it ? (it.kind === "video" ? it.url : undefined) : (safeVideos[1] ?? safeVideos[0])}
              image={it ? (it.kind === "image" ? it.url : undefined) : (safeImages[1] ?? safeImages[0])}
              duration={duration}
              effect={trImageEffect}
            />
            <SceneHours openingHours={openingHours!} textPosition={textPosition} />
          </>
        );
      }
      case "map": {
        const it = (sm.map || [])[0];
        return (
          <>
            <MotionBackdrop
              src={it ? (it.kind === "video" ? it.url : undefined) : (safeVideos[2] ?? safeVideos[0])}
              image={it ? (it.kind === "image" ? it.url : undefined) : (safeImages[2] ?? safeImages[0])}
              duration={duration}
              effect={trImageEffect}
            />
            <SceneMap lat={latitude!} lng={longitude!} name={name} address={address} textPosition={textPosition} />
          </>
        );
      }
      case "digital": {
        const it = (sm.digital || [])[0];
        return (
          <>
            <MotionBackdrop
              src={it ? (it.kind === "video" ? it.url : undefined) : (safeVideos[3] ?? safeVideos[0])}
              image={it ? (it.kind === "image" ? it.url : undefined) : (safeImages[3] ?? safeImages[0])}
              duration={duration}
              effect={trImageEffect}
            />
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
      case "blog": {
        const arts = Array.isArray(blogArticles) ? blogArticles : [];
        const art = arts[offerIndex ?? 0] ?? arts[0];
        if (!art) return null;
        return (
          <>
            <MotionBackdrop
              src={safeVideos[0]}
              image={safeImages[1] ?? safeImages[0]}
              duration={duration}
              effect={trImageEffect}
            />
            <SceneBlogArticle
              article={art}
              mode={((art as any).mode ?? blogMode) === "scroll" ? "scroll" : "hero_map"}
              duration={duration}
              lat={latitude ?? null}
              lng={longitude ?? null}
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
            <MotionBackdrop
              src={it ? (it.kind === "video" ? it.url : undefined) : safeVideos[0]}
              image={it ? (it.kind === "image" ? it.url : undefined) : safeImages[0]}
              duration={duration}
              effect={trImageEffect}
            />
            {showAppInstall
              ? <SceneInstallCta name={name} textPosition={textPosition} />
              : <SceneCta name={name} textPosition={textPosition} />}
          </>
        );
      }
    }
  };

  // ==== Transitions entre les plans ====
  const trStyle: TransitionStyle = transitions?.style ?? "auto";
  const trPreset = STYLE_PRESETS[trStyle] ?? STYLE_PRESETS.auto;
  const trDifferentiate = transitions?.differentiate !== false;
  const trVideoEffect: TransitionEffect = trDifferentiate ? (transitions?.video ?? trPreset.video) : trPreset.video;
  const trImageEffect: TransitionEffect = trDifferentiate ? (transitions?.image ?? trPreset.image) : trPreset.video;
  const transitionFor = (kind: string): TransitionEffect => {
    if (continuousMode || slideshowMode) {
      // Fond continu (vidéo unique ou diaporama global) : la transition ne
      // s'applique qu'aux calques texte/contenu. On limite aux effets lisibles.
      const base = slideshowMode ? trImageEffect : trVideoEffect;
      const eff = resolveMix(base, kind);
      if (eff === "kenburns" || eff === "zoom" || eff === "wipe" || eff === "fade_black") return "crossfade";
      return eff;
    }

    const arr = (sm as Record<string, Array<{ url: string; kind: "image" | "video" }> | undefined>)[kind];
    const first = Array.isArray(arr) ? arr[0] : undefined;
    if (first) return resolveMix(first.kind === "video" ? trVideoEffect : trImageEffect, kind);
    if (hasVideos && !hasImages) return resolveMix(trVideoEffect, kind);
    return resolveMix(trImageEffect, kind);
  };

  const toneOverlay = TONE_CONFIG[tone]?.overlay ?? TONE_CONFIG.immersif.overlay;

  // Fondu audio : léger à l'entrée (~0.8s), plus prononcé à la sortie (~2.5s)
  const AUDIO_FADE_IN = 24;
  const AUDIO_FADE_OUT = 75;
  const { durationInFrames: totalFrames } = useVideoConfig();

  const audioFadeVolume = (f: number) => {
    const inV = interpolate(f, [0, AUDIO_FADE_IN], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const outV = interpolate(
      f,
      [Math.max(0, totalFrames - AUDIO_FADE_OUT), totalFrames],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    return Math.min(inV, outV);
  };



  return (
    <LangContext.Provider value={_lang}>
    <ToneContext.Provider value={tone}>
      <SuppressBgContext.Provider value={continuousMode || slideshowMode}>
        <AbsoluteFill style={{ backgroundColor: COLORS.night }}>
          {soundtrack && <Audio src={soundtrack} loop volume={audioFadeVolume} />}
          {continuousMode ? (
            <AbsoluteFill style={{ overflow: "hidden" }}>
              <OffthreadVideo
                src={continuousBgVideoUrl as string}
                muted={!bgSoundOn}
                volume={bgSoundOn ? audioFadeVolume : 0}
                loop
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />

              <AbsoluteFill style={{ background: "linear-gradient(180deg,rgba(14,11,8,0.22) 0%,rgba(14,11,8,0.38) 100%)" }} />
            </AbsoluteFill>
          ) : slideshowMode ? (
            <GlobalImageSlideshow images={safeImages} total={totalFrames} effect={trImageEffect} />
          ) : (
            <Background />
          )}
          {plan.map((s) => (
            <Sequence key={`${s.kind}-${s.from}`} from={s.from} durationInFrames={s.duration}>
              {(() => {
                const pk = s.kind === "custom" && s.customId ? `custom:${s.customId}` : s.kind;
                const linked = [
                  ...((scenePois ?? {})[pk] ?? []),
                  ...((sceneDestinations ?? {})[pk] ?? []),
                ];
                const hasPlaceMedia = linked.some((pl) =>
                  placesMediaMode === "images" ? !!(pl.image_url || pl.media_url) : !!(pl.media_url || pl.image_url),
                );
                return (
                  <SceneTransition effect={transitionFor(s.kind)} duration={s.duration}>
                    {hasPlaceMedia ? (
                      <>
                        <LinkedPlacesMontage places={linked} duration={s.duration} mode={placesMediaMode} />
                        <SuppressBgContext.Provider value={true}>{renderScene(s)}</SuppressBgContext.Provider>
                      </>
                    ) : (
                      <>
                        {renderScene(s)}
                        <LinkedPlacesOverlay places={linked} />
                      </>
                    )}
                  </SceneTransition>
                );
              })()}
            </Sequence>
          ))}

          {/* Finition visuelle liée au ton (vignette / teinte / désaturation) */}
          <AbsoluteFill style={{ background: toneOverlay, pointerEvents: "none" }} />
        </AbsoluteFill>
      </SuppressBgContext.Provider>
    </ToneContext.Provider>
    </LangContext.Provider>
  );
};


