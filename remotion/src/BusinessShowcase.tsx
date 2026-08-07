import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Img,
  OffthreadVideo,
  Audio,
  Loop,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from "remotion";
import { palette as COLORS, alpha, elevation, shadowOn, dropShadow, sp, display, body } from "./tokens";

// Base 22s @ 30fps — étendu dynamiquement par les options
export const SHOWCASE_TOTAL_FRAMES = 660;
export const OPTION_SCENE_FRAMES = 90; // 3s par scène optionnelle
// Jaune vif « flashy » utilisé pour les extraits d'avis et les étoiles.
export const FLASH_YELLOW = COLORS.flash;

export type TextPosition = "top" | "middle" | "bottom";
export type Tone = "immersif" | "dynamique" | "elegant";

const textPositionStyle = (position: TextPosition = "middle"): React.CSSProperties => {
  switch (position) {
    case "top": return { justifyContent: "flex-start", paddingTop: 100, paddingBottom: 40 };
    case "bottom": return { justifyContent: "flex-end", paddingTop: 40, paddingBottom: 140 };
    default: return { justifyContent: "center", paddingTop: 60, paddingBottom: 60 };
  }
};

/**
 * Colonne « anti-débordement » : mesure la hauteur réelle du contenu et,
 * si celui-ci dépasse la zone sûre du viewport, ancre le bloc en haut et
 * réduit l'échelle jusqu'à ce que tout tienne. Le titre ne sort donc jamais
 * par le haut, quel que soit le volume de texte (Offres / Blocs highlights).
 */
const FitColumn: React.FC<{
  children: React.ReactNode;
  align?: "center" | "flex-start";
  minScale?: number;
  /**
   * Zone haute du viewport (ratio 0→1) volontairement laissée vide, appliquée
   * UNIQUEMENT quand le texte est trop volumineux et doit être réduit.
   * Évite que la sur-impression vienne coller au bord haut de l'image.
   */
  topSafeRatio?: number;
}> = ({ children, align = "center", minScale = 0.62, topSafeRatio = 0 }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [fit, setFit] = React.useState<{ scale: number; height: number | null; offset: number }>({ scale: 1, height: null, offset: 0 });
  React.useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const availRaw = parent.clientHeight;
    // scrollHeight du contenu non transformé (on mesure avant application du scale)
    const h = el.scrollHeight;
    if (!availRaw || !h) return;
    if (fit.height == null && h > availRaw) {
      // Réserve la bande haute (20% du viewport par défaut) : on soustrait ce que
      // le conteneur occupe déjà au-dessus de cette limite.
      let offset = 0;
      if (topSafeRatio > 0) {
        const viewportH = typeof window !== "undefined" ? window.innerHeight : availRaw;
        const parentTop = parent.getBoundingClientRect().top;
        offset = Math.max(0, Math.min(availRaw * 0.5, viewportH * topSafeRatio - parentTop));
      }
      const avail = Math.max(1, availRaw - offset);
      setFit({ scale: Math.max(minScale, avail / h), height: avail, offset });
    }
  }, [children, minScale, topSafeRatio, fit.height]);
  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align,
        width: "100%",
        // Quand le contenu déborde : on fixe la hauteur de boîte à la zone
        // disponible et on réduit l'échelle depuis le haut, ce qui garantit
        // que le titre reste visible dans le viewport.
        ...(fit.height != null
          ? {
              height: fit.height,
              marginTop: fit.offset || undefined,
              transform: `scale(${fit.scale})`,
              transformOrigin: "top center",
            }
          : null),
      }}
    >
      {children}
    </div>
  );


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
  immersif:  { kenBurnsZoom: 0.22, fadeFrames: 16, overlay: `radial-gradient(80% 100% at 50% 50%,${alpha("black", 0)} 40%,${alpha("black", 0.35)} 100%)` },
  dynamique: { kenBurnsZoom: 0.10, fadeFrames: 6,  overlay: `linear-gradient(180deg,${alpha("terracotta", 0.10)} 0%,${alpha("black", 0.15)} 100%)` },
  elegant:   { kenBurnsZoom: 0.06, fadeFrames: 20, overlay: `linear-gradient(180deg,${alpha("white", 0.04)} 0%,${alpha("black", 0.10)} 100%)` },
};
const ToneContext = React.createContext<Tone>("immersif");
// Mode "vidéo unique en fond continu" : neutralise tous les fonds de scène
const SuppressBgContext = React.createContext<boolean>(false);
const useSuppressBg = (): boolean => React.useContext(SuppressBgContext);

// Time Start : point de départ (secondes) par URL de vidéo, défini dans le Studio.
const VideoStartsContext = React.createContext<Record<string, number>>({});
// Time End : point de fin (secondes) par URL de vidéo, défini dans le Studio.
const VideoEndsContext = React.createContext<Record<string, number>>({});
// Durée réelle (secondes) par URL de vidéo — permet de boucler le média plutôt
// que de figer la dernière image quand l'étape est plus longue que la vidéo.
const VideoDurationsContext = React.createContext<Record<string, number>>({});
/** Frame de fin d'une vidéo (Time End) — undefined si non défini. */
const useVideoEndFrames = (src?: string | null): number | undefined => {
  const ends = React.useContext(VideoEndsContext);
  const { fps } = useVideoConfig();
  if (!src) return undefined;
  const sec = ends?.[src];
  if (!Number.isFinite(sec) || (sec as number) <= 0) return undefined;
  return Math.max(1, Math.round((sec as number) * fps));
};
/** Durée réelle d'une vidéo en frames — undefined si inconnue. */
const useVideoDurationFrames = (src?: string | null): number | undefined => {
  const durations = React.useContext(VideoDurationsContext);
  const { fps } = useVideoConfig();
  if (!src) return undefined;
  const sec = durations?.[src];
  if (!Number.isFinite(sec) || (sec as number) <= 0.5) return undefined;
  return Math.max(1, Math.round((sec as number) * fps));
};

/** Frames à sauter au début d'une vidéo (Time Start). */
const useVideoStartFrames = (src?: string | null): number | undefined => {
  const starts = React.useContext(VideoStartsContext);
  const { fps } = useVideoConfig();
  if (!src) return undefined;
  const sec = starts?.[src];
  if (!Number.isFinite(sec) || (sec as number) <= 0) return undefined;
  return Math.max(1, Math.round((sec as number) * fps));
};

/** Vidéo de fond qui respecte le Time Start défini dans le Studio.
 *  `extraStartSec` décale le point d'entrée quand la même vidéo est relue
 *  plus loin dans le montage (évite de revoir exactement le même passage). */
