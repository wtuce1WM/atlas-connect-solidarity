import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGeolocation } from "@/hooks/useGeolocation";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import { extractTimeSlot, isOpenDuringSlot, type TimeSlot } from "@/lib/timeSlots";
import zitounMaskImg from "@/assets/zitoun-mask.jpg";
import logoGold from "@/assets/logoGOLDsimple.webp";
import LoadingScreen from "@/components/LoadingScreen";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CategoriesCarouselSection from "@/components/CategoriesCarouselSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2, ChevronLeft, ChevronRight, Search, Mic, MicOff, Loader, MapPin, MapPinOff, X, Volume2, VolumeX, Clock } from "lucide-react";
import BusinessCard, { type BusinessCardData, type Gamme, type Badge, type SubcategoryRef, type BadgeSubcategoryRef } from "@/components/BusinessCard";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useToast } from "@/hooks/use-toast";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import SearchSuggestionsDropdown from "@/components/SearchSuggestionsDropdown";

interface Business {
  id: string;
  name: string;
  description: string | null;
  city: string;
  region: string;
  address?: string | null;
  phone: string | null;
  whatsapp: string | null;
  skype: string | null;
  website: string | null;
  logo_url: string | null;
  images: string[] | null;
  main_category: string | null;
  categories: string[] | null;
  wtuce_status: string | null;
  is_regulated_activity: boolean | null;
  distance_km: number | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  rating: number | null;
  gamme_id: string | null;
  badge_id: string | null;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  google_rating?: number | null;
  tripadvisor_rating?: number | null;
  restaurant_guru_rating?: number | null;
  google_review_count?: number | null;
  tripadvisor_review_count?: number | null;
  restaurant_guru_review_count?: number | null;
  opening_hours?: Record<string, { open?: string; close?: string; closed?: boolean; continuous?: boolean }> | null;
  is_open_24h?: boolean | null;
  vacation_dates?: unknown;
}

interface SearchResult {
  businesses: Business[];
  searchLevel: string;
  message: string;
  totalResults: number;
  detectedSubcategory?: string | null;
  searchMode?: string | null;
}

const ITEMS_PER_PAGE = 20;

const normalizeSearchMode = (value: unknown): "strict" | "broad" | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("strict")) return "strict";
  if (normalized.includes("broad")) return "broad";
  return null;
};

const isZitounMask = (query: string) => {
  const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    normalized.includes("zitoun mask") ||
    normalized.includes("zitoun musk") ||
    normalized.includes("zitoun mas") ||
    normalized.includes("zitoun mus")
  );
};

const isSosMedecinQuery = (query: string) => {
  const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    normalized.includes("sos médecin") ||
    normalized.includes("sos medecin") ||
    normalized.includes("sos docteur") ||
    normalized.includes("besoin d'un docteur") ||
    normalized.includes("besoin d un docteur") ||
    normalized.includes("besoin d'un médecin") ||
    normalized.includes("besoin d un medecin") ||
    normalized.includes("médecin urgence") ||
    normalized.includes("medecin urgence") ||
    normalized.includes("docteur urgence") ||
    normalized.includes("urgence médicale") ||
    normalized.includes("urgence medicale") ||
    normalized.includes("appeler un médecin") ||
    normalized.includes("appeler un medecin") ||
    normalized.includes("appeler un docteur") ||
    normalized.includes("je suis malade") ||
    normalized.includes("mal en point")
  );
};

const isPompiersQuery = (query: string) => {
  const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    normalized.includes("pompier") ||
    normalized.includes("incendie") ||
    normalized.includes("il y a le feu") ||
    normalized.includes("ça brûle") ||
    normalized.includes("ca brule") ||
    normalized.includes("tout brûle") ||
    normalized.includes("maison en feu") ||
    normalized.includes("voiture en feu") ||
    normalized.includes("feu de forêt") ||
    normalized.includes("feu de foret") ||
    normalized.includes("appeler les pompiers") ||
    normalized.includes("sapeurs") ||
    normalized.includes("brigade") ||
    normalized.includes("protection civile feu") ||
    /\bau feu\b/.test(normalized) && !normalized.includes("feu de bois") && !normalized.includes("feu de charbon") && !normalized.includes("feu de braise")
  );
};

const isCelebrityQuery = (query: string) => {
  const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    normalized.includes("célébrité") ||
    normalized.includes("celebrite") ||
    normalized.includes("célébrités") ||
    normalized.includes("star ") ||
    normalized.includes("stars ") ||
    normalized.includes("people marrakech") ||
    normalized.includes("vip marrakech") ||
    normalized.includes("famous") ||
    normalized.includes("personnalité")
  );
};

const CelebrityEntry = ({ name, desc, id }: { name: string; desc: string; id?: string }) => (
  <div className="flex gap-3">
    {id ? (
      <Link
        to={`/business/${id}`}
        className="text-gold font-semibold text-sm min-w-[160px] shrink-0 hover:text-gold/70 underline underline-offset-2 decoration-gold/40 transition-colors"
      >
        {name} ↗
      </Link>
    ) : (
      <span className="text-gold/50 font-semibold text-sm min-w-[160px] shrink-0">{name}</span>
    )}
    <span className="text-white/60 text-sm">{desc}</span>
  </div>
);

