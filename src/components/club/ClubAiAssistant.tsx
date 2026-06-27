import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Send, Trash2, MessageSquare, Bookmark, BookmarkCheck, Mic, Volume2, Square, Headphones, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";

type Msg = { role: "user" | "assistant"; content: string };

type ChatRow = {
  id: string;
  title: string;
  updated_at: string;
  is_bookmarked: boolean;
  messages: Msg[] | null;
};

interface Props { userId: string }

const VOICE_MODE_KEY = "club_ai_voice_mode";

// Detect Moroccan phone numbers and replace with tappable tel: + WhatsApp markdown links.
function linkifyPhones(text: string): string {
  if (!text) return text;
  const phoneRe = /(\+?212|0)[\s().-]*\d(?:[\s().-]*\d){8}/g;
  return text.replace(phoneRe, (match) => {
    const digits = match.replace(/\D/g, "");
    let intl = digits;
    if (intl.startsWith("212")) {
      // ok
    } else if (intl.startsWith("0")) {
      intl = "212" + intl.slice(1);
    }
    if (intl.length < 11 || intl.length > 13) return match;
    return `[${match.trim()}](tel:+${intl}) · [💬 WhatsApp](https://wa.me/${intl})`;
  });
}


const ClubAiAssistant = ({ userId }: Props) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeId = searchParams.get("assistant") || null;

  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [activeChat, setActiveChat] = useState<ChatRow | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceMode, setVoiceMode] = useState<boolean>(() => {
    try { return localStorage.getItem(VOICE_MODE_KEY) === "1"; } catch { return false; }
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastSpokenRef = useRef<string>("");
  const shouldReopenMicRef = useRef<boolean>(false);

  const tts = useTextToSpeech({
    onEnd: () => {
      // In voice mode, automatically reopen the mic for continuous conversation
      if (voiceMode && shouldReopenMicRef.current) {
        shouldReopenMicRef.current = false;
        setTimeout(() => { try { voice.toggleRecording(); } catch {/* noop */} }, 250);
      }
    },
  });

  const voice = useVoiceSearch({
    onTranscript: (_keywords, spoken) => {
      if (spoken?.trim()) send(spoken.trim());
    },
    onError: (msg) => toast({ title: "Micro", description: msg, variant: "destructive" }),
  });

  const loadChats = async () => {
    setLoadingList(true);
    const { data } = await supabase
      .from("ai_chats")
      .select("id,title,updated_at,is_bookmarked,messages")
      .eq("user_id", userId)
      .eq("kind", "club" as any)
      .order("updated_at", { ascending: false })
      .limit(50);
    setChats((data as any as ChatRow[]) || []);
    setLoadingList(false);
  };

  useEffect(() => { if (userId) loadChats(); }, [userId]);

  useEffect(() => {
    if (!activeId) { setActiveChat(null); setMessages([]); return; }
    const found = chats.find((c) => c.id === activeId);
    if (found) {
      setActiveChat(found);
      setMessages(Array.isArray(found.messages) ? found.messages : []);
    }
  }, [activeId, chats]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => { inputRef.current?.focus(); }, [activeId]);

  useEffect(() => {
    try { localStorage.setItem(VOICE_MODE_KEY, voiceMode ? "1" : "0"); } catch {/* noop */}
  }, [voiceMode]);

  // Stop TTS when leaving / switching chat
  useEffect(() => () => { try { tts.stop(); } catch {/* noop */} }, []); // eslint-disable-line

  const openChat = (id: string) => {
    try { tts.stop(); } catch {/* noop */}
    const next = new URLSearchParams(searchParams);
    next.set("assistant", id);
    setSearchParams(next, { replace: false });
  };

  const newChat = () => {
    try { tts.stop(); } catch {/* noop */}
    const next = new URLSearchParams(searchParams);
    next.delete("assistant");
    setSearchParams(next, { replace: false });
    setMessages([]);
    setActiveChat(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const deleteChat = async (id: string) => {
    if (!confirm("Supprimer cette conversation ?")) return;
    await supabase.from("ai_chats").delete().eq("id", id);
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) newChat();
  };

  const toggleBookmark = async () => {
    if (!activeChat) return;
    const next = !activeChat.is_bookmarked;
    await supabase.from("ai_chats").update({ is_bookmarked: next }).eq("id", activeChat.id);
    setActiveChat({ ...activeChat, is_bookmarked: next });
    setChats((prev) => prev.map((c) => (c.id === activeChat.id ? { ...c, is_bookmarked: next } : c)));
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;
    try { tts.stop(); } catch {/* noop */}
    setSending(true);
    setInput("");
    const newMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);

    const clientContext: any = {
      localTime: new Date().toLocaleString("fr-FR", { timeZone: "Africa/Casablanca", dateStyle: "full", timeStyle: "short" }),
    };
    try {
      const manual = localStorage.getItem("geo_manual_address");
      if (manual) clientContext.activeCity = manual;
      const coordsRaw = localStorage.getItem("geo_manual_coords");
      if (coordsRaw) { const c = JSON.parse(coordsRaw); if (c?.lat && c?.lng) clientContext.coords = c; }
    } catch {/* noop */}

    try {
      const { data, error } = await supabase.functions.invoke("club-ai-chat", {
        body: { chatId: activeId, messages: newMsgs, clientContext },
      });
      if (error) throw error;
      const answer = (data as any)?.answer || "";
      const newId = (data as any)?.chatId as string | null;
      setMessages([...newMsgs, { role: "assistant", content: answer }]);
      if (newId && newId !== activeId) {
        const params = new URLSearchParams(searchParams);
        params.set("assistant", newId);
        setSearchParams(params, { replace: true });
      }
      loadChats();

      // Auto-speak in voice mode (and arm mic reopen)
      if (voiceMode && answer) {
        shouldReopenMicRef.current = true;
        lastSpokenRef.current = answer;
        setTimeout(() => { try { tts.speak(answer); } catch {/* noop */} }, 100);
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Impossible de joindre l'assistant.", variant: "destructive" });
      setMessages(newMsgs);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleSpeakMessage = (content: string) => {
    if (!content?.trim()) return;
    shouldReopenMicRef.current = false; // manual play → don't reopen mic after
    tts.speak(content);
  };

  const allSuggestions = useMemo(() => [
    "Mes adresses sauvegardées à Marrakech",
    "Un dîner romantique ce soir près de moi",
    "Météo à Essaouira ce weekend",
    "Suggère-moi un spa similaire à mes favoris",
    "Une activité originale en famille demain",
    "Un rooftop avec vue pour l'apéro",
    "Numéros d'urgence à Marrakech",
    "Un brunch healthy dimanche matin",
    "Une excursion d'une journée depuis Marrakech",
    "Un riad de charme dans la médina",
    "Une pharmacie de garde ce soir",
    "Un restaurant marocain authentique pas cher",
    "Que faire à Essaouira sous la pluie",
    "Une boutique d'artisanat éthique",
    "Un cours de cuisine marocaine",
    "Un café calme pour télétravailler",
    "Une soirée avec musique live ce weekend",
    "Un hammam traditionnel bien noté",
    "Une plage tranquille près d'Essaouira",
    "Un spot photo au lever du soleil",
  ], []);

  const [suggestionPage, setSuggestionPage] = useState(0);
  const visibleSuggestions = useMemo(() => {
    const size = 4;
    const start = (suggestionPage * size) % allSuggestions.length;
    return Array.from({ length: size }, (_, i) => allSuggestions[(start + i) % allSuggestions.length]);
  }, [allSuggestions, suggestionPage]);

  // Upcoming/ongoing trips for quick-start
  type TripCard = {
    id: string;
    title: string;
    arrival_date: string;
    departure_date: string;
    businesses: { id: string; name: string; city: string | null; slug: string }[];
    is_ongoing?: boolean;
  };
  const [trips, setTrips] = useState<TripCard[]>([]);
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: t } = await supabase
        .from("club_trips")
        .select("id,title,arrival_date,departure_date")
        .eq("user_id", userId)
        .gte("departure_date", today)
        .order("arrival_date", { ascending: true })
        .limit(6);
      const ids = (t || []).map((x: any) => x.id);
      let linkMap: Record<string, any[]> = {};
      if (ids.length) {
        const { data: links } = await supabase
          .from("club_trip_businesses")
          .select("trip_id,businesses:business_id(id,name,city,slug)")
          .in("trip_id", ids);
        for (const l of links || []) {
          if ((l as any).businesses) (linkMap[(l as any).trip_id] ||= []).push((l as any).businesses);
        }
      }
      const cards: TripCard[] = (t || []).map((x: any) => ({
        ...x,
        businesses: linkMap[x.id] || [],
        is_ongoing: x.arrival_date <= today && x.departure_date >= today,
      }));
      cards.sort((a, b) => {
        if (!!a.is_ongoing !== !!b.is_ongoing) return a.is_ongoing ? -1 : 1;
        return a.arrival_date.localeCompare(b.arrival_date);
      });
      setTrips(cards.slice(0, 4));
    })();
  }, [userId]);

  const fmtTripDates = (a: string, d: string) => {
    const opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    const ad = new Date(a).toLocaleDateString("fr-FR", opt);
    const dd = new Date(d).toLocaleDateString("fr-FR", opt);
    return ad === dd ? ad : `${ad} – ${dd}`;
  };

  const startTripPrompt = (t: TripCard) => {
    const cities = Array.from(new Set(t.businesses.map((b) => b.city).filter(Boolean))).join(", ");
    const names = t.businesses.map((b) => b.name).slice(0, 6).join(", ");
    const dates = fmtTripDates(t.arrival_date, t.departure_date);
    const lines = [
      `Aide-moi à préparer mon voyage « ${t.title} » (${dates}).`,
      cities ? `Villes : ${cities}.` : "",
      names ? `Adresses déjà sauvegardées : ${names}.` : "",
      `Propose-moi un planning jour par jour, des bonnes adresses complémentaires (restos, activités, vie nocturne) et l'agenda culturel sur place.`,
    ].filter(Boolean);
    send(lines.join(" "));
  };

  const emptyHint = useMemo(() => (
    <div className="text-center py-10 px-4 text-[#C04F17]">
      <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-70" />
      <div className="text-sm font-semibold mb-1">Bonjour 👋</div>
      <div className="text-base opacity-80 mb-4">Demandez-moi la météo, retrouvez une adresse sauvegardée, ou explorez le Maroc.</div>

      {trips.length > 0 && (
        <div className="max-w-md mx-auto mb-5">
          <div className="text-[11px] uppercase tracking-wide font-semibold opacity-70 mb-2 text-left">Mes voyages</div>
          <div className="flex flex-col gap-2">
            {trips.map((t) => (
              <button
                key={t.id}
                onClick={() => startTripPrompt(t)}
                disabled={sending}
                className="w-full text-left bg-white hover:bg-[#C04F17] hover:text-white transition-colors rounded-lg px-3 py-2 border border-[#C04F17]/20 disabled:opacity-50"
              >
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <span>✈️</span>
                  <span className="truncate flex-1">{t.title}</span>
                  {t.is_ongoing && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wide">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      En cours
                    </span>
                  )}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  {fmtTripDates(t.arrival_date, t.departure_date)}
                  {t.businesses.length > 0 && ` · ${t.businesses.length} adresse${t.businesses.length > 1 ? "s" : ""} liée${t.businesses.length > 1 ? "s" : ""}`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
        {visibleSuggestions.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={sending}
            className="text-xs px-3 py-1.5 rounded-full bg-white text-[#C04F17] hover:bg-[#C04F17] hover:text-white transition-colors border border-[#C04F17]/20"
          >
            {s}
          </button>
        ))}
      </div>
      <button
        onClick={() => setSuggestionPage((p) => p + 1)}
        disabled={sending}
        className="mt-4 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[#C04F17] text-white hover:bg-[#C04F17]/90 transition-colors disabled:opacity-50"
      >
        <RefreshCw className="h-3 w-3" />
        Autres suggestions
      </button>
    </div>
  ), [visibleSuggestions, sending, trips]);

  const ttsBusy = tts.status === "loading" || tts.status === "playing" || tts.status === "paused";

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 min-h-[520px]">
      {/* Threads */}
      <aside className="bg-[#ECD6B8] rounded-xl p-3 flex flex-col gap-2 md:max-h-[640px]">
        <button
          onClick={newChat}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-[#C04F17] text-white text-sm font-semibold hover:bg-[#1240d6] transition-colors"
        >
          <Plus className="h-4 w-4" /> Nouvelle conversation
        </button>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center py-8 text-[#C04F17]"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : chats.length === 0 ? (
            <div className="text-sm text-[#C04F17] py-4 text-center opacity-70">Aucune conversation pour l'instant.</div>
          ) : (
            <ul className="flex flex-col gap-1">
              {chats.map((c) => (
                <li key={c.id} className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${activeId === c.id ? "bg-white" : "hover:bg-white/60"}`}>
                  <button onClick={() => openChat(c.id)} className="flex-1 text-left min-w-0">
                    <div className="text-xs font-semibold text-[#C04F17] truncate flex items-center gap-1">
                      {c.is_bookmarked && <Bookmark className="h-3 w-3" fill="currentColor" />}
                      {c.title}
                    </div>
                    <div className="text-[10px] text-[#C04F17]/70">
                      {new Date(c.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }}
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded text-red-600 hover:bg-red-100"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Chat */}
      <section className="relative bg-[#ECD6B8] rounded-xl flex flex-col md:max-h-[640px] min-h-[520px]">
        <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/40">
          <div className="text-sm font-semibold text-[#C04F17] flex-1 break-words">
            {activeChat?.title || "Nouvelle conversation"}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                const next = !voiceMode;
                setVoiceMode(next);
                if (!next) { try { tts.stop(); } catch {/* noop */} }
              }}
              className={`h-8 px-2.5 flex items-center gap-1.5 rounded-full text-[11px] font-semibold transition-colors ${voiceMode ? "bg-[#C04F17] text-white" : "bg-white/70 text-[#C04F17] hover:bg-white"}`}
              title="Mode vocal : lecture automatique + réouverture du micro"
            >
              <Headphones className="h-3.5 w-3.5" /> Mode vocal
            </button>
            {activeChat && (
              <button
                onClick={toggleBookmark}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/60 text-[#C04F17]"
                title={activeChat.is_bookmarked ? "Retirer le bookmark" : "Bookmarker"}
              >
                {activeChat.is_bookmarked ? <BookmarkCheck className="h-4 w-4" fill="currentColor" /> : <Bookmark className="h-4 w-4" />}
              </button>
            )}
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && !sending && emptyHint}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "user" ? (
                <div className="max-w-[80%] px-3 py-2 rounded-2xl bg-[#C04F17] text-white text-sm whitespace-pre-wrap">
                  {m.content}
                </div>
              ) : (
                <div className="max-w-[88%] group">
                  <div className="text-[#0a1d6b] text-sm prose prose-sm max-w-none prose-strong:text-[#C04F17] prose-a:text-[#C04F17] prose-a:underline">
                    <ReactMarkdown components={{ a: ({ href, children }) => <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{children}</a> }}>{linkifyPhones(m.content)}</ReactMarkdown>
                  </div>
                  <button
                    onClick={() => handleSpeakMessage(m.content)}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#C04F17] hover:text-[#0a1d6b] opacity-70 hover:opacity-100 transition-opacity"
                    title={ttsBusy && lastSpokenRef.current === m.content ? "Arrêter la lecture" : "Écouter"}
                  >
                    {ttsBusy && lastSpokenRef.current === m.content
                      ? (<><Square className="h-3 w-3" /> Stop</>)
                      : (<><Volume2 className="h-3 w-3" /> Écouter</>)}
                  </button>
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-[#C04F17] text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> L'assistant réfléchit…
            </div>
          )}
        </div>

        <div className="p-3 border-t border-white/40 flex flex-col gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Demandez la météo, un lieu, ou reprenez un chat…"
            className="w-full resize-none rounded-lg border border-white bg-white px-3 py-2 text-base text-[#0a1d6b] placeholder:text-[#C04F17]/50 focus:outline-none focus:ring-2 focus:ring-[#C04F17]"
            disabled={sending}
          />
          <div className="flex items-center justify-center gap-6 pt-1">
            {/* Micro */}
            <div className="relative">
              <div
                className="absolute rounded-full animate-ping pointer-events-none"
                style={{
                  inset: "-10px",
                  background: "radial-gradient(circle, rgba(25,76,255,0.18) 0%, transparent 70%)",
                  border: "1px solid rgba(25,76,255,0.25)",
                  animationDuration: "2.4s",
                }}
              />
              <button
                type="button"
                onClick={() => voice.toggleRecording()}
                disabled={sending}
                title="Parler"
                className="relative w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-2xl backdrop-saturate-150 border border-white/40 transition-transform hover:scale-105 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.15))",
                  boxShadow: "0 8px 24px rgba(25,76,255,0.30), inset 0 1px 0 rgba(255,255,255,0.6)",
                }}
              >
                <span
                  className="absolute inset-1 rounded-full pointer-events-none"
                  style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.45) 0%, transparent 45%)" }}
                />
                <Mic className="relative h-5 w-5" style={{ color: "#C04F17" }} />
              </button>
            </div>

            {/* Envoyer */}
            <div className="relative">

              <button
                type="button"
                onClick={() => send()}
                disabled={sending || !input.trim()}
                title="Envoyer"
                className="relative w-12 h-12 rounded-full flex items-center justify-center border border-white/40 transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #C04F17, #A03E0F)",
                  boxShadow: "0 8px 24px rgba(192,79,23,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
                }}
              >
                <span
                  className="absolute inset-1 rounded-full pointer-events-none"
                  style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.35) 0%, transparent 45%)" }}
                />
                {sending ? <Loader2 className="relative h-5 w-5 animate-spin text-white" /> : <Send className="relative h-5 w-5 text-white" />}
              </button>
            </div>
          </div>
        </div>

        <VoiceSearchOverlay
          isOpen={voice.status === "recording" || voice.status === "processing"}
          liveTranscript={voice.liveTranscript}
          audioLevel={voice.audioLevel}
          micReady={voice.micReady}
          onClose={() => voice.toggleRecording()}
          onFinish={() => voice.finishRecording()}
          contained
        />
      </section>
    </div>
  );
};

export default ClubAiAssistant;
