// Public embed: iframe-friendly, business-scoped AI concierge.
// Route: /embed/ask/:slug
// - Anonymous, no auth.
// - Streams via the Vercel AI SDK UIMessageStream protocol (useChat).
// - Parses trailing markers (SHOW_ON_MAP, EVENTS_SNAPSHOT, KNOWN_BUSINESSES)
//   from the assistant text to render the same panels as /club.
import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Send, Sun, Moon, MapPin, Calendar as CalendarIcon, MessageSquarePlus, Bed, Utensils, Wine, Coffee, ShoppingBag, Sparkles, Landmark, Camera, Play, Pause, Volume2, VolumeX, Mic, MicOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { embedBusinessQuery } from "@/lib/embedBusinessQuery";
import { collectRatingSources, computeWeightedRatingOn20, getTotalReviewCount } from "@/lib/ratingUtils";
import MapSlidePanel, { type MapPanelBusiness } from "@/components/club/MapSlidePanel";
import EventsSlidePanel from "@/components/club/EventsSlidePanel";
import type { EventPanelItem } from "@/components/club/ClubAiAssistant";
import SlidePanelHeader from "@/components/SlidePanelHeader";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";
import VoiceSearchPanel from "@/components/VoiceSearchPanel";
import { parseBookingIntent } from "@/lib/parseBookingIntent";
import EmbedFilterDrawer, { type EmbedFilterGroup } from "@/components/embed/EmbedFilterDrawer";

import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import BookingOverlay from "@/components/BookingOverlay";

const BookOnlineSlidePanel = lazy(() => import("@/components/BookOnlineSlidePanel"));
const DestinationSlidePanel = lazy(() => import("@/components/DestinationSlidePanel"));
const PoiGoogleMap = lazy(() => import("@/components/PoiGoogleMap"));
const HomeVideoSlidePanel = lazy(() => import("@/components/home/HomeVideoSlidePanel"));
const LocationPickerDialog = lazy(() => import("@/components/LocationPickerDialog"));
const YouTubeChannelsTabContent = lazy(() => import("@/pages/search/YouTubeChannelsTabContent"));

import EmbedCardCarousel, { type EmbedCardItem } from "@/components/embed/EmbedCardCarousel";
import AiBusinessResultCards from "@/components/ai/AiBusinessResultCards";
import { AI_NAME_FONT } from "@/lib/aiTypography";
import { Maximize2, X, Navigation, Clock, Star, Building2, Compass, CloudSun, MapPinned, Footprints, SlidersHorizontal } from "lucide-react";
import EmbedWeatherWidget, { type WeatherPayload } from "@/components/embed/EmbedWeatherWidget";
import AiTidesWidget from "@/components/embed/AiTidesWidget";
import AvailabilitySearchOverlay from "@/components/overlays/AvailabilitySearchOverlay";
import { searchCityHotels, type CityHotelSearchResult } from "@/lib/cityHotelSearch";
import { useGeolocation } from "@/hooks/useGeolocation";
import { applyEmbedBg, parseBg, resolveEmbedInk, parseFit, fitFlags } from "@/lib/embedFit";
import { useWidgetTracking } from "@/hooks/useWidgetTracking";
import { useWidgetParams } from "@/hooks/useWidgetParams";
import { cn } from "@/lib/utils";

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
  initialOverlay,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  businessId: string;
  initialOverlay?: "reviews";
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
            embedMode
            initialOverlay={initialOverlay}
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

/** Cas unique : suggestion embed "Le meilleur de YouTube sur le Maroc" → page /youtube. */
const YOUTUBE_PAGE_SUGGESTION_ID = "63d6d717-e344-4e1b-9865-850ac1ca9126";



