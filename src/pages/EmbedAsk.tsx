// Public embed: iframe-friendly, business-scoped AI concierge.
// Route: /embed/ask/:slug
// - Anonymous, no auth.
// - Streams via /functions/v1/embed-ai-chat.
// - Parses SSE markers (SHOW_ON_MAP, EVENTS_SNAPSHOT, KNOWN_BUSINESSES) and
//   renders the same map/business/events panels as /club.
import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Send, Sun, Moon, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MapSlidePanel, { type MapPanelBusiness } from "@/components/club/MapSlidePanel";
import EventsSlidePanel from "@/components/club/EventsSlidePanel";
import type { EventPanelItem } from "@/components/club/ClubAiAssistant";
import SlidePanelHeader from "@/components/SlidePanelHeader";

const BookOnlineSlidePanel = lazy(() => import("@/components/BookOnlineSlidePanel"));

type Msg = { role: "user" | "assistant"; content: string };

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

// ============= Marker extraction (mirrors ClubAiAssistant) =============
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
  // Strip any unclosed marker so it doesn't render as raw text mid-stream.
  clean = clean
    .replace(/<!--SHOW_ON_MAP:[\s\S]*$/g, "")
    .replace(/<!--EVENTS_SNAPSHOT:[\s\S]*$/g, "")
    .replace(/<!--KNOWN_BUSINESSES:[\s\S]*$/g, "")
    .trim();
  return { clean, maps, events, known };
}

