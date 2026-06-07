import { useSearchParams, Link, useNavigate } from "react-router-dom";
import SearchInput from "@/components/SearchInput";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSEO } from "@/hooks/useSEO";
import { useIsMobile } from "@/hooks/use-mobile";
import HScroll from "@/components/HScroll";
import { useGeolocation } from "@/hooks/useGeolocation";

import { extractTimeSlot, isOpenDuringSlot, getCurrentTimePeriod, type TimeSlot, type TimePeriod } from "@/lib/timeSlots";
import { isCurrentlyOpen as isCurrentlyOpenCheck } from "@/lib/formatOpeningHours";
import { haversineKm } from "@/lib/haversine";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CategoriesCarouselSection from "@/components/CategoriesCarouselSection";
import CityCategoryFilter from "@/components/CityCategoryFilter";
import { Button } from "@/components/ui/button";
import GoogleMapEmbed from "@/components/GoogleMapEmbed";
import PoiGoogleMap from "@/components/PoiGoogleMap";
import type { PoiMapItem } from "@/components/PoiGoogleMap";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { Loader2, Building2, ChevronLeft, ChevronRight, Search, Mic, MicOff, Loader, MapPin, MapPinOff, X, Volume2, VolumeX, Clock, Map, Sparkles, SlidersHorizontal, ChevronDown, ChevronUp, RefreshCw, Compass, Maximize2, Minimize2, Star, Leaf, Truck, Accessibility, Package, Award, Hash, Heart, Bot, Send, Play, Pause } from "lucide-react";
import { YouTubeIcon } from "@/components/staff/SocialMediaIcons";
import ShareButton from "@/components/ShareButton";
import MoreFiltersPopup from "@/components/MoreFiltersPopup";
import { lazy, Suspense } from "react";
const BusinessMap = lazy(() => import("@/components/BusinessMap"));
import PoiSection from "@/components/PoiSection";
import DestinationSection, { type DestinationItem } from "@/components/DestinationSection";

import BusinessCard, { type BusinessCardData, type Gamme, type Badge, type SubcategoryRef, type BadgeSubcategoryRef } from "@/components/BusinessCard";
import AISearchAnswer, { parseInline, extractCitedBusinesses, type BusinessData as AIBusinessData } from "@/components/AISearchAnswer";
import SearchResultCard from "@/components/SearchResultCard";
import AISuggestionCard from "@/components/AISuggestionCard";
import SearchAIVideosCarousel from "@/components/SearchAIVideosCarousel";
const BookOnlineSlidePanel = lazy(() => import("@/components/BookOnlineSlidePanel"));
import SlidePanelHeader from "@/components/SlidePanelHeader";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";
import MobileSearchOverlay from "@/components/MobileSearchOverlay";
import FlightSearchOverlay, { type FlightSearchInitial } from "@/components/overlays/FlightSearchOverlay";
import WebSearchOverlay from "@/components/overlays/WebSearchOverlay";
import FallbackHotelsPanel from "@/components/overlays/FallbackHotelsPanel";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import VoiceSearchPanel from "@/components/VoiceSearchPanel";
import { resolveProximityQuery } from "@/lib/proximityQuery";
import { useTextToSpeech, preloadTTS } from "@/hooks/useTextToSpeech";
import { useToast } from "@/hooks/use-toast";
import LocationPickerDialog from "@/components/LocationPickerDialog";
import WarningOverlay from "@/components/WarningOverlay";
import EmergencyNumbers from "@/components/EmergencyNumbers";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import PanelSearchBar from "@/components/PanelSearchBar";
import YtBgLeadingControls from "@/components/YtBgLeadingControls";
import FrontStructureNavBar from "@/components/FrontStructureNavBar";
import FrontStructureSubNavBar from "@/components/FrontStructureSubNavBar";
import { useFrontStructureTabs } from "@/hooks/useFrontStructureTabs";
import PoiTabContent from "@/pages/search/PoiTabContent";
import DestinationsTabContent from "@/pages/search/DestinationsTabContent";
import ResultsTabContent from "@/pages/search/ResultsTabContent";
import HashtagTabContent from "@/pages/search/HashtagTabContent";
import YouTubeChannelsTabContent from "@/pages/search/YouTubeChannelsTabContent";
import ClubLoginPopup from "@/components/club/ClubLoginPopup";
import { normalizeSearchMode, normalizeText, formatDateFr, ITEMS_PER_PAGE, SERVER_PAGE_SIZE, AI_CHAT_MAX_TURNS, MAP_FETCH_PAGE_SIZE, PIN_PAGE1_SIZE, REFINEMENT_STOPWORDS, NEARBY_ENTITY_RE, NEAR_OF_ENTITY_RE, GENERIC_NEARBY_TERMS } from "@/pages/search/utils";

import type { Business, SearchResult } from "@/pages/search/types";






