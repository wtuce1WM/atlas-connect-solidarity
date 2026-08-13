// Public embed: iframe-friendly, business-scoped AI concierge.
// Route: /embed/ask/:slug
// - Anonymous, no auth.
// - Streams via the Vercel AI SDK UIMessageStream protocol (useChat).
// - Parses trailing markers (SHOW_ON_MAP, EVENTS_SNAPSHOT, KNOWN_BUSINESSES)
//   from the assistant text to render the same panels as /club.
import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Send, Sun, Moon, MapPin, Calendar as CalendarIcon, MessageSquarePlus, Bed, Utensils, Wine, Coffee, ShoppingBag, Sparkles, Landmark, Camera, Play, Pause, Volume2, VolumeX, Mic, MicOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { collectRatingSources, computeWeightedRatingOn20, getTotalReviewCount } from "@/lib/ratingUtils";
import MapSlidePanel, { type MapPanelBusiness } from "@/components/club/MapSlidePanel";
import EventsSlidePanel from "@/components/club/EventsSlidePanel";
import type { EventPanelItem } from "@/components/club/ClubAiAssistant";
import SlidePanelHeader from "@/components/SlidePanelHeader";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";

const BookOnlineSlidePanel = lazy(() => import("@/components/BookOnlineSlidePanel"));
const DestinationSlidePanel = lazy(() => import("@/components/DestinationSlidePanel"));
const PoiGoogleMap = lazy(() => import("@/components/PoiGoogleMap"));
const HomeVideoSlidePanel = lazy(() => import("@/components/home/HomeVideoSlidePanel"));
const LocationPickerDialog = lazy(() => import("@/components/LocationPickerDialog"));
import EmbedCardCarousel, { type EmbedCardItem } from "@/components/embed/EmbedCardCarousel";
import { Maximize2, X } from "lucide-react";
import EmbedWeatherWidget, { type WeatherPayload } from "@/components/embed/EmbedWeatherWidget";
import AiTidesWidget from "@/components/embed/AiTidesWidget";
import { useGeolocation } from "@/hooks/useGeolocation";
import { applyEmbedBg, parseBg, resolveEmbedInk } from "@/lib/embedFit";
import { useWidgetTracking } from "@/hooks/useWidgetTracking";

// EmbedMediaBottomBar (Pause/Mute) removed — the BookOnlineSlidePanel now renders
// its own liquid-glass PanelSearchBar with 6 CTAs and integrated video controls.


/**
 * Wrapper around BookOnlineSlidePanel for the embed:
 * - Vertical swipe (touch) + mouse wheel navigation between siblings
 * - Extra bottom padding on the panel's scroll area so URL 2–5 CTAs
 *   sit above the liquid-glass Play/Mute bar.
 */
const EmbedBookPanelWrapper = ({
  businessId,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  businessId: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const wheelAccumRef = useRef(0);
  const wheelLockUntilRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const touchActiveRef = useRef(false);
  const onPrevRef = useRef(onPrev);
  const onNextRef = useRef(onNext);
  const hasPrevRef = useRef(hasPrev);
  const hasNextRef = useRef(hasNext);
  useEffect(() => { onPrevRef.current = onPrev; onNextRef.current = onNext; hasPrevRef.current = hasPrev; hasNextRef.current = hasNext; }, [onPrev, onNext, hasPrev, hasNext]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const isScrollableY = (node: HTMLElement) => {
      const s = window.getComputedStyle(node);
      return /(auto|scroll)/.test(s.overflowY) && node.scrollHeight > node.clientHeight + 1;
    };
    const getScrollable = (target: EventTarget | null) => {
      const main = el.querySelector<HTMLElement>('[data-slidepanel-scroll="true"]');
      if (main && isScrollableY(main)) return main;
      if (!(target instanceof HTMLElement)) return null;
      let n: HTMLElement | null = target;
      while (n && n !== el) { if (isScrollableY(n)) return n; n = n.parentElement; }
      return null;
    };
    const onWheel = (e: WheelEvent) => {
      if (document.body.dataset.slidepanelOverlayOpen === "1") return;
      if (e.target instanceof Element && e.target.closest('.gm-style')) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const deltaY = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      const scroller = getScrollable(e.target);
      if (scroller) {
        const maxTop = scroller.scrollHeight - scroller.clientHeight;
        const canScroll = deltaY > 0 ? scroller.scrollTop < maxTop - 1 : scroller.scrollTop > 1;
        if (canScroll) { wheelAccumRef.current = 0; return; }
      }
      const now = Date.now();
      if (now < wheelLockUntilRef.current) { wheelAccumRef.current = 0; return; }
      wheelAccumRef.current += deltaY;
      if (Math.abs(wheelAccumRef.current) < 60) return;
      const dir = wheelAccumRef.current > 0 ? 1 : -1;
      wheelAccumRef.current = 0;
      wheelLockUntilRef.current = now + 450;
      if (dir > 0 && hasNextRef.current) onNextRef.current();
      else if (dir < 0 && hasPrevRef.current) onPrevRef.current();
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel as any);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    if (document.body.dataset.slidepanelOverlayOpen === "1") return;
    const t = e.touches[0];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // Only initiate near the top of the panel (header) to avoid hijacking content scroll
    if (t.clientY - rect.top > 96) return;
    touchStartYRef.current = t.clientY;
    touchActiveRef.current = true;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchActiveRef.current || touchStartYRef.current == null) return;
    const t = e.changedTouches[0];
    const dy = t.clientY - touchStartYRef.current;
    touchActiveRef.current = false;
    touchStartYRef.current = null;
    if (Math.abs(dy) < 120) return;
    if (dy > 0 && hasPrev) onPrev();
    else if (dy < 0 && hasNext) onNext();
  };

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 z-[220] bg-background flex flex-col lg:left-auto lg:border-l lg:border-border lg:w-1/2 embed-book-panel-scope"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <SlidePanelHeader onClose={onClose} alwaysDark glassClose />
      <div className="flex-1 min-h-0 overflow-visible">
        <Suspense fallback={null}>
          <BookOnlineSlidePanel
            businessId={businessId}
            onClose={onClose}
            onPrev={onPrev}
            onNext={onNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
            showSearchBar
            onSearch={() => { /* embed: search bar is used for its 6 liquid CTAs + video controls only */ }}
            onSearchBusinessSelect={() => { /* no-op inside embed */ }}
          />
        </Suspense>
      </div>
    </div>
  );
};

const SCOPE_LABELS: Record<string, { newConversation: string }> = {
  fr: { newConversation: "Nouvelle conversation" },
  en: { newConversation: "New conversation" },
  ar: { newConversation: "محادثة جديدة" },
};

// ============= Rayon de proximité =============
// Valeurs autorisées = celles du champ « Rayon de proximité » (/affiliates → Tools).
const RADIUS_OPTIONS = [0.5, 1, 5, 10, 20, 50, 100] as const;
const radiusLabel = (km: number, lang: string): string =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`;

/** Détecte une demande de changement de rayon (texte ou vocal) et renvoie la valeur autorisée la plus proche. */
function parseRadiusCommand(text: string): number | null {
  const q = (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!/(rayon|perimetre|proximite|autour|radius|within|distance|نطاق|محيط)/.test(q)) return null;
  const km = q.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kilometres?|kilometers?|كم|كيلومتر)/);
  const m = q.match(/(\d{2,4})\s*(?:m|metres?|meters?|م)\b/);
  let value: number | null = null;
  if (km) value = Number(km[1].replace(",", "."));
  else if (m) value = Number(m[1]) / 1000;
  else {
    const bare = q.match(/(\d+(?:[.,]\d+)?)/);
    if (bare) value = Number(bare[1].replace(",", "."));
  }
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  let best = RADIUS_OPTIONS[0] as number;
  for (const opt of RADIUS_OPTIONS) {
    if (Math.abs(opt - value) < Math.abs(best - value)) best = opt;
  }
  return best;
}

const LANG_LABELS: Record<string, { placeholder: string; hint: string; opener: (name: string, radius: string) => string; radiusLabel: string; radiusChanged: (r: string) => string; viewMap: string; events: string; nearby: string; suggestions: string[] }> = {
  fr: {
    placeholder: "Posez votre question…",
    hint: "Assistant IA propulsé par One World Morocco",
    opener: (n, r) =>
      `Bonjour 👋 Je suis l'assistant de **${n}**. Mes recherches de proximité et de distance se calculent dans un rayon de **${r}** autour de **${n}** — vous pouvez changer ce rayon ci-dessous ou à la voix. Comment puis-je vous aider ?`,
    radiusLabel: "Rayon de proximité",
    radiusChanged: (r) => `D'accord 👍 Rayon de proximité réglé sur **${r}**. Les recherches de proximité et de distance utiliseront ce périmètre.`,
    viewMap: "Voir sur la carte",
    events: "Événements",
    nearby: "À proximité",
    suggestions: [
      "Que faire à proximité ?",
      "Où prendre un thé à la menthe ?",
      "Que faire ce week-end ?",
      "Comment venir depuis l'aéroport ?",
    ],
  },
  en: {
    placeholder: "Ask a question…",
    hint: "AI assistant powered by One World Morocco",
    opener: (n, r) =>
      `Hi 👋 I'm the assistant for **${n}**. Nearby and distance searches are calculated within a **${r}** radius around **${n}** — you can change this radius below or by voice. How can I help?`,
    radiusLabel: "Proximity radius",
    radiusChanged: (r) => `Got it 👍 Proximity radius set to **${r}**. Nearby and distance searches will use this perimeter.`,
    viewMap: "View on map",
    events: "Events",
    nearby: "Nearby",
    suggestions: [
      "What to do nearby?",
      "Where can I have mint tea?",
      "What's on this weekend?",
      "How do I get here from the airport?",
    ],
  },
  ar: {
    placeholder: "اطرح سؤالك…",
    hint: "مساعد ذكي بواسطة One World Morocco",
    opener: (n, r) =>
      `مرحبًا 👋 أنا مساعد **${n}**. تُحسب نتائج القرب والمسافات داخل نطاق **${r}** حول **${n}** — يمكنك تغيير هذا النطاق أدناه أو بالصوت. كيف يمكنني مساعدتك؟`,
    radiusLabel: "نطاق القرب",
    radiusChanged: (r) => `تم 👍 تم ضبط نطاق القرب على **${r}**.`,
    viewMap: "عرض على الخريطة",
    events: "الفعاليات",
    nearby: "القريبة",
    suggestions: [
      "ماذا أفعل في الجوار؟",
      "أين أشرب أتاي بالنعناع؟",
      "ماذا يحدث هذا الأسبوع؟",
      "كيف أصل من المطار؟",
    ],
  },
};