// ============= Component =============
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
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const L = LANG_LABELS[lang];

  // Overlay states
  const [openMap, setOpenMap] = useState<MapPayload | null>(null);
  const [openEvents, setOpenEvents] = useState<{ list: EventPanelItem[]; index: number } | null>(null);
  const [openBusinessId, setOpenBusinessId] = useState<string | null>(null);

  const isMobile = useMemo(() => typeof window !== "undefined" && window.innerWidth < 768, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("name")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled) return;
      const name = data?.name || "";
      setBusinessName(name);
      if (name) setMsgs([{ role: "assistant", content: L.opener(name) }]);
      else setError(lang === "en" ? "Establishment not found." : lang === "ar" ? "المؤسسة غير موجودة." : "Établissement introuvable.");
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs]);
  useEffect(() => { inputRef.current?.focus(); }, [businessName]);

  const dir = lang === "ar" ? "rtl" : "ltr";

  const sessionIdRef = useRef<string>(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const messageIndexRef = useRef<number>(0);

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming || !businessName) return;
    if (!overrideText) setInput("");
    setError(null);
    const userMsg: Msg = { role: "user", content: text };
    const history = msgs.filter((_, i) => !(i === 0 && msgs[0].role === "assistant"));
    const nextUi: Msg[] = [...msgs, userMsg, { role: "assistant", content: "" }];
    setMsgs(nextUi);
    setStreaming(true);
    const assistantIdx = nextUi.length - 1;
    const messageIndex = messageIndexRef.current++;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/embed-ai-chat`;
      const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      // Strip markers from prior assistant messages before sending back to server
      const cleanedHistory = [...history, userMsg].map((m) => ({
        role: m.role,
        content: m.role === "assistant" ? extractPayloads(m.content).clean : m.content,
      }));
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${anon}`, apikey: anon },
        body: JSON.stringify({
          businessSlug: slug,
          language: lang,
          messages: cleanedHistory,
          sessionId: sessionIdRef.current,
          messageIndex,
        }),
      });
      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "chunk" && typeof evt.delta === "string") {
              acc += evt.delta;
              setMsgs((cur) => {
                const copy = cur.slice();
                copy[assistantIdx] = { role: "assistant", content: acc };
                return copy;
              });
            } else if (evt.type === "error") {
              throw new Error(evt.message || "stream_error");
            }
          } catch { /* skip */ }
        }
      }
      if (!acc) {
        setMsgs((cur) => {
          const copy = cur.slice();
          copy[assistantIdx] = {
            role: "assistant",
            content: lang === "en" ? "Sorry, I couldn't answer right now." : lang === "ar" ? "عذرًا، لا أستطيع الإجابة الآن." : "Désolé, je ne peux pas répondre pour le moment.",
          };
          return copy;
        });
      }
    } catch (e) {
      setError((e as Error).message);
      setMsgs((cur) => cur.slice(0, -1));
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
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
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label={theme === "light" ? "Dark mode" : "Light mode"}
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${border} opacity-70 hover:opacity-100 transition-opacity`}
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </header>

      <div ref={scrollRef} className={`flex-1 overflow-y-auto px-4 py-4 space-y-3 ${bg}`}>
        {msgs.map((m, i) => {
          if (m.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${userBubble}`}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            );
          }
          const { clean, maps, events } = extractPayloads(m.content);
          const mapPayload = maps[maps.length - 1] || null;
          const eventsPayload = events[events.length - 1] || null;
          return (
            <div key={i} className="flex flex-col items-start gap-2">
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${asstBubble}`}>
                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1">
                  <ReactMarkdown>{clean || (streaming && i === msgs.length - 1 ? "…" : "")}</ReactMarkdown>
                </div>
              </div>

              {/* Business carousel */}
              {mapPayload && mapPayload.businesses.length > 0 && (
                <div className="w-full max-w-full overflow-x-auto -mx-1 px-1">
                  <div className="flex gap-2 pb-1">
                    {mapPayload.businesses.slice(0, 20).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setOpenBusinessId(b.id)}
                        className={`shrink-0 w-40 rounded-xl overflow-hidden text-left ${cardBg} hover:opacity-90 transition-opacity`}
                      >
                        <div className="w-full h-24 bg-neutral-800 relative overflow-hidden">
                          {(b.images?.[0] || (b as any).logo_url) ? (
                            <img
                              src={(b.images?.[0] || (b as any).logo_url) as string}
                              alt={b.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : null}
                        </div>
                        <div className="p-2">
                          <div className="text-xs font-semibold line-clamp-2">{b.name}</div>
                          <div className="text-[10px] opacity-60 line-clamp-1 mt-0.5">
                            {[b.neighborhood, b.city].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </button>
                    ))}
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

              {/* Events chip */}
              {eventsPayload && eventsPayload.events.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOpenEvents({ list: eventsPayload.events, index: 0 })}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${cardBg} hover:opacity-90`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {L.events} · {eventsPayload.events.length}
                </button>
              )}
            </div>
          );
        })}
        {streaming && msgs[msgs.length - 1]?.role === "assistant" && !msgs[msgs.length - 1]?.content && (
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

      {/* Google Maps slide panel */}
      <MapSlidePanel
        open={!!openMap}
        onClose={() => setOpenMap(null)}
        title={openMap?.title || undefined}
        businesses={openMap?.businesses || []}
        isMobile={isMobile}
      />

      {/* Events slide panel */}
      <EventsSlidePanel
        open={!!openEvents}
        onClose={() => setOpenEvents(null)}
        items={openEvents?.list || []}
        initialIndex={openEvents?.index ?? 0}
        isMobile={isMobile}
        onOpenBusiness={(bid) => { setOpenEvents(null); setOpenBusinessId(bid); }}
      />

      {/* Business detail slide panel */}
      {openBusinessId && (
        <div className="fixed inset-0 z-[220] bg-background flex flex-col lg:left-auto lg:border-l lg:border-border lg:w-1/2">
          <SlidePanelHeader onClose={() => setOpenBusinessId(null)} alwaysDark glassClose />
          <div className="flex-1 min-h-0 overflow-visible">
            <Suspense fallback={null}>
              <BookOnlineSlidePanel
                key={openBusinessId}
                businessId={openBusinessId}
                onClose={() => setOpenBusinessId(null)}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmbedAsk;
