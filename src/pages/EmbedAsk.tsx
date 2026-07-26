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
import { Send, Sun, Moon, MapPin, Calendar as CalendarIcon, MessageSquarePlus, Bed, Utensils, Wine, Coffee, ShoppingBag, Sparkles, Landmark, Camera, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { collectRatingSources, computeWeightedRatingOn20, getTotalReviewCount } from "@/lib/ratingUtils";
import MapSlidePanel, { type MapPanelBusiness } from "@/components/club/MapSlidePanel";
import EventsSlidePanel from "@/components/club/EventsSlidePanel";
import type { EventPanelItem } from "@/components/club/ClubAiAssistant";
import SlidePanelHeader from "@/components/SlidePanelHeader";

const BookOnlineSlidePanel = lazy(() => import("@/components/BookOnlineSlidePanel"));

/**
 * Liquid-glass bottom bar overlaying BookOnlineSlidePanel in the embed:
 * Play/Pause + Mute/Unmute controls wired to the panel via window events.
 */
const EmbedMediaBottomBar = () => {
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    const onState = (e: Event) => {
      const d = (e as CustomEvent).detail as { playing: boolean; muted: boolean } | undefined;
      if (!d) return;
      setPlaying(d.playing);
      setMuted(d.muted);
    };
    window.addEventListener("book-panel:state", onState);
    // Request a state sync once the panel has mounted
    const t = setTimeout(() => window.dispatchEvent(new Event("book-panel:request-state")), 300);
    return () => { window.removeEventListener("book-panel:state", onState); clearTimeout(t); };
  }, []);
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-4 z-[230] flex justify-center"
      data-cta
    >
      <div className="pointer-events-auto flex items-center gap-3 px-3 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("book-panel:toggle-play"))}
          aria-label={playing ? "Pause" : "Play"}
          className="w-11 h-11 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white transition-colors"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("book-panel:toggle-mute"))}
          aria-label={muted ? "Unmute" : "Mute"}
          className="w-11 h-11 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white transition-colors"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
};

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
      {/* Extra bottom padding on the internal scroll area so URL 2–5 CTAs sit above the media bar */}
      <style>{`.embed-book-panel-scope [data-slidepanel-scroll="true"]{padding-bottom:calc(96px + env(safe-area-inset-bottom)) !important;}`}</style>
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
          />
        </Suspense>
      </div>
      <EmbedMediaBottomBar />
    </div>
  );
};