// ============= Marker extraction =============
const MAP_RE = /<!--SHOW_ON_MAP:([\s\S]*?)-->/g;
const EVENTS_RE = /<!--EVENTS_SNAPSHOT:([\s\S]*?)-->/g;
const KNOWN_RE = /<!--KNOWN_BUSINESSES:([\s\S]*?)-->/g;
const ARTICLE_RE = /<!--ARTICLE_CARD:([\s\S]*?)-->/g;
const DEST_RE = /<!--DESTINATION_CARDS:([\s\S]*?)-->/g;
const PINNED_RE = /<!--PINNED_BUSINESS_CARDS:([\s\S]*?)-->/g;
const WEATHER_RE = /<!--WEATHER_FORECAST:([\s\S]*?)-->/g;
const VIDEOFEED_RE = /<!--VIDEO_FEED:([\s\S]*?)-->/g;
const TIDES_RE = /<!--TIDES_FORECAST:([\s\S]*?)-->/g;

type MapPayload = { title?: string | null; businesses: MapPanelBusiness[]; order?: string | null };
type EventsPayload = { title?: string | null; city?: string | null; events: EventPanelItem[] };
type KnownBusiness = { id: string; slug: string | null; name: string };
type ArticleCardPayload = { id: string; slug: string; title: string; image: string | null; hero?: string | null; tldr?: string | null; hook?: string | null; intro?: string | null; inline?: boolean; isOwner?: boolean; kind?: "blog" | "video_feed"; url?: string | null };
type DestinationCard = { id: string; name: string; hook?: string | null; image?: string | null; latitude?: number | null; longitude?: number | null; distKm?: number | null };
type DestinationsPayload = { title?: string | null; destinations: DestinationCard[] };
type VideoFeedItem = {
  id: string;
  url: string;
  title?: string | null;
  description?: string | null;
  price?: string | null;
  thumbnailUrl?: string | null;
  isGeneric?: boolean;
  businessId?: string | null;
  businessName?: string | null;
};
type VideoFeedPayload = { title?: string | null; videos: VideoFeedItem[] };
type PinnedBusinessCard = {
  id: string;
  name: string;
  slug?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  image?: string | null;
  rating20?: number | null;
  review_count?: number | null;
  review?: { author?: string | null; rating?: number | null; text?: string | null; source?: string | null } | null;
};

function extractPayloads(text: string): { clean: string; maps: MapPayload[]; events: EventsPayload[]; known: KnownBusiness[]; articles: ArticleCardPayload[]; destinations: DestinationsPayload[]; pinned: PinnedBusinessCard[]; weather: WeatherPayload[]; videoFeeds: VideoFeedPayload[]; tides: string[] } {
  const maps: MapPayload[] = [];
  const events: EventsPayload[] = [];
  const known: KnownBusiness[] = [];
  const articles: ArticleCardPayload[] = [];
  const destinations: DestinationsPayload[] = [];
  const pinned: PinnedBusinessCard[] = [];
  const weather: WeatherPayload[] = [];
  const videoFeeds: VideoFeedPayload[] = [];
  const tides: string[] = [];
  if (!text) return { clean: text, maps, events, known, articles, destinations, pinned, weather, videoFeeds, tides };
  let clean = text.replace(MAP_RE, (_m, raw) => {
    try {
      const p = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (p && Array.isArray(p.businesses) && p.businesses.length) maps.push({ title: p.title ?? null, businesses: p.businesses, order: p.order ?? null });
    } catch { /* */ }
    return "";
  }).replace(EVENTS_RE, (_m, raw) => {
    try {
      const p = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (p && Array.isArray(p.events) && p.events.length) events.push({ title: p.title ?? null, city: p.city ?? null, events: p.events });
    } catch { /* */ }
    return "";
  }).replace(KNOWN_RE, (_m, raw) => {
    try {
      const p = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (Array.isArray(p)) for (const b of p) if (b?.id && b?.name) known.push({ id: b.id, slug: b.slug || null, name: b.name });
    } catch { /* */ }
    return "";
  }).replace(ARTICLE_RE, (_m, raw) => {
    try {
      const p = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (p && p.id && p.slug && p.title) articles.push(p as ArticleCardPayload);
    } catch { /* */ }
    return "";
  }).replace(DEST_RE, (_m, raw) => {
    try {
      const p = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (p && Array.isArray(p.destinations) && p.destinations.length) destinations.push({ title: p.title ?? null, destinations: p.destinations });
    } catch { /* */ }
    return "";
  }).replace(PINNED_RE, (_m, raw) => {
    try {
      const p = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (Array.isArray(p)) for (const b of p) if (b?.id && b?.name) pinned.push(b as PinnedBusinessCard);
    } catch { /* */ }
    return "";
  }).replace(WEATHER_RE, (_m, raw) => {
    try {
      const p = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (p && typeof p.temp === "number") weather.push(p as WeatherPayload);
    } catch { /* */ }
    return "";
  }).replace(VIDEOFEED_RE, (_m, raw) => {
    try {
      const p = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (p && Array.isArray(p.videos) && p.videos.length) videoFeeds.push({ title: p.title ?? null, videos: p.videos });
    } catch { /* */ }
    return "";
  
  }).replace(TIDES_RE, (_m, raw) => {
    try {
      const p = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (p && (p.city || p.city_name)) tides.push(String(p.city || p.city_name));
    } catch { /* */ }
    return "";
  });
  clean = clean
    .replace(/<!--SHOW_ON_MAP:[\s\S]*$/g, "")
    .replace(/<!--EVENTS_SNAPSHOT:[\s\S]*$/g, "")
    .replace(/<!--KNOWN_BUSINESSES:[\s\S]*$/g, "")
    .replace(/<!--ARTICLE_CARD:[\s\S]*$/g, "")
    .replace(/<!--DESTINATION_CARDS:[\s\S]*$/g, "")
    .replace(/<!--PINNED_BUSINESS_CARDS:[\s\S]*$/g, "")
    .replace(/<!--WEATHER_FORECAST:[\s\S]*$/g, "")
    .replace(/<!--TIDES_FORECAST:[\s\S]*$/g, "")
    .replace(/<!--VIDEO_FEED:[\s\S]*?-->/g, "")
    .replace(/<!--VIDEO_FEED:[\s\S]*$/g, "")
    .replace(/<!--POOL_BUSINESS_IDS:[\s\S]*?-->/g, "")
    .replace(/<!--POOL_BUSINESS_IDS:[\s\S]*$/g, "")
    .trim();
  clean = linkifyPhones(clean);
  return { clean, maps, events, known, articles, destinations, pinned, weather, videoFeeds, tides };
}

// Convert bare phone / WhatsApp numbers found in AI markdown into clickable links.
// - Numbers preceded (within ~30 chars) by "whatsapp" / "wa" / "💬" become wa.me links.
// - Everything else becomes a tel: link.
// Skips numbers that already sit inside a markdown link "](...)".
function linkifyPhones(input: string): string {
  if (!input) return input;
  // Split preserving markdown links so we don't touch their internals.
  const parts = input.split(/(\[[^\]]+\]\([^)]+\))/g);
  const PHONE_RE = /(?<![\w./])(\+?\d(?:[\d\s.\-]{7,17})\d)(?![\w./])/g;
  const isWaContext = (before: string) => /(whats\s*app|wa\.me|\bwa\b|💬)/i.test(before);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part; // markdown link, keep as-is
      return part.replace(PHONE_RE, (match, _grp, offset: number) => {
        // Require 8–15 digits total to avoid dates/prices.
        const digits = match.replace(/\D/g, "");
        if (digits.length < 8 || digits.length > 15) return match;
        const before = part.slice(Math.max(0, offset - 30), offset);
        const normalized = match.replace(/\s+/g, "").replace(/[.\-]/g, "");
        const label = match.trim();
        if (isWaContext(before)) {
          const waNum = normalized.replace(/^\+/, "");
          return `[${label}](https://wa.me/${waNum})`;
        }
        return `[${label}](tel:${normalized})`;
      });
    })
    .join("");
}

// Concatenate all text parts of a UIMessage into a single string.
function messageText(m: UIMessage): string {
  const parts = (m as any).parts;
  if (Array.isArray(parts)) {
    return parts
      .filter((p: any) => p?.type === "text" && typeof p.text === "string")
      .map((p: any) => p.text)
      .join("");
  }
  return String((m as any).content ?? "");
}

function categoryMeta(b: MapPanelBusiness): { Icon: typeof Bed; label: string } {
  const cat = (b.main_category || (b.categories?.[0] ?? "") || "").toLowerCase();
  const has = (s: string) => cat.includes(s);
  if (has("hôtel") || has("hotel") || has("riad") || has("hébergement") || has("stay") || has("lodging")) return { Icon: Bed, label: b.main_category || "Hôtel" };
  if (has("restaurant") || has("table") || has("dîner") || has("dining") || has("food")) return { Icon: Utensils, label: b.main_category || "Restaurant" };
  if (has("bar") || has("club") || has("nightlife") || has("soirée")) return { Icon: Wine, label: b.main_category || "Bar" };
  if (has("café") || has("cafe") || has("thé") || has("tea") || has("coffee") || has("salon de thé")) return { Icon: Coffee, label: b.main_category || "Café" };
  if (has("boutique") || has("shop") || has("tapis") || has("souk") || has("shopping")) return { Icon: ShoppingBag, label: b.main_category || "Boutique" };
  if (has("spa") || has("hammam") || has("wellness") || has("bien-être")) return { Icon: Sparkles, label: b.main_category || "Spa" };
  if (has("musée") || has("museum") || has("monument") || has("patrimoine") || has("culture")) return { Icon: Landmark, label: b.main_category || "Culture" };
  if (has("activité") || has("activity") || has("excursion") || has("tour") || has("expérience")) return { Icon: Camera, label: b.main_category || "Activité" };
  return { Icon: MapPin, label: [b.neighborhood, b.city].filter(Boolean).join(", ") || b.main_category || "Établissement" };
}

