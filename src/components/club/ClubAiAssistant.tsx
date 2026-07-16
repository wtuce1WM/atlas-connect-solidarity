import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Send, Trash2, Pencil, MessageSquare, Bookmark, BookmarkCheck, Mic, Volume2, Square, Headphones, RefreshCw, Map as MapIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import MapSlidePanel, { type MapPanelBusiness } from "@/components/club/MapSlidePanel";
import SlidePanelHeader from "@/components/SlidePanelHeader";
const BookOnlineSlidePanel = lazy(() => import("@/components/BookOnlineSlidePanel"));

const AT = {
  fr: {
    newChat: "Nouvelle conversation", noChats: "Aucune conversation pour l'instant.", rename: "Renommer", del: "Supprimer",
    confirmDel: "Supprimer cette conversation ?", renamePrompt: "Renommer la conversation", delError: "Suppression impossible", renameError: "Renommage impossible",
    voiceMode: "Mode vocal", voiceModeTip: "Mode vocal : lecture automatique + réouverture du micro",
    removeBookmark: "Retirer le bookmark", addBookmark: "Bookmarker",
    hello: "Bonjour 👋", helloDesc: "Demandez-moi la météo, retrouvez une adresse sauvegardée, ou explorez le Maroc.",
    myTrips: "Mes voyages", ongoing: "En cours", linked: "liée", linkeds: "liées", address: "adresse", addresses: "adresses",
    moreSuggestions: "Autres suggestions", placesOnMap: "lieux sur la carte", openMap: "Ouvrir la carte →",
    stopPlayback: "Arrêter la lecture", listen: "Écouter", stop: "Stop",
    thinking: "L'assistant réfléchit…", speak: "Parler", sendBtn: "Envoyer",
    ficheNotFound: "Fiche introuvable", ficheNotFoundOpen: "Impossible d'ouvrir cette fiche.", ficheNotFoundFor: (n: string) => `Aucune fiche trouvée pour "${n}".`,
    micError: "Micro", chatError: "Erreur", cantReach: "Impossible de joindre l'assistant.",
    linkCopied: "Lien copié", linkCopiedDesc: "Le lien de la conversation a été copié.", myClubSpace: "Mon espace Club",
    placeholder: "Demandez la météo, un lieu, ou reprenez un chat…",
    openFiche: "Ouvrir la fiche",
    localeTz: "fr-FR",
    tripPrompt: (title: string, dates: string, cities: string, names: string) => [
      `Aide-moi à préparer mon voyage « ${title} » (${dates}).`,
      cities ? `Villes : ${cities}.` : "",
      names ? `Adresses déjà sauvegardées : ${names}.` : "",
      `Propose-moi un planning jour par jour, des bonnes adresses complémentaires (restos, activités, vie nocturne) et l'agenda culturel sur place.`,
    ].filter(Boolean).join(" "),
    suggestions: [
      "Montre-moi sur une carte les hôtels avec piscine à Marrakech",
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
    ],
  },
  en: {
    newChat: "New conversation", noChats: "No conversation yet.", rename: "Rename", del: "Delete",
    confirmDel: "Delete this conversation?", renamePrompt: "Rename conversation", delError: "Delete failed", renameError: "Rename failed",
    voiceMode: "Voice mode", voiceModeTip: "Voice mode: auto playback + mic reopens",
    removeBookmark: "Remove bookmark", addBookmark: "Bookmark",
    hello: "Hello 👋", helloDesc: "Ask me about the weather, find a saved place, or explore Morocco.",
    myTrips: "My trips", ongoing: "Ongoing", linked: "linked", linkeds: "linked", address: "place", addresses: "places",
    moreSuggestions: "More suggestions", placesOnMap: "places on the map", openMap: "Open the map →",
    stopPlayback: "Stop playback", listen: "Listen", stop: "Stop",
    thinking: "The assistant is thinking…", speak: "Speak", sendBtn: "Send",
    ficheNotFound: "Listing not found", ficheNotFoundOpen: "Unable to open this listing.", ficheNotFoundFor: (n: string) => `No listing found for "${n}".`,
    micError: "Microphone", chatError: "Error", cantReach: "Unable to reach the assistant.",
    linkCopied: "Link copied", linkCopiedDesc: "The conversation link has been copied.", myClubSpace: "My Club Space",
    placeholder: "Ask about weather, a place, or resume a chat…",
    openFiche: "Open listing",
    localeTz: "en-GB",
    tripPrompt: (title: string, dates: string, cities: string, names: string) => [
      `Help me prepare my trip "${title}" (${dates}).`,
      cities ? `Cities: ${cities}.` : "",
      names ? `Already saved places: ${names}.` : "",
      `Suggest a day-by-day itinerary, good complementary places (restaurants, activities, nightlife) and the local cultural agenda.`,
    ].filter(Boolean).join(" "),
    suggestions: [
      "Show me hotels with a pool in Marrakech on a map",
      "My saved places in Marrakech",
      "A romantic dinner tonight near me",
      "Weather in Essaouira this weekend",
      "Suggest a spa similar to my favorites",
      "An original family activity tomorrow",
      "A rooftop with a view for sunset drinks",
      "Emergency numbers in Marrakech",
      "A healthy Sunday brunch",
      "A day trip from Marrakech",
      "A charming riad in the medina",
      "A pharmacy open tonight",
      "An affordable authentic Moroccan restaurant",
      "What to do in Essaouira in the rain",
      "An ethical craft boutique",
      "A Moroccan cooking class",
      "A quiet café to work from",
      "Live music night this weekend",
      "A well-rated traditional hammam",
      "A quiet beach near Essaouira",
      "A sunrise photo spot",
    ],
  },
  ar: {
    newChat: "محادثة جديدة", noChats: "لا توجد محادثات بعد.", rename: "إعادة تسمية", del: "حذف",
    confirmDel: "حذف هذه المحادثة؟", renamePrompt: "إعادة تسمية المحادثة", delError: "فشل الحذف", renameError: "فشل إعادة التسمية",
    voiceMode: "الوضع الصوتي", voiceModeTip: "الوضع الصوتي: تشغيل تلقائي + إعادة فتح الميكروفون",
    removeBookmark: "إزالة الإشارة", addBookmark: "إشارة مرجعية",
    hello: "مرحباً 👋", helloDesc: "اسألني عن الطقس، ابحث عن مكان محفوظ، أو استكشف المغرب.",
    myTrips: "رحلاتي", ongoing: "جارٍ", linked: "مرتبط", linkeds: "مرتبطة", address: "مكان", addresses: "أماكن",
    moreSuggestions: "اقتراحات أخرى", placesOnMap: "أماكن على الخريطة", openMap: "فتح الخريطة →",
    stopPlayback: "إيقاف", listen: "استماع", stop: "إيقاف",
    thinking: "المساعد يفكّر…", speak: "تحدّث", sendBtn: "إرسال",
    ficheNotFound: "لم يتم العثور على البطاقة", ficheNotFoundOpen: "تعذّر فتح هذه البطاقة.", ficheNotFoundFor: (n: string) => `لا توجد بطاقة لـ "${n}".`,
    micError: "الميكروفون", chatError: "خطأ", cantReach: "تعذّر الوصول إلى المساعد.",
    linkCopied: "تم نسخ الرابط", linkCopiedDesc: "تم نسخ رابط المحادثة.", myClubSpace: "مساحتي في النادي",
    placeholder: "اسأل عن الطقس، مكان، أو استأنف محادثة…",
    openFiche: "فتح البطاقة",
    localeTz: "ar-MA",
    tripPrompt: (title: string, dates: string, cities: string, names: string) => [
      `ساعدني في تحضير رحلتي « ${title} » (${dates}).`,
      cities ? `المدن: ${cities}.` : "",
      names ? `أماكن محفوظة مسبقاً: ${names}.` : "",
      `اقترح لي برنامجاً يومياً وأماكن إضافية جيدة (مطاعم، أنشطة، سهرات) والأجندة الثقافية المحلية.`,
    ].filter(Boolean).join(" "),
    suggestions: [
      "أرني على الخريطة فنادق مع مسبح في مراكش",
      "أماكني المحفوظة في مراكش",
      "عشاء رومانسي الليلة قريب مني",
      "الطقس في الصويرة هذا الأسبوع",
      "اقترح لي سبا مشابهاً لمفضلاتي",
      "نشاط عائلي أصلي غداً",
      "روفتوب بإطلالة لأمسية",
      "أرقام الطوارئ في مراكش",
      "برانش صحي يوم الأحد",
      "رحلة يوم من مراكش",
      "رياض ساحر في المدينة القديمة",
      "صيدلية مناوبة الليلة",
      "مطعم مغربي أصيل بسعر مناسب",
      "ماذا أفعل في الصويرة تحت المطر",
      "متجر حرف يدوية أخلاقي",
      "درس طبخ مغربي",
      "مقهى هادئ للعمل",
      "سهرة موسيقى حية هذا الأسبوع",
      "حمام تقليدي مقيّم جيداً",
      "شاطئ هادئ قرب الصويرة",
      "مكان تصوير عند شروق الشمس",
    ],
  },
} as const;


