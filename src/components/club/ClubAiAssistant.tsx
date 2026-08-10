import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Send, Trash2, Pencil, MessageSquare, Bookmark, BookmarkCheck, Mic, Volume2, Square, Headphones, RefreshCw, Map as MapIcon, Calendar as CalendarIcon, ThumbsUp, ThumbsDown, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import MapSlidePanel, { type MapPanelBusiness } from "@/components/club/MapSlidePanel";
import EmbedWeatherWidget, { type WeatherPayload } from "@/components/embed/EmbedWeatherWidget";
import SlidePanelHeader from "@/components/SlidePanelHeader";
import EventsSlidePanel from "@/components/club/EventsSlidePanel";
import BlogSlidePanel from "@/components/club/BlogSlidePanel";
import VideoThumbnail from "@/components/VideoThumbnail";
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
    thinking: "L'assistant réfléchit…", writing: "L'IA écrit…", speak: "Parler", sendBtn: "Envoyer",
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
    thinking: "The assistant is thinking…", writing: "The AI is writing…", speak: "Speak", sendBtn: "Send",
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
    thinking: "المساعد يفكّر…", writing: "الذكاء الاصطناعي يكتب…", speak: "تحدّث", sendBtn: "إرسال",
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

type BusinessLookupRef = { id?: string | null; slug?: string | null; name: string };

const BUSINESS_MATCH_STOP_WORDS = new Set([
  "le", "la", "les", "l", "un", "une", "des", "du", "de", "d", "au", "aux", "et", "and", "the", "a",
  "avec", "sur", "dans", "en", "of", "in", "with", "marrakech", "maroc", "morocco",
]);