const CelebrityGuide = () => (
  <div className="max-w-2xl mx-auto mb-10 rounded-2xl overflow-hidden border border-gold/30 shadow-2xl bg-gradient-to-br from-black to-zinc-900">
    <div className="px-6 py-5 border-b border-gold/20 bg-gradient-to-r from-gold/10 to-transparent">
      <p className="text-gold font-semibold text-lg">👑 Guide insider — Célébrités à Marrakech</p>
      <p className="text-white/50 text-sm mt-0.5">Palaces, tables & nuits — les adresses qui font la légende</p>
    </div>

    <div className="px-6 py-5 space-y-5">
      {/* Hotels */}
      <div>
        <p className="text-gold/80 text-xs font-semibold uppercase tracking-widest mb-3">🌴 Palaces iconiques</p>
        <div className="space-y-2">
          <CelebrityEntry name="La Mamounia" id="3bb71910-c17e-4ce1-a130-42c369a645a7" desc="Le grand classique — jardins légendaires, histoire glamour, incontournable du Festival du Film." />
          <CelebrityEntry name="Royal Mansour" id="0961b2f5-c259-483a-b877-3d251acdbbd9" desc="Ultra-exclusif — chaque client dans son propre riad privé. Intimité maximale." />
          <CelebrityEntry name="Amanjena" id="e7019579-408a-4b3c-90d7-41c6dbff9063" desc="Refuge de stars en quête de calme absolu. Minimalisme chic, loin de l'agitation." />
          <CelebrityEntry name="Mandarin Oriental" id="590225e3-0887-4d79-a8f6-571ac148cca5" desc="Villas avec piscines privées, spa d'exception, discrétion totale." />
          <CelebrityEntry name="El Fenn" id="641ab942-63a5-499e-999a-e09915b1d02f" desc="Bohème & arty. Rooftop mythique, clientèle mode et cinéma." />
          <CelebrityEntry name="Selman Marrakech" id="5b09bebd-7cb5-4698-b447-bf5f198811f4" desc="Chic contemporain, haras privé de chevaux arabes, atmosphère glamour." />
          <CelebrityEntry name="Riad Kniza" id="307aa4e4-03b7-4006-808c-6df07c6b5eab" desc="Riad de charme discret, prisé par les célébrités en quête d'authenticité et de confidentialité en médina." />
        </div>
      </div>

      {/* Restaurants */}
      <div className="border-t border-white/10 pt-4">
        <p className="text-gold/80 text-xs font-semibold uppercase tracking-widest mb-3">🍽️ Où dînent les célébrités</p>
        <div className="space-y-2">
          <CelebrityEntry name="Nobu Marrakech" id="c5a21f81-94fc-4b5e-8f89-822a43dabdec" desc="Cuisine japonaise iconique, rooftop vibrant, clientèle ultra-glam." />
          <CelebrityEntry name="Dar Yacout" id="da42a132-4948-4c5f-afa3-f0b37df6811e" desc="Institution marocaine théâtrale. Stars du cinéma et invités du Festival adorent." />
          <CelebrityEntry name="Restaurant Le Jardin" id="c6af063a-0636-4746-bd14-50060721e5f5" desc="Déjeuner chic et discret dans un riad végétal. Très apprécié des artistes." />
          <CelebrityEntry name="Rooftop Bar El Fenn" id="d04e2a2b-faa4-4675-b861-c8f90df30c7f" desc="Arty, solaire, intime. Un repaire créatif pour les célébrités low profile." />
        </div>
      </div>

      {/* Nightlife */}
      <div className="border-t border-white/10 pt-4">
        <p className="text-gold/80 text-xs font-semibold uppercase tracking-widest mb-3">🌙 Où elles sortent la nuit</p>
        <div className="space-y-2">
          <CelebrityEntry name="Theatro Marrakech" id="be0d6bbb-6daa-4f25-b5c6-32c3650e7f6d" desc="Le club iconique — shows spectaculaires, DJ internationaux, ambiance VIP." />
          <CelebrityEntry name="So Lounge" desc="Glamour chic en Palmeraie, parfait pour soirées sélectes." />
          <CelebrityEntry name="Comptoir Darna" id="21dfaabb-56fe-4da0-9942-34b2803465cf" desc="Dîner-spectacle, danse orientale et jazz lounge. Très apprécié du cinéma français." />
          <CelebrityEntry name="555 Famous Club" desc="Ambiance internationale, soirées tardives, clientèle people." />
        </div>
      </div>
    </div>

    <div className="px-6 py-3 border-t border-gold/20 bg-gold/5">
      <p className="text-white/30 text-xs italic">Présence maximale : janvier–février (Couture Week), mai (Festival du Film), décembre–janvier.</p>
    </div>
  </div>
);