// Resolve a business slug (or id) to its UUID, with in-memory cache.
const slugIdCache = new Map<string, string>();
async function resolveBusinessId(slugOrId: string): Promise<string | null> {
  const key = slugOrId.trim();
  if (!key) return null;
  if (slugIdCache.has(key)) return slugIdCache.get(key)!;
  // UUID? use as-is.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
    slugIdCache.set(key, key);
    return key;
  }
  const { data } = await supabase.from("businesses").select("id").eq("slug", key).maybeSingle();
  const id = (data as any)?.id || null;
  if (id) slugIdCache.set(key, id);
  return id;
}

// Match /b/<slug> or /fiche/<slug>, optionally with full origin.
function extractBusinessSlugFromHref(href: string | undefined): string | null {
  if (!href) return null;
  const m = href.match(/(?:^|\/)(?:b|fiche)\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
}

// Remove "[voir la fiche](url)" / "[fiche](url)" markdown links and bare /b/SLUG URLs
// the model may still emit despite the system prompt.
function stripFicheLinks(text: string): string {
  return text
    .replace(/\s*\[(?:voir\s+la\s+fiche|fiche|voir\s+la\s+fiche\s+complète)\]\([^)]*\)/gi, "")
    .replace(/\s*\(https?:\/\/[^\s)]*\/(?:b|fiche)\/[^\s)]+\)/gi, "")
    .replace(/\s+([,.;:!?])/g, "$1");
}