function normalizeBusinessName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`´]/g, "'")
    .replace(/^(le|la|les|l'|l’|the)\s+/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function businessNameTokens(value: string): string[] {
  return normalizeBusinessName(value)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !BUSINESS_MATCH_STOP_WORDS.has(token));
}

function businessNameMatchScore(candidate: string, target: string): number {
  const c = normalizeBusinessName(candidate);
  const t = normalizeBusinessName(target);
  if (!c || !t) return 0;
  if (c === t) return 1;
  if (c.includes(t) || t.includes(c)) {
    const shortest = Math.min(c.length, t.length);
    const longest = Math.max(c.length, t.length);
    return 0.82 + Math.min(0.12, shortest / Math.max(longest, 1) / 8);
  }

  const cTokens = businessNameTokens(candidate);
  const tTokens = businessNameTokens(target);
  if (!cTokens.length || !tTokens.length) return 0;

  const tSet = new Set(tTokens);
  const common = cTokens.filter((token) => tSet.has(token)).length;
  if (!common) return 0;

  const candidateCoverage = common / cTokens.length;
  const targetCoverage = common / tTokens.length;
  return candidateCoverage * 0.65 + targetCoverage * 0.35;
}

async function resolveBusinessByName(name: string): Promise<BusinessLookupRef | null> {
  const n = name.trim();
  if (!n) return null;

  const { data: exactData } = await supabase
    .from("businesses")
    .select("id,slug,name")
    .eq("is_active", true)
    .ilike("name", n)
    .limit(5);
  const exactRows = Array.isArray(exactData) ? exactData : [];
  const exactBest = exactRows
    .map((candidate: any) => ({ candidate, score: businessNameMatchScore(candidate?.name || "", n) }))
    .sort((a, b) => b.score - a.score)[0];
  if (exactBest?.candidate && exactBest.score >= 0.9) {
    return { id: exactBest.candidate.id, slug: exactBest.candidate.slug || null, name: exactBest.candidate.name };
  }

  const tokens = businessNameTokens(n);
  let query = supabase.from("businesses").select("id,slug,name").eq("is_active", true);
  if (tokens.length >= 2) {
    query = query.or(tokens.slice(0, 5).map((token) => `name.ilike.%${token}%`).join(","));
  } else {
    query = query.ilike("name", `%${n}%`);
  }

  const { data } = await query.limit(50);
  const rows = Array.isArray(data) ? data : [];
  const best = rows
    .map((candidate: any) => ({ candidate, score: businessNameMatchScore(candidate?.name || "", n) }))
    .sort((a, b) => b.score - a.score)[0];

  if (best?.candidate && best.score >= 0.58) {
    return { id: best.candidate.id, slug: best.candidate.slug || null, name: best.candidate.name };
  }
  return null;
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
const SEARCH_RESULTS_RE = /<!--SEARCH_RESULTS:[\s\S]*?-->/g;
const EVENTS_RE = /<!--EVENTS_SNAPSHOT:([\s\S]*?)-->/g;
const KNOWN_RE = /<!--KNOWN_BUSINESSES:([\s\S]*?)-->/g;
const BLOG_CARDS_RE = /<!--BLOG_CARDS:([\s\S]*?)-->/g;
// Route curatée partagée (_shared/ai-engine/routes/curated.ts) : article de blog
// rendu en carte éditoriale. On le mappe sur les cartes blog existantes.
const ARTICLE_CARD_RE = /<!--ARTICLE_CARD:([\s\S]*?)-->/g;
const BLOG_CTX_RE = /<!--BLOG_CTX:[\s\S]*?-->/g;
const WEATHER_RE = /<!--WEATHER_FORECAST:([\s\S]*?)-->/g;
type MapPayload = { title?: string; businesses: MapPanelBusiness[]; order?: string | null };
export type BlogCardItem = { id: string; slug: string; title: string; cover: string | null; tldr: string | null };
export type EventPanelItem = {
  id: string;
  name: string;
  hook?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  days_of_week?: number[] | null;
  start_time?: string | null;
  end_time?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  url?: string | null;
  default_business_id?: string | null;
  business_name?: string | null;
  image?: string | null;
  video?: string | null;
  sort_order?: number | null;
};
type EventsPayload = { title?: string; city?: string | null; events: EventPanelItem[] };
type KnownBusiness = { id: string; slug: string | null; name: string };
function extractPayloads(text: string): { clean: string; maps: MapPayload[]; events: EventsPayload[]; known: KnownBusiness[]; blogs: BlogCardItem[]; weather: WeatherPayload[] } {
  if (!text) return { clean: text, maps: [], events: [], known: [], blogs: [], weather: [] };
  const weather: WeatherPayload[] = [];
  const maps: MapPayload[] = [];
  const events: EventsPayload[] = [];
  const known: KnownBusiness[] = [];
  const blogs: BlogCardItem[] = [];
  let clean = text.replace(MAP_RE, (_m, raw) => {
    try {
      const parsed = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (parsed && Array.isArray(parsed.businesses) && parsed.businesses.length) {
        maps.push({ title: parsed.title, businesses: parsed.businesses, order: parsed.order ?? null });
      }
    } catch { /* ignore */ }
    return "";
  }).replace(EVENTS_RE, (_m, raw) => {
    try {
      const parsed = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (parsed && Array.isArray(parsed.events) && parsed.events.length) {
        events.push({ title: parsed.title, city: parsed.city ?? null, events: parsed.events });
      }
    } catch { /* ignore */ }
    return "";
  }).replace(KNOWN_RE, (_m, raw) => {
    try {
      const parsed = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (Array.isArray(parsed)) {
        for (const b of parsed) {
          if (b?.id && b?.name) known.push({ id: b.id, slug: b.slug || null, name: b.name });
        }
      }
    } catch { /* ignore */ }
    return "";
  }).replace(BLOG_CARDS_RE, (_m, raw) => {
    try {
      const parsed = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (Array.isArray(parsed)) {
        for (const b of parsed) {
          if (b?.id && b?.slug && b?.title) blogs.push({ id: b.id, slug: b.slug, title: b.title, cover: b.cover ?? null, tldr: b.tldr ?? null });
        }
      }
    } catch { /* ignore */ }
    return "";
  }).replace(ARTICLE_CARD_RE, (_m, raw) => {
    try {
      const parsed = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (parsed?.id && parsed?.slug && parsed?.title) {
        blogs.push({
          id: parsed.id,
          slug: parsed.slug,
          title: parsed.title,
          cover: parsed.image ?? parsed.hero ?? null,
          tldr: parsed.tldr ?? parsed.hook ?? null,
        });
      }
    } catch { /* ignore */ }
    return "";
  }).replace(WEATHER_RE, (_m, raw) => {
    try {
      const parsed = JSON.parse(String(raw).replace(/--&gt;/g, "-->"));
      if (parsed && typeof parsed.temp === "number") weather.push(parsed as WeatherPayload);
    } catch { /* ignore */ }
    return "";
  }).replace(BLOG_CTX_RE, "");
  // Safety net: strip any unclosed/truncated marker (would otherwise render as raw JSON).
  clean = clean
    .replace(SEARCH_RESULTS_RE, "")
    .replace(/<!--SHOW_ON_MAP:[\s\S]*$/g, "")
    .replace(/<!--SEARCH_RESULTS:[\s\S]*$/g, "")
    .replace(/<!--EVENTS_SNAPSHOT:[\s\S]*$/g, "")
    .replace(/<!--KNOWN_BUSINESSES:[\s\S]*?-->/g, "")
    .replace(/<!--KNOWN_BUSINESSES:[\s\S]*$/g, "")
    .replace(/<!--OPEN_BOOKING:[\s\S]*?-->/g, "")
    .replace(/<!--OPEN_BOOKING:[\s\S]*$/g, "")
    .replace(/<!--BLOG_CARDS:[\s\S]*$/g, "")
    .replace(/<!--ARTICLE_CARD:[\s\S]*?-->/g, "")
    .replace(/<!--ARTICLE_CARD:[\s\S]*$/g, "")
    .replace(/<!--BLOG_CTX:[\s\S]*$/g, "")
    .replace(/<!--WEATHER_FORECAST:[\s\S]*$/g, "")
    .trim();
  return { clean, maps, events, known, blogs, weather };
}
// Backward-compat alias
const extractMapPayloads = (text: string) => {
  const r = extractPayloads(text);
  return { clean: r.clean, maps: r.maps };
};


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
  const [streaming, setStreaming] = useState(false);
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
  const [dbSuggestions, setDbSuggestions] = useState<string[] | null>(null);
  const [followups, setFollowups] = useState<string[]>([]);
  const [skeletonCount, setSkeletonCount] = useState<number>(0);
  const [feedbackByTurn, setFeedbackByTurn] = useState<Record<string, 1 | -1>>({});
  const [turnIdByIdx, setTurnIdByIdx] = useState<Record<number, string>>({});
  const lastTurnIdRef = useRef<string | null>(null);



  // Load staff-managed suggestions from DB (fallback to hardcoded list on error/empty)
  // Filter by active city: NULL city = universal, else must match current homepage city.
  useEffect(() => {
    (async () => {
      let activeCity = "Marrakech";
      try {
        const mod = await import("@/lib/cityHomepage");
        activeCity = mod.readLastHomepageCity() || "Marrakech";
      } catch {/* noop */}
      const { data } = await (supabase as any)
        .from("ai_suggestions")
        .select("label_fr,label_en,label_ar,city")
        .eq("surface", "club")
        .eq("is_active", true)
        .or(`city.is.null,city.eq.${activeCity}`)
        .order("sort_order", { ascending: true });
      if (!data || data.length === 0) { setDbSuggestions(null); return; }
      const key = language === "en" ? "label_en" : language === "ar" ? "label_ar" : "label_fr";
      const list = data.map((r: any) => r[key] || r.label_fr).filter(Boolean) as string[];
      setDbSuggestions(list.length ? list : null);
    })();
  }, [language]);

  // Clear contextual follow-ups whenever the active conversation changes
  useEffect(() => { setFollowups([]); }, [activeId]);

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
  const [openEvents, setOpenEvents] = useState<{ list: EventPanelItem[]; index: number } | null>(null);
  const [openBlogs, setOpenBlogs] = useState<{ list: BlogCardItem[]; index: number } | null>(null);
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
  // Index of business names fed from every <!--SHOW_ON_MAP:--> payload in the conversation.
  const businessLookupRef = useRef<Map<string, BusinessLookupRef>>(new Map());

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
          return resolveBusinessByName(name);
        }));
        for (const row of resolved) {
          if (row?.name) businessLookupRef.current.set(row.name.toLowerCase(), row);
          addRef(row?.id, row?.slug || null, row?.name || null);
        }
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

  // Vertical swipe navigation between AI-cited businesses (mirrors SearchPage).
  // Swipe down (dy > 0) = next ; swipe up (dy < 0) = previous.
  // Started from the top 80px only (header zone) to avoid hijacking content scroll.
  const swipeStartYRef = useRef<number | null>(null);
  const swipeActiveRef = useRef(false);
  const [swipeOffsetY, setSwipeOffsetY] = useState(0);
  const onPanelTouchStart = useCallback((e: React.TouchEvent) => {
    if (document.body.dataset.slidepanelOverlayOpen === "1") return;
    const t = e.touches[0];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (t.clientY - rect.top > 80) return;
    swipeStartYRef.current = t.clientY;
    swipeActiveRef.current = true;
  }, []);
  const onPanelTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeActiveRef.current || swipeStartYRef.current == null) return;
    if (document.body.dataset.slidepanelOverlayOpen === "1") {
      swipeActiveRef.current = false;
      swipeStartYRef.current = null;
      setSwipeOffsetY(0);
      return;
    }
    const dy = e.touches[0].clientY - swipeStartYRef.current;
    setSwipeOffsetY(dy);
  }, []);
  const onPanelTouchEnd = useCallback(() => {
    if (!swipeActiveRef.current) return;
    const dy = swipeOffsetY;
    swipeActiveRef.current = false;
    swipeStartYRef.current = null;
    setSwipeOffsetY(0);
    if (Math.abs(dy) < 220) return;
    // swipe down (dy > 0) → next ; swipe up (dy < 0) → previous
    if (dy > 0 && hasNextBusiness) goNextBusiness();
    else if (dy < 0 && hasPrevBusiness) goPrevBusiness();
  }, [swipeOffsetY, hasNextBusiness, hasPrevBusiness]);

  // Desktop trackpad/wheel navigation between AI-cited businesses (mirrors SearchPage).
  // When the panel content isn't scrollable in the wheel direction, wheel events
  // navigate prev/next; otherwise they scroll the panel normally.
  const panelWheelRef = useRef<HTMLDivElement | null>(null);
  const wheelAccumRef = useRef(0);
  const wheelLockUntilRef = useRef(0);
  const goNextBusinessRef = useRef(goNextBusiness);
  const goPrevBusinessRef = useRef(goPrevBusiness);
  useEffect(() => { goNextBusinessRef.current = goNextBusiness; goPrevBusinessRef.current = goPrevBusiness; });
  useEffect(() => {
    const el = panelWheelRef.current;
    if (!el || !openBusinessId) return;
    const isScrollableY = (node: HTMLElement) => {
      const style = window.getComputedStyle(node);
      return /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
    };
    const getScrollable = (target: EventTarget | null) => {
      const mainPanelScroller = el.querySelector<HTMLElement>('[data-slidepanel-scroll="true"]');
      if (mainPanelScroller && isScrollableY(mainPanelScroller)) return mainPanelScroller;
      if (!(target instanceof HTMLElement)) return null;
      let node: HTMLElement | null = target;
      while (node && node !== el) {
        if (isScrollableY(node)) return node;
        node = node.parentElement;
      }
      return Array.from(el.querySelectorAll<HTMLElement>("*")).find(isScrollableY) || null;
    };
    const handler = (e: WheelEvent) => {
      const rect = el.getBoundingClientRect();
      const isOverPanel = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!isOverPanel) return;
      const deltaY = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      if (e.target instanceof Element && e.target.closest('.gm-style')) return;
      if (document.body.dataset.slidepanelOverlayOpen === "1") return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const dir = deltaY > 0 ? 1 : -1;
      const scrollable = getScrollable(e.target);
      if (scrollable) {
        const maxTop = scrollable.scrollHeight - scrollable.clientHeight;
        const canScroll = dir > 0 ? scrollable.scrollTop < maxTop - 1 : scrollable.scrollTop > 1;
        if (canScroll) {
          scrollable.scrollTop = Math.max(0, Math.min(maxTop, scrollable.scrollTop + deltaY));
          wheelAccumRef.current = 0;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
      const now = Date.now();
      if (now < wheelLockUntilRef.current) { wheelAccumRef.current = 0; return; }
      wheelAccumRef.current += deltaY;
      if (Math.abs(wheelAccumRef.current) < 60) return;
      const navDir = wheelAccumRef.current > 0 ? 1 : -1;
      wheelAccumRef.current = 0;
      wheelLockUntilRef.current = now + 450;
      e.preventDefault();
      e.stopPropagation();
      if (navDir > 0) goNextBusinessRef.current();
      else goPrevBusinessRef.current();
    };
    window.addEventListener("wheel", handler, { passive: false, capture: true });
    return () => window.removeEventListener("wheel", handler, { capture: true } as any);
  }, [openBusinessId]);

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
    // Try cached map payloads first — fuzzy match to tolerate articles,
    // apostrophes, punctuation, accents and partial names emitted by the AI.
    let best: { ref: BusinessLookupRef; score: number } | null = null;
    for (const ref of businessLookupRef.current.values()) {
      const score = businessNameMatchScore(ref.name, n);
      if (score > (best?.score || 0)) best = { ref, score };
    }
    if (best && best.score >= 0.58) {
      if (best.ref.slug) {
        const ok = await openBusinessBySlug(best.ref.slug);
        if (ok) return;
      }
      if (best.ref.id) {
        setActiveSlug(best.ref.slug || null);
        setOpenBusinessId(best.ref.id);
        setOrderedBusinessRefs((prev) => prev.some((b) => b.id === best.ref.id) ? prev : [...prev, { id: best.ref.id!, slug: best.ref.slug || null, name: best.ref.name }]);
        return;
      }
    }

    const exactOrPartial = Array.from(businessLookupRef.current.values()).find((ref) => {
      const refName = normalizeBusinessName(ref.name);
      const targetName = normalizeBusinessName(n);
      return refName === targetName || refName.includes(targetName) || targetName.includes(refName);
    });
    if (exactOrPartial?.slug) {
      const ok = await openBusinessBySlug(exactOrPartial.slug);
      if (ok) return;
    }
    const row = await resolveBusinessByName(n);
    const id = row?.id || null;
    const dbSlug = row?.slug || null;
    const dbName = row?.name || n;
    if (id) {
      if (row?.name) businessLookupRef.current.set(row.name.toLowerCase(), row);
      setActiveSlug(dbSlug || null);
      setOpenBusinessId(id);
      setOrderedBusinessRefs((prev) => prev.some((b) => b.id === id) ? prev : [...prev, { id, slug: dbSlug || null, name: dbName }]);
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

  // Persist 👍/👎 for the latest assistant turn (last SSE `done` payload).
  // RLS on ai_conversation_turns allows the owner to update feedback_score only.
  const submitFeedback = async (score: 1 | -1, turnIdArg?: string) => {
    const turnId = turnIdArg || lastTurnIdRef.current;
    if (!turnId) return;
    const prev = feedbackByTurn[turnId];
    const next = prev === score ? undefined : score;
    setFeedbackByTurn((s) => {
      const c = { ...s };
      if (next == null) delete c[turnId]; else c[turnId] = next;
      return c;
    });
    try {
      await supabase
        .from("ai_conversation_turns")
        .update({ feedback_score: next ?? null })
        .eq("id", turnId);
    } catch (e) {
      console.error("feedback update failed", e);
    }
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
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      try { el.scrollIntoView({ block: "end", behavior: "smooth" }); } catch { /* noop */ }
    }
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
    setFollowups([]);
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
    setStreaming(false);
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
    setFollowups([]);

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


    // Placeholder assistant message that we update as SSE chunks arrive.
    const withAssistant: Msg[] = [...newMsgs, { role: "assistant", content: "" }];
    messagesRef.current = withAssistant;
    setMessages(withAssistant);
    const assistantIdx = withAssistant.length - 1;
    let streamedText = "";
    let finalPayload: any = null;
    let firstTokenAt: number | null = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/club-ai-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ chatId: safeChatId, messages: newMsgs, clientContext, language }),
      });
      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "chunk" && typeof evt.delta === "string") {
              if (firstTokenAt == null) {
                firstTokenAt = performance.now();
                setStreaming(true);
              }
              // First real token clears the skeleton placeholders.
              if (skeletonCount) setSkeletonCount(0);
              streamedText += evt.delta;
              const next = [...messagesRef.current];
              next[assistantIdx] = { role: "assistant", content: streamedText };
              messagesRef.current = next;
              setMessages(next);
            } else if (evt.type === "skeleton" && typeof evt.count === "number") {
              setSkeletonCount(Math.min(8, Math.max(1, evt.count)));
            } else if (evt.type === "done") {
              finalPayload = evt;
              if (evt.turnId) {
                lastTurnIdRef.current = String(evt.turnId);
                setTurnIdByIdx((s) => ({ ...s, [assistantIdx]: String(evt.turnId) }));
              }
              setSkeletonCount(0);
            } else if (evt.type === "error") {
              throw new Error(evt.message || "stream_error");
            }
          } catch (parseErr) {
            // partial JSON; skip
          }
        }
      }

      const answer = (finalPayload?.answer as string) || streamedText;
      const newId = (finalPayload?.chatId as string | null) ?? null;
      import("@/lib/analytics").then(({ trackEvent }) =>
        trackEvent("ai_response_received", {
          latency_ms: Math.round(performance.now() - aiStartedAt),
          first_token_ms: firstTokenAt ? Math.round(firstTokenAt - aiStartedAt) : null,
          chars: answer.length,
          voice_mode: !!voiceMode,
          streamed: true,
        })
      ).catch(() => {});
      const fullMessages: Msg[] = [...newMsgs, { role: "assistant", content: answer }];
      messagesRef.current = fullMessages;
      setMessages(fullMessages);
      // Deterministic booking route: server appends <!--OPEN_BOOKING:{id,slug,name}-->
      // to instruct the client to open BookOnlineSlidePanel without any LLM call.
      try {
        const bm = answer.match(/<!--OPEN_BOOKING:([\s\S]*?)-->/);
        if (bm) {
          const parsed = JSON.parse(bm[1].replace(/--&gt;/g, "-->"));
          if (parsed?.id) setTimeout(() => setOpenBusinessId(String(parsed.id)), 60);
        }
      } catch { /* ignore malformed booking marker */ }
      const fu = Array.isArray(finalPayload?.followups) ? (finalPayload.followups as string[]).filter((s) => typeof s === "string" && s.trim()).slice(0, 3) : [];
      setFollowups(fu);
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
      setStreaming(false);
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

  const allSuggestions = useMemo(() => (dbSuggestions && dbSuggestions.length ? dbSuggestions : at.suggestions) as readonly string[], [at, dbSuggestions]);


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
    <div className={`flex flex-col gap-4 min-h-[520px] transition-[width,max-width,padding] duration-300 ease-out ${(openBusinessId || openMap || openEvents || openBlogs) ? "lg:w-1/2 lg:max-w-[calc(50vw-1rem)] lg:pr-2" : "w-full"}`}>
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
          {(() => null)()}
          {messages.map((m, i) => {
            const lastAssistantIndex = (() => { for (let k = messages.length - 1; k >= 0; k--) { if (messages[k].role === "assistant") return k; } return -1; })();
            const { clean, maps, events: eventPayloads, known, blogs: blogPayloads, weather: weatherPayloads } = m.role === "assistant"
              ? extractPayloads(m.content)
              : { clean: m.content, maps: [] as MapPayload[], events: [] as EventsPayload[], known: [] as KnownBusiness[], blogs: [] as BlogCardItem[], weather: [] as WeatherPayload[] };
            const weatherPayload = weatherPayloads[weatherPayloads.length - 1] || null;
            // Index business names for clickable bold names.
            for (const mp of maps) {
              for (const b of mp.businesses) {
                if (b?.name) {
                  businessLookupRef.current.set(b.name.toLowerCase(), { id: b.id, slug: b.slug || null, name: b.name });
                }
              }
            }
            // Seed from server-resolved KNOWN_BUSINESSES marker (skips async DB roundtrips).
            for (const b of known) {
              businessLookupRef.current.set(b.name.toLowerCase(), b);
            }
            return (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex flex-col items-start"}>
                {m.role === "user" ? (
                  <div className="max-w-[80%] px-3 py-2 rounded-2xl bg-[#C04F17] text-white text-sm whitespace-pre-wrap">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[88%] group w-full">

                    <div className="text-xs sm:text-base text-[#0a1d6b] leading-relaxed prose prose-sm sm:prose-base max-w-none prose-strong:text-[#C04F17] prose-a:text-[#C04F17] prose-a:underline">

                      {(() => {
                        const mdComponents = {
                          a: ({ href, children }: any) => {
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
                          strong: ({ children }: any) => {
                            const text = Array.isArray(children)
                              ? children.map((c: any) => (typeof c === "string" ? c : "")).join("")
                              : (typeof children === "string" ? children : "");
                            const trimmed = text.trim();
                            const LABEL_BLACKLIST = new Set([
                              "ambiance","atmosphère","atmosphere","cuisine","musique","musique live","décoration","decoration",
                              "localisation","adresse","horaires","prix","tarifs","budget","carte","menu","services","accès","acces",
                              "réservation","reservation","contact","téléphone","telephone","site web","website","note","avis",
                              "vibe","food","drinks","music","location","price","hours","booking","phone",
                            ]);
                            const normTrim = trimmed.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[:*]+$/g, "").trim();
                            const isLabel = LABEL_BLACKLIST.has(normTrim);
                            const sigTokens = businessNameTokens(trimmed);
                            let isKnownBusiness = false;
                            if (trimmed && !isLabel && trimmed.length >= 4) {
                              for (const ref of businessLookupRef.current.values()) {
                                const score = businessNameMatchScore(ref.name, trimmed);
                                if (score >= 0.95) { isKnownBusiness = true; break; }
                                if (sigTokens.length >= 2 && score >= 0.72) { isKnownBusiness = true; break; }
                              }
                            }
                            if (isKnownBusiness && trimmed.length <= 80) {
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
                        } as const;

                        const source = linkifyPhones(stripFicheLinks(clean));
                        const isLastAssistant = i === lastAssistantIndex;
                        const msgTurnId = turnIdByIdx[i] || (isLastAssistant ? lastTurnIdRef.current : null);
                        const isStreamingThis = isLastAssistant && streaming;
                        const canShowFeedback = !!msgTurnId && !isStreamingThis;
                        // Split around the "N résultats affichés sur M trouvés" line to
                        // insert thumbs right after it. Fallback: render at the end.
                        const countLineRe = /^.*\b\d+\s+r[ée]sultats?\s+affich[ée]s?\s+sur\s+\d+\s+trouv[ée]s?.*$/im;
                        const match = source.match(countLineRe);
                        const feedbackNode = canShowFeedback ? (() => {
                          const tid = msgTurnId!;
                          const score = feedbackByTurn[tid];
                          return (
                            <div className="my-2 flex items-center gap-1.5 not-prose">
                              <button
                                type="button"
                                onClick={() => submitFeedback(1, tid)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${score === 1 ? "bg-[#C04F17] border-[#C04F17] text-white" : "bg-white/5 border-[#C04F17]/30 text-[#C04F17] hover:bg-[#C04F17]/10"}`}
                                title="Réponse utile"
                                aria-label="Réponse utile"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => submitFeedback(-1, tid)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${score === -1 ? "bg-[#C04F17] border-[#C04F17] text-white" : "bg-white/5 border-[#C04F17]/30 text-[#C04F17] hover:bg-[#C04F17]/10"}`}
                                title="Réponse à améliorer"
                                aria-label="Réponse à améliorer"
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })() : null;

                        if (feedbackNode && match && match.index != null) {
                          const end = match.index + match[0].length;
                          const before = source.slice(0, end);
                          const after = source.slice(end);
                          return (
                            <>
                              <ReactMarkdown components={mdComponents}>{before}</ReactMarkdown>
                              {feedbackNode}
                              {after.trim() && <ReactMarkdown components={mdComponents}>{after}</ReactMarkdown>}
                            </>
                          );
                        }
                        return (
                          <>
                            <ReactMarkdown components={mdComponents}>{source}</ReactMarkdown>
                            {feedbackNode}
                          </>
                        );
                      })()}
                    </div>
                    {weatherPayload && (
                      <div className="mt-3">
                        <EmbedWeatherWidget data={weatherPayload} lang={(language === "en" || language === "ar" ? language : "fr") as "fr" | "en" | "ar"} />
                      </div>
                    )}
                    {(() => {
                      // Thumbnails carousel of cited businesses (from map payloads, which include images).
                      const seen = new Set<string>();
                      const items: MapPanelBusiness[] = [];
                      for (const mp of maps) {
                        for (const b of mp.businesses) {
                          if (!b?.id || seen.has(b.id)) continue;
                          if (!Array.isArray(b.images) || !b.images.length) continue;
                          seen.add(b.id);
                          items.push(b);
                        }
                      }
                      if (items.length === 0) return null;
                      return (
                        <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {items.slice(0, 24).map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => void handleOpenBusinessName(b.name)}
                              className="shrink-0 w-24 sm:w-28 group/thumb text-left"
                              title={b.name}
                            >
                              <div className="relative aspect-square rounded-lg overflow-hidden bg-[#C04F17]/10 border border-[#C04F17]/20">
                                <img
                                  src={b.images![0]}
                                  alt={b.name}
                                  loading="lazy"
                                  className="absolute inset-0 h-full w-full object-cover transition-transform group-hover/thumb:scale-105"
                                />
                              </div>
                              <div className="mt-1 text-[10px] sm:text-[11px] text-[#0a1d6b] leading-tight line-clamp-2 font-medium">
                                {b.name}
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
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
                    {eventPayloads.map((ep, idx) => {
                      const thumbs = ep.events.filter((e) => e.image || e.video).slice(0, 12);
                      return (
                        <div key={`ev-${idx}`} className="mt-3 space-y-2">
                          {thumbs.length > 0 && (
                            <div className="-mx-1 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                              {thumbs.map((ev, ti) => (
                                <button
                                  key={ev.id}
                                  type="button"
                                  onClick={() => setOpenEvents({ list: ep.events, index: ep.events.findIndex((x) => x.id === ev.id) })}
                                  className="shrink-0 w-24 sm:w-28 group/evthumb text-left"
                                  title={ev.name}
                                >
                                  <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-[#C04F17]/10 border border-[#C04F17]/20">
                                    {ev.image ? (
                                      <img src={ev.image} alt={ev.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform group-hover/evthumb:scale-105" />
                                    ) : ev.video ? (
                                      <VideoThumbnail src={ev.video} alt={ev.name} className="absolute inset-0 h-full w-full object-cover transition-transform group-hover/evthumb:scale-105" />
                                    ) : (
                                      <div className="absolute inset-0 flex items-center justify-center"><CalendarIcon className="h-6 w-6 text-[#C04F17]" /></div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                                      <div className="text-[10px] text-white font-semibold line-clamp-2 leading-tight">{ev.name}</div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setOpenEvents({ list: ep.events, index: 0 })}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/80 hover:bg-white border border-[#C04F17]/20 transition-colors text-left group/ev"
                          >
                            <div className="relative h-16 w-20 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-[#C04F17]/15 to-[#D4AF37]/20 flex items-center justify-center">
                              <CalendarIcon className="h-7 w-7 text-[#C04F17]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-[#C04F17] truncate">
                                {ep.title ? `Agenda · ${ep.title}` : `${ep.events.length} événement${ep.events.length > 1 ? "s" : ""}`}
                                {ep.city ? ` · ${ep.city}` : ""}
                              </div>
                              <div className="text-[11px] text-[#0a1d6b]/70 truncate">
                                {ep.events.slice(0, 3).map((e) => e.name).join(" · ")}
                                {ep.events.length > 3 ? ` · +${ep.events.length - 3}` : ""}
                              </div>
                              <div className="text-[11px] text-[#C04F17] mt-0.5 font-medium group-hover/ev:underline">
                                Ouvrir l'agenda →
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                    {blogPayloads.length > 0 && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {blogPayloads.map((bp, bi) => (
                          <button
                            key={`blog-${bp.id}`}
                            type="button"
                            onClick={() => setOpenBlogs({ list: blogPayloads, index: bi })}
                            className="flex items-stretch gap-3 p-2 rounded-xl bg-white/85 hover:bg-white border border-[#C04F17]/25 transition-colors text-left group/blog overflow-hidden"
                          >
                            <div className="relative h-20 w-24 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-[#C04F17]/15 to-[#D4AF37]/25 flex items-center justify-center">
                              {bp.cover ? (
                                <img src={bp.cover} alt={bp.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform group-hover/blog:scale-105" />
                              ) : (
                                <BookOpen className="h-7 w-7 text-[#C04F17]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                              <div className="text-sm font-semibold text-[#0a1d6b] line-clamp-2 leading-tight">{bp.title}</div>
                              <div className="text-[11px] text-[#C04F17] mt-1 font-medium group-hover/blog:underline">Lire l'article →</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {streaming && i === lastAssistantIndex && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[#C04F17] text-xs">
                        <span className="inline-block w-2 h-4 bg-[#C04F17] animate-pulse align-middle" />
                        {at.writing}
                      </span>
                    )}
                  </div>
                )}
                {m.role === "assistant" && i === lastAssistantIndex && (
                  <div className="mt-3 flex justify-center w-full">
                    <div className="relative flex items-center justify-center">
                      <div
                        className="absolute rounded-full animate-ping pointer-events-none"
                        style={{
                          inset: "-10px",
                          background: "radial-gradient(circle, rgba(192,79,23,0.25) 0%, transparent 70%)",
                          border: "1px solid rgba(192,79,23,0.35)",
                          animationDuration: "2.4s",
                        }}
                      />
                      <div
                        className="absolute rounded-full animate-pulse pointer-events-none"
                        style={{
                          inset: "-6px",
                          background: "linear-gradient(135deg, rgba(192,79,23,0.35), rgba(192,79,23,0.15))",
                          border: "1px solid rgba(192,79,23,0.3)",
                        }}
                      />
                      {(tts.status === "playing" || tts.status === "loading") && lastSpokenRef.current === clean && (
                        <div
                          className="absolute rounded-full pointer-events-none"
                          style={{
                            inset: "-3px",
                            background: "conic-gradient(from 0deg, transparent 0%, #C04F17 35%, rgba(192,79,23,0.5) 50%, transparent 70%)",
                            animation: "spin 2s linear infinite",
                            filter: "blur(0.5px)",
                          }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleSpeakMessage(clean)}
                        className="relative w-10 h-10 rounded-full flex items-center justify-center border border-white/20 transition-transform hover:scale-105"
                        style={{
                          background: "#C04F17",
                          boxShadow: "0 8px 24px rgba(192,79,23,0.45), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.25)",
                        }}
                        title={ttsBusy && lastSpokenRef.current === clean ? at.stopPlayback : at.listen}
                        aria-label={ttsBusy && lastSpokenRef.current === clean ? at.stopPlayback : at.listen}
                      >
                        <span
                          className="absolute inset-1 rounded-full pointer-events-none"
                          style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.25) 0%, transparent 45%)" }}
                        />
                        {tts.status === "loading" && lastSpokenRef.current === clean ? (
                          <Loader2 className="relative h-4 w-4 animate-spin text-white" />
                        ) : ttsBusy && lastSpokenRef.current === clean ? (
                          <Square className="relative h-4 w-4 text-white" />
                        ) : (
                          <Volume2 className="relative h-4 w-4 text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {sending && skeletonCount > 0 && (
            <div className="flex flex-col gap-2 pt-2">
              {Array.from({ length: skeletonCount }).map((_, k) => (
                <div
                  key={`sk-${k}`}
                  className="h-14 rounded-lg bg-white/5 border border-white/10 animate-pulse"
                  style={{ animationDelay: `${k * 90}ms` }}
                />
              ))}
            </div>
          )}
          {!sending && followups.length > 0 && messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
            <div className="flex flex-wrap gap-2 pt-1">
              {followups.map((f) => (
                <button
                  key={f}
                  onClick={() => send(f)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white text-[#C04F17] hover:bg-[#C04F17] hover:text-white transition-colors border border-[#C04F17]/30"
                >
                  {f}
                </button>
              ))}
            </div>
          )}
          {sending && (
            <div className="flex items-center gap-2 text-[#C04F17] text-xs">
              {streaming ? (
                <>
                  <span className="inline-block w-2 h-3.5 bg-[#C04F17] animate-pulse" />
                  {at.writing}
                </>
              ) : (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {at.thinking}
                </>
              )}
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
        preserveOrder={openMap?.order === "given"}
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

      <EventsSlidePanel
        open={!!openEvents}
        onClose={() => setOpenEvents(null)}
        items={openEvents?.list || []}
        initialIndex={openEvents?.index ?? 0}
        isMobile={isMobile}
        onOpenBusiness={(bid) => { setOpenEvents(null); setOpenBusinessId(bid); }}
      />

      <BlogSlidePanel
        open={!!openBlogs}
        onClose={() => setOpenBlogs(null)}
        items={openBlogs?.list || []}
        initialIndex={openBlogs?.index ?? 0}
        isMobile={isMobile}
      />

      {openBusinessId && (
        <div
          ref={panelWheelRef}
          className={`fixed top-0 left-0 right-0 bottom-0 z-[220] bg-background shadow-2xl overflow-visible flex flex-col transform-gpu will-change-transform lg:left-auto lg:bottom-auto lg:border-l lg:border-border lg:w-1/2 ${isBusinessPanelClosing ? "animate-slide-out-right" : "animate-slide-in-right"}`}
          style={{
            height: "100dvh",
            transform: swipeOffsetY !== 0 ? `translateY(${swipeOffsetY}px)` : undefined,
            transition: swipeOffsetY === 0 ? "transform 0.2s ease-out" : undefined,
          }}
          onTouchStart={onPanelTouchStart}
          onTouchMove={onPanelTouchMove}
          onTouchEnd={onPanelTouchEnd}
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