// IDs des établissements du guide célébrités (dans l'ordre d'affichage souhaité)
const CELEBRITY_IDS = [
  "3bb71910-c17e-4ce1-a130-42c369a645a7", // La Mamounia
  "0961b2f5-c259-483a-b877-3d251acdbbd9", // Royal Mansour
  "e7019579-408a-4b3c-90d7-41c6dbff9063", // Amanjena
  "590225e3-0887-4d79-a8f6-571ac148cca5", // Mandarin Oriental
  "641ab942-63a5-499e-999a-e09915b1d02f", // Boutique El Fenn
  "5b09bebd-7cb5-4698-b447-bf5f198811f4", // Selman Marrakech
  "307aa4e4-03b7-4006-808c-6df07c6b5eab", // Riad Kniza
  "c5a21f81-94fc-4b5e-8f89-822a43dabdec", // Nobu Marrakech
  "da42a132-4948-4c5f-afa3-f0b37df6811e", // Dar Yacout
  "c6af063a-0636-4746-bd14-50060721e5f5", // Restaurant Le Jardin
  "d04e2a2b-faa4-4675-b861-c8f90df30c7f", // Rooftop Bar El Fenn
  "be0d6bbb-6daa-4f25-b5c6-32c3650e7f6d", // Theatro Marrakech
  "21dfaabb-56fe-4da0-9942-34b2803465cf", // Comptoir Darna
];

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [detectedSubcategory, setDetectedSubcategory] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<string | null>(null);
  const [searchLevel, setSearchLevel] = useState<string>("");
  const [searchMessage, setSearchMessage] = useState<string>("");
  const [citiesWithPriority, setCitiesWithPriority] = useState<{ name: string; priority: number }[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryRef[]>([]);
  const [badgeSubcategories, setBadgeSubcategories] = useState<BadgeSubcategoryRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const cityFromUrl = searchParams.get("city") || "";
  const [selectedCity, setSelectedCity] = useState<string>(cityFromUrl || "all");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [inputValue, setInputValue] = useState(searchParams.get("q") || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions } = useSearchSuggestions(inputValue);
  const searchFormRef = useRef<HTMLFormElement>(null);
  const categoryFromUrl = searchParams.get("category") || "";
  const [celebrityBusinesses, setCelebrityBusinesses] = useState<Business[]>([]);
  const [ttsIntroPhrase, setTtsIntroPhrase] = useState<string>("");

  // Parse time slot from URL params (set by HeroSection or FloatingSearchBar)
  const activeTimeSlot: TimeSlot | null = useMemo(() => {
    const timeStart = searchParams.get("timeStart");
    const timeEnd = searchParams.get("timeEnd");
    if (timeStart === null || timeEnd === null) return null;
    return {
      startHour: parseInt(timeStart),
      endHour: parseInt(timeEnd),
      dayOffset: parseInt(searchParams.get("timeDayOffset") || "0"),
      dayOfWeek: searchParams.get("timeDayOfWeek") ? parseInt(searchParams.get("timeDayOfWeek")!) : null,
      matchedKeyword: "",
    };
  }, [searchParams]);

  const spokenText = searchParams.get("spoken") || "";
  const isVoiceSearchRef = useRef(false);
  const [showResultsOverlay, setShowResultsOverlay] = useState(false);
  const [overlayDismissing, setOverlayDismissing] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const latestFetchIdRef = useRef(0);

  const { speak: ttsSpeak, stop: ttsStop, status: ttsStatus } = useTextToSpeech();
  const geo = useGeolocation();

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchFormRef.current && !searchFormRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-select city when geolocation detects one (only if no city already set from URL)
  useEffect(() => {
    if (!cityFromUrl && geo.isEnabled && geo.detectedCity && selectedCity === "all") {
      setSelectedCity(geo.detectedCity);
    }
  }, [geo.isEnabled, geo.detectedCity]);

  const { status: voiceStatus, toggleRecording } = useVoiceSearch({
    onTranscript: (keywords, spoken, detectedCategory) => {
      isVoiceSearchRef.current = true;
      setInputValue(keywords);
      setSearchQuery(keywords);
      const params: Record<string, string> = { q: keywords, spoken };
      if (detectedCategory) params.category = detectedCategory;
      setSearchParams(params);
      if (isMobile) window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (message) => {
      toast({ variant: "destructive", title: "Erreur microphone", description: message });
    },
  });

  // Get cities available in results, sorted by priority score
  const availableCities = useMemo(() => {
    const businessCities = new Set(allBusinesses.map(b => b.city));
    return citiesWithPriority
      .filter(c => businessCities.has(c.name))
      .sort((a, b) => a.priority - b.priority)
      .map(c => c.name);
  }, [allBusinesses, citiesWithPriority]);

  const getEffectiveRating = (b: typeof allBusinesses[0]): number | null => {
    if (b.rating) return Number(b.rating);
    return computeWeightedRatingOn20(collectRatingSources(b));
  };

  // Sort: WTUCE verified first (by rating desc), then non-verified (by rating desc)
  const sortWtuceAndRating = (a: Business, b: Business) => {
    const aVerified = a.wtuce_status === "verified" ? 0 : 1;
    const bVerified = b.wtuce_status === "verified" ? 0 : 1;
    if (aVerified !== bVerified) return aVerified - bVerified;
    return (getEffectiveRating(b) ?? -1) - (getEffectiveRating(a) ?? -1);
  };

  // Filter businesses by city, then sort by WTUCE status + rating
  const filteredBusinesses = useMemo(() => {
    const filtered = selectedCity === "all" ? allBusinesses : allBusinesses.filter(b => b.city === selectedCity);
    
    if (activeTimeSlot) {
      // Separate into "open during slot" and "rest"
      const openDuring: Business[] = [];
      const rest: Business[] = [];
      for (const b of filtered) {
        const vacDates = Array.isArray(b.vacation_dates) ? b.vacation_dates as Array<{ start_date: string; end_date: string }> : null;
        if (isOpenDuringSlot(b.opening_hours || null, !!b.is_open_24h, activeTimeSlot, vacDates)) {
          openDuring.push(b);
        } else {
          rest.push(b);
        }
      }
      return [...openDuring.sort(sortWtuceAndRating), ...rest.sort(sortWtuceAndRating)];
    }
    
    return [...filtered].sort(sortWtuceAndRating);
  }, [allBusinesses, selectedCity, activeTimeSlot, searchQuery]);

  // Group businesses by primary subcategory when a subcategory was detected
  const groupedBusinesses = useMemo(() => {
    if (!detectedSubcategory || filteredBusinesses.length === 0) return null;
    
    const groups: Record<string, Business[]> = {};
    for (const b of filteredBusinesses) {
      // Use first category as primary subcategory
      const primary = b.categories?.[0] || "Autre";
      if (!groups[primary]) groups[primary] = [];
      groups[primary].push(b);
    }
    
    const keys = Object.keys(groups);
    
    // Sort groups: detected subcategory first, then by DB sort_order, then alphabetically
    const getSubcatSortOrder = (name: string): number => {
      const sc = subcategories.find(s => s.name_fr.toLowerCase() === name.toLowerCase());
      return sc?.sort_order ?? 9999;
    };
    const sortedKeys = keys.sort((a, b) => {
      const aIsDetected = a.toLowerCase() === detectedSubcategory.toLowerCase() ? 0 : 1;
      const bIsDetected = b.toLowerCase() === detectedSubcategory.toLowerCase() ? 0 : 1;
      if (aIsDetected !== bIsDetected) return aIsDetected - bIsDetected;
      const aOrder = getSubcatSortOrder(a);
      const bOrder = getSubcatSortOrder(b);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.localeCompare(b, 'fr');
    });
    
    return sortedKeys.map(key => ({ subcategory: key, businesses: groups[key] }));
  }, [filteredBusinesses, detectedSubcategory]);

  // Paginate (only for non-grouped view)
  const totalPages = Math.ceil(filteredBusinesses.length / ITEMS_PER_PAGE);
  const paginatedBusinesses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBusinesses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBusinesses, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, searchQuery]);

  // Fetch gammes, badges, subcategories, badge_subcategories + TTS intro phrase on mount
  useEffect(() => {
    Promise.all([
      supabase.from("gammes").select("id, name_fr, color_hex, text_color_hex, sort_order"),
      supabase.from("badges").select("id, name_fr, color_hex, text_color_hex").order("sort_order", { ascending: true }),
      supabase.from("subcategories").select("id, name_fr, sort_order").order("sort_order", { ascending: true }),
      supabase.from("badge_subcategories").select("badge_id, subcategory_id"),
      supabase.from("staff_notes").select("content").eq("key", "tts_intro_phrase").maybeSingle(),
    ]).then(([gammesRes, badgesRes, subcatsRes, badgeSubcatsRes, ttsIntroRes]) => {
      if (gammesRes.data) setGammes(gammesRes.data);
      if (badgesRes.data) setBadges(badgesRes.data);
      if (subcatsRes.data) setSubcategories(subcatsRes.data);
      if (badgeSubcatsRes.data) setBadgeSubcategories(badgeSubcatsRes.data);
      if (ttsIntroRes.data?.content) setTtsIntroPhrase(ttsIntroRes.data.content);
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const fetchId = ++latestFetchIdRef.current;

      if (!searchQuery.trim() && !categoryFromUrl) {
        if (fetchId !== latestFetchIdRef.current) return;
        setAllBusinesses([]);
        setSearchMessage("");
        setDetectedSubcategory(null);
        setSearchMode(null);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        // Fetch cities with sort_order
        const { data: citiesData } = await supabase
          .from("cities")
          .select("name_fr, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (fetchId !== latestFetchIdRef.current) return;

        if (citiesData) {
          setCitiesWithPriority(
            citiesData.map(c => ({ name: c.name_fr, priority: c.sort_order || 0 }))
          );
        }

        // Use edge function for full-text search
        const { data, error } = await supabase.functions.invoke<SearchResult>("business-search", {
          body: { 
            query: searchQuery.trim() || undefined,
            category: categoryFromUrl || undefined,
            language: language,
            limit: 100
          }
        });

        if (fetchId !== latestFetchIdRef.current) return;
        if (error) throw error;
        
        if (data) {
          setSearchLevel(data.searchLevel || "");
          const safeDetectedSubcategory = data.detectedSubcategory || null;
          const rawData = data as SearchResult & { search_mode?: string | null; mode?: string | null };
          const normalizedSearchMode = normalizeSearchMode(rawData.searchMode)
            ?? normalizeSearchMode(rawData.search_mode)
            ?? normalizeSearchMode(rawData.mode)
            ?? (safeDetectedSubcategory ? "broad" : null);

          setDetectedSubcategory(safeDetectedSubcategory);
          setSearchMode(normalizedSearchMode);

          // When user searched for something specific but got "recommended" fallback → show 0 results
          const isVoiceSearch = !!searchParams.get("spoken");
          const hasActiveQuery = !!searchQuery.trim();
          if ((isVoiceSearch || hasActiveQuery) && data.searchLevel === "recommended") {
            setAllBusinesses([]);
            setSearchMessage("");
          } else {
            setAllBusinesses(data.businesses || []);
            setSearchMessage(data.message || "");
          }
        }
      } catch (error) {
        if (fetchId !== latestFetchIdRef.current) return;
        console.error("Error fetching search data:", error);
        setAllBusinesses([]);
        setSearchMessage("");
      } finally {
        if (fetchId !== latestFetchIdRef.current) return;
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchQuery, categoryFromUrl, language]);

  // Fetch celebrity businesses on mount (used when celebrity query detected)
  useEffect(() => {
    supabase
      .from("businesses")
      .select("*")
      .in("id", CELEBRITY_IDS)
      .then(({ data }) => {
        if (data) {
          // Preserve the manual ordering from CELEBRITY_IDS
          const ordered = CELEBRITY_IDS
            .map(id => data.find(b => b.id === id))
            .filter(Boolean)
            .map(b => ({ ...b, distance_km: null })) as Business[];
          setCelebrityBusinesses(ordered);
        }
      });
  }, []);

  // Build rich TTS description for a business
  const buildBusinessTTSLine = useCallback((b: Business, index: number) => {
    const parts: string[] = [b.name];

    // Verified status
    if (b.wtuce_status === "verified") {
      parts.push("vérifié WTUCE");
    }

    // Gamme
    if (b.gamme_id) {
      const gamme = gammes.find(g => g.id === b.gamme_id);
      if (gamme) parts.push(`gamme ${gamme.name_fr}`);
    }

    // Badge
    if (b.badge_id) {
      const badge = badges.find(bd => bd.id === b.badge_id);
      if (badge) parts.push(badge.name_fr);
    }

    // Rating
    const ratingOn20 = computeWeightedRatingOn20(collectRatingSources(b));
    if (ratingOn20 !== null) {
      parts.push(`noté ${ratingOn20.toFixed(1).replace('.', ',')} sur 20`);
    }

    // Distance (if geo enabled)
    if (geo.isEnabled && geo.coords && b.latitude && b.longitude) {
      const R = 6371;
      const dLat = (b.latitude - geo.coords.lat) * Math.PI / 180;
      const dLon = (b.longitude - geo.coords.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(geo.coords.lat * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) * Math.sin(dLon/2)**2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      if (dist < 1) {
        parts.push(`à ${Math.round(dist * 1000)} mètres de vous`);
      } else {
        parts.push(`à ${dist.toFixed(1).replace('.', ',')} kilomètres de vous`);
      }
    }

    // Hook (custom phrase from DB)
    const hook = language === 'ar' ? (b.hook_ar || b.hook_fr) : language === 'en' ? (b.hook_en || b.hook_fr) : b.hook_fr;
    if (hook) {
      parts.push(hook);
    }

    return parts.join(", ");
  }, [gammes, badges, geo.isEnabled, geo.coords, language]);

  // Show overlay when arriving from voice search with results
  useEffect(() => {
    if (!isLoading && spokenText && allBusinesses.length > 0 && !showResultsOverlay && !overlayDismissing) {
      setShowResultsOverlay(true);
    }
  }, [isLoading, spokenText, allBusinesses.length]);

  const dismissOverlay = () => {
    setOverlayDismissing(true);
    setTimeout(() => {
      setShowResultsOverlay(false);
      setOverlayDismissing(false);
      // Scroll to top of page to show geo filters
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 400);
  };

  // Auto-speak results summary after voice search
  useEffect(() => {
    if (!isLoading && isVoiceSearchRef.current && allBusinesses.length > 0) {
      isVoiceSearchRef.current = false;
      const count = allBusinesses.length;
      const cityText = selectedCity !== "all" ? ` à ${selectedCity}` : "";
      const intro = ttsIntroPhrase ? `${ttsIntroPhrase} ` : "";
      let speech = `${intro}J'ai trouvé ${count} résultat${count > 1 ? 's' : ''}${cityText}. `;

      const top = allBusinesses.slice(0, 3);
      if (top.length === 1) {
        speech += `Le meilleur résultat est ${buildBusinessTTSLine(top[0], 0)}.`;
      } else {
        speech += "Voici les meilleurs résultats. ";
        top.forEach((b, i) => {
          speech += `${i === 0 ? 'Premier' : i === 1 ? 'Deuxième' : 'Troisième'}, ${buildBusinessTTSLine(b, i)}. `;
        });
      }
      ttsSpeak(speech);
    } else if (!isLoading && isVoiceSearchRef.current && allBusinesses.length === 0 && spokenText) {
      isVoiceSearchRef.current = false;
      ttsSpeak("Désolé, je n'ai trouvé aucun résultat pour votre recherche.");
    }
  }, [isLoading, allBusinesses, buildBusinessTTSLine]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSearchQuery(inputValue.trim());
      setSearchParams({ q: inputValue.trim() });
      if (isMobile) window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const translations = {
    fr: {
      searchResults: "Résultats de recherche",
      for: "pour",
      establishments: "établissements",
      found: "trouvés",
      noResults: "Aucun établissement trouvé",
      tryAnother: "Essayez une autre recherche",
      verified: "Vérifié",
      regulated: "Réglementé",
      allCities: "Toutes les villes",
      filterByCity: "Filtrer par ville",
      page: "Page",
      of: "sur",
      previous: "Précédent",
      next: "Suivant",
      showing: "Affichage de",
      to: "à",
      results: "résultats",
      placeholder: "Que cherchez-vous ?"
    },
    en: {
      searchResults: "Search results",
      for: "for",
      establishments: "establishments",
      found: "found",
      noResults: "No establishments found",
      tryAnother: "Try another search",
      verified: "Verified",
      regulated: "Regulated",
      allCities: "All cities",
      filterByCity: "Filter by city",
      page: "Page",
      of: "of",
      previous: "Previous",
      next: "Next",
      showing: "Showing",
      to: "to",
      results: "results",
      placeholder: "What are you looking for?"
    },
    ar: {
      searchResults: "نتائج البحث",
      for: "عن",
      establishments: "مؤسسة",
      found: "وجدت",
      noResults: "لم يتم العثور على مؤسسات",
      tryAnother: "جرب بحثًا آخر",
      verified: "موثق",
      regulated: "منظم",
      allCities: "جميع المدن",
      filterByCity: "تصفية حسب المدينة",
      page: "صفحة",
      of: "من",
      previous: "السابق",
      next: "التالي",
      showing: "عرض",
      to: "إلى",
      results: "نتائج",
      placeholder: "ماذا تبحث عنه؟"
    }
  };

  const t = translations[language] || translations.fr;

  const navigate = useNavigate();

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
  };

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams);
    if (category === "all") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    navigate(`/search?${params.toString()}`, { replace: true });
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startResult = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endResult = Math.min(currentPage * ITEMS_PER_PAGE, filteredBusinesses.length);

  const showZitounEasterEgg = !isLoading && isZitounMask(spokenText || searchQuery);
  const showCelebrityGuide = !isLoading && isCelebrityQuery(spokenText || searchQuery);
  const showSosMedecin = isSosMedecinQuery(spokenText || searchQuery);
  const showPompiers = isPompiersQuery(spokenText || searchQuery);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />

      {/* Voice search results overlay */}
      {showResultsOverlay && isMobile && (
        <div
          className={`fixed inset-0 z-[60] flex items-end transition-all duration-400 ${overlayDismissing ? 'pointer-events-none' : ''}`}
          style={{ background: 'transparent' }}
        >
          <div
            className={`relative w-full h-[50vh] bg-black/30 backdrop-blur-lg flex flex-col items-center justify-center px-6 text-center transition-transform duration-400 ease-in-out ${overlayDismissing ? 'translate-y-full' : 'translate-y-0'}`}
            style={{ animation: overlayDismissing ? undefined : 'slideInFromBottom 0.4s ease-out' }}
          >
            {/* Close button */}
            <button
              onClick={dismissOverlay}
              className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="text-white/60 text-sm mb-2">
              {language === "en" ? "Search results for" : language === "ar" ? "نتائج البحث عن" : "Résultats de recherche pour"}
            </p>
            <p className="text-xl md:text-2xl font-bold text-white mb-3">
              «&nbsp;{spokenText || searchQuery}&nbsp;»
            </p>
            <p className="text-white font-semibold text-lg mb-5">
              {filteredBusinesses.length} {language === "en" ? "establishments found" : language === "ar" ? "مؤسسة وجدت" : "établissements trouvés"}
            </p>

            {/* TTS button */}
            {(ttsStatus === "playing" || ttsStatus === "loading") ? (
              <button
                onClick={ttsStop}
                className="mb-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold/20 text-gold text-sm font-medium hover:bg-gold/30 transition-colors"
              >
                {ttsStatus === "loading" ? <Loader className="h-4 w-4 animate-spin" /> : <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span></span><Volume2 className="h-4 w-4" /></>}
                {ttsStatus === "loading" ? "Chargement…" : "Lecture en cours — stop"}
              </button>
            ) : filteredBusinesses.length > 0 && (
              <button
                onClick={() => {
                  const count = filteredBusinesses.length;
                  const cityText = selectedCity !== "all" ? ` à ${selectedCity}` : "";
                  const intro = ttsIntroPhrase ? `${ttsIntroPhrase} ` : "";
                  let speech = `${intro}J'ai trouvé ${count} résultat${count > 1 ? 's' : ''}${cityText}. `;
                  const top = filteredBusinesses.slice(0, 3);
                  if (top.length === 1) {
                    speech += `Le meilleur résultat est ${buildBusinessTTSLine(top[0], 0)}.`;
                  } else {
                    speech += "Voici les meilleurs résultats. ";
                    top.forEach((b, i) => {
                      speech += `${i === 0 ? 'Premier' : i === 1 ? 'Deuxième' : 'Troisième'}, ${buildBusinessTTSLine(b, i)}. `;
                    });
                  }
                  ttsSpeak(speech);
                }}
                className="mb-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-gold/30 text-gold text-sm font-medium hover:bg-gold/20 transition-colors"
              >
                <Volume2 className="h-4 w-4" />
                {language === "en" ? "Listen to results" : language === "ar" ? "استمع للنتائج" : "Écouter les résultats"}
              </button>
            )}

            {/* Geo toggle */}
            <button
              onClick={geo.toggle}
              className={`mb-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                geo.isEnabled
                  ? "bg-gold/20 text-gold border border-gold/40"
                  : "bg-white/10 text-white/60 border border-white/20 hover:border-white/40"
              }`}
            >
              {geo.isDetecting ? (
                <Loader className="h-3.5 w-3.5 animate-spin" />
              ) : geo.isEnabled ? (
                <MapPin className="h-3.5 w-3.5" />
              ) : (
                <MapPinOff className="h-3.5 w-3.5" />
              )}
              {geo.isDetecting
                ? (language === "en" ? "Detecting..." : "Détection...")
                : geo.isEnabled && geo.detectedCity
                ? `📍 ${geo.detectedCity}`
                : geo.isEnabled
                ? (language === "en" ? "No city nearby" : "Aucune ville proche")
                : (language === "en" ? "Enable location" : language === "ar" ? "تفعيل الموقع" : "Activer la position")
              }
            </button>

            {/* Dismiss button */}
            <button
              onClick={dismissOverlay}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gold text-black text-sm font-semibold hover:bg-gold/90 transition-colors"
            >
              {language === "en" ? "See results" : language === "ar" ? "عرض النتائج" : "Voir les résultats"}
              <ChevronRight className="h-4 w-4 rotate-90" />
            </button>
          </div>
        </div>
      )}

      {/* Geolocation consent banner */}
      {geo.showBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-lg mx-auto bg-card border border-gold/30 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gold shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {language === "en" ? "Use your location to see nearby results?" : language === "ar" ? "استخدم موقعك لعرض النتائج القريبة؟" : "Utiliser votre position pour affiner les résultats ?"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {language === "en" ? "You can change this anytime." : language === "ar" ? "يمكنك تغيير هذا في أي وقت." : "Vous pouvez changer ce choix à tout moment."}
              </p>
            </div>
            <button onClick={geo.dismiss} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <Button variant="ghost" size="sm" onClick={geo.decline} className="text-muted-foreground">
              {language === "en" ? "No thanks" : language === "ar" ? "لا شكرا" : "Non merci"}
            </Button>
            <Button size="sm" onClick={geo.accept} className="bg-gold text-black hover:bg-gold/90">
              <MapPin className="h-3.5 w-3.5 mr-1" />
              {language === "en" ? "Enable" : language === "ar" ? "تفعيل" : "Activer"}
            </Button>
          </div>
        </div>
      )}

      {/* Mobile-only: geo + time badges at top */}
      {isMobile && (
        <div className="bg-black pt-20 pb-2 px-4 flex flex-wrap items-center gap-2">
          <button
            onClick={geo.toggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              geo.isEnabled
                ? "bg-gold/20 text-gold border border-gold/40"
                : "bg-card text-muted-foreground border border-border hover:border-gold/30"
            }`}
          >
            {geo.isDetecting ? (
              <Loader className="h-3.5 w-3.5 animate-spin" />
            ) : geo.isEnabled ? (
              <MapPin className="h-3.5 w-3.5" />
            ) : (
              <MapPinOff className="h-3.5 w-3.5" />
            )}
            {geo.isDetecting
              ? (language === "en" ? "Detecting..." : "Détection...")
              : geo.isEnabled && geo.detectedCity
              ? `📍 ${geo.detectedCity}`
              : geo.isEnabled
              ? (language === "en" ? "No city nearby" : "Aucune ville proche")
              : (language === "en" ? "Location off" : "Position désactivée")
            }
          </button>
          {activeTimeSlot && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/20 border border-gold/40 text-gold text-xs font-medium">
              <Clock className="h-3.5 w-3.5" />
              {language === "en"
                ? `Open ${activeTimeSlot.startHour}h–${activeTimeSlot.endHour}h first`
                : language === "ar"
                  ? `مفتوح ${activeTimeSlot.startHour}h–${activeTimeSlot.endHour}h أولاً`
                  : `Ouverts ${activeTimeSlot.startHour}h–${activeTimeSlot.endHour}h en priorité`}
            </span>
          )}
        </div>
      )}

      {/* Hero Section - hidden on mobile when results found via voice search */}
      <section className={`bg-black pt-6 lg:pt-28 pb-8 lg:pb-16 relative overflow-hidden ${isMobile && spokenText && filteredBusinesses.length > 0 ? 'hidden' : ''}`}>
        <div className="container mx-auto px-4 relative z-10">
          {(searchQuery || categoryFromUrl) && (
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
                {searchQuery ? (
                  <>{t.searchResults} {t.for}<br />«&nbsp;<span className="text-gold">{spokenText || searchQuery}</span>&nbsp;»</>
                ) : (() => {
                  const categoryLabels: Record<string, { fr: string; en: string; ar: string }> = {
                    "Hôtellerie": { fr: "Hôtels", en: "Hotels", ar: "الفنادق" },
                    "Restauration": { fr: "Restaurants", en: "Restaurants", ar: "المطاعم" },
                    "Tourisme": { fr: "Activités & Tourisme", en: "Activities & Tourism", ar: "الأنشطة والسياحة" },
                    "Commerce": { fr: "Commerce & Shopping", en: "Shopping", ar: "التسوق" },
                    "Bien-être": { fr: "Bien-être & Spa", en: "Wellness & Spa", ar: "العافية والسبا" },
                    "Santé": { fr: "Santé", en: "Health", ar: "الصحة" },
                    "Culture": { fr: "Culture", en: "Culture", ar: "الثقافة" },
                    "Transport": { fr: "Transport", en: "Transport", ar: "النقل" },
                    "Sport & Loisirs": { fr: "Sport & Loisirs", en: "Sports & Leisure", ar: "الرياضة والترفيه" },
                  };
                  const label = categoryLabels[categoryFromUrl];
                  const catName = label
                    ? (language === "en" ? label.en : language === "ar" ? label.ar : label.fr)
                    : categoryFromUrl;
                  const prefix = language === "en" ? "Best" : language === "ar" ? "أفضل" : "Meilleurs";
                  const suffix = language === "en" ? "in Morocco" : language === "ar" ? "في المغرب" : "au Maroc";
                  return <><span className="text-gold">{prefix} {catName}</span> {suffix}</>;
                })()}
              </h1>
              <p className="text-base lg:text-xl text-muted-foreground">
                {isLoading ? (
                  <span className="text-muted-foreground italic">Recherche en cours…</span>
                ) : (
                  <><span className="text-gold font-semibold">{filteredBusinesses.length}</span> {t.establishments} {t.found}</>
                )}
              </p>
              {/* TTS controls */}
              {(ttsStatus === "playing" || ttsStatus === "loading") ? (
                <button
                  onClick={ttsStop}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/20 text-gold text-sm font-medium hover:bg-gold/30 transition-colors"
                >
                  {ttsStatus === "loading" ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span></span><Volume2 className="h-4 w-4" /></>
                  )}
                  {ttsStatus === "loading" ? "Chargement audio…" : "Lecture en cours — cliquez pour arrêter"}
                </button>
              ) : !isLoading && filteredBusinesses.length > 0 && (
                <button
                  onClick={() => {
                    const count = filteredBusinesses.length;
                    const cityText = selectedCity !== "all" ? ` à ${selectedCity}` : "";
                    const intro = ttsIntroPhrase ? `${ttsIntroPhrase} ` : "";
                    let speech = `${intro}J'ai trouvé ${count} résultat${count > 1 ? 's' : ''}${cityText}. `;
                    const top = filteredBusinesses.slice(0, 3);
                    if (top.length === 1) {
                      speech += `Le meilleur résultat est ${buildBusinessTTSLine(top[0], 0)}.`;
                    } else {
                      speech += "Voici les meilleurs résultats. ";
                      top.forEach((b, i) => {
                        speech += `${i === 0 ? 'Premier' : i === 1 ? 'Deuxième' : 'Troisième'}, ${buildBusinessTTSLine(b, i)}. `;
                      });
                    }
                    ttsSpeak(speech);
                  }}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-gold/30 text-gold text-sm font-medium hover:bg-gold/20 transition-colors"
                >
                  <Volume2 className="h-4 w-4" />
                  {language === "en" ? "Listen to results" : language === "ar" ? "استمع للنتائج" : "Écouter les résultats"}
                </button>
              )}
              {searchMessage && (
                <p className="text-sm text-muted-foreground mt-2 italic">{searchMessage}</p>
              )}
              {detectedSubcategory && searchMode && (
                <span className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                  searchMode === "strict"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}>
                  <Search className="h-3 w-3" />
                  {detectedSubcategory} — {searchMode === "strict" ? "Strict" : "Broad"}
                </span>
              )}
            </div>
          )}


        </div>
      </section>

      {/* Filters & Results */}
      <section ref={resultsRef} className="py-6 lg:py-12 bg-black">
        <div className="container mx-auto px-4">
          {/* Filters: City + Geo toggle — on mobile shown before hero via order */}
          <div className={`mb-8 flex flex-wrap items-center gap-3 ${isMobile ? 'hidden' : ''}`}>
            {/* Geo toggle */}
            <button
              onClick={geo.toggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                geo.isEnabled
                  ? "bg-gold/20 text-gold border border-gold/40"
                  : "bg-card text-muted-foreground border border-border hover:border-gold/30"
              }`}
              title={geo.isEnabled ? "Désactiver la géolocalisation" : "Activer la géolocalisation"}
            >
              {geo.isDetecting ? (
                <Loader className="h-3.5 w-3.5 animate-spin" />
              ) : geo.isEnabled ? (
                <MapPin className="h-3.5 w-3.5" />
              ) : (
                <MapPinOff className="h-3.5 w-3.5" />
              )}
              {geo.isDetecting
                ? (language === "en" ? "Detecting..." : "Détection...")
                : geo.isEnabled && geo.detectedCity
                ? `📍 ${geo.detectedCity}`
                : geo.isEnabled
                ? (language === "en" ? "No city nearby" : "Aucune ville proche")
                : (language === "en" ? "Location off" : "Position désactivée")
              }
            </button>

            {/* Time slot indicator */}
            {activeTimeSlot && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/20 border border-gold/40 text-gold text-xs font-medium">
                <Clock className="h-3.5 w-3.5" />
                {language === "en"
                  ? `Showing places open ${activeTimeSlot.startHour}h–${activeTimeSlot.endHour}h first`
                  : language === "ar"
                    ? `عرض الأماكن المفتوحة ${activeTimeSlot.startHour}h–${activeTimeSlot.endHour}h أولاً`
                    : `Établissements ouverts ${activeTimeSlot.startHour}h–${activeTimeSlot.endHour}h en priorité`}
              </span>
            )}

            {/* City filter dropdown */}
            {availableCities.length > 1 && (
              <>
                <label className="text-sm text-muted-foreground">{t.filterByCity}:</label>
                <Select value={selectedCity} onValueChange={handleCityChange}>
                  <SelectTrigger className="w-[220px] bg-card border-border">
                    <SelectValue placeholder={t.allCities} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allCities}</SelectItem>
                    {availableCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {isMobile && filteredBusinesses.length > 0 && (
            <p className="mb-4 text-sm text-muted-foreground">
              <span className="text-gold font-semibold">{filteredBusinesses.length}</span> {t.establishments} {t.found}
            </p>
          )}

          {/* Easter egg: Zitoun Mask/Musk */}
          {showZitounEasterEgg && (
            <div className="flex flex-col items-center mb-10">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gold/30 max-w-md w-full">
                <img
                  src={zitounMaskImg}
                  alt="Zitoun Mask"
                  className="w-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
                  <p className="text-gold font-semibold text-lg">Zitoun Mask</p>
                  <p className="text-white/70 text-sm">Le légendaire habitué du Zitoun</p>
                </div>
              </div>
            </div>
          )}

          {/* Easter egg: Celebrity Guide */}
          {showCelebrityGuide && (
            <>
              <CelebrityGuide />
              {celebrityBusinesses.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
                  {celebrityBusinesses.map((business) => (
                    <BusinessCard
                      key={business.id}
                      business={business as BusinessCardData}
                      gammes={gammes}
                      badges={badges}
                      subcategories={subcategories}
                      badgeSubcategories={badgeSubcategories}
                      verifiedLabel={t.verified}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Easter egg: SOS Médecin */}
          {showSosMedecin && (
            <div className="max-w-lg mx-auto mb-10 rounded-2xl overflow-hidden border border-red-500/40 shadow-2xl bg-gradient-to-br from-black to-zinc-900">
              <div className="px-6 py-5 border-b border-red-500/20 bg-gradient-to-r from-red-500/10 to-transparent">
                <p className="text-red-400 font-semibold text-lg flex items-center gap-2">
                  🚨 SOS Médecin — Numéros d'urgence au Maroc
                </p>
                <p className="text-white/50 text-sm mt-0.5">Appelez immédiatement si besoin d'aide médicale</p>
              </div>
              <div className="px-6 py-5 space-y-3">
                <a href="tel:150" className="flex items-center justify-between rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-3 hover:bg-orange-500/10 transition-colors group">
                  <div>
                    <p className="text-white font-semibold text-sm">Pompiers / Secours</p>
                    <p className="text-white/40 text-xs">Incendie, accidents, sauvetage</p>
                  </div>
                  <span className="text-orange-400 font-bold text-2xl group-hover:scale-110 transition-transform">150</span>
                </a>
                <a href="tel:190" className="flex items-center justify-between rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-3 hover:bg-orange-500/10 transition-colors group">
                  <div>
                    <p className="text-white font-semibold text-sm">Protection Civile</p>
                    <p className="text-white/40 text-xs">Secours et premiers soins</p>
                  </div>
                  <span className="text-orange-400 font-bold text-2xl group-hover:scale-110 transition-transform">190</span>
                </a>
                <a href="tel:19" className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3 hover:bg-blue-500/10 transition-colors group">
                  <div>
                    <p className="text-white font-semibold text-sm">Police Secours</p>
                    <p className="text-white/40 text-xs">Urgences police</p>
                  </div>
                  <span className="text-blue-400 font-bold text-2xl group-hover:scale-110 transition-transform">19</span>
                </a>
                <a href="tel:177" className="flex items-center justify-between rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 hover:bg-yellow-500/10 transition-colors group">
                  <div>
                    <p className="text-white font-semibold text-sm">Gendarmerie Royale</p>
                    <p className="text-white/40 text-xs">Zones rurales et périurbaines</p>
                  </div>
                  <span className="text-yellow-400 font-bold text-2xl group-hover:scale-110 transition-transform">177</span>
                </a>
              </div>
              <div className="px-6 py-3 border-t border-red-500/20 bg-red-500/5">
                <p className="text-white/30 text-xs italic">En cas d'urgence grave, composez le 150 (SAMU) ou rendez-vous aux urgences de l'hôpital le plus proche.</p>
              </div>
            </div>
          )}

          {/* Easter egg: Pompiers */}
          {showPompiers && (
            <div className="max-w-lg mx-auto mb-10 rounded-2xl overflow-hidden border border-orange-500/40 shadow-2xl bg-gradient-to-br from-black to-zinc-900">
              <div className="px-6 py-5 border-b border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-transparent">
                <p className="text-orange-400 font-semibold text-lg flex items-center gap-2">
                  🔥 Pompiers — Numéros d'urgence au Maroc
                </p>
                <p className="text-white/50 text-sm mt-0.5">Appelez immédiatement en cas d'incendie ou de danger</p>
              </div>
              <div className="px-6 py-5 space-y-3">
                <a href="tel:150" className="flex items-center justify-between rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-3 hover:bg-orange-500/10 transition-colors group">
                  <div>
                    <p className="text-white font-semibold text-sm">Sapeurs-Pompiers</p>
                    <p className="text-white/40 text-xs">Incendie, secours et sauvetage</p>
                  </div>
                  <span className="text-orange-400 font-bold text-2xl group-hover:scale-110 transition-transform">150</span>
                </a>
                <a href="tel:190" className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 hover:bg-red-500/10 transition-colors group">
                  <div>
                    <p className="text-white font-semibold text-sm">Protection Civile</p>
                    <p className="text-white/40 text-xs">Secours d'urgence et catastrophes</p>
                  </div>
                  <span className="text-red-400 font-bold text-2xl group-hover:scale-110 transition-transform">190</span>
                </a>
                <a href="tel:19" className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3 hover:bg-blue-500/10 transition-colors group">
                  <div>
                    <p className="text-white font-semibold text-sm">Police Secours</p>
                    <p className="text-white/40 text-xs">Urgences police</p>
                  </div>
                  <span className="text-blue-400 font-bold text-2xl group-hover:scale-110 transition-transform">19</span>
                </a>
                <a href="tel:177" className="flex items-center justify-between rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 hover:bg-yellow-500/10 transition-colors group">
                  <div>
                    <p className="text-white font-semibold text-sm">Gendarmerie Royale</p>
                    <p className="text-white/40 text-xs">Zones rurales et périurbaines</p>
                  </div>
                  <span className="text-yellow-400 font-bold text-2xl group-hover:scale-110 transition-transform">177</span>
                </a>
              </div>
              <div className="px-6 py-3 border-t border-orange-500/20 bg-orange-500/5">
                <p className="text-white/30 text-xs italic">En cas d'incendie, évacuez immédiatement et composez le 15. N'essayez pas d'éteindre un feu important seul.</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-gold" />
            </div>
          ) : filteredBusinesses.length === 0 && !showZitounEasterEgg && !showCelebrityGuide && !showSosMedecin && !showPompiers ? (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-400 mb-2">{t.noResults}</p>
              <p className="text-sm text-gray-500">{t.tryAnother}</p>
            </div>
          ) : !showCelebrityGuide && !showSosMedecin && !showPompiers && filteredBusinesses.length > 0 ? (
            <>
              {/* Results Grid — Grouped by subcategory or flat */}
              {groupedBusinesses ? (
                <div className="space-y-10">
                  {groupedBusinesses.map((group) => (
                    <div key={group.subcategory}>
                      <div className="flex items-center gap-3 mb-5">
                        <h2 className="text-xl font-bold text-white">{group.subcategory}</h2>
                        <span className="text-sm text-muted-foreground">({group.businesses.length})</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {group.businesses.map((business) => (
                          <BusinessCard
                            key={business.id}
                            business={business as BusinessCardData}
                            gammes={gammes}
                            badges={badges}
                            subcategories={subcategories}
                            badgeSubcategories={badgeSubcategories}
                            verifiedLabel={t.verified}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {paginatedBusinesses.map((business) => (
                    <BusinessCard
                      key={business.id}
                      business={business as BusinessCardData}
                      gammes={gammes}
                      badges={badges}
                      subcategories={subcategories}
                      badgeSubcategories={badgeSubcategories}
                      verifiedLabel={t.verified}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex flex-col items-center gap-4">
                  {/* Results count */}
                  <p className="text-sm text-gray-400">
                    {t.showing} {startResult} {t.to} {endResult} {t.of} {filteredBusinesses.length} {t.results}
                  </p>
                  
                  {/* Pagination controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t.previous}
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="gap-1"
                    >
                      {t.next}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </section>

      {/* Floating Search Bar */}
      <div className="sticky bottom-0 z-40 bg-black/90 backdrop-blur-md border-t border-gold/20 py-3 px-4">
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto" ref={searchFormRef}>
          {/* Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t.placeholder}
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
                className="w-full pl-14 pr-36 py-6 text-base bg-white/90 backdrop-blur-sm border-gold/50 focus:border-gold rounded-full shadow-lg"
              />
              <SearchSuggestionsDropdown
                suggestions={suggestions}
                visible={showSuggestions && suggestions.length > 0}
                position="top"
              />
              <Button
                type="submit"
                size="lg"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white font-semibold rounded-full px-6 py-4 shadow-md border border-black/10"
                style={{ backgroundColor: "#25D366" }}
              >
                {language === "fr" ? "Recherche" : language === "ar" ? "بحث" : "Search"}
              </Button>
            </div>
            <button
              type="button"
              onClick={toggleRecording}
              disabled={voiceStatus === "processing"}
              className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg transition-all ${
                voiceStatus === "recording"
                  ? "bg-red-100 animate-pulse"
                  : voiceStatus === "processing"
                    ? "bg-white/70"
                    : "bg-white/90 hover:bg-white"
              }`}
              title={language === "fr" ? "Recherche vocale" : language === "ar" ? "بحث صوتي" : "Voice search"}
            >
              {voiceStatus === "processing" ? (
                <Loader className="h-5 w-5 text-black animate-spin" />
              ) : voiceStatus === "recording" ? (
                <MicOff className="h-5 w-5 text-red-600" />
              ) : (
                <Mic className="h-5 w-5 text-black" />
              )}
            </button>
          </div>

          {/* Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t.placeholder}
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
                className="w-full pl-11 pr-28 py-5 text-sm bg-white/90 backdrop-blur-sm border-gold/50 focus:border-gold rounded-full shadow-lg"
              />
              <SearchSuggestionsDropdown
                suggestions={suggestions}
                visible={showSuggestions && suggestions.length > 0}
                position="top"
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white font-semibold rounded-full px-4 py-2 shadow-md border border-black/10 text-xs"
                style={{ backgroundColor: "#25D366" }}
              >
                {language === "fr" ? "Recherche" : language === "ar" ? "بحث" : "Search"}
              </Button>
            </div>
            <button
              type="button"
              onClick={toggleRecording}
              disabled={voiceStatus === "processing"}
              className={`flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl shadow-lg transition-all ${
                voiceStatus === "recording"
                  ? "bg-red-100 animate-pulse"
                  : voiceStatus === "processing"
                    ? "bg-white/70"
                    : "bg-white/90 hover:bg-white"
              }`}
              title={language === "fr" ? "Recherche vocale" : language === "ar" ? "بحث صوتي" : "Voice search"}
            >
              {voiceStatus === "processing" ? (
                <Loader className="h-4 w-4 text-black animate-spin" />
              ) : voiceStatus === "recording" ? (
                <MicOff className="h-4 w-4 text-red-600" />
              ) : (
                <Mic className="h-4 w-4 text-black" />
              )}
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
};

export default SearchPage;