const LANG_LABELS: Record<string, { placeholder: string; hint: string; opener: (name: string) => string; viewMap: string; events: string; nearby: string; suggestions: string[] }> = {
  fr: {
    placeholder: "Posez votre question…",
    hint: "Assistant IA propulsé par One World Morocco",
    opener: (n) => `Bonjour 👋 Je suis l'assistant de **${n}**. Comment puis-je vous aider ?`,
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
    opener: (n) => `Hi 👋 I'm the assistant for **${n}**. How can I help?`,
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
    opener: (n) => `مرحبًا 👋 أنا مساعد **${n}**. كيف يمكنني مساعدتك؟`,
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

type MapPayload = { title?: string | null; businesses: MapPanelBusiness[] };
type EventsPayload = { title?: string | null; city?: string | null; events: EventPanelItem[] };
type KnownBusiness = { id: string; slug: string | null; name: string };

function extractPayloads(text: string): { clean: string; maps: MapPayload[]; events: EventsPayload[]; known: KnownBusiness[] } {
  const maps: MapPayload[] = [];
  const events: EventsPayload[] = [];
  const known: KnownBusiness[] = [];
  if (!text) return { clean: text, maps, events, known };
  let clean = text.replace(MAP_RE, (_m, raw) => {
    try {
      const p = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (p && Array.isArray(p.businesses) && p.businesses.length) maps.push({ title: p.title ?? null, businesses: p.businesses });
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
  });
  clean = clean
    .replace(/<!--SHOW_ON_MAP:[\s\S]*$/g, "")
    .replace(/<!--EVENTS_SNAPSHOT:[\s\S]*$/g, "")
    .replace(/<!--KNOWN_BUSINESSES:[\s\S]*$/g, "")
    .trim();
  return { clean, maps, events, known };
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
  const initialTheme = params.get("theme") === "light" ? "light" : "dark";
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("embed-ask-theme");
      if (saved === "light" || saved === "dark") return saved;
    }
    return initialTheme;
  });
  useEffect(() => {
    try { window.localStorage.setItem("embed-ask-theme", theme); } catch { /* noop */ }
  }, [theme]);

  const [businessName, setBusinessName] = useState<string>("");
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessCity, setBusinessCity] = useState<string | null>(null);
  const [hostLocation, setHostLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  type FollowupRow = { id: string; label_fr: string; label_en: string | null; label_ar: string | null };
  type SuggestionRow = { id: string; label: string; disabled_followup_ids?: string[] };
  const [dbSuggestions, setDbSuggestions] = useState<SuggestionRow[] | null>(null);
  const [globalFollowups, setGlobalFollowups] = useState<FollowupRow[]>([]);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const L = LANG_LABELS[lang];

  const sessionIdRef = useRef<string>(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const messageIndexRef = useRef<number>(0);
  const [chatKey, setChatKey] = useState(0);

  // --- AI SDK useChat wiring ---
  const transport = useMemo(() => new DefaultChatTransport({
    api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/embed-ai-chat`,
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
      },
    }),
  }), [slug, lang]);

  const { messages, sendMessage, status, setMessages } = useChat({
    id: `embed-${slug}-${chatKey}`,
    transport,
    onError: (e) => setError(e.message),
  });

  const streaming = status === "submitted" || status === "streaming";

  const suggestions: SuggestionRow[] = dbSuggestions && dbSuggestions.length > 0
    ? dbSuggestions
    : L.suggestions.map((s, i) => ({ id: `default-${i}`, label: s }));
  const pickFollowupLabel = (f: FollowupRow): string => {
    const raw = (lang === "en" ? f.label_en : lang === "ar" ? f.label_ar : f.label_fr) || f.label_fr || "";
    return raw.replace(/\{businessName\}/g, businessName || "").trim();
  };
  const activeSuggestion = activeSuggestionId ? suggestions.find((s) => s.id === activeSuggestionId) : null;
  const disabledIds = new Set(activeSuggestion?.disabled_followup_ids || []);
  const activeFollowups: Array<{ id: string; label: string }> = globalFollowups
    .filter((f) => !disabledIds.has(f.id))
    .map((f) => ({ id: f.id, label: pickFollowupLabel(f) }))
    .filter((f) => f.label);

  const [openMap, setOpenMap] = useState<MapPayload | null>(null);
  const [openEvents, setOpenEvents] = useState<{ list: EventPanelItem[]; index: number } | null>(null);
  const [openBusinessId, setOpenBusinessId] = useState<string | null>(null);
  const [openSiblings, setOpenSiblings] = useState<string[]>([]);

  const isMobile = useMemo(() => typeof window !== "undefined" && window.innerWidth < 768, []);

  // Load host business
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, latitude, longitude, city")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled) return;
      const name = data?.name || "";
      setBusinessName(name);
      setBusinessId((data?.id as string) || null);
      setBusinessCity((data?.city as string) || null);
      if (data?.latitude != null && data?.longitude != null) {
        setHostLocation({ lat: Number(data.latitude), lng: Number(data.longitude) });
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
    setMessages([{
      id: "opener",
      role: "assistant",
      parts: [{ type: "text", text: L.opener(businessName) }],
    } as any]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessName, chatKey]);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("embed_ai_suggestions")
        .select("id,label_fr,label_en,label_ar,followups,business_ids,city,disabled_followup_ids")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (cancelled || !data) return;
      const col = lang === "en" ? "label_en" : lang === "ar" ? "label_ar" : "label_fr";
      const normCity = (s: string | null | undefined) =>
        (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const bizCity = normCity(businessCity);
      const list: SuggestionRow[] = (data as any[])
        .filter((r) => {
          const c = normCity(r.city);
          if (c && c !== bizCity) return false;
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
  }, [lang, businessId, businessCity]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("embed_ai_followups")
        .select("id,label_fr,label_en,label_ar")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (cancelled || !data) return;
      setGlobalFollowups(data as FollowupRow[]);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, [businessName]);

  const dir = lang === "ar" ? "rtl" : "ltr";

  const send = (overrideText?: string, suggestionId?: string, followupId?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming || !businessName) return;
    if (!overrideText) setInput("");
    if (suggestionId && !suggestionId.startsWith("default-")) setActiveSuggestionId(suggestionId);
    setError(null);
    messageIndexRef.current += 1;
    sendMessage(
      { text },
      { body: { suggestionId: suggestionId || null, followupId: followupId || null } },
    );
  };

  const startNewConversation = () => {
    sessionIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    messageIndexRef.current = 0;
    setInput("");
    setError(null);
    setOpenMap(null);
    setOpenEvents(null);
    setOpenBusinessId(null);
    setActiveSuggestionId(null);
    setChatKey((k) => k + 1); // resets useChat id → clears message list
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const bg = theme === "light" ? "bg-white" : "bg-neutral-950";
  const surface = theme === "light" ? "bg-white text-neutral-900" : "bg-neutral-950 text-neutral-100";
  const userBubble = theme === "light" ? "bg-neutral-900 text-white" : "bg-white text-neutral-900";
  const asstBubble = theme === "light" ? "bg-neutral-100 text-neutral-900" : "bg-neutral-800 text-neutral-50";
  const border = theme === "light" ? "border-neutral-200" : "border-neutral-800";
  const inputBg = theme === "light" ? "bg-white" : "bg-neutral-900";
  const cardBg = theme === "light" ? "bg-white border border-neutral-200" : "bg-neutral-900 border border-neutral-800";

  return (
    <div dir={dir} className={`fixed inset-0 flex flex-col ${surface} ${theme === "dark" ? "dark" : ""}`}>
      <header className={`px-4 py-3 border-b ${border} flex items-center gap-3`}>
        <div className="w-8 h-8 rounded-full bg-[#C24B3F] flex items-center justify-center text-white text-sm font-semibold">
          {(businessName || "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate text-sm">{businessName || "…"}</div>
          <div className="text-[11px] opacity-60 truncate">{L.hint}</div>
        </div>
        <button
          type="button"
          onClick={startNewConversation}
          disabled={streaming}
          title={lang === "en" ? "New conversation" : lang === "ar" ? "محادثة جديدة" : "Nouvelle conversation"}
          aria-label={lang === "en" ? "New conversation" : lang === "ar" ? "محادثة جديدة" : "Nouvelle conversation"}
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${border} opacity-70 hover:opacity-100 transition-opacity disabled:opacity-40`}
        >
          <MessageSquarePlus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label={theme === "light" ? "Dark mode" : "Light mode"}
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${border} opacity-70 hover:opacity-100 transition-opacity`}
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </header>

      <div ref={scrollRef} className={`flex-1 overflow-y-auto px-4 py-4 space-y-3 ${bg}`}>
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
          const { clean, maps, events } = extractPayloads(raw);
          const mapPayload = maps[maps.length - 1] || null;
          const eventsPayload = events[events.length - 1] || null;
          const isLast = i === messages.length - 1;
          return (
            <div key={m.id || i} className="flex flex-col items-start gap-2">
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${asstBubble}`}>
                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1">
                  <ReactMarkdown>{clean || (streaming && isLast ? "…" : "")}</ReactMarkdown>
                </div>
              </div>

              {mapPayload && mapPayload.businesses.length > 0 && (
                <div
                  className="w-full max-w-full overflow-x-auto scrollbar-hide -mx-1 px-1"
                  style={{ overscrollBehaviorX: "contain" }}
                  onWheel={(e) => {
                    if (e.deltaY === 0) return;
                    const el = e.currentTarget;
                    const maxScroll = el.scrollWidth - el.clientWidth;
                    if (maxScroll <= 0) return;

                    const goingLeft = e.deltaY < 0;
                    const goingRight = e.deltaY > 0;
                    // Strict boundary: only release the page scroll when the
                    // carousel is truly at the first or last item.
                    const atLeft = el.scrollLeft <= 0;
                    const atRight = el.scrollLeft >= maxScroll - 1;

                    // Still inside the carousel range → consume the wheel event.
                    if ((goingLeft && !atLeft) || (goingRight && !atRight)) {
                      e.preventDefault();
                      e.stopPropagation();
                      // Cap the delta to avoid a large trackpad/wheel flick
                      // overshooting the boundary and instantly unlocking page scroll.
                      const capped = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 50);
                      const next = el.scrollLeft + capped;
                      el.scrollLeft = Math.max(0, Math.min(maxScroll, next));
                    }
                  }}
                >
                  <div className="flex gap-3 pb-1">
                    {mapPayload.businesses.slice(0, 20).map((b) => {
                      const img = (b.images?.[0] || (b as any).logo_url) as string | undefined;
                      const loc = [b.city, b.neighborhood].filter(Boolean).join(" · ");
                      const ratingOn20 = computeWeightedRatingOn20(collectRatingSources(b as any));
                      const reviewCount = getTotalReviewCount(b as any) || (b.google_review_count ?? null);
                      let distStr: string | null = null;
                      if (hostLocation && b.latitude != null && b.longitude != null) {
                        const R = 6371;
                        const dLat = ((b.latitude - hostLocation.lat) * Math.PI) / 180;
                        const dLon = ((b.longitude - hostLocation.lng) * Math.PI) / 180;
                        const a = Math.sin(dLat / 2) ** 2 + Math.cos((hostLocation.lat * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
                        const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        distStr = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
                      }
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setOpenSiblings(mapPayload.businesses.slice(0, 20).map((x) => x.id));
                            setOpenBusinessId(b.id);
                          }}
                          className="shrink-0 w-44 text-left group"
                        >
                          <div className="relative w-44 h-64 rounded-xl overflow-hidden bg-neutral-800">
                            {img ? (
                              <img
                                src={img}
                                alt={b.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                loading="lazy"
                              />
                            ) : null}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2.5">
                              <div className="text-[13px] font-bold text-white leading-tight line-clamp-2">{b.name}</div>
                              {loc && (
                                <div className="text-[11px] text-white/80 mt-0.5 line-clamp-1">{loc}</div>
                              )}
                              <div className="mt-0.5 flex items-center justify-between gap-2">
                                {ratingOn20 != null ? (
                                  <div className="flex items-center gap-1 text-[12px] text-white min-w-0">
                                    <span style={{ color: "#D4AF37" }}>★</span>
                                    <span className="font-semibold shrink-0">{Number(ratingOn20).toFixed(1)}/20</span>
                                    {reviewCount ? (
                                      <span className="text-white/70 truncate">· {reviewCount} avis</span>
                                    ) : null}
                                  </div>
                                ) : (
                                  <span />
                                )}
                                {distStr && (
                                  <div
                                    className="text-[11px] font-semibold px-1.5 py-0.5 rounded backdrop-blur-sm whitespace-nowrap shrink-0"
                                    style={{ background: "rgba(0,0,0,0.6)", color: "#D4AF37" }}
                                  >
                                    {distStr}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenMap(mapPayload)}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-[#C24B3F] hover:underline"
                  >
                    <MapPin className="w-3.5 h-3.5" /> {L.viewMap}
                  </button>
                </div>
              )}

              {eventsPayload && eventsPayload.events.length > 0 && (
                <div
                  className="w-full max-w-full overflow-x-auto scrollbar-hide -mx-1 px-1"
                  style={{ overscrollBehaviorX: "contain" }}
                  onWheel={(e) => {
                    if (e.deltaY === 0) return;
                    const el = e.currentTarget;
                    const maxScroll = el.scrollWidth - el.clientWidth;
                    if (maxScroll <= 0) return;
                    const goingLeft = e.deltaY < 0;
                    const goingRight = e.deltaY > 0;
                    const atLeft = el.scrollLeft <= 0;
                    const atRight = el.scrollLeft >= maxScroll - 1;
                    if ((goingLeft && !atLeft) || (goingRight && !atRight)) {
                      e.preventDefault();
                      e.stopPropagation();
                      const capped = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 50);
                      el.scrollLeft = Math.max(0, Math.min(maxScroll, el.scrollLeft + capped));
                    }
                  }}
                >
                  <div className="flex gap-3 pb-1">
                    {eventsPayload.events.slice(0, 20).map((ev, idx) => {
                      const img = ev.image || null;
                      const loc = [ev.neighborhood, ev.city || eventsPayload.city].filter(Boolean).join(" · ");
                      const fmtD = (d?: string | null) => {
                        if (!d) return null;
                        try { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); } catch { return d; }
                      };
                      const a = fmtD(ev.start_date), b = fmtD(ev.end_date);
                      const dateStr = a && b && ev.start_date !== ev.end_date ? `${a} → ${b}` : (a || b || "");
                      return (
                        <button
                          key={ev.id + idx}
                          type="button"
                          onClick={() => setOpenEvents({ list: eventsPayload.events, index: idx })}
                          className="shrink-0 w-64 text-left group"
                        >
                          <div className="relative w-64 h-44 rounded-xl overflow-hidden bg-neutral-800">
                            {img ? (
                              <img src={img} alt={ev.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/40">
                                <CalendarIcon className="w-10 h-10" />
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5">
                              <div className="text-[13px] font-bold text-white leading-tight line-clamp-2">{ev.name}</div>
                              {loc && <div className="text-[11px] text-white/80 mt-0.5 line-clamp-1">{loc}</div>}
                              {dateStr && (
                                <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded backdrop-blur-sm whitespace-nowrap" style={{ background: "rgba(0,0,0,0.6)", color: "#D4AF37" }}>
                                  <CalendarIcon className="w-3 h-3" /> {dateStr}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenEvents({ list: eventsPayload.events, index: 0 })}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-[#C24B3F] hover:underline"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" /> {L.events} · {eventsPayload.events.length}
                  </button>
                </div>
              )}

              {i > 0 && !streaming && activeFollowups.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {activeFollowups.map((f, k) => (
                    <button
                      key={`fu-${i}-${k}`}
                      type="button"
                      onClick={() => send(f.label, undefined, f.id)}
                      className={`text-xs px-3 py-1.5 rounded-full ${cardBg} hover:opacity-90 transition-opacity`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {status === "submitted" && (
          <div className="flex justify-start">
            <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${asstBubble}`}>
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
                  className={`text-xs px-3 py-1.5 rounded-full ${cardBg} hover:opacity-90 transition-opacity`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {error && <div className="text-xs text-red-500">{error}</div>}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className={`p-3 border-t ${border} ${bg}`}>
        <div className={`flex items-end gap-2 rounded-2xl border ${border} ${inputBg} px-3 py-2`}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            placeholder={L.placeholder}
            disabled={streaming || !businessName}
            className={`flex-1 resize-none bg-transparent outline-none text-sm max-h-32 ${theme === "light" ? "placeholder:text-neutral-400" : "placeholder:text-neutral-500"}`}
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

      <MapSlidePanel
        open={!!openMap}
        onClose={() => setOpenMap(null)}
        title={openMap?.title || undefined}
        businesses={openMap?.businesses || []}
        isMobile={isMobile}
        disableUserLocation
        hostLocation={hostLocation}
        hostLabel={businessName}
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
            onClose={() => setOpenBusinessId(null)}
            onPrev={goPrev}
            onNext={goNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
          />
        );
      })()}
    </div>
  );
};

export default EmbedAsk;