const LANG_LABELS: Record<string, { placeholder: string; hint: string; opener: (name: string, radius: string) => string; platformTitle: string; platformOpener: () => string; radiusLabel: string; radiusChanged: (r: string) => string; viewMap: string; events: string; nearby: string; suggestions: string[] }> = {
  fr: {
    placeholder: "Posez votre question…",
    hint: "Assistant IA propulsé par One World Morocco",
    opener: (n, r) =>
      `Bonjour 👋 Je suis l'assistant de **${n}**. Mes recherches de proximité et de distance se calculent dans un rayon de **${r}** autour de **${n}** — vous pouvez changer ce rayon ci-dessous ou à la voix. Comment puis-je vous aider ?`,
    platformTitle: "Assistant IA One World Morocco",
    platformOpener: () =>
      `Bonjour 👋\nJe suis l'assistant One World Morocco.\nJe puise dans toute la base 1WM — restaurants, riads, sorties, activités, événements, adresses authentiques — à Marrakech, Essaouira et bientôt partout au Maroc.\nComment puis-je vous aider ?`,

    radiusLabel: "RAYON",
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
    platformTitle: "One World Morocco AI Assistant",
    platformOpener: () =>
      `Hi 👋\nI'm the One World Morocco assistant. I draw on the whole 1WM database — restaurants, riads, going out, activities, events, authentic addresses — in Marrakech, Essaouira and soon across Morocco. How can I help?`,

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
    platformTitle: "مساعد One World Morocco الذكي",
    platformOpener: () =>
      `مرحبًا 👋\nأنا مساعد One World Morocco. أستقي من قاعدة 1WM بأكملها — مطاعم، رياضات، خروجات، أنشطة، فعاليات، عناوين أصيلة — في مراكش، الصويرة وقريبًا في كل المغرب. كيف يمكنني مساعدتك؟`,

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
const COMPETITOR_GUARD_RE = /<!--COMPETITOR_GUARD_ACTIVE-->/;
const DEST_CHIPS_RE = /<!--DESTINATION_CHIPS:([\s\S]*?)-->/g;
/** Widget de disponibilité hôtelière (suggestion back-office en mode `booking`). */
const HOTEL_BOOKING_RE = /<!--HOTEL_BOOKING:([\s\S]*?)-->/g;
/** Payload du widget de disponibilité : ville + dates/voyageurs éventuellement pré-remplis. */
type BookingPayload = { city: string; checkIn: string | null; checkOut: string | null; adults: number | null };

type MapPayload = { title?: string | null; businesses: MapPanelBusiness[]; order?: string | null };
type EventsPayload = { title?: string | null; city?: string | null; events: EventPanelItem[] };
type KnownBusiness = { id: string; slug: string | null; name: string };
type ArticleCardPayload = { id: string; slug: string; title: string; image: string | null; hero?: string | null; tldr?: string | null; hook?: string | null; intro?: string | null; inline?: boolean; isOwner?: boolean; kind?: "blog" | "video_feed"; url?: string | null };
type DestinationCard = { id: string; name: string; hook?: string | null; image?: string | null; latitude?: number | null; longitude?: number | null; distKm?: number | null };
type DestinationsPayload = { title?: string | null; destinations: DestinationCard[] };
/** Chip de périmètre déterministe : porte un destination_id, jamais du texte libre. */
type ScopeChip = { id: string; name: string; count: number };
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
  social?: { platform: "instagram" | "tiktok" | "youtube"; account: string; url: string | null } | null;
  badges?: { id: string; name: string; color?: string | null; text_color?: string | null }[] | null;
};
type VideoFeedPayload = { title?: string | null; videos: VideoFeedItem[]; total?: number; badgeIds?: string[]; seed?: string };
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

function extractPayloads(text: string): { clean: string; maps: MapPayload[]; events: EventsPayload[]; known: KnownBusiness[]; articles: ArticleCardPayload[]; destinations: DestinationsPayload[]; pinned: PinnedBusinessCard[]; weather: WeatherPayload[]; videoFeeds: VideoFeedPayload[]; tides: string[]; bookings: BookingPayload[]; competitorGuard: boolean; destChips: ScopeChip[] } {
  const maps: MapPayload[] = [];
  const events: EventsPayload[] = [];
  const known: KnownBusiness[] = [];
  const articles: ArticleCardPayload[] = [];
  const destinations: DestinationsPayload[] = [];
  const pinned: PinnedBusinessCard[] = [];
  const weather: WeatherPayload[] = [];
  const videoFeeds: VideoFeedPayload[] = [];
  const tides: string[] = [];
  const bookings: BookingPayload[] = [];
  const destChips: ScopeChip[] = [];
  const competitorGuard = COMPETITOR_GUARD_RE.test(text);
  if (!text) return { clean: text, maps, events, known, articles, destinations, pinned, weather, videoFeeds, tides, bookings, competitorGuard, destChips };
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
  
  }).replace(DEST_CHIPS_RE, (_m, raw) => {
    try {
      const p = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (p && Array.isArray(p.chips)) for (const c of p.chips) if (c?.id && c?.name) destChips.push(c as ScopeChip);
    } catch { /* */ }
    return "";
  }).replace(TIDES_RE, (_m, raw) => {
    try {
      const p = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (p && (p.city || p.city_name)) tides.push(String(p.city || p.city_name));
    } catch { /* */ }
    return "";
  }).replace(HOTEL_BOOKING_RE, (_m, raw) => {
    try {
      const p = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (p && p.city) bookings.push({ city: String(p.city), checkIn: p.checkIn || null, checkOut: p.checkOut || null, adults: typeof p.adults === "number" ? p.adults : null });
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
    .replace(/<!--HOTEL_BOOKING:[\s\S]*$/g, "")
    .replace(/<!--VIDEO_FEED:[\s\S]*?-->/g, "")
    .replace(/<!--VIDEO_FEED:[\s\S]*$/g, "")
    .replace(/<!--POOL_BUSINESS_IDS:[\s\S]*?-->/g, "")
    .replace(/<!--POOL_BUSINESS_IDS:[\s\S]*$/g, "")
    .replace(/<!--COMPETITOR_GUARD_ACTIVE-->/g, "")
    .replace(/<!--DESTINATION_CHIPS:[\s\S]*?-->/g, "")
    .replace(/<!--DESTINATION_CHIPS:[\s\S]*$/g, "")
    .trim();
  clean = linkifyPhones(clean);
  return { clean, maps, events, known, articles, destinations, pinned, weather, videoFeeds, tides, bookings, competitorGuard, destChips };
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

const isBookingLabel = (text: string): boolean => {
  const t = text.toLowerCase();
  return /réserver|réservez|book|booking|reserve|reserver|reservez|احجز|حجز|billet|ticket/.test(t);
};

const MarkdownLink = ({
  href,
  children,
  openBooking,
  lightInk,
}: {
  href?: string;
  children?: React.ReactNode;
  openBooking: (url: string, label: string) => void;
  lightInk?: boolean;
}) => {
  const linkClass = lightInk ? "text-[#C24B3F]" : "text-white";
  const label = String(Array.isArray(children) ? children.join("") : children ?? "").trim();
  if (href && /^https?:\/\//.test(href) && isBookingLabel(label)) {
    return (
      <button
        type="button"
        onClick={() => openBooking(href, label)}
        className={`inline-flex items-center gap-1 font-semibold underline decoration-dotted underline-offset-2 hover:decoration-solid ${linkClass} cursor-pointer`}
      >
        {children}
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`underline decoration-dotted underline-offset-2 hover:decoration-solid ${linkClass}`}>
      {children}
    </a>
  );
};

// Clé sessionStorage partagée (définie dans src/lib/articleThreadHandoff.ts) :
// relais du fil de conversation pendant la visite d'un article (navigation
// pleine page). Consommé puis supprimé au retour.
import { ARTICLE_THREAD_HANDOFF_KEY } from "@/lib/articleThreadHandoff";

const EmbedAsk = () => {
  const { slug = "" } = useParams();
  const { params, businessId: widgetBusinessId, settings: widgetSettings, overlay } = useWidgetParams("ask", { slug });
  const lang = (["fr", "en", "ar"].includes(params.get("lang") || "") ? params.get("lang") : "fr") as "fr" | "en" | "ar";
  useWidgetTracking("ask", widgetBusinessId, lang);
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
  // Hauteur auto : le widget redimensionne l'iframe hôte pour éviter le scroll interne.
  const fit = params.get("fit") || "";
  const { fullHeight } = fitFlags(parseFit(fit));
  const autoHeight = !fullHeight && !inFloatingPanel && !overlay;
  // Nom personnalisé de l'assistant (champ éditable côté /affiliates/presence).
  const assistantNameParam = (params.get("name") || "").trim().slice(0, 60);
  // Mode « plateforme » (route /embed/ask SANS slug + ?scope=platform) :
  // assistant 1WM global, conversation NON liée à un établissement hôte.
  // `ctx` = slug du business d'origine (vidéo/fiche) : ne sert qu'à filtrer
  // les suggestions par ville/catégorie côté client — jamais envoyé au moteur.
  const isPlatform = !slug && /^(1|true|platform)$/i.test(params.get("scope") || "");
  const ctxSlug = isPlatform ? (params.get("ctx") || "").trim().slice(0, 120) : "";
  // Lien d'un article/page vidéo : en mode plateforme (pas de slug business),
  // route dédiée /embed/ask/article/:slug (même fenêtre, shell assistant) — jamais /blog/:slug.
  // La query string courante (scope, ctx, theme, panel…) est préservée pour que le
  // retour depuis l'article restaure le même habillage (dark mode, panneau flottant).
  const navigate = useNavigate();
  const articleLinkProps = (card: { kind?: string; url?: string | null; slug: string }) => {
    if (card.kind === "video_feed") {
      return { href: card.url || `/videos/${card.slug}`, target: "_blank", rel: "noopener noreferrer" } as const;
    }
    // Navigation pleine page (a href) : le composant est démonté. On dépose le fil
    // de conversation en sessionStorage pour le restaurer au retour de l'article.
    const handoff = () => {
      try {
        if (messages?.length > 1) {
          window.sessionStorage.setItem(ARTICLE_THREAD_HANDOFF_KEY, JSON.stringify({
            sessionId: sessionIdRef.current,
            messageIndex: messageIndexRef.current,
            messages,
            activeSuggestionId,
            // Résumé pour les CTA affichés après l'article (BlogArticleTemplate) :
            // disponibilité Map + reste du corpus non affiché.
            hasMap: !!(mapReplayTarget && poolInfo.hasGeo),
            moreRemaining: poolRemaining,
            savedAt: Date.now(),
          }));
        }
      } catch { /* noop */ }
    };
    const qs = typeof window !== "undefined" ? window.location.search : "";
    const embedSlug = slug || ctxSlug;
    const to = embedSlug
      ? `/embed/ask/${embedSlug}/article/${card.slug}${qs}`
      : `/embed/ask/article/${card.slug}${qs}`;
    // Navigation SPA (pas de rechargement du bundle React dans l'iframe) :
    // le fil est relayé par sessionStorage, le href reste pour l'accessibilité.
    const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      handoff();
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(to);
    };
    return { href: to, target: undefined, rel: undefined, onClick } as const;
  };
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
  /** Mode plateforme : passe à true une fois le business `ctx` (optionnel) chargé. */
  const [platformLoaded, setPlatformLoaded] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessCity, setBusinessCity] = useState<string | null>(null);
  const [businessMainCategory, setBusinessMainCategory] = useState<string | null>(null);
  const [hostLocation, setHostLocation] = useState<{ lat: number; lng: number } | null>(null);
  /** Nombre de POI liés à l'hôte : conditionne la relance dynamique « Points d'intérêt ». */
  const [hostPoiCount, setHostPoiCount] = useState<number>(0);
  /** Relances hôte déjà utilisées dans la conversation (ne se reproposent plus). */
  const [usedHostBadges, setUsedHostBadges] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const geo = useGeolocation();

  useEffect(() => {
    const h = () => setLocationOpen(true);
    window.addEventListener("open-location-picker", h);
    return () => window.removeEventListener("open-location-picker", h);
  }, []);

  type FollowupRow = { id: string; label_fr: string; label_en: string | null; label_ar: string | null; is_platform_visible?: boolean };
  type SuggestionRow = { id: string; label: string; disabled_followup_ids?: string[]; mode?: string | null };
  const [dbSuggestions, setDbSuggestions] = useState<SuggestionRow[] | null>(null);
  // Splash d'accueil supprimé : la landing IA s'affiche immédiatement, sans
  // écran intermédiaire (grand message → petit message).
  const [splashPhase] = useState<"full" | "exit" | "done">("done");
  /** Accueil IA : n'affiche que 5 chips, le CTA déplie toutes les suggestions. */
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);


  const [globalFollowups, setGlobalFollowups] = useState<FollowupRow[]>([]);
  // Sélection de l'affilié (onglet Agent IA de /affiliates/presence). null = tout activé.
  const [agentPrefs, setAgentPrefs] = useState<{ sugg: string[] | null; fu: string[] | null }>({ sugg: null, fu: null });

  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);

  // Disponibilités hôtelières (suggestion mode `booking`) : résultats SerpAPI
  // rendus inline, indexés par identifiant de message assistant.
  const [hotelResults, setHotelResults] = useState<Record<string, CityHotelSearchResult>>({});
  const [hotelSearchingMsgId, setHotelSearchingMsgId] = useState<string | null>(null);
  const runCityHotelSearch = async (msgId: string, city: string, checkIn: string, checkOut: string, adults: number) => {
    setHotelSearchingMsgId(msgId);
    try {
      const res = await searchCityHotels({ cityName: city, checkIn, checkOut, adults });
      setHotelResults((prev) => ({ ...prev, [msgId]: res }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "hotel search failed");
    } finally {
      setHotelSearchingMsgId(null);
    }
  };

  type BlogArticle = { id: string; slug: string; title: string; image: string | null; isOwner: boolean };
  const [blogArticles, setBlogArticles] = useState<BlogArticle[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const L = LANG_LABELS[lang];

  // Mode plateforme : l'assistant est prêt sans business hôte ; le titre est
  // institutionnel et la ville de référence vient du ctx, de la géoloc, sinon Marrakech.
  const assistantReady = isPlatform ? platformLoaded : !!businessName;
  const headerTitle = isPlatform ? L.platformTitle : (assistantNameParam || assistantTitle || businessName);
  const platformCity = businessCity || geo.detectedCity || "Marrakech";
  const suggestionFilterCity = isPlatform ? null : businessCity;
  const suggestionFilterCategory = isPlatform ? null : businessMainCategory;

  // --- Persistence (localStorage): survives page reload for ~7 days per slug+lang. ---
  const storageKey = `embed-ask:thread:${isPlatform ? `platform:${ctxSlug || "global"}` : slug}:${lang}`;
  // L'assistant plateforme ouvert dans un panneau vidéo doit toujours repartir
  // sur l'accueil + les suggestions back-office, même après refresh/re-ouverture.
  const shouldPersistThread = !(isPlatform && inFloatingPanel);
  const TTL_MS = 7 * 24 * 3600 * 1000;
  type PersistedThread = {
    sessionId: string;
    messageIndex: number;
    messages: any[];
    activeSuggestionId: string | null;
    /** Résumé déposé pour les CTA après l'article. */
    hasMap?: boolean;
    moreRemaining?: number;
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
  const initialPersisted = useMemo(() => {
    // Retour « Nouvelle conversation » depuis un article : on démarre à zéro,
    // le relais du fil n'est PAS restauré (il sera supprimé au seeding).
    if (/^(1|true|new)$/i.test(new URLSearchParams(window.location.search).get("postArticle") || "")) {
      return null;
    }
    // Persistance durable (localStorage) si applicable…
    if (shouldPersistThread) {
      const persisted = readPersisted();
      if (persisted) return persisted;
    }
    // …sinon relais article (sessionStorage) : déposé juste avant l'ouverture
    // d'un article, consommé après restauration effective (pas de removeItem
    // ici — le double rendu StrictMode consommerait la clé au premier passage).
    try {
      const raw = window.sessionStorage.getItem(ARTICLE_THREAD_HANDOFF_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedThread;
      if (!parsed?.sessionId || !Array.isArray(parsed.messages)) return null;
      if (Date.now() - (parsed.savedAt || 0) > TTL_MS) return null;
      return parsed;
    } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, shouldPersistThread]);

  const newSessionId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const sessionIdRef = useRef<string>(initialPersisted?.sessionId || newSessionId());
  const messageIndexRef = useRef<number>(initialPersisted?.messageIndex || 0);
  /** Dernier filtre local déclenché par l'utilisateur (pour masquer le texte IA quand inutile). */
  const lastLocalFilterRef = useRef<{ forcedRoute: string; text: string } | null>(null);
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
        // Mode plateforme : pas d'hôte — le moteur travaille sur la ville active
        // (fallback Marrakech côté moteur), surface embed conservée.
        platform: isPlatform || undefined,
        activeCity: isPlatform ? platformCity : undefined,
        language: lang,
        sessionId: sessionIdRef.current,
        messageIndex: messageIndexRef.current,
        suggestionId: (body as any)?.suggestionId ?? null,
        followupId: (body as any)?.followupId ?? null,
        scope: (body as any)?.scope ?? null,
        forcedRoute: (body as any)?.forcedRoute ?? null,
        destinationId: (body as any)?.destinationId ?? null,
        radiusKm: radiusRef.current,
      },
    }),
  }), [slug, lang, isPlatform, platformCity]);


  const { messages, sendMessage, status, setMessages } = useChat({
    id: `embed-${isPlatform ? `platform-${ctxSlug || "global"}` : slug}-${chatKey}`,
    transport,
    onError: (e) => setError(e.message),
  });

  const streaming = status === "submitted" || status === "streaming";

  // Mode plateforme : les préférences affilié (enabled_suggestion_ids) ne
  // s'appliquent pas — le périmètre est la base entière (flag Plateforme 1WM).
  const suggAllowed = isPlatform ? null : agentPrefs.sugg;
  const filteredByPrefs = dbSuggestions && suggAllowed
    ? dbSuggestions.filter((s) => suggAllowed.includes(s.id))
    : dbSuggestions;
  // Garde-fou : des prefs affilié obsolètes ne doivent jamais vider la liste.
  const filteredDbSuggestions =
    filteredByPrefs && filteredByPrefs.length === 0 && dbSuggestions && dbSuggestions.length > 0
      ? dbSuggestions
      : filteredByPrefs;
  const fallbackSuggestions = L.suggestions.map((s, i) => ({ id: `default-${i}`, label: s }));
  // Plateforme : uniquement les suggestions back-office (Plateforme 1WM active,
  // tri `sort_order`) — plus aucune liste codée en dur. Les 5 chips repliées sont
  // donc les 5 premières suggestions visibles de la table.
  const suggestions: SuggestionRow[] = isPlatform
    ? (filteredDbSuggestions ?? [])
    : filteredDbSuggestions && filteredDbSuggestions.length > 0
    ? filteredDbSuggestions
    : fallbackSuggestions;
  const visibleSuggestions = suggestions
    // Plateforme : on masque TOUTE chip dont le libellé dépend de
    // {businessName} (business-centric), même si le ctx le résoudrait.
    .filter((s) => !s.label.includes("{businessName}") || (!isPlatform && !!businessName))
    .map((s) => ({
      ...s,
      label: s.label.replace(/\{businessName\}/g, businessName || "").trim(),
    }))
    .filter((s) => s.label);
  const hasUserMessages = messages.some((m) => m.role === "user");
  /** Option B : accueil IA plein écran (logo + champ central + chips) vs conversation. */
  const homeState = isPlatform && !hasUserMessages && !streaming && assistantReady && splashPhase === "done";
  
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
    // Plateforme 1WM : seules les relances flaggées `is_platform_visible` en back-office.
    // Mode hôte : une relance dépendant de {businessName} exige un hôte pour résoudre le libellé.
    .filter((f) => isPlatform
      ? f.is_platform_visible === true
      : (![f.label_fr, f.label_en, f.label_ar].some((l) => l?.includes("{businessName}")) || !!businessName))
    .map((f) => ({ id: f.id, label: pickFollowupLabel(f) }))
    .filter((f) => f.label);



  const [openMap, setOpenMap] = useState<MapPayload | null>(null);
  const [openEvents, setOpenEvents] = useState<{ list: EventPanelItem[]; index: number } | null>(null);
  const [openBusinessId, setOpenBusinessId] = useState<string | null>(null);
  const [openBusinessOverlay, setOpenBusinessOverlay] = useState<"reviews" | null>(null);
  const [openDestinationId, setOpenDestinationId] = useState<string | null>(null);
  /** Overlay inline « Le meilleur de YouTube sur le Maroc » (variante compacte de /youtube). */
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  /** Overlay POI générique (chip « Map » permanent de l'accueil IA) : corpus complet
      des POI, ancré sur l'hôte ou sur un business `default_poi_is_master`. */
  const [openGenericPoi, setOpenGenericPoi] = useState(false);
  const [renderGenericPoi, setRenderGenericPoi] = useState(openGenericPoi);
  useEffect(() => {
    if (openGenericPoi) {
      setRenderGenericPoi(true);
    } else {
      const t = setTimeout(() => setRenderGenericPoi(false), 320);
      return () => clearTimeout(t);
    }
  }, [openGenericPoi]);
  const [poiMasterAnchorId, setPoiMasterAnchorId] = useState<string | null>(null);
  /** Ancre POI de la carte générique : le POI Koutoubia lui-même, pour que la carte
      soit centrée immédiatement sur ses coordonnées GPS (31.6237205, -7.9936196). */
  const POI_MASTER_FALLBACK_ID = "bc4b4fc1-06fc-4a69-8bea-59c8f89d924c";
  /** Ancre POI d'Essaouira : « Port d'Essaouira » joue le rôle de la Koutoubia
      quand les résultats de la carte sont exclusivement à Essaouira. */
  const POI_ESSAOUIRA_ANCHOR_ID = "81836caa-fbfc-4abd-b29e-326e56aeadf6";
  const KOUTOUBIA_ANCHOR = {
    id: POI_MASTER_FALLBACK_ID,
    name: "Koutoubia",
    city: "Marrakech",
    latitude: 31.6237205,
    longitude: -7.9936196,
    poi_radius_km: 10,
  };
  const ESSAOUIRA_ANCHOR = {
    id: POI_ESSAOUIRA_ANCHOR_ID,
    name: "Port d'Essaouira",
    city: "Essaouira",
    latitude: 31.5094232,
    longitude: -9.7728012,
    poi_radius_km: 10,
  };




  // Carte des destinations (distincte de la carte des résultats établissements) :
  // marqueurs = destinations liées à la suggestion.
  const [openDestMap, setOpenDestMap] = useState<{ title?: string | null; destinations: DestinationCard[] } | null>(null);
  // Feed vidéo (mode curaté `video_feed`) : liste active + vidéo ouverte.
  // `videoFeedCtx` porte le contexte de pagination (badges + seed du tirage au
  // sort côté base) pour charger les pages suivantes pendant le swipe.
  const [videoFeedList, setVideoFeedList] = useState<VideoFeedItem[]>([]);
  const [videoFeedCtx, setVideoFeedCtx] = useState<{ badgeIds: string[]; seed: string; total: number } | null>(null);
  const feedLoadingMoreRef = useRef(false);
  const [activeFeedVideoId, setActiveFeedVideoId] = useState<string | null>(null);
  const [feedVideoTime, setFeedVideoTime] = useState(0);

  const [openSiblings, setOpenSiblings] = useState<string[]>([]);
  // Overlay de réservation déclenché par les liens "Réservez" du markdown IA.
  const [bookingOverlayUrl, setBookingOverlayUrl] = useState<string | null>(null);
  const [bookingOverlayTitle, setBookingOverlayTitle] = useState<string>("");
  const [showBookingOverlay, setShowBookingOverlay] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isMobile = useMemo(() => typeof window !== "undefined" && window.innerWidth < 768, []);

  // Couleurs de fond des widgets définies par l'affilié (mode clair / mode sombre).
  const [widgetColors, setWidgetColors] = useState<{ light: string | null; dark: string | null }>({ light: null, dark: null });
  // Couleur de fond de la carte propriétaire (/affiliates/presence → Map).
  const [hostMapBgColor, setHostMapBgColor] = useState<string | null>(null);

  // Couleurs de l'affilié : lues via les réglages widgets (défaut global +
  // surcharge établissement), jamais depuis la fiche.
  useEffect(() => {
    if (noTheme) { setWidgetColors({ light: null, dark: null }); return; }
    setWidgetColors({
      light: widgetSettings?.bgLight || null,
      dark: widgetSettings?.bgDark || null,
    });
  }, [widgetSettings, noTheme]);


  // La couleur passée dans l'URL initialise le widget, mais le sélecteur clair/sombre
  // doit ensuite réellement basculer entre les deux couleurs enregistrées.
  const activeWidgetBg =
    (theme === "light" ? widgetColors.light : widgetColors.dark) || innerBgColor;
  const activeBgInk = resolveEmbedInk(null, activeWidgetBg);

  // Fond des cartes (overlay POI/Map) :
  //   - overlay Full Description (?preset=overlay) → couleur claire 1WM, identique partout
  //   - vraie version /embed → couleur de carte propriétaire de la fiche
  const OVERLAY_MAP_COLOR = "#ECD6B8";
  const mapBaseColor = overlay
    ? OVERLAY_MAP_COLOR
    : hostMapBgColor || activeWidgetBg || null;
  const mapThemeResolved: "light" | "default-dark" | "default-light" = mapBaseColor
    ? "light"
    : theme === "dark"
    ? "default-dark"
    : "default-light";


  useEffect(() => {
    if (!customBg) return;
    // `?bg=transparent` (avec ou sans `card=`) = la PAGE du widget doit rester
    // transparente : seul l'intérieur de la carte est coloré. Les couleurs de
    // widget enregistrées en base ne doivent jamais repeindre html/body ici.
    if (bgTransparent) return applyEmbedBg("transparent");
    return applyEmbedBg(embedBgColor || activeWidgetBg || "");
  }, [customBg, bgTransparent, embedBgColor, activeWidgetBg]);


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

  // Mode plateforme : pas d'hôte. On ne charge que le business `ctx` (ville +
  // catégorie) pour filtrer les suggestions — la conversation reste sans ancrage.
  useEffect(() => {
    if (!isPlatform) return;
    let cancelled = false;
    (async () => {
      if (ctxSlug) {
        const { data } = await (supabase as any)
          .from("businesses")
          .select("name, city, main_category")
          .eq("slug", ctxSlug)
          .eq("is_active", true)
          .maybeSingle();
        if (cancelled) return;
        // Le business `ctx` ne fournit que ville + catégorie. Son nom ne doit
        // jamais devenir l'ancrage de l'assistant plateforme ni de ses requêtes.
        setBusinessName("");
        setBusinessCity(((data as any)?.city as string) || null);
        setBusinessMainCategory(((data as any)?.main_category as string) || null);
      }
      if (!cancelled) setPlatformLoaded(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlatform, ctxSlug]);

  // Load host business
  useEffect(() => {
    if (isPlatform) return;
    let cancelled = false;
    (async () => {
      const data = await embedBusinessQuery(`ask:${slug}`, (client) =>
        (client as any)
          .from("businesses")
          .select("id, name, latitude, longitude, city, main_category, url_6_title, poi_radius_km, map_bg_color")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle()
      );
      if (cancelled) return;
      const row = (data || null) as any;
      const name = row?.name || "";
      setBusinessName(name);
      setAssistantTitle((row?.url_6_title as string) || "");
      setBusinessId((row?.id as string) || null);
      setBusinessCity((row?.city as string) || null);
      setBusinessMainCategory((row?.main_category as string) || null);
      const rawMapBg = String(row?.map_bg_color || "").trim();
      setHostMapBgColor(/^#?[0-9a-fA-F]{6}$/.test(rawMapBg) ? (rawMapBg.startsWith("#") ? rawMapBg : `#${rawMapBg}`) : null);
      const rawRadius = Number(row?.poi_radius_km);
      const hostRadius = RADIUS_OPTIONS.includes(rawRadius as any) ? rawRadius : 1;
      applyRadius(hostRadius);
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

  // POI liés à l'hôte (même source que la route poi_nearby : business_poi_businesses).
  useEffect(() => {
    if (!businessId) { setHostPoiCount(0); return; }
    let cancelled = false;
    (async () => {
      const { count } = await (supabase as any)
        .from("business_poi_businesses")
        .select("poi_business_id", { count: "exact", head: true })
        .eq("business_id", businessId);
      if (!cancelled) setHostPoiCount(Number(count || 0));
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  // Ancre du chip « Map » de l'accueil IA : sans hôte (mode plateforme), on utilise
  // un business marqué default_poi_is_master (ex. Tarik Belasri) comme ancre de
  // l'overlay POI/Map — même mécanisme que la fiche maîtresse.
  useEffect(() => {
    if (businessId || poiMasterAnchorId) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("businesses")
        .select("id")
        .eq("default_poi_is_master", true)
        .order("updated_at", { ascending: false })
        .limit(1);
      const id = Array.isArray(data) && data[0]?.id ? String(data[0].id) : null;
      if (!cancelled && id) setPoiMasterAnchorId(id);
    })();
    return () => { cancelled = true; };
  }, [businessId, poiMasterAnchorId]);

  /** Ancre de l'overlay Map (corpus fermé) : Marrakech/Koutoubia l'emporte dès
      qu'un résultat est à Marrakech ; sinon « Port d'Essaouira » si au moins un
      résultat est à Essaouira ; sinon Koutoubia par défaut. */
  const mapAnchorId = useMemo(() => {
    if (businessId) return businessId;
    const cities = (openMap?.businesses || [])
      .map((b) => String(b.city || "").trim().toLowerCase())
      .filter(Boolean);
    const hasMarrakech = cities.some((c) => c.includes("marrakech"));
    const hasEssaouira = cities.some((c) => c.includes("essaouira"));
    if (!hasMarrakech && hasEssaouira) return POI_ESSAOUIRA_ANCHOR_ID;
    return poiMasterAnchorId || POI_MASTER_FALLBACK_ID;
  }, [businessId, openMap, poiMasterAnchorId]);
  const mapAnchor = useMemo(() => {
    if (businessId) return null;
    return mapAnchorId === POI_ESSAOUIRA_ANCHOR_ID ? ESSAOUIRA_ANCHOR : KOUTOUBIA_ANCHOR;
  }, [businessId, mapAnchorId]);




  const openerText = isPlatform
    ? L.platformOpener()
    : L.opener(businessName, radiusLabel(radiusKm, lang));


  // Seed the opener as an assistant UIMessage once we know the business
  // (ou, en mode plateforme, dès que le contexte ville est prêt).
  // En panneau flottant plateforme, on force un accueil frais à chaque mount/reset :
  // pas de conservation d'un ancien état vide ou déjà consommé par le hook de chat.
  const seededChatKeyRef = useRef<number | null>(null);
  useEffect(() => {
    if (!assistantReady) return;
    if (seededChatKeyRef.current === chatKey) return;
    seededChatKeyRef.current = chatKey;
    if (restoredRef.current && initialPersisted?.messages?.length) {
      setMessages(initialPersisted.messages as any);
      if (initialPersisted.activeSuggestionId) setActiveSuggestionId(initialPersisted.activeSuggestionId);
      // Le relais article (sessionStorage) est consommé : on le supprime ici,
      // une fois les messages réellement restaurés.
      try { window.sessionStorage.removeItem(ARTICLE_THREAD_HANDOFF_KEY); } catch { /* noop */ }
      return;
    }
    // (splash d'accueil supprimé)
    // Démarrage frais : on purge un éventuel relais article restant.
    try { window.sessionStorage.removeItem(ARTICLE_THREAD_HANDOFF_KEY); } catch { /* noop */ }
    setMessages([{
      id: "opener",
      role: "assistant",
      parts: [{
        type: "text",
        text: openerText,
      }],
    } as any]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantReady, chatKey, openerText, isPlatform]);



  // Signale à la page hôte (overlay vidéo) que l'assistant est réellement prêt.
  // En mode plateforme, attendre les vraies suggestions visibles : sinon le panneau
  // parent termine son intro sur le seul message d'accueil, sans chips.
  const readyNotifiedRef = useRef(false);
  useEffect(() => {
    readyNotifiedRef.current = false;
  }, [chatKey, isPlatform]);
  useEffect(() => {
    if (readyNotifiedRef.current) return;
    // Plus aucun gating sur les suggestions : l'iframe pilote seule son message
    // d'accueil. Le parent ne doit jamais pouvoir rester bloqué.
    if (isPlatform) {
      readyNotifiedRef.current = true;
      try { window.parent?.postMessage({ type: "owm-ai-ready" }, "*"); } catch { /* noop */ }
      return;
    }
    if (!assistantReady || messages.length === 0) return;
    readyNotifiedRef.current = true;
    try { window.parent?.postMessage({ type: "owm-ai-ready" }, "*"); } catch { /* noop */ }
  }, [assistantReady, messages.length, isPlatform]);


  // Persist thread to localStorage on every change (skip while streaming to avoid spam).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!shouldPersistThread) return;
    if (!assistantReady) return;
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
  }, [messages, streaming, businessName, activeSuggestionId, shouldPersistThread]);


  // Lecture REST directe (clé anon) pour les tables publiques lues par l'embed.
  // Pourquoi : dans le preview, l'app tourne déjà dans l'iframe de l'éditeur ;
  // l'overlay IA ajoute une iframe imbriquée dont le client passe par le
  // stockage de session « broker » (postMessage vers l'éditeur). Dans ce cadre
  // imbriqué, la réponse n'arrive jamais et la requête reste bloquée
  // (« Chargement des suggestions… » infini). Ces tables sont publiques en
  // lecture (grant anon + policy is_active), la session n'est pas requise.
  const publicSelect = async (table: string, query: string): Promise<any[] | null> => {
    try {
      const base = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${base}/rest/v1/${table}?${query}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (!res.ok) return null;
      return (await res.json()) as any[];
    } catch {
      return null;
    }
  };

  // Coller dans le champ question : les retours à la ligne du texte collé
  // deviennent des espaces (sinon ils poussaient le texte hors de vue).
  const handleQuestionPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\s*\n+\s*/g, " ");
    if (!pasted) return;
    const el = e.currentTarget;
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;
    const next = (input.slice(0, start) + pasted + input.slice(end)).replace(/ {2,}/g, " ");
    setInput(next);
    requestAnimationFrame(() => {
      try {
        const pos = Math.min(next.length, start + pasted.length);
        el.setSelectionRange(pos, pos);
      } catch { /* noop */ }
    });
  };

  useEffect(() => {
    // Suggestions back-office : toujours chargées, même sans hôte résolu
    // (ex. overlay IA d'un feed vidéo dont le slug n'est pas un business actif).
    // Sans cela on retombait sur la liste de secours codée en dur (4 puces).
    // Le filtre ville/catégorie n'est appliqué que si un contexte existe.
    let cancelled = false;
    setDbSuggestions(null);
    const loadingTimeout = window.setTimeout(() => {
      if (!cancelled) setDbSuggestions([]);
    }, 8000);

    (async () => {
      const data = await publicSelect(
        "ai_suggestions",
        "select=id,label_fr,label_en,label_ar,followups,business_ids,city,main_categories,disabled_followup_ids,is_platform_visible,mode&surface=eq.embed&is_active=eq.true&order=sort_order.asc",
      );
      if (cancelled) return;
      if (!data) {
        window.clearTimeout(loadingTimeout);
        setDbSuggestions([]);
        return;
      }
      const col = lang === "en" ? "label_en" : lang === "ar" ? "label_ar" : "label_fr";
      const normCity = (s: string | null | undefined) =>
        (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const bizCity = normCity(suggestionFilterCity);
      const bizCat = normCity(suggestionFilterCategory);
      const list: SuggestionRow[] = (data as any[])
        .filter((r) => {
          // Mode plateforme 1WM : le périmètre est la base entière. Seul le flag
          // « Visible plateforme 1WM » décide — aucun filtre ville/catégorie
          // hérité du business `ctx` (sinon la liste tombait à 4 puces).
          if (isPlatform) return r.is_platform_visible === true;
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
          mode: (r.mode as string | null) ?? null,
        }))
        .filter((r) => r.label);
      window.clearTimeout(loadingTimeout);
      setDbSuggestions(list);
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimeout);
    };
  }, [lang, isPlatform, suggestionFilterCity, suggestionFilterCategory]);





  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await publicSelect(
        "ai_followups",
        "select=id,label_fr,label_en,label_ar,is_platform_visible&surface=eq.embed&is_active=eq.true&order=sort_order.asc",
      );
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
  useEffect(() => { inputRef.current?.focus(); }, [businessName, assistantReady]);

  const dir = lang === "ar" ? "rtl" : "ltr";

  const send = (overrideText?: string, suggestionId?: string, followupId?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming || !assistantReady) return;
    if (!overrideText) setInput("");
    // Suggestion back-office en mode `booking` : aucun appel modèle. On injecte
    // localement le widget de disponibilité (dates + voyageurs) de la fiche,
    // la recherche SerpAPI ville est ensuite rendue inline dans la réponse.
    const normLabel = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const normalizedText = normLabel(text);
    const isBookingLabel = [
      "reserver une chambre",
      "book a room",
      "احجز غرفة",
    ].includes(normalizedText);
    const bookingSuggestion =
      (suggestionId ? suggestions.find((s) => s.id === suggestionId && s.mode === "booking") : null) ||
      // Filet : même libellé qu'une suggestion `booking` (chip relancée, texte tapé
      // ou vocal) → on reste sur le widget de disponibilité, jamais sur le modèle.
      suggestions.find((s) => s.mode === "booking" && normLabel(s.label) === normLabel(text)) ||
      null;
    // Texte libre explicitement hôtelier (« une chambre d'hôtel pour 2 adultes
    // du 27 septembre au 2 octobre ») → widget de disponibilité + SerpAPI,
    // jamais une liste d'adresses toutes catégories produite par le modèle.
    const freeBookingIntent = !suggestionId && !followupId ? parseBookingIntent(text) : null;
    const isBookingRequest =
      suggestionId === "8150af31-304b-40af-a638-fe10535a2e15" ||
      isBookingLabel ||
      !!bookingSuggestion ||
      !!freeBookingIntent;
    if (isBookingRequest) {
      setError(null);
      setActiveSuggestionId(bookingSuggestion?.id || suggestionId || null);
      // La ville nommée dans la question prime sur la ville par défaut du widget.
      const city = freeBookingIntent?.city || platformCity || businessCity || "Marrakech";
      const checkIn = freeBookingIntent?.checkIn || null;
      const checkOut = freeBookingIntent?.checkOut || null;
      const adults = freeBookingIntent?.adults || null;
      const hasDates = !!checkIn && !!checkOut;
      const msgId = `a-booking-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: `u-booking-${Date.now()}`, role: "user", parts: [{ type: "text", text }] } as any,
        {
          id: msgId,
          role: "assistant",
          parts: [{
            type: "text",
            text: `${hasDates
              ? (lang === "en"
                  ? `Checking live availability in ${city} for your dates.`
                  : lang === "ar"
                  ? `أتحقق من التوفر في ${city} في هذه التواريخ.`
                  : `Je vérifie les disponibilités à ${city} pour ces dates.`)
              : (lang === "en"
                  ? `Choose your dates and number of guests — I'll check live availability in ${city}.`
                  : lang === "ar"
                  ? `اختر التواريخ وعدد المسافرين — سأتحقق من التوفر في ${city}.`
                  : `Choisissez vos dates et le nombre de voyageurs — je vérifie les disponibilités à ${city}.`)}\n\n<!--HOTEL_BOOKING:${JSON.stringify({ city, checkIn, checkOut, adults })}-->`,
          }],
        } as any,
      ]);
      // Dates complètes détectées → interrogation SerpAPI immédiate.
      if (hasDates) runCityHotelSearch(msgId, city, checkIn as string, checkOut as string, adults || 2);
      return;
    }
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
    // Les chips de secours (locales, pas en base) portent un id synthétique :
    // il ne doit JAMAIS partir au serveur, sinon le garde-fou plateforme rejette
    // la requête (« suggestion not available on platform »).
    const isSyntheticId = (id?: string | null) =>
      !!id && (id.startsWith("default-") || id.startsWith("platform-fallback-"));
    const realSuggestionId = isSyntheticId(suggestionId) ? null : suggestionId || null;
    if (realSuggestionId) setActiveSuggestionId(realSuggestionId);
    // Une recherche libre doit toujours être résolue depuis son propre texte.
    // L'ancienne suggestion active ne sert que de contexte à une relance explicite.
    if (!suggestionId && !followupId) setActiveSuggestionId(null);
    setError(null);
    lastLocalFilterRef.current = null;
    messageIndexRef.current += 1;
    const contextSuggestionId = isSyntheticId(activeSuggestionId) ? null : activeSuggestionId;
    const effectiveSuggestionId: string | null =
      realSuggestionId || (followupId ? contextSuggestionId : null) || null;
    sendMessage(
      { text },
      { body: { suggestionId: effectiveSuggestionId, followupId: followupId || null, scope: null } },
    );
  };

  /**
   * Filtre local déterministe (badges du footer) : le serveur applique une route
   * du catalogue partagé sur le corpus déjà affiché — zéro appel modèle.
   */
  /**
   * Chip de périmètre destination : envoie l'identifiant de la destination, pas
   * son libellé — aucune re-interprétation NLP côté moteur.
   */
  const sendDestinationScope = (chip: { id: string; name: string }) => {
    if (streaming || !assistantReady) return;
    setError(null);
    lastLocalFilterRef.current = null;
    messageIndexRef.current += 1;
    setActiveSuggestionId(null);
    sendMessage(
      { text: lang === "en" ? `In ${chip.name}` : lang === "ar" ? `في ${chip.name}` : `Dans ${chip.name}` },
      { body: { suggestionId: null, followupId: null, scope: null, destinationId: chip.id } },
    );
  };

  const sendLocalFilter = (text: string, forcedRoute: string) => {
    if (streaming || !assistantReady) return;
    setError(null);
    lastLocalFilterRef.current = { forcedRoute, text };
    messageIndexRef.current += 1;
    sendMessage(
      { text },
      { body: { suggestionId: null, followupId: null, scope: null, forcedRoute } },
    );
  };

  /**
   * Relances hôte dynamiques (météo / POI / à proximité / que faire sur place) :
   * remplacent les 4 dernières relances gérées manuellement en back-office.
   * Chaque badge ne se propose qu'une fois par conversation.
   */
  const sendHostBadge = (key: string, text: string, forcedRoute: string) => {
    if (streaming || !assistantReady || isPlatform) return;
    setUsedHostBadges((prev) => (prev.includes(key) ? prev : [...prev, key]));
    sendLocalFilter(text, forcedRoute);
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

  /**
   * Relances automatiques déterministes (badges du footer) :
   * - « Sur une carte » : rejoue le dernier corpus cartographiable (fiches, sinon
   *   établissements liés aux événements) dans l'overlay POI habituel.
   * - « Tous les résultats » : demande le lot suivant du corpus POOL_BUSINESS_IDS.
   * Aucun appel modèle pour la carte, zéro token pour le pool (route pool_more).
   */
  const mapReplayTarget = useMemo<MapPayload | null>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      const { maps, events } = extractPayloads(messageText(m));
      const latest = maps[maps.length - 1];
      if (latest && latest.businesses.some((b) => b?.latitude != null && b?.longitude != null)) {
        return latest;
      }
      const ev = events[events.length - 1];
      if (ev && ev.events.length) {
        const seen = new Set<string>();
        const businesses: MapPanelBusiness[] = [];
        for (const e of ev.events as any[]) {
          const bid = e.default_business_id ? String(e.default_business_id) : null;
          if (!bid || seen.has(bid)) continue;
          if (e.latitude == null || e.longitude == null) continue;
          seen.add(bid);
          businesses.push({
            id: bid,
            name: e.business_name || e.name,
            slug: e.business_slug ?? null,
            latitude: Number(e.latitude),
            longitude: Number(e.longitude),
            city: e.city ?? null,
            neighborhood: e.neighborhood ?? null,
            images: [],
          } as never);
        }
        if (businesses.length) return { title: ev.title ?? null, businesses };
      }
    }
    return null;
  }, [messages]);

  /**
   * Dernier marqueur POOL_BUSINESS_IDS : corpus COMPLET du tour (ids + comptes
   * par quartier calculés côté moteur sur la totalité du pool). Source unique
   * pour « Tous les résultats » et pour les badges de quartier.
   */
  const poolInfo = useMemo<{ ids: string[]; nb: Record<string, number>; hasGeo: boolean; hasHours: boolean }>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      const match = messageText(m).match(/<!--POOL_BUSINESS_IDS:([\s\S]*?)-->/);
      if (!match) continue;
      try {
        const p = JSON.parse(match[1]);
        const ids = Array.isArray(p?.ids) ? p.ids.map((x: unknown) => String(x)) : [];
        const nb = p?.nb && typeof p.nb === "object" ? (p.nb as Record<string, number>) : {};
        const hasGeo = Boolean(p?.hasGeo);
        const hasHours = Boolean(p?.hasHours);
        return { ids, nb, hasGeo, hasHours };
      } catch { /* noop */ }
      break;
    }
    return { ids: [], nb: {}, hasGeo: false, hasHours: false };
  }, [messages]);

  /** La dernière réponse assistant a-t-elle écarté des concurrents de l'hôte ? */
  const competitorGuardActive = useMemo<boolean>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      const { competitorGuard } = extractPayloads(messageText(m));
      if (competitorGuard) return true;
      // On ne regarde que le dernier message assistant.
      break;
    }
    return false;
  }, [messages]);

  /** Reste du corpus non encore affiché (marqueur POOL_BUSINESS_IDS). */
  const poolRemaining = useMemo<number>(() => {
    if (!poolInfo.ids.length) return 0;
    const shown = new Set<string>();
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      const { known } = extractPayloads(messageText(m));
      for (const b of known) shown.add(b.id);
    }
    return poolInfo.ids.filter((id) => !shown.has(id)).length;
  }, [messages, poolInfo]);

  /**
   * Retour depuis un article : rejouer les actions des CTA affichés en fin
   * d'article — Map (overlay POI du dernier corpus) puis « autres résultats »
   * (relance déterministe du pool, zéro token). Une seule action par retour.
   */
  const postArticleReplayRef = useRef(false);
  useEffect(() => {
    if (postArticleReplayRef.current) return;
    if (!(mapReplayTarget || poolRemaining > 0)) return;
    const url = new URL(window.location.href);
    // postArticle=map|more|new : « new » ne passe pas ici (accueil frais géré
    // en amont) ; map/more rejouent les CTA de fin d'article.
    const action = url.searchParams.get("postArticle") || "";
    if (!/^(1|true|new|map|more)$/i.test(action)) return;
    postArticleReplayRef.current = true;
    const isFresh = /^(1|true|new)$/i.test(action);
    url.searchParams.delete("postArticle");
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
    if (!isFresh) {
      // 1) Map — les résultats sont rejoués dans l'overlay POI.
      if (action !== "more" && mapReplayTarget) setOpenMap(mapReplayTarget);
      // 2) « autres résultats » — relance déterministe du pool, zéro token.
      if (action !== "map" && poolRemaining > 0) setTimeout(() => send("Montre-moi les autres"), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReplayTarget, poolRemaining]);



  /**
   * Filtres locaux : proches / ouverts maintenant / mieux notés se calculent sur
   * le corpus affiché (données présentes dans le payload carte), tandis que les
   * comptes par quartier viennent du CORPUS COMPLET du tour (`nb` du marqueur
   * pool, ex. 18 rooftops) — jamais des 6 fiches affichées.
   */
  /**
   * Chips de périmètre destination du dernier tour (marqueur DESTINATION_CHIPS) :
   * remplacent les propositions géographiques en texte libre du modèle.
   */
  const destScopeChips = useMemo<ScopeChip[]>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      const { destChips } = extractPayloads(messageText(m));
      return destChips;
    }
    return [];
  }, [messages]);

  /**
   * Feed vidéo curaté (mode `video_feed`, ex. suggestion « Suivez le guide ») :
   * dès que le marqueur VIDEO_FEED du dernier message assistant est complet,
   * on ouvre directement le slidepanel vidéo sur la 1re vidéo (swipe vertical),
   * au lieu d'attendre un clic sur une miniature. Une seule fois par message.
   */
  const autoOpenedFeedRef = useRef<string | null>(null);
  useEffect(() => {
    if (streaming) return;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      const { videoFeeds } = extractPayloads(messageText(m));
      const payload = videoFeeds[videoFeeds.length - 1] || null;
      if (!payload || !payload.videos.length) return;
      const key = String((m as any).id || `idx-${i}`);
      if (autoOpenedFeedRef.current === key) return;
      autoOpenedFeedRef.current = key;
      setVideoFeedList(payload.videos);
      setVideoFeedCtx(
        payload.badgeIds?.length && payload.seed
          ? { badgeIds: payload.badgeIds, seed: payload.seed, total: Number(payload.total ?? payload.videos.length) }
          : null,
      );
      feedLoadingMoreRef.current = false;
      setFeedVideoTime(0);
      setActiveFeedVideoId(payload.videos[0].id);
      return;
    }
  }, [messages, streaming]);

  /**
   * Pagination du feed vidéo : même tirage au sort (seed) et même round-robin
   * que le premier lot, servis par la source de vérité unique côté base.
   * Déclenchée pendant le swipe, à 10 vidéos de la fin.
   */
  const maybeLoadMoreFeed = useCallback(async (currentId: string) => {
    const ctx = videoFeedCtx;
    if (!ctx || feedLoadingMoreRef.current) return;
    const idx = videoFeedList.findIndex((v) => v.id === currentId);
    if (idx < 0 || idx < videoFeedList.length - 10) return;
    if (videoFeedList.length >= ctx.total) return;
    feedLoadingMoreRef.current = true;
    try {
      const { fetchBadgesVideoFeed } = await import("@/lib/badgeVideoFeed");
      const { items } = await fetchBadgesVideoFeed(ctx.badgeIds, {
        seed: ctx.seed,
        limit: 30,
        offset: videoFeedList.length,
      });
      if (items.length) {
        setVideoFeedList((prev) => {
          const seen = new Set(prev.map((v) => v.id));
          return [...prev, ...items.filter((it) => !seen.has(it.id))];
        });
      }
    } catch {
      /* pagination best-effort : le feed reste utilisable */
    } finally {
      feedLoadingMoreRef.current = false;
    }
  }, [videoFeedCtx, videoFeedList]);

  /** Clic sur une chip badge dans le viewer → relance le feed sur ce badge. */
  const selectFeedBadge = useCallback(async (badge: { id: string; name: string }) => {
    feedLoadingMoreRef.current = true;
    try {
      const { fetchBadgesVideoFeed } = await import("@/lib/badgeVideoFeed");
      const seed = Math.random().toString(36).slice(2, 10);
      const { items, total } = await fetchBadgesVideoFeed([badge.id], { seed, limit: 60 });
      if (!items.length) return;
      setVideoFeedList(items);
      setVideoFeedCtx({ badgeIds: [badge.id], seed, total });
      setFeedVideoTime(0);
      feedLoadingMoreRef.current = false;
      setActiveFeedVideoId(items[0].id);
    } catch {
      feedLoadingMoreRef.current = false;
    }
  }, []);



  const localFilters = useMemo(() => {
    const rows = (mapReplayTarget?.businesses ?? []) as any[];
    const poolNb = Object.entries(poolInfo.nb)
      .map(([name, count]) => ({ name, count: Number(count) }))
      .filter((n) => n.name && n.count > 0)
      .sort((a, b) => b.count - a.count);
    if (rows.length < 2) {
      return { closest: false, openNow: false, bestRated: false, neighborhoods: [] as Array<{ name: string; count: number }> };
    }
    const geo = rows.filter((b) => b?.latitude != null && b?.longitude != null).length;
    // Règle 1WM : horaires non publiés => considéré ouvert 24h/24 (donc évaluable).
    const withHours = rows.filter((b) => b?.is_open_24h || !b?.show_opening_hours || !!b?.opening_hours).length;

    const withRating = rows.filter((b) => (b?.computed_rating ?? b?.google_rating ?? b?.tripadvisor_rating) != null).length;
    // Repli sur le corpus affiché uniquement si le moteur n'a pas fourni `nb`
    // (anciens messages d'une conversation ouverte avant ce déploiement).
    let neighborhoods = poolNb;
    if (!neighborhoods.length) {
      const counts = new Map<string, number>();
      for (const b of rows) {
        const nb = String(b?.neighborhood || "").trim();
        if (!nb) continue;
        counts.set(nb, (counts.get(nb) ?? 0) + 1);
      }
      neighborhoods = [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    }
    // Priorité aux quartiers visibles dans les cartes affichées, puis les
    // autres quartiers du pool par volume (jusqu'à 6 badges) : un quartier
    // présent dans les résultats ne doit jamais être absent des badges.
    const shown = new Set(rows.map((b) => String(b?.neighborhood || "").trim()).filter(Boolean));
    const ordered = [
      ...neighborhoods.filter((n) => shown.has(n.name)),
      ...neighborhoods.filter((n) => !shown.has(n.name)),
    ];
    return {
      closest: geo >= 2,
      openNow: withHours >= 2,
      bestRated: withRating >= 2,
      neighborhoods: neighborhoods.length >= 2 ? ordered.slice(0, 6) : [],
    };

  }, [mapReplayTarget, poolInfo]);



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
  const voiceActive = voice.status === "recording" || voice.status === "processing";

  const pendingSendRef = useRef<string | null>(null);
  const startNewConversation = () => {
    const pending = input.trim();
    try { window.localStorage.removeItem(storageKey); } catch { /* noop */ }
    restoredRef.current = false;
    seededChatKeyRef.current = null;
    sessionIdRef.current = newSessionId();
    messageIndexRef.current = 0;
    setInput("");
    setError(null);
    setOpenMap(null);
    setOpenEvents(null);
    setOpenBusinessId(null);
    setActiveSuggestionId(null);
    setUsedFollowupIds([]);
    setUsedHostBadges([]);
    // Accueil IA : badges repliés — tiroir Filtres fermé et retour aux 6 chips
    // apparents (Map + 5 suggestions), même si « Voir toutes les suggestions »
    // avait été déplié dans la conversation précédente.
    setShowAllSuggestions(false);
    setFiltersOpen(false);
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
  // Rendu « à plat » (overlay Full Description) : `?theme=none&bg=transparent`
  // → aucun fond opaque nulle part, y compris badges/suggestions et cartes.
  const flat = noTheme && bgTransparent && !cardColor;
  const ink = (params.get("ink") || "").toLowerCase();
  const flatDarkInk = flat && ink === "dark";
  const bg = customBg ? "bg-transparent" : theme === "light" ? "bg-white" : "bg-neutral-950";
  const surface = customBg
    ? `bg-transparent ${flatDarkInk || activeBgInk === "dark" ? "text-black" : "text-white"}`
    : theme === "light" ? "bg-white text-black" : "bg-neutral-950 text-white";
  const userBubble = flat
    ? (ink === "dark" ? "bg-white/80 text-black border border-white/50" : "bg-white/10 text-white border border-white/20")
    : theme === "light" ? "bg-neutral-900 text-white" : "bg-white text-black";
  const asstBubble = flat
    ? (ink === "dark" ? "bg-transparent text-black" : "bg-transparent text-white")
    : theme === "light" ? "bg-neutral-100 text-black" : "bg-neutral-800 text-neutral-50";
  const border = flat
    ? (ink === "dark" ? "border-neutral-200" : "border-white/20")
    : theme === "light" ? "border-neutral-200" : "border-neutral-800";
  const inputBg = flat
    ? (ink === "dark" ? "bg-white/10" : "bg-white/5")
    : theme === "light" ? "bg-white" : "bg-neutral-900";
  const cardBg = flat
    ? (ink === "dark" ? "bg-white/80 border border-white/50 text-black" : "bg-transparent border border-white/15 text-white")
    : theme === "light" ? "bg-white border border-neutral-200" : "bg-neutral-900 border border-neutral-800";
  // Encre réellement lisible : avec un fond personnalisé, elle dépend de la couleur du fond.
  const lightInk = flat ? ink === "dark" : customBg ? activeBgInk === "dark" : theme === "light";
  // Sur fond noir / transparent sombre : tous les textes en blanc pur (jamais de gris).
  const whiteInk = lightInk ? "" : "text-white";
  // Puces (suggestions / relances) : contraste explicite, jamais de texte clair sur fond clair.
  const chipBg = flat
    ? (ink === "dark" ? "bg-white/80 border border-white/50 text-black" : "bg-white/10 border border-white/25 text-white")
    : lightInk
    ? "bg-neutral-100 border border-neutral-300 text-black"
    : "bg-neutral-900 border border-neutral-700 text-white";
  // Puces : en mode clair, intérieur « mode sombre » / texte « mode clair ».
  // En mode sombre, l'inverse : intérieur « mode clair » et texte foncé.
  const hasAffiliateColors = !flat && !!(widgetColors.dark && widgetColors.light);
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
  // Couleur des liens cités : terracotta sur fond clair, blanc sur fond sombre/transparent.
  // En dark mode affilié, la bulle de réponse porte `cardStyle` (fond clair affilié)
  // → ses liens doivent suivre le fond de la bulle, pas le thème de la page.
  const linkInkClass = lightInk || cardStyle ? "text-[#C24B3F]" : "text-white";

  // Badges spéciaux : couleurs de marque explicites, inversées en dark mode.
  const mapBadgeStyle: React.CSSProperties =
    { background: "#C04F17", color: "#FFFFFF", borderColor: "#C04F17" };
  const moreBadgeStyle: React.CSSProperties =
    { background: "#D4AF37", color: "#000000", borderColor: "#D4AF37" };
  const newConvStyle: React.CSSProperties =
    theme === "light"
      ? { background: "#000000", color: "#FFFFFF", borderColor: "#000000" }
      : { background: "#FFFFFF", color: "#000000", borderColor: "#FFFFFF" };

  // Build conversation-wide dictionaries of businesses cited across all assistant messages.
  // - richByName: full rich data (images, coords, ratings) coming from a SHOW_ON_MAP payload.
  // - knownByName: minimal {id, slug, name} coming from a KNOWN_BUSINESSES marker.
  const { richByName, knownByName, destByName, allDestinations, eventsByName } = useMemo(() => {
    const rich = new Map<string, MapPanelBusiness>();
    const known = new Map<string, KnownBusiness>();
    const dests = new Map<string, DestinationCard>();
    const destList: DestinationCard[] = [];
    // Titres d'événements → même liste que les vignettes du scroll horizontal.
    const evs = new Map<string, { list: EventPanelItem[]; index: number }>();
    for (const m of messages) {
      if ((m as any).role !== "assistant") continue;
      const raw = messageText(m as any);
      const { maps, known: k, destinations: ds, events: es } = extractPayloads(raw);
      for (const p of maps) {
        for (const b of p.businesses || []) {
          if (b?.name) rich.set(String(b.name).toLowerCase().trim(), b);
        }
      }
      for (const b of k) {
        if (b?.name) known.set(String(b.name).toLowerCase().trim(), b);
      }
      for (const ep of es) {
        (ep.events || []).forEach((ev, idx) => {
          if (ev?.name) evs.set(String(ev.name).toLowerCase().trim(), { list: ep.events, index: idx });
        });
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
    return { richByName: rich, knownByName: known, destByName: dests, allDestinations: destList, eventsByName: evs };
  }, [messages]);

  // Les conversations sont conservées 7 jours : leurs anciens marqueurs SHOW_ON_MAP
  // peuvent précéder l'ajout de `glovo_url`. Réhydrate donc ce seul champ côté client
  // afin qu'un simple refresh affiche aussi le badge sur les cartes déjà enregistrées.
  const [glovoUrlsById, setGlovoUrlsById] = useState<Record<string, string>>({});
  const resultBusinessIds = useMemo(
    () => Array.from(new Set(Array.from(richByName.values()).map((b) => b.id).filter(Boolean))),
    [richByName],
  );
  useEffect(() => {
    if (!resultBusinessIds.length) {
      setGlovoUrlsById({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id,glovo_url")
        .in("id", resultBusinessIds);
      if (cancelled) return;
      const urls: Record<string, string> = {};
      for (const row of data || []) {
        if (row.glovo_url?.trim()) urls[row.id] = row.glovo_url.trim();
      }
      setGlovoUrlsById(urls);
    })();
    return () => { cancelled = true; };
  }, [resultBusinessIds]);


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

  const openBookingOverlay = (url: string, label: string) => {
    setBookingOverlayUrl(url);
    setBookingOverlayTitle(label);
    setShowBookingOverlay(true);
  };

  // Présentation unique des établissements cités par l'IA (cartes résultat partagées).
  const renderCarousel = (businesses: MapPanelBusiness[], onOpenMap?: () => void, rankOrder?: string | null) => {
    const list = businesses.slice(0, 20).map((business) => ({
      ...business,
      glovo_url: (business as MapPanelBusiness & { glovo_url?: string | null }).glovo_url || glovoUrlsById[business.id] || null,
    }));
    const openOne = (id: string, siblings: string[], overlay: "reviews" | null) => {
      setOpenSiblings(siblings);
      setOpenBusinessOverlay(overlay);
      setOpenBusinessId(id);
    };
    return (
      <AiBusinessResultCards
        businesses={list as never}
        origin={hostLocation ? { lat: hostLocation.lat, lng: hostLocation.lng } : null}
        lang={lang}
        rankOrder={rankOrder ?? null}
        ink={lightInk ? "dark" : "light"}
        onOpen={(id, sib) => openOne(id, sib, null)}
        onOpenReviews={(id, sib) => openOne(id, sib, "reviews")}
        onOpenBooking={openBookingOverlay}
        // Pas de CTA carte ici : redondant avec la relance déterministe
        // « Sur une carte » affichée sous le CTA micro.
        footer={null}

      />
    );
  };

  // Custom <strong> renderer: bold + clickable when the label matches a cited business.
  const StrongCited = ({ children }: { children?: React.ReactNode }) => {
    const text = String(Array.isArray(children) ? children.join("") : children ?? "").trim();
    const key = text.toLowerCase();
    const evHit = eventsByName.get(key);
    if (evHit) {
      return (
        <button
          type="button"
          onClick={() => setOpenEvents({ list: evHit.list, index: evHit.index })}
          style={AI_NAME_FONT}
          className={`text-left font-bold underline decoration-dotted underline-offset-2 hover:decoration-solid ${linkInkClass} cursor-pointer`}
        >
          {children}
        </button>
      );
    }
    const dest = destByName.get(key);
    if (dest) {
      return (
        <button
          type="button"
          onClick={() => setOpenDestinationId(dest.id)}
          style={AI_NAME_FONT}
          className={`text-left font-bold underline decoration-dotted underline-offset-2 hover:decoration-solid ${linkInkClass} cursor-pointer`}
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
        style={AI_NAME_FONT}
        className={`text-left font-bold underline decoration-dotted underline-offset-2 hover:decoration-solid ${linkInkClass} cursor-pointer`}
      >
        {children}
      </button>
    );
  };

  // ————— Badges/filtres dynamiques regroupés (tiroir dépliable) —————
  const pillClass = `${cardBg} ${border} ${cardInk}`;
  const filterGroups: EmbedFilterGroup[] = [
    {
      id: "see",
      label: lang === "en" ? "See" : lang === "ar" ? "عرض" : "Voir",
      items: [
        ...(mapReplayTarget && poolInfo.hasGeo
          ? [{
              id: "map",
              label: lang === "en" ? "Map" : lang === "ar" ? "الخريطة" : "Map",
              icon: <MapPin className="w-3.5 h-3.5" />,
              onClick: () => setOpenMap(mapReplayTarget),
              style: mapBadgeStyle,
              priority: true,
            }]
          : []),
        ...(poolRemaining > 0
          ? [{
              id: "more",
              label: lang === "en" ? `${poolRemaining} more results` : lang === "ar" ? `${poolRemaining} نتائج أخرى` : `${poolRemaining} autres résultats`,
              icon: <Sparkles className="w-3.5 h-3.5" />,
              onClick: () => send(lang === "en" ? "Show the others" : lang === "ar" ? "أعرض الباقي" : "Montre-moi les autres"),
              style: moreBadgeStyle,
              priority: true,
            }]
          : []),
      ],
    },
    {
      id: "hours",
      label: lang === "en" ? "Opening hours" : lang === "ar" ? "المواعيد" : "Horaires",
      items: [
        ...(localFilters.openNow && poolInfo.hasHours
          ? [{
              id: "open_now",
              label: lang === "en" ? "Open now" : lang === "ar" ? "مفتوح الآن" : "Ouverts maintenant",
              icon: <Clock className="w-3.5 h-3.5" />,
              onClick: () => sendLocalFilter(lang === "en" ? "Open now" : lang === "ar" ? "مفتوح الآن" : "Ouverts maintenant", "open_now"),
              className: pillClass,
            }]
          : []),
        ...(poolInfo.hasHours && poolInfo.ids.length > 1
          ? [
              {
                id: "closes_late",
                label: lang === "en" ? "Closes late" : lang === "ar" ? "يغلق متأخرًا" : "Qui ferme tard",
                icon: <Moon className="w-3.5 h-3.5" />,
                onClick: () => sendLocalFilter(lang === "en" ? "Which ones close late" : lang === "ar" ? "من يغلق متأخرًا" : "Qui ferme tard", "hours_ranking_closes_last"),
                className: pillClass,
              },
              {
                id: "opens_early",
                label: lang === "en" ? "Opens early" : lang === "ar" ? "يفتح مبكرًا" : "Qui ouvre tôt",
                icon: <Sun className="w-3.5 h-3.5" />,
                onClick: () => sendLocalFilter(lang === "en" ? "Which ones open early" : lang === "ar" ? "من يفتح مبكرًا" : "Qui ouvre tôt", "hours_ranking_opens_first"),
                className: pillClass,
              },
            ]
          : []),
      ],
    },
    {
      id: "rank",
      label: lang === "en" ? "Distance & ratings" : lang === "ar" ? "المسافة والتقييم" : "Distance & avis",
      items: [
        ...(localFilters.closest
          ? [{
              id: "closest",
              label: lang === "en" ? "Closest" : lang === "ar" ? "الأقرب" : "Les plus proches",
              icon: <Navigation className="w-3.5 h-3.5" />,
              onClick: () => sendLocalFilter(lang === "en" ? "The closest ones" : lang === "ar" ? "الأقرب" : "Les plus proches", "distance_ranking_closest"),
              className: pillClass,
            }]
          : []),
        ...(localFilters.bestRated
          ? [{
              id: "best_rated",
              label: lang === "en" ? "Best rated" : lang === "ar" ? "الأفضل تقييمًا" : "Les mieux notés",
              icon: <Star className="w-3.5 h-3.5" />,
              onClick: () => sendLocalFilter(lang === "en" ? "The best rated" : lang === "ar" ? "الأفضل تقييمًا" : "Les mieux notés", "rating_best"),
              className: pillClass,
            }]
          : []),
      ],
    },
    // Mode plateforme : groupe « Autour de l'hôte » masqué — business-centric par
    // définition (routes poi_nearby / nearby_overview / sur place exigent l'hôte).
    ...(isPlatform ? [] : [{
      id: "host",
      label: lang === "en" ? "Around the host" : lang === "ar" ? "حول المكان" : "Autour de l'hôte",
      items: [
        ...(!usedHostBadges.includes("weather") && businessCity
          ? [{
              id: "weather",
              label: lang === "en" ? "Weather" : lang === "ar" ? "الطقس" : "Météo",
              icon: <CloudSun className="w-3.5 h-3.5" />,
              onClick: () => sendHostBadge("weather", lang === "en" ? "What's the weather forecast?" : lang === "ar" ? "ما هي توقعات الطقس؟" : "Quelle est la météo prévue ?", "weather"),
              className: pillClass,
            }]
          : []),
        ...(!usedHostBadges.includes("poi_nearby") && hostPoiCount > 0
          ? [{
              id: "poi_nearby",
              label: lang === "en" ? `Points of interest · ${hostPoiCount}` : lang === "ar" ? `أماكن مميزة · ${hostPoiCount}` : `Points d'intérêt · ${hostPoiCount}`,
              icon: <MapPinned className="w-3.5 h-3.5" />,
              onClick: () => sendHostBadge("poi_nearby", lang === "en" ? `Points of interest near ${businessName}` : lang === "ar" ? `أماكن مميزة قرب ${businessName}` : `Points d'intérêt à proximité de ${businessName}`, "poi_nearby"),
              className: pillClass,
            }]
          : []),
        ...(!usedHostBadges.includes("nearby_overview") && hostLocation
          ? [{
              id: "nearby_overview",
              label: lang === "en" ? "Other activities nearby" : lang === "ar" ? "أنشطة أخرى قريبة" : "Autres activités à proximité",
              icon: <Compass className="w-3.5 h-3.5" />,
              onClick: () => sendHostBadge("nearby_overview", lang === "en" ? "Other activities nearby" : lang === "ar" ? "أنشطة أخرى قريبة" : "Autres activités à proximité", "nearby_overview"),
              className: pillClass,
            }]
          : []),
        ...(!usedHostBadges.includes("things_to_do")
          ? [{
              id: "things_to_do",
              label: lang === "en" ? "Things to do" : lang === "ar" ? "ماذا نفعل" : "Que faire sur place",
              icon: <Footprints className="w-3.5 h-3.5" />,
              onClick: () => sendHostBadge("things_to_do", lang === "en" ? "What is there to do around here?" : lang === "ar" ? "ما الذي يمكن فعله هنا؟" : "Que faire sur place ?", "search_businesses"),
              className: pillClass,
            }]
          : []),
      ],
    }]),
    {
      id: "destinations",
      label: lang === "en" ? "Destinations" : lang === "ar" ? "الوجهات" : "Destinations",
      items: destScopeChips.map((c) => ({
        id: `dest-${c.id}`,
        label: `${c.name} · ${c.count}`,
        icon: <Compass className="w-3.5 h-3.5" />,
        onClick: () => sendDestinationScope(c),
        className: pillClass,
      })),
    },
    {
      id: "neighborhoods",
      label: lang === "en" ? "Neighbourhoods" : lang === "ar" ? "الأحياء" : "Quartiers",
      items: localFilters.neighborhoods.map((nb) => ({
        id: `nb-${nb.name}`,
        label: `${nb.name} · ${nb.count}`,
        icon: <Building2 className="w-3.5 h-3.5" />,
        onClick: () => sendLocalFilter(nb.name, "neighborhood_filter"),
        className: pillClass,
      })),
    },
  ];
  // Chip « Map » permanent : toujours visible (accueil ET conversation), fond terracotta.
  // Si un pool de résultats existe (dernière réponse IA), la carte affiche CES
  // marqueurs ; sinon (accueil, aucune recherche) elle ouvre l'overlay POI
  // plateforme fullscreen (ancre POI master par défaut → Koutoubia).
  const renderMapChip = (key: string) => (
    <button
      key={key}
      type="button"
      onClick={() => {
        if (mapReplayTarget) setOpenMap(mapReplayTarget);
        else setOpenGenericPoi(true);
      }}
      className="text-[13px] px-4 py-2 rounded-full inline-flex items-center gap-1.5 font-semibold shadow-md hover:opacity-90 transition-opacity shrink-0"
      style={{ fontFamily: "'Montserrat', sans-serif", background: "#C04F17", color: "#ffffff", border: "1px solid #C04F17", textTransform: "none", letterSpacing: "normal" }}
    >
      <MapPin className="w-3.5 h-3.5" />
      Map
    </button>
  );


  const filterCount = filterGroups.flatMap((g) => g.items).length;
  const [mainEl, setMainEl] = useState<HTMLDivElement | null>(null);
  // Redimensionne l'iframe hôte pour qu'elle épouse la hauteur du contenu du widget
  // et éviter tout scroll vertical interne superflu en mode widget standard.
  useEffect(() => {
    if (!autoHeight || !mainEl) return;
    const post = () => {
      const height = Math.ceil(mainEl.scrollHeight);
      try { window.parent?.postMessage({ type: "owm-ask-height", height }, "*"); } catch { /* noop */ }
    };
    post();
    const t = setTimeout(post, 350);
    const t2 = setTimeout(post, 900);
    const ro = new ResizeObserver(post);
    ro.observe(mainEl);
    window.addEventListener("resize", post);
    return () => { clearTimeout(t); clearTimeout(t2); ro.disconnect(); window.removeEventListener("resize", post); };
  }, [autoHeight, mainEl, messages, streaming, youtubeOpen, openBusinessId, openBusinessOverlay, error, filterGroups.length]);

  return (

    <div
      dir={dir}
      className={
        autoHeight
          ? `flex flex-col ${surface} ${theme === "dark" ? "dark" : ""}`
          : `fixed inset-0 flex flex-col ${surface} ${theme === "dark" ? "dark" : ""} transition-[right] duration-300 ease-out ${openBusinessId || showBookingOverlay ? "lg:right-1/2" : ""}`
      }
      style={
        // `?bg=transparent` = le fond de l'hôte doit apparaître : le conteneur
        // racine n'est JAMAIS peint, même si le business a des couleurs de
        // widget enregistrées (sinon elles repeignent tout le panneau en clair).
        bgTransparent
          ? { colorScheme: theme === "light" ? "light" : "dark" }
          : activeWidgetBg
          ? { background: activeWidgetBg, colorScheme: theme === "light" ? "light" : "dark" }
          : undefined
      }
    >
      <div ref={setMainEl} className={autoHeight ? "flex flex-col" : "flex flex-col h-full"}>
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

        <div className="w-8 h-8 rounded-full bg-[#C04F17] flex items-center justify-center text-white">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`font-semibold truncate text-sm ${whiteInk}`}>{headerTitle || "…"}</div>
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

      <div ref={scrollRef} className={`${autoHeight ? "flex-none" : "flex-1 overflow-y-auto"} px-4 py-4 space-y-3 ${bg} relative`}>
        {/* Option B : état « accueil IA » — logo, titre, champ central très visible,
            5 chips de suggestions + CTA pour voir toutes les suggestions. */}
        {homeState && (
          <div className="flex flex-col items-center justify-center gap-5 md:gap-6 px-1 py-4 md:py-8 w-full">
            {/* Conteneur de hauteur minimale : le passage de l'accueil au panneau STT
                reste stable, mais le contenu (texte d'accueil long ou transcript)
                peut s'étendre sans être coupé. */}
            <div className="w-full flex items-center justify-center min-h-[200px] h-auto overflow-visible">
            {voiceActive ? (
              /* Mode STT inline : animation micro bleue + texte blanc à la place
                 de l'icône IA + texte d'accueil (pas d'overlay fullscreen). */
              <VoiceSearchPanel
                liveTranscript={voice.liveTranscript}
                audioLevel={voice.audioLevel}
                micReady={voice.micReady}
                onClose={voice.toggleRecording}
                onFinish={voice.finishRecording}
                textClassName={theme === "light" ? "text-black" : "text-white"}
              />
            ) : (
            <div className="flex flex-col items-center gap-3 text-center pb-2 w-full">
              <p className={`text-sm md:text-base w-full max-w-[52ch] md:max-w-[64ch] whitespace-pre-line ${whiteInk || "opacity-70"}`} style={{ opacity: 0.8 }}>
                {L.platformOpener().replace(/\*\*/g, "")}
              </p>
            </div>

            )}
            </div>



            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="w-full max-w-xl"
            >
              <div className={`flex items-end gap-2 rounded-3xl border-2 ${border} ${inputBg} px-4 py-3 shadow-2xl`}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={handleQuestionPaste}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={2}
                  placeholder={L.placeholder}
                  disabled={streaming || !assistantReady}
                  className={`flex-1 resize-none bg-transparent outline-none text-base leading-snug max-h-32 ${theme === "light" ? "placeholder:text-neutral-400" : "text-white placeholder:text-white/70"}`}
                />
                <button
                  type="button"
                  onClick={voice.toggleRecording}
                  aria-label={lang === "en" ? "Voice search" : lang === "ar" ? "بحث صوتي" : "Recherche vocale"}
                  title={lang === "en" ? "Voice search" : lang === "ar" ? "بحث صوتي" : "Recherche vocale"}
                  className={`w-12 h-12 rounded-full text-white flex items-center justify-center shrink-0 shadow-lg transition-colors ${
                    voice.status === "recording" ? "bg-red-500 animate-pulse" : "bg-[#194CFF] hover:bg-[#194CFF]/90"
                  }`}
                >
                  {voice.status === "processing" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : voice.status === "recording" ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
                <button
                  type="submit"
                  disabled={streaming || !input.trim() || !assistantReady}
                  aria-label="Send"
                  className="w-12 h-12 rounded-full bg-[#C04F17] text-white flex items-center justify-center disabled:opacity-40 shrink-0 shadow-lg"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>

            <div className="w-full max-w-xl flex flex-wrap items-center justify-center gap-2">
              {/* Chip « Map » permanent : toujours visible, quelles que soient les suggestions du backoffice. */}
              {renderMapChip("home")}
              {(showAllSuggestions ? visibleSuggestions : visibleSuggestions.slice(0, 6)).map((s) => {
                const label = s.label;
                const isYoutubePage = s.id === YOUTUBE_PAGE_SUGGESTION_ID || /youtube/i.test(label);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { if (isYoutubePage) { setYoutubeOpen(true); return; } send(label, s.id); }}
                    className={`text-[13px] px-4 py-2 rounded-full ${chipBg} hover:opacity-90 transition-opacity`}
                    style={{ ...chipStyle, fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "normal" }}
                  >
                    {label}
                  </button>
                );
              })}

              {visibleSuggestions.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllSuggestions((v) => !v)}
                  className="text-[13px] font-semibold px-4 py-2 rounded-full shadow-md hover:opacity-90 transition-opacity"
                  style={{ fontFamily: "'Montserrat', sans-serif", background: "#D4AF37", color: "#1a1a1a", border: "1px solid #D4AF37" }}

                >
                  {showAllSuggestions
                    ? (lang === "en" ? "Show less" : lang === "ar" ? "عرض أقل" : "Voir moins")
                    : (lang === "en" ? `See all suggestions (${visibleSuggestions.length})` : lang === "ar" ? `كل الاقتراحات (${visibleSuggestions.length})` : `Voir toutes les suggestions (${visibleSuggestions.length})`)}
                </button>
              )}

              {isPlatform && dbSuggestions === null && visibleSuggestions.length === 0 && (
                <span className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${chipBg}`} style={chipStyle}>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {lang === "en" ? "Loading suggestions…" : lang === "ar" ? "جارٍ تحميل الاقتراحات…" : "Chargement des suggestions…"}
                </span>
              )}
            </div>
          </div>
        )}


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
        {!homeState && messages.map((m, i) => {
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
          const { clean, maps, events, articles, destinations, pinned, weather, videoFeeds, tides, bookings } = extractPayloads(raw);
          const mapPayload = maps[maps.length - 1] || null;
          const eventsPayload = events[events.length - 1] || null;
          const articleCard = articles[articles.length - 1] || null;
          const destinationsPayload = destinations[destinations.length - 1] || null;
          const pinnedCards = pinned;
          const weatherPayload = weather[weather.length - 1] || null;
          const videoFeedPayload = videoFeeds[videoFeeds.length - 1] || null;
          const tidesCity = tides[tides.length - 1] || null;
          const bookingPayload = bookings[bookings.length - 1] || null;
          const bookingCity = bookingPayload?.city || null;
          const msgKey = String(m.id || i);
          const bookingResult = hotelResults[msgKey] || null;
          const isLast = i === messages.length - 1;
          const hideAssistantText =
            isLast &&
            lastLocalFilterRef.current?.forcedRoute === "rating_best" &&
            !!mapPayload &&
            mapPayload.businesses.length > 0;
          const citedFallback =
            !mapPayload || mapPayload.businesses.length === 0
              ? findCitedBusinesses(clean)
              : [];
          return (
            <div key={m.id || i} className="flex flex-col items-start gap-2">
              {articleCard && articleCard.inline ? (
                <div className={`w-full max-w-[85%] rounded-2xl overflow-hidden ${cardBg}`} style={cardStyle}>
                  <a
                    {...articleLinkProps(articleCard)}
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
                        mapTheme={mapThemeResolved}
                        baseColor={mapBaseColor}
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

              {!hideAssistantText && (
                <div className={`${articleCard?.inline ? "max-w-full w-full" : "max-w-[85%]"} rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${asstBubble}`} style={cardStyle}>
                  <div className={`prose prose-sm max-w-none ${cardStyle ? "text-current prose-p:text-current prose-li:text-current prose-ul:text-current prose-headings:text-current prose-strong:text-current" : "dark:prose-invert"} prose-p:my-2 prose-ul:my-1 ${articleCard?.inline ? "prose-hr:my-6 prose-hr:border-neutral-300 dark:prose-hr:border-neutral-700" : ""}`}>
                    <ReactMarkdown
                      components={{
                        strong: StrongCited as any,
                        h3: (({ children }: any) => (
                          <h3 className="text-base md:text-lg font-bold mt-1 mb-2 font-[Montserrat]">{children}</h3>
                        )) as any,
                        a: ((props: any) => <MarkdownLink href={props.href} openBooking={openBookingOverlay} lightInk={lightInk}>{props.children}</MarkdownLink>) as any,
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
              )}

              {weatherPayload && (
                /* Dans le chat sombre, le bloc prévisions doit rester lisible même si
                   la page du widget est transparente : fond sombre explicite + encre blanche. */
                <EmbedWeatherWidget
                  data={weatherPayload}
                  lang={lang}
                  surface={theme === "dark" ? "rgba(23,23,23,0.72)" : ""}
                  ink={theme === "dark" ? "light" : "dark"}
                />
              )}

              {tidesCity && (
                <div className="w-full max-w-[85%]">
                  <AiTidesWidget city={tidesCity} lang={lang} />
                </div>
              )}

              {bookingCity && (
                <div className="w-[22rem] max-w-full flex flex-col gap-3">
                  <AvailabilitySearchOverlay
                    inline
                    language={lang}
                    isSearching={hotelSearchingMsgId === msgKey}
                    initialCheckIn={bookingResult?.checkIn ?? bookingPayload?.checkIn ?? undefined}
                    initialCheckOut={bookingResult?.checkOut ?? bookingPayload?.checkOut ?? undefined}
                    initialAdults={bookingResult?.adults ?? bookingPayload?.adults ?? undefined}
                    onSearch={(checkIn, checkOut, adults) => {
                      runCityHotelSearch(msgKey, bookingCity, checkIn, checkOut, adults);
                    }}
                    onClose={() => {}}
                  />

                  {bookingResult && (
                    <div className="flex flex-col gap-3">
                      <div className={`text-xs font-semibold ${theme === "dark" ? "text-white/70" : "text-neutral-700"}`}>
                        {bookingResult.hotels.length > 0
                          ? (lang === "en"
                              ? `${bookingResult.hotels.length} available stays in ${bookingResult.city}`
                              : lang === "ar"
                              ? `${bookingResult.hotels.length} إقامة متوفرة في ${bookingResult.city}`
                              : `${bookingResult.hotels.length} établissements disponibles à ${bookingResult.city}`)
                          : (lang === "en"
                              ? "No availability found for these dates."
                              : lang === "ar"
                              ? "لا يوجد توفر لهذه التواريخ."
                              : "Aucune disponibilité trouvée pour ces dates.")}
                      </div>
                      {bookingResult.hotels.map((h: any) => (
                        <button
                          key={h.hotelId}
                          type="button"
                          onClick={() => { setOpenSiblings([h.businessId]); setOpenBusinessId(h.businessId); }}
                          className={`flex gap-3 p-3 text-left rounded-2xl border ${border} ${cardBg}`}
                          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", ...(cardStyle || {}) }}
                        >
                          <div className="shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-neutral-800">
                            {(h.dbImage || h.mainImage) && (
                              <img src={h.dbImage || h.mainImage} alt={h.name} className="w-full h-full object-cover" loading="lazy" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`font-semibold text-sm truncate ${cardInk}`}>{h.name}</div>
                            <div className={`text-xs mt-0.5 truncate ${cardInk} opacity-70`}>
                              {[h.dbBusiness?.neighborhood, h.dbBusiness?.city].filter(Boolean).join(" · ")}
                            </div>
                            {h.dbGoogleRating != null && (
                              <div className={`text-xs mt-1 flex items-center gap-1 ${cardInk} opacity-80`}>
                                <Star className="h-3 w-3" style={{ color: "#D4AF37" }} />
                                {Number(h.dbGoogleRating).toFixed(1)}
                                {h.dbGoogleReviewCount ? ` (${h.dbGoogleReviewCount})` : ""}
                              </div>
                            )}
                            {(typeof h.serpPrice === "object" ? h.serpPrice?.amount : h.serpPrice) && (
                              <div className="mt-1.5 inline-block rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: "#C04F17" }}>
                                {typeof h.serpPrice === "object" ? h.serpPrice.amount : h.serpPrice}
                                <span className="font-normal opacity-90">
                                  {lang === "en" ? " / night" : lang === "ar" ? " / ليلة" : " / nuit"}
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
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
                              className={`text-left font-bold text-[15px] leading-tight hover:underline decoration-dotted underline-offset-2 ${linkInkClass} break-words`}
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
                renderCarousel(mapPayload.businesses, () => setOpenMap(mapPayload), mapPayload.order)}

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
                  footer={
                    destinationsPayload.destinations.some((d) => d.latitude != null && d.longitude != null) ? (
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() => setOpenDestMap({ title: destinationsPayload.title || null, destinations: destinationsPayload.destinations })}
                          style={AI_NAME_FONT}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${linkInkClass} hover:underline`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          {lang === "en" ? "Destinations on the map" : lang === "ar" ? "الوجهات على الخريطة" : "Les destinations sur la carte"}
                        </button>
                      </div>
                    ) : null
                  }
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
                      className={`text-[11px] font-semibold ${lightInk || cardStyle ? "text-[#C24B3F]" : "text-white/95"} underline underline-offset-2 hover:text-[#D4AF37] cursor-pointer break-words`}
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
                // Cohérence /embed : pas de carte inline — un CTA texte "Voir sur la carte"
                // sous la dernière vignette, qui ouvre l'overlay POI du slidepanel avec
                // les ÉTABLISSEMENTS liés aux événements (coords + nom du business).
                const eventBiz: MapPanelBusiness[] = [];
                const seenBiz = new Set<string>();
                for (const ev of eventsPayload.events as any[]) {
                  const bid = ev.default_business_id ? String(ev.default_business_id) : null;
                  if (!bid || seenBiz.has(bid)) continue;
                  if (ev.latitude == null || ev.longitude == null) continue;
                  seenBiz.add(bid);
                  eventBiz.push({
                    id: bid,
                    name: ev.business_name || ev.name,
                    slug: ev.business_slug ?? null,
                    latitude: Number(ev.latitude),
                    longitude: Number(ev.longitude),
                    city: ev.city ?? null,
                    neighborhood: ev.neighborhood ?? null,
                    images: [],
                  } as never);
                }
                return (
                  <EmbedCardCarousel
                    items={items}
                    footer={
                      <div className="mt-1 flex flex-wrap items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setOpenEvents({ list: eventsPayload.events, index: 0 })}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${linkInkClass} hover:underline`}
                        >
                          <CalendarIcon className="w-3.5 h-3.5" /> {L.events} · {eventsPayload.events.length}
                        </button>
                        {eventBiz.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setOpenMap({ title: eventsPayload.title || null, businesses: eventBiz } as MapPayload)}
                            style={AI_NAME_FONT}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium ${linkInkClass} hover:underline`}
                          >
                            <MapPin className="w-3.5 h-3.5" /> {L.viewMap}
                          </button>
                        )}
                      </div>
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
                  {...articleLinkProps(articleCard)}
                  className={`relative flex w-full max-w-[85%] gap-3 rounded-2xl overflow-hidden ${cardBg} hover:opacity-95 transition-opacity`}
                  style={cardStyle}
                >
                  {articleCard.image ? (
                    <img
                      src={articleCard.image}
                      alt=""
                      className="w-24 h-24 min-w-24 object-cover flex-shrink-0 bg-neutral-800"
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                    />
                  ) : (
                    <div className="w-24 h-24 min-w-24 bg-neutral-800 flex-shrink-0" />
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

              {/* Actions après la carte Article recommandé : Map / autres résultats /
                  Nouvelle conversation — uniquement sur le dernier message, hors streaming. */}
              {isLast && !streaming && ((mapPayload && mapPayload.businesses.length > 0) || citedFallback.length > 0 || articleCard) && (
                <div className="w-full max-w-[85%] flex flex-wrap items-center gap-2 pt-1">
                  {mapReplayTarget && poolInfo.hasGeo && (
                    <button
                      type="button"
                      onClick={() => setOpenMap(mapReplayTarget)}
                      style={{ ...mapBadgeStyle, fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "normal" }}
                      className="text-[13px] px-4 py-2 rounded-full inline-flex items-center gap-1.5 font-semibold border shadow-md hover:opacity-90 transition-opacity"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {lang === "en" ? "Map" : lang === "ar" ? "الخريطة" : "Map"}
                    </button>
                  )}
                  {poolRemaining > 0 && (
                    <button
                      type="button"
                      onClick={() => send(lang === "en" ? "Show the others" : lang === "ar" ? "أعرض الباقي" : "Montre-moi les autres")}
                      style={{ ...moreBadgeStyle, fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "normal" }}
                      className="text-[13px] px-4 py-2 rounded-full inline-flex items-center gap-1.5 font-semibold border shadow-md hover:opacity-90 transition-opacity"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {lang === "en" ? `${poolRemaining} more results` : lang === "ar" ? `${poolRemaining} نتائج أخرى` : `${poolRemaining} autres résultats`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={startNewConversation}
                    disabled={streaming}
                    style={{ ...newConvStyle, fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "normal" }}
                    className="text-[13px] px-4 py-2 rounded-full inline-flex items-center gap-1.5 font-semibold border shadow-md hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    {lang === "en" ? "New conversation" : lang === "ar" ? "محادثة جديدة" : "Nouvelle conversation"}
                  </button>
                </div>
              )}




              {(() => {
                if (!(i > 0 && !streaming && activeFollowups.length > 0)) return null;
                // Si le garde-fou anti-concurrents vient d'écarter des rivaux, on masque
                // toutes les relances (chips) pour éviter de proposer "plus de résultats"
                // ou des filtres sur un corpus qui a été réduit pour protéger l'hôte.
                if (competitorGuardActive && i === messages.length - 1) return null;
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

        {!homeState && !hasUserMessages && !streaming && assistantReady && (
          <div className="flex flex-wrap gap-2 pt-1">
            {visibleSuggestions.map((s) => {
              const label = s.label;
              // Cas unique : la suggestion "Le meilleur de YouTube sur le Maroc"
              // ne passe pas par le moteur IA — elle ouvre la page /youtube.
              const isYoutubePage =
                s.id === YOUTUBE_PAGE_SUGGESTION_ID || /youtube/i.test(label);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (isYoutubePage) {
                      setYoutubeOpen(true);
                      return;
                    }
                    send(label, s.id);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full ${chipBg} hover:opacity-90 transition-opacity`}
                  style={{ ...chipStyle, fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "normal" }}
                >
                  {label}
                </button>
              );
            })}

            {isPlatform && dbSuggestions === null && visibleSuggestions.length === 0 && (
              <span className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${chipBg}`} style={chipStyle}>
                <Loader2 className="w-3 h-3 animate-spin" />
                {lang === "en" ? "Loading suggestions…" : lang === "ar" ? "جارٍ تحميل الاقتراحات…" : "Chargement des suggestions…"}
              </span>
            )}

            {isPlatform && dbSuggestions !== null && visibleSuggestions.length === 0 && (
              <span className={`text-xs px-3 py-1.5 rounded-full ${chipBg}`} style={chipStyle}>
                {lang === "en" ? "Suggestions unavailable for now." : lang === "ar" ? "الاقتراحات غير متاحة حالياً." : "Suggestions indisponibles pour le moment."}
              </span>
            )}

          </div>
        )}

        {messages.length <= 1 && !streaming && !isPlatform && businessName && blogArticles.length > 0 && (
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




      <VoiceSearchOverlay
        isOpen={voiceActive && !homeState}
        liveTranscript={voice.liveTranscript}
        audioLevel={voice.audioLevel}
        micReady={voice.micReady}
        onClose={() => voice.toggleRecording()}
        onFinish={() => voice.finishRecording()}
      />

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className={`relative p-3 border-t ${border} ${bg} ${homeState ? "hidden" : ""}`}>
        {messages.length > 1 && !streaming && !competitorGuardActive && (
          <>
            {/* Action rapide unique au-dessus du composer : Filtres */}
            <div className="flex items-center gap-2 pb-2 overflow-x-auto scrollbar-hide">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                style={AI_NAME_FONT}
                className="group text-xs px-3 py-1.5 rounded-full border inline-flex items-center gap-1.5 font-semibold shrink-0 transition-all bg-card text-card-foreground border-border shadow-sm hover:shadow-md hover:border-primary/30 active:scale-95"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                {lang === "en" ? "Filters" : lang === "ar" ? "تصفية" : "Filtres"}
                {filterCount > 0 && (
                  <span className="inline-flex items-center justify-center bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] min-w-[18px] group-hover:bg-primary/10 group-hover:text-foreground transition-colors">
                    {filterCount}
                  </span>
                )}
              </button>
            </div>


            <EmbedFilterDrawer
              groups={filterGroups}
              panelClass={`${cardBg} ${border} ${cardInk}`}
              /* Overlay Full Description : fond blanc opaque pour la lisibilité. */
              surfaceStyle={
                overlay
                  ? { background: "#FFFFFF", color: "#1A1A1A", borderColor: "rgba(0,0,0,0.12)" }
                  : undefined
              }
              labelClass={overlay || theme === "light" ? "text-neutral-500" : "text-white/60"}
              fontStyle={AI_NAME_FONT}
              handleLabel={lang === "en" ? "Filters" : lang === "ar" ? "تصفية" : "Filtres"}
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              hidePeek
              maxRatio={0.7}
              header={
                <div className="flex items-center gap-2 py-2">
                  <label
                    htmlFor="owm-embed-radius"
                    className="text-[11px] shrink-0 text-neutral-500"
                  >
                    {L.radiusLabel}
                  </label>
                  <select
                    id="owm-embed-radius"
                    value={String(radiusKm)}
                    onChange={(e) => applyRadius(Number(e.target.value))}
                    className="text-[11px] rounded-full border px-2 py-1 outline-none bg-white text-neutral-800 border-neutral-200"
                  >
                    {RADIUS_OPTIONS.map((r) => (
                      <option key={r} value={String(r)}>{radiusLabel(r, lang)}</option>
                    ))}
                  </select>
                </div>
              }
            />
          </>
        )}

        <div className="flex items-end gap-2">
          <div className={`flex-1 flex items-end rounded-2xl border ${border} ${inputBg} px-3 py-2`}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handleQuestionPaste}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={L.placeholder}
              disabled={streaming || !assistantReady}
              className={`flex-1 resize-none bg-transparent outline-none text-sm max-h-32 ${theme === "light" ? "placeholder:text-neutral-400" : "text-white placeholder:text-white"}`}
            />
          </div>
          <button
            type="submit"
            disabled={streaming || !input.trim() || !assistantReady}
            aria-label="Send"
            className="w-9 h-9 rounded-full bg-[#C04F17] text-white flex items-center justify-center disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={voice.toggleRecording}
            aria-label={lang === "en" ? "Voice search" : lang === "ar" ? "بحث صوتي" : "Recherche vocale"}
            title={lang === "en" ? "Voice search" : lang === "ar" ? "بحث صوتي" : "Recherche vocale"}
            className={`w-9 h-9 rounded-full text-white flex items-center justify-center shrink-0 transition-colors ${
              voice.status === "recording"
                ? "bg-red-500 animate-pulse"
                : "bg-[#194CFF] hover:bg-[#194CFF]/90"
            }`}
          >
            {voice.status === "processing" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : voice.status === "recording" ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
        </div>

      </form>
      </div>

      {/* Overlay POI/Map générique du chip « Map » : corpus complet des POI,
          toujours ouvrable. L'overlay POI est ancré au business hôte s'il existe ;
          en mode plateforme on utilise le business maître default_poi_is_master
          (carte centrée sur la Koutoubia + chips catégories de la ville). */}
      {renderGenericPoi && (
        <div
          className={cn(
            "fixed inset-0 z-[220] transition-transform duration-300 ease-out will-change-transform",
            openGenericPoi ? "translate-x-0" : "translate-x-full"
          )}
        >
          <Suspense fallback={null}>
            <BookOnlineSlidePanel
              businessId={businessId || poiMasterAnchorId || POI_MASTER_FALLBACK_ID}
              initialOverlay="poi"
              embedMode
              hideDirections
              mapTheme={mapThemeResolved}
              mapBaseColor={mapBaseColor}
              
              onClose={() => setOpenGenericPoi(false)}
            />
          </Suspense>
        </div>
      )}


      {openMap && (businessId || (openMap.businesses || []).some((b) => b.id)) ? (
        // Overlay POI du slidepanel réutilisé tel quel (carte + rail de cartes + pastilles + clic marqueur → fiche),
        // en corpus fermé : uniquement les établissements de la réponse, dans l'ordre donné.
        // Mode plateforme (pas d'hôte) : aucune fiche ancre → le panneau charge le POI
        // maître global (Koutoubia) en 2 requêtes légères : centre + header immédiats,
        // au lieu d'attendre la fiche complète du 1er résultat (≈30 s) et d'afficher
        // « À proximité de <résultat> ».
        <div className="fixed inset-0 z-[220]">
          <Suspense fallback={null}>
            <BookOnlineSlidePanel
              key={(openMap.businesses || []).map((b) => b.id).join(",")}
              businessId={mapAnchorId}

              initialOverlay="poi"
              embedMode
              hideDirections
              mapTheme={mapThemeResolved}
              mapBaseColor={mapBaseColor}
              poiOverrideIds={(openMap.businesses || []).map((b) => b.id)}
              poiOverrideBusinesses={openMap.businesses as any}
              poiAnchor={mapAnchor as any}
              poiOverrideTitle={openMap.title || null}
              onClose={() => setOpenMap(null)}
            />
          </Suspense>
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
          mapTheme={mapThemeResolved}
          showLayerControls
        />
      )}

      {/* Carte des destinations liées : marqueurs = destinations (pas des fiches),
          ordre conservé (distance depuis l'établissement hôte). */}
      <MapSlidePanel
        open={!!openDestMap}
        onClose={() => setOpenDestMap(null)}
        title={openDestMap?.title || undefined}
        businesses={(openDestMap?.destinations || [])
          .filter((d) => d.latitude != null && d.longitude != null)
          .map((d) => ({
            id: d.id,
            name: d.name,
            latitude: Number(d.latitude),
            longitude: Number(d.longitude),
            images: d.image ? [d.image] : [],
          }))}
        isMobile={isMobile}
        fullWidth
        panelBg={activeWidgetBg || undefined}
        disableUserLocation
        hostLocation={hostLocation}
        hostLabel={businessName}
        mapTheme={mapThemeResolved}
        showLayerControls
        preserveOrder
      />




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
            initialOverlay={openBusinessOverlay ?? undefined}
            onClose={() => { setOpenBusinessId(null); setOpenBusinessOverlay(null); }}
            onPrev={goPrev}
            onNext={goNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
          />
        );
      })()}

      {showBookingOverlay && bookingOverlayUrl && (
        /* Réservation (url 1 à 5) : même géométrie que les fiches ouvertes depuis
           la réponse IA (panneau droit lg:1/2 dans VideoSlidePanel), jamais plein écran. */
        <div className="fixed inset-0 z-[220] bg-background lg:left-auto lg:w-1/2 lg:border-l lg:border-border overflow-hidden">
          <BookingOverlay
            bookingUrl={bookingOverlayUrl}
            title={bookingOverlayTitle}
            onClose={() => { setShowBookingOverlay(false); setBookingOverlayUrl(null); }}
            closeVariant="dark"
            hideContact
          />
        </div>
      )}


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
          social: v.social ?? null,
          showSocialBadge: !!v.social,
          description: v.description ?? null,
          manualCard: null,
          title: v.title ?? null,
          _isGeneric: !!v.isGeneric,
          price: v.price ?? null,
          badges: v.badges ?? null,
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
              onActiveVideoChange={(v: any) => { setActiveFeedVideoId(v.id); setFeedVideoTime(0); void maybeLoadMoreFeed(String(v.id)); }}
              isActiveGeneric={!!(active as any)._isGeneric}
              currentTime={feedVideoTime}
              onTimeUpdate={setFeedVideoTime}
              returnContext={null}
              hideDirections
              hideSecondaryCtas
              onBadgeSelect={(b: any) => { void selectFeedBadge(b); }}
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

      {/* Overlay inline « Le meilleur de YouTube sur le Maroc » — variante compacte,
          plein cadre de l'iframe (pas de nouvelle fenêtre, pas de 2ᵉ iframe). */}
      {youtubeOpen && (
        <div className="absolute inset-0 z-[200] flex flex-col bg-neutral-950 animate-fade-in" dir={dir}>
          <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
            <button
              type="button"
              onClick={() => setYoutubeOpen(false)}
              aria-label={lang === "en" ? "Back" : lang === "ar" ? "رجوع" : "Retour"}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <h2
              className="min-w-0 flex-1 truncate text-sm sm:text-base font-bold uppercase text-white"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {lang === "en"
                ? "The best of YouTube about Morocco"
                : lang === "ar"
                ? "أفضل ما في يوتيوب عن المغرب"
                : "Le meilleur de YouTube sur le Maroc"}
            </h2>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <Suspense
              fallback={<div className="py-10 text-center text-xs text-white/60">…</div>}
            >
              <YouTubeChannelsTabContent compact />
            </Suspense>
          </div>
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