const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { toast } = useToast();
  const { saveSearch } = useSearchHistory();
  const isMobile = useIsMobile();
  const [isSubDesktop, setIsSubDesktop] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsSubDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    setIsSubDesktop(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [hideResultsMap, setHideResultsMap] = useState(false);
  const [hidePoiMap, setHidePoiMap] = useState(false);
  const [hideDestMap, setHideDestMap] = useState(false);
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  // Voice intent: restrict displayed results to a specific subset of business IDs
  // (e.g. only hotels available for the requested dates)
  const [availabilityRestrictedIds, setAvailabilityRestrictedIds] = useState<Set<string> | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [detectedSubcategory, setDetectedSubcategory] = useState<string | null>(null);
  const [detectedCategory, setDetectedCategory] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<string | null>(null);
  const [searchLevel, setSearchLevel] = useState<string>("");
   const [synonymUsed, setSynonymUsed] = useState(false);
   const [preciseMatch, setPreciseMatch] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string>("");
  const [citiesWithPriority, setCitiesWithPriority] = useState<{ name: string; priority: number; id?: string; latitude?: number | null; longitude?: number | null }[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryRef[]>([]);
  const [badgeSubcategories, setBadgeSubcategories] = useState<BadgeSubcategoryRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const cityFromUrl = searchParams.get("city") || "";
  const [selectedCity, setSelectedCity] = useState<string>(cityFromUrl || "all");
  const [isGeoCityAutoSelected, setIsGeoCityAutoSelected] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [inputValue, setInputValue] = useState(searchParams.get("q") || "");

  useSEO({
    title: searchQuery ? `Recherche : ${searchQuery}` : "Recherche",
    description: searchQuery ? `Résultats de recherche pour « ${searchQuery} » au Maroc. Trouvez les meilleures adresses sur ONE WORLD MOROCCO.` : "Recherchez parmi les meilleures adresses au Maroc.",
    canonical: "/search",
  });

  // Sync searchQuery & inputValue when URL params change (e.g. same query re-submitted with _t)
  const urlQ = searchParams.get("q") || "";
  const urlT = searchParams.get("_t") || "";
  const openBusinessParam = searchParams.get("openBusiness") || "";
  const openDestinationParam = searchParams.get("openDestination") || "";
  const pinIdsParam = searchParams.get("pinIds") || "";
  const badgeIdParam = searchParams.get("badgeId") || "";
  const badgeLabelParam = searchParams.get("badgeLabel") || "";
  const subcatsParam = searchParams.get("subcats") || "";
  const subcategoryNamesFromUrlRaw = subcatsParam ? subcatsParam.split("|").filter(Boolean) : [];
  const subcategoryNamesFromUrl = useMemo(() => {
    if (subcategoryNamesFromUrlRaw.length === 0) return subcategoryNamesFromUrlRaw;
    const orderMap: Record<string, number> = {};
    for (const s of subcategories as any[]) orderMap[s.name_fr] = s.sort_order ?? 999;
    return [...subcategoryNamesFromUrlRaw].sort(
      (a, b) => (orderMap[a] ?? 999) - (orderMap[b] ?? 999)
    );
  }, [subcatsParam, subcategories]);
  const labelFromUrl = searchParams.get("label") || "";
  const pinBadgeParam = searchParams.get("pinBadge") || "";
  const cityFromUrlForThumbs = searchParams.get("city") || "";
  const [pinThumbMap, setPinThumbMap] = useState<Record<string, { thumb: string; videoUrl: string | null }>>({});

  const resolvePinContextBadgeId = useCallback(async () => {
    const directBadgeId = pinBadgeParam || badgeIdParam;
    if (directBadgeId) return directBadgeId;

    const label = (labelFromUrl || badgeLabelParam || "").replace(/^#+/, "").trim();
    if (!label) return "";

    const { data } = await supabase.from("badges").select("id, name_fr");
    const target = normalizeText(label);
    const stripS = (s: string) => s.replace(/s$/, "");
    const targetSingular = stripS(target);
    return ((data as any[]) || []).find((badge: any) => {
      const n = normalizeText(badge.name_fr || "");
      return n === target || n === targetSingular || stripS(n) === target || stripS(n) === targetSingular;
    })?.id || "";
  }, [pinBadgeParam, badgeIdParam, labelFromUrl, badgeLabelParam]);

  useEffect(() => {
    const ids = pinIdsParam.split(",").map(s => s.trim()).filter(Boolean);
    if (!cityFromUrlForThumbs || ids.length === 0) {
      setPinThumbMap({});
      return;
    }
    let cancelled = false;
    (async () => {
      const badgeId = await resolvePinContextBadgeId();
      if (!badgeId) { if (!cancelled) setPinThumbMap({}); return; }
      // Only apply thumbnail override when a manual homepage extra card exists for (city, badge).
      const { data: extraCard } = await supabase
        .from("front_structure_homepage_extra_cards")
        .select("id")
        .ilike("city", cityFromUrlForThumbs)
        .eq("badge_id", badgeId)
        .limit(1)
        .maybeSingle();
      if (!extraCard) { if (!cancelled) setPinThumbMap({}); return; }
      const { data: cityRow } = await supabase
        .from("cities")
        .select("id")
        .or(`name_fr.ilike.${cityFromUrlForThumbs},name_en.ilike.${cityFromUrlForThumbs},name_ar.ilike.${cityFromUrlForThumbs}`)
        .limit(1)
        .maybeSingle();
      const cityId = (cityRow as any)?.id;
      if (!cityId) { if (!cancelled) setPinThumbMap({}); return; }
      const { data: badgeDocs } = await supabase
        .from("business_document_badges")
        .select("document_id")
        .eq("badge_id", badgeId);
      const docIds = (badgeDocs || []).map((r: any) => r.document_id);
      if (!docIds.length) { if (!cancelled) setPinThumbMap({}); return; }
      const { data: cityDocs } = await supabase
        .from("business_document_cities")
        .select("document_id")
        .eq("city_id", cityId)
        .in("document_id", docIds);
      const cityDocIds = (cityDocs || []).map((r: any) => r.document_id);
      if (!cityDocIds.length) { if (!cancelled) setPinThumbMap({}); return; }
      const { data: docs } = await supabase
        .from("business_documents")
        .select("business_id, thumbnail_url, url, sort_order")
        .in("id", cityDocIds)
        .in("business_id", ids)
        .eq("business_is_active", true);
      const sorted = [...((docs || []) as any[])].sort((a, b) => {
        const sa = a.sort_order ?? Number.MAX_SAFE_INTEGER;
        const sb = b.sort_order ?? Number.MAX_SAFE_INTEGER;
        return sa - sb;
      });
      const map: Record<string, { thumb: string; videoUrl: string | null }> = {};
      for (const d of sorted) {
        if (d.business_id && !map[d.business_id]) {
          map[d.business_id] = { thumb: d.thumbnail_url ?? "", videoUrl: d.url ?? null };
        }
      }
      if (!cancelled) setPinThumbMap(map);

    })();
    return () => { cancelled = true; };
  }, [pinIdsParam, resolvePinContextBadgeId, cityFromUrlForThumbs]);
  const [hashtagCount, setHashtagCount] = useState<number | undefined>(undefined);
  useEffect(() => { setHashtagCount(undefined); }, [badgeIdParam, searchParams.get("city")]);

  // Real DB counts for URL-driven subcategory chips, scoped to the city.
  const [subcatUrlCounts, setSubcatUrlCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (subcategoryNamesFromUrl.length === 0) {
      setSubcatUrlCounts({});
      return;
    }
    let cancelled = false;
    (async () => {
      const counts: Record<string, number> = {};
      await Promise.all(subcategoryNamesFromUrl.map(async (name) => {
        let q = supabase
          .from("businesses")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .contains("categories", [name]);
        if (cityFromUrlForThumbs) q = q.ilike("city", cityFromUrlForThumbs);
        const { count } = await q;
        counts[name] = count || 0;
      }));
      if (!cancelled) setSubcatUrlCounts(counts);
    })();
    return () => { cancelled = true; };
  }, [subcatsParam, cityFromUrlForThumbs]);
  useEffect(() => {
    if (urlQ !== searchQuery || urlT) {
      setSearchQuery(urlQ);
      setInputValue(urlQ);
      // Drop the availability restriction unless the URL still describes a hotel voice search
      const spoken = searchParams.get("spoken") || "";
      if (!/^h[oô]tel à /i.test(spoken)) {
        setAvailabilityRestrictedIds(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQ, urlT]);

  // Text-search hotel intent: when typed query looks like a hotel search sentence,
  // run the same intent extraction used by voice and trigger the hotel availability flow.
  const lastTextHotelKeyRef = useRef<string>("");
  const textHotelIntentSeqRef = useRef(0);
  useEffect(() => {
    if (!urlQ) return;
    const spokenParam = searchParams.get("spoken") || "";
    // Use the richer of spoken text or query text to detect hotel intent.
    // (When triggered from a recent search, q="City" while spoken keeps the full sentence.)
    const transcriptCandidate = (spokenParam.trim() || urlQ).trim();
    const looksLikeHotelSearch = /h[oô]tel/i.test(transcriptCandidate) && /\s/.test(transcriptCandidate);
    if (!looksLikeHotelSearch) return;
    const key = `${transcriptCandidate}::${urlT}`;
    if (lastTextHotelKeyRef.current === key) return;
    lastTextHotelKeyRef.current = key;
    const seq = ++textHotelIntentSeqRef.current;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("voice-search-intent", {
          body: { transcript: transcriptCandidate },
        });
        if (error || !data) return;
        // Drop stale intent results if the user has triggered a newer search since
        if (seq !== textHotelIntentSeqRef.current) return;
        if (data.intent === "hotelSearch" && data.hotelSearch) {
          handleHotelSearch(data.hotelSearch, transcriptCandidate);
        } else if (data.intent === "hotelAvailability" && data.hotelAvailability) {
          handleHotelAvailability(data.hotelAvailability, transcriptCandidate);
        }
      } catch (e) {
        console.warn("Text hotel intent extraction failed:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQ, urlT]);



  // Handle openBusiness URL param (from FloatingSearchBar recently viewed)
  const lastOpenedBusinessParamRef = useRef<string | null>(null);
  useEffect(() => {
    if (openBusinessParam && lastOpenedBusinessParamRef.current !== openBusinessParam) {
      lastOpenedBusinessParamRef.current = openBusinessParam;
      openCompactPanel({ id: openBusinessParam, name: "" } as any);
    }
  }, [openBusinessParam]);


  const [fsFilterSubcategories, setFsFilterSubcategories] = useState<Set<string> | null>(null);
  const [fsFilterServices, setFsFilterServices] = useState<Set<string> | null>(null);
  const [mobileFsTabId, setMobileFsTabId] = useState<string | null>(null);
  const [mobileFsSubId, setMobileFsSubId] = useState<string | null>(null);
  const [mobileFsServices, setMobileFsServices] = useState<string[]>([]);
  const [showAllSearchMarkers, setShowAllSearchMarkers] = useState(false);
  const autoMobileFsLabelKeyRef = useRef<string | null>(null);

  // Reset front structure filter when search query changes
  useEffect(() => {
    setFsFilterSubcategories(null);
    setFsFilterServices(null);
    setMobileFsTabId(null);
    setMobileFsSubId(null);
    setMobileFsServices([]);
    setShowAllSearchMarkers(false);
  }, [searchQuery]);

  // When switching FS tabs: default to "Tous" if a subcategory filter is active, else "Top 20"
  useEffect(() => {
    setShowAllSearchMarkers(!!fsFilterSubcategories && fsFilterSubcategories.size > 0);
  }, [fsFilterSubcategories]);

  // Helper: a business matches the service filter when at least one of its
  // services intersects the active service filter set (OR semantics).
  const businessMatchesFsServices = (b: any): boolean => {
    if (!fsFilterServices || fsFilterServices.size === 0) return true;
    const list: string[] = Array.isArray(b.services) ? b.services : [];
    return list.some((s) => fsFilterServices.has(s));
  };

  const categoryFromUrl = searchParams.get("category") || "";
  
  const [ttsIntroPhrase, setTtsIntroPhrase] = useState<string>("");
  const [aiAnswerText, setAiAnswerText] = useState<string>("");
  // Previous AI text kept visible while a new one regenerates (subcategory/city change)
  const [prevAiAnswerText, setPrevAiAnswerText] = useState<string>("");
  const regenerateAiAnswer = useCallback(() => {
    setPrevAiAnswerText((prev) => (aiAnswerText ? aiAnswerText : prev));
    setAiAnswerText("");
  }, [aiAnswerText]);
  const [poiAiText, setPoiAiText] = useState<string>("");
  const [destAiText, setDestAiText] = useState<string>("");
  const [isPoiAiLoading, setIsPoiAiLoading] = useState(false);
  const [isDestAiLoading, setIsDestAiLoading] = useState(false);
  // Multi-turn refinement chat — extends the initial aiAnswerText with follow-up Q/A.

  const aiRefinementSpokenText = searchParams.get("spoken") || "";
  type AiClarifyOption = { id: string; label: string; text: string };
  type AiClarify = { type: string; question: string; options: AiClarifyOption[] };
  type AiChatMessage = { role: "user" | "assistant"; content: string; clarify?: AiClarify };
  const [aiChat, setAiChat] = useState<AiChatMessage[]>([]);
  const [aiChatInput, setAiChatInput] = useState("");
  const submitAiRefinementRef = useRef<((t?: string) => void) | null>(null);
  const aiRefinementRef = useRef<HTMLDivElement | null>(null);
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const [aiChatError, setAiChatError] = useState<string | null>(null);
  const [aiRefinementBusinessPool, setAiRefinementBusinessPool] = useState<Business[]>([]);
  const [restoredAiBusinessPool, setRestoredAiBusinessPool] = useState<Business[]>([]);
  const lastAiProximityRef = useRef<{ lat: number; lng: number; radiusKm: number; targetName: string; query: string } | null>(null);
  // Lazy cache for AI-refinement blob enrichment: services keywords, subcategory keywords,
  // and per-business badge names (M2M via business_badges). Loaded once on first refinement.
  const refinementEnrichmentRef = useRef<{
    servicesKw: Map<string, string[]>;
    subcatsKw: Map<string, string[]>;
    bizBadges: Map<string, string[]>;
  } | null>(null);
  const refinementEnrichmentLoadingRef = useRef<Promise<void> | null>(null);
  const ensureRefinementEnrichment = useCallback(async () => {
    if (refinementEnrichmentRef.current) return;
    if (refinementEnrichmentLoadingRef.current) {
      await refinementEnrichmentLoadingRef.current;
      return;
    }
    refinementEnrichmentLoadingRef.current = (async () => {
      try {
        const [svcRes, subRes, bbRes] = await Promise.all([
          supabase.from("services").select("name_fr, name_en, name_ar, keywords"),
          supabase.from("subcategories").select("name_fr, name_en, name_ar, keywords"),
          supabase.from("business_badges").select("business_id, badges:badge_id(name_fr, name_en, name_ar)"),
        ]);
        const servicesKw = new globalThis.Map<string, string[]>();
        for (const s of (svcRes.data || []) as any[]) {
          const kws: string[] = Array.isArray(s.keywords) ? s.keywords.filter(Boolean) : [];
          if (kws.length === 0) continue;
          for (const n of [s.name_fr, s.name_en, s.name_ar]) {
            if (n) servicesKw.set(String(n), kws);
          }
        }
        const subcatsKw = new globalThis.Map<string, string[]>();
        for (const s of (subRes.data || []) as any[]) {
          const kws: string[] = Array.isArray(s.keywords) ? s.keywords.filter(Boolean) : [];
          if (kws.length === 0) continue;
          for (const n of [s.name_fr, s.name_en, s.name_ar]) {
            if (n) subcatsKw.set(String(n), kws);
          }
        }
        const bizBadges = new globalThis.Map<string, string[]>();
        for (const row of (bbRes.data || []) as any[]) {
          const bId = row.business_id as string | undefined;
          const b = row.badges;
          if (!bId || !b) continue;
          const names = [b.name_fr, b.name_en, b.name_ar].filter(Boolean) as string[];
          if (names.length === 0) continue;
          const arr = bizBadges.get(bId) || [];
          arr.push(...names);
          bizBadges.set(bId, arr);
        }
        refinementEnrichmentRef.current = { servicesKw, subcatsKw, bizBadges };
      } catch (e) {
        console.warn("Failed to load AI refinement enrichment cache:", e);
        refinementEnrichmentRef.current = {
          servicesKw: new globalThis.Map(),
          subcatsKw: new globalThis.Map(),
          bizBadges: new globalThis.Map(),
        };
      } finally {
        refinementEnrichmentLoadingRef.current = null;
      }
    })();
    await refinementEnrichmentLoadingRef.current;
  }, []);
  const [stickyAiAnimationNonce, setStickyAiAnimationNonce] = useState(0);
  const [stickyAiVisibleWordIndex, setStickyAiVisibleWordIndex] = useState(-1);
  const handleAiAnswerReady = useCallback((answer: string) => {
    setAiAnswerText(answer);
    setPrevAiAnswerText("");
    // Persist for reuse in slide-panel AI overlay
    try {
      sessionStorage.setItem("ai_suggestion_text", answer);
      // Also store businesses for parseInline rendering
      // Keep the full result pool so chat refinements can search across all results,
      // not only the 10 used for the initial AI suggestion.
      const bizData = (allBusinesses || []).slice(0, 100).map((b) => ({
        id: b.id, name: b.name, city: b.city, main_category: b.main_category,
        categories: b.categories, services: b.services, keywords: (b as any).keywords,
        hook_fr: b.hook_fr, rating: b.rating,
        wtuce_status: b.wtuce_status, images: b.images, logo_url: b.logo_url,
        neighborhood: b.neighborhood, google_rating: b.google_rating,
        google_review_count: b.google_review_count, tripadvisor_rating: b.tripadvisor_rating,
        tripadvisor_review_count: b.tripadvisor_review_count,
      }));
      sessionStorage.setItem("ai_suggestion_businesses", JSON.stringify(bizData));
      sessionStorage.setItem("ai_suggestion_query", searchQuery || "");
      sessionStorage.setItem("ai_suggestion_count", String(totalCount ?? (allBusinesses || []).length));
    } catch { /* sessionStorage unavailable (private mode/quota) */ }
    setStickyAiAnimationNonce((prev) => prev + 1);
    // NOTE: TTS preloading removed — it consumed ElevenLabs credits on every search
    // even when the user never clicked the speaker. Audio is now generated on demand.
  }, [language, searchQuery, allBusinesses, totalCount]);

  // Reset refinement chat whenever the seed AI text changes (= new search/regeneration)
  useEffect(() => {
    setAiChat([]);
    setAiChatInput("");
    setAiChatError(null);
    setAiRefinementBusinessPool([]);
    lastAiProximityRef.current = null;
  }, [aiAnswerText]);

  const aiInlineBusinessPool = useMemo(() => {
    const byId = new globalThis.Map<string, Business>();
    for (const b of restoredAiBusinessPool) byId.set(b.id, b);
    for (const b of allBusinesses || []) byId.set(b.id, b);
    for (const b of aiRefinementBusinessPool) byId.set(b.id, b);
    return Array.from(byId.values()) as unknown as AIBusinessData[];
  }, [allBusinesses, aiRefinementBusinessPool, restoredAiBusinessPool]);

  // Submit a refinement turn — calls ai-search-answer with history of past turns
  const submitAiRefinement = useCallback(async (explicitText?: string) => {
    const q = (explicitText ?? aiChatInput).trim();
    if (!q || aiChatLoading) return;
    const userTurns = aiChat.filter((m) => m.role === "user").length;
    if (userTurns >= AI_CHAT_MAX_TURNS) return;
    setAiChatError(null);
    setAiChatLoading(true);
    const nextHistory = [
      { role: "assistant" as const, content: aiAnswerText },
      ...aiChat,
    ];
    setAiChat((prev) => [...prev, { role: "user", content: q }]);
    if (explicitText === undefined) setAiChatInput("");
    try {
      let refinementPool: Business[] = allBusinesses || [];
      let dedicatedRefinementSearchSucceeded = false;
        const distanceRe = /(?:à\s+)?moins\s+de\s+(\d+(?:[.,]\d+)?)\s*(kilom[èe]tres?|m[èe]tres?|km|m)\b/i;
        const altDistanceRe = /\b(?:dans\s+un\s+rayon\s+de|rayon\s+de|within)\s+(\d+(?:[.,]\d+)?)\s*(kilom[èe]tres?|m[èe]tres?|km|m)\b/i;
        const distMatch = q.match(distanceRe) || q.match(altDistanceRe);
        let overrideRadiusKm: number | undefined;
        let queryWithoutDistance = q;
        if (distMatch) {
          const value = parseFloat(distMatch[1].replace(",", "."));
          const unit = distMatch[2].toLowerCase();
          overrideRadiusKm = /^k/i.test(unit) ? value : value / 1000;
          queryWithoutDistance = q.replace(distMatch[0], "").trim();
        }
      const proximityRe = /\s*(?:à\s+côté\s+de|a\s+cote\s+de|à\s+coté\s+de|près\s+de|pres\s+de|proche\s+de|autour\s+de|aux\s+alentours\s+de|à\s+proximité\s+de|a\s+proximite\s+de|near|around|close\s+to|next\s+to)\s+(.+?)\s*$/i;
      const proxMatch = queryWithoutDistance.match(proximityRe);
      let refinedQuery = queryWithoutDistance || lastAiProximityRef.current?.query || q;
      let proxLat: number | undefined;
      let proxLng: number | undefined;
      let proxRadiusKm: number | undefined;
      if (proxMatch) {
        const targetName = proxMatch[1].trim().replace(/[?.!,;:]+$/, "");
        refinedQuery = queryWithoutDistance.replace(proximityRe, "").trim() || lastAiProximityRef.current?.query || queryWithoutDistance || q;
        const targetVariants = [...new Set([
          targetName,
          targetName.replace(/^(riad|hôtel|hotel|appartement|villa|maison\s+d['’ ]?hôtes?)\s+/i, "").trim(),
        ].filter(Boolean))];
        let targets: any[] = [];
        for (const variant of targetVariants) {
          const { data } = await supabase
            .from("businesses")
            .select("id, name, latitude, longitude, city")
            .ilike("name", `%${variant}%`)
            .not("latitude", "is", null)
            .not("longitude", "is", null)
            .limit(5);
          if (data?.length) { targets = data as any[]; break; }
        }
        const target = (targets || []).find((t: any) => !cityFromUrl || (t.city && t.city.toLowerCase() === cityFromUrl.toLowerCase())) || (targets || [])[0];
        if (target?.latitude && target?.longitude) {
          proxLat = Number(target.latitude);
          proxLng = Number(target.longitude);
          proxRadiusKm = overrideRadiusKm ?? 2;
          lastAiProximityRef.current = { lat: proxLat, lng: proxLng, radiusKm: proxRadiusKm, targetName: target.name, query: refinedQuery };
        }
      } else if (lastAiProximityRef.current) {
        proxLat = lastAiProximityRef.current.lat;
        proxLng = lastAiProximityRef.current.lng;
        proxRadiusKm = overrideRadiusKm ?? lastAiProximityRef.current.radiusKm;
        // Pure distance refinement (e.g. "moins de 500 m de Riad X") → reuse the previous query intent (e.g. "artisans").
        // Otherwise, if the user typed a brand-new query without a proximity keyword, use it but keep the previous target.
        refinedQuery = distMatch
          ? lastAiProximityRef.current.query
          : (queryWithoutDistance || lastAiProximityRef.current.query);
        lastAiProximityRef.current = { ...lastAiProximityRef.current, radiusKm: proxRadiusKm, query: refinedQuery };
      }
      refinedQuery = refinedQuery
        .replace(/\?+\s*$/g, "")
        .replace(/^\s*(quels?|quelles?|qui|que|quoi|où|ou|comment|combien|liste(?:-moi|moi)?|donne(?:-moi|moi)?|montre(?:-moi|moi)?|trouve(?:-moi|moi)?|cherche(?:-moi|moi)?|peux-tu|peut-on|y\s+a-t-il)\b[\s,]*/i, "")
        .replace(/\b(sont|est|sont-ils|sont-elles|il\s+y\s+a|stp|svp)\b/gi, " ")
        .replace(/\s{2,}/g, " ")
        .trim() || q;

      // Approach 3: a refinement turn always narrows the INITIAL pool (allBusinesses)
      // via the AND filter below. We do NOT relaunch business-search for refinements,
      // because the new turn alone (e.g. "avec des jeux pour les enfants") would lose
      // the original intent ("hôtel à Marrakech") and return unrelated results.
      // Exception: a proximity turn ("près de Riad X", "moins de 500m de…") IS a new
      // geographic search and must hit the backend with lat/lng.
      if (proxLat !== undefined && proxLng !== undefined) {
        try {
          const { data: refinedData, error: refinedError } = await supabase.functions.invoke<SearchResult>("business-search", {
            body: {
              query: refinedQuery,
              language,
              pageSize: 100,
              offset: 0,
              compact: "card",
              ...(cityFromUrl ? { city: cityFromUrl } : {}),
              latitude: proxLat,
              longitude: proxLng,
              radiusKm: proxRadiusKm ?? 2,
            }
          });
          if (!refinedError && refinedData?.businesses?.length) {
            refinementPool = refinedData.businesses;
            setAiRefinementBusinessPool(refinedData.businesses);
            dedicatedRefinementSearchSucceeded = true;
          }
        } catch (refinedSearchError) {
          console.warn("AI proximity refinement search failed:", refinedSearchError);
        }
      }
      const useSubcatBypass = subcategoryNamesFromUrl.length > 0 && !!cityFromUrl;
      const poolMissingRefinementFields = refinementPool.some((b: any) => !Array.isArray(b.services) || !Array.isArray(b.categories));
      if (!dedicatedRefinementSearchSucceeded && !pinIdsParam && totalCount && (totalCount > refinementPool.length || poolMissingRefinementFields)) {
        try {
          const { data: fullData, error: fullError } = await supabase.functions.invoke<SearchResult>("business-search", {
            body: {
              query: useSubcatBypass ? undefined : (searchQuery.trim() || categoryFromUrl || undefined),
              spoken: useSubcatBypass ? undefined : (aiRefinementSpokenText || undefined),
              language,
              pageSize: Math.min(totalCount, 250),
              offset: 0,
              compact: "card",
              ...(useSubcatBypass ? { subcategoryNames: subcategoryNamesFromUrl, city: cityFromUrl } : (cityFromUrl ? { city: cityFromUrl } : {})),
            }
          });
          if (!fullError && fullData?.businesses?.length) {
            refinementPool = fullData.businesses;
            setAiRefinementBusinessPool(fullData.businesses);
          }
        } catch (poolError) {
          console.warn("AI refinement full pool fetch failed:", poolError);
        }
      }

      // Accumulate criteria with AND semantics: each refinement turn (previous + current)
      // must match the business. A business is kept only if every turn has at least one
      // matching token in its blob.
      const tokenize = (text: string) => Array.from(new Set(
        normalizeText(text).split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !REFINEMENT_STOPWORDS.has(t))
      ));
      const previousUserQs = aiChat.filter((m) => m.role === "user").map((m) => m.content);
      const turnsTokens = [...previousUserQs, q].map(tokenize).filter((arr) => arr.length > 0);
      const allTokens = Array.from(new Set(turnsTokens.flat()));
      const dedupedPool = Array.from(new globalThis.Map<string, Business>(refinementPool.map((b) => [b.id, b])).values());
      // Load synonym/keyword enrichment maps once (services keywords, subcategories keywords,
      // and per-business badge names) so the AND filter can match semantic variants
      // (e.g. "centre équestre" → service "Haras" via its keywords).
      await ensureRefinementEnrichment();
      const enrichment = refinementEnrichmentRef.current;
      const buildBlob = (b: Business) => {
        const extraServiceKws: string[] = [];
        const extraSubcatKws: string[] = [];
        const badgeNames: string[] = [];
        if (enrichment) {
          for (const s of b.services || []) {
            const kws = enrichment.servicesKw.get(String(s));
            if (kws) extraServiceKws.push(...kws);
          }
          for (const c of b.categories || []) {
            const kws = enrichment.subcatsKw.get(String(c));
            if (kws) extraSubcatKws.push(...kws);
          }
          const bb = enrichment.bizBadges.get(b.id);
          if (bb) badgeNames.push(...bb);
        }
        return normalizeText([
          b.name, b.main_category, b.hook_fr, b.hook_en, b.hook_ar,
          b.city, (b as any).neighborhood, (b as any).address,
          ...(b.categories || []), ...(b.services || []), ...(b.engagements || []),
          ...(((b as any).keywords as string[] | null) || []),
          ...((b as any).badges || []), ...((b as any).video_badges || []),
          ...badgeNames,
          ...extraServiceKws, ...extraSubcatKws,
          (b as any).extra_text || "",
        ].filter(Boolean).map((v) => String(v)).join(" | "));
      };
      const matchesAllTurns = (blob: string) =>
        turnsTokens.every((turnToks) => turnToks.some((t) => blob.includes(t)));
      const scoreBusiness = (blob: string): number => {
        let score = 0;
        for (const t of allTokens) if (blob.includes(t)) score += 1;
        return score;
      };
      const scored = dedupedPool.map((b) => {
        const blob = buildBlob(b);
        return { b, blob, s: scoreBusiness(blob), ok: matchesAllTurns(blob) };
      });
      // (debug removed)
      const strictlyMatching = scored.filter((x) => x.ok).sort((a, z) => z.s - a.s).map((x) => x.b);
      const fallbackRanked = scored.sort((a, z) => z.s - a.s).map((x) => x.b);
      const orderedPool = strictlyMatching.length > 0 ? strictlyMatching : fallbackRanked;

      // Time-aware filtering: if the refinement query contains a temporal keyword
      // (e.g. "ce soir", "demain midi"), only keep businesses open during that slot.
      const timeMatch = extractTimeSlot(q);
      const filteredPool = timeMatch
        ? orderedPool.filter((b) => {
            const vac = ((b as any).vacation_dates as Array<{ start_date: string; end_date: string }> | null | undefined) || null;
            return isOpenDuringSlot(
              (b as any).opening_hours || null,
              !!(b as any).is_open_24h,
              timeMatch.timeSlot,
              vac,
            );
          })
        : orderedPool;
      const poolForAi = filteredPool.length > 0 ? filteredPool : orderedPool;

      // --- "Nouvelle entité à proximité" : ex. "avec un golf à côté", "et un spa proche", "près d'un cinéma".
      // On lance une recherche dédiée pour l'entité, restreinte au voisinage des résultats précédemment cités,
      // puis on l'ajoute au pool de l'IA + au pool d'affichage (carousel/carte).
      let nearbyEntityResults: Business[] = [];
      let nearbyEntityTerm = "";
      let nearbyAnchorNames: string[] = [];
      const isNearbyEligibleTurn = aiChat.some((m) => m.role === "user");
      if (isNearbyEligibleTurn && proxLat === undefined) {
        const nm = q.match(NEARBY_ENTITY_RE) || q.match(NEAR_OF_ENTITY_RE);
        if (nm) {
          const entityTerm = nm[1].toLowerCase();
          if (!GENERIC_NEARBY_TERMS.has(entityTerm) && entityTerm.length >= 3) {
            nearbyEntityTerm = entityTerm;
            const lastAssistant = [...aiChat].reverse().find((m) => m.role === "assistant")?.content || "";
            const citedFromText = lastAssistant
              ? extractCitedBusinesses(lastAssistant, aiInlineBusinessPool)
              : [];
            const anchorPool: Business[] = (citedFromText.length > 0
              ? (citedFromText as unknown as Business[])
              : (poolForAi.slice(0, 5)));
            const anchors = anchorPool.filter(
              (b) => typeof b.latitude === "number" && typeof b.longitude === "number"
            );
            if (anchors.length > 0) {
              nearbyAnchorNames = anchors.map((a) => a.name);
              const cLat = anchors.reduce((s, b) => s + (b.latitude as number), 0) / anchors.length;
              const cLng = anchors.reduce((s, b) => s + (b.longitude as number), 0) / anchors.length;
              const spread = anchors.reduce(
                (m, b) => Math.max(m, haversineKm(cLat, cLng, b.latitude as number, b.longitude as number)),
                0,
              );
              const searchRadius = Math.min(20, Math.max(5, spread + 5));
              try {
                const { data: nearbyData } = await supabase.functions.invoke<SearchResult>("business-search", {
                  body: {
                    query: entityTerm,
                    language,
                    pageSize: 30,
                    offset: 0,
                    compact: "card",
                    latitude: cLat,
                    longitude: cLng,
                    radiusKm: searchRadius,
                  },
                });
                const found = (nearbyData?.businesses || []) as Business[];
                const proxKm = 5;
                nearbyEntityResults = found
                  .filter((b) =>
                    typeof b.latitude === "number" && typeof b.longitude === "number" &&
                    anchors.some((a) =>
                      haversineKm(a.latitude as number, a.longitude as number, b.latitude as number, b.longitude as number) <= proxKm,
                    )
                  )
                  .slice(0, 8);
              } catch (e) {
                console.warn("AI nearby-entity search failed:", e);
              }
            }
          }
        }
      }

      // Sync the map pool with the cumulative AND-filtered results so markers
      // reflect the same constraints as the AI answer (not just the last turn).
      // When a "nearby new entity" was detected, prepend its results so they appear in the carousel/map.
      const mergedPool: Business[] = (() => {
        if (nearbyEntityResults.length === 0) return poolForAi;
        const dedup = new globalThis.Map<string, Business>();
        for (const b of nearbyEntityResults) dedup.set(b.id, b);
        for (const b of poolForAi) if (!dedup.has(b.id)) dedup.set(b.id, b);
        return Array.from(dedup.values());
      })();
      setAiRefinementBusinessPool(mergedPool);

      const toAiPayload = (b: Business) => ({
        id: b.id, name: b.name, city: b.city,
        neighborhood: (b as any).neighborhood, address: (b as any).address,
        main_category: b.main_category,
        categories: b.categories, services: b.services, engagements: b.engagements,
        hook_fr: b.hook_fr, hook_en: b.hook_en, wtuce_status: b.wtuce_status,
      });
      const baseBusinesses = poolForAi.slice(0, 200).map(toAiPayload);
      const baseIds = new Set(baseBusinesses.map((b) => b.id));
      const nearbyBusinessesPayload = nearbyEntityResults
        .filter((b) => !baseIds.has(b.id))
        .map(toAiPayload);
      const businesses = [...baseBusinesses, ...nearbyBusinessesPayload];

      const { data, error } = await supabase.functions.invoke("ai-search-answer", {
        body: {
          query: q,
          businesses,
          language,
          history: nextHistory,
          nearbyContext: nearbyEntityResults.length > 0 ? {
            entity: nearbyEntityTerm,
            anchorNames: nearbyAnchorNames.slice(0, 8),
            items: nearbyEntityResults.map((b) => ({ name: b.name, city: b.city })),
          } : undefined,
        },
      });
      if (error) throw error;
      const answer = (data as any)?.answer || "";
      const clarify = (data as any)?.clarify as AiClarify | undefined;
      if (clarify && Array.isArray(clarify.options) && clarify.options.length > 0) {
        setAiChat((prev) => [...prev, { role: "assistant", content: clarify.question || "", clarify }]);
      } else if (!answer) {
        setAiChatError(language === "en" ? "No answer received." : "Aucune réponse reçue.");
      } else {
        setAiChat((prev) => [...prev, { role: "assistant", content: answer }]);
        // Scroll the latest user "terracotta" bubble to the top of the viewport
        setTimeout(() => {
          const bubbles = document.querySelectorAll<HTMLElement>("[data-ai-user-bubble]");
          const last = bubbles[bubbles.length - 1];
          if (last) {
            const top = last.getBoundingClientRect().top + window.scrollY - 16;
            window.scrollTo({ top, behavior: "smooth" });
          }
        }, 50);
      }
    } catch (e: any) {
      console.error("AI refinement error:", e);
      setAiChatError(language === "en" ? "Refinement failed. Try again." : "Échec de l'affinement. Réessayez.");
    } finally {
      setAiChatLoading(false);
    }
  }, [aiChatInput, aiChatLoading, aiChat, aiAnswerText, allBusinesses, language, subcategoryNamesFromUrl, cityFromUrl, pinIdsParam, totalCount, searchQuery, categoryFromUrl, aiRefinementSpokenText, aiInlineBusinessPool]);

  // Demo mode: when ?demo=<followup> is present, wait for the initial AI answer,
  // then auto-submit the follow-up question once as a refinement turn.
  const demoTriggeredRef = useRef(false);
  useEffect(() => {
    const demoFollowup = searchParams.get("demo");
    if (!demoFollowup) return;
    if (demoTriggeredRef.current) return;
    if (!aiAnswerText) return;
    if (aiChatLoading) return;
    if (aiChat.length > 0) return;
    demoTriggeredRef.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete("demo");
    setSearchParams(next, { replace: true });
    setTimeout(() => { submitAiRefinement(demoFollowup); }, 1200);
  }, [searchParams, aiAnswerText, aiChatLoading, aiChat.length, submitAiRefinement, setSearchParams]);

  useEffect(() => { submitAiRefinementRef.current = submitAiRefinement; }, [submitAiRefinement]);






  // When server-side pagination hides part of the results, fetch the full pool once
  // and rewrite sessionStorage so the AI overlay can refine across ALL results (up to 100),
  // not only the visible page (~24).
  useEffect(() => {
    if (!aiAnswerText) return;
    if (!totalCount || totalCount <= (allBusinesses?.length || 0)) return;
    if (totalCount <= 0) return;
    let cancelled = false;
    const spokenForAi = searchParams.get("spoken") || "";
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke<SearchResult>("business-search", {
          body: {
            query: searchQuery.trim() || categoryFromUrl || undefined,
            spoken: spokenForAi || undefined,
            language,
            pageSize: Math.min(totalCount, 100),
            offset: 0,
            compact: "card",
          },
        });
        if (cancelled || error || !data?.businesses) return;
        const bizData = (data.businesses as any[]).slice(0, 100).map((b: any) => ({
          id: b.id, name: b.name, city: b.city, main_category: b.main_category,
          categories: b.categories, services: b.services, keywords: (b as any).keywords,
          hook_fr: b.hook_fr, rating: b.rating,
          wtuce_status: b.wtuce_status, images: b.images, logo_url: b.logo_url,
          neighborhood: b.neighborhood, google_rating: b.google_rating,
          google_review_count: b.google_review_count, tripadvisor_rating: b.tripadvisor_rating,
          tripadvisor_review_count: b.tripadvisor_review_count,
        }));
        try {
          sessionStorage.setItem("ai_suggestion_businesses", JSON.stringify(bizData));
          sessionStorage.setItem("ai_suggestion_count", String(totalCount));
        } catch {}
      } catch (err) {
        console.error("[AI overlay] fetch full pool error:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [aiAnswerText, totalCount, allBusinesses?.length, searchQuery, searchParams, language, categoryFromUrl]);
   const [activeTab, setActiveTab] = useState<"suggestions" | "map" | "poi" | "destinations" | "hashtag" | "ai" | "youtube">(
     searchParams.get("tab") === "ai" ? "ai" : (searchParams.get("tab") === "youtube" ? "youtube" : (searchParams.get("openDestination") ? "destinations" : (searchParams.get("badgeId") ? "hashtag" : "suggestions")))
   );
   useEffect(() => {
     if (searchParams.get("tab") === "ai" && activeTab !== "ai") {
       setActiveTab("ai");
     }
     if (searchParams.get("tab") === "youtube" && activeTab !== "youtube") {
       setActiveTab("youtube");
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Tab bar: centering + native non-passive wheel handler for horizontal scroll
    const tabBarRef = useRef<HTMLDivElement | null>(null);

    const centerActiveTab = useCallback(() => {
      const el = tabBarRef.current;
      if (!el) return;
      const active = el.querySelector<HTMLElement>('[data-active-tab="true"]');
      if (!active) return;
      active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }, []);

    useEffect(() => {
      const r = requestAnimationFrame(() => requestAnimationFrame(centerActiveTab));
      const t = setTimeout(centerActiveTab, 250);
      return () => { cancelAnimationFrame(r); clearTimeout(t); };
    }, [activeTab, centerActiveTab]);

    useEffect(() => {
      const el = tabBarRef.current;
      if (!el) return;
      const onWheel = (e: WheelEvent) => {
        const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (delta === 0) return;
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll <= 0) return;
        // Only intercept if we can scroll in that direction
        if ((delta > 0 && el.scrollLeft < maxScroll) || (delta < 0 && el.scrollLeft > 0)) {
          e.preventDefault();
          el.scrollLeft += delta;
        }
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    }, []);

   // When landing on /search?tab=ai without a query, restore the last AI suggestion from session
   useEffect(() => {
     if (searchParams.get("tab") !== "ai") return;
     const hasContext = !!(searchParams.get("q") || searchParams.get("category") || searchParams.get("city") || searchParams.get("subcats") || searchParams.get("badgeId"));
     if (hasContext) return;
     if (aiAnswerText) return;
     try {
       const cached = sessionStorage.getItem("ai_suggestion_text");
       if (cached) setAiAnswerText(cached);
       const cachedBiz = sessionStorage.getItem("ai_suggestion_businesses");
       if (cachedBiz) {
         try {
           const parsed = JSON.parse(cachedBiz);
           if (Array.isArray(parsed)) setRestoredAiBusinessPool(parsed as unknown as Business[]);
         } catch { /* ignore */ }
       }
     } catch { /* ignore */ }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [searchParams]);
    useEffect(() => {
      if (openDestinationParam && activeTab !== "destinations") {
        setActiveTab("destinations");
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openDestinationParam]);
    useEffect(() => {
      if (badgeIdParam && activeTab !== "hashtag") {
        setActiveTab("hashtag");
        setCompactPanelBusiness(null);
        setCompactPanelInitialVideoUrl(null);
      }
      if (!badgeIdParam && activeTab === "hashtag") setActiveTab("suggestions");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [badgeIdParam]);
   const [detectedCity, setDetectedCity] = useState<string | null>(null);
   const [detectedNeighborhood, setDetectedNeighborhood] = useState<string | null>(null);
   const [disambiguationType, setDisambiguationType] = useState<"needs_category" | "needs_city" | null>(null);
   const [neighborhoodCoords, setNeighborhoodCoords] = useState<{ lat: number; lng: number } | null>(null);
   const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
   const [selectedSubcategoryFilter, setSelectedSubcategoryFilter] = useState<string | null>(null);
   const [selectedServiceFilter, setSelectedServiceFilter] = useState<string | null>(null);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [moreFilterTimeSlots, setMoreFilterTimeSlots] = useState<string[]>([]);
  const [moreFilterEngagements, setMoreFilterEngagements] = useState<string[]>([]);
  const [moreFilterCommodites, setMoreFilterCommodites] = useState<string[]>([]);
  const [moreFilterMatchingIds, setMoreFilterMatchingIds] = useState<Set<string> | null>(null);
  const [serviceFilterBusinesses, setServiceFilterBusinesses] = useState<Business[]>([]);
  const [subcategoryFilterBusinesses, setSubcategoryFilterBusinesses] = useState<Business[]>([]);

  // Track whether a category/subcategory filter is active (compact AI mode)
  const isCategoryFilterActive = !!(selectedCategoryFilter || selectedSubcategoryFilter || selectedServiceFilter);
  const [isAiSummaryExpanded, setIsAiSummaryExpanded] = useState(false);
  const [showAiPopup, setShowAiPopup] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [mobileSearchOverlayOpen, setMobileSearchOverlayOpen] = useState(false);
  const [businessLabelLogos, setBusinessLabelLogos] = useState<Record<string, string[]>>({});

  // Track when user has scrolled down to the tab bar — lock scroll above it from that point
  const [hasReachedTabBar, setHasReachedTabBar] = useState(false);
  const hasAutoAlignedResultsRef = useRef(false);
  const hasInteractedWithCompactPanelRef = useRef(false);

  // Keep AI summary expanded when filters change
  const hasAiSticky = !!aiAnswerText;

  const ensureResultsVisibleBelowSticky = useCallback((behavior: ScrollBehavior = "smooth") => {
    const resultsEl = resultsRef.current;
    if (!resultsEl) return;

    const stickySelectors = [
      '[data-results-bar]',
      '[data-ai-bar]',
      '[data-search-service-filter]',
      '[data-service-filter]',
      '[data-subcategory-filter]',
      '[data-category-filter]',
      '[data-city-bar]',
      '[data-tab-bar]',
    ] as const;

    const stickyElements = stickySelectors
      .map((selector) => document.querySelector<HTMLElement>(selector))
      .filter((el): el is HTMLElement => !!el && el.getBoundingClientRect().height > 0);

    if (stickyElements.length === 0) return;

    const stickyBottom = stickyElements.reduce((maxBottom, el) => {
      const stickyComputedTop = Number.parseFloat(window.getComputedStyle(el).top || "0");
      const stickyHeight = el.getBoundingClientRect().height;
      const stickyConfiguredBottom = (Number.isFinite(stickyComputedTop) ? stickyComputedTop : 0) + stickyHeight;
      return Math.max(maxBottom, stickyConfiguredBottom);
    }, 0);

    const firstResultCard = resultsEl.querySelector<HTMLElement>("[data-result-card='true']");
    const anchorEl = firstResultCard ?? resultsBarRef.current ?? resultsEl;
    const safetyOffset = 38;
    const anchorTopInPage = anchorEl.getBoundingClientRect().top + window.scrollY;
    const targetScroll = Math.max(0, anchorTopInPage - stickyBottom - safetyOffset);

    // Avoid jitter from tiny diffs while still correcting clipped first row
    if (Math.abs(window.scrollY - targetScroll) < 4) return;

    const tabBar = document.querySelector<HTMLElement>('[data-tab-bar]');
    const tabBarTop = tabBar ? (tabBar.getBoundingClientRect().top + window.scrollY - 60) : 0;

    if (hasReachedTabBar && tabBar && targetScroll < tabBarTop) {
      setHasReachedTabBar(false);
    }

    window.scrollTo({ top: targetScroll, behavior });
  }, [hasReachedTabBar]);

  useEffect(() => {
    if (showAiPopup || isLoading || activeTab !== "suggestions") return;
    if (hasAutoAlignedResultsRef.current) return;
    if (hasInteractedWithCompactPanelRef.current) return;
    if (window.scrollY > 120) return;

    setIsAiSummaryExpanded(false);

    const raf = requestAnimationFrame(() => {
      ensureResultsVisibleBelowSticky("auto");
      hasAutoAlignedResultsRef.current = true;
    });

    return () => cancelAnimationFrame(raf);
  }, [
    selectedCategoryFilter,
    selectedSubcategoryFilter,
    selectedServiceFilter,
    selectedCity,
    ensureResultsVisibleBelowSticky,
    showAiPopup,
    isLoading,
    activeTab,
  ]);

   // NOTE: Delayed auto-scroll removed — was causing scroll blocking on filter changes.

  // Direct DB query when user selects a service filter — replaces the old "extra fetch" mechanism
  // This fetches ALL businesses matching the subcategory + service + city, independent of FTS results
  // Direct DB query when a subcategory is selected manually (not auto-detected)
  // This ensures we get ALL matching businesses, not just those in the FTS results
  useEffect(() => {
    if (!selectedSubcategoryFilter) {
      setSubcategoryFilterBusinesses([]);
      return;
    }
    // Only fetch from DB if the subcategory was manually selected (not auto-detected from FTS)
    // We detect this by checking if enough FTS results already match the subcategory
    const ftsMatchCount = allBusinesses.filter(b => b.categories?.includes(selectedSubcategoryFilter)).length;
    const effectiveCity = (selectedCity && selectedCity !== "all") ? selectedCity : detectedCity;
    
    const fetchSubcategoryBusinesses = async () => {
      const selectFields = "id, name, description, city, region, address, phone, whatsapp, skype, website, logo_url, images, main_category, categories, services, engagements, online_shop_url, presentation_mode, wtuce_status, is_regulated_activity, latitude, longitude, google_maps_url, rating, computed_rating, total_review_count, gamme_id, badge_id, hook_fr, hook_en, hook_ar, opening_hours, show_opening_hours, is_open_24h, vacation_dates, zone_chalandise, is_visible_locale, zone_city_ids, default_service, neighborhood, priority_score";
      let query = supabase
        .from("businesses")
        .select(selectFields)
        .eq("is_active", true)
        .contains("categories", [selectedSubcategoryFilter]);

      if (effectiveCity) {
        const cityId = citiesWithPriority.find(c => c.name === effectiveCity)?.id;
        if (cityId) {
          query = query.or(`city.ilike.${effectiveCity},and(zone_city_ids.cs.{"${cityId}"},is_visible_locale.eq.true)`);
        } else {
          query = query.ilike("city", effectiveCity);
        }
      }

      const { data } = await query.order("priority_score", { ascending: false }).limit(200);
      if (data) {
        setSubcategoryFilterBusinesses((data as unknown as Business[]).map((b) => ({ ...b, distance_km: null })));
      }
    };
    fetchSubcategoryBusinesses();
  }, [selectedSubcategoryFilter, selectedCity, detectedCity, citiesWithPriority, allBusinesses]);

  // Direct DB query when user selects a service filter
  useEffect(() => {
    if (!selectedServiceFilter) {
      setServiceFilterBusinesses([]);
      return;
    }
    const effectiveCity = (selectedCity && selectedCity !== "all") ? selectedCity : detectedCity;
    const effectiveSubcategory = selectedSubcategoryFilter || detectedSubcategory;

    const fetchServiceBusinesses = async () => {
      const selectFields = "id, name, description, city, region, address, phone, whatsapp, skype, website, logo_url, images, main_category, categories, services, engagements, online_shop_url, presentation_mode, wtuce_status, is_regulated_activity, latitude, longitude, google_maps_url, rating, computed_rating, total_review_count, gamme_id, badge_id, hook_fr, hook_en, hook_ar, opening_hours, show_opening_hours, is_open_24h, vacation_dates, zone_chalandise, is_visible_locale, zone_city_ids, default_service, neighborhood";
      let query = supabase
        .from("businesses")
        .select(selectFields)
        .eq("is_active", true)
        .contains("services", [selectedServiceFilter]);

      if (effectiveCity) {
        const cityId = citiesWithPriority.find(c => c.name === effectiveCity)?.id;
        if (cityId) {
          query = query.or(`city.ilike.${effectiveCity},and(zone_city_ids.cs.{"${cityId}"},is_visible_locale.eq.true)`);
        } else {
          query = query.ilike("city", effectiveCity);
        }
      }
      if (effectiveSubcategory) {
        query = query.contains("categories", [effectiveSubcategory]);
      }

      const { data } = await query.order("priority_score", { ascending: false }).limit(200);
      if (data) {
        setServiceFilterBusinesses((data as unknown as Business[]).map((b) => ({ ...b, distance_km: null })));
      }
    };
    fetchServiceBusinesses();
  }, [selectedServiceFilter, selectedSubcategoryFilter, detectedSubcategory, selectedCity, detectedCity, citiesWithPriority]);

   // Reset scroll lock and scroll to top on new search / reload
   useEffect(() => {
     setHasReachedTabBar(false);
     window.scrollTo({ top: 0, behavior: "auto" });
   }, [searchQuery, urlT]);

   useEffect(() => {
      const handleScroll = () => {
        const tabBar = document.querySelector('[data-tab-bar]');
        if (!tabBar) return;
        const tabBarTop = tabBar.getBoundingClientRect().top + window.scrollY - 60;
        // Once the user scrolls to the tab bar, mark it (no scroll lock)
        if (!hasReachedTabBar && window.scrollY >= tabBarTop && tabBarTop > 0) {
          setHasReachedTabBar(true);
        }
      };
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }, [hasReachedTabBar, searchQuery]);

   // Measure sticky bar heights dynamically for perfect stacking
   const [stickyTops, setStickyTops] = useState({ cityBar: 104, serviceBar: 148 });
    const [stickyStackPadding, setStickyStackPadding] = useState(0);
     useEffect(() => {
       const measure = () => {
          const header = document.querySelector<HTMLElement>('header');
          const headerH = header ? header.getBoundingClientRect().height : 53;
          const cityBarTop = headerH;
         setStickyTops(prev => {
           if (prev.cityBar === cityBarTop && prev.serviceBar === cityBarTop) return prev;
           return { cityBar: cityBarTop, serviceBar: cityBarTop };
         });

         // Measure the bottom of the last visible sticky bar to compute content padding
         const subBar = document.querySelector<HTMLElement>('[data-subcategory-filter]');
         const catBar = document.querySelector<HTMLElement>('[data-category-filter]');
         const lastSticky = subBar || catBar || header;
         if (lastSticky) {
           const computedTop = Number.parseFloat(window.getComputedStyle(lastSticky).top || '0');
           const h = lastSticky.getBoundingClientRect().height;
           const bottom = (Number.isFinite(computedTop) ? computedTop : 0) + h;
           setStickyStackPadding(prev => prev === bottom ? prev : bottom);
         }
       };
       // Run immediately for fast first paint, then again after 80ms for stable measurement
       measure();
       const t1 = setTimeout(measure, 80);
       window.addEventListener("resize", measure);
       return () => { clearTimeout(t1); window.removeEventListener("resize", measure); };
     }, [selectedCategoryFilter, selectedSubcategoryFilter, selectedServiceFilter, selectedCity, activeTab, showAiPopup, isLoading]);

   const [aiRegenerateKey, setAiRegenerateKey] = useState(0);
   const [isAiRegenerating, setIsAiRegenerating] = useState(false);
   const lastAiServiceRef = useRef<string | null>(null);
    const [compactPanelBusiness, setCompactPanelBusiness] = useState<AIBusinessData | null>(null);
    const [poiPanelOpen, setPoiPanelOpen] = useState(false);
    const [compactPanelInitialVideoUrl, setCompactPanelInitialVideoUrl] = useState<string | null>(null);
   const [bottomSearchOverlayOpen, setBottomSearchOverlayOpen] = useState(false);
   const [bottomAiOverlayOpen, setBottomAiOverlayOpen] = useState(false);
   const [bottomHashtagsOverlayOpen, setBottomHashtagsOverlayOpen] = useState(false);
  const [bottomSearchCloseTrigger, setBottomSearchCloseTrigger] = useState(0);
  const [ytPanelOpen, setYtPanelOpen] = useState(false);
  useEffect(() => {
    const onPanel = (e: Event) => setYtPanelOpen(!!(e as CustomEvent).detail?.open);
    window.addEventListener("ytbg:panel", onPanel);
    return () => window.removeEventListener("ytbg:panel", onPanel);
  }, []);
    const [isCompactPanelExpanded, setIsCompactPanelExpanded] = useState(false);
    const [isNestedMosaicOpen, setIsNestedMosaicOpen] = useState(false);
      const [compactBusinessImageCount, setCompactBusinessImageCount] = useState(0);
    const compactPanelInterceptCloseRef = useRef<(() => boolean) | null>(null);

      const openCompactPanel = useCallback((bizOrData: AIBusinessData | { id: string; name: string; videoUrl?: string }, opts?: { initialVideoUrl?: string }) => {
        hasInteractedWithCompactPanelRef.current = true;
        const b = bizOrData as AIBusinessData;
        setCompactPanelBusiness(b);
        const initVideo = opts?.initialVideoUrl ?? (bizOrData as any)?.videoUrl ?? null;
        setCompactPanelInitialVideoUrl(initVideo);
        setIsCompactPanelExpanded(false);
        setIsNestedMosaicOpen(false);
        // Ensure the bottom search overlay backdrop (with backdrop-blur) is closed
        // so that when the slide panel is later closed, results aren't left blurred.
        setBottomSearchOverlayOpen(false);
        setBottomSearchCloseTrigger((n) => n + 1);
        setMapPanelCloseTrigger(n => n + 1);
      }, []);

      const closeCompactPanel = useCallback(() => {
        hasInteractedWithCompactPanelRef.current = true;
        hasAutoAlignedResultsRef.current = true;
        // Return-to-Test flow: if user came from SlidePanelHome (Test page),
        // navigate back to /test and reopen the original video panel.
        // Read the flag BEFORE unmounting the panel (whose cleanup rewrites the URL).
        let returnVideoId: string | null = null;
        let returnContext: string | null = null;
        let returnBlogPath: string | null = null;
        let returnBlogEntryId: string | null = null;
        // Neutralisation onglet IA : ne pas renvoyer vers /test depuis l'onglet IA.
        const skipReturnToTest = activeTab === "ai";
        try {
          returnVideoId = skipReturnToTest ? null : sessionStorage.getItem("returnToTestVideoId");
          returnContext = skipReturnToTest ? null : sessionStorage.getItem("returnToTestContext");
          if (skipReturnToTest) {
            sessionStorage.removeItem("returnToTestVideoId");
            sessionStorage.removeItem("returnToTestContext");
          } else {
            if (returnVideoId) sessionStorage.removeItem("returnToTestVideoId");
            if (returnContext) sessionStorage.removeItem("returnToTestContext");
          }
          returnBlogPath = sessionStorage.getItem("returnToBlogPath");
          returnBlogEntryId = sessionStorage.getItem("returnToBlogEntryId");
          if (returnBlogPath) sessionStorage.removeItem("returnToBlogPath");
          if (returnBlogEntryId) sessionStorage.removeItem("returnToBlogEntryId");
        } catch { /* sessionStorage unavailable */ }

        setCompactPanelBusiness(null);
        setCompactPanelInitialVideoUrl(null);
        setIsCompactPanelExpanded(false);
        setIsNestedMosaicOpen(false);
        setHideResultsMap(false);
        // Conserver la position de scroll actuelle pour rester sur la vignette précédemment sélectionnée.
        if (returnVideoId) {
          // Defer navigation so BookOnlineSlidePanel's unmount cleanup
          // (which calls history.replaceState to the original URL) runs FIRST.
          // Note: we intentionally do NOT re-add `openVideo` so the
          // SlidePanelHome does not auto-reopen when the user returns to Home.
          setTimeout(() => {
            const params = new URLSearchParams(returnContext || "");
            params.delete("openVideo");
            const qs = params.toString();
            navigate(`/test${qs ? `?${qs}` : ""}`, { replace: true });
          }, 0);
        } else if (returnBlogPath) {
          // Return-to-Blog flow: navigate back to the originating blog article
          // and scroll to the previously clicked entry.
          if (returnBlogEntryId) {
            try { sessionStorage.setItem("returnToBlogScrollId", returnBlogEntryId); } catch {}
          }
          setTimeout(() => {
            navigate(returnBlogPath!, { replace: true });
          }, 0);
        }
      }, [navigate, activeTab]);

      // Listen for external requests to close the slide panel (e.g. from the
      // hashtags overlay inside the panel itself).
      useEffect(() => {
        const onCloseEvt = () => closeCompactPanel();
        window.addEventListener("close-compact-panel", onCloseEvt);
        return () => window.removeEventListener("close-compact-panel", onCloseEvt);
      }, [closeCompactPanel]);


      const handleCompactPanelClose = useCallback(() => {
        // If panel is in expanded/mosaic mode, collapse back to the panel instead of closing
        if (isCompactPanelExpanded) {
          setIsCompactPanelExpanded(false);
            return;
        }
        // If panel wants to intercept close (e.g. return to fallback hotels list)
        if (compactPanelInterceptCloseRef.current?.()) {
          return;
        }
        closeCompactPanel();
      }, [closeCompactPanel, isCompactPanelExpanded]);

      // Mobile vertical swipe to navigate prev/next business in result list
      // (swipe up = previous, swipe down = next). Started from the header area only.
      const swipeStartYRef = useRef<number | null>(null);
      const swipeActiveRef = useRef(false);
      const [swipeOffsetY, setSwipeOffsetY] = useState(0);
      const onPanelTouchStart = useCallback((e: React.TouchEvent) => {
        if (!isMobile) return;
        const t = e.touches[0];
        // Only initiate from top 80px (header) to avoid hijacking content scroll
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        if (t.clientY - rect.top > 80) return;
        swipeStartYRef.current = t.clientY;
        swipeActiveRef.current = true;
      }, [isMobile]);
      const onPanelTouchMove = useCallback((e: React.TouchEvent) => {
        if (!swipeActiveRef.current || swipeStartYRef.current == null) return;
        const dy = e.touches[0].clientY - swipeStartYRef.current;
        setSwipeOffsetY(dy);
      }, []);
      // Navigate to the prev/next business in the result list (dir = -1 or 1)
      // Uses a ref-bridged list because filteredBusinesses is declared later.
      const filteredBusinessesRef = useRef<Business[]>([]);
      const goToBusinessOffset = useCallback((dir: number) => {
        const list = filteredBusinessesRef.current;
        const currentId = compactPanelBusiness?.id;
        if (!list.length || !currentId) return;
        const idx = list.findIndex(b => b.id === currentId);
        if (idx === -1) return;
        const nextIdx = idx + dir;
        if (nextIdx < 0 || nextIdx >= list.length) return;
        const next = list[nextIdx];
        openCompactPanel({ id: next.id, name: next.name || "" } as any);
      }, [compactPanelBusiness?.id, openCompactPanel]);
      const [navTick, setNavTick] = useState(0);
      const businessNavInfo = useMemo(() => {
        const list = filteredBusinessesRef.current;
        const currentId = compactPanelBusiness?.id;
        const idx = currentId ? list.findIndex(b => b.id === currentId) : -1;
        return {
          hasPrev: idx > 0,
          hasNext: idx >= 0 && idx < list.length - 1,
        };
      }, [compactPanelBusiness?.id, navTick]);
      const onPanelTouchEnd = useCallback(() => {
        if (!swipeActiveRef.current) return;
        const dy = swipeOffsetY;
        swipeActiveRef.current = false;
        swipeStartYRef.current = null;
        setSwipeOffsetY(0);
        if (Math.abs(dy) < 220) return;
        // swipe down (dy > 0) → next ; swipe up (dy < 0) → previous
        goToBusinessOffset(dy > 0 ? 1 : -1);
      }, [swipeOffsetY, goToBusinessOffset]);




     const [hoveredResultId, setHoveredResultId] = useState<string | null>(null);
     const [hoveredPoiId, setHoveredPoiId] = useState<string | null>(null);
     const [hoveredDestId, setHoveredDestId] = useState<string | null>(null);
     const [pinnedBusinesses, setPinnedBusinesses] = useState<Business[]>([]);
     const [allPois, setAllPois] = useState<PoiMapItem[]>([]);
     const [allDests, setAllDests] = useState<PoiMapItem[]>([]);
      const [allDestItems, setAllDestItems] = useState<DestinationItem[]>([]);
    const [mapPanelCloseTrigger, setMapPanelCloseTrigger] = useState(0);
   const resetPanelStates = () => {
     // Child tab components manage their own panel state now
   };
   const [locationDialogOpen, setLocationDialogOpen] = useState(false);
    useEffect(() => {
      const h = () => setLocationDialogOpen(true);
      window.addEventListener("open-location-picker", h);
      return () => window.removeEventListener("open-location-picker", h);
    }, []);
    useEffect(() => {
      const h = () => {
        setShowAiPopup(false);
        setActiveTab("ai");
        setCompactPanelBusiness(null);
        setIsCompactPanelExpanded(false);
        setShowMobileMap(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      };
      window.addEventListener("open-ai-tab", h);
      return () => window.removeEventListener("open-ai-tab", h);
    }, []);
   const heroAiRef = useRef<HTMLDivElement>(null);
   const [hasScrolledPastHeroAi, setHasScrolledPastHeroAi] = useState(false);
    // showAiPopup moved earlier (before ensureResultsVisibleBelowSticky)
    const aiPopupShownRef = useRef(false);
    const [overlaySelectedBusiness, setOverlaySelectedBusiness] = useState<AIBusinessData | null>(null);
    const [isOverlayPanelExpanded, setIsOverlayPanelExpanded] = useState(false);
    const overlayLeftPanelRef = useRef<HTMLDivElement>(null);
   // Generate tab-specific AI text (POI or Destinations)
   const fetchTabAiText = useCallback(async (mode: "poi" | "destinations", city: string | null, items: { name: string; city?: string | null }[]) => {
     if (mode === "poi") { setIsPoiAiLoading(true); setPoiAiText(""); }
     else { setIsDestAiLoading(true); setDestAiText(""); }
     try {
       const top10 = items.slice(0, 10);
       const { data, error: fnError } = await supabase.functions.invoke("ai-search-answer", {
         body: {
           query: mode === "poi"
             ? (language === "en" ? `Points of interest in ${city || "Morocco"}` : `Lieux d'intérêt à ${city || "au Maroc"}`)
             : (language === "en" ? `Destinations in ${city || "Morocco"}` : `Destinations à ${city || "au Maroc"}`),
           businesses: top10.map((b, i) => ({ name: b.name, city: b.city || city })),
           language,
           mode,
         },
       });
       if (fnError) { console.error("Tab AI error:", fnError); return; }
       if (data?.answer) {
         if (mode === "poi") setPoiAiText(data.answer);
         else setDestAiText(data.answer);
       }
     } catch (err) { console.error("Tab AI fetch error:", err); }
     finally {
       if (mode === "poi") setIsPoiAiLoading(false);
       else setIsDestAiLoading(false);
     }
   }, [language]);

   // Reset panels, tab, and scroll when query changes (skip on mount to preserve openBusiness param)
   const isInitialResetMount = useRef(true);
   useEffect(() => {
     if (isInitialResetMount.current) {
       isInitialResetMount.current = false;
       return;
     }
     setHasScrolledPastHeroAi(false);
     aiPopupShownRef.current = false;
     hasAutoAlignedResultsRef.current = false;
     hasInteractedWithCompactPanelRef.current = false;
      setActiveTab(searchParams.get("tab") === "ai" ? "ai" : (badgeIdParam ? "hashtag" : "suggestions"));
     resetPanelStates();
     setOverlaySelectedBusiness(null);
     setIsOverlayPanelExpanded(false);
      setCompactPanelBusiness(null);
      setIsCompactPanelExpanded(false);
      setHotelSearchPanel(null);
    }, [searchQuery, urlT]);

    // Hide page-level scrollbar when slide panel is open (all viewports)
    useEffect(() => {
      if (compactPanelBusiness) {
        document.documentElement.classList.add('hide-scrollbar-panel-open');
      } else {
        document.documentElement.classList.remove('hide-scrollbar-panel-open');
      }
      return () => { document.documentElement.classList.remove('hide-scrollbar-panel-open'); };
    }, [compactPanelBusiness]);

    // Note: BookOnlineSlidePanel is allowed to stay open over the AI tab so
    // clicking an AI thumbnail opens the business detail panel on top.


    // Always hide native scrollbar on Search page (aligned with Home behaviour)
    useEffect(() => {
      document.documentElement.classList.add('hide-scrollbar-search');
      return () => { document.documentElement.classList.remove('hide-scrollbar-search'); };
    }, []);

    // Auto-open du 1er résultat désactivé : on ne devine jamais l'établissement
    // à partir d'une simple query texte. Les ouvertures explicites
    // (?openBusiness=ID, match exact du nom) restent gérées ailleurs.


   // Track when the hero AI card scrolls out of view — once past, stays hidden
   useEffect(() => {
     const el = heroAiRef.current;
     if (!el) return;
     const observer = new IntersectionObserver(
       ([entry]) => {
         if (!entry.isIntersecting) setHasScrolledPastHeroAi(true);
       },
       { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
     );
     observer.observe(el);
     return () => observer.disconnect();
   }, [searchQuery, allBusinesses.length]);

  

  // Detect country-level terms (e.g. "maroc", "morocco") → national scope, no city filter
  const queryHasCountryScope = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery || inputValue);
    if (!normalizedQuery) return false;
    const countryTerms = ["maroc", "morocco", "marocco", "marruecos"];
    return countryTerms.some(term => normalizedQuery.includes(term));
  }, [searchQuery, inputValue]);

  const cityMentionedInQuery = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery || inputValue);
    if (!normalizedQuery) return null;
    const match = citiesWithPriority.find((c) => {
      const normalizedCity = normalizeText(c.name);
      return normalizedCity.length > 2 && normalizedQuery.includes(normalizedCity);
    });
    return match?.name || null;
  }, [searchQuery, inputValue, citiesWithPriority]);

  const queryHasExplicitCity = useMemo(() => {
    if (cityFromUrl) return true;
    return !!cityMentionedInQuery;
  }, [cityFromUrl, cityMentionedInQuery]);

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
  const hotelSearchSpokenRef = useRef(false);
  const [showResultsOverlay, setShowResultsOverlay] = useState(false);
  const [overlayDismissing, setOverlayDismissing] = useState(false);
   const resultsRef = useRef<HTMLDivElement>(null);
   const resultsBarRef = useRef<HTMLDivElement>(null);
  const latestFetchIdRef = useRef(0);

  const voiceLoopRef = useRef(false);
  const ttsIntroWordCountRef = useRef(0);
  const { speak: ttsSpeak, stop: ttsStop, status: ttsStatus, spokenWordIndex: ttsSpokenWordIndex } = useTextToSpeech({
    onEnd: () => {
      if (voiceLoopRef.current) {
        voiceLoopRef.current = false;
        // Small delay so audio output stops before mic starts
        setTimeout(() => toggleRecordingRef.current?.(), 400);
      }
    },
  });
  const toggleRecordingRef = useRef<(() => void) | null>(null);
  const geo = useGeolocation();

  // Auto-select city from geolocation when geo is enabled and no city is explicitly set
  useEffect(() => {
    if (!queryHasExplicitCity && geo.isEnabled && geo.detectedCity && selectedCity === "all" && !cityFromUrl) {
      setSelectedCity(geo.detectedCity);
      setIsGeoCityAutoSelected(true);
    }
  }, [searchQuery, categoryFromUrl, queryHasExplicitCity, geo.isEnabled, geo.detectedCity, selectedCity, cityFromUrl]);

  // If query explicitly mentions a city (e.g. voice search "à Essaouira"), override selectedCity
  useEffect(() => {
    if (cityFromUrl) return;
    if (!cityMentionedInQuery) return;
    if (normalizeText(cityMentionedInQuery) !== normalizeText(selectedCity)) {
      setSelectedCity(cityMentionedInQuery);
      setIsGeoCityAutoSelected(false);
    }
  }, [cityMentionedInQuery, cityFromUrl, selectedCity]);

  // Reset map visibility when a new search is performed
  useEffect(() => {
    setHideResultsMap(false);
    setHidePoiMap(false);
    setHideDestMap(false);
  }, [searchQuery]);

  // If query has country scope (e.g. "maroc"), force "all" cities only on initial search
  const prevQueryForCountryScopeRef = useRef<string>(searchQuery);
  useEffect(() => {
    const queryChanged = prevQueryForCountryScopeRef.current !== searchQuery;
    prevQueryForCountryScopeRef.current = searchQuery;
    if (queryChanged && queryHasCountryScope && selectedCity !== "all") {
      setSelectedCity("all");
      setIsGeoCityAutoSelected(false);
    }
  }, [queryHasCountryScope, searchQuery]);

  // Fetch neighborhood coordinates when a neighborhood is detected
  useEffect(() => {
    if (!detectedNeighborhood) {
      setNeighborhoodCoords(null);
      return;
    }
    const fetchCoords = async () => {
      const { data } = await supabase
        .from("neighborhoods")
        .select("latitude, longitude")
        .eq("name", detectedNeighborhood)
        .maybeSingle();
      if (data?.latitude && data?.longitude) {
        setNeighborhoodCoords({ lat: data.latitude, lng: data.longitude });
      } else {
        setNeighborhoodCoords(null);
      }
    };
    fetchCoords();
  }, [detectedNeighborhood]);


  // Fetch matching business IDs when engagement/commodité filters change
  useEffect(() => {
    const allSelected = [...moreFilterEngagements, ...moreFilterCommodites];
    if (allSelected.length === 0) {
      setMoreFilterMatchingIds(null);
      return;
    }
    let cancelled = false;
    const fetchIds = async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, engagements")
        .eq("is_active", true);
      if (cancelled) return;
      const matchingIds = new Set<string>();
      (data || []).forEach((b: { id: string; engagements: string[] | null }) => {
        const engs: string[] = b.engagements || [];
        const hasAll = allSelected.every(s => engs.includes(s));
        if (hasAll) matchingIds.add(b.id);
      });
      setMoreFilterMatchingIds(matchingIds);
    };
    fetchIds();
    return () => { cancelled = true; };
  }, [moreFilterEngagements, moreFilterCommodites]);

  // Close suggestions on click outside

  const formatDateFr = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const handleHotelAvailability = useCallback(async (
    intent: { hotelName: string; checkIn?: string; checkOut?: string; adults?: number; rooms?: number },
    spokenText: string,
  ) => {
    const { hotelName, checkIn, checkOut, adults, rooms } = intent;
    const lang = language === "en" ? "en" : "fr";

    // Show the spoken text in the search bar
    setInputValue(hotelName);

    try {
      // 1. Find business by name
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name")
        .ilike("name", `%${hotelName}%`)
        .limit(1);

      const biz = businesses?.[0];
      if (!biz) {
        return;
      }

      // 2. Get LiteAPI mapping
      const { data: mappings } = await supabase
        .from("hotel_api_mappings")
        .select("liteapi_hotel_id")
        .eq("business_id", biz.id)
        .limit(1);

      const liteApiId = mappings?.[0]?.liteapi_hotel_id;
      if (!liteApiId) {
        return;
      }

      // 3. Build dates (defaults: tomorrow + day after)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);
      const finalCheckIn = checkIn || tomorrow.toISOString().split("T")[0];
      const finalCheckOut = checkOut || dayAfter.toISOString().split("T")[0];

      // 4. Call liteapi-hotels
      const { data, error } = await supabase.functions.invoke("liteapi-hotels", {
        body: {
          hotelIds: [liteApiId],
          checkIn: finalCheckIn,
          checkOut: finalCheckOut,
          adults: adults || 2,
          rooms: rooms || 1,
          currency: "EUR",
        },
      });

      if (error) throw new Error(error.message);

      const hotels = data?.data || [];
      const allOffers: { room: { type?: string }; price: { total: string; currency: string } }[] = [];
      for (const h of hotels) {
        if (h.available && h.offers) allOffers.push(...h.offers);
      }

      // TTS désactivé: déclenchement uniquement via le bouton Speaker dans l'overlay Suggestion IA
    } catch (err) {
      console.error("Hotel availability voice error:", err);
    }
  }, [language]);

  const [flightOverlay, setFlightOverlay] = useState<{ open: boolean; initial: FlightSearchInitial }>({ open: false, initial: {} });
  const [webOverlay, setWebOverlay] = useState<{ open: boolean; query: string }>({ open: false, query: "" });
  const [hotelSearchPanel, setHotelSearchPanel] = useState<import("@/components/HotelAvailabilityOverlay").FallbackPanelData | null>(null);
  const [hotelSearchLoading, setHotelSearchLoading] = useState(false);
  const [latestHotelSearchDates, setLatestHotelSearchDates] = useState<{ checkIn?: string; checkOut?: string; adults?: number }>({});

  const hotelSearchSeqRef = useRef(0);
  const handleHotelSearch = useCallback(async (intent: { city: string; checkIn?: string; checkOut?: string; adults?: number }, spokenText?: string) => {
    const lang = language === "en" ? "en" : "fr";
    let cityName = (intent.city || "").trim();
    if (!cityName) {
      return;
    }

    // Save voice/text hotel search to recent searches history
    const queryToSave = (spokenText || "").trim() || cityName;
    if (queryToSave) {
      saveSearch(queryToSave, cityName, "Hôtellerie");
    }

    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow); dayAfter.setDate(dayAfter.getDate() + 1);
    const checkIn = intent.checkIn || tomorrow.toISOString().split("T")[0];
    const checkOut = intent.checkOut || dayAfter.toISOString().split("T")[0];
    const adults = intent.adults || 2;
    setLatestHotelSearchDates({ checkIn, checkOut, adults });

    const seq = ++hotelSearchSeqRef.current;
    setHotelSearchLoading(true);
    try {
      const [mappingResult, gammeResult] = await Promise.all([
        supabase.from("hotel_mappings").select("id, serp_hotel_name, business_id, city").ilike("city", cityName),
        supabase.from("gammes").select("id, name_fr, color_hex, text_color_hex, sort_order"),
      ]);
      const allMappings = (mappingResult.data || []) as any[];
      const gammes = gammeResult.data || [];
      const optimalMaxPages = Math.max(1, Math.ceil(allMappings.length / 20));

      const serpResult = await supabase.functions.invoke("serpapi-hotels", {
        body: { cityName, checkIn, checkOut, adults, currency: "EUR", maxPages: optimalMaxPages || 1 },
      });
      if (seq !== hotelSearchSeqRef.current) return;
      const serpHotels = (serpResult.data?.data || []) as any[];

      const serpByExactName = new globalThis.Map<string, any>();
      for (const h of serpHotels) {
        const n = typeof h.name === "string" ? h.name.trim().toLowerCase() : "";
        if (n && !serpByExactName.has(n)) serpByExactName.set(n, h);
      }

      const matches = new globalThis.Map<string, { mapping: any; serpMatch: any }>();
      for (const m of allMappings) {
        const mn = typeof m.serp_hotel_name === "string" ? m.serp_hotel_name.trim().toLowerCase() : "";
        if (!m.business_id || !mn || matches.has(m.business_id)) continue;
        const sm = serpByExactName.get(mn);
        if (sm) matches.set(m.business_id, { mapping: m, serpMatch: sm });
      }

      const bizIds = [...matches.keys()];
      let bizMap = new globalThis.Map<string, any>();
      if (bizIds.length > 0) {
        const { data: bizData } = await supabase
          .from("businesses")
          .select("id, name, slug, images, city, region, neighborhood, address, phone, whatsapp, categories, default_service, hook_fr, logo_url, computed_rating, total_review_count, gamme_id, wtuce_status, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, reserve_now_url, manual_price_range, opening_hours, show_opening_hours, is_open_24h, engagements, latitude, longitude, rating, min_price, main_category")
          .in("id", bizIds)
          .eq("is_active", true)
          .eq("main_category", "Hôtellerie");
        bizMap = new globalThis.Map((bizData || []).map((b: any) => [b.id, b]));
      }
      if (seq !== hotelSearchSeqRef.current) return;

      const gammeMap = new globalThis.Map(gammes.map((g: any) => [g.id, g]));
      const hotels: any[] = [];
      for (const { mapping, serpMatch } of matches.values()) {
        const biz = bizMap.get(mapping.business_id);
        if (!biz) continue;
        const gammeInfo = biz.gamme_id ? gammeMap.get(biz.gamme_id) || null : null;
        hotels.push({
          hotelId: mapping.id || biz.id,
          businessId: biz.id,
          name: biz.name,
          wtuce_status: biz.wtuce_status || undefined,
          offers: [],
          dbImage: biz.images?.[0] || undefined,
          mainImage: serpMatch.thumbnail || undefined,
          dbGoogleRating: biz.google_rating,
          dbGoogleReviewCount: biz.google_review_count,
          dbTripadvisorRating: biz.tripadvisor_rating,
          dbTripadvisorReviewCount: biz.tripadvisor_review_count,
          serpPrice: serpMatch.ratePerNight || null,
          reserveNowUrl: biz.reserve_now_url,
          manualPriceRange: biz.manual_price_range,
          isCurrentHotel: false,
          gamme: gammeInfo ? { name_fr: gammeInfo.name_fr, color_hex: gammeInfo.color_hex, text_color_hex: gammeInfo.text_color_hex } : null,
          dealDescription: serpMatch.dealDescription || null,
          dbBusiness: biz,
        });
      }

      setHotelSearchPanel({
        hotels, city: cityName, checkIn, checkOut, adults, source: "serpapi",
        gammes: gammes.map((g: any) => ({ id: g.id, name_fr: g.name_fr, color_hex: g.color_hex, text_color_hex: g.text_color_hex, sort_order: g.sort_order })),
      });
      // Close the bottom search overlay backdrop so blur doesn't persist behind subsequent panels.
      setBottomSearchOverlayOpen(false);
      setBottomSearchCloseTrigger((n) => n + 1);

      // Restrict left panel results to the hotels matched against SerpAPI availability
      const availableIds = hotels.map((h: any) => h.businessId).filter(Boolean) as string[];
      const hotelBusinesses = hotels
        .map((h: any) => h.dbBusiness)
        .filter((biz: Business | null | undefined): biz is Business => !!biz?.id);
      if (availableIds.length > 0) {
        setAvailabilityRestrictedIds(new Set(availableIds));
      }
      // Push the matched hotels into the map/results pool immediately so they
      // appear on the right Google Map panel (and as pinned results), even
      // before the user picks one from the FallbackHotelsPanel overlay.
      if (hotelBusinesses.length > 0) {
        setPinnedBusinesses(hotelBusinesses);
        setAllBusinesses(hotelBusinesses);
        setTotalCount(null);
        setSearchMessage("");
        // Pin the IDs in the URL so the standard text-search effect (which runs
        // in parallel and would otherwise overwrite allBusinesses with its own,
        // often single, name-match) cannot clobber the SerpAPI hotel list.
        setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.set("pinIds", availableIds.join(","));
          // Refresh q/spoken so headers/titles reflect the current hotel search
          if (spokenText && spokenText.trim()) {
            next.set("q", spokenText.trim());
            next.set("spoken", spokenText.trim());
          }
          // Persist hotel search context so the header survives reloads/navigation
          next.set("hotelCity", cityName);
          next.set("hotelCheckIn", checkIn);
          next.set("hotelCheckOut", checkOut);
          next.set("hotelAdults", String(adults));
          return next;
        }, { replace: true });
      }

    } catch (err) {
      console.error("Hotel search voice error:", err);
    } finally {
      if (seq === hotelSearchSeqRef.current) setHotelSearchLoading(false);
    }
  }, [language, saveSearch]);

  // Auto-trigger hotel search when URL contains hotelCity + dates + adults (e.g. from home widget)
  const autoHotelSearchRef = useRef(false);
  useEffect(() => {
    if (autoHotelSearchRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const city = params.get("hotelCity");
    const checkIn = params.get("hotelCheckIn");
    const checkOut = params.get("hotelCheckOut");
    const adults = params.get("hotelAdults");
    if (city && checkIn && checkOut && adults) {
      autoHotelSearchRef.current = true;
      handleHotelSearch({ city, checkIn, checkOut, adults: parseInt(adults, 10) || 2 }, params.get("spoken") || undefined);
    }
  }, [handleHotelSearch]);




  const { status: voiceStatus, toggleRecording, finishRecording, liveTranscript } = useVoiceSearch({
    onTranscript: (keywords, spoken, category, timeKeyword) => {
      isVoiceSearchRef.current = true;
      setAvailabilityRestrictedIds(null);
      // If a previous search is already active, merge the new spoken text
      // with the existing query so consecutive voice searches refine instead
      // of replacing the previous one.
      const prevQ = (searchParams.get("q") || "").trim();
      const prevSpoken = (searchParams.get("spoken") || "").trim();
      const mergedKeywords = prevQ ? `${prevQ} ${keywords}`.trim() : keywords;
      const mergedSpoken = prevSpoken ? `${prevSpoken} ${spoken}`.trim() : spoken;
      setInputValue(mergedKeywords);
      setSearchQuery(mergedKeywords);
      const params: Record<string, string> = { q: mergedKeywords, spoken: mergedSpoken };
      if (category) params.category = category;
      // Handle temporal keyword from voice search
      if (timeKeyword) {
        const timeResult = extractTimeSlot(timeKeyword);
        if (timeResult) {
          params.timeStart = String(timeResult.timeSlot.startHour);
          params.timeEnd = String(timeResult.timeSlot.endHour);
          params.timeDayOffset = String(timeResult.timeSlot.dayOffset);
          if (timeResult.timeSlot.dayOfWeek !== null) params.timeDayOfWeek = String(timeResult.timeSlot.dayOfWeek);
        }
      }
      setSearchParams(params);
      if (isMobile) window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onHotelAvailability: handleHotelAvailability,
    onHotelSearch: handleHotelSearch,
    onFlightSearch: (intent) => {
      setFlightOverlay({ open: true, initial: intent });
    },
    onWebSearch: (intent) => {
      setWebOverlay({ open: true, query: intent.query });
    },
    onError: (message) => {
      toast({ variant: "destructive", title: "Erreur microphone", description: message });
    },
  });
  toggleRecordingRef.current = toggleRecording;

  // Voice input for the AI refinement composer (mic icon next to "Affinez votre demande")
  const refineVoice = useVoiceSearch({
    onTranscript: (keywords) => {
      const text = (keywords || "").trim();
      if (!text) return;
      setAiChatInput(text);
      setTimeout(() => submitAiRefinementRef.current?.(text), 50);
    },
    onError: (message) => {
      toast({ variant: "destructive", title: "Erreur microphone", description: message });
    },
  });



  // Get cities available in current result context (category/subcategory/service included)
  // Keep only direct business cities to avoid showing empty city filters
  const availableCities = useMemo(() => {
    const effectiveCategoryForCities = selectedCategoryFilter || detectedCategory;
    const effectiveSubcategoryForCities = selectedSubcategoryFilter || detectedSubcategory;

    let citySourceBusinesses: Business[] =
      selectedServiceFilter && serviceFilterBusinesses.length > 0
        ? [...serviceFilterBusinesses]
        : selectedSubcategoryFilter && subcategoryFilterBusinesses.length > 0
          ? [...subcategoryFilterBusinesses]
          : [...allBusinesses];

    if (effectiveCategoryForCities) {
      const targetCategory = normalizeText(effectiveCategoryForCities);
      citySourceBusinesses = citySourceBusinesses.filter(
        (b) => !!b.main_category && normalizeText(b.main_category) === targetCategory
      );
    }

    if (effectiveSubcategoryForCities) {
      const targetSubcategory = normalizeText(effectiveSubcategoryForCities);
      citySourceBusinesses = citySourceBusinesses.filter(
        (b) =>
          Array.isArray(b.categories) &&
          b.categories.some((cat) => normalizeText(cat) === targetSubcategory)
      );
    }

    if (selectedServiceFilter) {
      const targetService = normalizeText(selectedServiceFilter);
      citySourceBusinesses = citySourceBusinesses.filter(
        (b) =>
          Array.isArray(b.services) &&
          b.services.some((service) => normalizeText(service) === targetService)
      );
    }

    const directCityNames = new Set<string>();
    for (const b of citySourceBusinesses) {
      if (b.city) directCityNames.add(normalizeText(b.city));
    }

    return citiesWithPriority
      .filter((c) => directCityNames.has(normalizeText(c.name)))
      .sort((a, b) => a.priority - b.priority)
      .map((c) => c.name);
  }, [
    allBusinesses,
    citiesWithPriority,
    detectedCategory,
    detectedSubcategory,
    selectedCategoryFilter,
    selectedSubcategoryFilter,
    selectedServiceFilter,
    serviceFilterBusinesses,
    subcategoryFilterBusinesses,
  ]);

  const getEffectiveRating = (b: Business): number | null => {
    return b.computed_rating ?? (b.rating ? Number(b.rating) : null);
  };

  // Compute distance between user coords and a business
  const getDistanceKm = useCallback((b: Business): number | null => {
    if (!geo.isEnabled || !geo.coords || b.latitude == null || b.longitude == null) return null;
    // Hide distance if any of the business's subcategories has show_google_map disabled
    const bizCats = b.categories || [];
    if (bizCats.length > 0 && subcategories.some(sc => bizCats.includes(sc.name_fr) && sc.show_google_map === false)) return null;
    return haversineKm(geo.coords.lat, geo.coords.lng, b.latitude, b.longitude);
  }, [geo.isEnabled, geo.coords, subcategories]);

  // Sort: WTUCE verified > priority_score desc > rating desc (ignore <10 reviews)
  const sortWtuceAndRating = (a: Business, b: Business) => {
    const aVerified = a.wtuce_status === "verified" ? 0 : 1;
    const bVerified = b.wtuce_status === "verified" ? 0 : 1;
    if (aVerified !== bVerified) return aVerified - bVerified;
    const aPrio = a.priority_score || 0;
    const bPrio = b.priority_score || 0;
    if (aPrio !== bPrio) return bPrio - aPrio;
    const aCount = a.total_review_count ?? 0;
    const bCount = b.total_review_count ?? 0;
    const aRating = aCount >= 10 ? (getEffectiveRating(a) ?? -1) : -1;
    const bRating = bCount >= 10 ? (getEffectiveRating(b) ?? -1) : -1;
    return bRating - aRating;
  };

  // Filter businesses by city. Include businesses that cover the city via zone_city_ids.
  const findCityByName = (cityName?: string | null) => {
    if (!cityName) return null;
    const normalizedTarget = normalizeText(cityName);
    return citiesWithPriority.find((c) => normalizeText(c.name) === normalizedTarget) || null;
  };

  const selectedCityId = useMemo(() => {
    if (!selectedCity || selectedCity === "all") return null;
    return findCityByName(selectedCity)?.id || null;
  }, [selectedCity, citiesWithPriority]);

  // Detect if we have a known city or neighborhood for the split map layout
  const effectiveCityForMap = (selectedCity && selectedCity !== "all") ? selectedCity : detectedCity;
  const hasKnownLocation = !isMobile && !isSubDesktop && !!(effectiveCityForMap || detectedNeighborhood);

  const mapCenterForResults = useMemo(() => {
    if (neighborhoodCoords) return neighborhoodCoords;
    if (effectiveCityForMap) {
      const city = findCityByName(effectiveCityForMap);
      if (city?.latitude != null && city?.longitude != null) {
        return { lat: city.latitude, lng: city.longitude };
      }

      const fallbackBusiness = allBusinesses.find((b) => {
        if (b.latitude == null || b.longitude == null || !b.city) return false;
        return normalizeText(b.city) === normalizeText(effectiveCityForMap);
      });
      if (fallbackBusiness) {
        return { lat: fallbackBusiness.latitude!, lng: fallbackBusiness.longitude! };
      }
    }
    return undefined;
  }, [effectiveCityForMap, neighborhoodCoords, citiesWithPriority, allBusinesses]);

  const filteredBusinesses = useMemo(() => {
    const applyPinThumb = (b: Business): Business => {
      const entry = pinThumbMap[b.id];
      if (!entry) return b;
      const rest = (b.images || []).filter(u => u !== entry.thumb);
      // Attach `videoUrl` so click handlers calling openCompactPanel(b) auto-pass it
      // through to BookOnlineSlidePanel.initialVideoUrl (see openCompactPanel L913).
      return { ...b, images: [entry.thumb, ...rest], videoUrl: entry.videoUrl ?? undefined } as Business;
    };
    if (pinIdsParam && pinnedBusinesses.length > 0) {
      const orderedIds = pinIdsParam.split(",").map(s => s.trim()).filter(Boolean);
      const byId: Record<string, Business> = {};
      for (const b of pinnedBusinesses) byId[b.id] = b;
      return orderedIds.map(id => byId[id]).filter(Boolean).map(applyPinThumb) as Business[];
    }

    const isServerPaginatedResults = totalCount !== null;

    // When server-side pagination is active, the backend already returned the exact
    // slice and ordering for the current page. Keep that slice intact so the grid,
    // map and pagination counter stay synchronized.
    let filtered: Business[];
    if (selectedServiceFilter && serviceFilterBusinesses.length > 0) {
      filtered = [...serviceFilterBusinesses];
    } else if (selectedSubcategoryFilter && subcategoryFilterBusinesses.length > 0) {
      const hasDestinationEnrichment = allBusinesses.some(b => b.destination_enriched);
      if (hasDestinationEnrichment && allBusinesses.length > 0) {
        const ids = new Set(subcategoryFilterBusinesses.map(b => b.id));
        const extras = allBusinesses.filter(b => !ids.has(b.id));
        filtered = [...subcategoryFilterBusinesses, ...extras];
      } else {
        filtered = [...subcategoryFilterBusinesses];
      }
    } else if (isServerPaginatedResults) {
      filtered = [...allBusinesses];
    } else {
      filtered = [...allBusinesses];
    }


    if (!isServerPaginatedResults && selectedCity && selectedCity !== "all") {
      const normalizedQuery = normalizeText(searchQuery || "");
      filtered = filtered.filter(b => {
        if (b.city === selectedCity) return true;
        if (selectedCityId && b.zone_city_ids?.includes(selectedCityId) && b.is_visible_locale) return true;
        if (b.destination_enriched) return true;

        // Keep exact/name-pinned businesses visible even when they have no city set
        // (e.g. "Decathlon Travel"), instead of dropping them due a stale/auto city filter.
        if (!b.city && normalizedQuery) {
          const normalizedName = normalizeText(b.name || "");
          if (normalizedName.includes(normalizedQuery)) return true;
        }

        return false;
      });
    }

    if (!isServerPaginatedResults && selectedCategoryFilter) {
      filtered = filtered.filter(b => b.main_category === selectedCategoryFilter);
    }

    // Apply subcategory filter — but only if at least one business matches
    // (prevents false-positive subcategory detection from hiding name-match results, e.g. "Jardin Majorelle")
    if (!isServerPaginatedResults && selectedSubcategoryFilter) {
      const subcatMatches = filtered.filter(b => b.categories && b.categories.includes(selectedSubcategoryFilter));
      if (subcatMatches.length > 0) {
        filtered = subcatMatches;
      }
    }

    if (!isServerPaginatedResults && detectedNeighborhood) {
      const nhLower = detectedNeighborhood.toLowerCase();
      const nhFiltered = filtered.filter(b => {
        const bNh = (b.neighborhood || "").toLowerCase();
        return bNh.includes(nhLower) || bNh.includes("toute la ville");
      });
      if (nhFiltered.length > 0) {
        filtered = nhFiltered;
      }
    }

    if (!isServerPaginatedResults && selectedServiceFilter) {
      filtered = filtered.filter(b => b.services && b.services.includes(selectedServiceFilter));
    }

    if (!isServerPaginatedResults && moreFilterMatchingIds) {
      filtered = filtered.filter(b => moreFilterMatchingIds.has(b.id));
    }

    if (!isServerPaginatedResults && moreFilterTimeSlots.length > 0) {
      const slotRanges: Record<string, { startHour: number; endHour: number }> = {
        matinee: { startHour: 7, endHour: 11 },
        dejeuner: { startHour: 12, endHour: 14 },
        "apres-midi": { startHour: 14, endHour: 18 },
        diner: { startHour: 19, endHour: 23 },
        soiree: { startHour: 19, endHour: 23 },
        nuit: { startHour: 22, endHour: 6 },
      };
      filtered = filtered.filter(b => {
        return moreFilterTimeSlots.some(slot => {
          const range = slotRanges[slot];
          if (!range) return false;
          const ts: TimeSlot = { ...range, dayOffset: 0, dayOfWeek: null, matchedKeyword: slot };
          const vacDates = Array.isArray(b.vacation_dates) ? b.vacation_dates as Array<{ start_date: string; end_date: string }> : null;
          return isOpenDuringSlot(b.opening_hours || null, !!b.is_open_24h, ts, vacDates);
        });
      });
    }

    const hasActiveSearch = !!searchQuery.trim() || !!categoryFromUrl;

    // Voice hotel search: restrict to available hotels only (applied BEFORE timeSlot/sort branches)
    if (availabilityRestrictedIds && availabilityRestrictedIds.size > 0) {
      filtered = filtered.filter(b => availabilityRestrictedIds.has(b.id));
    }

    if (activeTimeSlot) {
      // Keep backend order inside each bucket, only prioritize "open during slot"
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

    // pinIds: explicit allow-list of business IDs (e.g. from /fiche/:slug → KP group)
    // When present, restrict results to these IDs only and preserve the requested order.
    if (pinIdsParam) {
      const orderedIds = pinIdsParam.split(",").map(s => s.trim()).filter(Boolean);
      const allowSet = new Set(orderedIds);
      const byId: Record<string, Business> = {};
      for (const b of filtered) if (allowSet.has(b.id)) byId[b.id] = b;
      const ordered = orderedIds.map(id => byId[id]).filter(Boolean).map(applyPinThumb) as Business[];
      return ordered;
    }

    return [...filtered].sort(sortWtuceAndRating).map(applyPinThumb);
  }, [allBusinesses, pinnedBusinesses, serviceFilterBusinesses, subcategoryFilterBusinesses, selectedCity, selectedCityId, selectedCategoryFilter, selectedSubcategoryFilter, selectedServiceFilter, activeTimeSlot, searchQuery, categoryFromUrl, moreFilterMatchingIds, moreFilterTimeSlots, detectedNeighborhood, searchLevel, totalCount, pinIdsParam, availabilityRestrictedIds, pinThumbMap]);

  // Keep nav ref in sync so the slide-panel chevrons reflect the current displayed list
  useEffect(() => {
    filteredBusinessesRef.current = filteredBusinesses;
    setNavTick(t => t + 1);
  }, [filteredBusinesses]);


  // Build subcategory name → icon name map
  const subcategoryIconMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const sub of subcategories) {
      const icon = (sub as { icon?: string | null }).icon;
      if (icon) map[sub.name_fr] = icon;
    }
    return map;
  }, [subcategories]);

  const buildMapPoiItems = useCallback((businesses: Business[], guardDesktop: boolean): PoiMapItem[] => {
    if (guardDesktop && !hasKnownLocation) return [];
    if (!guardDesktop && !isSubDesktop) return [];
    const center = mapCenterForResults;
    const maxRadiusKm = neighborhoodCoords ? 2 : 60;
    const effectiveCity = effectiveCityForMap || null;
    return businesses
      .filter(b => {
        const isWebOnly = (b.engagements || []).some((e) => {
          const n = e.toLowerCase().trim();
          return n === "web only" || n === "logistique:web only" || n.endsWith(":web only");
        });
        if (isWebOnly) return false;
        if (!b.latitude || !b.longitude) return false;
        if (b.latitude < 21 || b.latitude > 36.5 || b.longitude < -17.5 || b.longitude > -1) return false;
        if (center) {
          if (haversineKm(center.lat, center.lng, b.latitude, b.longitude) > maxRadiusKm) return false;
        } else if (guardDesktop && effectiveCity) {
          if (!b.city || normalizeText(b.city) !== normalizeText(effectiveCity)) return false;
        }
        return true;
      })
      .slice(0, 300)
      .map(b => ({
        id: b.id,
        name: b.name,
        latitude: b.latitude,
        longitude: b.longitude,
        images: b.images,
        city: b.city,
        neighborhood: b.neighborhood,
        rating: b.rating,
        avgOn20: b.computed_rating ?? b.rating ?? null,
        totalReviews: b.total_review_count ?? 0,
        subcategory: b.categories?.[0] || null,
      }));
  }, [hasKnownLocation, isSubDesktop, mapCenterForResults, neighborhoodCoords, effectiveCityForMap]);

  // Fetch ALL city businesses for map markers (independent of pagination)
  const [allCityMapBusinesses, setAllCityMapBusinesses] = useState<Business[]>([]);
  useEffect(() => {
    if (!effectiveCityForMap) {
      setAllCityMapBusinesses([]);
      return;
    }
    let cancelled = false;
    const fetchAll = async () => {
      const selectFields = "id, name, city, main_category, categories, services, engagements, latitude, longitude, images, neighborhood, rating, computed_rating, total_review_count, wtuce_status, priority_score";
      const all: Business[] = [];
      let offset = 0;
      while (true) {
        const { data } = await supabase
          .from("businesses")
          .select(selectFields)
          .eq("is_active", true)
          .ilike("city", effectiveCityForMap)
          .range(offset, offset + MAP_FETCH_PAGE_SIZE - 1);
        if (!data || data.length === 0) break;
        all.push(...(data as unknown as Business[]));
        if (data.length < MAP_FETCH_PAGE_SIZE) break;
        offset += MAP_FETCH_PAGE_SIZE;
      }
      if (!cancelled) setAllCityMapBusinesses(all as Business[]);
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [effectiveCityForMap]);

  // Fetch ALL search results (beyond current page) when "Voir tous" is toggled
  const [allSearchMapBusinesses, setAllSearchMapBusinesses] = useState<Business[]>([]);
  useEffect(() => {
    setAllSearchMapBusinesses([]);
  }, [searchQuery, spokenText, language]);
  useEffect(() => {
    // Preload the full map pool as soon as we know there are more results than the current page,
    // so the "Tous" toggle on the Results tab shows every marker instantly (no wait on click).
    if (!totalCount || totalCount <= filteredBusinesses.length) return;
    if (allSearchMapBusinesses.length >= totalCount) return;
    let cancelled = false;
    (async () => {
      const useSubcatBypass = subcategoryNamesFromUrl.length > 0 && !!cityFromUrl;
      const { data, error } = await supabase.functions.invoke<SearchResult>("business-search", {
        body: {
          query: useSubcatBypass ? undefined : (searchQuery.trim() || categoryFromUrl || undefined),
          spoken: useSubcatBypass ? undefined : (spokenText || searchQuery.trim() || undefined),
          language: language,
          pageSize: totalCount,
          offset: 0,
          compact: "card",
          ...(useSubcatBypass
            ? { subcategoryNames: subcategoryNamesFromUrl, city: cityFromUrl }
            : (cityFromUrl ? { city: cityFromUrl } : {})),
        }
      });
      if (cancelled || error || !data) return;
      setAllSearchMapBusinesses((data.businesses || []) as Business[]);
    })();
    return () => { cancelled = true; };
  }, [totalCount, filteredBusinesses.length, allSearchMapBusinesses.length, searchQuery, spokenText, language, categoryFromUrl, cityFromUrl, subcategoryNamesFromUrl]);

  // Pool used for "Voir tous": full results when fetched, otherwise current page.
  // When the AI panel produced a refined dedicated search (e.g. "artisans à proximité"),
  // mirror that refined set on the map so markers match the visible AI results.
  // When AI has produced an assistant answer with cited businesses (in **bold**),
  // restrict the map to those exact cited results so markers match what the user reads.
  const aiCitedMapPool = useMemo(() => {
    const lastAssistant = [...aiChat].reverse().find((m) => m.role === "assistant")?.content;
    if (!lastAssistant) return [] as Business[];
    const cited = extractCitedBusinesses(lastAssistant, aiInlineBusinessPool);
    return cited as unknown as Business[];
  }, [aiChat, aiInlineBusinessPool]);

  const searchMapPool = useMemo(() => {
    const isAiTab = activeTab === "ai" || showAiPopup;
    // "Tous" toggle wins everywhere.
    if (showAllSearchMarkers) {
      return allSearchMapBusinesses.length > filteredBusinesses.length
        ? allSearchMapBusinesses
        : filteredBusinesses;
    }
    // AI tab: map reflects the AI conversation (cited / refined pools).
    if (isAiTab) {
      if (aiCitedMapPool.length > 0) return aiCitedMapPool;
      if (aiRefinementBusinessPool.length > 0) return aiRefinementBusinessPool;
    }
    // Results tab (and any other tab): always show the plain search results.
    return filteredBusinesses;
  }, [activeTab, showAiPopup, aiCitedMapPool, aiRefinementBusinessPool, showAllSearchMarkers, allSearchMapBusinesses, filteredBusinesses]);
  const hasActiveSearchContext = !!searchQuery.trim() || !!categoryFromUrl || totalCount !== null;
  const frontStructurePool = useMemo(() => {
    if (hasActiveSearchContext) return searchMapPool;
    return allCityMapBusinesses.length > 0 ? allCityMapBusinesses : filteredBusinesses;
  }, [hasActiveSearchContext, searchMapPool, allCityMapBusinesses, filteredBusinesses]);


  // "Tous" tab: show search results only (desktop) — capped to 20 unless "Voir tous" is toggled
  const mapPoiItemsSearch: PoiMapItem[] = useMemo(() => {
    const items = buildMapPoiItems(searchMapPool, true);
    return showAllSearchMarkers ? items : items.slice(0, 20);
  }, [buildMapPoiItems, searchMapPool, showAllSearchMarkers]);

  // Full (un-sliced) map pool used by the proximity filter so the markers stay
  // in sync with the result cards even when "Tous" is not toggled.
  const allSearchMapPoiItems: PoiMapItem[] = useMemo(() => {
    return buildMapPoiItems(allSearchMapBusinesses.length > 0 ? allSearchMapBusinesses : searchMapPool, true);
  }, [buildMapPoiItems, allSearchMapBusinesses, searchMapPool]);

  // "Tous" tab: mobile/tablet
  const mobileMapPoiItems: PoiMapItem[] = useMemo(() => {
    const items = buildMapPoiItems(searchMapPool, false);
    return showAllSearchMarkers ? items : items.slice(0, 20);
  }, [buildMapPoiItems, searchMapPool, showAllSearchMarkers]);

  // Helper: sort and slice for front structure category filtering
  const buildFsCategoryItems = useCallback((guardDesktop: boolean): PoiMapItem[] => {
    if (!fsFilterSubcategories) return [];
    const matching = frontStructurePool.filter(b =>
      ((b.main_category && fsFilterSubcategories.has(b.main_category)) ||
       b.categories?.some((cat: string) => fsFilterSubcategories.has(cat))) &&
      businessMatchesFsServices(b)
    );
    matching.sort((a, b) => {
      const aVerified = a.wtuce_status === 'verified' ? 0 : 1;
      const bVerified = b.wtuce_status === 'verified' ? 0 : 1;
      if (aVerified !== bVerified) return aVerified - bVerified;
      const aCount = a.total_review_count ?? 0;
      const bCount = b.total_review_count ?? 0;
      const aRating = aCount >= 10 ? (a.computed_rating ?? a.rating ?? -1) : -1;
      const bRating = bCount >= 10 ? (b.computed_rating ?? b.rating ?? -1) : -1;
      return bRating - aRating;
    });
    const sliced = showAllSearchMarkers ? matching : matching.slice(0, 20);
    return buildMapPoiItems(sliced, guardDesktop);
  }, [fsFilterSubcategories, fsFilterServices, frontStructurePool, buildMapPoiItems, showAllSearchMarkers]);

  const fsFilterMatchesUrlSubcats = useMemo(() => {
    if (!fsFilterSubcategories || subcategoryNamesFromUrl.length === 0) return false;
    return subcategoryNamesFromUrl.every((name) => fsFilterSubcategories.has(name));
  }, [fsFilterSubcategories, subcategoryNamesFromUrl]);

  // Total matching count for the active FS category tab (full pool, before slicing)
  const fsMatchingCount = useMemo(() => {
    if (!fsFilterSubcategories) return 0;
    if (fsFilterMatchesUrlSubcats && totalCount !== null) return totalCount;
    return frontStructurePool.filter(b =>
      ((b.main_category && fsFilterSubcategories.has(b.main_category)) ||
       b.categories?.some((cat: string) => fsFilterSubcategories.has(cat))) &&
      businessMatchesFsServices(b)
    ).length;
  }, [fsFilterSubcategories, fsFilterServices, frontStructurePool, fsFilterMatchesUrlSubcats, totalCount]);

  // Desktop map items
  const mapPoiItems: PoiMapItem[] = useMemo(() => {
    if (aiCitedMapPool.length > 0 || aiRefinementBusinessPool.length > 0) return mapPoiItemsSearch;
    if (!fsFilterSubcategories) return mapPoiItemsSearch;
    return buildFsCategoryItems(true);
  }, [aiCitedMapPool.length, aiRefinementBusinessPool.length, mapPoiItemsSearch, fsFilterSubcategories, buildFsCategoryItems]);

  // Mobile/tablet map items
  const mobileMapPoiItemsFinal: PoiMapItem[] = useMemo(() => {
    if (aiCitedMapPool.length > 0 || aiRefinementBusinessPool.length > 0) return mobileMapPoiItems;
    if (!fsFilterSubcategories) return mobileMapPoiItems;
    return buildFsCategoryItems(false);
  }, [aiCitedMapPool.length, aiRefinementBusinessPool.length, mobileMapPoiItems, fsFilterSubcategories, buildFsCategoryItems]);

  // The top-ranked business ID for Gold marker (always highlight #1)
  const fsTopBusinessId: string | null = useMemo(() => {
    const items = mapPoiItems.length > 0 ? mapPoiItems : mobileMapPoiItemsFinal;
    return items[0]?.id || null;
  }, [mapPoiItems, mobileMapPoiItemsFinal]);

  const { tabs: mobileFrontTabs } = useFrontStructureTabs(effectiveCityForMap || null);

  useEffect(() => {
    const label = (labelFromUrl || "").replace(/^#+/, "").trim().toLowerCase();
    const key = `${effectiveCityForMap || ""}|${label}`;
    if (!label || autoMobileFsLabelKeyRef.current === key || mobileFrontTabs.length === 0) return;

    const tab = mobileFrontTabs.find((t) => t.name.trim().toLowerCase() === label);
    if (!tab) return;

    autoMobileFsLabelKeyRef.current = key;
    setMobileFsTabId(tab.id);
    setMobileFsSubId(null);
    setMobileFsServices([]);
    setFsFilterSubcategories(new Set(tab.subcategoryNames));
    setFsFilterServices(null);
  }, [labelFromUrl, effectiveCityForMap, mobileFrontTabs]);




  useEffect(() => {
    if (isLoading) return;
    if (!selectedCity || selectedCity === "all") return;
    if (filteredBusinesses.length > 0) return;
    if (allBusinesses.length === 0) return;
    setSelectedCity("all");
    setIsGeoCityAutoSelected(false);
  }, [isLoading, selectedCity, filteredBusinesses.length, allBusinesses.length]);

  // Extract services from search results for inline filter bar (only is_filtered=true, respecting service_city_filters)
  // filteredServicesBySubcategory: subcategory name -> Set of service names where is_filtered=true
  // serviceCityLookup: service name -> list of allowed city names (empty array = allowed everywhere)
  const [filteredServicesBySubcategory, setFilteredServicesBySubcategory] = useState<Record<string, Set<string>>>({});
  const [allFilteredServiceNames, setAllFilteredServiceNames] = useState<Set<string>>(new Set());
  const [serviceCityLookup, setServiceCityLookup] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const fetchServiceCityData = async () => {
      const [servicesRes, filtersRes, citiesRes, subcatsRes] = await Promise.all([
        supabase.from("services").select("id, name_fr, subcategory_id").eq("is_active", true).eq("is_filtered", true),
        supabase.from("service_city_filters").select("service_id, city_id"),
        supabase.from("cities").select("id, name_fr").eq("is_active", true),
        supabase.from("subcategories").select("id, name_fr"),
      ]);

      const services = servicesRes.data || [];
      const filters = filtersRes.data || [];
      const cities = citiesRes.data || [];
      const subcats = subcatsRes.data || [];

      const cityIdToName: Record<string, string> = {};
      for (const c of cities) cityIdToName[c.id] = c.name_fr;
      const serviceIdToName: Record<string, string> = {};
      for (const s of services) serviceIdToName[s.id] = s.name_fr;
      const subcatIdToName: Record<string, string> = {};
      for (const sc of subcats) subcatIdToName[sc.id] = sc.name_fr;

      // Build per-subcategory lookup: subcategory name -> Set of filtered service names
      const bySubcat: Record<string, Set<string>> = {};
      for (const s of services) {
        const subcatName = subcatIdToName[s.subcategory_id];
        if (subcatName) {
          if (!bySubcat[subcatName]) bySubcat[subcatName] = new Set();
          bySubcat[subcatName].add(s.name_fr);
        }
      }

      // Build lookup: service name -> city names where it's allowed
      const lookup: Record<string, string[]> = {};
      for (const s of services) lookup[s.name_fr] = lookup[s.name_fr] || [];
      for (const f of filters) {
        const svcName = serviceIdToName[f.service_id];
        const cityName = cityIdToName[f.city_id];
        if (svcName && cityName) {
          if (!lookup[svcName].includes(cityName)) lookup[svcName].push(cityName);
        }
      }
      setAllFilteredServiceNames(new Set(services.map(s => s.name_fr)));
      setFilteredServicesBySubcategory(bySubcat);
      setServiceCityLookup(lookup);
    };
    fetchServiceCityData();
  }, []);

  // Populate service filters from taxonomy + direct DB counts (not from FTS results)
  const [searchServiceFilters, setSearchServiceFilters] = useState<{ name: string; count: number }[]>([]);
  
  useEffect(() => {
    const effectiveSubcategory = selectedSubcategoryFilter || detectedSubcategory;
    if (!effectiveSubcategory || !searchQuery.trim()) {
      setSearchServiceFilters([]);
      return;
    }
    
    // Get allowed service names from taxonomy for this subcategory
    const allowedNames = filteredServicesBySubcategory[effectiveSubcategory];
    if (!allowedNames || allowedNames.size === 0) {
      setSearchServiceFilters([]);
      return;
    }

    const effectiveCity = (selectedCity && selectedCity !== "all") ? selectedCity : detectedCity;

    const fetchServiceCounts = async () => {
      let query = supabase
        .from("businesses")
        .select("services")
        .eq("is_active", true)
        .contains("categories", [effectiveSubcategory]);
      
      if (effectiveCity) {
        query = query.ilike("city", effectiveCity);
      }

      const { data } = await query.limit(1000);
      if (!data) return;

      const countMap: Record<string, number> = {};
      for (const b of data) {
        if (b.services) {
          for (const s of b.services as string[]) {
            if (!allowedNames.has(s)) continue;
            // Respect city restrictions from service_city_filters
            const allowedCities = serviceCityLookup[s];
            if (allowedCities && allowedCities.length > 0 && effectiveCity) {
              if (!allowedCities.some(c => c.toLowerCase() === effectiveCity.toLowerCase())) continue;
            }
            countMap[s] = (countMap[s] || 0) + 1;
          }
        }
      }
      
      setSearchServiceFilters(
        Object.entries(countMap)
          .filter(([, count]) => count >= 1)
          .sort((a, b) => a[0].localeCompare(b[0], "fr"))
          .map(([name, count]) => ({ name, count }))
      );
    };
    fetchServiceCounts();
  }, [searchQuery, selectedCity, detectedCity, selectedSubcategoryFilter, detectedSubcategory, filteredServicesBySubcategory, serviceCityLookup]);

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
    
    // If all results belong to a single subcategory, use flat paginated grid instead of carousel
    if (keys.length <= 1) return null;
    
    // Sort groups: most results first, least results last
    const sortedKeys = keys.sort((a, b) => {
      return (groups[b]?.length || 0) - (groups[a]?.length || 0);
    });
    
    return sortedKeys.map(key => ({ subcategory: key, businesses: groups[key] }));
  }, [filteredBusinesses, detectedSubcategory]);

  // Paginate — server-side pagination via edge function
  // We request SERVER_PAGE_SIZE (21) from the server so that after the AI suggestion card takes 1 slot,
  // the user still sees 20 real business results per page.
  const serverTotalCount = totalCount ?? filteredBusinesses.length;
  // In pinIds mode, page 1 shows 23 businesses (AI suggestion card takes the 4th slot
  // → 24 cards total in the grid). Subsequent pages show ITEMS_PER_PAGE (20).
  
  const totalPages = useMemo(() => {
    if (pinIdsParam) {
      if (serverTotalCount <= PIN_PAGE1_SIZE) return 1;
      return 1 + Math.ceil((serverTotalCount - PIN_PAGE1_SIZE) / ITEMS_PER_PAGE);
    }
    if (serverTotalCount <= ITEMS_PER_PAGE) return 1;
    return Math.ceil(serverTotalCount / ITEMS_PER_PAGE);
  }, [serverTotalCount, pinIdsParam]);
  // With server-side pagination, filteredBusinesses already contains only the current page's results
  const paginatedBusinesses = useMemo(() => {
    if (pinIdsParam) {
      if (currentPage === 1) return filteredBusinesses.slice(0, PIN_PAGE1_SIZE);
      const start = PIN_PAGE1_SIZE + (currentPage - 2) * ITEMS_PER_PAGE;
      return filteredBusinesses.slice(start, start + ITEMS_PER_PAGE);
    }
    return filteredBusinesses.slice(0, ITEMS_PER_PAGE);
  }, [filteredBusinesses, pinIdsParam, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, searchQuery, selectedCategoryFilter, selectedSubcategoryFilter, selectedServiceFilter]);

  // Fetch gammes, badges, subcategories, badge_subcategories + TTS intro phrase on mount
  useEffect(() => {
    Promise.all([
      supabase.from("gammes").select("id, name_fr, color_hex, text_color_hex, sort_order"),
      supabase.from("badges").select("id, name_fr, color_hex, text_color_hex").order("sort_order", { ascending: true }),
      supabase.from("subcategories").select("id, name_fr, sort_order, icon, show_google_map").order("sort_order", { ascending: true }),
      supabase.from("badge_subcategories").select("badge_id, subcategory_id"),
      supabase.from("staff_notes").select("content").eq("key", "tts_intro_phrase").maybeSingle(),
      supabase.from("cities").select("id, name_fr, sort_order, latitude, longitude").eq("is_active", true).order("sort_order", { ascending: true }),
    ]).then(([gammesRes, badgesRes, subcatsRes, badgeSubcatsRes, ttsIntroRes, citiesRes]) => {
      if (gammesRes.data) setGammes(gammesRes.data);
      if (badgesRes.data) setBadges(badgesRes.data);
      if (subcatsRes.data) setSubcategories(subcatsRes.data);
      if (badgeSubcatsRes.data) setBadgeSubcategories(badgeSubcatsRes.data);
      if (ttsIntroRes.data?.content) setTtsIntroPhrase(ttsIntroRes.data.content);
      if (citiesRes.data) setCitiesWithPriority(citiesRes.data.map(c => ({ name: c.name_fr, id: c.id, priority: c.sort_order || 0, latitude: c.latitude, longitude: c.longitude })));
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const fetchId = ++latestFetchIdRef.current;
      if (pinIdsParam) {
        const orderedIds = pinIdsParam.split(",").map(s => s.trim()).filter(Boolean);
        if (orderedIds.length === 0) {
          setPinnedBusinesses([]);
          setAllBusinesses([]);
          setTotalCount(null);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setAiAnswerText("");
        setShowAiPopup(false);
        setDetectedSubcategory(null);
        setSelectedCategoryFilter(null);
        setSelectedSubcategoryFilter(null);
        setSelectedServiceFilter(null);
        setMoreFilterTimeSlots([]);
        setMoreFilterEngagements([]);
        setMoreFilterCommodites([]);
        setMoreFilterMatchingIds(null);

        let effectiveOrderedIds = orderedIds;
        const contextBadgeId = await resolvePinContextBadgeId();
        const contextCity = searchParams.get("city") || "";
        if (contextBadgeId && contextCity) {
          const { data: cityRow } = await supabase
            .from("cities")
            .select("id")
            .or(`name_fr.ilike.${contextCity},name_en.ilike.${contextCity},name_ar.ilike.${contextCity}`)
            .limit(1)
            .maybeSingle();
          const cityId = (cityRow as any)?.id || null;

          if (cityId) {
            const [docBadgeRes, ytBadgeRes] = await Promise.all([
              supabase.from("business_document_badges").select("document_id").eq("badge_id", contextBadgeId),
              supabase.from("business_youtube_video_badges").select("youtube_video_id").eq("badge_id", contextBadgeId),
            ]);
            let docIds = (docBadgeRes.data || []).map((r: any) => r.document_id);
            let ytIds = (ytBadgeRes.data || []).map((r: any) => r.youtube_video_id);

            const [docCityRes, ytCityRes] = await Promise.all([
              docIds.length
                ? supabase.from("business_document_cities").select("document_id").eq("city_id", cityId).in("document_id", docIds)
                : Promise.resolve({ data: [] as any[] }),
              ytIds.length
                ? supabase.from("business_youtube_video_cities").select("youtube_video_id").eq("city_id", cityId).in("youtube_video_id", ytIds)
                : Promise.resolve({ data: [] as any[] }),
            ]);
            docIds = (docCityRes.data || []).map((r: any) => r.document_id);
            ytIds = (ytCityRes.data || []).map((r: any) => r.youtube_video_id);

            const validBizIds = new Set<string>();
            if (docIds.length) {
              const { data } = await supabase
                .from("business_documents")
                .select("business_id")
                .in("id", docIds)
                .eq("business_is_active", true);
              (data || []).forEach((r: any) => r.business_id && validBizIds.add(r.business_id));
            }
            if (ytIds.length) {
              const { data } = await supabase
                .from("business_youtube_videos")
                .select("business_id")
                .in("id", ytIds)
                .eq("business_is_active", true);
              (data || []).forEach((r: any) => r.business_id && validBizIds.add(r.business_id));
            }
            if (validBizIds.size > 0) {
              effectiveOrderedIds = orderedIds.filter(id => validBizIds.has(id));
            }
          }
        }

        if (effectiveOrderedIds.length === 0) {
          if (fetchId !== latestFetchIdRef.current) return;
          setPinnedBusinesses([]);
          setAllBusinesses([]);
          setTotalCount(null);
          setSearchMessage("");
          setIsLoading(false);
          return;
        }

        const selectFields = "id, name, description, city, region, address, phone, whatsapp, skype, website, logo_url, images, main_category, categories, services, engagements, online_shop_url, presentation_mode, wtuce_status, is_regulated_activity, latitude, longitude, google_maps_url, rating, computed_rating, total_review_count, gamme_id, badge_id, hook_fr, hook_en, hook_ar, opening_hours, show_opening_hours, is_open_24h, vacation_dates, zone_chalandise, is_visible_locale, zone_city_ids, default_service, neighborhood, priority_score";
        const { data, error } = await supabase
          .from("businesses")
          .select(selectFields)
          .eq("is_active", true)
          .in("id", effectiveOrderedIds);

        if (fetchId !== latestFetchIdRef.current) return;
        if (error) {
          console.error("Error fetching pinned businesses:", error);
          setPinnedBusinesses([]);
          setAllBusinesses([]);
        } else {
          const byId: Record<string, Business> = {};
          (data as unknown as Business[] || []).forEach((b) => { byId[b.id] = { ...b, distance_km: null }; });
          const ordered = effectiveOrderedIds.map(id => byId[id]).filter(Boolean) as Business[];
          const pinnedCity = searchParams.get("hotelCity") || searchParams.get("t") || ordered[0]?.city || null;
          setPinnedBusinesses(ordered);
          setAllBusinesses(ordered);
          setTotalCount(null);
          setSearchMessage("");
          setDetectedCity(pinnedCity);
          setSelectedCity(pinnedCity || "all");
          setIsGeoCityAutoSelected(false);
          if (openBusinessParam) openCompactPanel({ id: openBusinessParam, name: ordered.find(b => b.id === openBusinessParam)?.name || "" } as any);
        }
        setIsLoading(false);
        return;
      }

      // Note: badgeIdParam no longer hijacks the Résultats search — the Hashtag
      // tab has its own independent content (HashtagTabContent).


      setPinnedBusinesses([]);

      if (!searchQuery.trim() && !categoryFromUrl && subcategoryNamesFromUrl.length === 0) {
        if (fetchId !== latestFetchIdRef.current) return;
        setAllBusinesses([]);
        setTotalCount(null);
        setSearchMessage("");
        setDetectedSubcategory(null);
        setSearchMode(null);
         setSynonymUsed(false);
         setPreciseMatch(false);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setAiAnswerText("");
      setShowAiPopup(false);
      setWarningDismissed(false);
      setOverlaySelectedBusiness(null);
      aiPopupShownRef.current = false;
      setDetectedSubcategory(null);
      setSynonymUsed(false);
      setPreciseMatch(false);
      setSearchMode(null);
      try {
        const useSubcatBypass = subcategoryNamesFromUrl.length > 0 && !!cityFromUrl;
        // Effective city = URL param, else geo-detected city (when geolocation is enabled).
        // This keeps results scoped to the user's current city even when no ?city= param is set.
        const effectiveCity = cityFromUrl || (geo.isEnabled && geo.detectedCity ? geo.detectedCity : "");

        // Natural-language proximity detection: "… à proximité de Riad X",
        // "… près de la Mamounia", etc. Strip the phrase, geo-anchor on the target.
        let prox: Awaited<ReturnType<typeof resolveProximityQuery>> = null;
        if (!useSubcatBypass) {
          try {
            prox = await resolveProximityQuery(searchQuery.trim(), { cityHint: effectiveCity });
          } catch (e) {
            console.warn("proximity resolution failed:", e);
          }
          if (fetchId !== latestFetchIdRef.current) return;
        }

        const baseQuery = useSubcatBypass ? undefined : (searchQuery.trim() || categoryFromUrl || undefined);
        // Use edge function for full-text search with server-side pagination
        const { data, error } = await supabase.functions.invoke<SearchResult>("business-search", {
          body: {
            query: prox ? prox.query : baseQuery,
            spoken: useSubcatBypass ? undefined : (spokenText || searchQuery.trim() || undefined),
            language: language,
            pageSize: SERVER_PAGE_SIZE,
            offset: 0,
            compact: "card",
            ...(useSubcatBypass ? { subcategoryNames: subcategoryNamesFromUrl, city: cityFromUrl } : (effectiveCity ? { city: effectiveCity } : {})),
            ...(prox ? { latitude: prox.latitude, longitude: prox.longitude, radiusKm: prox.radiusKm } : {}),
          }
        });

        if (fetchId !== latestFetchIdRef.current) return;
        if (error) throw error;
        
        if (data) {
          setSearchLevel(data.searchLevel || "");
          setSynonymUsed(!!data.synonymUsed);
          setPreciseMatch(!!data.preciseMatch);
          const safeDetectedSubcategory = data.detectedSubcategory || null;
          // Only use searchMode when explicitly set from back-office config
          const normalizedSearchMode = normalizeSearchMode(data.searchMode);

          const businesses = data.businesses || [];

          // Fallback: if engine didn't detect a subcategory, find the dominant one from results
          let fallbackSubcategory: string | null = null;
          if (!safeDetectedSubcategory && businesses.length > 0) {
            const subCounts: Record<string, number> = {};
            for (const b of businesses) {
              const sub = b.categories?.[0];
              if (sub) subCounts[sub] = (subCounts[sub] || 0) + 1;
            }
            const entries = Object.entries(subCounts).sort((a, b) => b[1] - a[1]);
            if (entries.length > 0) {
              const [topSub, topCount] = entries[0];
              // Auto-select if the dominant subcategory covers at least 40% of results
              if (topCount / businesses.length >= 0.4) {
                fallbackSubcategory = topSub;
              }
            }
          }
          
          const finalDetectedSubcategory = safeDetectedSubcategory || fallbackSubcategory || null;
          setDetectedSubcategory(finalDetectedSubcategory);
          setSearchMode(normalizedSearchMode);
           setDetectedCity(data.detectedCity || null);
           setDetectedNeighborhood(data.detectedNeighborhood || null);
           setDisambiguationType(data.disambiguationType || null);
           setDetectedCategory(data.detectedCategory || null);

          // When the fallback heuristic auto-selects a subcategory (not the backend),
          // treat results as precise to prevent the extra category fetch from diluting them
          if (fallbackSubcategory && !safeDetectedSubcategory && !data.preciseMatch) {
            setPreciseMatch(true);
          }

          // Auto-select category + subcategory when engine detected a subcategory
          if (finalDetectedSubcategory && businesses.length > 0) {
            // Derive parent category from a business that actually has the detected subcategory
            const matchingBusiness = businesses.find(b => 
              b.categories?.includes(finalDetectedSubcategory!)
            ) || businesses[0];
            const parentCategory = matchingBusiness?.main_category || null;
            // When synonym paired filters produced the results (mix of subcategory + service matches),
            // do NOT auto-select category or subcategory filters — they would hide cross-category service matches
            // Also skip auto-selection when:
            // 1. preciseMatch is true (service-based search) AND subcategory came from heuristic fallback
            // This prevents filtering out valid service matches that happen to be in a minority subcategory
            const isHeuristicFallbackWithPrecise = fallbackSubcategory && !safeDetectedSubcategory && data.preciseMatch;
            // When preciseMatch is true (e.g. service-level filtering like "Excursions Vélo"),
            // skip auto-selecting subcategory filter to prevent the direct DB fetch from
            // widening results (it would fetch ALL businesses in the subcategory, ignoring the service filter)
            // Also skip when the fallback heuristic auto-selected a subcategory (not the backend),
            // since auto-filtering would replace the precise FTS results with ALL businesses in that subcategory
            const isHeuristicFallback = fallbackSubcategory && !safeDetectedSubcategory;
            // Skip auto-filter for synonyms, heuristic fallbacks, conflict-merges, or preciseMatch with heuristic
            // Conflict merge means backend intentionally returned cross-category results (e.g. Poisson + Poissonnerie)
            // Also skip when results span multiple main_categories (cross-category service matches, e.g. "Céramique")
            // IMPORTANT: when server-side pagination is active, the backend already produced the correct page slice.
            // Re-applying auto-detected category/subcategory/service filters on the client would shrink the page
            // and desync the visible cards from the pagination counter.
            const resultMainCategories = new Set(businesses.map(b => b.main_category).filter(Boolean));
            const isMultiCategoryResult = resultMainCategories.size > 1;
            const isServerPaginated = typeof data.totalCount === "number";
            const shouldSkipAutoFilter = isServerPaginated || data.exactNameMatchIsolation || data.synonymUsed || data.intentSubcategoryConflict || isHeuristicFallbackWithPrecise || isHeuristicFallback || (data.preciseMatch && !safeDetectedSubcategory) || isMultiCategoryResult;
            setSelectedCategoryFilter(shouldSkipAutoFilter ? null : parentCategory);
            setSelectedSubcategoryFilter(shouldSkipAutoFilter ? null : finalDetectedSubcategory);
            // Auto-select detected service filter so the direct DB subcategory fetch
            // stays precise (e.g. "Céramique" within "Décoration" instead of all Décoration)
            setSelectedServiceFilter(shouldSkipAutoFilter ? null : (data.detectedService || null));

            // When synonyms produced cross-category results, reset city filter to "all"
            // to avoid filtering out results that don't match a leftover city from a previous search
            if (data.synonymUsed && !data.detectedCity) {
              setSelectedCity("all");
            } else if (data.detectedCity) {
              // Auto-select city when the search engine detected one from the query
              setSelectedCity(data.detectedCity);
              setIsGeoCityAutoSelected(false);
            } else if (!queryHasCountryScope && geo.isEnabled) {
              // Auto-select city if not detected and only one city in results
              const resultCities = [...new Set(businesses.map(b => b.city).filter(Boolean))];
              if (resultCities.length === 1) {
                setSelectedCity(resultCities[0]);
              }
            }
          } else if (categoryFromUrl && businesses.length > 0) {
              // Pre-select UI category filter from URL param (e.g. from voice search)
              setSelectedCategoryFilter(categoryFromUrl);
              setSelectedSubcategoryFilter(null);
              setSelectedServiceFilter(null);
          } else {
            // Reset category filter when search changes
            setSelectedCategoryFilter(null);
            setSelectedSubcategoryFilter(null);
            setSelectedServiceFilter(null);
            // Reset city filter if backend didn't detect a city, to prevent stale
            // city from a prior search from filtering out results (e.g. "Decathlon Travel" with city=null)
            if (!data.detectedCity) {
              setSelectedCity("all");
            } else {
              setSelectedCity(data.detectedCity);
              setIsGeoCityAutoSelected(false);
            }
          }
          setMoreFilterTimeSlots([]);
          setMoreFilterEngagements([]);
          setMoreFilterCommodites([]);
          setMoreFilterMatchingIds(null);

          // When user searched for something specific but got "recommended" fallback → show 0 results
          const isVoiceSearch = !!searchParams.get("spoken");
          const hasActiveQuery = !!searchQuery.trim();
          if ((isVoiceSearch || hasActiveQuery) && data.searchLevel === "recommended") {
            setAllBusinesses([]);
            setTotalCount(null);
            setSearchMessage("");
          } else {
            setAllBusinesses(data.businesses || []);
            setTotalCount(data.totalCount ?? null);
            setSearchMessage(data.message || "");

            // Auto-open business detail when exact name match found
            const biz = data.businesses || [];
            // Skip exact-match auto-open when user explicitly navigated to a hashtag filter
            if (biz.length >= 1 && searchQuery.trim() && !searchParams.get("badgeId")) {
              const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/s\b/g, "").trim();
              const qNorm = normalize(searchQuery);
              const exactMatch = biz.find((b: Business) => normalize(b.name) === qNorm);
              if (exactMatch) {
                openCompactPanel(exactMatch as any);
              }
            }

            // Save search to history
            if (searchQuery.trim()) {
              const categoryParam = searchParams.get("category") || undefined;
              const cityParam = data.detectedCity || searchParams.get("city") || undefined;
              saveSearch(searchQuery.trim(), cityParam, categoryParam);
            }
            
            // Auto-activate time slot when bundle has time_slots and current time matches
            if (data.bundleTimeSlots?.length && !searchParams.get("timeStart")) {
              const period = getCurrentTimePeriod();
              const periodToSlot: Record<TimePeriod, string> = {
                morning: "matinee",
                midday: "dejeuner",
                afternoon: "apres-midi",
                evening: "soiree",
                night: "nuit",
              };
              const currentSlot = periodToSlot[period];
              // Also check "diner" for evening (18-22h)
              const hour = new Date().getHours();
              const matchesSlot = data.bundleTimeSlots.includes(currentSlot) ||
                (hour >= 19 && hour < 23 && data.bundleTimeSlots.includes("diner"));
              
              if (matchesSlot) {
                const slotToHours: Record<string, [number, number]> = {
                  matinee: [7, 12],
                  dejeuner: [12, 14],
                  "apres-midi": [14, 18],
                  diner: [19, 23],
                  soiree: [19, 23],
                  nuit: [22, 6],
                };
                // Pick the best matching slot
                const bestSlot = data.bundleTimeSlots.find((s: string) => {
                  const [start, end] = slotToHours[s] || [0, 24];
                  return end > start ? (hour >= start && hour < end) : (hour >= start || hour < end);
                });
                if (bestSlot) {
                  const [start, end] = slotToHours[bestSlot];
                  setSearchParams(prev => {
                    const p = new URLSearchParams(prev);
                    p.set("timeStart", String(start));
                    p.set("timeEnd", String(end));
                    p.set("timeDayOffset", "0");
                    return p;
                  }, { replace: true });
                }
              }
            }
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
  }, [searchQuery, categoryFromUrl, language, urlT, pinIdsParam, badgeIdParam, subcatsParam, cityFromUrl, resolvePinContextBadgeId, geo.isEnabled, geo.detectedCity]);

  // Fetch label logos for search result businesses
  useEffect(() => {
    if (allBusinesses.length === 0) {
      setBusinessLabelLogos({});
      return;
    }
    const ids = allBusinesses.map(b => b.id);
    (async () => {
      const { data: blData } = await supabase
        .from("business_labels")
        .select("business_id, label_id")
        .in("business_id", ids);
      if (!blData || blData.length === 0) { setBusinessLabelLogos({}); return; }
      const labelIds = [...new Set(blData.map(bl => bl.label_id))];
      const { data: labelsData } = await supabase
        .from("labels" as any)
        .select("id, logo_url, image_url")
        .in("id", labelIds);
      if (!labelsData) { setBusinessLabelLogos({}); return; }
      const logoMap: Record<string, string> = {};
      type LabelRow = { id: string; logo_url?: string | null; image_url?: string | null };
      (labelsData as unknown as LabelRow[]).forEach((l) => {
        const url = l.logo_url || l.image_url;
        if (url) logoMap[l.id] = url;
      });
      const result: Record<string, string[]> = {};
      blData.forEach(bl => {
        const url = logoMap[bl.label_id];
        if (url) {
          if (!result[bl.business_id]) result[bl.business_id] = [];
          if (!result[bl.business_id].includes(url)) result[bl.business_id].push(url);
        }
      });
      setBusinessLabelLogos(result);
    })();
  }, [allBusinesses]);

  // Accurate subcategory counts for "Quel type précisément ?" disambiguation
  // (allBusinesses only contains the current page; we need totals across the full result set)
  const [disambigSubcatCounts, setDisambigSubcatCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const effectiveCat = selectedCategoryFilter || detectedCategory;
    const effectiveCity = (selectedCity && selectedCity !== "all") ? selectedCity : detectedCity;
    if (!effectiveCat) {
      setDisambigSubcatCounts({});
      return;
    }
    let cancelled = false;
    (async () => {
      let q = supabase
        .from("businesses")
        .select("categories")
        .eq("is_active", true)
        .eq("main_category", effectiveCat);
      if (effectiveCity) q = q.ilike("city", effectiveCity);
      const { data } = await q;
      if (cancelled || !data) return;
      const counts: Record<string, number> = {};
      for (const b of data) {
        if (b.categories) {
          for (const c of b.categories) counts[c] = (counts[c] || 0) + 1;
        }
      }
      setDisambigSubcatCounts(counts);
    })();
    return () => { cancelled = true; };
  }, [selectedCategoryFilter, detectedCategory, selectedCity, detectedCity]);






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
    const ratingOn20 = b.computed_rating ?? b.rating ?? null;
    if (ratingOn20 !== null) {
      parts.push(`noté ${ratingOn20.toFixed(1).replace('.', ',')} sur 20`);
    }

    // Distance (if geo enabled)
    if (geo.isEnabled && geo.coords && b.latitude && b.longitude) {
      const dist = haversineKm(geo.coords.lat, geo.coords.lng, b.latitude, b.longitude);
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


  const dismissOverlay = () => {
    setOverlayDismissing(true);
    setTimeout(() => {
      setShowResultsOverlay(false);
      setOverlayDismissing(false);
      // Scroll to top of page to show geo filters
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 400);
  };

  // Reset voice search flag when results load (no auto-speak, user clicks button instead)
  useEffect(() => {
    if (!isLoading && isVoiceSearchRef.current) {
      isVoiceSearchRef.current = false;
    }
  }, [isLoading]);



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



  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setIsGeoCityAutoSelected(false);
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

  const goToPage = async (page: number) => {
    setCurrentPage(page);
    requestAnimationFrame(() => {
      const el = resultsBarRef.current;
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 60;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    // When results are pinned (pinIds), all businesses are already loaded;
    // pagination must stay client-side to preserve coherence.
    if (pinIdsParam) {
      return;
    }

    // Compute server offset for the requested page
    const offset = (page - 1) * ITEMS_PER_PAGE;
    setIsLoading(true);
    try {
      const useSubcatBypass = subcategoryNamesFromUrl.length > 0 && !!cityFromUrl;
      const { data, error } = await supabase.functions.invoke<SearchResult>("business-search", {
        body: {
          query: useSubcatBypass ? undefined : (searchQuery.trim() || searchParams.get("category") || undefined),
          spoken: useSubcatBypass ? undefined : (searchParams.get("spoken") || undefined),
          language: language,
          pageSize: SERVER_PAGE_SIZE,
          offset,
          compact: "card",
          ...(useSubcatBypass ? { subcategoryNames: subcategoryNamesFromUrl, city: cityFromUrl } : (cityFromUrl ? { city: cityFromUrl } : {})),
        }
      });
      if (error) throw error;
      if (data) {
        setAllBusinesses(data.businesses || []);
        setTotalCount(data.totalCount ?? null);
      }
    } catch (e) {
      console.error("Pagination fetch failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const startResult = pinIdsParam
    ? (currentPage === 1 ? 1 : PIN_PAGE1_SIZE + (currentPage - 2) * ITEMS_PER_PAGE + 1)
    : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endResult = pinIdsParam
    ? Math.min(startResult + (currentPage === 1 ? PIN_PAGE1_SIZE : ITEMS_PER_PAGE) - 1, serverTotalCount)
    : Math.min(startResult + ITEMS_PER_PAGE - 1, serverTotalCount);
  const displayedResultsCount = serverTotalCount;

  // Front Structure filter: when a subcategory chip is active, restrict the
  // Results tab list to matching businesses (single page, no server pagination).
  // Skip entirely when the URL already drives the query via `subcats` (homepage
  // card): the server bypass is paginated (e.g. totalCount=190, page=21), and
  // applying a client-side FS filter on the loaded page would shrink the count
  // to the page size.
  const fsFilteredList = useMemo(() => {
    if (subcategoryNamesFromUrl.length > 0) return null;
    if (!fsFilterSubcategories && (!fsFilterServices || fsFilterServices.size === 0)) return null;
    // In pinIds mode, restrict FS filter to the pinned set and preserve pinIds order
    // (no re-sort). This keeps the grid in sync with the map toolbar pills.
    if (pinIdsParam) {
      return filteredBusinesses.filter(b =>
        (!fsFilterSubcategories ||
          (b.main_category && fsFilterSubcategories.has(b.main_category)) ||
          b.categories?.some((cat: string) => fsFilterSubcategories.has(cat))) &&
        businessMatchesFsServices(b)
      );
    }
    const matches = frontStructurePool.filter(b =>
      (!fsFilterSubcategories ||
        (b.main_category && fsFilterSubcategories.has(b.main_category)) ||
        b.categories?.some((cat: string) => fsFilterSubcategories.has(cat))) &&
      businessMatchesFsServices(b)
    );
    return [...matches].sort(sortWtuceAndRating);
  }, [subcategoryNamesFromUrl, pinIdsParam, fsFilterSubcategories, fsFilterServices, frontStructurePool, filteredBusinesses]);
  const resultsFilteredBusinesses = fsFilteredList ?? filteredBusinesses;
  const fsTotalPages = fsFilteredList ? Math.max(1, Math.ceil(fsFilteredList.length / ITEMS_PER_PAGE)) : 1;
  const fsPageStart = fsFilteredList ? (currentPage - 1) * ITEMS_PER_PAGE : 0;
  const resultsPaginatedBusinesses = fsFilteredList
    ? fsFilteredList.slice(fsPageStart, fsPageStart + ITEMS_PER_PAGE)
    : paginatedBusinesses;
  const resultsTotalPages = fsFilteredList ? fsTotalPages : totalPages;
  const resultsStartResult = fsFilteredList ? (fsFilteredList.length > 0 ? fsPageStart + 1 : 0) : startResult;
  const resultsEndResult = fsFilteredList ? Math.min(fsPageStart + ITEMS_PER_PAGE, fsFilteredList.length) : endResult;
  const resultsDisplayedCount = fsFilteredList ? fsFilteredList.length : displayedResultsCount;
  const stickyAiText = useMemo(
    () => aiAnswerText.replace(/^[-•]\s+/gm, "").replace(/^\d+[.)]\s+/gm, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/\n+/g, " "),
    [aiAnswerText]
  );
  const stickyAiWordCount = useMemo(
    () => stickyAiText.split(/\s+/).filter(Boolean).length,
    [stickyAiText]
  );
  const stickyAiAnimationKey = useMemo(
    () => `sticky4-ai-${stickyAiAnimationNonce}`,
    [stickyAiAnimationNonce]
  );
  const hotelSearchInfoForResults = (() => {
    if (hotelSearchPanel) return { city: hotelSearchPanel.city, checkIn: hotelSearchPanel.checkIn, checkOut: hotelSearchPanel.checkOut, adults: hotelSearchPanel.adults };
    const params = new URLSearchParams(window.location.search || searchParams.toString());
    const city = params.get("hotelCity");
    const checkIn = params.get("hotelCheckIn");
    const checkOut = params.get("hotelCheckOut");
    const adults = params.get("hotelAdults");
    if (city && checkIn && checkOut && adults) return { city, checkIn, checkOut, adults: parseInt(adults, 10) || 0 };
    return null;
  })();

  // Word-by-word animation disabled (Sticky 4 bar is disabled) — set immediately to avoid
  // ~22 state updates/sec that cause scroll jank in the left panel during AI loading
  useEffect(() => {
    if (!stickyAiText || isAiRegenerating) {
      setStickyAiVisibleWordIndex(-1);
      return;
    }
    setStickyAiVisibleWordIndex(Number.MAX_SAFE_INTEGER);
  }, [stickyAiAnimationNonce, stickyAiText, stickyAiWordCount, isAiRegenerating]);


  return (
    <div className={`min-h-screen ${activeTab === "youtube" ? "bg-transparent" : "bg-white"}`} style={{ overflowX: 'clip' }}>
      <Header compact variant={activeTab === "youtube" ? "city" : undefined} rightContent={
        <div data-tab-bar ref={tabBarRef} className="flex gap-0 overflow-x-auto scrollbar-hide whitespace-nowrap justify-start" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {[
            { key: "suggestions", icon: <Search className="h-4 w-4" />, label: language === "en" ? "Results" : language === "ar" ? "النتائج" : "Résultats", count: totalCount },
            { key: "ai", icon: <Sparkles className="h-4 w-4" />, label: "IA" },
            { key: "youtube", icon: <YouTubeIcon className="h-4 w-4 text-red-600" />, label: "Youtube" },
            ...(badgeIdParam && badgeLabelParam ? [{ key: "hashtag", label: badgeLabelParam, count: hashtagCount }] : []),
            { key: "poi", icon: <MapPin className="h-4 w-4" />, label: language === "en" ? "Points of Interest" : language === "ar" ? "أماكن مهمة" : "Lieux d'intérêt" },
            { key: "destinations", icon: <Compass className="h-4 w-4" />, label: language === "en" ? "Destinations" : language === "ar" ? "وجهات" : "Destinations" },
          ].map((tab) => {
            const isAiTab = tab.key === "ai";
            const isActive = isAiTab ? (activeTab === "ai" || showAiPopup) : activeTab === tab.key;
            return (
            <button
              key={tab.key}
              data-active-tab={isActive ? "true" : undefined}
              onClick={(e) => {
                resetPanelStates();
                setCompactPanelBusiness(null);
                setIsCompactPanelExpanded(false);
                setOverlaySelectedBusiness(null);
                setIsOverlayPanelExpanded(false);
                setShowAiPopup(false);
                 setActiveTab(tab.key as any);
                 if (tab.key === "suggestions") {
                   window.scrollTo({ top: 0, behavior: "smooth" });
                 }
                setHideResultsMap(false);
                setHidePoiMap(false);
                setHideDestMap(false);
                const btn = e.currentTarget;
                const container = btn.parentElement;
                if (container) {
                  const scrollLeft = btn.offsetLeft - container.clientWidth / 2 + btn.offsetWidth / 2;
                  container.scrollTo({ left: scrollLeft, behavior: "smooth" });
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors border-b-2 whitespace-nowrap ${
                isActive
                  ? (isAiTab ? "border-gold text-gold" : "border-primary text-primary")
                  : activeTab === "youtube" && tab.key !== "youtube"
                    ? "border-transparent text-white hover:text-white/80"
                    : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >

              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 text-[10px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 font-normal">
                  {tab.count}
                </span>
              )}
            </button>
            );
          })}

        </div>
      } />

      {/* Shared LocationPickerDialog — accessible from all tabs */}
      <LocationPickerDialog
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        coords={geo.coords}
        detectedCity={geo.confirmedAddress || geo.detectedCity}
        isEnabled={geo.isEnabled}
        isDetecting={geo.isDetecting}
        onUseCurrentPosition={() => {
          if (!geo.isEnabled) geo.accept();
        }}
        onConfirm={(confirmedCoords, address) => {
          geo.setManualLocation(confirmedCoords, address);
          if (citiesWithPriority.length > 0) {
            let nearest: string | null = null;
            let minDist = Infinity;
            for (const city of citiesWithPriority) {
              if (!city.latitude || !city.longitude) continue;
              const dist = haversineKm(confirmedCoords.lat, confirmedCoords.lng, city.latitude, city.longitude);
              if (dist < minDist) { minDist = dist; nearest = city.name; }
            }
            if (nearest && minDist <= 100) {
              setSelectedCity(nearest);
              setIsGeoCityAutoSelected(true);
            }
          }
        }}
        onDisableGeo={() => {
          try {
            localStorage.removeItem("geo_manual_coords");
            localStorage.removeItem("geo_manual_address");
          } catch { /* noop */ }
          geo.decline();
        }}
      />

      {/* Hidden AISearchAnswer instance — generates AI text for Sticky 4 (overlay disabled) */}
      {(() => {
        const cityForAi = searchParams.get("city") || "";
        const baseQuery = (spokenText || searchQuery || labelFromUrl || subcategoryNamesFromUrl.join(", ") || categoryFromUrl || "").trim();
        const aiQuery = baseQuery && cityForAi && !baseQuery.toLowerCase().includes(cityForAi.toLowerCase())
          ? `${baseQuery} à ${cityForAi}`
          : baseQuery;
        const shouldRender = !!aiQuery && !isLoading && filteredBusinesses.length > 0 && !aiAnswerText && (activeTab === "ai" || showAiPopup);
        if (!shouldRender) return null;
        return (
          <div className="hidden">
            <AISearchAnswer
              query={aiQuery}
              spokenText={spokenText || undefined}
              businesses={filteredBusinesses}
              isSearchLoading={isLoading}
              onAnswerReady={handleAiAnswerReady}
              externalRegenerateKey={aiRegenerateKey}
            />
          </div>
        );
      })()}

      {/* Warning Overlay — forces user to pick city + category */}
      {/* DÉSACTIVÉ temporairement — à réévaluer
      {!isLoading && !!disambiguationType && allBusinesses.length > 0 && !compactPanelBusiness && !showAiPopup && !warningDismissed && (
        <WarningOverlay
          allBusinesses={allBusinesses}
          citiesWithPriority={citiesWithPriority}
          selectedCity={selectedCity}
          detectedCity={detectedCity}
          selectedCategoryFilter={selectedCategoryFilter}
          detectedSubcategory={detectedSubcategory}
          detectedCategory={detectedCategory}
          searchQuery={searchQuery}
          spokenText={spokenText}
          onSelectCity={(city) => {
            setSelectedCity(city);
            setIsGeoCityAutoSelected(false);
            setCurrentPage(1);
            const next = new URLSearchParams(searchParams);
            next.set("city", city);
            setSearchParams(next, { replace: true });
            if (selectedCategoryFilter || detectedSubcategory || detectedCategory) {
              setWarningDismissed(true);
            }
          }}
          onSelectCategory={(cat) => {
            setSelectedCategoryFilter(cat);
            if ((selectedCity && selectedCity !== "all") || detectedCity) {
              setWarningDismissed(true);
            }
          }}
          onClose={() => setWarningDismissed(true)}
        />
      )}
      */}


      {/* AI Suggestion Overlay — fullscreen when triggered from ✨ button, inline when in the "Suggestion IA" tab */}
      {(showAiPopup || activeTab === "ai") && (() => {
        const isInline = activeTab === "ai" && !showAiPopup;
        const hasRightSidePanel = !!overlaySelectedBusiness || !!compactPanelBusiness;
        const shouldConstrainAiContent = hasRightSidePanel || (isInline && hasKnownLocation && !hideResultsMap);
        const closeAi = () => {
          if (isInline) {
            setActiveTab("suggestions");
          } else {
            setShowAiPopup(false);
          }
          setOverlaySelectedBusiness(null);
        };
        const closeToResults = () => {
          setShowAiPopup(false);
          setOverlaySelectedBusiness(null);
          setActiveTab("suggestions");
          setCurrentPage(1);
          setShowMobileMap(false);
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setTimeout(() => ensureResultsVisibleBelowSticky("smooth"), 350);
          }, 50);
        };
        return (
        <div className={isInline ? "relative w-full bg-white flex" : "fixed inset-0 z-[9990] flex bg-white animate-in fade-in duration-200"}>


          {/* Left panel: AI suggestion */}
          <div ref={overlayLeftPanelRef} className={`relative flex flex-col justify-center transition-all duration-500 ease-out ${hasRightSidePanel ? "w-1/2 border-r border-border" : (isInline && hasKnownLocation && !hideResultsMap ? "w-1/2" : "w-full")}`}>
          {/* Desktop close button */}
          <button
            onClick={closeAi}
            className="absolute top-6 right-6 p-2 rounded-full bg-black hover:bg-black/80 transition-colors z-10 hidden sm:block"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          {/* Inline → fullscreen expand button (desktop) */}
          {isInline && (
            <button
              onClick={() => setShowAiPopup(true)}
              className="absolute top-6 right-20 p-2 rounded-full bg-black hover:bg-black/80 transition-colors z-10 hidden sm:block"
              title={language === "en" ? "Expand" : language === "ar" ? "تكبير" : "Agrandir"}
              aria-label={language === "en" ? "Expand" : "Agrandir"}
            >
              <Maximize2 className="h-5 w-5 text-white" />
            </button>
          )}


          {/* AI text — scrollable center, wider */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4">
            {/* Top section: query + count + top "Voir les résultats" */}
            <div className="pt-16 sm:pt-14 pb-3 text-center">
              {/* Desktop CTA — hidden in inline AI tab */}
              {!isInline && (
                <button
                  onClick={closeToResults}
                  className="hidden sm:inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gold text-black text-sm font-semibold hover:bg-gold/90 transition-colors mb-4"
                >
                  {language === "en" ? "See results" : language === "ar" ? "عرض النتائج" : "Voir les résultats"}
                </button>
              )}
              {activeTab === "poi" ? (
                <>
                  <p className="text-muted-foreground text-sm">
                    {language === "en" ? "Points of interest" : language === "ar" ? "نقاط الاهتمام" : "Lieux d'intérêt"}
                  </p>
                  {(() => {
                    const effCity = selectedCity && selectedCity !== "all" ? selectedCity : detectedCity;
                    return effCity ? (
                      <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                        <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-secondary/15 text-secondary">📍 {effCity}</span>
                      </div>
                    ) : null;
                  })()}
                  <p className="text-gold font-semibold mt-2">
                    {allPois.length} {language === "en" ? "points of interest" : "lieux d'intérêt"}
                  </p>
                </>
              ) : activeTab === "destinations" ? (
                <>
                  <p className="text-muted-foreground text-sm">
                    {language === "en" ? "Destinations" : language === "ar" ? "الوجهات" : "Destinations"}
                  </p>
                  {(() => {
                    const effCity = selectedCity && selectedCity !== "all" ? selectedCity : detectedCity;
                    return effCity ? (
                      <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                        <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-secondary/15 text-secondary">📍 {effCity}</span>
                      </div>
                    ) : null;
                  })()}
                  <p className="text-gold font-semibold mt-2">
                    {allDestItems.length} {language === "en" ? "destinations" : "destinations"}
                  </p>
                </>
              ) : (
                <>
                  {activeTab === "ai" && (
                    <div className="flex items-center justify-center gap-2 mb-3 mt-1 sm:mt-2">
                      <button
                        onClick={() => setHideResultsMap(v => !v)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium shadow-lg hover:bg-foreground/90 transition-colors"
                      >
                        <Map className="h-4 w-4" />
                        {language === "en" ? "Map" : language === "ar" ? "خريطة" : "Carte"}
                      </button>
                      <button
                        onClick={() => {
                          if (hideResultsMap) setHideResultsMap(false);
                          setActiveTab("suggestions");
                          setTimeout(() => window.dispatchEvent(new CustomEvent("open-results-filters")), 0);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium shadow-lg hover:bg-foreground/90 transition-colors"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                        {language === "en" ? "Filters" : language === "ar" ? "فلاتر" : "Filtres"}
                      </button>
                    </div>
                  )}
                  <p className="text-muted-foreground text-sm mt-6">
                    {language === "en" ? "Search results for" : language === "ar" ? "نتائج البحث عن" : "Résultats de recherche pour"}
                  </p>

                  <p className="text-lg md:text-xl font-bold text-foreground mt-1">
                    {(() => {
                      const fallbackLabel = (labelFromUrl || badgeLabelParam || "").replace(/^#+/, "").trim();
                      const fallbackCity = (selectedCity && selectedCity !== "all" ? selectedCity : "") || cityFromUrlForThumbs || "";
                      const display = (spokenText || searchQuery) || [fallbackCity, fallbackLabel].filter(Boolean).join(" ");
                      return <>«&nbsp;{display}&nbsp;»</>;
                    })()}
                  </p>


                  <p className="text-primary font-semibold mt-2">
                    {displayedResultsCount} {language === "en" ? "establishments found" : language === "ar" ? "مؤسسة وجدت" : "établissements trouvés"}
                  </p>
                </>
              )}
            </div>

            {/* URL-driven subcategory chips (e.g. "Marrakech Restauration") —
                always visible in the IA/Suggestions tabs when the URL lists
                several subcategories, so the user can narrow the search. */}
            {(activeTab === "suggestions" || activeTab === "ai")
              && subcategoryNamesFromUrl.length > 1
              && !selectedSubcategoryFilter && (
              <div className="pb-4">
                <div className={`${shouldConstrainAiContent ? "max-w-3xl" : "max-w-none"} mx-auto text-center`}>
                  <p className="text-sm font-medium text-foreground mb-3">
                    {language === "en" ? "What are you looking for?" : language === "ar" ? "ماذا تبحث عنه؟" : "Que cherchez-vous ?"}
                  </p>
                  <HScroll className="flex overflow-x-auto gap-2 scrollbar-hide">
                    {subcategoryNamesFromUrl.map((name) => {
                      const count = subcatUrlCounts[name] ?? 0;
                      return (
                        <button
                          key={name}
                          onClick={() => {
                            setSelectedSubcategoryFilter(name);
                            setOverlaySelectedBusiness(null);
                            submitAiRefinement(name);
                            setTimeout(() => {
                              aiRefinementRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }, 100);
                          }}
                          className="shrink-0 px-4 py-2 rounded-full border border-border bg-card text-sm text-foreground hover:border-gold/50 hover:bg-gold/10 transition-colors whitespace-nowrap"
                        >
                          {name}
                          {count > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{count}</span>}
                        </button>
                      );
                    })}
                  </HScroll>
                </div>
              </div>
            )}

            {/* Catégorie principale uniquement — sous-catégories/services gérés par l'overlay Filtres.
                Masqué automatiquement si :
                - une seule catégorie principale dans les résultats
                - un service précis a été détecté/sélectionné (requête déjà fine)
                - une catégorie est déjà sélectionnée
                - la requête vient de l'URL avec subcategoryNamesFromUrl (géré par le bloc précédent) */}
            {(activeTab === "suggestions" || activeTab === "ai")
              && !selectedCategoryFilter
              && !selectedServiceFilter
              && subcategoryNamesFromUrl.length <= 1
              && (() => {
              const cats = [...new Set(allBusinesses.map(b => b.main_category).filter(Boolean))] as string[];
              if (cats.length <= 1) return null;

              // Filtre anti-non-discriminant : on retire les catégories qui couvrent >90% des résultats
              const total = allBusinesses.length;
              const catCounts: Record<string, number> = {};
              for (const b of allBusinesses) {
                if (b.main_category) catCounts[b.main_category] = (catCounts[b.main_category] || 0) + 1;
              }
              const discriminating = cats.filter(c => (catCounts[c] || 0) / total < 0.9);
              if (discriminating.length < 2) return null;

              return (
                <div className="pb-4">
                  <div className={`${shouldConstrainAiContent ? "max-w-3xl" : "max-w-none"} mx-auto text-center`}>
                    <p className="text-sm font-medium text-foreground mb-3">
                      {language === "en" ? "What are you looking for?" : language === "ar" ? "ماذا تبحث عنه؟" : "Que cherchez-vous ?"}
                    </p>
                    <HScroll className="flex overflow-x-auto gap-2 scrollbar-hide">
                      {discriminating.slice(0, 8).map(cat => (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategoryFilter(cat);
                            setOverlaySelectedBusiness(null);
                            setPrevAiAnswerText(aiAnswerText);
                            setAiAnswerText("");
                            setAiRegenerateKey(k => k + 1);
                          }}
                          className="shrink-0 px-4 py-2 rounded-full border border-border bg-card text-sm text-foreground hover:border-gold/50 hover:bg-gold/10 transition-colors whitespace-nowrap"
                        >
                          {cat}
                          <span className="ml-1.5 text-xs text-muted-foreground">{catCounts[cat]}</span>
                        </button>
                      ))}
                    </HScroll>
                  </div>
                </div>
              );
            })()}

            {activeTab === "suggestions" && (!selectedCity || selectedCity === "all") && !detectedCity && (
              <div className="pb-4">
                <div className={`${shouldConstrainAiContent ? "max-w-3xl" : "max-w-none"} mx-auto text-center`}>
                  <p className="text-sm font-medium text-foreground mb-3">
                    {language === "en" ? "Where are you looking?" : language === "ar" ? "أين تبحث؟" : "Où le cherchez-vous ?"}
                  </p>
                  <div className="flex overflow-x-auto gap-2">
                    {availableCities.slice(0, 10).map((city) => (
                      <button
                        key={city}
                        onClick={() => {
                          setSelectedCity(city);
                          setIsGeoCityAutoSelected(false);
                          setOverlaySelectedBusiness(null);
                          // Regenerate AI text with the new city filter
                          setPrevAiAnswerText(aiAnswerText);
                                setAiAnswerText("");
                          setAiRegenerateKey(k => k + 1);
                        }}
                        className="shrink-0 px-4 py-2 rounded-full border border-border bg-card text-sm text-foreground hover:border-gold/50 hover:bg-gold/10 transition-colors whitespace-nowrap"
                      >
                        <MapPin className="h-3.5 w-3.5 inline mr-1.5 text-muted-foreground" />
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Service filters when subcategory is known — COMMENTED OUT
            {activeTab === "suggestions" && (() => {
              const effectiveSub = selectedSubcategoryFilter || detectedSubcategory;
              const effectiveCity = (selectedCity && selectedCity !== "all") ? selectedCity : detectedCity;
              if (!effectiveSub || !effectiveCity || searchServiceFilters.length === 0) return null;
              return (
                <div className="max-w-3xl mx-auto pb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2 text-center">
                    {language === "en" ? "Filter by service" : language === "ar" ? "تصفية حسب الخدمة" : "Filtrer par service"}
                  </p>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {searchServiceFilters.map(sf => {
                      const isActive = selectedServiceFilter === sf.name;
                      return (
                        <button
                          key={sf.name}
                          onClick={() => {
                            setSelectedServiceFilter(isActive ? null : sf.name);
                            setOverlaySelectedBusiness(null);
                            setPrevAiAnswerText(aiAnswerText);
                                setAiAnswerText("");
                            setAiRegenerateKey(k => k + 1);
                          }}
                          className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                            isActive
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                          }`}
                        >
                          {sf.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()} */}

            <div className={`${shouldConstrainAiContent ? "max-w-3xl" : "max-w-none"} mx-auto`}>
              <div className="text-xs sm:text-base text-foreground/80 leading-relaxed whitespace-pre-line">
                {(() => {
                  const currentAiText = activeTab === "poi" ? poiAiText : activeTab === "destinations" ? destAiText : aiAnswerText;
                  const isCurrentLoading = activeTab === "poi" ? isPoiAiLoading : activeTab === "destinations" ? isDestAiLoading : (filteredBusinesses.length > 0 && (!aiAnswerText || isAiRegenerating));
                  if (isCurrentLoading) {
                    const fallbackPrev = (activeTab !== "poi" && activeTab !== "destinations") ? prevAiAnswerText : "";
                    return (
                      <>
                        {fallbackPrev && (
                          <div className="opacity-60">
                            {parseInline(
                              fallbackPrev,
                              aiInlineBusinessPool,
                              () => {},
                              "ai-popup-prev"
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-3 py-8 justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-gold" />
                          <span className="text-sm italic text-muted-foreground">
                            {language === "en" ? "Generating suggestion…" : language === "ar" ? "جاري إنشاء الاقتراح…" : "Génération de la suggestion…"}
                          </span>
                        </div>
                      </>
                    );
                  }
                  if (!currentAiText) {
                    return (
                      <div className="flex items-center gap-3 py-8 justify-center">
                        <span className="text-sm italic text-muted-foreground">
                          {language === "en" ? "No suggestion available" : "Aucune suggestion disponible"}
                        </span>
                      </div>
                    );
                  }
                  const isTTSActive = ttsStatus === "playing" && ttsSpokenWordIndex >= 0;
                  const karaokeTarget = isTTSActive ? ttsSpokenWordIndex - ttsIntroWordCountRef.current : -1;
                  // Build data source for link matching based on active tab
                  const linkDataSource: AIBusinessData[] = activeTab === "poi"
                    ? allPois.map(p => ({ id: p.id, name: p.name, city: p.city || "", main_category: null, categories: null, hook_fr: null, rating: p.rating ?? null, wtuce_status: null, images: p.images ?? null, neighborhood: p.neighborhood ?? null }))
                    : activeTab === "destinations"
                    ? allDestItems.map(d => ({ id: d.id, name: language === "en" && d.name_en ? d.name_en : d.name_fr, city: "", main_category: null, categories: null, hook_fr: d.hook, rating: null, wtuce_status: null, images: d.images ?? (d.image_url ? [d.image_url] : null) }))
                    : aiInlineBusinessPool;
                  return parseInline(
                    currentAiText,
                    linkDataSource,
                    (b: AIBusinessData) => {
                      if (activeTab === "poi") {
                        // For POI, close overlay and open POI business panel
                        setShowAiPopup(false);
                        setOverlaySelectedBusiness(null);
                        openCompactPanel(b);
                      } else if (activeTab === "destinations") {
                        // For destinations, close overlay and navigate to destination
                        setShowAiPopup(false);
                        setOverlaySelectedBusiness(null);
                        // Destination click handled by DestinationsTabContent
                      } else {
                        setShowAiPopup(false);
                        setOverlaySelectedBusiness(null);
                        openCompactPanel(b);
                      }
                    },
                    "ai-popup",
                    isTTSActive
                      ? { wordIndex: 0, target: karaokeTarget, mode: "karaoke" as const }
                      : undefined,
                    activeTab !== "poi" && activeTab !== "destinations"
                      ? (b) => setHoveredResultId(b ? b.id : null)
                      : undefined
                  );
                })()}
              </div>

              {/* Horizontal scroll of cited businesses */}
              {activeTab !== "poi" && activeTab !== "destinations" && (() => {
                const currentAiText = aiAnswerText;
                if (!currentAiText) return null;
                const cited = extractCitedBusinesses(currentAiText, aiInlineBusinessPool);
                if (cited.length === 0) return null;
                return (
                  <div className="mt-6 -mx-4 sm:mx-0">
                    <div
                      className="flex gap-4 overflow-x-auto px-4 sm:px-0 pb-3 [scrollbar-width:thin]"
                      onWheel={(e) => {
                        const el = e.currentTarget;
                        if (e.deltaX !== 0) return;
                        if (el.scrollWidth <= el.clientWidth) return;
                        const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
                        const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
                        if (atStart || atEnd) return;
                        e.preventDefault();
                        el.scrollLeft += e.deltaY;
                      }}
                    >
                      {cited.map((b, idx) => {
                        const full = (aiInlineBusinessPool as unknown as Business[]).find(x => x.id === b.id);
                        if (!full) return null;
                        return (
                          <div key={b.id} className="shrink-0 w-64 sm:w-72">
                            <SearchResultCard
                              business={{ ...(full as any), engagements: [] }}
                              index={idx}
                              labelLogos={businessLabelLogos[b.id] || []}
                              distanceKm={getDistanceKm(full)}
                              onClick={() => {
                                setShowAiPopup(false);
                                setOverlaySelectedBusiness(null);
                                openCompactPanel(full as any);
                              }}
                              onMouseEnter={() => setHoveredResultId(b.id)}
                              onMouseLeave={() => setHoveredResultId(null)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}



              {/* Videos carousel — après le carousel de miniatures issu d'une sélection de sous-catégorie OU d'un affinement, AVANT "Affinez votre demande". */}
              {/* Désactivé temporairement dans l'onglet IA après la 1re demande
              {activeTab === "ai" && (() => {
                const hasRefined = aiChat.some((m) => m.role === "user");
                const hasSelection = !!(selectedSubcategoryFilter || selectedServiceFilter);
                if (!hasSelection && !hasRefined) return null;
                const effCity = (selectedCity && selectedCity !== "all" ? selectedCity : detectedCity) || cityFromUrlForThumbs || null;
                const effSub =
                  selectedSubcategoryFilter ||
                  detectedSubcategory ||
                  (subcategoryNamesFromUrl.length === 1 ? subcategoryNamesFromUrl[0] : null);
                const effService = selectedServiceFilter || null;
                if (!effCity || (!effSub && !effService)) return null;
                const badgeLabel = [effSub || effService, effCity].filter(Boolean).join(" · ");
                return (
                  <div className="mt-6">
                    <div className="px-1 mb-2">
                      <span
                        className="inline-flex items-center rounded-full bg-gold text-black px-3 py-1 text-xs font-semibold"
                        style={{ fontFamily: "'Josefin Sans', sans-serif" }}
                      >
                        {badgeLabel}
                      </span>
                    </div>
                    <SearchAIVideosCarousel
                      subcategoryNames={effSub ? [effSub] : []}
                      serviceName={effService}
                      city={effCity}
                      entryLabel={labelFromUrl}
                      onOpenBusiness={(b) => openCompactPanel(b as any)}
                    />
                  </div>
                );
              })()}
              */}

              {/* Liquid-glass Speaker (TTS) — placé sous le dernier carousel, AVANT "Affinez votre demande" */}
              {activeTab !== "poi" && activeTab !== "destinations" && aiAnswerText && !isAiRegenerating && (
                <div className="mt-8 flex justify-center">
                  <div className="relative flex items-center justify-center">
                    {/* Outer expanding glass ring */}
                    <div
                      className="absolute rounded-full animate-ping pointer-events-none backdrop-blur-2xl backdrop-saturate-150"
                      style={{
                        inset: "-14px",
                        background: "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
                        border: "1px solid hsl(var(--primary) / 0.3)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 32px hsl(var(--primary) / 0.2)",
                        animationDuration: "2.4s",
                      }}
                    />
                    {/* Mid pulse glass ring */}
                    <div
                      className="absolute rounded-full animate-pulse pointer-events-none backdrop-blur-xl"
                      style={{
                        inset: "-9px",
                        background: "linear-gradient(135deg, rgba(255,255,255,0.15), hsl(var(--primary) / 0.1))",
                        border: "1px solid rgba(255,255,255,0.25)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
                      }}
                    />
                    {/* Rotating conic accent (only when playing/loading) */}
                    {(ttsStatus === "playing" || ttsStatus === "loading") && (
                      <div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                          inset: "-4px",
                          background: "conic-gradient(from 0deg, transparent 0%, hsl(var(--primary)) 35%, hsl(var(--primary) / 0.5) 50%, transparent 70%)",
                          animation: "spin 2s linear infinite",
                          filter: "blur(0.5px)",
                        }}
                      />
                    )}
                    {/* Glass core button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (ttsStatus === "playing" || ttsStatus === "loading") {
                          ttsStop();
                          return;
                        }
                        const lastAssistant = [...aiChat].reverse().find(m => m.role === "assistant")?.content;
                        const sourceText = lastAssistant || aiAnswerText;
                        const cleanText = sourceText.replace(/\*{1,2}/g, "").replace(/^[-•]\s+/gm, "").replace(/^\d+[.)]\s+/gm, "");
                        const intro = ttsIntroPhrase ? `${ttsIntroPhrase}. ` : "";
                        ttsIntroWordCountRef.current = intro.trim().split(/\s+/).filter(Boolean).length;
                        voiceLoopRef.current = true;
                        ttsSpeak(intro + cleanText + " … Vous pouvez me poser une autre question.", undefined, true);
                      }}
                      className="relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center backdrop-blur-2xl backdrop-saturate-150 border border-white/30 transition-transform hover:scale-105"
                      style={{
                        background: "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.08))",
                        boxShadow: "0 8px 32px hsl(var(--primary) / 0.3), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)",
                      }}
                      title={language === "en" ? "Listen" : language === "ar" ? "استمع" : "Écouter"}
                    >
                      {/* Specular highlight */}
                      <span
                        className="absolute inset-1 rounded-full pointer-events-none"
                        style={{
                          background: "linear-gradient(160deg, rgba(255,255,255,0.4) 0%, transparent 45%)",
                        }}
                      />
                      {ttsStatus === "loading" ? (
                        <Loader className="relative h-5 w-5 md:h-6 md:w-6 animate-spin" style={{ color: "hsl(var(--primary))" }} />
                      ) : (ttsStatus === "playing") ? (
                        <VolumeX className="relative h-5 w-5 md:h-6 md:w-6" style={{ color: "hsl(var(--primary))" }} />
                      ) : (
                        <Volume2 className="relative h-5 w-5 md:h-6 md:w-6" style={{ color: "hsl(var(--primary))" }} />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Refinement chat — multi-turn "Affinez votre demande" */}

              {activeTab !== "poi" && activeTab !== "destinations" && aiAnswerText && !isAiRegenerating && (() => {

                const userTurns = aiChat.filter((m) => m.role === "user").length;
                const reachedCap = userTurns >= AI_CHAT_MAX_TURNS;
                return (
                  <div ref={aiRefinementRef} className="mt-8 pt-6 border-t border-border/60">
                    {/* Chat history */}
                    {aiChat.length > 0 && (
                      <div className="flex flex-col gap-4 mb-4">
                        {aiChat.map((m, idx) => (
                          <div key={idx} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                            {m.role === "user" ? (
                              <div data-ai-user-bubble className="max-w-[80%] rounded-2xl bg-primary text-primary-foreground px-4 py-2 text-sm">
                                {m.content}
                              </div>
                            ) : (
                              <div className="max-w-[90%] flex flex-col gap-4">
                                <div className="text-xs sm:text-base text-foreground/80 leading-relaxed whitespace-pre-line">
                                  {parseInline(
                                    m.content,
                                    aiInlineBusinessPool,
                                    (b: AIBusinessData) => {
                                      setShowAiPopup(false);
                                      setOverlaySelectedBusiness(null);
                                      openCompactPanel(b);
                                    },
                                    `ai-chat-${idx}`,
                                    undefined,
                                    (b) => setHoveredResultId(b ? b.id : null)
                                  )}
                                </div>
                                {m.clarify && m.clarify.options.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {m.clarify.options.map((opt) => (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => submitAiRefinement(opt.text)}
                                        disabled={aiChatLoading}
                                        className="rounded-full border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs sm:text-sm px-3 py-1.5 transition-colors disabled:opacity-50"
                                      >
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {(() => {
                                  if (m.clarify) return null;
                                  const cited = extractCitedBusinesses(m.content, aiInlineBusinessPool);
                                  if (cited.length === 0) return null;
                                  return (
                                    <div className="-mx-4 sm:mx-0">
                                      <div
                                        className="flex gap-4 overflow-x-auto px-4 sm:px-0 pb-3 [scrollbar-width:thin]"
                                        onWheel={(e) => {
                                          const el = e.currentTarget;
                                          if (e.deltaX !== 0) return;
                                          if (el.scrollWidth <= el.clientWidth) return;
                                          const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
                                          const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
                                          if (atStart || atEnd) return;
                                          e.preventDefault();
                                          el.scrollLeft += e.deltaY;
                                        }}
                                      >
                                        {cited.map((b, i) => {
                                          const full = (aiInlineBusinessPool as unknown as Business[]).find(x => x.id === b.id);
                                          if (!full) return null;
                                          return (
                                            <div key={`${idx}-${b.id}`} className="shrink-0 w-64 sm:w-72">
                                              <SearchResultCard
                                                business={{ ...(full as any), engagements: [] }}
                                                index={i}
                                                labelLogos={businessLabelLogos[b.id] || []}
                                                distanceKm={getDistanceKm(full)}
                                                onClick={() => {
                                                  setShowAiPopup(false);
                                                  setOverlaySelectedBusiness(null);
                                                  openCompactPanel(full as any);
                                                }}
                                                onMouseEnter={() => setHoveredResultId(b.id)}
                                                onMouseLeave={() => setHoveredResultId(null)}
                                              />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        ))}
                        {aiChatLoading && (
                          <div className="flex justify-start">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
                              <Loader2 className="h-4 w-4 animate-spin text-gold" />
                              {language === "en" ? "Thinking…" : language === "ar" ? "جارٍ التفكير…" : "Réflexion…"}
                            </div>
                          </div>
                        )}
                        {aiChatError && (
                          <p className="text-xs text-destructive text-center">{aiChatError}</p>
                        )}
                      </div>
                    )}

                    {/* Composer */}
                    {!reachedCap ? (
                      <>
                      <form
                        onSubmit={(e) => { e.preventDefault(); submitAiRefinement(); }}
                        className="flex items-end gap-2"
                      >
                        <textarea
                          value={aiChatInput}
                          onChange={(e) => setAiChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              submitAiRefinement();
                            }
                          }}
                          rows={1}
                          placeholder={
                            language === "en"
                              ? "Refine your request"
                              : language === "ar"
                              ? "حسّن طلبك"
                              : "Affinez votre demande"
                          }
                          disabled={aiChatLoading}
                          className="flex-1 min-h-[44px] max-h-32 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={aiChatLoading || !aiChatInput.trim()}
                          className="flex items-center justify-center w-14 h-14 rounded-xl transition-all hover:opacity-90 shrink-0 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ backgroundColor: "hsl(var(--primary))" }}
                          aria-label={language === "en" ? "Send" : "Envoyer"}
                          title={language === "en" ? "Send" : "Envoyer"}
                        >
                          {aiChatLoading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Send className="h-6 w-6 text-white" />}
                        </button>
                        <div className="relative flex items-center justify-center shrink-0">
                          <span className="absolute w-12 h-12 md:w-14 md:h-14 rounded-full border border-foreground/30 animate-[ripple_2.4s_ease-out_infinite] pointer-events-none" />
                          <span className="absolute w-12 h-12 md:w-14 md:h-14 rounded-full border border-foreground/20 animate-[ripple_2.4s_ease-out_0.6s_infinite] pointer-events-none" />
                          <span className="absolute w-12 h-12 md:w-14 md:h-14 rounded-full border border-foreground/10 animate-[ripple_2.4s_ease-out_1.2s_infinite] pointer-events-none" />
                          <button
                            type="button"
                            onClick={refineVoice.toggleRecording}
                            disabled={aiChatLoading || refineVoice.status === "processing"}
                            className={`relative z-10 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl transition-all border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] ${
                              refineVoice.status === "recording"
                                ? "bg-red-500 animate-pulse"
                                : refineVoice.status === "processing"
                                  ? "bg-black"
                                  : "bg-black hover:bg-black/90"
                            }`}
                            aria-label={language === "en" ? "Voice refinement" : "Affiner à la voix"}
                            title={language === "en" ? "Voice refinement" : "Affiner à la voix"}
                          >
                            {refineVoice.status === "processing" ? (
                              <Loader2 className="h-5 w-5 text-white animate-spin" />
                            ) : refineVoice.status === "recording" ? (
                              <MicOff className="h-5 w-5 text-white" />
                            ) : (
                              <Mic className="h-5 w-5 text-white" />
                            )}
                          </button>
                        </div>
                      </form>
                      {(refineVoice.status === "recording" || refineVoice.status === "processing") && (
                        <VoiceSearchPanel
                          liveTranscript={refineVoice.liveTranscript}
                          onClose={refineVoice.toggleRecording}
                          onFinish={refineVoice.finishRecording}
                          align="center"
                        />
                      )}
                      </>
                    ) : (
                      <p className="text-xs text-center text-muted-foreground italic">
                        {language === "en"
                          ? `Refinement limit reached (${AI_CHAT_MAX_TURNS} turns). Start a new search to continue.`
                          : `Limite d'affinement atteinte (${AI_CHAT_MAX_TURNS} échanges). Lancez une nouvelle recherche pour continuer.`}
                      </p>
                    )}
                    <p className="mt-2 text-[10px] text-center text-muted-foreground">
                      {language === "en"
                        ? `${userTurns}/${AI_CHAT_MAX_TURNS} refinements used`
                        : `${userTurns}/${AI_CHAT_MAX_TURNS} affinements utilisés`}
                    </p>
                  </div>
                );
              })()}



              {/* Adresse géolocalisée */}
              <div className="flex flex-col items-center gap-4 pt-14 pb-24">
                {geo.isEnabled && (geo.confirmedAddress || geo.detectedCity) && (
                  <p className="text-sm text-muted-foreground font-medium">
                    📍 {geo.confirmedAddress || geo.detectedCity}
                  </p>
                )}
              </div>


            </div>
          </div>
          </div>

          {/* Right panel: Sticky Google Map (inline AI tab only, mirrors Results tab) */}
          {isInline && hasKnownLocation && !overlaySelectedBusiness && !hideResultsMap && (
            <div className="w-1/2 sticky top-0 h-screen z-[50] overflow-hidden">
              <div className="relative h-full min-h-0">
                <PoiGoogleMap
                  pois={mapPoiItems}
                  selectedPoiId={null}
                  hoveredPoiId={hoveredResultId || null}
                  onPoiClick={(poiId) => {
                    const biz = filteredBusinesses.find(b => b.id === poiId) || allCityMapBusinesses?.find(b => b.id === poiId);
                    if (biz) openCompactPanel({ id: biz.id, name: biz.name } as any);
                  }}
                  center={mapCenterForResults}
                  fitToMarkers

                  userLocation={geo.isEnabled && geo.coords ? geo.coords : null}
                />

                <div className="absolute top-0 left-0 right-0 z-[80] flex flex-col">
                  <div className="relative z-10 flex items-center gap-3 px-3 py-3 bg-white/30 backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => setHideResultsMap(true)}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-black shadow-lg shrink-0"
                      aria-label={language === "en" ? "Hide map" : "Masquer la carte"}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <span className="flex-1 text-center text-sm font-medium text-black truncate">
                      {(() => {
                        const lastUserTurn = [...aiChat].reverse().find(m => m.role === "user")?.content;
                        const label = (lastUserTurn || searchQuery || "").trim();
                        return label;
                      })()}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent("open-generic-club-popup"))}
                        className="h-9 w-9 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
                        aria-label="Le Club OWM"
                      >
                        <Heart className="h-4 w-4 text-[#6050DC]" strokeWidth={2.5} />
                      </button>
                      <ShareButton
                        title={searchQuery || "Recherche"}
                        variant="dark"
                        className="shrink-0"
                      />
                    </div>
                  </div>
                  {(() => {
                    const total = totalCount ?? filteredBusinesses.length;
                    if (total <= 20) return null;
                    return (
                      <div className="flex items-center justify-center gap-2 px-3 pt-3 pb-2">
                        <div className="inline-flex rounded-full bg-black/50 backdrop-blur-sm p-0.5 text-[11px] font-semibold uppercase tracking-wider" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                          <button
                            type="button"
                            onClick={() => { if (showAllSearchMarkers) setShowAllSearchMarkers(false); }}
                            className={`px-3 py-1 rounded-full transition-colors ${!showAllSearchMarkers ? "bg-[#D4AF37] text-black" : "text-white/80 hover:text-white"}`}
                          >
                            Top 20
                          </button>
                          <button
                            type="button"
                            onClick={() => { if (!showAllSearchMarkers) setShowAllSearchMarkers(true); }}
                            className={`px-3 py-1 rounded-full transition-colors ${showAllSearchMarkers ? "bg-[#D4AF37] text-black" : "text-white/80 hover:text-white"}`}
                          >
                            Tous <span className="ml-0.5 opacity-70">{total}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>
            </div>
          )}


          {/* Right panel: Business detail */}
          {overlaySelectedBusiness && (
            <div className={`h-full flex flex-col bg-background animate-in slide-in-from-right duration-300 transition-[width] ease-out relative ${isOverlayPanelExpanded ? "w-full" : "w-1/2"}`}>
              <SlidePanelHeader
                onClose={() => { setOverlaySelectedBusiness(null); setIsOverlayPanelExpanded(false); }}
                alwaysDark
                toolbarCenterId="overlay-slide-panel-toolbar-center"
                toolbarRightId="overlay-slide-panel-toolbar"
              />
              <div className="flex-1 min-h-0 overflow-visible">
                <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                  <BookOnlineSlidePanel
                    businessId={overlaySelectedBusiness.id}
                    onClose={() => { setOverlaySelectedBusiness(null); setIsOverlayPanelExpanded(false); }}
                    forceMuted={voiceStatus === "recording" || voiceStatus === "processing"}
                  />
                </Suspense>
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {showResultsOverlay && isMobile && !compactPanelBusiness && (
        <div
          className={`fixed inset-0 z-[60] flex items-end transition-all duration-400 ${overlayDismissing ? 'pointer-events-none' : ''}`}
          style={{ background: 'transparent' }}
        >
          <div
            className={`relative w-full h-[50vh] bg-foreground/5 backdrop-blur-lg flex flex-col items-center justify-center px-6 text-center transition-transform duration-400 ease-in-out ${overlayDismissing ? 'translate-y-full' : 'translate-y-0'}`}
            style={{ animation: overlayDismissing ? undefined : 'slideInFromBottom 0.4s ease-out' }}
          >
            {/* Close button */}
            <button
              onClick={dismissOverlay}
              className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="text-foreground/60 text-sm mb-2">
              {language === "en" ? "Search results for" : language === "ar" ? "نتائج البحث عن" : "Résultats de recherche pour"}
            </p>
            <p className="text-xl md:text-2xl font-bold text-foreground mb-3">
              «&nbsp;{(spokenText || searchQuery)}{selectedCity && selectedCity !== "all" ? ` ${selectedCity}` : ""}&nbsp;»
            </p>
            <p className="text-primary font-semibold text-lg mb-5">
              {displayedResultsCount} {language === "en" ? "establishments found" : language === "ar" ? "مؤسسة وجدت" : "établissements trouvés"}
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
                   if (aiAnswerText) {
                     const cleanText = aiAnswerText.replace(/\*{1,2}/g, "").replace(/^[-•]\s+/gm, "").replace(/^\d+[.)]\s+/gm, "");
                     const intro = ttsIntroPhrase ? `${ttsIntroPhrase}. ` : "";
                     ttsIntroWordCountRef.current = intro.trim().split(/\s+/).filter(Boolean).length;
                     voiceLoopRef.current = true;
                     ttsSpeak(intro + cleanText + " … Vous pouvez me poser une autre question.", undefined, true);
                  } else {
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
                    speech += " Vous pouvez me poser une autre question.";
                    voiceLoopRef.current = true;
                    ttsSpeak(speech);
                  }
                }}
                className="mb-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-gold/30 text-gold text-sm font-medium hover:bg-gold/20 transition-colors"
              >
                <Volume2 className="h-4 w-4" />
                {language === "en" ? "Listen to results" : language === "ar" ? "استمع للنتائج" : "Écouter les résultats"}
              </button>
            )}
            {voiceStatus === "recording" && (
              <div className="mb-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium animate-pulse">
                <Mic className="h-4 w-4" />
                Je vous écoute… dites votre prochaine recherche
              </div>
            )}

            {/* Geo toggle */}
            <button
              onClick={geo.toggle}
              className={`mb-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                geo.isEnabled
                  ? "bg-gold/20 text-gold border border-gold/40"
                  : "bg-foreground/10 text-foreground/60 border border-foreground/20 hover:border-foreground/40"
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











      {activeTab === "map" && (
        <section className="pt-4 pb-4 lg:pt-20 lg:pb-4 bg-white dark:bg-zinc-900">
          <div className="mx-auto px-2 md:px-4 lg:max-w-[80%]">
            <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>}>
              <BusinessMap
                businesses={filteredBusinesses
                  .filter((b) => {
                    const engs: string[] = b.engagements || [];
                    const isWebOnly = engs.some((e: string) => {
                      const n = e.toLowerCase().trim();
                      return n === "web only" || n === "logistique:web only" || n.endsWith(":web only");
                    });
                    return !isWebOnly;
                  })
                  .map((b) => ({
                  id: b.id,
                  name: b.name,
                  city: b.city,
                  address: b.address,
                  phone: b.phone,
                  whatsapp: b.whatsapp,
                  main_category: b.main_category,
                  categories: b.categories,
                  latitude: b.latitude,
                  longitude: b.longitude,
                  wtuce_status: b.wtuce_status,
                  logo_url: b.logo_url,
                  neighborhood: b.neighborhood,
                  images: b.images,
                  hook_fr: b.hook_fr,
                  google_rating: b.google_rating,
                  google_review_count: b.google_review_count,
                  tripadvisor_rating: b.tripadvisor_rating,
                  tripadvisor_review_count: b.tripadvisor_review_count,
                }))}
                height="calc(100vh - 250px)"
                isLoading={isLoading}
                forceOverview={!selectedCity || (selectedCity === "all" && !detectedCity)}
                cityCenter={(() => {
                  const effectiveCity = selectedCity && selectedCity !== "all" ? selectedCity : detectedCity;
                  if (!effectiveCity) return null;
                  const normalizedCity = normalizeText(effectiveCity);
                  const city = citiesWithPriority.find(c => normalizeText(c.name) === normalizedCity);
                  if (city?.latitude != null && city?.longitude != null) {
                    return { lat: city.latitude, lng: city.longitude };
                  }
                  const fallbackBusiness = filteredBusinesses.find((b) => {
                    if (b.latitude == null || b.longitude == null || !b.city) return false;
                    return normalizeText(b.city) === normalizedCity;
                  });
                  if (fallbackBusiness) return { lat: fallbackBusiness.latitude!, lng: fallbackBusiness.longitude! };
                  return null;
                })()}
                neighborhoodCenter={neighborhoodCoords}
                onBusinessClick={(b) => {
                  openCompactPanel(b as any);
                }}
              />
            </Suspense>
          </div>
        </section>
      )}

      {activeTab === "poi" && (
        <PoiTabContent
          selectedCity={selectedCity}
          detectedCity={detectedCity}
          language={language}
          hasKnownLocation={hasKnownLocation}
          isSubDesktop={isSubDesktop}
          hidePoiMap={hidePoiMap}
          setHidePoiMap={setHidePoiMap}
          setShowMobileMap={setShowMobileMap}
          mapCenterForResults={mapCenterForResults}
          citiesWithPriority={citiesWithPriority}
          voiceStatus={voiceStatus}
          mapPanelCloseTrigger={mapPanelCloseTrigger}
          setMapPanelCloseTrigger={setMapPanelCloseTrigger}
          allPois={allPois}
          setAllPois={setAllPois}
          hoveredPoiId={hoveredPoiId}
          setHoveredPoiId={setHoveredPoiId}
          onSearchNavigate={(params) => {
            setCompactPanelBusiness(null);
            setIsCompactPanelExpanded(false);
            setSelectedCategoryFilter(null);
            setSelectedSubcategoryFilter(null);
            setSelectedServiceFilter(null);
            if (params.q) { setSearchQuery(params.q); setInputValue(params.q); }
            setActiveTab("suggestions");
            setSelectedCity("all");
            setIsGeoCityAutoSelected(false);
            setSearchParams(params);
          }}
          onBusinessSelect={(bizId) => {
            setCompactPanelBusiness({ id: bizId, name: "" } as any);
            setIsCompactPanelExpanded(false);
          }}
          onPanelOpenChange={setPoiPanelOpen}
          userCoords={geo.isEnabled && geo.coords ? geo.coords : null}
        />
      )}

      {activeTab === "destinations" && (
        <DestinationsTabContent
          selectedCity={selectedCity}
          detectedCity={detectedCity}
          language={language}
          hasKnownLocation={hasKnownLocation}
          isSubDesktop={isSubDesktop}
          hideDestMap={hideDestMap}
          setHideDestMap={setHideDestMap}
          setShowMobileMap={setShowMobileMap}
          mapCenterForResults={mapCenterForResults}
          citiesWithPriority={citiesWithPriority}
          voiceStatus={voiceStatus}
          mapPanelCloseTrigger={mapPanelCloseTrigger}
          setMapPanelCloseTrigger={setMapPanelCloseTrigger}
          allDests={allDests}
          setAllDests={setAllDests}
          allDestItems={allDestItems}
          setAllDestItems={setAllDestItems}
          hoveredDestId={hoveredDestId}
          setHoveredDestId={setHoveredDestId}
          onSearchNavigate={(params) => {
            setCompactPanelBusiness(null);
            setIsCompactPanelExpanded(false);
            setSelectedCategoryFilter(null);
            setSelectedSubcategoryFilter(null);
            setSelectedServiceFilter(null);
            if (params.q) { setSearchQuery(params.q); setInputValue(params.q); }
            setActiveTab("suggestions");
            setSelectedCity("all");
            setIsGeoCityAutoSelected(false);
            setSearchParams(params);
          }}
          onBusinessSelect={(bizId) => {
            setCompactPanelBusiness({ id: bizId, name: "" } as any);
            setIsCompactPanelExpanded(false);
          }}
          userCoords={geo.isEnabled && geo.coords ? geo.coords : null}
          openDestinationId={openDestinationParam || null}
        />
      )}

      {activeTab === "hashtag" && badgeIdParam && (
        <HashtagTabContent
          badgeId={badgeIdParam}
          badgeLabel={badgeLabelParam || "#"}
          city={effectiveCityForMap || searchParams.get("city") || null}
          onCountChange={setHashtagCount}
          onOpenBusiness={(b) => openCompactPanel(b as any)}

        />
      )}

      {activeTab === "youtube" && (
        <YouTubeChannelsTabContent
          city={cityFromUrl || null}
          onOpenBusiness={(bizId) => {
            setCompactPanelBusiness({ id: bizId, name: "" } as any);
            setIsCompactPanelExpanded(false);
          }}
        />
      )}






      {activeTab === "suggestions" && (
        <>
          <ResultsTabContent
            belowCardsSlot={(() => {
              // Carrousel vidéo en bas de l'onglet Résultats — désactivé temporairement
              // const effCity = (selectedCity && selectedCity !== "all" ? selectedCity : detectedCity) || cityFromUrlForThumbs || null;
              // const effSub = selectedSubcategoryFilter || detectedSubcategory || null;
              // const effService = selectedServiceFilter || null;
              // if (!effCity || (!effSub && !effService)) return null;
              // return (
              //   <div className="mt-6 mb-8">
              //     <SearchAIVideosCarousel
              //       subcategoryNames={effSub ? [effSub] : []}
              //       serviceName={effService}
              //       city={effCity}
              //       entryLabel={labelFromUrl}
              //       onOpenBusiness={(b) => openCompactPanel(b as any)}
              //     />
              //   </div>
              // );
              return null;
            })()}
            resultsRef={resultsRef}
            onCloseCompactPanel={() => { setCompactPanelBusiness(null); setIsCompactPanelExpanded(false); }}
            resultsBarRef={resultsBarRef}
            compactPanelBusiness={compactPanelBusiness}
            hasKnownLocation={hasKnownLocation}
            hideResultsMap={hideResultsMap}
            setHideResultsMap={setHideResultsMap}
            mapPanelCloseTrigger={mapPanelCloseTrigger}
            onSearchNavigate={(params) => {
              setCompactPanelBusiness(null);
              setIsCompactPanelExpanded(false);
              setSelectedCategoryFilter(null);
              setSelectedSubcategoryFilter(null);
              setSelectedServiceFilter(null);
              if (params.q) { setSearchQuery(params.q); setInputValue(params.q); }
              setActiveTab("suggestions");
              setSelectedCity("all");
              setIsGeoCityAutoSelected(false);
              setSearchParams(params);
            }}
            onHotelSearch={handleHotelSearch}
            onBusinessSelect={(bizId) => {
              setCompactPanelBusiness({ id: bizId, name: "" } as any);
              setIsCompactPanelExpanded(false);
            }}
            isCategoryFilterActive={isCategoryFilterActive}
            isMobile={isMobile}
            isSubDesktop={isSubDesktop}
            isLoading={isLoading}
            filteredBusinesses={resultsFilteredBusinesses}
            paginatedBusinesses={resultsPaginatedBusinesses}
            businessLabelLogos={businessLabelLogos}
            mapPoiItems={mapPoiItems}
            mapCenterForResults={mapCenterForResults}
            hoveredResultId={hoveredResultId}
            setHoveredResultId={setHoveredResultId}
            currentPage={currentPage}
            totalPages={resultsTotalPages}
            startResult={resultsStartResult}
            endResult={resultsEndResult}
            displayedResultsCount={resultsDisplayedCount}
            goToPage={goToPage}
            stickyAiText={stickyAiText}
            searchQuery={searchQuery}
            spokenText={spokenText}
            activeTimeSlot={activeTimeSlot}
            language={language}
            openCompactPanel={openCompactPanel}
            getDistanceKm={getDistanceKm}
            setShowMobileMap={setShowMobileMap}
            setShowAiPopup={(v) => {
              if (v) {
                setShowAiPopup(false);
                setActiveTab("ai");
                requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
              } else {
                setShowAiPopup(false);
              }
            }}
            t={t}
            effectiveCity={effectiveCityForMap}
            onFrontStructureFilter={(subNames) => {
              setFsFilterSubcategories(subNames);
              setFsFilterServices(null);
              // When the URL drives the query via `subcats` (homepage card),
              // sync the chip selection to the URL so the server re-queries
              // with the new subset (e.g. clicking "Glacier" → 17 results).
              if (subcategoryNamesFromUrl.length > 0 && subNames && subNames.size > 0) {
                const currentSet = new Set(subcategoryNamesFromUrl);
                // Only sync when the new set NARROWS the current URL selection
                // (strict subset). Never widen — the default "all FS names" effect
                // in ResultsTabContent would otherwise clobber the original
                // homepage-card subcats with every subcategory of every entry.
                const isStrictSubset =
                  subNames.size < currentSet.size &&
                  Array.from(subNames).every((n) => currentSet.has(n));
                if (isStrictSubset) {
                  const next = new URLSearchParams(searchParams);
                  next.set("subcats", Array.from(subNames).join("|"));
                  next.set("_t", String(Date.now()));
                  setSearchParams(next, { replace: true });
                }
              }
            }}
            onFrontStructureServicesFilter={(svcs) => setFsFilterServices(svcs)}
            fsTopBusinessId={fsTopBusinessId}
            hideAiSuggestion={false}
            allCityMapBusinesses={allCityMapBusinesses}
            allSearchMapBusinesses={allSearchMapBusinesses}
            allSearchMapPoiItems={allSearchMapPoiItems}
            hotelSearchInfo={hotelSearchInfoForResults}
            showAllSearchMarkers={showAllSearchMarkers}
            onToggleShowAllSearchMarkers={() => setShowAllSearchMarkers(v => !v)}
            searchResultsTotal={totalCount ?? filteredBusinesses.length}
            fsMatchingCount={fsMatchingCount}
            labelFromUrl={labelFromUrl}
            userCoords={geo.isEnabled && geo.coords ? geo.coords : null}
          />
        </>
      )}

      {/* Mobile/Tablet Map Overlay — slide-in from right */}
      {isSubDesktop && showMobileMap && (
        <div className="fixed inset-0 z-[201] bg-background animate-slide-in-right lg:hidden">
          {activeTab === "suggestions" ? (
            <div className="absolute top-0 left-0 right-0 z-[80] flex flex-col">
              <div className="relative z-10 flex items-center gap-3 px-3 py-3 bg-white/70 backdrop-blur-md">
                <button
                  onClick={() => setShowMobileMap(false)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-black shadow-lg shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
                <span className="flex-1 text-sm font-medium text-black truncate">
                  {mobileMapPoiItemsFinal.length} {language === "en" ? "results for" : language === "ar" ? "نتائج لـ" : "résultats pour"} "{mobileFsTabId ? `${mobileFrontTabs.find(t => t.id === mobileFsTabId)?.name || ''}${effectiveCityForMap ? ` à ${effectiveCityForMap}` : ''}`.trim() : (searchQuery || (labelFromUrl ? `${labelFromUrl}${effectiveCityForMap ? ` à ${effectiveCityForMap}` : ''}`.trim() : ''))}"
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("open-generic-club-popup"))}
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    aria-label="Le Club OWM"
                  >
                    <Heart className="h-4 w-4 text-[#6050DC]" strokeWidth={2.5} />
                  </button>
                  <ShareButton title={searchQuery || "Recherche"} variant="dark" className="shrink-0" />
                </div>
              </div>
              {(() => {
                const activeFsTab = mobileFsTabId ? mobileFrontTabs.find(t => t.id === mobileFsTabId) : null;
                const total = mobileFsTabId === null ? (totalCount ?? filteredBusinesses.length) : fsMatchingCount;
                const showToggle = total > 20 || !!mobileFsSubId;
                const subs = activeFsTab?.subcategories ?? [];
                const activeSubName = mobileFsSubId
                  ? (subs.find(s => s.id === mobileFsSubId)?.name ?? "Sous-catégorie")
                  : "Sous-catégorie";
                const applySub = (subId: string | null) => {
                  setMobileFsSubId(subId);
                  setMobileFsServices([]);
                  setFsFilterServices(null);
                  if (!activeFsTab) return;
                  if (!subId) {
                    setFsFilterSubcategories(new Set(activeFsTab.subcategoryNames));
                  } else {
                    const sub = activeFsTab.subcategories.find(s => s.id === subId);
                    setFsFilterSubcategories(new Set(sub?.names || activeFsTab.subcategoryNames));
                  }
                };
                if (!showToggle && subs.length === 0) return null;
                return (
                  <div className="flex items-center justify-center gap-2 px-3 pt-3 pb-2">
                    {showToggle && (
                      <div className="inline-flex rounded-full bg-black/50 backdrop-blur-sm p-0.5 text-[11px] font-semibold uppercase tracking-wider" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                        <button
                          type="button"
                          onClick={() => { if (mobileFsSubId) applySub(null); if (showAllSearchMarkers) setShowAllSearchMarkers(false); }}
                          className={`px-3 py-1 rounded-full transition-colors ${!showAllSearchMarkers && !mobileFsSubId ? "bg-[#D4AF37] text-black" : "text-white/80 hover:text-white"}`}
                        >
                          Top 20
                        </button>
                        <button
                          type="button"
                          onClick={() => { if (mobileFsSubId) applySub(null); if (!showAllSearchMarkers) setShowAllSearchMarkers(true); }}
                          className={`px-3 py-1 rounded-full transition-colors ${showAllSearchMarkers && !mobileFsSubId ? "bg-[#D4AF37] text-black" : "text-white/80 hover:text-white"}`}
                        >
                          Tous <span className="ml-0.5 opacity-70">{total}</span>
                        </button>
                      </div>
                    )}
                    {subs.length > 0 && (
                      <div className="inline-flex rounded-full bg-black/50 backdrop-blur-sm p-0.5 text-[11px] font-semibold uppercase tracking-wider" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${mobileFsSubId ? "bg-[#D4AF37] text-black" : "text-white/80 hover:text-white"}`}
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                              {activeSubName}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-[210] max-h-80 overflow-y-auto">
                            {mobileFsSubId && (
                              <DropdownMenuItem onSelect={() => applySub(null)}>
                                Toutes les sous-catégories
                              </DropdownMenuItem>
                            )}
                            {subs.map((s) => (
                              <DropdownMenuItem key={s.id} onSelect={() => applySub(s.id)}>
                                {s.name} <span className="ml-1 opacity-60">({s.count})</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

          ) : (
            <button
              onClick={() => setShowMobileMap(false)}
              className="absolute top-3 left-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          {/* Map — full height */}
          <div className="w-full h-full relative">
            <PoiGoogleMap
              pois={activeTab === "poi" ? allPois : activeTab === "destinations" ? allDests : mobileMapPoiItemsFinal}
              selectedPoiId={activeTab === "poi" ? (hoveredPoiId || null) : activeTab === "destinations" ? (hoveredDestId || null) : (hoveredResultId || compactPanelBusiness?.id || fsTopBusinessId || null)}
              onPoiClick={(poiId) => {
                if (activeTab === "poi" || activeTab === "destinations") {
                  setShowMobileMap(false);
                  openCompactPanel({ id: poiId, name: "" } as AIBusinessData);
                } else {
                  const biz = filteredBusinesses.find(b => b.id === poiId)
                    || allCityMapBusinesses.find(b => b.id === poiId);
                  if (biz) {
                    setShowMobileMap(false);
                    openCompactPanel({ id: biz.id, name: biz.name } as AIBusinessData);
                  }
                }
              }}
              center={mapCenterForResults}
              fitToMarkers
              subcategoryIconMap={undefined}
              userLocation={geo.isEnabled && geo.coords ? geo.coords : null}
            />

            <PanelSearchBar
              onAiClick={() => window.dispatchEvent(new Event("open-ai-tab"))}
              onSearch={(params) => {
                setCompactPanelBusiness(null);
                setIsCompactPanelExpanded(false);
                setShowMobileMap(false);
                setSelectedCategoryFilter(null);
                setSelectedSubcategoryFilter(null);
                setSelectedServiceFilter(null);
                if (params.q) { setSearchQuery(params.q); setInputValue(params.q); }
                setActiveTab("suggestions");
                setSelectedCity("all");
                setIsGeoCityAutoSelected(false);
                setSearchParams(params);
              }}
              onHotelSearch={handleHotelSearch}
              onBusinessSelect={(bizId) => {
                setShowMobileMap(false);
                setCompactPanelBusiness({ id: bizId, name: "" } as any);
                setIsCompactPanelExpanded(false);
              }}
              closeTrigger={mapPanelCloseTrigger}
              solidBackground
              aiAnswerText={aiAnswerText}
              aiBusinesses={allBusinesses as any}
              onSeeResults={() => {
                setShowMobileMap(false);
                setActiveTab("suggestions");
                setCurrentPage(1);
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  setTimeout(() => ensureResultsVisibleBelowSticky("smooth"), 350);
                }, 50);
              }}
              onOpenMap={() => {
                setActiveTab("suggestions");
                setShowMobileMap(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Floating Search Bar */}
      {/* Search overlay (docké à gauche sur desktop, fullscreen sur mobile/tablette) */}
      <MobileSearchOverlay
        open={mobileSearchOverlayOpen}
        onClose={() => setMobileSearchOverlayOpen(false)}
        desktopDocked={!isSubDesktop}
        desktopHalfWidth={hasKnownLocation}
        onBusinessSelect={(bizId) => {
          setCompactPanelBusiness({ id: bizId, name: "" } as any);
          setIsCompactPanelExpanded(false);
        }}
        onSearch={(params) => {
          setCompactPanelBusiness(null);
          setIsCompactPanelExpanded(false);
          setHotelSearchPanel(null);
          setHotelSearchLoading(false);
          setAvailabilityRestrictedIds(null);
          setLatestHotelSearchDates({});
          hotelSearchSeqRef.current += 1;
          textHotelIntentSeqRef.current += 1;
          setSelectedCategoryFilter(null);
          setSelectedSubcategoryFilter(null);
          setSelectedServiceFilter(null);
          if (params.q) {
            setSearchQuery(params.q);
            setInputValue(params.q);
          }
          setActiveTab("suggestions");
          setSelectedCity("all");
          setIsGeoCityAutoSelected(false);
          setSearchParams(params);
        }}
        onVoiceStart={() => {
          setMobileSearchOverlayOpen(false);
          toggleRecording();
        }}
        onAiSuggestionClick={() => {
          aiPopupShownRef.current = false;
          if (selectedServiceFilter && lastAiServiceRef.current !== selectedServiceFilter) {
            setAiAnswerText("");
            setAiRegenerateKey(k => k + 1);
            lastAiServiceRef.current = selectedServiceFilter;
          }
          setWarningDismissed(true);
          setCompactPanelBusiness(null);
          setIsCompactPanelExpanded(false);
          setShowAiPopup(true);
        }}
        onLocationClick={() => setLocationDialogOpen(true)}
        geoState={{
          isEnabled: geo.isEnabled,
          isDetecting: geo.isDetecting,
          detectedCity: geo.detectedCity,
          detectedNeighborhood: geo.detectedNeighborhood,
          confirmedAddress: geo.confirmedAddress,
          accept: geo.accept,
          toggle: geo.toggle,
          setManualCity: geo.setManualCity,
        }}
      />


      {/* Google-style voice search overlay */}
      <VoiceSearchOverlay
        isOpen={voiceStatus === "recording" || voiceStatus === "processing"}
        liveTranscript={liveTranscript}
        onClose={() => toggleRecording()}
        onFinish={() => finishRecording()}
      />

      {/* SerpAPI Flight search (voice intent: flightSearch) */}
      <FlightSearchOverlay
        open={flightOverlay.open}
        initial={flightOverlay.initial}
        onClose={() => setFlightOverlay({ open: false, initial: {} })}
      />

      {/* SerpAPI Web search (voice intent: webSearch) */}
      <WebSearchOverlay
        open={webOverlay.open}
        initialQuery={webOverlay.query}
        onClose={() => setWebOverlay({ open: false, query: "" })}
      />

      {/* SerpAPI hotel search by city (voice intent: hotelSearch) */}
      {/* FallbackHotelsPanel commenté: les hôtels disponibles sont déjà affichés
          dans le panneau de gauche (résultats), avec un en-tête dédié.
      {hotelSearchPanel && (
        <FallbackHotelsPanel
          data={hotelSearchPanel}
          selectedHotelId={null}
          onClose={() => setHotelSearchPanel(null)}
          onSelectHotel={(_hotelId, businessId) => {
            if (businessId) {
              const hotelBusinesses = (hotelSearchPanel?.hotels || [])
                .map((h: any) => h.dbBusiness)
                .filter((biz: Business | null | undefined): biz is Business => !!biz?.id);
              const availableBusinessIds = (hotelSearchPanel?.hotels || [])
                .map((h: any) => h.businessId)
                .filter((id: string | undefined): id is string => !!id);

              if (hotelBusinesses.length > 0) {
                setPinnedBusinesses(hotelBusinesses);
                setAllBusinesses(hotelBusinesses);
                setTotalCount(null);
                setSearchMessage("");
              }

              if (availableBusinessIds.length > 0) {
                setAvailabilityRestrictedIds(new Set<string>(availableBusinessIds));
              }

              setHotelSearchPanel(null);

              const next = new URLSearchParams(searchParams);
              next.set("openBusiness", businessId);

              if (availableBusinessIds.length > 0) {
                next.set("pinIds", availableBusinessIds.join(","));
              }

              setSearchParams(next);
            }
          }}
        />
      )}
      */}
      {hotelSearchLoading && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Bottom floating search bar — anchored to the right map when open, centered otherwise */}
      {!compactPanelBusiness && !overlaySelectedBusiness && !poiPanelOpen && (() => {
        const rightMapVisible = hasKnownLocation && (
          (activeTab === "suggestions" && !hideResultsMap) ||
          (activeTab === "ai" && !hideResultsMap) ||
          (activeTab === "poi" && !hidePoiMap) ||
          (activeTab === "destinations" && !hideDestMap)
        );
        const overlayOpen = bottomSearchOverlayOpen || bottomAiOverlayOpen || bottomHashtagsOverlayOpen;
        return (
        <>
          {overlayOpen && (
            <div
              className={`fixed z-[200] bg-black/70 backdrop-blur-md animate-in fade-in duration-200 ${
                rightMapVisible ? "inset-y-0 right-0 w-full lg:w-1/2" : "inset-0"
              }`}
              onClick={() => setBottomSearchCloseTrigger((n) => n + 1)}
            />
          )}
          <div
            className={`fixed pointer-events-none ${
              activeTab === "youtube" && ytPanelOpen ? "hidden " : ""
            }${
              overlayOpen
                ? rightMapVisible
                  ? "inset-y-0 right-0 w-full lg:w-1/2 z-[201]"
                  : "inset-y-0 left-1/2 -translate-x-1/2 w-full lg:w-1/2 z-[201]"
                : rightMapVisible
                  ? "bottom-0 right-0 w-full lg:w-1/2 z-[85]"
                  : "bottom-0 left-1/2 -translate-x-1/2 w-[90%] lg:w-1/2 z-[85]"
            }`}
          >
            <div className="relative w-full h-full pointer-events-auto">
              <PanelSearchBar
                leadingControls={activeTab === "youtube" ? <YtBgLeadingControls /> : undefined}
                hideAiButton={activeTab === "ai" && !rightMapVisible}
                onAiClick={() => window.dispatchEvent(new Event("open-ai-tab"))}
                onSearch={(params) => {
                  const sp = new URLSearchParams(params);
                  navigate(`/search?${sp.toString()}`);
                }}
                onHotelSearch={handleHotelSearch}
                onBusinessSelect={(bizId) => {
                  setCompactPanelBusiness({ id: bizId, name: "" } as any);
                  setIsCompactPanelExpanded(false);
                }}
                onOverlayChange={setBottomSearchOverlayOpen}
                onAiOverlayChange={setBottomAiOverlayOpen}
                onHashtagsOverlayChange={setBottomHashtagsOverlayOpen}
                closeTrigger={bottomSearchCloseTrigger}
                noToolbarOffset
                solidBackground
                aiAnswerText={aiAnswerText}
                aiBusinesses={allBusinesses as any}
                onSeeResults={() => {
                  setShowMobileMap(false);
                  setActiveTab("suggestions");
                  setCurrentPage(1);
                  setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    setTimeout(() => ensureResultsVisibleBelowSticky("smooth"), 350);
                  }, 50);
                }}
                onOpenMap={() => {
                  setActiveTab("suggestions");
                  setShowMobileMap(true);
                }}
              />
            </div>
          </div>
        </>
        );
      })()}


      {/* Split view: Left AI text panel + Right business panel */}
      {compactPanelBusiness && (
        <>
          {/* Backdrop when expanded to 80% */}
          {isCompactPanelExpanded && (
            <div
              className="fixed inset-0 top-[53px] z-[99] bg-black/40 backdrop-blur-[2px]"
              style={{ opacity: 0, animation: "panelFadeIn 0.2s ease-out 0.1s forwards" }}
              onClick={() => setIsCompactPanelExpanded(false)}
            />
          )}

          {/* Left panel — full AI text — REMOVED (was disabled dead code) */}

          {/* Right panel — business detail */}
          <div
            className={`fixed top-0 left-0 right-0 bottom-0 z-[220] bg-background shadow-2xl overflow-visible flex flex-col animate-slide-in-right lg:left-auto lg:bottom-auto lg:border-l lg:border-border lg:transition-[width] lg:duration-300 lg:ease-out ${isCompactPanelExpanded ? "lg:w-full border-l-2 shadow-[-8px_0_30px_-5px_rgba(0,0,0,0.15)]" : "lg:w-1/2"}`}
            style={{
              height: isSubDesktop ? undefined : "100vh",
              transform: isMobile && swipeOffsetY !== 0 ? `translateY(${swipeOffsetY}px)` : undefined,
              transition: isMobile && swipeOffsetY === 0 ? "transform 0.2s ease-out" : undefined,
            }}
            onTouchStart={onPanelTouchStart}
            onTouchMove={onPanelTouchMove}
            onTouchEnd={onPanelTouchEnd}
          >
            {!isNestedMosaicOpen && (
              <SlidePanelHeader
                onClose={handleCompactPanelClose}
                alwaysDark
              />
            )}
            <div className="flex-1 min-h-0 overflow-visible">
              <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                <BookOnlineSlidePanel
                  businessId={compactPanelBusiness.id}
                  initialVideoUrl={compactPanelInitialVideoUrl || undefined}
                  onClose={closeCompactPanel}
                  externalOverlayActive={showAiPopup}
                  forceMuted={voiceStatus === "recording" || voiceStatus === "processing"}
                  interceptCloseRef={compactPanelInterceptCloseRef}
                  showSearchBar
                  closeTrigger={mapPanelCloseTrigger}
                  onMosaicStateChange={setIsNestedMosaicOpen}
                  onHotelSearch={handleHotelSearch}
                  initialAvailabilityCheckIn={latestHotelSearchDates.checkIn}
                  initialAvailabilityCheckOut={latestHotelSearchDates.checkOut}
                  initialAvailabilityAdults={latestHotelSearchDates.adults}
                  onSearch={(params) => {
                    setCompactPanelBusiness(null);
                    setIsCompactPanelExpanded(false);
                    setSelectedCategoryFilter(null);
                    setSelectedSubcategoryFilter(null);
                    setSelectedServiceFilter(null);
                    if (params.q) {
                      setSearchQuery(params.q);
                      setInputValue(params.q);
                    }
                    setActiveTab("suggestions");
                    setSelectedCity("all");
                    setIsGeoCityAutoSelected(false);
                    setSearchParams(params);
                  }}
                  onSearchBusinessSelect={(bizId) => {
                    setCompactPanelBusiness({ id: bizId, name: "" } as any);
                    setIsCompactPanelExpanded(false);
                  }}
                  onPrevBusiness={() => goToBusinessOffset(-1)}
                  onNextBusiness={() => goToBusinessOffset(1)}
                  hasPrevBusiness={businessNavInfo.hasPrev}
                  hasNextBusiness={businessNavInfo.hasNext}
                />
              </Suspense>
            </div>
          </div>
        </>
      )}
      <MoreFiltersPopup
        open={moreFiltersOpen}
        onOpenChange={setMoreFiltersOpen}
        cityName={detectedCity}
        subcategoryName={selectedSubcategoryFilter}
        categoryName={selectedCategoryFilter}
        selectedTimeSlots={moreFilterTimeSlots}
        onTimeSlotsChange={setMoreFilterTimeSlots}
        selectedEngagements={moreFilterEngagements}
        onEngagementsChange={setMoreFilterEngagements}
        selectedCommodites={moreFilterCommodites}
        onCommoditesChange={setMoreFilterCommodites}
      />
      <ClubLoginPopup />
    </div>
  );
};

export default SearchPage;