function extractStrongBusinessCandidates(markdown: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  const add = (value: string) => {
    const name = value.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[`*_#>]/g, "").trim();
    if (!name || name.length > 80 || name.includes("\n")) return;
    const key = name.toLowerCase();
    if (!seen.has(key)) { seen.add(key); names.push(name); }
  };
  const re = /(\*\*|__)([\s\S]*?)\1/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown))) {
    add(match[2]);
    add(match[2].replace(/\s*\([^)]*\)\s*$/g, ""));
  }
  return names;
}


type Msg = { role: "user" | "assistant"; content: string };

type BusinessPanelRef = { id: string; slug: string | null; name: string };

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

// Parse <!--SHOW_ON_MAP:{...}--> markers out of an assistant message.
const MAP_RE = /<!--SHOW_ON_MAP:([\s\S]*?)-->/g;
type MapPayload = { title?: string; businesses: MapPanelBusiness[] };
function extractMapPayloads(text: string): { clean: string; maps: MapPayload[] } {
  if (!text || !text.includes("<!--SHOW_ON_MAP:")) return { clean: text, maps: [] };
  const maps: MapPayload[] = [];
  let clean = text.replace(MAP_RE, (_m, raw) => {
    try {
      const parsed = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (parsed && Array.isArray(parsed.businesses) && parsed.businesses.length) {
        maps.push({ title: parsed.title, businesses: parsed.businesses });
      }
    } catch { /* ignore */ }
    return "";
  });
  // Safety net: strip any unclosed/truncated marker (would otherwise render as raw JSON).
  clean = clean.replace(/<!--SHOW_ON_MAP:[\s\S]*$/g, "").trim();
  return { clean, maps };
}


const ClubAiAssistant = ({ userId }: Props) => {
  const { language } = useLanguage();
  const at = AT[language as keyof typeof AT] || AT.fr;
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
  const activeIdRef = useRef<string | null>(activeId);
  const activeChatIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Msg[]>([]);
  const deletedChatIdsRef = useRef<Set<string>>(new Set());

  const tts = useTextToSpeech({
    onEnd: () => {
      // In voice mode, automatically reopen the mic for continuous conversation.
      // Skip on Android: speaker bleed into the mic makes the AI hear itself,
      // generating an endless loop of beeps + responses on Samsung devices.
      const isAndroidUA = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
      if (voiceMode && shouldReopenMicRef.current && !isAndroidUA) {
        shouldReopenMicRef.current = false;
        setTimeout(() => { try { voice.toggleRecording(); } catch {/* noop */} }, 250);
      } else {
        shouldReopenMicRef.current = false;
      }
    },
  });

  const voice = useVoiceSearch({
    onTranscript: (_keywords, spoken) => {
      if (spoken?.trim()) send(spoken.trim());
    },
    onError: (msg) => toast({ title: at.micError, description: msg, variant: "destructive" }),
  });
  const isMobileHook = useIsMobile();
  const [isTabletOrBelow, setIsTabletOrBelow] = useState<boolean>(
    () => typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsTabletOrBelow(window.innerWidth < 1024);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);
  const isMobile = isMobileHook || isTabletOrBelow;

  // Map slide-panel state (opened when the user clicks a mini-map card in a message).
  const [openMap, setOpenMap] = useState<MapPayload | null>(null);
  const [openBusinessId, setOpenBusinessId] = useState<string | null>(null);
  const [isBusinessPanelClosing, setIsBusinessPanelClosing] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [orderedBusinessRefs, setOrderedBusinessRefs] = useState<BusinessPanelRef[]>([]);
  // Notify the parent Club page so it can hide its 4-CTA HomeBottomBar
  // while the slide-panel (with its own 6-CTA PanelSearchBar) is open.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("club:panel", { detail: { open: !!openBusinessId } }));
    return () => {
      window.dispatchEvent(new CustomEvent("club:panel", { detail: { open: false } }));
    };
  }, [openBusinessId]);
  useEffect(() => { if (!openBusinessId) setActiveSlug(null); }, [openBusinessId]);
  // Index of business name -> slug, fed from every <!--SHOW_ON_MAP:--> payload in the conversation.
  const nameToSlugRef = useRef<Map<string, string>>(new Map());

  // Ordered, deduped list of businesses cited across the conversation.
  // Mirrors blog article panels: the BookOnlineSlidePanel receives prev/next IDs.
  useEffect(() => {
    let cancelled = false;

    const buildOrderedRefs = async () => {
      const refs: BusinessPanelRef[] = [];
      const seenIds = new Set<string>();
      const seenNames = new Set<string>();
      const strongNames: string[] = [];
      const addRef = (id?: string | null, slug?: string | null, name?: string | null) => {
        if (!id || seenIds.has(id)) return;
        seenIds.add(id);
        if (name) seenNames.add(name.toLowerCase());
        refs.push({ id, slug: slug || null, name: name || slug || id });
      };

    for (const m of messages) {
      if (m.role !== "assistant") continue;
        const { maps } = extractMapPayloads(m.content);
        for (const mp of maps) {
          for (const b of mp.businesses) {
            addRef(b?.id, b?.slug || null, b?.name || null);
          }
        }
        for (const name of extractStrongBusinessCandidates(m.content)) {
          if (!seenNames.has(name.toLowerCase())) strongNames.push(name);
        }
      }

      if (strongNames.length) {
        const resolved = await Promise.all(strongNames.slice(0, 30).map(async (name) => {
          const { data } = await supabase
            .from("businesses")
            .select("id,slug,name")
            .eq("is_active", true)
            .ilike("name", name)
            .limit(1);
          const row = Array.isArray(data) ? data[0] : null;
          return row ? { id: row.id as string, slug: (row as any).slug as string | null, name: (row as any).name as string } : null;
        }));
        for (const row of resolved) addRef(row?.id, row?.slug || null, row?.name || null);
      }

      if (!cancelled) setOrderedBusinessRefs(refs);
    };

    void buildOrderedRefs();
    return () => { cancelled = true; };
  }, [messages]);

  const currentBusinessIdx = openBusinessId ? orderedBusinessRefs.findIndex((b) => b.id === openBusinessId) : -1;
  const hasPrevBusiness = currentBusinessIdx > 0;
  const hasNextBusiness = currentBusinessIdx >= 0 && currentBusinessIdx < orderedBusinessRefs.length - 1;

  const openBusinessBySlug = async (slug: string) => {
    const id = await resolveBusinessId(slug);
    if (id) {
      setActiveSlug(slug);
      setOpenBusinessId(id);
      setOrderedBusinessRefs((prev) => prev.some((b) => b.id === id) ? prev : [...prev, { id, slug, name: slug }]);
      return true;
    }
    return false;
  };

  const goPrevBusiness = () => {
    if (hasPrevBusiness) {
      const prev = orderedBusinessRefs[currentBusinessIdx - 1];
      setActiveSlug(prev.slug);
      setOpenBusinessId(prev.id);
    }
  };
  const goNextBusiness = () => {
    if (hasNextBusiness) {
      const next = orderedBusinessRefs[currentBusinessIdx + 1];
      setActiveSlug(next.slug);
      setOpenBusinessId(next.id);
    }
  };

  const closeBusinessPanel = () => {
    setIsBusinessPanelClosing(true);
    window.setTimeout(() => {
      setOpenBusinessId(null);
      setIsBusinessPanelClosing(false);
    }, 300);
  };

  const handleOpenBusinessLink = async (href: string | undefined) => {
    const slug = extractBusinessSlugFromHref(href);
    if (!slug) return false;
    const ok = await openBusinessBySlug(slug);
    if (!ok) toast({ title: at.ficheNotFound, description: at.ficheNotFoundOpen, variant: "destructive" });
    return true;
  };

  const handleOpenBusinessName = async (name: string) => {
    const n = name.trim();
    if (!n) return;
    // Try cached map payloads (name -> slug) first
    const slug = nameToSlugRef.current.get(n.toLowerCase());
    if (slug) {
      const ok = await openBusinessBySlug(slug);
      if (ok) return;
    }
    // Fallback: look up by exact name in DB (also fetch slug to enable prev/next nav)
    const { data } = await supabase.from("businesses").select("id,slug").ilike("name", n).limit(1).maybeSingle();
    const id = (data as any)?.id;
    const dbSlug = (data as any)?.slug;
    if (id) {
      setActiveSlug(dbSlug || null);
      setOpenBusinessId(id);
      setOrderedBusinessRefs((prev) => prev.some((b) => b.id === id) ? prev : [...prev, { id, slug: dbSlug || null, name: n }]);
    } else {
      toast({ title: at.ficheNotFound, description: at.ficheNotFoundFor(n), variant: "destructive" });
    }
  };




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

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { activeChatIdRef.current = activeChat?.id ?? null; }, [activeChat?.id]);

  const updateAssistantParam = (id: string | null, replace = false) => {
    const next = new URLSearchParams(typeof window !== "undefined" ? window.location.search : searchParams.toString());
    if (id) next.set("assistant", id);
    else next.delete("assistant");
    activeIdRef.current = id;
    setSearchParams(next, { replace });
  };

  useEffect(() => {
    if (!activeId) {
      activeChatIdRef.current = null;
      messagesRef.current = [];
      setActiveChat(null);
      setMessages([]);
      return;
    }
    const found = chats.find((c) => c.id === activeId);
    if (found) {
      deletedChatIdsRef.current.delete(activeId);
      activeChatIdRef.current = found.id;
      const nextMessages = Array.isArray(found.messages) ? found.messages : [];
      messagesRef.current = nextMessages;
      setActiveChat(found);
      setMessages(nextMessages);
    } else if (!loadingList) {
      // If the URL still points to a chat removed from the list/DB, clear it
      // immediately so the next prompt starts a brand-new conversation.
      updateAssistantParam(null, true);
      activeChatIdRef.current = null;
      messagesRef.current = [];
      setActiveChat(null);
      setMessages([]);
    }
  }, [activeId, chats, loadingList]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  // (Previously locked html/body overflow to force an internal scroll area.
  // The conversation now grows with content and the page scrolls naturally,
  // so no scroll lock is needed.)


  useEffect(() => { inputRef.current?.focus(); }, [activeId]);

  useEffect(() => {
    try { localStorage.setItem(VOICE_MODE_KEY, voiceMode ? "1" : "0"); } catch {/* noop */}
  }, [voiceMode]);

  // Stop TTS when leaving / switching chat
  useEffect(() => () => { try { tts.stop(); } catch {/* noop */} }, []); // eslint-disable-line

  const newChat = (replace = false) => {
    try { tts.stop(); } catch {/* noop */}
    updateAssistantParam(null, replace);
    activeChatIdRef.current = null;
    messagesRef.current = [];
    setActiveChat(null);
    setMessages([]);
    setTimeout(() => inputRef.current?.focus(), 50);
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
    const candidateChatId = activeIdRef.current;
    const safeChatId = candidateChatId
      && activeChatIdRef.current === candidateChatId
      && !deletedChatIdsRef.current.has(candidateChatId)
        ? candidateChatId
        : null;
    const baseMessages = safeChatId ? messagesRef.current : [];
    const newMsgs: Msg[] = [...baseMessages, { role: "user", content: text }];
    messagesRef.current = newMsgs;
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

    const aiStartedAt = performance.now();
    import("@/lib/analytics").then(({ trackEvent, trackAhaMoment }) => {
      trackEvent("ai_query_submitted", {
        chars: text.length,
        voice_mode: !!voiceMode,
        has_history: newMsgs.length > 1,
      });
      trackAhaMoment("first_ai_query", { voice_mode: !!voiceMode });
    }).catch(() => {});


    try {
      const { data, error } = await supabase.functions.invoke("club-ai-chat", {
        body: { chatId: safeChatId, messages: newMsgs, clientContext, language },
      });

      if (error) throw error;
      const answer = (data as any)?.answer || "";
      import("@/lib/analytics").then(({ trackEvent }) =>
        trackEvent("ai_response_received", {
          latency_ms: Math.round(performance.now() - aiStartedAt),
          chars: answer.length,
          voice_mode: !!voiceMode,
        })
      ).catch(() => {});
      const newId = (data as any)?.chatId as string | null;
      const fullMessages: Msg[] = [...newMsgs, { role: "assistant", content: answer }];
      messagesRef.current = fullMessages;
      setMessages(fullMessages);
      if (newId) {
        deletedChatIdsRef.current.delete(newId);
        activeChatIdRef.current = newId;
        setActiveChat((prev) => prev?.id === newId
          ? { ...prev, messages: fullMessages, updated_at: new Date().toISOString() }
          : { id: newId, title: text.slice(0, 200) || at.newChat, updated_at: new Date().toISOString(), is_bookmarked: false, messages: fullMessages }
        );
      }
      if (newId && newId !== safeChatId) {
        updateAssistantParam(newId, true);
      }
      loadChats();

      // Auto-speak in voice mode (and arm mic reopen)
      if (voiceMode && answer) {
        shouldReopenMicRef.current = true;
        lastSpokenRef.current = answer;
        setTimeout(() => { try { tts.speak(answer); } catch {/* noop */} }, 100);
      }
    } catch (e: any) {
      toast({ title: at.chatError, description: e?.message || at.cantReach, variant: "destructive" });
      messagesRef.current = newMsgs;
      setMessages(newMsgs);
      import("@/lib/analytics").then(({ trackEvent }) =>
        trackEvent("ai_response_error", {
          latency_ms: Math.round(performance.now() - aiStartedAt),
          message: String(e?.message || "error").slice(0, 160),
        })
      ).catch(() => {});
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

  const allSuggestions = useMemo(() => at.suggestions, [at]);


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
    const ad = new Date(a).toLocaleDateString(at.localeTz, opt);
    const dd = new Date(d).toLocaleDateString(at.localeTz, opt);
    return ad === dd ? ad : `${ad} – ${dd}`;
  };

  const startTripPrompt = (tr: TripCard) => {
    const cities = Array.from(new Set(tr.businesses.map((b) => b.city).filter(Boolean))).join(", ");
    const names = tr.businesses.map((b) => b.name).slice(0, 6).join(", ");
    const dates = fmtTripDates(tr.arrival_date, tr.departure_date);
    send(at.tripPrompt(tr.title, dates, cities, names));
  };


  const emptyHint = useMemo(() => (
    <div className="text-center py-10 px-4 text-[#C04F17]">
      <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-70" />
      <div className="text-sm font-semibold mb-1">{at.hello}</div>
      <div className="text-base opacity-80 mb-4">{at.helloDesc}</div>

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
        {at.moreSuggestions}
      </button>
    </div>
  ), [visibleSuggestions, sending]);

  const ttsBusy = tts.status === "loading" || tts.status === "playing" || tts.status === "paused";

  return (
    <div className={`flex flex-col gap-4 min-h-[520px] transition-[width,max-width,padding] duration-300 ease-out ${openBusinessId ? "lg:w-1/2 lg:max-w-[calc(50vw-1rem)] lg:pr-2" : "w-full"}`}>
      {/* Chat */}
      <section className="relative bg-[#ECD6B8] rounded-xl flex flex-col min-h-[300px]">
        <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/40">
          <button
            onClick={() => newChat()}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#C04F17] text-white text-sm font-semibold hover:bg-[#1240d6] transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" /> {at.newChat}
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                const next = !voiceMode;
                setVoiceMode(next);
                if (!next) { try { tts.stop(); } catch {/* noop */} }
              }}
              className={`h-8 px-2.5 flex items-center gap-1.5 rounded-full text-[11px] font-semibold transition-colors ${voiceMode ? "bg-[#C04F17] text-white" : "bg-white/70 text-[#C04F17] hover:bg-white"}`}
              title={at.voiceModeTip}
            >
              <Headphones className="h-3.5 w-3.5" /> {at.voiceMode}
            </button>
            {activeChat && (
              <button
                onClick={toggleBookmark}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/60 text-[#C04F17]"
                title={activeChat.is_bookmarked ? at.removeBookmark : at.addBookmark}
              >
                {activeChat.is_bookmarked ? <BookmarkCheck className="h-4 w-4" fill="currentColor" /> : <Bookmark className="h-4 w-4" />}
              </button>
            )}
          </div>
        </header>

        <div ref={scrollRef} className="px-4 py-4 space-y-3">
          {messages.length === 0 && !sending && emptyHint}
          {messages.map((m, i) => {
            const { clean, maps } = m.role === "assistant"
              ? extractMapPayloads(m.content)
              : { clean: m.content, maps: [] as MapPayload[] };
            // Index business names → slugs for clickable bold names.
            for (const mp of maps) {
              for (const b of mp.businesses) {
                if (b?.name && b?.slug) nameToSlugRef.current.set(b.name.toLowerCase(), b.slug);
              }
            }
            return (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "user" ? (
                  <div className="max-w-[80%] px-3 py-2 rounded-2xl bg-[#C04F17] text-white text-sm whitespace-pre-wrap">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[88%] group w-full">
                    <div className="text-[#0a1d6b] text-sm prose prose-sm max-w-none prose-strong:text-[#C04F17] prose-a:text-[#C04F17] prose-a:underline">
                      <ReactMarkdown components={{
                        a: ({ href, children }) => {
                          const isBusinessLink = !!extractBusinessSlugFromHref(href);
                          if (isBusinessLink) {
                            return (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={() => { void handleOpenBusinessLink(href); }}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void handleOpenBusinessLink(href); } }}
                                className="cursor-pointer underline text-[#C04F17]"
                              >{children}</span>
                            );
                          }
                          return <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{children}</a>;
                        },
                        strong: ({ children }) => {
                          const text = Array.isArray(children)
                            ? children.map((c) => (typeof c === "string" ? c : "")).join("")
                            : (typeof children === "string" ? children : "");
                          const trimmed = text.trim();
                          if (trimmed && trimmed.length <= 80) {
                            return (
                              <strong
                                role="button"
                                tabIndex={0}
                                onClick={() => void handleOpenBusinessName(trimmed)}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void handleOpenBusinessName(trimmed); } }}
                                className="cursor-pointer hover:underline"
                                title={at.openFiche}
                              >{children}</strong>
                            );
                          }
                          return <strong>{children}</strong>;
                        },
                      }}>{linkifyPhones(stripFicheLinks(clean))}</ReactMarkdown>
                    </div>
                    {maps.map((mp, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setOpenMap(mp)}
                        className="mt-2 w-full flex items-center gap-3 p-3 rounded-xl bg-white/80 hover:bg-white border border-[#C04F17]/20 transition-colors text-left group/map"
                      >
                        <div className="relative h-16 w-20 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-[#C04F17]/15 to-[#D4AF37]/20 flex items-center justify-center">
                          <MapIcon className="h-6 w-6 text-[#C04F17]" />
                          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, rgba(192,79,23,0.35) 0 3px, transparent 4px), radial-gradient(circle at 70% 60%, rgba(212,175,55,0.45) 0 3px, transparent 4px), radial-gradient(circle at 50% 75%, rgba(192,79,23,0.3) 0 3px, transparent 4px)" }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-[#C04F17] truncate">
                            {mp.title || `${mp.businesses.length} ${at.placesOnMap}`}
                          </div>
                          <div className="text-[11px] text-[#0a1d6b]/70 truncate">
                            {mp.businesses.slice(0, 3).map((b) => b.name).join(" · ")}
                            {mp.businesses.length > 3 ? ` · +${mp.businesses.length - 3}` : ""}
                          </div>
                          <div className="text-[11px] text-[#C04F17] mt-0.5 font-medium group-hover/map:underline">
                            {at.openMap}
                          </div>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => handleSpeakMessage(clean)}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#C04F17] hover:text-[#0a1d6b] opacity-70 hover:opacity-100 transition-opacity"
                      title={ttsBusy && lastSpokenRef.current === clean ? at.stopPlayback : at.listen}
                    >
                      {ttsBusy && lastSpokenRef.current === clean
                        ? (<><Square className="h-3 w-3" /> {at.stop}</>)
                        : (<><Volume2 className="h-3 w-3" /> {at.listen}</>)}

                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {sending && (
            <div className="flex items-center gap-2 text-[#C04F17] text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {at.thinking}
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
            placeholder={at.placeholder}
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
                title={at.speak}
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
                title={at.sendBtn}
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
          contained={!isMobile}
          bgClassName="bg-[#ECD6B8]"

        />
      </section>

      <MapSlidePanel
        open={!!openMap}
        onClose={() => setOpenMap(null)}
        title={openMap?.title}
        businesses={openMap?.businesses || []}
        isMobile={isMobile}
        isBookmarked={!!activeChat?.is_bookmarked}
        onBookmark={activeChat ? toggleBookmark : undefined}
        onShare={async () => {
          const url = window.location.href;
          try {
            if (navigator.share) {
              await navigator.share({ title: activeChat?.title || at.myClubSpace, url });
            } else {
              await navigator.clipboard.writeText(url);
              toast({ title: at.linkCopied, description: at.linkCopiedDesc });
            }
          } catch { /* user cancelled */ }
        }}
      />

      {openBusinessId && (
        <div
          className={`fixed top-0 left-0 right-0 bottom-0 z-[220] bg-background shadow-2xl overflow-visible flex flex-col transform-gpu will-change-transform lg:left-auto lg:bottom-auto lg:border-l lg:border-border lg:w-1/2 ${isBusinessPanelClosing ? "animate-slide-out-right" : "animate-slide-in-right"}`}
          style={{ height: "100dvh" }}
        >
          <SlidePanelHeader onClose={closeBusinessPanel} alwaysDark glassClose />
          <div className="flex-1 min-h-0 overflow-visible">
            <Suspense fallback={null}>
              <BookOnlineSlidePanel
                key={openBusinessId}
                businessId={openBusinessId}
                onClose={closeBusinessPanel}
                showSearchBar
                onPrevBusiness={goPrevBusiness}
                onNextBusiness={goNextBusiness}
                hasPrevBusiness={hasPrevBusiness}
                hasNextBusiness={hasNextBusiness}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubAiAssistant;