const EmbedAsk = () => {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const lang = (["fr", "en", "ar"].includes(params.get("lang") || "") ? params.get("lang") : "fr") as "fr" | "en" | "ar";
  useWidgetTracking("ask", null, lang);
  // Fond du widget :
  //   ?bg=EFE6D8       → l'assistant prend cette couleur (encre auto selon luminance)
  //   ?bg=transparent  → fond transparent : le fond du site hôte apparaît
  //   ?card=EFE6D8     → intérieur du widget de cette couleur, page transparente
  const bgRaw = (params.get("bg") || "").trim();
  const embedBgColor = parseBg(bgRaw);
  const cardColor = parseBg(params.get("card"));
  const bgTransparent = /^(transparent|none|0)$/i.test(bgRaw);
  // Couleur appliquée à l'intérieur du widget (carte) : `card` en priorité.
  const innerBgColor = cardColor || embedBgColor;
  const customBg = !!embedBgColor || bgTransparent || !!cardColor;
  const bgInk = customBg ? resolveEmbedInk(params.get("ink"), innerBgColor) : null;
  // Le paramètre `theme` explicite est toujours prioritaire (cohérence clair/sombre
  // entre l'iframe simple et la variante « panneau flottant »).
  const themeParam = params.get("theme") === "light" ? "light" : params.get("theme") === "dark" ? "dark" : null;
  // `?theme=none` → mode clair/sombre désactivé : aucune couleur d'affilié appliquée,
  // pas de sélecteur, le fond de l'hôte reste visible (overlay Full Description).
  const noTheme = /^(none|off|0)$/i.test(params.get("theme") || "");
  // Panneau flottant : l'hôte demande une croix de fermeture dans le widget.
  const inFloatingPanel = /^(1|true)$/i.test(params.get("panel") || "");
  // Nom personnalisé de l'assistant (champ éditable côté /affiliates/presence).
  const assistantNameParam = (params.get("name") || "").trim().slice(0, 60);
  // Moteur IA : V2 uniquement (V1 retiré).
  const initialTheme = themeParam
    ? themeParam
    : customBg
    ? (bgInk === "dark" ? "light" : "dark")
    : "light";

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (themeParam) return themeParam;
    if (customBg) return initialTheme;
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("embed-ask-theme");
      if (saved === "light" || saved === "dark") return saved;
    }
    return initialTheme;
  });

  useEffect(() => {
    if (customBg) return;
    try { window.localStorage.setItem("embed-ask-theme", theme); } catch { /* noop */ }
  }, [theme, customBg]);
  const [businessName, setBusinessName] = useState<string>("");
  const [assistantTitle, setAssistantTitle] = useState<string>("");
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessCity, setBusinessCity] = useState<string | null>(null);
  const [businessMainCategory, setBusinessMainCategory] = useState<string | null>(null);
  const [hostLocation, setHostLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const geo = useGeolocation();

  useEffect(() => {
    const h = () => setLocationOpen(true);
    window.addEventListener("open-location-picker", h);
    return () => window.removeEventListener("open-location-picker", h);
  }, []);

  type FollowupRow = { id: string; label_fr: string; label_en: string | null; label_ar: string | null };
  type SuggestionRow = { id: string; label: string; disabled_followup_ids?: string[] };
  const [dbSuggestions, setDbSuggestions] = useState<SuggestionRow[] | null>(null);
  const [globalFollowups, setGlobalFollowups] = useState<FollowupRow[]>([]);
  // Sélection de l'affilié (onglet Agent IA de /affiliates/presence). null = tout activé.
  const [agentPrefs, setAgentPrefs] = useState<{ sugg: string[] | null; fu: string[] | null }>({ sugg: null, fu: null });

  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);

  type BlogArticle = { id: string; slug: string; title: string; image: string | null; isOwner: boolean };
  const [blogArticles, setBlogArticles] = useState<BlogArticle[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const L = LANG_LABELS[lang];

  // --- Persistence (localStorage): survives page reload for ~7 days per slug+lang. ---
  const storageKey = `embed-ask:thread:${slug}:${lang}`;
  const TTL_MS = 7 * 24 * 3600 * 1000;
  type PersistedThread = {
    sessionId: string;
    messageIndex: number;
    messages: any[];
    activeSuggestionId: string | null;
    savedAt: number;
  };
  const readPersisted = (): PersistedThread | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedThread;
      if (!parsed?.sessionId || !Array.isArray(parsed.messages)) return null;
      if (Date.now() - (parsed.savedAt || 0) > TTL_MS) {
        window.localStorage.removeItem(storageKey);
        return null;
      }
      return parsed;
    } catch { return null; }
  };
  const initialPersisted = useMemo(readPersisted, [storageKey]);

  const newSessionId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const sessionIdRef = useRef<string>(initialPersisted?.sessionId || newSessionId());
  const messageIndexRef = useRef<number>(initialPersisted?.messageIndex || 0);
  const [chatKey, setChatKey] = useState(0);
  // Relances déjà cliquées dans la conversation courante (réinitialisées au reset).
  const [usedFollowupIds, setUsedFollowupIds] = useState<string[]>([]);

  const restoredRef = useRef<boolean>(!!initialPersisted);

  // Rayon de proximité : valeur de l'hôte (/affiliates → Tools), modifiable par l'utilisateur.
  const [radiusKm, setRadiusKm] = useState<number>(1);
  const radiusRef = useRef<number>(1);
  const applyRadius = (km: number) => { radiusRef.current = km; setRadiusKm(km); };


  // --- AI SDK useChat wiring ---
  const transport = useMemo(() => new DefaultChatTransport({
    api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/embed-ai-chat-v2`,
    headers: () => ({
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    }),
    prepareSendMessagesRequest: ({ messages, body }) => ({
      body: {
        messages,
        businessSlug: slug,
        language: lang,
        sessionId: sessionIdRef.current,
        messageIndex: messageIndexRef.current,
        suggestionId: (body as any)?.suggestionId ?? null,
        followupId: (body as any)?.followupId ?? null,
        scope: (body as any)?.scope ?? null,
        radiusKm: radiusRef.current,
      },
    }),
  }), [slug, lang]);


  const { messages, sendMessage, status, setMessages } = useChat({
    id: `embed-${slug}-${chatKey}`,
    transport,
    onError: (e) => setError(e.message),
  });

  const streaming = status === "submitted" || status === "streaming";

  const suggAllowed = agentPrefs.sugg;
  const filteredDbSuggestions = dbSuggestions && suggAllowed
    ? dbSuggestions.filter((s) => suggAllowed.includes(s.id))
    : dbSuggestions;
  const suggestions: SuggestionRow[] = filteredDbSuggestions && filteredDbSuggestions.length > 0
    ? filteredDbSuggestions
    : L.suggestions.map((s, i) => ({ id: `default-${i}`, label: s }));
  const pickFollowupLabel = (f: FollowupRow): string => {
    const raw = (lang === "en" ? f.label_en : lang === "ar" ? f.label_ar : f.label_fr) || f.label_fr || "";
    return raw.replace(/\{businessName\}/g, businessName || "").trim();
  };
  const activeSuggestion = activeSuggestionId ? suggestions.find((s) => s.id === activeSuggestionId) : null;
  const disabledIds = new Set(activeSuggestion?.disabled_followup_ids || []);
  const fuAllowed = agentPrefs.fu;
  const activeFollowups: Array<{ id: string; label: string }> = globalFollowups
    .filter((f) => !disabledIds.has(f.id))
    .filter((f) => !fuAllowed || fuAllowed.includes(f.id))
    .filter((f) => !usedFollowupIds.includes(f.id))
    .map((f) => ({ id: f.id, label: pickFollowupLabel(f) }))
    .filter((f) => f.label);



  const [openMap, setOpenMap] = useState<MapPayload | null>(null);
  const [openEvents, setOpenEvents] = useState<{ list: EventPanelItem[]; index: number } | null>(null);
  const [openBusinessId, setOpenBusinessId] = useState<string | null>(null);
  const [openDestinationId, setOpenDestinationId] = useState<string | null>(null);
  // Feed vidéo (mode curaté `video_feed`) : liste active + vidéo ouverte.
  const [videoFeedList, setVideoFeedList] = useState<VideoFeedItem[]>([]);
  const [activeFeedVideoId, setActiveFeedVideoId] = useState<string | null>(null);
  const [feedVideoTime, setFeedVideoTime] = useState(0);
  const [openSiblings, setOpenSiblings] = useState<string[]>([]);

  const isMobile = useMemo(() => typeof window !== "undefined" && window.innerWidth < 768, []);

  // Couleurs de fond des widgets définies par l'affilié (mode clair / mode sombre).
  const [widgetColors, setWidgetColors] = useState<{ light: string | null; dark: string | null }>({ light: null, dark: null });

  // La couleur passée dans l'URL initialise le widget, mais le sélecteur clair/sombre
  // doit ensuite réellement basculer entre les deux couleurs enregistrées.
  const activeWidgetBg =
    (theme === "light" ? widgetColors.light : widgetColors.dark) || innerBgColor;
  const activeBgInk = resolveEmbedInk(null, activeWidgetBg);

  useEffect(() => {
    if (!customBg) return;
    return applyEmbedBg(activeWidgetBg || "");
  }, [customBg, activeWidgetBg]);

  // Le panneau flottant vit dans une iframe : prévenir la page hôte afin que son
  // propre fond ne reste pas bloqué sur la couleur du mode initial.
  useEffect(() => {
    if (!inFloatingPanel || !activeWidgetBg) return;
    try {
      window.parent?.postMessage(
        { type: "owm-embed-theme", theme, background: activeWidgetBg },
        "*",
      );
    } catch { /* noop */ }
  }, [inFloatingPanel, theme, activeWidgetBg]);

  // Load host business
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("businesses")
        .select("id, name, latitude, longitude, city, main_category, url_6_title, widget_bg_color, widget_bg_color_dark, poi_radius_km")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled) return;
      const row = (data || null) as any;
      const name = row?.name || "";
      setBusinessName(name);
      setAssistantTitle((row?.url_6_title as string) || "");
      setBusinessId((row?.id as string) || null);
      setBusinessCity((row?.city as string) || null);
      setBusinessMainCategory((row?.main_category as string) || null);
      const rawRadius = Number(row?.poi_radius_km);
      const hostRadius = RADIUS_OPTIONS.includes(rawRadius as any) ? rawRadius : 1;
      applyRadius(hostRadius);
      const hex = (v: any) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim() : null);
      setWidgetColors(noTheme ? { light: null, dark: null } : { light: hex(row?.widget_bg_color), dark: hex(row?.widget_bg_color_dark) });
      if (row?.latitude != null && row?.longitude != null) {
        setHostLocation({ lat: Number(row.latitude), lng: Number(row.longitude) });
      }
      if (!name) {
        setError(lang === "en" ? "Establishment not found." : lang === "ar" ? "المؤسسة غير موجودة." : "Établissement introuvable.");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Seed the opener as an assistant UIMessage once we know the business
  useEffect(() => {
    if (!businessName) return;
    if (messages.length > 0) return;
    if (restoredRef.current && initialPersisted?.messages?.length) {
      setMessages(initialPersisted.messages as any);
      if (initialPersisted.activeSuggestionId) setActiveSuggestionId(initialPersisted.activeSuggestionId);
      return;
    }
    setMessages([{
      id: "opener",
      role: "assistant",
      parts: [{ type: "text", text: L.opener(businessName, radiusLabel(radiusKm, lang)) }],
    } as any]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessName, chatKey, radiusKm]);


  // Persist thread to localStorage on every change (skip while streaming to avoid spam).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!businessName) return;
    if (streaming) return;
    if (messages.length <= 1) return;
    try {
      const payload: PersistedThread = {
        sessionId: sessionIdRef.current,
        messageIndex: messageIndexRef.current,
        messages,
        activeSuggestionId,
        savedAt: Date.now(),
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch { /* quota or serialization noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, streaming, businessName, activeSuggestionId]);


  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("ai_suggestions")
        .select("id,label_fr,label_en,label_ar,followups,business_ids,city,main_categories,disabled_followup_ids")
        .eq("surface", "embed")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (cancelled || !data) return;
      const col = lang === "en" ? "label_en" : lang === "ar" ? "label_ar" : "label_fr";
      const normCity = (s: string | null | undefined) =>
        (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const bizCity = normCity(businessCity);
      const bizCat = normCity(businessMainCategory);
      const list: SuggestionRow[] = (data as any[])
        .filter((r) => {
          const c = normCity(r.city);
          if (c && c !== bizCity) return false;
          const cats = Array.isArray(r.main_categories) ? r.main_categories : [];
          if (cats.length > 0 && (!bizCat || !cats.some((x: string) => normCity(x) === bizCat))) return false;
          return true;
        })
        .map((r) => ({
          id: r.id as string,
          label: ((r[col] || r.label_fr || "") as string).trim(),
          disabled_followup_ids: Array.isArray(r.disabled_followup_ids) ? r.disabled_followup_ids : [],
        }))
        .filter((r) => r.label);
      if (list.length > 0) setDbSuggestions(list);
    })();
    return () => { cancelled = true; };
  }, [lang, businessId, businessCity, businessMainCategory]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("ai_followups")
        .select("id,label_fr,label_en,label_ar")
        .eq("surface", "embed")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (cancelled || !data) return;
      setGlobalFollowups(data as FollowupRow[]);
    })();
    return () => { cancelled = true; };
  }, []);

  // Préférences Agent IA de l'établissement (onglet Agent IA côté affilié).
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("business_embed_ai_prefs")
        .select("enabled_suggestion_ids,enabled_followup_ids")
        .eq("business_id", businessId)
        .maybeSingle();
      if (cancelled || !data) return;
      setAgentPrefs({
        sugg: Array.isArray(data.enabled_suggestion_ids) && data.enabled_suggestion_ids.length > 0
          ? data.enabled_suggestion_ids
          : null,
        fu: Array.isArray(data.enabled_followup_ids) ? data.enabled_followup_ids : null,
      });
    })();
    return () => { cancelled = true; };
  }, [businessId]);



  // Load blog articles: owner articles first (anchor = this business), then unassigned, both newest first.
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      const titleCol = lang === "en" ? "title_en" : lang === "ar" ? "title_ar" : "title_fr";
      const [ownerRes, freeRes] = await Promise.all([
        (supabase as any).from("blog_posts")
          .select(`id, slug, title_fr, ${titleCol}, cover_image_url, custom_hero_image_url, anchor_business_id, published_at`)
          .eq("is_published", true)
          .eq("anchor_business_id", businessId)
          .order("published_at", { ascending: false })
          .limit(12),
        (supabase as any).from("blog_posts")
          .select(`id, slug, title_fr, ${titleCol}, cover_image_url, custom_hero_image_url, anchor_business_id, published_at`)
          .eq("is_published", true)
          .is("anchor_business_id", null)
          .filter("entries_fr", "cs", `[{"id":"${businessId}"}]`)
          .order("published_at", { ascending: false })
          .limit(12),
      ]);
      if (cancelled) return;
      const norm = (r: any, isOwner: boolean): BlogArticle => ({
        id: r.id,
        slug: r.slug,
        title: (r[titleCol] || r.title_fr || "") as string,
        image: (r.custom_hero_image_url || r.cover_image_url || null) as string | null,
        isOwner,
      });
      const owner = ((ownerRes?.data as any[]) || []).map((r) => norm(r, true));
      const free = ((freeRes?.data as any[]) || []).map((r) => norm(r, false));
      setBlogArticles([...owner, ...free].filter((a) => a.title && a.slug));
    })();
    return () => { cancelled = true; };
  }, [businessId, lang]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, [businessName]);

  const dir = lang === "ar" ? "rtl" : "ltr";

  const send = (overrideText?: string, suggestionId?: string, followupId?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming || !businessName) return;
    if (!overrideText) setInput("");
    // Commande (tapée ou vocale) de changement de rayon : traitée localement,
    // la valeur reste bornée aux options du champ « Rayon de proximité ».
    if (!suggestionId && !followupId) {
      const asked = parseRadiusCommand(text);
      if (asked != null) {
        applyRadius(asked);
        setError(null);
        setMessages((prev) => [
          ...prev,
          { id: `u-radius-${Date.now()}`, role: "user", parts: [{ type: "text", text }] } as any,
          {
            id: `a-radius-${Date.now()}`,
            role: "assistant",
            parts: [{ type: "text", text: L.radiusChanged(radiusLabel(asked, lang)) }],
          } as any,
        ]);
        return;
      }
    }
    if (suggestionId && !suggestionId.startsWith("default-")) setActiveSuggestionId(suggestionId);
    // Une recherche libre doit toujours être résolue depuis son propre texte.
    // L'ancienne suggestion active ne sert que de contexte à une relance explicite.
    if (!suggestionId && !followupId) setActiveSuggestionId(null);
    setError(null);
    messageIndexRef.current += 1;
    const effectiveSuggestionId: string | null = suggestionId || (followupId ? activeSuggestionId : null) || null;
    sendMessage(
      { text },
      { body: { suggestionId: effectiveSuggestionId, followupId: followupId || null, scope: null } },
    );
  };


  const findLastMapPayload = (): MapPayload | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      const { maps } = extractPayloads(messageText(m));
      const latest = maps[maps.length - 1];
      if (latest && latest.businesses.length > 0) return latest;
    }
    return null;
  };

  const isMapReplayLabel = (label: string): boolean => {
    const normalized = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return /\b(carte|map|خريطة)\b/.test(normalized) && /(resultat|results?|voir|montre|show|view|affiche|اعرض|أرني)/.test(normalized);
  };

  const sendFollowup = (label: string, followupId: string) => {
    // Une relance déjà utilisée dans la conversation n'est plus reproposée ensuite.
    setUsedFollowupIds((prev) => (prev.includes(followupId) ? prev : [...prev, followupId]));
    if (isMapReplayLabel(label)) {

      const lastMap = findLastMapPayload();
      if (lastMap) {
        setOpenMap(lastMap);
        return;
      }
    }
    send(label, undefined, followupId);
  };

  const voiceLang = lang === "en" ? "en-US" : lang === "ar" ? "ar-MA" : "fr-FR";
  const voice = useVoiceSearch({
    lang: voiceLang,
    onTranscript: (keywords, spoken) => {
      const text = (spoken || keywords || "").trim();
      if (!text) return;
      send(text);
    },
    onError: (message) => setError(message),
  });

  const pendingSendRef = useRef<string | null>(null);
  const startNewConversation = () => {
    const pending = input.trim();
    try { window.localStorage.removeItem(storageKey); } catch { /* noop */ }
    restoredRef.current = false;
    sessionIdRef.current = newSessionId();
    messageIndexRef.current = 0;
    setInput("");
    setError(null);
    setOpenMap(null);
    setOpenEvents(null);
    setOpenBusinessId(null);
    setActiveSuggestionId(null);
    setUsedFollowupIds([]);
    pendingSendRef.current = pending || null;

    setChatKey((k) => k + 1); // resets useChat id → clears message list
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // After a "Nouvelle conversation" reset, if the user had typed a question,
  // send it as the first message of the new thread.
  useEffect(() => {
    const pending = pendingSendRef.current;
    if (!pending) return;
    pendingSendRef.current = null;
    const t = setTimeout(() => { try { send(pending); } catch { /* noop */ } }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatKey]);

  // Quand un fond personnalisé est demandé (couleur du widget ou transparent),
  // on neutralise les fonds opaques pour laisser passer celui du site hôte.
  const bg = customBg ? "bg-transparent" : theme === "light" ? "bg-white" : "bg-neutral-950";
  const surface = customBg
    ? `bg-transparent ${activeBgInk === "dark" ? "text-neutral-900" : "text-neutral-100"}`
    : theme === "light" ? "bg-white text-neutral-900" : "bg-neutral-950 text-neutral-100";
  const userBubble = theme === "light" ? "bg-neutral-900 text-white" : "bg-white text-neutral-900";
  const asstBubble = theme === "light" ? "bg-neutral-100 text-neutral-900" : "bg-neutral-800 text-neutral-50";
  const border = theme === "light" ? "border-neutral-200" : "border-neutral-800";
  const inputBg = theme === "light" ? "bg-white" : "bg-neutral-900";
  const cardBg = theme === "light" ? "bg-white border border-neutral-200" : "bg-neutral-900 border border-neutral-800";
  // Encre réellement lisible : avec un fond personnalisé, elle dépend de la couleur du fond.
  const lightInk = customBg ? activeBgInk === "dark" : theme === "light";
  // Sur fond noir / transparent sombre : tous les textes en blanc pur (jamais de gris).
  const whiteInk = lightInk ? "" : "text-white";
  // Puces (suggestions / relances) : contraste explicite, jamais de texte clair sur fond clair.
  const chipBg = lightInk
    ? "bg-neutral-100 border border-neutral-300 text-neutral-900"
    : "bg-neutral-900 border border-neutral-700 text-neutral-100";
  // Puces : en mode clair, intérieur « mode sombre » / texte « mode clair ».
  // En mode sombre, l'inverse : intérieur « mode clair » et texte foncé.
  const hasAffiliateColors = !!(widgetColors.dark && widgetColors.light);
  const chipStyle: React.CSSProperties | undefined = hasAffiliateColors
    ? theme === "light"
      ? { background: widgetColors.dark!, color: widgetColors.light!, borderColor: "transparent" }
      : { background: widgetColors.light!, color: widgetColors.dark!, borderColor: "transparent" }
    : undefined;
  // Cartes des réponses IA : en mode sombre, fond en couleur « mode clair » + texte foncé.
  const cardStyle: React.CSSProperties | undefined =
    hasAffiliateColors && theme === "dark"
      ? { background: widgetColors.light!, color: widgetColors.dark!, borderColor: "transparent" }
      : undefined;
  // Intérieur des cartes : blanc uniquement si la carte n'a pas un fond clair affilié.
  const cardInk = cardStyle ? "" : whiteInk;

  // Build conversation-wide dictionaries of businesses cited across all assistant messages.
  // - richByName: full rich data (images, coords, ratings) coming from a SHOW_ON_MAP payload.
  // - knownByName: minimal {id, slug, name} coming from a KNOWN_BUSINESSES marker.
  const { richByName, knownByName, destByName, allDestinations } = useMemo(() => {
    const rich = new Map<string, MapPanelBusiness>();
    const known = new Map<string, KnownBusiness>();
    const dests = new Map<string, DestinationCard>();
    const destList: DestinationCard[] = [];
    for (const m of messages) {
      if ((m as any).role !== "assistant") continue;
      const raw = messageText(m as any);
      const { maps, known: k, destinations: ds } = extractPayloads(raw);
      for (const p of maps) {
        for (const b of p.businesses || []) {
          if (b?.name) rich.set(String(b.name).toLowerCase().trim(), b);
        }
      }
      for (const b of k) {
        if (b?.name) known.set(String(b.name).toLowerCase().trim(), b);
      }
      for (const dp of ds) {
        for (const d of dp.destinations || []) {
          if (d?.name && !dests.has(String(d.name).toLowerCase().trim())) {
            dests.set(String(d.name).toLowerCase().trim(), d);
            destList.push(d);
          }
        }
      }
    }
    return { richByName: rich, knownByName: known, destByName: dests, allDestinations: destList };
  }, [messages]);

  // Find businesses cited in a text (by name match), preserving order & deduped.
  const findCitedBusinesses = (text: string): MapPanelBusiness[] => {
    if (!text) return [];
    const lower = text.toLowerCase();
    const found: Array<{ b: MapPanelBusiness; at: number }> = [];
    const seen = new Set<string>();
    for (const [nameLower, b] of richByName.entries()) {
      if (seen.has(b.id)) continue;
      const at = lower.indexOf(nameLower);
      if (at >= 0) { found.push({ b, at }); seen.add(b.id); }
    }
    found.sort((a, b) => a.at - b.at);
    return found.map((x) => x.b);
  };

  const renderCarousel = (businesses: MapPanelBusiness[], onOpenMap?: () => void) => {
    const items: EmbedCardItem[] = businesses.slice(0, 20).map((b) => {
      const img = (b.images?.[0] || (b as any).logo_url) as string | undefined;
      const loc = b.neighborhood || "";
      const ratingOn20 = computeWeightedRatingOn20(collectRatingSources(b as any));
      const reviewCount = getTotalReviewCount(b as any) || (b.google_review_count ?? null);
      let distStr: string | null = null;
      if (hostLocation && b.latitude != null && b.longitude != null) {
        const R = 6371;
        const dLat = ((b.latitude - hostLocation.lat) * Math.PI) / 180;
        const dLon = ((b.longitude - hostLocation.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((hostLocation.lat * Math.PI) / 180) *
            Math.cos((b.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distStr = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
      }
      return {
        key: b.id,
        image: img,
        title: b.name,
        subtitle: loc || null,
        badge: distStr,
        extra:
          ratingOn20 != null ? (
            <div className="mt-0.5 flex items-center gap-1 text-[12px] text-white min-w-0">
              <span style={{ color: "#D4AF37" }}>★</span>
              <span className="font-semibold shrink-0">{Number(ratingOn20).toFixed(1)}/20</span>
              {reviewCount ? (
                <span className="text-white/70 truncate">· {reviewCount} avis</span>
              ) : null}
            </div>
          ) : null,
        onClick: () => {
          setOpenSiblings(businesses.slice(0, 20).map((x) => x.id));
          setOpenBusinessId(b.id);
        },
      };
    });
    return (
      <EmbedCardCarousel
        items={items}
        footer={
          onOpenMap ? (
            <button
              type="button"
              onClick={onOpenMap}
              className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-[#C24B3F] hover:underline"
            >
              <MapPin className="w-3.5 h-3.5" /> {L.viewMap}
            </button>
          ) : null
        }
      />
    );
  };

  // Custom <strong> renderer: bold + clickable when the label matches a cited business.
  const StrongCited = ({ children }: { children?: React.ReactNode }) => {
    const text = String(Array.isArray(children) ? children.join("") : children ?? "").trim();
    const key = text.toLowerCase();
    const dest = destByName.get(key);
    if (dest) {
      return (
        <button
          type="button"
          onClick={() => setOpenDestinationId(dest.id)}
          className="font-bold underline decoration-dotted underline-offset-2 hover:decoration-solid text-[#C24B3F] cursor-pointer"
        >
          {children}
        </button>
      );
    }
    const rich = richByName.get(key);
    const meta = rich || knownByName.get(key);
    if (!meta) return <strong>{children}</strong>;
    return (
      <button
        type="button"
        onClick={() => {
          if (rich) {
            const siblings = Array.from(richByName.values()).map((b) => b.id);
            setOpenSiblings(siblings);
          } else {
            setOpenSiblings([meta.id]);
          }
          setOpenBusinessId(meta.id);
        }}
        className="font-bold underline decoration-dotted underline-offset-2 hover:decoration-solid text-[#C24B3F] cursor-pointer"
      >
        {children}
      </button>
    );
  };

  return (
    <div
      dir={dir}
      className={`fixed inset-0 flex flex-col ${surface} ${theme === "dark" ? "dark" : ""} transition-[right] duration-300 ease-out ${openBusinessId ? "lg:right-1/2" : ""}`}
      style={
        bgTransparent && !activeWidgetBg
          ? undefined
          : activeWidgetBg
          ? { background: activeWidgetBg, colorScheme: theme === "light" ? "light" : "dark" }
          : undefined
      }
    >
      <header className={`px-4 py-3 border-b ${border} flex items-center gap-3`}>
        {inFloatingPanel && (
          <button
            type="button"
            onClick={() => {
              try { window.parent?.postMessage({ type: "owm-embed-close" }, "*"); } catch { /* noop */ }
            }}
            title={lang === "en" ? "Close" : lang === "ar" ? "إغلاق" : "Fermer"}
            aria-label={lang === "en" ? "Close" : lang === "ar" ? "إغلاق" : "Fermer"}
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${border} ${
              lightInk ? "bg-black/5 text-neutral-900 border-neutral-300" : "bg-white/10 text-neutral-100"
            } opacity-80 hover:opacity-100 transition-opacity`}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="w-8 h-8 rounded-full bg-[#C24B3F] flex items-center justify-center text-white text-sm font-semibold">
          {((assistantNameParam || assistantTitle || businessName) || "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`font-semibold truncate text-sm ${whiteInk}`}>{assistantNameParam || assistantTitle || businessName || "…"}</div>
          <div className={`text-[11px] truncate ${whiteInk || "opacity-60"}`}>{L.hint}</div>
        </div>
        <button
          type="button"
          onClick={startNewConversation}
          disabled={streaming}
          title={lang === "en" ? "New conversation" : lang === "ar" ? "محادثة جديدة" : "Nouvelle conversation"}
          aria-label={lang === "en" ? "New conversation" : lang === "ar" ? "محادثة جديدة" : "Nouvelle conversation"}
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${border} ${whiteInk} hover:opacity-100 transition-opacity disabled:opacity-40`}
        >
          <MessageSquarePlus className="w-4 h-4" />
        </button>
        {!noTheme && (
          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={theme === "light" ? "Dark mode" : "Light mode"}
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${border} opacity-70 hover:opacity-100 transition-opacity`}
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        )}
      </header>

      <div ref={scrollRef} className={`flex-1 overflow-y-auto px-4 py-4 space-y-3 ${bg} relative`}>
        {(() => {
          // Sticky pill : reprend la dernière question de l'utilisateur pour rester
          // visible en haut à droite pendant qu'on lit la réponse / la relance.
          if (messages.length < 2) return null;
          let lastUser: UIMessage | null = null;
          for (let k = messages.length - 1; k >= 0; k--) {
            if (messages[k].role === "user") { lastUser = messages[k]; break; }
          }
          if (!lastUser) return null;
          const txt = messageText(lastUser).trim();
          if (!txt) return null;
          return (
            <div className="sticky top-0 z-20 flex justify-end pointer-events-none -mt-2 mb-1">
              <div
                className={`pointer-events-auto max-w-[70%] rounded-full px-3 py-1.5 text-[11px] font-medium shadow-md border ${border} backdrop-blur-md truncate ${theme === "light" ? "" : "text-white"}`}
                style={{
                  background: theme === "light" ? "rgba(255,255,255,0.85)" : "rgba(20,20,20,0.75)",
                }}
                title={txt}
              >
                <span className={`mr-1 ${theme === "light" ? "opacity-60" : "text-white"}`}>↳</span>{txt}
              </div>
            </div>
          );
        })()}
        {messages.map((m, i) => {
          if (m.role === "user") {
            return (
              <div key={m.id || i} className="flex justify-end">
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${userBubble}`}>
                  <div className="whitespace-pre-wrap">{messageText(m)}</div>
                </div>
              </div>
            );
          }
          const raw = messageText(m);
          const { clean, maps, events, articles, destinations, pinned, weather, videoFeeds, tides } = extractPayloads(raw);
          const mapPayload = maps[maps.length - 1] || null;
          const eventsPayload = events[events.length - 1] || null;
          const articleCard = articles[articles.length - 1] || null;
          const destinationsPayload = destinations[destinations.length - 1] || null;
          const pinnedCards = pinned;
          const weatherPayload = weather[weather.length - 1] || null;
          const videoFeedPayload = videoFeeds[videoFeeds.length - 1] || null;
          const tidesCity = tides[tides.length - 1] || null;
          const isLast = i === messages.length - 1;
          const citedFallback =
            !mapPayload || mapPayload.businesses.length === 0
              ? findCitedBusinesses(clean)
              : [];
          return (
            <div key={m.id || i} className="flex flex-col items-start gap-2">
              {articleCard && articleCard.inline ? (
                <div className={`w-full max-w-[85%] rounded-2xl overflow-hidden ${cardBg}`} style={cardStyle}>
                  <a
                    href={articleCard.kind === "video_feed" ? (articleCard.url || `/videos/${articleCard.slug}`) : `/embed/ask/${slug}/article/${articleCard.slug}`}
                    target={articleCard.kind === "video_feed" ? "_blank" : undefined}
                    rel={articleCard.kind === "video_feed" ? "noopener noreferrer" : undefined}
                    className="block relative w-full aspect-[16/7] bg-neutral-800 group"
                  >
                    {articleCard.hero || articleCard.image ? (
                      <img
                        src={(articleCard.hero || articleCard.image) as string}
                        alt={articleCard.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <span className="inline-block text-[10px] uppercase tracking-wide text-[#D4AF37] font-semibold mb-1">
                        {lang === "en" ? "Editorial pick" : lang === "ar" ? "اختيار تحريري" : "Sélection éditoriale"}
                      </span>
                      <div className="text-white text-lg sm:text-xl font-bold leading-tight drop-shadow">
                        {articleCard.title}
                      </div>
                      {articleCard.hook && (
                        <div className="text-white/90 text-xs sm:text-sm mt-1 italic drop-shadow">
                          {articleCard.hook}
                        </div>
                      )}
                    </div>
                  </a>
                  {(articleCard.tldr || articleCard.intro) && (
                    <div className="p-4 space-y-3">
                      {articleCard.tldr && (
                        <div className={`rounded-lg p-3 border ${border}`} style={{ background: theme === "light" ? "rgba(196,75,63,0.06)" : "rgba(212,175,55,0.08)" }}>
                          <div className="text-[10px] uppercase tracking-wide font-bold mb-1" style={{ color: "#D4AF37" }}>
                            {lang === "en" ? "In brief" : lang === "ar" ? "باختصار" : "En bref"}
                          </div>
                          <div className={`text-sm leading-relaxed ${cardInk}`}>{articleCard.tldr}</div>
                        </div>
                      )}
                      {articleCard.intro && (
                        <div className={`text-sm leading-relaxed whitespace-pre-line ${cardInk || "opacity-90"}`}>
                          {articleCard.intro}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}


              {articleCard?.inline && mapPayload && mapPayload.businesses.length > 0 && (() => {
                const resultPois = mapPayload.businesses
                  .filter((b) => b.latitude != null && b.longitude != null)
                  .map((b) => ({
                    id: b.id,
                    name: b.name,
                    latitude: b.latitude as number,
                    longitude: b.longitude as number,
                    images: Array.isArray(b.images) ? (b.images as string[]) : [],
                    city: b.city ?? null,
                    neighborhood: b.neighborhood ?? null,
                    // Mêmes signaux que l'overlay POI du slidepanel (note /20 + total avis).
                    avgOn20: (b as any).computed_rating ?? null,
                    totalReviews: (b as any).total_review_count ?? (b as any).google_review_count ?? 0,
                  }));
                const hostPoi = hostLocation && businessId
                  ? [{
                      id: businessId,
                      name: businessName || "",
                      latitude: hostLocation.lat,
                      longitude: hostLocation.lng,
                      images: [] as string[],
                      city: businessCity,
                      neighborhood: null as string | null,
                      avgOn20: null as number | null,
                      totalReviews: 0,
                      markerColor: { bg: "#000000", fg: "#ffffff", border: "#000000" },
                    }]
                  : [];
                const pois = [...hostPoi, ...resultPois.filter((p) => p.id !== businessId)];
                if (pois.length === 0) return null;
                return (
                  <div className="w-full max-w-[85%] relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800" style={{ height: 340 }}>
                    <Suspense fallback={<div className="w-full h-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-xs opacity-60">Chargement de la carte…</div>}>
                      <PoiGoogleMap
                        pois={pois as any}
                        selectedPoiId={null}
                        center={hostLocation || undefined}
                        distanceOrigin={hostLocation || null}
                        onPoiClick={(id) => { setOpenSiblings(pois.map((p) => p.id)); setOpenBusinessId(id); }}
                        fitToMarkers
                        mapTheme={theme === "dark" ? "default-dark" : "default-light"}
                        baseColor={activeWidgetBg || null}
                        showLayerControls
                      />
                    </Suspense>
                    <button
                      type="button"
                      onClick={() => setOpenMap(mapPayload)}
                      className="absolute top-2 right-2 z-[5] w-9 h-9 rounded-full bg-white/95 dark:bg-neutral-900/95 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shadow hover:scale-105 transition-transform"
                      aria-label={lang === "en" ? "Fullscreen map" : lang === "ar" ? "خريطة كاملة الشاشة" : "Carte plein écran"}
                      title={lang === "en" ? "Fullscreen map" : lang === "ar" ? "خريطة كاملة الشاشة" : "Carte plein écran"}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })()}

              <div className={`${articleCard?.inline ? "max-w-full w-full" : "max-w-[85%]"} rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${asstBubble}`} style={cardStyle}>
                <div className={`prose prose-sm max-w-none ${cardStyle ? "text-current prose-p:text-current prose-li:text-current prose-ul:text-current prose-headings:text-current prose-strong:text-current" : "dark:prose-invert"} prose-p:my-2 prose-ul:my-1 ${articleCard?.inline ? "prose-hr:my-6 prose-hr:border-neutral-300 dark:prose-hr:border-neutral-700" : ""}`}>
                  <ReactMarkdown
                    components={{
                      strong: StrongCited as any,
                      ...(articleCard?.inline
                        ? {
                            blockquote: (({ children }: any) => (
                              <figure
                                className={`my-5 rounded-xl border-l-4 p-5 md:p-6 not-italic ${
                                  theme === "dark"
                                    ? "bg-white/5 border-[#D4AF37]/70"
                                    : "bg-[#F2E4CC]/70 border-[#C04F17]/70"
                                }`}
                              >
                                <div
                                  className={`text-base md:text-lg leading-relaxed italic ${theme === "dark" ? "text-white/90" : "text-neutral-900/90"}`}
                                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                                >
                                  {children}
                                </div>
                              </figure>
                            )) as any,
                          }
                        : {}),
                    }}
                  >
                    {clean || (streaming && isLast ? "…" : "")}
                  </ReactMarkdown>
                </div>
              </div>

              {weatherPayload && (
                <EmbedWeatherWidget data={weatherPayload} lang={lang} />
              )}

              {tidesCity && (
                <div className="w-full max-w-[85%]">
                  <AiTidesWidget city={tidesCity} lang={lang} />
                </div>
              )}

              {pinnedCards.length > 0 && (
                <div className="w-full max-w-[85%] flex flex-col gap-3">
                  {pinnedCards.map((p) => {
                    const telHref = p.phone ? `tel:${p.phone.replace(/\s+/g, "")}` : null;
                    const waRaw = (p.whatsapp || p.phone || "").replace(/[^\d+]/g, "").replace(/^\+/, "");
                    const waHref = waRaw ? `https://wa.me/${waRaw}` : null;
                    const loc = [p.neighborhood, p.city].filter(Boolean).join(" · ");
                    const stars = p.rating20 != null ? (p.rating20 / 4).toFixed(1) : null;
                    return (
                      <div
                        key={p.id}
                        className={`relative rounded-2xl overflow-hidden border ${border} ${cardBg}`}
                        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", ...(cardStyle || {}) }}
                      >
                        <div className="flex gap-3 p-3">
                          <button
                            type="button"
                            onClick={() => { setOpenSiblings([p.id]); setOpenBusinessId(p.id); }}
                            className="shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-neutral-800"
                          >
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/40 text-xs">—</div>
                            )}
                          </button>
                          <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded" style={{ background: "#D4AF37", color: "#000" }}>
                                {lang === "en" ? "Recommended by the host" : lang === "ar" ? "مُوصى به من المضيف" : "Recommandé par l'hôte"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setOpenSiblings([p.id]); setOpenBusinessId(p.id); }}
                              className="text-left font-bold text-[15px] leading-tight hover:underline decoration-dotted underline-offset-2 text-[#C24B3F] break-words"
                            >
                              {p.name}
                            </button>
                            {loc && <div className={`text-[11px] truncate ${cardInk || "opacity-70"}`}>{loc}</div>}
                            {p.rating20 != null && (
                              <div className={`flex items-center gap-1.5 text-[12px] ${cardInk}`}>
                                <span className="font-bold">{p.rating20.toFixed(1)}/20</span>
                                {stars && <span className={cardInk || "opacity-60"}>· ★ {stars}/5</span>}
                                {p.review_count != null && p.review_count > 0 && (
                                  <span className={cardInk || "opacity-60"}>· {p.review_count} {lang === "en" ? "reviews" : lang === "ar" ? "مراجعة" : "avis"}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {p.review?.text && (
                          <div className="px-3 pb-3">
                            <div className={`rounded-lg p-2.5 text-[12px] leading-relaxed border ${border}`} style={theme === "light" ? { background: "rgba(0,0,0,0.03)" } : { background: "#FFFFFF", color: "#000000" }}>
                              <div className="italic opacity-90">« {p.review.text} »</div>
                              {p.review.author && (
                                <div className="mt-1 text-[10px] opacity-60">
                                  — {p.review.author}{p.review.source ? ` · ${p.review.source}` : ""}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {(telHref || waHref) && (
                          <div className={`flex border-t ${border}`}>
                            {telHref && (
                              <a
                                href={telHref}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold hover:opacity-80 transition-opacity ${waHref ? `border-r ${border}` : ""}`}
                              >
                                📞 {lang === "en" ? "Call" : lang === "ar" ? "اتصال" : "Appeler"}
                              </a>
                            )}
                            {waHref && (
                              <a
                                href={waHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold hover:opacity-80 transition-opacity"
                                style={{ color: "#25D366" }}
                              >
                                💬 WhatsApp
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {mapPayload && mapPayload.businesses.length > 0 &&
                renderCarousel(mapPayload.businesses, () => setOpenMap(mapPayload))}

              {citedFallback.length > 0 && renderCarousel(citedFallback)}

              {destinationsPayload && destinationsPayload.destinations.length > 0 && (
                <EmbedCardCarousel
                  items={destinationsPayload.destinations.slice(0, 20).map((d) => {
                    const distStr =
                      d.distKm != null
                        ? d.distKm < 1
                          ? `${Math.round(d.distKm * 1000)} m`
                          : `${d.distKm.toFixed(1)} km`
                        : null;
                    return {
                      key: d.id,
                      image: d.image,
                      title: d.name,
                      badge: distStr,
                      onClick: () => setOpenDestinationId(d.id),
                    };
                  })}
                />
              )}

              {eventsPayload && eventsPayload.events.length > 0 && (() => {
                // Même logique que /search #Agenda (formatEventDateRange / formatDaysOfWeek / formatTimeRange)
                // mais localisée FR/EN/AR.
                const locale = lang === "en" ? "en-GB" : lang === "ar" ? "ar-MA" : "fr-FR";
                const fmtDate = (d: string) => {
                  try {
                    return new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
                  } catch { return d; }
                };
                const formatEventDateRange = (start?: string | null, end?: string | null): string | null => {
                  if (start && end && start !== end) return `${fmtDate(start)} → ${fmtDate(end)}`;
                  if (start) return fmtDate(start);
                  if (end) return fmtDate(end);
                  return null;
                };
                // Jours: la DB stocke des noms textuels ("monday"/"lundi"...). On mappe -> index 0-6.
                const DAY_INDEX: Record<string, number> = {
                  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
                  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
                };
                const DAY_LABELS: Record<string, string[]> = {
                  fr: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
                  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                  ar: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
                };
                const formatDaysOfWeek = (days?: any[] | null): string | null => {
                  if (!days || !days.length) return null;
                  const labels = DAY_LABELS[lang] || DAY_LABELS.fr;
                  return days
                    .map((d) => {
                      if (typeof d === "number" && Number.isFinite(d)) return labels[d % 7];
                      const key = String(d).trim().toLowerCase();
                      const idx = DAY_INDEX[key];
                      return typeof idx === "number" ? labels[idx] : String(d);
                    })
                    .join(" · ");
                };
                const formatTimeRange = (start?: string | null, end?: string | null): string | null => {
                  const trim = (t: string) => (t.length >= 5 ? t.slice(0, 5) : t);
                  if (!start && !end) return null;
                  if (start && end) return `${trim(start)} → ${trim(end)}`;
                  return start ? trim(start) : end ? trim(end) : null;
                };
                const items: EmbedCardItem[] = eventsPayload.events.slice(0, 20).map((ev, idx) => {
                  const dateStr = formatEventDateRange(ev.start_date, ev.end_date);
                  const daysStr = formatDaysOfWeek(ev.days_of_week);
                  const timeStr = formatTimeRange(ev.start_time, ev.end_time);
                  const overline = (dateStr || daysStr || timeStr) ? (
                    <div className="flex flex-col gap-0.5" dir={lang === "ar" ? "rtl" : "ltr"}>
                      {dateStr && <div className="break-words">{dateStr}</div>}
                      {daysStr && <div className="break-words normal-case">{daysStr}</div>}
                      {timeStr && <div className="break-words">{timeStr}</div>}
                    </div>
                  ) : null;
                  const bizName = ev.business_name || null;
                  const bizId = ev.default_business_id || null;
                  const titlePrefix = (bizName && bizId) ? (
                    <span
                      role="link"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); setOpenSiblings([bizId]); setOpenBusinessId(bizId); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setOpenSiblings([bizId]); setOpenBusinessId(bizId); } }}
                      className="text-[11px] font-semibold text-white/95 underline underline-offset-2 hover:text-[#D4AF37] cursor-pointer break-words"
                    >
                      {bizName}
                    </span>
                  ) : null;
                  return {
                    key: ev.id + idx,
                    image: ev.image,
                    fallbackIcon: <CalendarIcon className="w-10 h-10" />,
                    overline,
                    titlePrefix,
                    title: ev.name,
                    subtitle: ev.neighborhood || null,
                    onClick: () => setOpenEvents({ list: eventsPayload.events, index: idx }),
                  };
                });
                return (
                  <EmbedCardCarousel
                    items={items}
                    footer={
                      <button
                        type="button"
                        onClick={() => setOpenEvents({ list: eventsPayload.events, index: 0 })}
                        className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-[#C24B3F] hover:underline"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" /> {L.events} · {eventsPayload.events.length}
                      </button>
                    }
                  />
                );
              })()}

              {/* Feed vidéo curaté : miniatures 9/16, ouverture du slidepanel vidéo
                  (swipe vertical) — même composant que /videos/:slug. */}
              {videoFeedPayload && videoFeedPayload.videos.length > 0 && (
                <EmbedCardCarousel
                  items={videoFeedPayload.videos.map((v) => ({
                    key: v.id,
                    image: v.thumbnailUrl || null,
                    title: v.title || v.businessName || "Vidéo",
                    badge: v.businessName || null,
                    onClick: () => {
                      setVideoFeedList(videoFeedPayload.videos);
                      setFeedVideoTime(0);
                      setActiveFeedVideoId(v.id);
                    },
                  }))}
                />
              )}

              {/* Article recommandé : jamais une réponse — simple option cliquable,
                  affichée APRÈS le carrousel de miniatures des résultats. */}
              {articleCard && !articleCard.inline && (
                <a
                  href={articleCard.kind === "video_feed" ? (articleCard.url || `/videos/${articleCard.slug}`) : `/embed/ask/${slug}/article/${articleCard.slug}`}
                  target={articleCard.kind === "video_feed" ? "_blank" : undefined}
                  rel={articleCard.kind === "video_feed" ? "noopener noreferrer" : undefined}
                  className={`relative flex w-full max-w-[85%] gap-3 rounded-2xl overflow-hidden ${cardBg} hover:opacity-95 transition-opacity`}
                  style={cardStyle}
                >
                  {articleCard.image ? (
                    <img src={articleCard.image} alt={articleCard.title} className="w-24 h-24 object-cover flex-shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-24 h-24 bg-neutral-800 flex-shrink-0" />
                  )}
                  <div className="flex-1 py-2 pr-3 flex flex-col justify-center gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-[#D4AF37] font-semibold">
                      {articleCard.kind === "video_feed"
                        ? (lang === "en" ? "Recommended video page" : lang === "ar" ? "صفحة فيديو موصى بها" : "Page vidéo recommandée")
                        : (lang === "en" ? "Recommended article" : lang === "ar" ? "مقال موصى به" : "Article recommandé")}
                    </span>
                    <div className={`text-sm font-semibold leading-snug line-clamp-3 ${cardInk}`}>{articleCard.title}</div>
                  </div>
                </a>
              )}


              {(() => {
                if (!(i > 0 && !streaming && activeFollowups.length > 0)) return null;
                const priorCount =
                  (mapPayload?.businesses?.length ?? 0) ||
                  citedFallback.length ||
                  (destinationsPayload?.destinations?.length ?? 0) ||
                  pinnedCards.length;
                const isBestRated = (label: string) =>
                  /(le mieux not|la mieux not|meilleure? note|top not|le mieux class)/i.test(label) ||
                  /(best|highest|top)[- ]?rated/i.test(label) ||
                  /(الأعلى تقييما|الأفضل تقييما)/.test(label);
                const filtered = activeFollowups.filter((f) => priorCount > 1 || !isBestRated(f.label));
                if (filtered.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {filtered.map((f, k) => (
                      <button
                        key={`fu-${i}-${k}`}
                        type="button"
                        onClick={() => sendFollowup(f.label, f.id)}
                        className={`text-xs px-3 py-1.5 rounded-full ${chipBg} hover:opacity-90 transition-opacity`}
                        style={{ ...chipStyle, fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "normal" }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                );
              })()}





            </div>
          );
        })}

        {status === "submitted" && (
          <div className="flex justify-start">
            <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${asstBubble}`} style={cardStyle}>
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "240ms" }} />
              </span>
            </div>
          </div>
        )}

        {messages.length <= 1 && !streaming && businessName && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((s) => {
              const label = s.label.replace(/\{businessName\}/g, businessName || "").trim();
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { send(label, s.id); }}
                  className={`text-xs px-3 py-1.5 rounded-full ${chipBg} hover:opacity-90 transition-opacity`}
                  style={{ ...chipStyle, fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "normal" }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {messages.length <= 1 && !streaming && businessName && blogArticles.length > 0 && (
          <div
            className="flex gap-3 pt-2 overflow-x-auto scrollbar-hide"
            onWheel={(e) => {
              if (e.deltaY === 0) return;
              (e.currentTarget as HTMLDivElement).scrollLeft += e.deltaY;
            }}
          >
            {blogArticles.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => send(a.title)}
                disabled={streaming || !businessName}
                className={`relative flex-shrink-0 w-44 h-64 rounded-xl overflow-hidden text-left ${cardBg} hover:opacity-95 transition-opacity disabled:opacity-60`}
              >
                {a.image ? (
                  <img src={a.image} alt={a.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                {a.isOwner && a.title.toLowerCase().includes((businessName || "").toLowerCase()) && (
                  <span
                    className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37] text-black font-semibold"
                    style={{ fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "normal" }}
                  >
                    {businessName}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <div
                    className="text-white text-xs font-semibold leading-snug line-clamp-4"
                    style={{ fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "normal" }}
                  >
                    {a.title}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {error && <div className="text-xs text-red-500">{error}</div>}
      </div>

      <div className={`px-3 pt-3 pb-1 flex justify-center ${bg}`}>
        <div className="relative flex items-center justify-center">
          <span className="absolute w-12 h-12 rounded-full border border-foreground/30 animate-[ripple_2.4s_ease-out_infinite] pointer-events-none" />
          <span className="absolute w-12 h-12 rounded-full border border-foreground/20 animate-[ripple_2.4s_ease-out_0.6s_infinite] pointer-events-none" />
          <span className="absolute w-12 h-12 rounded-full border border-foreground/10 animate-[ripple_2.4s_ease-out_1.2s_infinite] pointer-events-none" />
          <button
            type="button"
            onClick={voice.toggleRecording}
            disabled={streaming || voice.status === "processing" || !businessName}
            className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full transition-all border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] ${
              voice.status === "recording"
                ? "bg-red-500 animate-pulse"
                : voice.status === "processing"
                  ? "bg-[#194CFF]"
                  : "bg-[#194CFF] hover:bg-[#194CFF]/90"
            } disabled:opacity-50`}
            aria-label={lang === "en" ? "Voice search" : lang === "ar" ? "بحث صوتي" : "Recherche vocale"}
            title={lang === "en" ? "Voice search" : lang === "ar" ? "بحث صوتي" : "Recherche vocale"}
          >
            {voice.status === "processing" ? (
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            ) : voice.status === "recording" ? (
              <MicOff className="h-5 w-5 text-white" />
            ) : (
              <Mic className="h-5 w-5 text-white" />
            )}
          </button>
        </div>
      </div>

      <VoiceSearchOverlay
        isOpen={voice.status === "recording" || voice.status === "processing"}
        liveTranscript={voice.liveTranscript}
        audioLevel={voice.audioLevel}
        micReady={voice.micReady}
        onClose={() => voice.toggleRecording()}
        onFinish={() => voice.finishRecording()}
      />

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className={`p-3 border-t ${border} ${bg}`}>
        {messages.length > 1 && !streaming && (
          <div className="flex flex-wrap gap-2 pb-2">
            <button
              type="button"
              onClick={startNewConversation}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${cardBg} ${border} ${cardInk} hover:opacity-90`}
            >
              {SCOPE_LABELS[lang]?.newConversation ?? SCOPE_LABELS.fr.newConversation}
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 pb-2">
          <label
            htmlFor="owm-embed-radius"
            className={`text-[11px] ${theme === "light" ? "text-neutral-500" : "text-white/70"}`}
          >
            {L.radiusLabel}
          </label>
          <select
            id="owm-embed-radius"
            value={String(radiusKm)}
            onChange={(e) => applyRadius(Number(e.target.value))}
            className={`text-[11px] rounded-full border px-2 py-1 outline-none ${border} ${inputBg} ${theme === "light" ? "text-neutral-800" : "text-white"}`}
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={String(r)}>{radiusLabel(r, lang)}</option>
            ))}
          </select>
        </div>
        <div className={`flex items-end gap-2 rounded-2xl border ${border} ${inputBg} px-3 py-2`}>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            placeholder={L.placeholder}
            disabled={streaming || !businessName}
            className={`flex-1 resize-none bg-transparent outline-none text-sm max-h-32 ${theme === "light" ? "placeholder:text-neutral-400" : "text-white placeholder:text-white"}`}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim() || !businessName}
            aria-label="Send"
            className="w-8 h-8 rounded-full bg-[#C24B3F] text-white flex items-center justify-center disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {openMap && businessId ? (
        // Overlay POI du slidepanel réutilisé tel quel (carte + rail de cartes + pastilles + clic marqueur → fiche),
        // en corpus fermé : uniquement les établissements de la réponse, dans l'ordre donné.
        <div className="fixed inset-0 z-[220]">
          <Suspense fallback={null}>
            <BookOnlineSlidePanel
              key={(openMap.businesses || []).map((b) => b.id).join(",")}
              businessId={businessId}
              initialOverlay="poi"
              embedMode
              hideDirections
              mapTheme={theme === "dark" ? "default-dark" : "default-light"}
              mapBaseColor={activeWidgetBg || null}
              poiOverrideIds={(openMap.businesses || []).map((b) => b.id)}
              poiOverrideTitle={openMap.title || null}
              onClose={() => setOpenMap(null)}
            />
          </Suspense>
          <button
            type="button"
            onClick={() => setOpenMap(null)}
            aria-label="Fermer"
            className="fixed top-3 left-3 z-[300] h-9 w-9 flex items-center justify-center rounded-full bg-black text-white shadow-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <MapSlidePanel
          open={!!openMap}
          onClose={() => setOpenMap(null)}
          title={openMap?.title || undefined}
          businesses={openMap?.businesses || []}
          isMobile={isMobile}
          fullWidth
          panelBg={activeWidgetBg || undefined}
          disableUserLocation
          hostLocation={hostLocation}
          hostLabel={businessName}
          mapTheme={theme === "dark" ? "default-dark" : "default-light"}
          showLayerControls
        />
      )}


      <EventsSlidePanel
        open={!!openEvents}
        onClose={() => setOpenEvents(null)}
        items={openEvents?.list || []}
        initialIndex={openEvents?.index ?? 0}
        isMobile={isMobile}
        onOpenBusiness={(bid) => { setOpenEvents(null); setOpenBusinessId(bid); }}
      />

      {openBusinessId && (() => {
        const idx = openSiblings.indexOf(openBusinessId);
        const hasPrev = idx > 0;
        const hasNext = idx >= 0 && idx < openSiblings.length - 1;
        const goPrev = () => { if (hasPrev) setOpenBusinessId(openSiblings[idx - 1]); };
        const goNext = () => { if (hasNext) setOpenBusinessId(openSiblings[idx + 1]); };
        return (
          <EmbedBookPanelWrapper
            key={openBusinessId}
            businessId={openBusinessId}
            onClose={() => setOpenBusinessId(null)}
            onPrev={goPrev}
            onNext={goNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
          />
        );
      })()}

      {/* Slidepanel vidéo du feed curaté : swipe vertical natif de BookOnlineSlidePanel */}
      {activeFeedVideoId && (() => {
        const list = videoFeedList.map((v) => ({
          id: v.id,
          url: v.url,
          business_name: v.businessName || v.title || "",
          pageBusinessName: v.businessName ?? null,
          pageBusinessId: v.businessId ?? null,
          owner: v.businessId && v.businessName
            ? { id: v.businessId, name: v.businessName, logo_url: null, logo_bg: null }
            : null,
          social: null,
          showSocialBadge: false,
          description: v.description ?? null,
          manualCard: null,
          title: v.title ?? null,
          _isGeneric: !!v.isGeneric,
          price: v.price ?? null,
        }));
        const active = list.find((v) => v.id === activeFeedVideoId) || null;
        if (!active) return null;
        return (
          <Suspense fallback={null}>
            <HomeVideoSlidePanel
              open
              onClose={() => setActiveFeedVideoId(null)}
              activeVideo={active as any}
              activeList={list as any}
              onActiveVideoChange={(v: any) => { setActiveFeedVideoId(v.id); setFeedVideoTime(0); }}
              isActiveGeneric={!!(active as any)._isGeneric}
              currentTime={feedVideoTime}
              onTimeUpdate={setFeedVideoTime}
              returnContext={null}
              hideDirections
              hideSecondaryCtas
            />
          </Suspense>
        );
      })()}

      {openDestinationId && (
        <div
          className="fixed top-0 left-0 right-0 z-[230] bg-background shadow-2xl overflow-hidden flex flex-col animate-slide-in-right lg:left-auto lg:w-1/2 lg:border-l lg:border-border"
          style={{ height: "100dvh" }}
        >
          <Suspense fallback={<div className="flex-1" />}>
            {(() => {
              const idx = allDestinations.findIndex((d) => d.id === openDestinationId);
              const hasPrevD = idx > 0;
              const hasNextD = idx >= 0 && idx < allDestinations.length - 1;
              return (
                <DestinationSlidePanel
                  key={openDestinationId}
                  destinationId={openDestinationId}
                  onClose={() => setOpenDestinationId(null)}
                  slideFrom="right"
                  onSearchBusinessSelect={(bid) => { setOpenDestinationId(null); setOpenBusinessId(bid); }}
                  hasPrevDestination={hasPrevD}
                  hasNextDestination={hasNextD}
                  onPrevDestination={hasPrevD ? () => setOpenDestinationId(allDestinations[idx - 1].id) : undefined}
                  onNextDestination={hasNextD ? () => setOpenDestinationId(allDestinations[idx + 1].id) : undefined}
                />
              );
            })()}
          </Suspense>
        </div>
      )}
      <Suspense fallback={null}>
        <LocationPickerDialog
          open={locationOpen}
          onOpenChange={setLocationOpen}
          coords={geo.coords}
          detectedCity={geo.confirmedAddress || geo.detectedCity}
          isEnabled={geo.isEnabled}
          isDetecting={geo.isDetecting}
          hostLocation={hostLocation}
          hostLabel={businessName}
          theme={theme}
          onUseCurrentPosition={() => {
            if (!geo.isEnabled) geo.accept();
          }}
          onConfirm={(confirmedCoords, address) => {
            geo.setManualLocation(confirmedCoords, address);
          }}
          onDisableGeo={() => {
            try {
              localStorage.removeItem("geo_manual_coords");
              localStorage.removeItem("geo_manual_address");
            } catch {
              /* noop */
            }
            geo.decline();
          }}
        />
      </Suspense>
    </div>
  );
};

export default EmbedAsk;