const StartVideo: React.FC<{
  src: string;
  muted?: boolean;
  volume?: number | ((f: number) => number);
  loop?: boolean;
  style?: React.CSSProperties;
  extraStartSec?: number;
}> = ({ src, muted = true, volume, loop = true, style, extraStartSec = 0 }) => {
  const base = useVideoStartFrames(src) ?? 0;
  const endAtBase = useVideoEndFrames(src);
  const naturalFrames = useVideoDurationFrames(src);
  const { fps } = useVideoConfig();
  const extra = Number.isFinite(extraStartSec) && extraStartSec > 0 ? Math.round(extraStartSec * fps) : 0;
  // Fin utile du clip : Time End s'il est défini, sinon la durée réelle du média.
  const hardEnd = endAtBase ?? naturalFrames;
  // Le décalage de relecture reste borné à l'intervalle [Time Start, fin utile].
  const span = hardEnd != null ? Math.max(1, hardEnd - base) : undefined;
  // Sans fin connue, on ne connaît pas la durée réelle du clip : un décalage
  // trop grand ferait démarrer la lecture après la fin (image figée / écran noir).
  // On borne donc le décalage à 2 s dans ce cas.
  const safeExtra = span != null ? extra % span : Math.min(extra, Math.round(2 * fps));
  const startFrom = base + safeExtra;
  const endAt = hardEnd != null && hardEnd > startFrom + 1 ? hardEnd : undefined;
  const video = (
    <OffthreadVideo
      src={src}
      muted={muted}
      volume={volume as never}
      loop={false}
      startFrom={startFrom > 0 ? startFrom : undefined}
      endAt={endAt}
      style={style ?? { width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
  // Segment utile connu : on le répète explicitement via <Loop> pour couvrir
  // toute la durée de l'étape, au lieu de figer la dernière image à la fin.
  const loopFrames = endAt != null ? Math.max(1, endAt - startFrom - 1) : null;
  if (loop && loopFrames && loopFrames > fps) {
    return (
      <Loop durationInFrames={loopFrames} layout="none">
        {video}
      </Loop>
    );
  }
  return video;
};

/** Pool global des vidéos de l'établissement — sert à enchaîner les clips
 *  quand un clip est plus court que la durée de l'étape (au lieu de le boucler). */
const VideoPoolContext = React.createContext<string[]>([]);

/** Vidéo de fond qui, si le clip est plus court que l'étape, enchaîne
 *  automatiquement sur les clips suivants du pool au lieu de boucler. */
const ChainedVideo: React.FC<{ src: string; duration: number; extraStartSec?: number }> = ({
  src,
  duration,
  extraStartSec = 0,
}) => {
  const starts = React.useContext(VideoStartsContext);
  const ends = React.useContext(VideoEndsContext);
  const durs = React.useContext(VideoDurationsContext);
  const pool = React.useContext(VideoPoolContext);
  const { fps } = useVideoConfig();

  const spanOf = (u: string): number | null => {
    const b = Number.isFinite(starts?.[u]) && starts[u] > 0 ? Math.round(starts[u] * fps) : 0;
    const e = Number.isFinite(ends?.[u]) && ends[u] > 0
      ? Math.round(ends[u] * fps)
      : Number.isFinite(durs?.[u]) && durs[u] > 0.5
        ? Math.round(durs[u] * fps)
        : null;
    return e != null && e > b + 1 ? e - b - 1 : null;
  };

  const first = spanOf(src);
  const others = (Array.isArray(pool) ? pool : []).filter((u) => u && u !== src && isVideoSrc(u));
  // Clip assez long, durée inconnue, ou aucun autre clip → comportement d'origine.
  if (!first || first >= duration - Math.round(fps * 0.2) || others.length === 0) {
    return <StartVideo src={src} extraStartSec={extraStartSec} />;
  }

  const order = [src, ...others];
  const segs: { url: string; from: number; frames: number; extra: number }[] = [];
  let acc = 0;
  let i = 0;
  while (acc < duration && segs.length < 16) {
    const u = order[i % order.length];
    const pass = Math.floor(i / order.length);
    const s = spanOf(u) ?? duration - acc;
    const take = Math.max(1, Math.min(s, duration - acc));
    segs.push({
      url: u,
      from: acc,
      frames: take,
      extra: pass > 0 ? Math.min(pass, 2) * 2 : u === src ? extraStartSec : 0,
    });
    acc += take;
    i += 1;
  }

  return (
    <>
      {segs.map((s, idx) => (
        <Sequence key={`${s.url}-${idx}`} from={s.from} durationInFrames={s.frames} layout="none">
          <AbsoluteFill>
            <StartVideo src={s.url} extraStartSec={s.extra} />
          </AbsoluteFill>
        </Sequence>
      ))}
    </>
  );
};




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
  /** Format de sortie choisi dans le Studio (défaut 720×1280). */
  canvas_width?: number;
  canvas_height?: number;
  name?: string;

  hook?: string;
  tagline?: string;
  city?: string;
  neighborhood?: string | null;
  category?: string;
  images?: string[];
  videos?: string[];
  /** Point de départ (secondes) par URL de vidéo — défini dans le Studio (Time Start). */
  videoStarts?: Record<string, number>;
  /** Point de fin (secondes) par URL de vidéo — défini dans le Studio (Time End). */
  videoEnds?: Record<string, number>;
  /** Durée réelle (secondes) par URL de vidéo — sert à boucler le média. */
  videoDurations?: Record<string, number>;
  offer?: { title?: string; price?: string; lines?: string[]; message_html?: string | null; background_video_url?: string; background_image_url?: string } | null;
  offers?: Array<{ title?: string; price?: string; lines?: string[]; message_html?: string | null; background_video_url?: string; background_image_url?: string }> | null;
  /** Carte "Offre" rédigée par l'IA (option « Carte IA »), distincte des offres en base. */
  aiCard?: { title?: string; price?: string; lines?: string[]; message_html?: string | null; background_video_url?: string; background_image_url?: string } | null;
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
  /** Widget Météo intégré (données figées à la génération du scénario). */
  showWeatherWidget?: boolean;
  weatherWidget?: {
    city: string;
    citySlug?: string;
    range: number;
    text: string;
    durationSec?: number;
    hourly?: Array<{ hour: string; temp: number; code: number; wind: number; pop: number }>;
    daily?: Array<{ date: string; code: number; tmin: number; tmax: number; pop: number; wind: number }>;
  } | null;
  /** Widget Marées, Vents & Météo intégré. */
  showTidesWidget?: boolean;
  tidesWidget?: {
    city: string;
    citySlug?: string;
    mode: "all" | "tides" | "wind" | "weather";
    text: string;
    durationSec?: number;
    hours?: Array<{ hour: string; sea: number | null; temp: number | null; code: number | null; wind: number | null; gust: number | null; dir: number | null; pop: number | null }>;
    extremes?: Array<{ hour: string; type: "high" | "low"; height: number }>;
    /** Marnage moyen de vive-eau du port (m) — base du coefficient estimé. */
    springRange?: number | null;
    /** Date du jour affichée dans le titre (« Jeu. 6 août »). */
    dateLabel?: string | null;
  } | null;
  scenePois?: Record<string, PlaceItem[]>;
  sceneDestinations?: Record<string, PlaceItem[]>;
  /** Média des lieux liés : vidéo 1 (défaut) ou image 1. */
  placesMediaMode?: "videos" | "images";
  durationSec?: number;
  useFullHookScene?: boolean;
  lang?: VideoLang;
  /** Refus explicite de l'image associée d'une étape (clé = kind, valeur false). */
  use_associated_media?: Record<string, boolean>;
  scene_media?: Partial<Record<"logo" | "hook" | "name" | "media" | "popup" | "offer" | "highlight" | "reviews" | "google_review" | "tripadvisor" | "restaurant_guru" | "customer_review" | "hours" | "map" | "digital" | "whatsapp" | "cta" | "outro", Array<{ url: string; kind: "image" | "video" }>>>;
  /** Texte BIENVENUE (Présence en ligne / CTAs) — étape juste après le logo. */
  welcomeText?: string | null;
  /** Texte PROPOSITION (Présence en ligne / CTAs) — étape après Bienvenue. */
  propositionText?: string | null;
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
  /** Version rich text (gras/italique/puces) du texte popup */
  popupDescriptionHtml?: string | null;
  aiSummaries?: Array<{ id?: string; title?: string; content?: string; content_html?: string | null; effect?: string | null }> | null;
  /** Effet appliqué au média de fond des séquences Résumé IA (défaut global) */
  aiSummaryEffect?: "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "pan_down" | "pan_up" | "scroll_v" | null;
  /** Textes IA (onglet TXT IA de Présence en ligne) — une séquence par texte coché */
  aiTexts?: Array<{ id?: string; title?: string; content?: string; content_html?: string | null; effect?: string | null }> | null;
  externalLinks?: Array<{ id?: string; name?: string; label?: string; description?: string; description_html?: string | null; url?: string | null; image?: string | null }> | null;
  menuDocs?: Array<{ id?: string; name?: string; description?: string; description_html?: string | null; url?: string | null }> | null;

  highlights?: Array<{ id?: string; icon?: string | null; image_url?: string | null; title?: string; description?: string; description_html?: string | null; effect?: string | null; metric_title?: string; metric_value?: string }> | null;

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
  /** Affiche le contenu de la carte Offre dans la scène WhatsApp. */
  whatsappShowOffer?: boolean;
  textSplits?: Record<string, number>;
  /** Segments de texte explicites (découpe au caractère près). Clé = kind ou `custom:<id>`. */
  textSegments?: Record<string, string[]>;
  // Overrides manuels du texte des scènes (clé = kind de scène, ex. "hook" | "name")
  textOverrides?: Record<string, { label?: string; description?: string }>;
  splitCount?: number;
  // Vidéo unique jouée en fond continu sur toute la durée (les fonds de scène sont neutralisés)
  continuousBgVideoUrl?: string | null;
  continuousBgSound?: boolean;
  // Durée réelle (secondes) de la vidéo de fond continue : si elle est plus courte
  // que le scénario, on la boucle (image + son) au lieu de figer la dernière image.
  continuousBgVideoDurationSec?: number | null;
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
          background: alpha("black", 0.42),
          backdropFilter: "blur(6px)",
          boxShadow: shadowOn(8, 28, "black", 0.4),
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
            color: COLORS.white,
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
            background: `linear-gradient(100deg, ${alpha("white", 0)} 0%, ${alpha("white", 0.22)} 50%, ${alpha("white", 0)} 100%)`,
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

type SceneKind = "logo" | "welcome" | "proposition" | "hook" | "name" | "ai_card" | "media" | "popup" | "offer" | "highlight" | "ai_summary" | "ai_text" | "external_link" | "menu_doc" | "reviews" | "google_review" | "tripadvisor" | "restaurant_guru" | "customer_review" | "hours" | "map" | "digital" | "blog" | "weather" | "tides" | "whatsapp" | "cta" | "outro";

const DEFAULT_SCENE_ORDER: SceneKind[] = ["logo", "welcome", "proposition", "hook", "name", "ai_card", "offer", "popup", "media", "highlight", "ai_summary", "ai_text", "external_link", "menu_doc", "reviews", "google_review", "tripadvisor", "restaurant_guru", "customer_review", "hours", "map", "digital", "blog", "weather", "tides", "whatsapp", "cta", "outro"];

function isSceneActive(kind: SceneKind, p: ShowcaseProps): boolean {
  switch (kind) {
    case "logo": return !!(p.openWithLogo && p.logoUrl);
    case "welcome": return !!(p.welcomeText && p.welcomeText.trim());
    case "proposition": return !!(p.propositionText && p.propositionText.trim());
    case "hook":
    case "name": return true;
    case "media": return !!p.freeZone;
    case "popup": return !!(p.showPopup && p.popupImageUrl);
    case "highlight": return Array.isArray(p.highlights) && p.highlights.length > 0;
    case "ai_summary": return Array.isArray(p.aiSummaries) && p.aiSummaries.length > 0;
    case "ai_text": return Array.isArray(p.aiTexts) && p.aiTexts.length > 0;
    case "external_link": return Array.isArray(p.externalLinks) && p.externalLinks.length > 0;
    case "menu_doc": return Array.isArray(p.menuDocs) && p.menuDocs.length > 0;
    case "cta": return p.showAppInstall !== false;
    case "offer": return !!p.offer || (Array.isArray(p.offers) && p.offers.length > 0);
    case "ai_card": return !!p.aiCard;
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
    case "weather": return !!(p.showWeatherWidget && p.weatherWidget);
    case "tides": return !!(p.showTidesWidget && p.tidesWidget);
    case "whatsapp": return !!(p.showWhatsapp && p.whatsappNumber);
    case "outro": return p.showAppInstall !== false;
  }
}

function defaultSceneFrames(kind: SceneKind, p: ShowcaseProps): number {
  switch (kind) {
    case "logo": return 60;
    case "welcome":
    case "proposition": return 90;
    case "hook": return 120;
    case "name": return 120;
    case "media": return 150;
    case "popup": return 120;
    case "highlight": return 140;
    case "ai_summary":
    case "ai_text":
    case "external_link":
    case "menu_doc": return 150;
    case "offer": {
      const lines = p.offer && Array.isArray(p.offer.lines) ? p.offer.lines.length : 0;
      return 120 + Math.min(lines, 6) * 22;
    }
    case "ai_card": {
      const lines = p.aiCard && Array.isArray(p.aiCard.lines) ? p.aiCard.lines.length : 0;
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
    case "weather": return Math.round((p.weatherWidget?.durationSec ?? 6) * 30);
    case "tides": return Math.round((p.tidesWidget?.durationSec ?? 6) * 30);
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
    // « Appel à l'action » et « Outro » sont deux étapes DISTINCTES : le CTA
    // (installation de l'app) puis la clôture de marque. On les conserve toutes
    // les deux, en garantissant que l'outro passe en dernier.
    const idxOutro = requested.findIndex((t) => t.kind === "outro");
    if (idxOutro >= 0 && idxOutro !== requested.length - 1) {
      const [outroTok] = requested.splice(idxOutro, 1);
      requested.push(outroTok);
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

  // Expand ai_summary / external_link / menu_doc tokens (one per selected item).
  for (const spec of [
    { kind: "ai_summary" as SceneKind, list: Array.isArray(p.aiSummaries) ? p.aiSummaries : [] },
    { kind: "ai_text" as SceneKind, list: Array.isArray(p.aiTexts) ? p.aiTexts : [] },
    { kind: "external_link" as SceneKind, list: Array.isArray(p.externalLinks) ? p.externalLinks : [] },
    { kind: "menu_doc" as SceneKind, list: Array.isArray(p.menuDocs) ? p.menuDocs : [] },
  ]) {
    if (spec.list.length > 1) {
      const expanded: Tok[] = [];
      for (const t of order) {
        if (t.kind === spec.kind) {
          for (let i = 0; i < spec.list.length; i++) expanded.push({ kind: spec.kind, offerIndex: i });
        } else {
          expanded.push(t);
        }
      }
      order = expanded;
    } else if (spec.list.length === 1) {
      for (const t of order) if (t.kind === spec.kind) t.offerIndex = 0;
    }
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
  // La durée d'une étape est la durée TOTALE de l'étape, exactement comme dans
  // « Aperçu du scénario » : quand le texte est découpé en N cartes, cette durée
  // est répartie entre les cartes (duration / N), on ne la multiplie donc pas.
  const durationFor = (tok: Tok): number => {
    if (tok.kind === "custom" && tok.customId) {
      const c = customById.get(tok.customId);
      const d = Number(c?.duration ?? 4);
      return Math.max(30, Math.round((Number.isFinite(d) && d > 0 ? d : 4) * 30));
    }
    const kind = tok.kind as SceneKind;
    return durOverride(kind) ?? defaultSceneFrames(kind, p);
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
  // Pas de plancher à 300 : sinon un scénario raccourci laisse un écran noir
  // à la fin (durée composition > somme des scènes).
  return sum > 0 ? sum : 300;
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
    <AbsoluteFill style={{ background: `linear-gradient(180deg,${COLORS.brown} 0%,${COLORS.night} 50%,${COLORS.brown} 100%)` }} />
    <AbsoluteFill
      style={{
        background:
          `radial-gradient(60% 40% at 50% 0%,${alpha("terracotta", 0.22)} 0%,${alpha("night", 0)} 60%),radial-gradient(70% 50% at 50% 100%,${alpha("gold", 0.14)} 0%,${alpha("night", 0)} 60%)`,
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
        <StartVideo src={src} />
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
        style={{ background: `linear-gradient(180deg,${alpha("black", 0.02)} 40%,${alpha("night", 0.55)} 100%)` }}
      />
    </AbsoluteFill>
  );
};

/** Découpe un texte : segments explicites prioritaires, sinon découpe par mots en n blocs. */
function resolveTextChunks(text: string, explicit?: string[], n?: number): string[] {
  const t = (text || "").trim();
  if (Array.isArray(explicit) && explicit.length > 1) {
    const segs = explicit.map((x) => (x || "").trim()).filter(Boolean);
    if (segs.length > 1) return segs;
  }
  const count = Number.isFinite(Number(n)) ? Math.max(1, Math.min(10, Math.round(Number(n)))) : 1;
  const words = t.split(/\s+/).filter(Boolean);
  if (count <= 1 || words.length <= 1) return [];
  const per = Math.ceil(words.length / count);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += per) out.push(words.slice(i, i + per).join(" "));
  return out;
}

const SceneHook: React.FC<{ name: string; location: string; img?: string; textPosition?: TextPosition }> = ({ name, location, img, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const titleY = interpolate(spring({ frame: frame - 8, fps: 30, config: sp(18) }), [0, 1], [40, 0]);
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
            textShadow: shadowOn(4, 24, "black", 0.6),
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
              textShadow: shadowOn(2, 12, "black", 0.7),
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
            textShadow: shadowOn(2, 12, "black", 0.7),
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
            lineHeight: 1.55,
            textAlign: "center",
            textShadow: shadowOn(4, 24, "black", 0.75),
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
  offer: { title?: string; price?: string; lines?: string[]; message_html?: string | null };
  city?: string;
  durationFrames?: number;
  textPosition?: TextPosition;
}> = ({ offer, city, durationFrames = 120, textPosition = "middle" }) => {
  const L = useL();
  const frame = useCurrentFrame();
  const labelO = ease(frame, 0, 18);
  const titleO = ease(frame, 14, 36);
  const priceS = spring({ frame: frame - 24, fps: 30, config: sp(14) });
  const outStart = Math.max(30, durationFrames - 20);
  const out = 1 - ease(frame, outStart, durationFrames);
  const lines = Array.isArray(offer.lines) ? offer.lines.filter(Boolean).slice(0, 6) : [];
  const richMsg = sanitizeRich(offer.message_html || "");
  const hasRich = /<(b|strong|i|em|u|ul|ol|li|p|br|h1|h2|h3|h4)\b/i.test(richMsg);
  const hasPrice = !!offer.price;
  const hasBody = hasRich || lines.length > 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", padding: 60, ...textPositionStyle(textPosition), opacity: out }}>
      <style>{RICH_CSS}</style>
      <FitColumn>
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
          fontSize: hasBody ? 46 : 54,
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
            marginTop: hasBody ? 20 : 40,
            fontFamily: display,
            fontWeight: 700,
            color: COLORS.terracotta,
            fontSize: hasBody ? 82 : 130,
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          {offer.price}
        </div>
      )}
      {hasRich ? (
        <RichBlock
          html={richMsg}
          style={{ marginTop: 28, fontFamily: body, color: COLORS.cream, fontSize: 24, lineHeight: 1.35, maxWidth: 640, alignSelf: "center", opacity: ease(frame, 30, 52) }}
        />
      ) : lines.length > 0 && (
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
      </FitColumn>
    </AbsoluteFill>

  );
};

/**
 * Carte ajoutée manuellement au scénario (étape « ai_card ») :
 * le titre et le texte sont rendus dans DEUX blocs totalement indépendants
 * (deux lignes de flux, gap explicite, aucune superposition possible), et le
 * texte est débarrassé d'un éventuel titre dupliqué en tête de contenu.
 */
const normalizeForCompare = (s: string) =>
  s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

const stripLeadingTitle = (html: string, title: string) => {
  const t = normalizeForCompare(title);
  if (!t) return html;
  // Retire le premier bloc (titre ou paragraphe) s'il répète le titre de la carte.
  return html.replace(/^\s*<(h[1-4]|p)\b[^>]*>([\s\S]*?)<\/\1>/i, (m, _tag, inner) =>
    normalizeForCompare(String(inner)) === t ? "" : m,
  );
};

const SceneManualCard: React.FC<{
  card: { title?: string; price?: string; lines?: string[]; message_html?: string | null };
  durationFrames?: number;
  textPosition?: TextPosition;
}> = ({ card, durationFrames = 120, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const titleO = ease(frame, 0, 24);
  const bodyO = ease(frame, 18, 44);
  const outStart = Math.max(30, durationFrames - 20);
  const out = 1 - ease(frame, outStart, durationFrames);

  const title = (card.title || "").trim();
  const lines = Array.isArray(card.lines) ? card.lines.filter(Boolean).slice(0, 6) : [];
  const rawRich = sanitizeRich(card.message_html || "");
  const richMsg = stripLeadingTitle(rawRich, title);
  const hasRich = /<(b|strong|i|em|u|ul|ol|li|p|br|h1|h2|h3|h4)\b/i.test(richMsg);
  const hasBody = hasRich || lines.length > 0;

  return (
    <AbsoluteFill style={{ alignItems: "center", padding: 60, ...textPositionStyle(textPosition), opacity: out }}>
      <style>{RICH_CSS}</style>
      <FitColumn topSafeRatio={0.14}>
        {title ? (
          <div
            style={{
              display: "block",
              width: "100%",
              opacity: titleO,
              fontFamily: display,
              fontWeight: 700,
              color: COLORS.cream,
              fontSize: hasBody ? 46 : 56,
              textAlign: "center",
              lineHeight: 1.12,
              padding: "0 20px",
              textShadow: shadowOn(3, 18, "black", 0.6),
            }}
          >
            {title}
          </div>
        ) : null}

        {title && hasBody ? (
          <div
            style={{
              width: 120,
              height: 2,
              marginTop: 22,
              marginBottom: 22,
              background: COLORS.gold,
              opacity: bodyO * 0.8,
              flex: "0 0 auto",
            }}
          />
        ) : null}

        {hasBody ? (
          <div style={{ display: "block", width: "100%", opacity: bodyO }}>
            {hasRich ? (
              <RichBlock
                html={richMsg}
                style={{
                  fontFamily: body,
                  color: COLORS.cream,
                  fontSize: 24,
                  lineHeight: 1.38,
                  maxWidth: 660,
                  margin: "0 auto",
                }}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", maxWidth: 620, margin: "0 auto" }}>
                {lines.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      opacity: ease(frame, 22 + i * 8, 44 + i * 8),
                      fontFamily: body,
                      color: COLORS.cream,
                      fontSize: 24,
                      lineHeight: 1.38,
                      textAlign: "center",
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </FitColumn>
    </AbsoluteFill>
  );
};

const SceneCta: React.FC<{ name: string; textPosition?: TextPosition }> = ({ name, textPosition = "middle" }) => {
  const L = useL();
  const frame = useCurrentFrame();
  const iconS = spring({ frame, fps: 30, config: sp(14) });
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
  const iconS = spring({ frame, fps: 30, config: sp(14) });
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
          textShadow: shadowOn(4, 24, "black", 0.65),
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
          boxShadow: shadowOn(18, 54, "terracotta", 0.35),
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
  const animatedNote = noteTarget != null ? (noteTarget * noteProgress).toFixed(2) : null;
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
            textShadow: shadowOn(4, 24, "black", 0.6),
          }}
        >
          {animatedNote}
          <span style={{ fontSize: 70, color: COLORS.cream }}>/20</span>
        </div>
      )}
      {count != null && count > 0 && (
        <div style={{ marginTop: 30, fontFamily: display, fontWeight: 700, color: COLORS.cream, fontSize: 56, textShadow: shadowOn(2, 12, "black", 0.7) }}>
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
                borderBottom: `1px solid ${alpha("gold", 0.18)}`,
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

// ---------------------------------------------------------------------------
// Widgets Météo & Marées : défilement visuel de la prévision dans la durée
// de l'étape. Toutes les données sont figées côté serveur → rendu déterministe.
// ---------------------------------------------------------------------------
const wmoIcon = (code: number | null | undefined): string => {
  const c = Number(code ?? 0);
  if (c === 0) return "☀️";
  if (c <= 2) return "🌤️";
  if (c === 3) return "☁️";
  if (c === 45 || c === 48) return "🌫️";
  if (c >= 51 && c <= 57) return "🌦️";
  if (c >= 61 && c <= 67) return "🌧️";
  if (c >= 71 && c <= 77) return "🌨️";
  if (c >= 80 && c <= 82) return "🌧️";
  if (c >= 95) return "⛈️";
  return "🌤️";
};

const dayLabelFr = (iso: string): string => {
  const d = new Date(`${iso}T12:00:00`);
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  return `${days[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Layout dérivé du canvas : permet aux scènes de s'adapter à tout format
 * (720×1280 portrait aujourd'hui, 1080×1920 / 1920×1080 / 1:1 demain)
 * sans layout codé en dur.
 */
type SceneLayout = {
  w: number;
  h: number;
  orientation: "portrait" | "landscape" | "square";
  scale: number;
  gutter: number;
  contentW: number;
  px: (n: number) => number;
};

const useLayout = (): SceneLayout => {
  const { width: w, height: h } = useVideoConfig();
  const orientation = w === h ? "square" : w > h ? "landscape" : "portrait";
  // Base de référence : le plus petit côté du canvas 720×1280.
  const scale = Math.min(w, h) / 720;
  const gutter = Math.round(40 * scale);
  const contentW =
    orientation === "portrait"
      ? w - 2 * gutter
      : Math.min(w - 2 * gutter, Math.round(1100 * scale));
  return { w, h, orientation, scale, gutter, contentW, px: (n) => Math.round(n * scale) };
};

const WidgetShell: React.FC<{ title: string; kicker: string; opacity: number; children: React.ReactNode }> = ({ title, kicker, opacity, children }) => {
  const { contentW, px } = useLayout();
  return (
    <div
      style={{
        opacity,
        width: contentW,
        maxWidth: "100%",
        borderRadius: px(28),
        padding: `${px(34)}px ${px(38)}px`,
        background: `linear-gradient(160deg, ${alpha("charcoal", 0.88)}, ${alpha("inkWarm", 0.82)})`,
        border: `${Math.max(2, px(2))}px solid ${COLORS.gold}`,
        boxShadow: shadowOn(24, 70, "black", 0.6),
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontFamily: body, color: COLORS.gold, fontSize: px(20), letterSpacing: px(5), textTransform: "uppercase" }}>{kicker}</div>
      <div style={{ marginTop: px(10), fontFamily: body, color: COLORS.cream, fontSize: px(34), fontWeight: 700, lineHeight: 1.25 }}>{title}</div>
      <div style={{ marginTop: px(26) }}>{children}</div>
    </div>
  );
};

/** Barre de progression horaire animée, échantillonnée selon le format. */
const HourStrip: React.FC<{ labels: string[]; values: number[]; unit: string; progress: number; accent: string }> = ({ labels, values, unit, progress, accent }) => {
  const { orientation, px } = useLayout();
  // En portrait, 24 barres sont illisibles : on échantillonne (pas de 2 ou 3 h).
  const maxBars = orientation === "portrait" ? 10 : 24;
  const step = Math.max(1, Math.ceil(values.length / maxBars));
  const idxs = values.map((_, i) => i).filter((i) => i % step === 0);
  const sValues = idxs.map((i) => values[i]);
  const sLabels = idxs.map((i) => labels[i] ?? "");
  const max = Math.max(...sValues, 1);
  const min = Math.min(...sValues, 0);
  const span = max - min || 1;
  const rawActive = Math.min(values.length - 1, Math.floor(progress * values.length));
  const activeIdx = Math.min(sValues.length - 1, Math.floor(rawActive / step));
  const barH = px(180);
  const labelEvery = sValues.length > 12 ? 2 : 1;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: px(6), height: barH }}>
        {sValues.map((v, i) => {
          const revealed = i <= activeIdx;
          const h = px(24) + ((v - min) / span) * px(140);
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: px(6) }}>
              <div style={{ fontFamily: body, fontSize: px(15), color: revealed ? COLORS.cream : alpha("parchment", 0.25) }}>
                {max <= 5 ? v.toFixed(1) : Math.round(v)}
              </div>
              <div
                style={{
                  width: "100%",
                  height: h,
                  borderRadius: px(6),
                  background: revealed ? accent : alpha("white", 0.10),
                  transform: `scaleY(${revealed ? 1 : 0.35})`,
                  transformOrigin: "bottom",
                  boxShadow: i === activeIdx ? `0 0 ${px(24)}px ${accent}` : "none",
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: px(6), marginTop: px(8) }}>
        {sLabels.map((l, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", fontFamily: body, fontSize: px(13), color: i === activeIdx ? COLORS.gold : alpha("parchment", 0.4) }}>
            {i % labelEvery === 0 ? l.slice(0, 2) + "h" : ""}
          </div>
        ))}
      </div>
      <div style={{ marginTop: px(12), fontFamily: body, fontSize: px(18), color: COLORS.gold }}>{unit}</div>
    </div>
  );
};


const SceneWeatherWidget: React.FC<{ widget: NonNullable<ShowcaseProps["weatherWidget"]>; duration: number; textPosition?: TextPosition }> = ({ widget, duration, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const { orientation, gutter, px } = useLayout();
  const portrait = orientation !== "landscape";
  const o = ease(frame, 0, 14);
  const progress = interpolate(frame, [8, Math.max(duration - 6, 20)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hourly = (widget.hourly || []).slice(0, 24);
  const daily = (widget.daily || []).slice(0, widget.range === 7 ? 7 : 3);
  const oneDay = (widget.range || 1) === 1;
  const activeH = hourly[Math.min(hourly.length - 1, Math.floor(progress * hourly.length))];
  // Portrait : au-delà de 4 jours on passe en grille pour rester lisible.
  const cols = portrait ? Math.min(daily.length, 4) : daily.length;
  return (
    <AbsoluteFill style={{ alignItems: "center", padding: gutter, ...textPositionStyle(textPosition) }}>
      <WidgetShell kicker="Météo" title={widget.text} opacity={o}>
        {oneDay && hourly.length > 0 ? (
          <>
            <div
              style={{
                display: "flex",
                flexDirection: portrait ? "column" : "row",
                alignItems: portrait ? "flex-start" : "center",
                gap: px(portrait ? 8 : 22),
                marginBottom: px(18),
              }}
            >
              <div style={{ fontSize: px(72), lineHeight: 1 }}>{wmoIcon(activeH?.code)}</div>
              <div style={{ fontFamily: body, color: COLORS.cream }}>
                <div style={{ fontSize: px(62), fontWeight: 700, lineHeight: 1.05 }}>{activeH ? `${activeH.temp}°` : "--"}</div>
                <div style={{ fontSize: px(22), color: COLORS.gold }}>
                  {activeH ? `${activeH.hour} · vent ${activeH.wind} km/h · pluie ${activeH.pop}%` : ""}
                </div>
              </div>
            </div>
            <HourStrip
              labels={hourly.map((h) => h.hour)}
              values={hourly.map((h) => h.temp)}
              unit="Températures sur 24 h (°C)"
              progress={progress}
              accent={COLORS.gold}
            />
          </>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: px(14) }}>
            {daily.map((d, i) => {
              const reveal = ease(frame, 10 + i * 6, 26 + i * 6);
              const focus = Math.floor(progress * daily.length) === i;
              return (
                <div
                  key={d.date}
                  style={{
                    opacity: reveal,
                    transform: `translateY(${interpolate(reveal, [0, 1], [22, 0])}px) scale(${focus ? 1.05 : 1})`,
                    borderRadius: px(18),
                    padding: `${px(18)}px ${px(10)}px`,
                    textAlign: "center",
                    background: focus ? alpha("gold", 0.18) : alpha("white", 0.06),
                    border: `1px solid ${focus ? COLORS.gold : alpha("gold", 0.2)}`,
                    fontFamily: body,
                  }}
                >
                  <div style={{ fontSize: px(18), color: COLORS.gold }}>{dayLabelFr(d.date)}</div>
                  <div style={{ fontSize: px(42), margin: `${px(8)}px 0` }}>{wmoIcon(d.code)}</div>
                  <div style={{ fontSize: px(26), color: COLORS.cream, fontWeight: 700 }}>{d.tmax}°</div>
                  <div style={{ fontSize: px(18), color: alpha("parchment", 0.6) }}>{d.tmin}°</div>
                  <div style={{ fontSize: px(15), color: COLORS.gold, marginTop: px(6) }}>{d.pop}%</div>
                </div>
              );
            })}
          </div>
        )}
      </WidgetShell>
    </AbsoluteFill>
  );
};


// ===== Règle des douzièmes (marées) =====
type TideExtreme = { hour: string; type: "high" | "low"; height: number };
/** Répartition du marnage par heure-marée : 1/12, 2/12, 3/12, 3/12, 2/12, 1/12. */
const TWELFTHS = [1, 2, 3, 3, 2, 1];
const hhmmToMin = (h?: string | null) => {
  if (!h || !/^\d{1,2}:\d{2}/.test(h)) return null;
  const [a, b] = h.split(":");
  return Number(a) * 60 + Number(b);
};
const minToHhmm = (m: number) => {
  const v = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};
/** Cycle marée le plus marqué de la journée (paire basse↔haute consécutive). */
function mainTideCycle(exts: TideExtreme[]) {
  let best: { from: TideExtreme; to: TideExtreme; range: number; durMin: number } | null = null;
  for (let i = 0; i < exts.length - 1; i++) {
    const a = exts[i];
    const b = exts[i + 1];
    if (a.type === b.type) continue;
    const ma = hhmmToMin(a.hour);
    const mb = hhmmToMin(b.hour);
    if (ma == null || mb == null) continue;
    let durMin = mb - ma;
    if (durMin <= 0) durMin += 1440;
    if (durMin < 180 || durMin > 500) continue;
    const range = Math.abs(b.height - a.height);
    if (!best || range > best.range) best = { from: a, to: b, range, durMin };
  }
  return best;
}
/** Phase (heure-marée 1→6) d'un horaire dans le cycle courant. */
function tidePhaseAt(exts: TideExtreme[], hour?: string | null) {
  const t = hhmmToMin(hour);
  if (t == null || exts.length < 2) return null;
  for (let i = 0; i < exts.length - 1; i++) {
    const ma = hhmmToMin(exts[i].hour);
    const mb = hhmmToMin(exts[i + 1].hour);
    if (ma == null || mb == null || exts[i].type === exts[i + 1].type) continue;
    if (t < ma || t > mb) continue;
    const durMin = Math.max(1, mb - ma);
    const step = durMin / 6;
    const phase = Math.min(6, Math.max(1, Math.floor((t - ma) / step) + 1));
    return { phase, rising: exts[i + 1].type === "high", hourTideMin: Math.round(step) };
  }
  return null;
}
const tideCoefficient = (range: number | null, springRange?: number | null) => {
  if (range == null || !springRange || springRange <= 0) return null;
  return Math.max(20, Math.min(120, Math.round((range / springRange) * 95)));
};

/** Récapitulatif marées : plus haute / plus basse, marnage, douzièmes, coefficient, étale. */
const TidesRecapPanel: React.FC<{ widget: NonNullable<ShowcaseProps["tidesWidget"]>; local: number; duration: number }> = ({ widget, local, duration }) => {
  const { orientation, px } = useLayout();
  const portrait = orientation !== "landscape";
  const exts = (widget.extremes || []) as TideExtreme[];
  const highs = exts.filter((e) => e.type === "high");
  const lows = exts.filter((e) => e.type === "low");
  const topHigh = highs.length ? highs.reduce((a, b) => (b.height > a.height ? b : a)) : null;
  const topLow = lows.length ? lows.reduce((a, b) => (b.height < a.height ? b : a)) : null;
  const cycle = mainTideCycle(exts);
  const range = cycle ? cycle.range : topHigh && topLow ? Math.abs(topHigh.height - topLow.height) : null;
  const twelfth = range != null ? range / 12 : null;
  const hourTide = cycle ? Math.round(cycle.durMin / 6) : null;
  const coef = tideCoefficient(range, widget.springRange ?? null);
  const rising = cycle ? cycle.to.type === "high" : true;
  const startH = cycle ? hhmmToMin(cycle.from.hour) : null;
  const baseHeight = cycle ? cycle.from.height : null;

  let cum = 0;
  const steps = TWELFTHS.map((tw, i) => {
    cum += tw;
    const h = baseHeight != null && twelfth != null
      ? baseHeight + (rising ? 1 : -1) * twelfth * cum
      : null;
    return {
      i,
      tw,
      cum,
      hour: startH != null && cycle ? minToHhmm(startH + ((i + 1) * cycle.durMin) / 6) : null,
      height: h,
    };
  });

  const reveal = (from: number, to: number) => ease(local, from, to);
  const line = (label: string, value: string, delay: number) => (
    <div style={{ opacity: reveal(delay, delay + 12), fontFamily: body, display: "flex", gap: px(10), alignItems: "baseline" }}>
      <span style={{ fontSize: px(20), color: alpha("parchment", 0.65) }}>{label}</span>
      <span style={{ fontSize: px(26), color: COLORS.cream, fontWeight: 700 }}>{value}</span>
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", gap: px(portrait ? 10 : 34), marginBottom: px(14) }}>
        <div style={{ opacity: reveal(2, 16), fontFamily: body }}>
          <div style={{ fontSize: px(18), color: COLORS.gold, letterSpacing: px(3) }}>PLEINE MER</div>
          <div style={{ fontSize: px(portrait ? 46 : 52), color: COLORS.gold, fontWeight: 700, lineHeight: 1.05 }}>
            {topHigh ? topHigh.hour : "--"}
          </div>
          <div style={{ fontSize: px(24), color: COLORS.cream }}>{topHigh ? `${topHigh.height.toFixed(2)} m` : ""}</div>
        </div>
        <div style={{ opacity: reveal(8, 22), fontFamily: body }}>
          <div style={{ fontSize: px(18), color: COLORS.gold, letterSpacing: px(3) }}>BASSE MER</div>
          <div style={{ fontSize: px(portrait ? 46 : 52), color: COLORS.gold, fontWeight: 700, lineHeight: 1.05 }}>
            {topLow ? topLow.hour : "--"}
          </div>
          <div style={{ fontSize: px(24), color: COLORS.cream }}>{topLow ? `${topLow.height.toFixed(2)} m` : ""}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: px(portrait ? 8 : 26), marginBottom: px(14) }}>
        {line("Marnage", range != null ? `${range.toFixed(2)} m` : "--", 14)}
        {line("1/12", twelfth != null ? `${twelfth.toFixed(2)} m` : "--", 18)}
        {line("Heure-marée", hourTide != null ? `${hourTide} min` : "--", 22)}
        {coef != null && line("Coefficient", `${coef} · ${coef >= 70 ? "vive-eau" : "morte-eau"}`, 26)}
      </div>

      {/* Règle des douzièmes : 1 · 2 · 3 · 3 · 2 · 1 */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: px(8), height: px(portrait ? 150 : 170) }}>
        {steps.map((s) => {
          const grow = ease(local, 26 + s.i * 6, 44 + s.i * 6);
          const hRatio = s.tw / 3;
          return (
            <div key={s.i} style={{ flex: 1, textAlign: "center", fontFamily: body }}>
              <div style={{ fontSize: px(18), color: COLORS.cream, opacity: grow, marginBottom: px(4) }}>
                {s.height != null ? `${s.height.toFixed(2)}` : ""}
              </div>
              <div
                style={{
                  height: `${hRatio * 62 * grow}%`,
                  minHeight: px(4),
                  borderRadius: px(8),
                  background: `linear-gradient(180deg,${COLORS.sky} 0%,${COLORS.skyDeep} 100%)`,
                  opacity: 0.35 + 0.65 * grow,
                }}
              />
              <div style={{ fontSize: px(19), color: COLORS.gold, marginTop: px(6), opacity: grow }}>{s.tw}/12</div>
              <div style={{ fontSize: px(16), color: alpha("parchment", 0.6), opacity: grow }}>{s.hour ?? ""}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: px(12), opacity: reveal(70, 86), fontFamily: body, fontSize: px(19), color: alpha("parchment", 0.75), lineHeight: 1.35 }}>
        Règle des douzièmes : l'eau {rising ? "monte" : "descend"} lentement, puis très vite en 3ᵉ et 4ᵉ heure-marée.
        {topHigh || topLow ? " Étale " : ""}
        {topHigh || topLow
          ? `(pause du niveau, ~30 min) autour de ${topHigh ? topHigh.hour : "--"}${topLow ? ` et ${topLow.hour}` : ""}.`
          : ""}
      </div>
    </>
  );
};

const SceneTidesWidget: React.FC<{ widget: NonNullable<ShowcaseProps["tidesWidget"]>; duration: number; textPosition?: TextPosition }> = ({ widget, duration, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const { orientation, gutter, px } = useLayout();
  const portrait = orientation !== "landscape";
  const o = ease(frame, 0, 14);
  const hours = (widget.hours || []).slice(0, 24);
  const mode = widget.mode || "all";
  const exts = (widget.extremes || []) as TideExtreme[];
  const basePanels: Array<"tides" | "wind" | "weather"> = mode === "all" ? ["tides", "wind", "weather"] : [mode as "tides" | "wind" | "weather"];
  // Récapitulatif marées en fin d'étape (≥ 3 s) dès qu'il reste assez de place.
  const wantRecap = (mode === "all" || mode === "tides") && exts.length >= 2 && duration >= 180;
  const recapFrames = wantRecap ? Math.min(180, Math.max(90, Math.round(duration * 0.3))) : 0;
  const panelsFrames = Math.max(30, duration - recapFrames);
  const per = Math.max(Math.floor(panelsFrames / basePanels.length), 20);
  const inRecap = wantRecap && frame >= basePanels.length * per;
  const panelIdx = Math.min(basePanels.length - 1, Math.floor(frame / per));
  const local = inRecap ? frame - basePanels.length * per : frame - panelIdx * per;
  const progress = interpolate(local, [6, Math.max(per - 4, 14)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const kind = basePanels[panelIdx];
  const activeIdx = Math.min(hours.length - 1, Math.floor(progress * hours.length));
  const active = hours[activeIdx];

  // Phase de marée + vitesse instantanée (cm/min) à l'heure affichée.
  const phase = tidePhaseAt(exts, active?.hour);
  const nextSea = hours[Math.min(hours.length - 1, activeIdx + 1)]?.sea;
  const cmPerMin =
    active?.sea != null && nextSea != null ? ((nextSea - active.sea) * 100) / 60 : null;
  const slack = cmPerMin != null && Math.abs(cmPerMin) < 0.2;

  const cfg = kind === "tides"
    ? { kicker: "Marées", values: hours.map((h) => Number(h.sea ?? 0)), unit: "Hauteur d'eau sur 24 h (m)", accent: COLORS.tide }
    : kind === "wind"
      ? { kicker: "Vents", values: hours.map((h) => Number(h.wind ?? 0)), unit: "Vent sur 24 h (km/h)", accent: COLORS.wind }
      : { kicker: "Météo", values: hours.map((h) => Number(h.temp ?? 0)), unit: "Températures sur 24 h (°C)", accent: COLORS.gold };

  const headStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: portrait ? "column" : "row",
    alignItems: portrait ? "flex-start" : "center",
    gap: px(portrait ? 8 : 22),
    marginBottom: px(16),
    fontFamily: body,
  };

  return (
    <AbsoluteFill style={{ alignItems: "center", padding: gutter, ...textPositionStyle(textPosition) }}>
      <WidgetShell
        kicker={inRecap ? `Marées · Récapitulatif · ${widget.city}` : `Marées, Vents & Météo · ${cfg.kicker}`}
        title={widget.text}
        opacity={o}
      >
        {inRecap ? (
          <TidesRecapPanel widget={widget} local={local} duration={recapFrames} />
        ) : (
          <>
            <div style={headStyle}>
              {kind === "tides" ? (
                <>
                  {/* Icône Vague + heure en gros doré sur la même ligne */}
                  <div style={{ display: "flex", alignItems: "center", gap: px(16) }}>
                    <div style={{ fontSize: px(64) }}>🌊</div>
                    <div style={{ fontSize: px(portrait ? 58 : 66), color: COLORS.gold, fontWeight: 700, lineHeight: 1 }}>
                      {active?.hour ?? "--:--"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: px(52), color: COLORS.cream, fontWeight: 700, lineHeight: 1.05 }}>
                      {active?.sea != null ? `${active.sea.toFixed(2)} m` : "--"}
                    </div>
                    <div style={{ fontSize: px(20), color: COLORS.gold }}>
                      {slack
                        ? "Étale · le niveau ne change plus"
                        : phase
                          ? `${phase.phase}ᵉ heure-marée · ${phase.rising ? "monte" : "descend"}${cmPerMin != null ? ` ${Math.abs(cmPerMin).toFixed(1)} cm/min` : ""}`
                          : (exts.map((e) => `${e.type === "high" ? "PM" : "BM"} ${e.hour}`).join("  ·  ") || "")}
                    </div>
                  </div>
                </>
              ) : kind === "wind" ? (
                <>
                  {/* Icône Vent + heure en gros doré sur la même ligne */}
                  <div style={{ display: "flex", alignItems: "center", gap: px(16) }}>
                    <div style={{ fontSize: px(64) }}>💨</div>
                    <div style={{ fontSize: px(portrait ? 58 : 66), color: COLORS.gold, fontWeight: 700, lineHeight: 1 }}>
                      {active?.hour ?? "--:--"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: px(52), color: COLORS.cream, fontWeight: 700, lineHeight: 1.05 }}>{active?.wind != null ? `${active.wind} km/h` : "--"}</div>
                    <div style={{ fontSize: px(20), color: COLORS.gold }}>
                      {active ? `rafales ${active.gust ?? "--"} km/h · ${active.dir ?? "--"}°` : ""}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Icône Météo + heure en gros doré sur la même ligne */}
                  <div style={{ display: "flex", alignItems: "center", gap: px(16) }}>
                    <div style={{ fontSize: px(64) }}>{wmoIcon(active?.code)}</div>
                    <div style={{ fontSize: px(portrait ? 58 : 66), color: COLORS.gold, fontWeight: 700, lineHeight: 1 }}>
                      {active?.hour ?? "--:--"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: px(52), color: COLORS.cream, fontWeight: 700, lineHeight: 1.05 }}>{active?.temp != null ? `${active.temp}°` : "--"}</div>
                    <div style={{ fontSize: px(20), color: COLORS.gold }}>
                      {active ? `pluie ${active.pop ?? 0}%` : ""}
                    </div>
                  </div>
                </>
              )}
            </div>

            <HourStrip
              labels={hours.map((h) => h.hour)}
              values={cfg.values}
              unit={cfg.unit}
              progress={progress}
              accent={cfg.accent}
            />
          </>
        )}
      </WidgetShell>
    </AbsoluteFill>
  );
};


const SceneMap: React.FC<{ lat: number; lng: number; name: string; address?: string | null; textPosition?: TextPosition }> = ({ lat, lng, name, address, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const { h, contentW, gutter, px } = useLayout();
  const labelO = ease(frame, 0, 18);
  const mapO = ease(frame, 10, 30);
  // Google Maps Static via edge proxy (clé stockée côté serveur)
  const mapUrl = `https://plnphgdrawpsnumnejzc.supabase.co/functions/v1/static-map?lat=${lat}&lng=${lng}&zoom=16&size=640x640&scale=2&maptype=roadmap`;
  const pinScale = spring({ frame: frame - 28, fps: 30, config: sp(10, 180) });
  // Carré adapté au canvas : jamais plus large que le contenu ni plus haut que 55 % du canvas.
  const mapSize = Math.min(contentW, Math.round(h * 0.55), px(620));
  return (
    <AbsoluteFill style={{ alignItems: "center", padding: gutter, ...textPositionStyle(textPosition) }}>
      <div style={{ opacity: labelO, marginTop: px(30), fontFamily: body, color: COLORS.gold, fontSize: px(22), letterSpacing: px(6), textTransform: "uppercase" }}>
        Localisation
      </div>
      <div
        style={{
          opacity: mapO,
          marginTop: px(30),
          width: mapSize,
          height: mapSize,
          borderRadius: px(24),
          overflow: "hidden",
          position: "relative",
          border: `2px solid ${COLORS.gold}`,
          boxShadow: shadowOn(18, 60, "black", 0.6),
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
            fontSize: px(80),
            filter: `drop-shadow(${shadowOn(4, 12, "black", 0.6)})`,
          }}
        >
          📍
        </div>
      </div>
      <div style={{ opacity: mapO, marginTop: px(24), fontFamily: display, fontWeight: 700, color: COLORS.cream, fontSize: px(32), textAlign: "center" }}>
        {name}
      </div>
      {address && (
        <div style={{ opacity: mapO, marginTop: px(8), fontFamily: body, color: COLORS.gold, fontSize: px(22), textAlign: "center" }}>
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
  /** Distance Master → lieu, en mètres (calculée côté serveur). */
  distance_m?: number | null;
  /** Cap Master → lieu, en degrés (0 = nord). */
  bearing_deg?: number | null;
  master_latitude?: number | null;
  master_longitude?: number | null;
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
            <PlaceShot url={url} isVideo={isVid} duration={dur} name={pl.name} place={pl} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Plan d'un lieu lié : média plein cadre dominant (pas d'accroche), distance en
 * mètres depuis le Master et mini-carte avec flèche directionnelle (charte 1WM).
 */
const PlaceShot: React.FC<{ url: string; isVideo: boolean; duration: number; name: string; place?: PlaceItem }> = ({
  url,
  isVideo,
  duration,
  name,
  place,
}) => {
  const frame = useCurrentFrame();
  const o = ease(frame, 0, 14);
  const p = duration > 0 ? Math.max(0, Math.min(1, frame / duration)) : 0;
  const scale = 1.04 + p * 0.06;

  const dist = place?.distance_m ?? null;
  const distLabel = dist == null
    ? null
    : dist < 1000
      ? `${dist} m`
      : `${(dist / 1000).toFixed(dist < 10000 ? 1 : 0).replace(".", ",")} km`;
  const bearing = place?.bearing_deg ?? null;
  const mLat = place?.master_latitude ?? null;
  const mLng = place?.master_longitude ?? null;
  const pLat = place?.latitude ?? null;
  const pLng = place?.longitude ?? null;
  const mapUrl = mLat != null && mLng != null && pLat != null && pLng != null
    ? `https://plnphgdrawpsnumnejzc.supabase.co/functions/v1/static-map?lat=${mLat}&lng=${mLng}&lat2=${pLat}&lng2=${pLng}&size=480x480&scale=2&maptype=roadmap`
    : null;

  const cardIn = ease(frame, 12, 34);
  const arrowPulse = 1 + Math.sin((frame / 30) * Math.PI) * 0.06;

  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity: o }}>
      {isVideo ? (
        <StartVideo src={url} />
      ) : (
        <Img src={url} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }} />
      )}
      {/* Voile léger : le média reste dominant. */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg,${alpha("night", 0.08)} 0%,${alpha("night", 0.10)} 55%,${alpha("night", 0.52)} 100%)` }} />

      <AbsoluteFill style={{ justifyContent: "flex-end", padding: 64, pointerEvents: "none" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
          <div>
            <div
              style={{
                display: "inline-block",
                fontFamily: body,
                fontSize: 22,
                color: COLORS.gold,
                background: alpha("night", 0.55),
                border: `1px solid ${COLORS.gold}`,
                borderRadius: 999,
                padding: "8px 18px",
                opacity: ease(frame, 6, 22),
              }}
            >
              📍 {name}
            </div>
            {distLabel && (
              <div
                style={{
                  marginTop: 14,
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 56,
                  lineHeight: 1,
                  color: COLORS.cream,
                  textShadow: shadowOn(6, 24, "black", 0.65),
                  opacity: cardIn,
                  transform: `translateY(${interpolate(cardIn, [0, 1], [16, 0])}px)`,
                }}
              >
                {distLabel}
                <span style={{ fontFamily: body, fontSize: 22, fontWeight: 400, color: COLORS.gold, marginLeft: 12 }}>
                  à vol d'oiseau
                </span>
              </div>
            )}
          </div>

          {mapUrl && (
            <div
              style={{
                position: "relative",
                width: 300,
                height: 300,
                borderRadius: 24,
                overflow: "hidden",
                border: `2px solid ${COLORS.gold}`,
                boxShadow: shadowOn(18, 50, "black", 0.55),
                opacity: cardIn,
                transform: `translateY(${interpolate(cardIn, [0, 1], [24, 0])}px)`,
              }}
            >
              <Img src={mapUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {bearing != null && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: 999,
                      background: alpha("night", 0.55),
                      border: `2px solid ${COLORS.gold}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: `scale(${arrowPulse})`,
                    }}
                  >
                    <svg width="46" height="46" viewBox="0 0 24 24" style={{ transform: `rotate(${bearing}deg)` }}>
                      <path d="M12 2 L19 20 L12 16 L5 20 Z" fill={COLORS.terracotta} stroke={COLORS.gold} strokeWidth="1.2" />
                    </svg>
                  </div>
                </div>
              )}
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
                background: alpha("night", 0.6),
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
            boxShadow: shadowOn(24, 70, "black", 0.65),
            background: COLORS.white,
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
  const pinScale = spring({ frame: frame - Math.round(duration * 0.45), fps: 30, config: sp(10, 180) });

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
          boxShadow: shadowOn(18, 60, "black", 0.6),
          position: "relative",
          background: COLORS.black,
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
                filter: `drop-shadow(${shadowOn(4, 12, "black", 0.6)})`,
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
    color: COLORS.white,
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
        background: `linear-gradient(90deg,${alpha("white", 0)} 0%,${alpha("white", 0.45)} 50%,${alpha("white", 0)} 100%)`,
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
          background: COLORS.nearBlack,
          padding: 14,
          position: "relative",
          boxShadow: shadowOn(24, 80, "black", 0.7),
        }}
      >
        {/* Phase 1 — fiche réelle (screenshot live) sinon mockup reconstruit */}
        <AbsoluteFill style={{ opacity: phase1O, padding: 14 }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 36, overflow: "hidden", background: COLORS.shadowDeep, display: "flex", flexDirection: "column" }}>
            {ficheScreenshotUrl ? (
              <Img src={ficheScreenshotUrl} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", background: COLORS.shadowDeep }} />
            ) : (
              <>
                <div style={{ position: "relative", width: "100%", height: 360, background: COLORS.nightWarm }}>
                  {heroImage ? (
                    <Img src={heroImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg,${COLORS.emberLight},${COLORS.emberDark})` }} />
                  )}
                  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg,${alpha("black", 0.0)} 50%,${alpha("shadowDeep", 0.95)} 100%)` }} />
                  {ratingStr && (
                    <div style={{ position: "absolute", top: 16, right: 16, background: alpha("black", 0.65), color: COLORS.white, fontFamily: body, fontWeight: 700, fontSize: 18, padding: "6px 12px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: COLORS.gold }}>★</span> {ratingStr}{reviewsCount ? ` (${reviewsCount})` : ""}
                    </div>
                  )}
                </div>
                <div style={{ padding: "22px 24px", color: COLORS.white, flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ fontFamily: display, fontWeight: 800, fontSize: 30, lineHeight: 1.1 }}>{name}</div>
                  {city && (
                    <div style={{ fontFamily: body, color: COLORS.gold, fontSize: 16, letterSpacing: 1.5, textTransform: "uppercase" }}>
                      📍 {city}
                    </div>
                  )}
                  {teaser && (
                    <div style={{ fontFamily: body, fontStyle: "italic", color: alpha("white", 0.85), fontSize: 17, lineHeight: 1.4 }}>
                      « {teaser} »
                    </div>
                  )}
                  <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ ...ctaBase, background: COLORS.terracotta }}>
                      {L.viewFullPage}
                      {shimmerEl}
                    </div>
                    <div style={{ ...ctaBase, background: COLORS.nightWarm, border: `1px solid ${alpha("gold", 0.4)}`, fontWeight: 600, fontSize: 14 }}>
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
          <div style={{ width: "100%", height: "100%", borderRadius: 36, background: COLORS.night, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 36 }}>
            <div style={{ fontFamily: display, fontWeight: 800, color: COLORS.white, fontSize: 30, textAlign: "center", marginBottom: 22 }}>{name}</div>
            <div style={{ background: COLORS.white, padding: 18, borderRadius: 22, boxShadow: shadowOn(12, 40, "gold", 0.25) }}>
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
        <StartVideo src={src} />
      ) : (
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      <AbsoluteFill
        style={{ background: `linear-gradient(180deg,${alpha("black", 0.02)} 40%,${alpha("night", 0.55)} 100%)` }}
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
        <StartVideo src={url} />
      ) : (
        <Img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      <AbsoluteFill style={{ background: alpha("night", 0.46) }} />
    </AbsoluteFill>
  );
};

// Effets de mouvement explicites (menu déroulant « Effet » du Studio).
export type MotionEffect = "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "pan_down" | "pan_up" | "scroll_v";

const motionTransform = (m: MotionEffect, p: number): { transform: string; style?: React.CSSProperties } => {
  switch (m) {
    case "zoom_in":
      return { transform: `scale(${1.04 + p * 0.16})` };
    case "zoom_out":
      return { transform: `scale(${1.22 - p * 0.16})` };
    case "pan_left":
      return { transform: `scale(1.16) translateX(${(0.5 - p) * 8}%)` };
    case "pan_right":
      return { transform: `scale(1.16) translateX(${(p - 0.5) * 8}%)` };
    case "pan_down":
      return { transform: `scale(1.16) translateY(${(p - 0.5) * 8}%)` };
    case "pan_up":
      return { transform: `scale(1.16) translateY(${(0.5 - p) * 8}%)` };
    case "scroll_v":
      // défilé vertical : l'image entière défile du haut vers le bas du cadre
      return {
        transform: `translateY(${-p * 50}%)`,
        style: { height: "auto", minHeight: "200%", objectFit: "cover", objectPosition: "top" },
      };
    default:
      return { transform: "scale(1.04)" };
  }
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
  extraStartSec?: number;
  /** Effet de mouvement explicite (prioritaire sur `effect`) pour les images fixes */
  motion?: MotionEffect | null;
}> = ({ src, image, duration, effect, veil = alpha("night", 0.46), extraStartSec = 0, motion = null }) => {
  const frame = useCurrentFrame();
  const tone = useTone();
  const suppressBg = useSuppressBg();
  const url = src || image;
  if (suppressBg || !url) return null;
  const isVid = isVideoSrc(url);
  const p = duration > 0 ? Math.max(0, Math.min(1, frame / duration)) : 0;
  let transform = "scale(1.02)";
  let imgStyle: React.CSSProperties = {};
  if (!isVid && motion) {
    const m = motionTransform(motion, p);
    transform = m.transform;
    imgStyle = m.style ?? {};
  } else if (!isVid) {
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
        <ChainedVideo src={url} duration={duration} extraStartSec={extraStartSec} />

      ) : (
        <Img src={url} style={{ width: "100%", height: "100%", objectFit: "cover", transform, ...imgStyle }} />
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
      <AbsoluteFill style={{ background: `linear-gradient(180deg,${alpha("night", 0.34)} 0%,${alpha("night", 0.56)} 100%)` }} />
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
  const s = spring({ frame, fps: 30, config: sp(18, 120) });
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
        <AbsoluteFill style={{ background: `linear-gradient(180deg,${alpha("black", 0.35)} 0%,${alpha("black", 0.55)} 100%)` }} />
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
            filter: `drop-shadow(${shadowOn(8, 32, "black", 0.55)})`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const ScenePopup: React.FC<{ imageUrl: string; title?: string | null; description?: string | null; descriptionHtml?: string | null; durationFrames: number; textPosition?: TextPosition }> = ({ imageUrl, title, description, descriptionHtml, durationFrames, textPosition = "middle" }) => {
  const frame = useCurrentFrame();
  const inO = ease(frame, 0, 16);
  const out = 1 - ease(frame, durationFrames - 14, durationFrames);
  const desc = decodeEntities((description || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  const richDesc = sanitizeRich(descriptionHtml || "");
  const hasRich = /<(b|strong|i|em|u|ul|ol|li|p|br|h1|h2|h3|h4)\b/i.test(richDesc);
  return (
    <AbsoluteFill style={{ opacity: Math.min(inO, out) }}>
      <style>{RICH_CSS}</style>
      <KenBurns src={imageUrl} from={0} duration={durationFrames} />
      <AbsoluteFill style={{ background: `linear-gradient(180deg,${alpha("black", 0.15)} 0%,${alpha("black", 0.7)} 100%)` }} />
      <AbsoluteFill style={{ padding: 60, ...textPositionStyle(textPosition) }}>
        <FitColumn>
        {title && (
          <div style={{ fontFamily: display, fontWeight: 800, color: COLORS.cream, fontSize: 54, lineHeight: 1.1, textShadow: shadowOn(4, 20, "black", 0.7), textAlign: "center" }}>
            {decodeEntities(title)}
          </div>
        )}
        {hasRich ? (
          <RichBlock
            html={richDesc}
            style={{ marginTop: 18, fontFamily: body, color: alpha("white", 0.94), fontSize: 26, lineHeight: 1.35, textShadow: shadowOn(2, 10, "black", 0.6), maxWidth: 640, alignSelf: "center" }}
          />
        ) : desc ? (
          <div style={{ marginTop: 18, fontFamily: body, color: alpha("white", 0.94), fontSize: 26, lineHeight: 1.35, textAlign: "center", textShadow: shadowOn(2, 10, "black", 0.6), maxWidth: 640 }}>
            {desc}
          </div>
        ) : null}
        </FitColumn>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Décode les entités HTML (&amp;, &#39;, &eacute;…) sans DOM (rendu Remotion headless). */
const decodeEntities = (input: string): string => {
  const named: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»",
    eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", acirc: "â", ccedil: "ç",
    ugrave: "ù", ucirc: "û", icirc: "î", iuml: "ï", ocirc: "ô", euml: "ë", uuml: "ü",
    hellip: "…", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", ndash: "–", mdash: "—",
    deg: "°", euro: "€", middot: "·", times: "×", copy: "©", reg: "®", trade: "™",
  };
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => named[String(n).toLowerCase()] ?? m);
};

const ALLOWED_RICH_TAGS = ["b", "strong", "i", "em", "u", "br", "p", "ul", "ol", "li", "span", "h1", "h2", "h3", "h4"];

/** Conserve la mise en forme rich text (gras, italique, listes) et retire tout le reste. */
const sanitizeRich = (html: string): string =>
  decodeEntities(
    (html || "")
      .replace(/<\s*(script|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
      .replace(/<\s*\/?\s*([a-z0-9]+)[^>]*>/gi, (m, tag) =>
        ALLOWED_RICH_TAGS.includes(String(tag).toLowerCase()) ? m.replace(/\s+[^<>]*?(?=>)/, "") : " ",
      ),
  )
    .replace(/[ \t]{2,}/g, " ")
    .trim();

/** Rend un contenu rich text (gras/italique/puces) dans une scène vidéo. */
const RichBlock: React.FC<{ html: string; style?: React.CSSProperties; align?: "left" | "center" }> = ({ html, style, align = "center" }) => (
  <div
    style={{ ...style, textAlign: align }}
    className="rich-video-block"
    dangerouslySetInnerHTML={{ __html: html }}
  />
);

const RICH_CSS = `
.rich-video-block p { margin: 0 0 0.5em; }
.rich-video-block p:last-child { margin-bottom: 0; }
.rich-video-block strong, .rich-video-block b { font-weight: 800; }
.rich-video-block em, .rich-video-block i { font-style: italic; }
/* Titres H2 / H3 accentués : doré, gras, léger interlettrage — sans césure
   artificielle (un titre court reste sur une seule ligne). */
.rich-video-block h1, .rich-video-block h2, .rich-video-block h3, .rich-video-block h4 {
  margin: 0.55em 0 0.28em;
  font-weight: 800;
  line-height: 1.14;
  text-wrap: balance;
  overflow-wrap: normal;
  word-break: keep-all;
  hyphens: none;
}
.rich-video-block h1, .rich-video-block h2 {
  font-size: 1.34em;
  color: ${COLORS.gold};
  letter-spacing: 0.6px;
  text-shadow: ${shadowOn(3, 16, "black", 0.7)};
}
.rich-video-block h3, .rich-video-block h4 {
  font-size: 1.14em;
  color: ${COLORS.bone};
  letter-spacing: 0.4px;
  text-shadow: ${shadowOn(2, 12, "black", 0.65)};
}
.rich-video-block h1:first-child, .rich-video-block h2:first-child,
.rich-video-block h3:first-child, .rich-video-block h4:first-child { margin-top: 0; }
.rich-video-block h2 + p, .rich-video-block h3 + p { margin-top: 0; }
.rich-video-block ul, .rich-video-block ol { margin: 0.2em 0 0; padding-left: 1.1em; text-align: left; display: inline-block; }
.rich-video-block li { margin: 0.18em 0; }
.rich-video-block ul { list-style: none; padding-left: 0; }
/* Le texte de la puce reste sur la même ligne que le symbole : on neutralise
   les blocs et les sauts de ligne en tête de <li>. */
.rich-video-block li > p, .rich-video-block li > div, .rich-video-block li > span { display: inline; margin: 0; }
.rich-video-block li > br:first-child { display: none; }
.rich-video-block ul > li { display: block; }
.rich-video-block ul > li::before { content: "◆ "; color: ${COLORS.gold}; white-space: pre; }
`;



const SceneHighlight: React.FC<{ data: NonNullable<ShowcaseProps["highlights"]>[number]; background?: string | null; backgroundIsVideo?: boolean; durationFrames: number; textPosition?: TextPosition; effect?: TransitionEffect; motion?: MotionEffect | null }> = ({ data, background, backgroundIsVideo, durationFrames, textPosition = "middle", effect = "kenburns", motion = null }) => {
  const frame = useCurrentFrame();
  const inO = ease(frame, 0, 16);
  const out = 1 - ease(frame, durationFrames - 14, durationFrames);
  const titleY = interpolate(spring({ frame: frame - 6, fps: 30, config: sp(18) }), [0, 1], [30, 0]);
  const heroImg = data.image_url || background || undefined;
  const isVideoHero = !!(backgroundIsVideo && background === heroImg);
  const richDesc = sanitizeRich(data.description_html || data.description || "");
  const plainDesc = decodeEntities((data.description || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  const hasRich = /<(b|strong|i|em|u|ul|ol|li|p|br|h1|h2|h3|h4)\b/i.test(richDesc);
  return (
    <AbsoluteFill style={{ opacity: Math.min(inO, out) }}>
      <style>{RICH_CSS}</style>
      {heroImg && (isVideoHero
        ? <VideoCover src={heroImg} from={0} duration={durationFrames} />
        : (motion
            ? <MotionBackdrop image={heroImg} duration={durationFrames} effect={effect} motion={motion} veil={alpha("black", 0)} />
            : <KenBurns src={heroImg} from={0} duration={durationFrames} />))}
      <AbsoluteFill style={{ background: `linear-gradient(180deg,${alpha("black", 0.4)} 0%,${alpha("black", 0.75)} 100%)` }} />
      <AbsoluteFill style={{ padding: 60, ...textPositionStyle(textPosition) }}>
        <FitColumn>
        {!data.title && (
          <div style={{ fontFamily: body, color: COLORS.gold, fontSize: 20, letterSpacing: 6, textTransform: "uppercase", textAlign: "center" }}>
            Signature
          </div>
        )}
        {data.title && (
          <div style={{ marginTop: 14, transform: `translateY(${titleY}px)`, fontFamily: display, fontWeight: 800, color: COLORS.cream, fontSize: 56, lineHeight: 1.1, textAlign: "center", textShadow: shadowOn(4, 20, "black", 0.7) }}>
            {decodeEntities(data.title)}
          </div>
        )}
        {(hasRich ? richDesc : plainDesc) && (
          hasRich ? (
            <RichBlock
              html={richDesc}
              style={{ marginTop: 20, fontFamily: body, color: alpha("white", 0.94), fontSize: 26, lineHeight: 1.4, textShadow: shadowOn(2, 10, "black", 0.6), maxWidth: 640, alignSelf: "center" }}
            />
          ) : (
            <div style={{ marginTop: 20, fontFamily: body, color: alpha("white", 0.94), fontSize: 26, lineHeight: 1.4, textAlign: "center", textShadow: shadowOn(2, 10, "black", 0.6), maxWidth: 620 }}>
              {plainDesc.slice(0, 280)}
            </div>
          )
        )}
        {(data.metric_title || data.metric_value) && (
          <div style={{ marginTop: 28, padding: "14px 26px", border: `1px solid ${COLORS.gold}`, borderRadius: 14, fontFamily: display, color: COLORS.gold, fontSize: 28, textAlign: "center", background: alpha("gold", 0.08) }}>
            {[data.metric_value, data.metric_title].filter(Boolean).map((v) => decodeEntities(String(v))).join(" · ")}
          </div>
        )}
        </FitColumn>
      </AbsoluteFill>

    </AbsoluteFill>
  );
};


const PLATFORM_META: Record<"google_review" | "tripadvisor" | "restaurant_guru", { label: string; brand: string; accent: string; logo: string }> = {
  google_review:   { label: "Google",          brand: COLORS.google, accent: COLORS.googleAccent, logo: "brands/google-logo.png" },
  tripadvisor:     { label: "TripAdvisor",     brand: COLORS.tripadvisor, accent: COLORS.tripadvisorAccent, logo: "brands/logo_tripadvisor.webp" },
  restaurant_guru: { label: "Restaurant Guru", brand: COLORS.restaurantGuru, accent: COLORS.tripadvisorAccent, logo: "brands/logo_restaurant_guru.webp" },
};

/** Logo géant en filigrane qui déborde du cadre + dérive lente : signature visuelle des séquences de marque */
const BrandBleedLogo: React.FC<{ src: string; color: string; durationFrames: number; side?: "left" | "right" }> = ({ src, color, durationFrames, side = "left" }) => {
  const frame = useCurrentFrame();
  const enter = spring({ frame, fps: 30, config: sp(22, 90) });
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

const SceneInfoText: React.FC<{
  label?: string;
  title?: string;
  text?: string;
  /** Version rich text du texte (gras/italique/puces) — prioritaire si présente */
  textHtml?: string | null;
  logoUrl?: string | null;
  durationFrames: number;
  textPosition?: TextPosition;
  /** Habillage décoratif animé (cartes « Menus » sans contenu texte) */
  ornament?: boolean;
  /** Intensité du voile sombre au-dessus du média de fond */
  dim?: "normal" | "light";
  /** Mise en page « carte manuelle » : pleine largeur du viewport + mêmes tailles Titre/Texte */
  wide?: boolean;
}> = ({ label, title, text, textHtml, logoUrl, durationFrames, textPosition = "middle", ornament = false, dim = "normal", wide = false }) => {

  const frame = useCurrentFrame();
  const inO = ease(frame, 0, 16);
  const out = 1 - ease(frame, durationFrames - 14, durationFrames);
  const titleY = interpolate(spring({ frame: frame - 6, fps: 30, config: sp(18) }), [0, 1], [30, 0]);
  const logoS = interpolate(spring({ frame: frame - 2, fps: 30, config: sp(14, 160) }), [0, 1], [0.6, 1]);
  const clean = (v?: string) => decodeEntities((v || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  const richText = sanitizeRich(textHtml || "");
  const hasRich = /<(b|strong|i|em|u|ul|ol|li|p|br|h1|h2|h3|h4)\b/i.test(richText);
  const safeLogo = typeof logoUrl === "string" && logoUrl.trim().startsWith("http") ? logoUrl : null;
  const titleSize = wide ? 68 : 52;
  const titleLh = wide ? 1.1 : 1.12;
  const textSize = wide ? 34 : 26;
  const textLh = wide ? 1.3 : 1.42;
  const textMaxWidth = wide ? undefined : 620;
  const richMaxWidth = wide ? undefined : 640;
  const textMarginTop = wide ? 44 : 20;
  return (
    <AbsoluteFill style={{ opacity: Math.min(inO, out) }}>
      <style>{RICH_CSS}</style>
      <AbsoluteFill
        style={{
          background: dim === "light"
            ? `linear-gradient(180deg,${alpha("black", 0.12)} 0%,${alpha("black", 0.42)} 100%)`
            : `linear-gradient(180deg,${alpha("black", 0.42)} 0%,${alpha("black", 0.78)} 100%)`,
        }}
      />
      <AbsoluteFill style={{ padding: wide ? "80px 60px" : 60, ...textPositionStyle(textPosition) }}>
        {/* 20% haut du viewport laissés libres quand le texte est trop volumineux */}
        <FitColumn topSafeRatio={0.2}>
        {safeLogo && (

          <div style={{ alignSelf: "center", marginBottom: 18, transform: `scale(${logoS})`, filter: `drop-shadow(${shadowOn(4, 16, "black", 0.5)})` }}>
            <Img src={safeLogo} style={{ width: 120, height: 120, objectFit: "contain", borderRadius: 12, background: alpha("white", 0.08) }} />
          </div>
        )}
        {label && (
          <div style={{ fontFamily: body, color: COLORS.gold, fontSize: 20, letterSpacing: 6, textTransform: "uppercase", textAlign: "center" }}>
            {clean(label).slice(0, 40)}
          </div>
        )}
        {title && (
          <div style={{ marginTop: 14, transform: `translateY(${titleY}px)`, fontFamily: display, fontWeight: 800, color: COLORS.cream, fontSize: titleSize, lineHeight: titleLh, textAlign: "center", textShadow: shadowOn(4, 20, "black", 0.7) }}>
            {clean(title)}
          </div>
        )}
        {hasRich ? (
          <RichBlock
            html={richText}
            style={{ marginTop: textMarginTop, fontFamily: body, color: alpha("white", 0.94), fontSize: textSize, lineHeight: textLh, textShadow: shadowOn(2, 10, "black", 0.6), maxWidth: richMaxWidth, alignSelf: wide ? "stretch" : "center" }}
          />
        ) : text ? (
          <div style={{ marginTop: textMarginTop, fontFamily: body, color: alpha("white", 0.94), fontSize: textSize, lineHeight: textLh, textAlign: "center", textShadow: shadowOn(2, 10, "black", 0.6), maxWidth: textMaxWidth }}>
            {clean(text)}
          </div>

        ) : null}
        {ornament && (
          <div style={{ marginTop: 26, alignSelf: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            {/* filet doré qui se déploie */}
            <div style={{ width: interpolate(ease(frame, 8, 34), [0, 1], [0, 300]), height: 2, background: `linear-gradient(90deg,transparent,${COLORS.gold},transparent)` }} />
            {/* trois pastilles qui pulsent en décalé */}
            <div style={{ display: "flex", gap: 14 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    background: COLORS.gold,
                    opacity: 0.35 + 0.65 * Math.abs(Math.sin((frame - i * 7) / 14)),
                  }}
                />
              ))}
            </div>
            <div style={{ fontFamily: body, color: alpha("white", 0.82), fontSize: 22, letterSpacing: 2, textTransform: "uppercase", textAlign: "center" }}>
              À découvrir sur place
            </div>
          </div>
        )}
        </FitColumn>
      </AbsoluteFill>

    </AbsoluteFill>
  );
};

const ScenePlatformReview: React.FC<{ kind: "google_review" | "tripadvisor" | "restaurant_guru"; rating: number | null; count: number | null; durationFrames: number; textPosition?: TextPosition }> = ({ kind, rating, count, durationFrames, textPosition = "middle" }) => {
  const L = useL();
  const meta = PLATFORM_META[kind];
  const frame = useCurrentFrame();
  const inO = ease(frame, 0, 16);
  const out = 1 - ease(frame, durationFrames - 14, durationFrames);
  const badgeS = spring({ frame: frame - 10, fps: 30, config: sp(12, 140) });
  const chipS = spring({ frame: frame - 4, fps: 30, config: sp(10, 180) });
  const ringPulse = 1 + 0.05 * Math.sin(frame / 9);
  return (
    <AbsoluteFill>
      <BrandBleedLogo src={meta.logo} color={meta.brand} durationFrames={durationFrames} side={kind === "tripadvisor" ? "right" : "left"} />
      <AbsoluteFill style={{ opacity: Math.min(inO, out), padding: 60, ...textPositionStyle(textPosition) }}>
        {/* Pastille logo en avant-plan — Google : transparence intégrale conservée (pas de pastille blanche) */}
        <div
          style={{
            alignSelf: "center",
            width: 132,
            height: 132,
            borderRadius: 66,
            background: kind === "google_review" ? "transparent" : alpha("white", 0.96),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${interpolate(chipS, [0, 1], [0.4, 1]) * ringPulse}) rotate(${interpolate(chipS, [0, 1], [-25, 0])}deg)`,
            boxShadow: kind === "google_review" ? "none" : `0 0 0 6px ${meta.brand}, 0 18px 60px ${meta.brand}66`,
            filter: kind === "google_review" ? `drop-shadow(0 10px 34px ${meta.brand}88)` : undefined,
            marginBottom: -34,
            zIndex: 2,
            overflow: kind === "google_review" ? "visible" : "hidden",
          }}
        >
          <Img src={staticFile(meta.logo)} style={{ width: 132, height: 132, objectFit: kind === "google_review" ? "contain" : "cover" }} />
        </div>

        <div style={{ marginTop: 24, alignSelf: "center", transform: `scale(${interpolate(badgeS, [0, 1], [0.85, 1])})`, padding: "48px 46px 30px", background: alpha("night", 0.72), border: `2px solid ${meta.brand}`, borderRadius: 26, textAlign: "center", boxShadow: `0 12px 60px ${meta.brand}55` }}>
          <div style={{ fontFamily: body, color: meta.brand, fontSize: 20, letterSpacing: 6, textTransform: "uppercase" }}>
            {L.reviewsOf(meta.label)}
          </div>
          {rating != null && (
            <div style={{ marginTop: 10, fontFamily: display, fontWeight: 800, color: COLORS.cream, fontSize: 100, lineHeight: 1 }}>
              {rating.toFixed(1)}<span style={{ fontSize: 40, color: meta.accent }}>/5</span>
            </div>
          )}
          <div style={{ marginTop: 6, fontFamily: body, fontSize: 32, color: FLASH_YELLOW, textShadow: `0 0 16px ${FLASH_YELLOW}88` }}>
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
  const y = interpolate(spring({ frame: frame - 8, fps: 30, config: sp(18) }), [0, 1], [40, 0]);

  const full = (fullText || "").trim();
  const rawExcerpt = (highlight || "").trim();
  // Découpe avant / extrait / après (recherche insensible à la casse)
  const foundIdx = rawExcerpt && full ? full.toLowerCase().indexOf(rawExcerpt.toLowerCase()) : -1;
  // Un extrait qui n'appartient pas à l'avis est un fragment parasite : on l'ignore.
  const hasExcerpt = foundIdx >= 0 && rawExcerpt.length < full.length;
  const excerpt = hasExcerpt ? rawExcerpt : "";
  const idx = hasExcerpt ? foundIdx : -1;
  const before = idx >= 0 ? full.slice(0, idx) : "";
  const mid = idx >= 0 ? full.slice(idx, idx + excerpt.length) : "";
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
  const size = baseSize;
  // Phase de focus : au lieu de grossir l'extrait *dans* le paragraphe (ce qui
  // reflowe les lignes et provoque un saut visuel), on superpose deux calques
  // dans la même cellule de grille et on fait un fondu croisé fluide :
  //   calque A = avis complet (extrait déjà surligné en jaune)
  //   calque B = extrait isolé, plus grand, centré
  // La hauteur de la carte est celle du plus grand calque → aucun saut.
  const fullOpacity = interpolate(focus, [0, 1], [1, 0]);
  const fullBlur = interpolate(focus, [0, 1], [0, 7]);
  const fullScale = interpolate(focus, [0, 1], [1, 0.96]);
  const isoOpacity = focus;
  const isoScale = interpolate(focus, [0, 1], [0.93, 1]);
  const excerptSize = size;
  const isoSize = reviewFontSize(Math.max(excerpt.length, 1)) * 1.22;
  const cardScale = interpolate(focus, [0, 1], [1, 1.04]);
  // Pulsation du halo jaune (effet flashy)
  const flashPulse = 0.7 + 0.3 * Math.sin(frame / 3.2);

  const platform = platformKeyFromSource(source);
  const meta = platform ? PLATFORM_META[platform] : null;
  const transparentLogo = platform === "google_review";

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
            background: alpha("night", 0.78),
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
                background: transparentLogo ? "transparent" : alpha("white", 0.97),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: transparentLogo ? "visible" : "hidden",
                transform: `scale(${interpolate(spring({ frame: frame - 6, fps: 30, config: sp(11, 160) }), [0, 1], [0.3, 1]) * (1 + 0.04 * Math.sin(frame / 9))}) rotate(${interpolate(spring({ frame: frame - 6, fps: 30, config: sp(11, 160) }), [0, 1], [-30, 0])}deg)`,
                boxShadow: transparentLogo ? "none" : `0 0 0 5px ${meta.brand}, 0 14px 40px ${meta.brand}66`,
                filter: transparentLogo ? `drop-shadow(0 8px 26px ${meta.brand}88)` : undefined,
                zIndex: 3,
              }}
            >
              <Img src={staticFile(meta.logo)} style={{ width: 96, height: 96, objectFit: transparentLogo ? "contain" : "cover" }} />
            </div>
          )}
          <div style={{ fontFamily: display, fontSize: 90, color: meta ? meta.brand : COLORS.gold, lineHeight: 0.7, marginBottom: 12 }}>“</div>
          <div style={{ display: "grid", alignItems: "center", justifyItems: "center" }}>
            <div
              style={{
                gridArea: "1 / 1",
                fontFamily: body,
                color: COLORS.cream,
                fontSize: size,
                lineHeight: 1.45,
                opacity: hasExcerpt ? fullOpacity : 1,
                filter: hasExcerpt ? `blur(${fullBlur}px)` : undefined,
                transform: `scale(${hasExcerpt ? fullScale : 1})`,
                transformOrigin: "center",
              }}
            >
              {hasExcerpt ? (
                <>
                  {before && <span>{before}</span>}
                  <span
                    style={{
                      // Pas de rectangle derrière l'extrait : le texte lui-même
                      // passe du crème au jaune vif avec un halo flashy.
                      color: interpolateColors(swipe, [0, 1], [COLORS.cream, FLASH_YELLOW]),
                      fontWeight: 800,
                      fontSize: excerptSize,
                      lineHeight: 1.32,
                      textShadow: `0 2px 8px ${alpha("black", 0.8)}, 0 0 ${8 + 26 * swipe * flashPulse}px ${FLASH_YELLOW}${swipe > 0 ? "CC" : "00"}, 0 0 ${18 + 46 * swipe * flashPulse}px ${FLASH_YELLOW}${swipe > 0 ? "77" : "00"}`,
                    }}
                  >
                    {mid}
                  </span>
                  {after && <span>{after}</span>}
                </>
              ) : (
                displayText
              )}
            </div>

            {hasExcerpt && (
              <div
                style={{
                  gridArea: "1 / 1",
                  fontFamily: body,
                  fontWeight: 800,
                  color: FLASH_YELLOW,
                  fontSize: isoSize,
                  lineHeight: 1.32,
                  opacity: isoOpacity,
                  transform: `scale(${isoScale})`,
                  transformOrigin: "center",
                  textShadow: `0 2px 8px ${alpha("black", 0.85)}, 0 0 ${20 + 26 * flashPulse}px ${FLASH_YELLOW}CC, 0 0 ${40 + 46 * flashPulse}px ${FLASH_YELLOW}66`,
                }}
              >
                {mid}
              </div>
            )}
          </div>

          {rating != null && Number.isFinite(rating) && (
            <div style={{ marginTop: 20, fontFamily: body, color: FLASH_YELLOW, fontSize: 30, textShadow: `0 0 ${10 + 14 * flashPulse}px ${FLASH_YELLOW}99` }}>
              {"★★★★★".slice(0, Math.round(rating))}<span style={{ opacity: 0.3 }}>{"★★★★★".slice(Math.round(rating))}</span>
            </div>
          )}
          {author && (
            <div style={{ marginTop: 16, fontFamily: body, color: alpha("white", 0.7), fontSize: 24, letterSpacing: 2, textTransform: "uppercase" }}>
              — {author}{meta ? ` · ${meta.label}` : ""}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};


const SceneWhatsapp: React.FC<{ number: string; durationFrames: number; textPosition?: TextPosition; lines?: string[] }> = ({ number, durationFrames, textPosition = "middle", lines }) => {
  const L = useL();
  const frame = useCurrentFrame();
  const inO = ease(frame, 0, 16);
  const out = 1 - ease(frame, durationFrames - 14, durationFrames);
  const pop = spring({ frame: frame - 4, fps: 30, config: sp(9, 190) });
  const pulse = 1 + 0.05 * Math.sin(frame / 8);
  // Onde radar qui part du logo
  const wave = (frame % 40) / 40;
  return (
    <AbsoluteFill>
      <BrandBleedLogo src="brands/logo_whatsapp.webp" color={COLORS.whatsapp} durationFrames={durationFrames} side="right" />
      <AbsoluteFill style={{ opacity: Math.min(inO, out), padding: 60, ...textPositionStyle(textPosition), alignItems: "center" }}>
        <div style={{ position: "relative", width: 200, height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              position: "absolute",
              width: 180,
              height: 180,
              borderRadius: 999,
              border: `3px solid ${COLORS.whatsapp}`,
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
              boxShadow: shadowOn(18, 60, "whatsapp", 0.55),
            }}
          >
            <Img src={staticFile("brands/logo_whatsapp.webp")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>
        <div style={{ marginTop: 24, fontFamily: display, fontWeight: 800, color: COLORS.cream, fontSize: 44, letterSpacing: 1, textAlign: "center", textShadow: shadowOn(4, 16, "black", 0.6) }}>
          {number}
        </div>
        <div style={{ marginTop: 14, fontFamily: body, color: COLORS.whatsapp, fontSize: 26, letterSpacing: 4, textTransform: "uppercase" }}>
          {L.whatsappDirect}
        </div>
        {Array.isArray(lines) && lines.length > 0 && (
          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", maxWidth: 820 }}>
            {lines.slice(0, 6).map((t, i) => {
              const a = ease(frame, 10 + i * 5, 26 + i * 5);
              return (
                <div
                  key={`wa-line-${i}`}
                  style={{
                    fontFamily: body,
                    color: COLORS.cream,
                    fontSize: 30,
                    textAlign: "center",
                    opacity: a,
                    transform: `translateY(${interpolate(a, [0, 1], [14, 0])}px)`,
                    textShadow: shadowOn(3, 14, "black", 0.6),
                  }}
                >
                  {t}
                </div>
              );
            })}
          </div>
        )}
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
  videoStarts,
  videoEnds,
  videoDurations,
  offer = null,
  offers = null,
  aiCard = null,
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
  welcomeText,
  propositionText,
  whatsapp,
  instagramUrl,
  ficheScreenshotUrl,
  showBlogArticles,
  showWeatherWidget,
  weatherWidget,
  showTidesWidget,
  tidesWidget,
  blogMode,
  blogArticles,
  scenePois,
  sceneDestinations,
  placesMediaMode = "videos",
  durationSec,
  useFullHookScene,
  scene_media,
  use_associated_media,
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
  popupDescriptionHtml,
  highlights,
  aiSummaries,
  aiSummaryEffect,
  aiTexts,
  externalLinks,
  menuDocs,
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
  whatsappShowOffer,
  textOverrides,
  textSplits,
  textSegments,
  splitCount,
  continuousBgVideoUrl,
  continuousBgSound,
  continuousBgVideoDurationSec,
  soundtrackUrl,
  transitions,


}) => {
  const _lang: VideoLang = lang === "en" ? "en" : "fr";
  const _L = LABELS[_lang];
  const name = nameProp || _L.defaultName;
  const hook = hookProp || _L.defaultHook;
  const tagline = taglineProp || _L.defaultTagline;
  const continuousMode = typeof continuousBgVideoUrl === "string" && /^https?:\/\//i.test(continuousBgVideoUrl);

  // Contenu de la carte Offre repris dans la scène WhatsApp (option « + contenu de la carte »).
  const whatsappOfferLines = React.useMemo(() => {
    const list: any[] = Array.isArray(offers) && offers.length > 0 ? offers : offer ? [offer] : [];
    const first = list[0];
    if (!first) return [] as string[];
    const head = [first?.title, first?.price].filter(Boolean).map((x: any) => String(x).trim()).join(" · ");
    const body = Array.isArray(first?.lines) ? first.lines.map((l: any) => String(l).trim()).filter(Boolean) : [];
    const digits = (t: string) => t.replace(/\D/g, "");
    const num = digits(String(whatsappNumber ?? ""));
    // Évite de répéter le numéro déjà affiché en grand dans la scène.
    return [head, ...body]
      .filter(Boolean)
      .map((t: string) => (num && digits(t).includes(num) ? t.replace(/[+\d][\d\s().-]{6,}/g, "").replace(/[·|-]\s*$/, "").trim() : t))
      .filter(Boolean) as string[];
  }, [offers, offer, whatsappNumber]);

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
  const assocOff = (k: string) => (use_associated_media as any)?.[k] === false;
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



  /**
   * Quand le montage OUVRE par l'étape Logo (sans média explicitement assigné à
   * cette étape), c'est le logo qui consomme le média n°1 : le vrai début du
   * défilement des médias est donc l'étape Logo. On décale toute la
   * consommation par défaut d'un cran pour éviter de revoir le média n°1 à
   * l'étape suivante.
   */
  const logoOpensMontage =
    !!logoUrl &&
    !(Array.isArray((sm as any)?.logo) && (sm as any).logo.length > 0) &&
    (Array.isArray(scene_order) && scene_order.length > 0
      ? scene_order[0] === "logo"
      : !!openWithLogo);
  const mediaShift = logoOpensMontage && !mixedMode ? 1 : 0;
  const rotateList = <T,>(arr: T[], k: number): T[] => {
    if (!arr.length || !k) return arr;
    const n = k % arr.length;
    return arr.slice(n).concat(arr.slice(0, n));
  };
  const shiftedVideos = rotateList(safeVideos, mediaShift);
  const shiftedImages = rotateList(safeImages, mediaShift);

  const defaultHero = mixedMode ? shiftedImages[0] : (useVideos ? shiftedVideos[0] : shiftedImages[0]);
  const defaultGallery = mixedMode
    ? shiftedVideos
    : (useVideos ? shiftedVideos.slice(1) : shiftedImages.slice(1));
  const defaultGalleryList = defaultGallery.length ? defaultGallery : (useVideos ? shiftedVideos : shiftedImages);
  // Fond par défaut pour les scènes "info" sans média dédié (avis plateformes, WhatsApp…)
  // Les vidéos sont prioritaires pour que le fond animé persiste sur ces étapes.
  const isVideoUrl = (u?: string) => !!u && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);
  /** Répartit une URL de repli sur le bon prop de MotionBackdrop (src vidéo vs image). */
  const fallbackBackdrop = (u?: string) => ({
    src: isVideoUrl(u) ? u : undefined,
    image: isVideoUrl(u) ? undefined : u,
  });

  /**
   * Rotation équitable des médias de repli sur l'ensemble des étapes :
   * chaque étape prend la vidéo suivante dans l'ordre de tri (round-robin sur
   * l'index de l'étape dans le plan), au lieu de retomber systématiquement sur
   * la vidéo n°1. Quand une même vidéo est relue (2e tour, 3e tour…), on décale
   * son point d'entrée pour ne pas revoir le même passage.
   */
  const REPLAY_OFFSET_SEC = 2;
  const bgRotate = (planIdx: number) => {
    const list = safeVideos.length ? safeVideos : safeImages;
    if (!list.length) return { src: undefined, image: undefined, extraStartSec: 0 };
    const i = Math.max(0, planIdx);
    const url = list[i % list.length];
    const pass = Math.floor(i / list.length);
    // Décalage borné : au-delà, startFrom risque de dépasser la durée réelle du
    // clip et la vidéo reste figée sur sa dernière image (effet « pause »).
    const extraStartSec = safeVideos.length ? Math.min(pass, 2) * REPLAY_OFFSET_SEC : 0;
    return { ...fallbackBackdrop(url), extraStartSec };
  };



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
    welcomeText,
    propositionText,
    durationSec,
    scene_order,
    scene_durations,
    custom_scenes,
    showPopup,
    popupImageUrl,
    highlights,
    aiSummaries,
    aiSummaryEffect,
    aiTexts,
    externalLinks,
    menuDocs,
    showGoogleReviews,
    googleReview,
    // Widgets Météo / Marées & blog : indispensables au plan, sinon les étapes
    // sont retirées du montage (et laissent un trou noir en fin de vidéo).
    showWeatherWidget,
    weatherWidget,
    showTidesWidget,
    tidesWidget,
    showBlogArticles,
    blogArticles,
    blogMode,
    freeZone,
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

  const renderScene = (item: ScenePlanItem, planIdx = 0): React.ReactNode => {
    const { kind, customId, duration } = item;
    if (kind === "custom") {
      const c = customId ? customById.get(customId) : undefined;
      if (!c) return null;
      const list = (Array.isArray(c.mediaList) && c.mediaList.length ? c.mediaList : (c.media ? [c.media] : []));
      const align = textPositionStyle(textPosition);
      // Aucun média assigné → même comportement que les autres étapes :
      // repli sur les médias de l'établissement avec effet de mouvement.
      const rot = bgRotate(planIdx);
      const fallbackUrl = rot.src ?? rot.image;
      // `duration` est exprimée en FRAMES (durée de l'étape dans le plan).
      const seg = list.length > 0 ? duration / list.length : duration;
      return (
        <AbsoluteFill>
          {list.length > 0
            ? list.map((m, i) => (
                <Sequence
                  key={`${m.url}-${i}`}
                  from={Math.round(i * seg)}
                  durationInFrames={Math.max(1, Math.round(seg))}
                >
                  {m.kind === "video"
                    ? <VideoCover src={m.url} from={0} duration={Math.max(1, Math.round(seg))} />
                    : <VideoBackdrop image={m.url} />}
                </Sequence>
              ))
            : (
              <AbsoluteFill style={{ backgroundColor: sceneBaseBg }}>
                {fallbackUrl && (
                  <MotionBackdrop
                    src={rot.src}
                    image={rot.image}
                    duration={duration}
                    effect={trImageEffect}
                    extraStartSec={rot.extraStartSec}
                  />
                )}
              </AbsoluteFill>
            )}


          {c.mode === "overlay" && (
            <AbsoluteFill style={{ background: `linear-gradient(180deg, ${alpha("black", 0.32)} 0%, ${alpha("black", 0.18)} 50%, ${alpha("black", 0.45)} 100%)` }} />
          )}
          {(() => {
            const chunks = resolveTextChunks(
              c.subtitle ?? "",
              (textSegments ?? {})[`custom:${c.id}`],
              (textSplits ?? {})[`custom:${c.id}`] ?? (c as any).splitCount ?? splitCount,
            );
            const titleBlock = (
              <div style={{
                color: COLORS.white,
                fontFamily: display,
                fontSize: 68,
                fontWeight: 800,
                lineHeight: 1.1,
                textAlign: "center",
                textShadow: shadowOn(4, 24, "black", 0.55),
              }}>{c.title}</div>
            );
            const textStyle: React.CSSProperties = {
              marginTop: 110,
              color: alpha("white", 0.92),
              fontFamily: body,
              fontSize: 34,
              lineHeight: 1.3,
              textAlign: "center",
              textShadow: shadowOn(2, 12, "black", 0.5),
            };
            if (chunks.length > 1) {
              const segFrames = Math.max(1, Math.floor(duration / chunks.length));
              return (
                <>
                  <AbsoluteFill style={{ display: "flex", flexDirection: "column", padding: "80px 60px", ...align }}>
                    {titleBlock}
                  </AbsoluteFill>
                  {chunks.map((txt, i) => (
                    <Sequence
                      key={`split-${i}`}
                      from={i * segFrames}
                      durationInFrames={i === chunks.length - 1 ? Math.max(1, duration - i * segFrames) : segFrames}
                    >
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
    return renderBuiltinScene(kind as SceneKind, duration, item.offerIndex, planIdx);
  };

  const offersArr: NonNullable<ShowcaseProps["offers"]> = Array.isArray(offers) && offers.length > 0
    ? offers
    : (offer ? [offer] : []);

  const renderBuiltinScene = (kind: SceneKind, duration: number, offerIndex?: number, planIdx = 0): React.ReactNode => {
    switch (kind) {
      case "logo": {
        // Fond de la scène logo : média spécifique si défini, sinon repli sur
        // la 1ère vidéo du montage, puis la 1ère image de l'établissement.
        const logoBgExplicit = Array.isArray((scene_media as any)?.logo) ? (scene_media as any).logo[0] : null;
        const logoBg =
          logoBgExplicit ??
          (bgRotate(planIdx).src ? { url: bgRotate(planIdx).src as string, kind: "video" as const } : null) ??
          (bgRotate(planIdx).image ? { url: bgRotate(planIdx).image as string, kind: "image" as const } : null);
        return (
          <AbsoluteFill style={{ backgroundColor: sceneBaseBg }}>
            <SceneLogo logoUrl={logoUrl!} durationFrames={duration} background={logoBg} />
          </AbsoluteFill>
        );
      }
      case "welcome":
      case "proposition": {
        const txt = (kind === "welcome" ? welcomeText : propositionText) ?? "";
        if (!txt.trim()) return null;
        const arr = Array.isArray((scene_media as any)?.[kind]) ? (scene_media as any)[kind] : [];
        const bg = arr[0];
        return (
          <AbsoluteFill style={{ backgroundColor: sceneBaseBg }}>
            <MotionBackdrop
              src={bg?.kind === "video" ? bg.url : (bg ? undefined : bgRotate(planIdx).src)}
              image={bg?.kind === "image" ? bg.url : (bg ? undefined : bgRotate(planIdx).image)}
              duration={duration}
              effect={trImageEffect}
              extraStartSec={bg ? 0 : bgRotate(planIdx).extraStartSec}
            />
            <HookOverlay text={txt} duration={duration} textPosition={textPosition} />
          </AbsoluteFill>
        );
      }
      case "popup": {
        const pArr = Array.isArray((scene_media as any)?.popup) ? (scene_media as any).popup : [];
        const pItem = pArr.find((x: any) => x?.kind === "image") ?? pArr[0];
        const popupBg = pItem?.url ?? (assocOff("popup") ? (bgRotate(planIdx).image ?? null) : popupImageUrl);
        if (!popupBg) return null;
        return (
          <AbsoluteFill style={{ backgroundColor: sceneBaseBg }}>
            <ScenePopup imageUrl={popupBg} title={popupTitle} description={popupDescription} descriptionHtml={popupDescriptionHtml} durationFrames={duration} textPosition={textPosition} />
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
              background={bgItem?.url ?? (assocOff("highlight") ? null : h.image_url) ?? defaultGalleryList[idx % Math.max(defaultGalleryList.length, 1)] ?? null}
              backgroundIsVideo={bgItem?.kind === "video"}
              durationFrames={duration}
              textPosition={textPosition}
              effect={trImageEffect}
              motion={(h.effect as any) || null}
            />
          </AbsoluteFill>
        );
      }

      case "ai_summary":
      case "ai_text":
      case "external_link":
      case "menu_doc": {
        const idx = typeof offerIndex === "number" ? offerIndex : 0;
        let label = "";
        let title = "";
        let text = "";
        let textHtml: string | null = null;
        if (kind === "ai_summary") {
          const item = (Array.isArray(aiSummaries) ? aiSummaries : [])[idx];
          if (!item) return null;
          label = lang === "en" ? "Menu highlights" : "La carte";
          title = item.title || label;
          text = item.content || "";
          textHtml = item.content_html || null;
        } else if (kind === "ai_text") {
          const item = (Array.isArray(aiTexts) ? aiTexts : [])[idx];
          if (!item) return null;
          // Pas de surtitre « À propos » au montage : le texte parle de lui-même.
          label = "";
          title = item.title || "";
          text = item.content || "";
          textHtml = item.content_html || null;
        } else if (kind === "external_link") {
          const item = (Array.isArray(externalLinks) ? externalLinks : [])[idx];
          if (!item) return null;
          label = item.label || (lang === "en" ? "They talk about us" : "Ils en parlent");
          title = item.name || "";
          text = item.description || (item.url ? String(item.url).replace(/^https?:\/\//, "").split("/")[0] : "");
          textHtml = item.description_html || null;
        } else {
          const item = (Array.isArray(menuDocs) ? menuDocs : [])[idx];
          if (!item) return null;
          const generic = lang === "en" ? "Menu" : "La carte";
          title = item.name || generic;
          // évite le doublon « La carte » / « La carte »
          label = title.trim().toLowerCase() === generic.toLowerCase()
            ? (lang === "en" ? "Our selection" : "Notre sélection")
            : generic;
          text = item.description || "";
          textHtml = item.description_html || null;
        }

        const bgArr = Array.isArray((scene_media as any)?.[kind]) ? (scene_media as any)[kind] : [];
        const bgItem = bgArr[idx] ?? bgArr[0];
        const imgFallback = kind === "external_link" && !assocOff("external_link")
          ? ((Array.isArray(externalLinks) ? externalLinks : [])[idx]?.image ?? null)
          : null;
        return (
          <AbsoluteFill style={{ backgroundColor: sceneBaseBg }}>
            <MotionBackdrop
              src={bgItem?.kind === "video" ? bgItem.url : (bgItem ? undefined : bgRotate(planIdx).src)}
              image={bgItem?.kind === "image" ? bgItem.url : (bgItem ? undefined : (imgFallback ?? bgRotate(planIdx).image))}
              duration={duration}
              effect={trImageEffect}
              motion={kind === "ai_text" ? (((Array.isArray(aiTexts) ? aiTexts : [])[idx]?.effect as any) || "zoom_in") : kind === "ai_summary" ? (((Array.isArray(aiSummaries) ? aiSummaries : [])[idx]?.effect as any) || (aiSummaryEffect as any) || "zoom_in") : null}
              extraStartSec={bgItem ? 0 : bgRotate(planIdx).extraStartSec}
              veil={alpha("night", 0.14)}
            />
            <SceneInfoText
              dim="light"
              label={label}
              title={title}
              text={text}
              textHtml={textHtml}
              logoUrl={kind === "external_link" ? (Array.isArray(externalLinks) ? externalLinks : [])[idx]?.image ?? null : null}
              durationFrames={duration}
              textPosition={textPosition}
              ornament={kind === "menu_doc"}
              wide={kind === "ai_text"}

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
        return (
          <AbsoluteFill style={{ backgroundColor: sceneBaseBg }}>
            <MotionBackdrop
              src={bg?.kind === "video" ? bg.url : (bg ? undefined : bgRotate(planIdx).src)}
              image={bg?.kind === "image" ? bg.url : (bg ? undefined : bgRotate(planIdx).image)}
              duration={duration}
              effect={trImageEffect}
              extraStartSec={bg ? 0 : bgRotate(planIdx).extraStartSec}
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
              src={bg?.kind === "video" ? bg.url : (bg ? undefined : bgRotate(planIdx).src)}
              image={bg?.kind === "image" ? bg.url : (bg ? undefined : bgRotate(planIdx).image)}
              duration={duration}
              effect={trImageEffect}
              extraStartSec={bg ? 0 : bgRotate(planIdx).extraStartSec}
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
              src={bg?.kind === "video" ? bg.url : (bg ? undefined : bgRotate(planIdx).src)}
              image={bg?.kind === "image" ? bg.url : (bg ? undefined : bgRotate(planIdx).image)}
              duration={duration}
              effect={trImageEffect}
              extraStartSec={bg ? 0 : bgRotate(planIdx).extraStartSec}
            />
            <SceneWhatsapp
              number={whatsappNumber}
              durationFrames={duration}
              textPosition={textPosition}
              lines={whatsappShowOffer ? whatsappOfferLines : undefined}
            />
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
            {(() => {
              const chunks = resolveTextChunks(
                hookFull,
                (textSegments ?? {}).name,
                (textSplits ?? {}).name ?? splitCount,
              );
              if (chunks.length > 1) {
                // `duration` est en FRAMES : on découpe la durée de l'étape en N tranches.
                const segFrames = Math.max(1, Math.floor(duration / chunks.length));
                return (
                  <>
                    {chunks.map((txt, i) => {
                      const len = i === chunks.length - 1 ? Math.max(1, duration - i * segFrames) : segFrames;
                      return (
                        <Sequence key={`name-split-${i}`} from={i * segFrames} durationInFrames={len}>
                          <HookOverlay
                            title={i === 0 ? nameSceneTitle : undefined}
                            text={txt}
                            duration={len}
                            textPosition={textPosition}
                          />
                        </Sequence>
                      );
                    })}
                  </>
                );
              }

              return <HookOverlay title={nameSceneTitle} text={hookFull} duration={duration} textPosition={textPosition} />;
            })()}
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
                      <div style={{ position: "absolute", left: 0, right: 0, bottom: 120, textAlign: "center", padding: "0 40px", fontFamily: "'Avenir Next', 'Nunito Sans', sans-serif", fontSize: 30, lineHeight: 1.3, color: alpha("white", 0.92), textShadow: shadowOn(2, 8, "black", 0.6) }}>{secondary}</div>
                    </AbsoluteFill>
                  ) : null}
                </>
              );
            })()}
          </AbsoluteFill>
        );
      case "ai_card":
      case "offer": {
        if (kind === "ai_card") {
          if (!aiCard) return null;
          const rot = bgRotate(planIdx);
          const bgVideo = aiCard.background_video_url || rot.src;
          const bgImage = !bgVideo ? (aiCard.background_image_url || rot.image) : undefined;
          return (
            <AbsoluteFill>
              {(bgVideo || bgImage) ? (
                <>
                  <MotionBackdrop src={bgVideo} image={bgImage} duration={duration} effect={trImageEffect} veil={alpha("night", 0.35)} extraStartSec={aiCard.background_video_url ? 0 : rot.extraStartSec} />
                  <AbsoluteFill style={{ background: `linear-gradient(180deg,${alpha("night", 0.22)} 0%,${alpha("night", 0.48)} 100%)` }} />
                </>
              ) : null}
              <SceneManualCard card={aiCard} durationFrames={duration} textPosition={textPosition} />
            </AbsoluteFill>
          );
        }
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
              const offerRot = bgRotate(planIdx);
              const fallbackVideo = !bgVideo && !bgImage ? offerRot.src : undefined;
              const fallbackImage = !bgVideo && !bgImage && !fallbackVideo ? offerRot.image : undefined;
              const finalVideo = bgVideo || fallbackVideo;
              const finalImage = bgImage || fallbackImage;
              if (finalVideo || finalImage) {
                return (
                  <>
                    <MotionBackdrop src={finalVideo} image={finalImage} duration={duration} effect={trImageEffect} veil={alpha("night", 0.35)} extraStartSec={fallbackVideo ? offerRot.extraStartSec : 0} />
                    <AbsoluteFill style={{ background: `linear-gradient(180deg,${alpha("night", 0.22)} 0%,${alpha("night", 0.48)} 100%)` }} />
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
              src={it ? (it.kind === "video" ? it.url : undefined) : bgRotate(planIdx).src}
              image={it ? (it.kind === "image" ? it.url : undefined) : bgRotate(planIdx).image}
              duration={duration}
              effect={trImageEffect}
              extraStartSec={it ? 0 : bgRotate(planIdx).extraStartSec}
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
              src={it ? (it.kind === "video" ? it.url : undefined) : bgRotate(planIdx).src}
              image={it ? (it.kind === "image" ? it.url : undefined) : bgRotate(planIdx).image}
              duration={duration}
              effect={trImageEffect}
              extraStartSec={it ? 0 : bgRotate(planIdx).extraStartSec}
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
              src={it ? (it.kind === "video" ? it.url : undefined) : bgRotate(planIdx).src}
              image={it ? (it.kind === "image" ? it.url : undefined) : bgRotate(planIdx).image}
              duration={duration}
              effect={trImageEffect}
              extraStartSec={it ? 0 : bgRotate(planIdx).extraStartSec}
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
              src={it ? (it.kind === "video" ? it.url : undefined) : bgRotate(planIdx).src}
              image={it ? (it.kind === "image" ? it.url : undefined) : bgRotate(planIdx).image}
              duration={duration}
              effect={trImageEffect}
              extraStartSec={it ? 0 : bgRotate(planIdx).extraStartSec}
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
              src={bgRotate(planIdx).src}
              image={bgRotate(planIdx).image}
              duration={duration}
              effect={trImageEffect}
              extraStartSec={bgRotate(planIdx).extraStartSec}
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
      case "weather": {
        if (!weatherWidget) return null;
        return (
          <>
            <MotionBackdrop
              src={bgRotate(planIdx).src}
              image={bgRotate(planIdx).image}
              duration={duration}
              effect={trImageEffect}
              extraStartSec={bgRotate(planIdx).extraStartSec}
            />
            <SceneWeatherWidget widget={weatherWidget} duration={duration} textPosition={textPosition} />
          </>
        );
      }
      case "tides": {
        if (!tidesWidget) return null;
        return (
          <>
            <MotionBackdrop
              src={bgRotate(planIdx).src}
              image={bgRotate(planIdx).image}
              duration={duration}
              effect={trImageEffect}
              extraStartSec={bgRotate(planIdx).extraStartSec}
            />
            <SceneTidesWidget widget={tidesWidget} duration={duration} textPosition={textPosition} />
          </>
        );
      }
      case "cta": {
        const it = (sm.cta || [])[0] ?? outroItem;
        return (
          <>
            <MotionBackdrop
              src={it ? (it.kind === "video" ? it.url : undefined) : bgRotate(planIdx).src}
              image={it ? (it.kind === "image" ? it.url : undefined) : bgRotate(planIdx).image}
              duration={duration}
              effect={trImageEffect}
              extraStartSec={it ? 0 : bgRotate(planIdx).extraStartSec}
            />
            {showAppInstall
              ? <SceneInstallCta name={name} textPosition={textPosition} />
              : <SceneCta name={name} textPosition={textPosition} />}
          </>
        );
      }
      // Outro : clôture de marque distincte de l'appel à l'action (fond de marque,
      // logo One World Morocco et signature du site, sans visuel d'établissement).
      case "outro": {
        return (
          <AbsoluteFill style={{ backgroundColor: sceneBaseBg }}>
            <Background />
            <SceneCta name={name} textPosition={textPosition} />
          </AbsoluteFill>
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
  const { durationInFrames: totalFrames, fps } = useVideoConfig();
  const globalFrame = useCurrentFrame();

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
    <VideoStartsContext.Provider value={videoStarts ?? {}}>
    <VideoEndsContext.Provider value={videoEnds ?? {}}>
    <VideoDurationsContext.Provider value={videoDurations ?? {}}>
    <VideoPoolContext.Provider value={safeVideos}>

    <ToneContext.Provider value={tone}>
      <SuppressBgContext.Provider value={continuousMode || slideshowMode}>
        <AbsoluteFill style={{ backgroundColor: COLORS.night }}>
          {soundtrack && <Audio src={soundtrack} loop volume={audioFadeVolume(globalFrame)} />}
          {continuousMode ? (
            <AbsoluteFill style={{ overflow: "hidden" }}>
              {(() => {
                const rawDur = Number(continuousBgVideoDurationSec);
                const loopFrames =
                  Number.isFinite(rawDur) && rawDur > 0.5
                    ? Math.max(1, Math.round(rawDur * fps) - 1)
                    : null;
                const video = (
                  <StartVideo
                    src={continuousBgVideoUrl as string}
                    muted={!bgSoundOn}
                    volume={bgSoundOn ? audioFadeVolume(globalFrame) : 0}
                  />
                );
                // Vidéo plus courte que le scénario : on répète le média (image + son)
                // via <Loop> pour couvrir toute la durée, au lieu de figer la fin.
                if (loopFrames && loopFrames < totalFrames) {
                  // Dans une boucle, le frame local repart à 0 : on fige le volume
                  // sur le fondu global pour éviter un fade-out à chaque répétition.
                  return (
                    <Loop durationInFrames={loopFrames} layout="none">
                      <StartVideo
                        src={continuousBgVideoUrl as string}
                        muted={!bgSoundOn}
                        volume={bgSoundOn ? audioFadeVolume(globalFrame) : 0}
                        loop={false}
                      />
                    </Loop>
                  );
                }
                return video;
              })()}

              <AbsoluteFill style={{ background: `linear-gradient(180deg,${alpha("night", 0.22)} 0%,${alpha("night", 0.38)} 100%)` }} />
            </AbsoluteFill>
          ) : slideshowMode ? (
            <GlobalImageSlideshow images={safeImages} total={totalFrames} effect={trImageEffect} />
          ) : (
            <Background />
          )}
          {plan.map((s, planIdx) => (
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
                        <SuppressBgContext.Provider value={true}>{renderScene(s, planIdx)}</SuppressBgContext.Provider>
                      </>
                    ) : (
                      <>
                        {renderScene(s, planIdx)}
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
    </VideoPoolContext.Provider>
    </VideoDurationsContext.Provider>

    </VideoEndsContext.Provider>
    </VideoStartsContext.Provider>
    </LangContext.Provider>
  );
};


