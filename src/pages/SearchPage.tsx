import { useSearchParams, Link, useNavigate } from "react-router-dom";
import SearchInput from "@/components/SearchInput";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSEO } from "@/hooks/useSEO";
import { useIsMobile } from "@/hooks/use-mobile";
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

import { Loader2, Building2, ChevronLeft, ChevronRight, Search, Mic, Loader, MapPin, MapPinOff, X, Volume2, VolumeX, Clock, Map, Sparkles, SlidersHorizontal, ChevronDown, ChevronUp, RefreshCw, Compass, Maximize2, Minimize2, Star, Leaf, Truck, Accessibility, Package, Award, Hash } from "lucide-react";
import MoreFiltersPopup from "@/components/MoreFiltersPopup";
import { lazy, Suspense } from "react";
const BusinessMap = lazy(() => import("@/components/BusinessMap"));
import PoiSection from "@/components/PoiSection";
import DestinationSection, { type DestinationItem } from "@/components/DestinationSection";
import DestinationBusinessesPanel from "@/components/DestinationBusinessesPanel";
import BusinessCard, { type BusinessCardData, type Gamme, type Badge, type SubcategoryRef, type BadgeSubcategoryRef } from "@/components/BusinessCard";
import AISearchAnswer, { parseInline, type BusinessData as AIBusinessData } from "@/components/AISearchAnswer";
import SearchResultCard from "@/components/SearchResultCard";
import AISuggestionCard from "@/components/AISuggestionCard";
const BookOnlineSlidePanel = lazy(() => import("@/components/BookOnlineSlidePanel"));
import SlidePanelHeader from "@/components/SlidePanelHeader";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";
import MobileSearchOverlay from "@/components/MobileSearchOverlay";
import FlightSearchOverlay, { type FlightSearchInitial } from "@/components/overlays/FlightSearchOverlay";
import WebSearchOverlay from "@/components/overlays/WebSearchOverlay";
import FallbackHotelsPanel from "@/components/overlays/FallbackHotelsPanel";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useTextToSpeech, preloadTTS } from "@/hooks/useTextToSpeech";
import { useToast } from "@/hooks/use-toast";
import LocationPickerDialog from "@/components/LocationPickerDialog";
import WarningOverlay from "@/components/WarningOverlay";
import EmergencyNumbers from "@/components/EmergencyNumbers";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import PanelSearchBar from "@/components/PanelSearchBar";
import FrontStructureNavBar from "@/components/FrontStructureNavBar";
import { useFrontStructureTabs } from "@/hooks/useFrontStructureTabs";
import PoiTabContent from "@/pages/search/PoiTabContent";
import DestinationsTabContent from "@/pages/search/DestinationsTabContent";
import ResultsTabContent from "@/pages/search/ResultsTabContent";
import HashtagTabContent from "@/pages/search/HashtagTabContent";
import { normalizeSearchMode, normalizeText, formatDateFr, ITEMS_PER_PAGE, SERVER_PAGE_SIZE } from "@/pages/search/utils";

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
  const pinIdsParam = searchParams.get("pinIds") || "";
  const badgeIdParam = searchParams.get("badgeId") || "";
  const badgeLabelParam = searchParams.get("badgeLabel") || "";
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
  const [mobileFsTabId, setMobileFsTabId] = useState<string | null>(null);

  // Reset front structure filter when search query changes
  useEffect(() => {
    setFsFilterSubcategories(null);
    setMobileFsTabId(null);
  }, [searchQuery]);

  const categoryFromUrl = searchParams.get("category") || "";
  
  const [ttsIntroPhrase, setTtsIntroPhrase] = useState<string>("");
  const [aiAnswerText, setAiAnswerText] = useState<string>("");
  const [poiAiText, setPoiAiText] = useState<string>("");
  const [destAiText, setDestAiText] = useState<string>("");
  const [isPoiAiLoading, setIsPoiAiLoading] = useState(false);
  const [isDestAiLoading, setIsDestAiLoading] = useState(false);
  const [stickyAiAnimationNonce, setStickyAiAnimationNonce] = useState(0);
  const [stickyAiVisibleWordIndex, setStickyAiVisibleWordIndex] = useState(-1);
  const handleAiAnswerReady = useCallback((answer: string) => {
    setAiAnswerText(answer);
    // Persist for reuse in slide-panel AI overlay
    try {
      sessionStorage.setItem("ai_suggestion_text", answer);
      // Also store businesses for parseInline rendering
      const bizData = (allBusinesses || []).slice(0, 20).map((b) => ({
        id: b.id, name: b.name, city: b.city, main_category: b.main_category,
        categories: b.categories, hook_fr: b.hook_fr, rating: b.rating,
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
   const [activeTab, setActiveTab] = useState<"suggestions" | "map" | "poi" | "destinations" | "hashtag">(
     searchParams.get("badgeId") ? "hashtag" : "suggestions"
   );
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
    const [compactPanelInitialVideoUrl, setCompactPanelInitialVideoUrl] = useState<string | null>(null);
    const [bottomSearchOverlayOpen, setBottomSearchOverlayOpen] = useState(false);
    const [bottomSearchCloseTrigger, setBottomSearchCloseTrigger] = useState(0);
    const [isCompactPanelExpanded, setIsCompactPanelExpanded] = useState(false);
    const [isNestedMosaicOpen, setIsNestedMosaicOpen] = useState(false);
      const [compactBusinessImageCount, setCompactBusinessImageCount] = useState(0);
    const compactPanelInterceptCloseRef = useRef<(() => boolean) | null>(null);

      const openCompactPanel = useCallback((bizOrData: AIBusinessData | { id: string; name: string }) => {
        hasInteractedWithCompactPanelRef.current = true;
        const b = bizOrData as AIBusinessData;
        setCompactPanelBusiness(b);
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
        try {
          returnVideoId = sessionStorage.getItem("returnToTestVideoId");
          returnContext = sessionStorage.getItem("returnToTestContext");
          if (returnVideoId) sessionStorage.removeItem("returnToTestVideoId");
          if (returnContext) sessionStorage.removeItem("returnToTestContext");
        } catch { /* sessionStorage unavailable */ }
        setCompactPanelBusiness(null);
        setCompactPanelInitialVideoUrl(null);
        setIsCompactPanelExpanded(false);
        setIsNestedMosaicOpen(false);
        setHideResultsMap(false);
        // Remonter en haut de la grille de résultats
        try {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch { window.scrollTo(0, 0); }
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
        }
      }, [navigate]);

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
     setActiveTab("suggestions");
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

  const queryHasExplicitCity = useMemo(() => {
    if (cityFromUrl) return true;
    const normalizedQuery = normalizeText(searchQuery || inputValue);
    if (!normalizedQuery) return false;

    return citiesWithPriority.some((c) => {
      const normalizedCity = normalizeText(c.name);
      return normalizedCity.length > 2 && normalizedQuery.includes(normalizedCity);
    });
  }, [cityFromUrl, searchQuery, inputValue, citiesWithPriority]);

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


  const { status: voiceStatus, toggleRecording, finishRecording, liveTranscript } = useVoiceSearch({
    onTranscript: (keywords, spoken, category, timeKeyword) => {
      isVoiceSearchRef.current = true;
      setAvailabilityRestrictedIds(null);
      setInputValue(keywords);
      setSearchQuery(keywords);
      const params: Record<string, string> = { q: keywords, spoken };
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

  // Sort: WTUCE verified first (by priority_score desc), then non-verified (by rating desc, ignoring <10 reviews)
  const sortWtuceAndRating = (a: Business, b: Business) => {
    const aVerified = a.wtuce_status === "verified" ? 0 : 1;
    const bVerified = b.wtuce_status === "verified" ? 0 : 1;
    if (aVerified !== bVerified) return aVerified - bVerified;
    // Verified: sort by priority_score descending
    if (aVerified === 0) {
      return (b.priority_score || 0) - (a.priority_score || 0);
    }
    // Non-verified: priority_score first, then rating desc (ignore <10 reviews)
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
    if (pinIdsParam && pinnedBusinesses.length > 0) {
      const orderedIds = pinIdsParam.split(",").map(s => s.trim()).filter(Boolean);
      const byId: Record<string, Business> = {};
      for (const b of pinnedBusinesses) byId[b.id] = b;
      return orderedIds.map(id => byId[id]).filter(Boolean) as Business[];
    }

    const isServerPaginatedResults = totalCount !== null;

    // When server-side pagination is active, the backend already returned the exact
    // slice and ordering for the current page. Keep that slice intact so the grid,
    // map and pagination counter stay synchronized.
    let filtered: Business[];
    if (isServerPaginatedResults) {
      filtered = [...allBusinesses];
    } else if (selectedServiceFilter && serviceFilterBusinesses.length > 0) {
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
      const ordered = orderedIds.map(id => byId[id]).filter(Boolean) as Business[];
      return ordered;
    }

    return [...filtered].sort(sortWtuceAndRating);
  }, [allBusinesses, pinnedBusinesses, serviceFilterBusinesses, subcategoryFilterBusinesses, selectedCity, selectedCityId, selectedCategoryFilter, selectedSubcategoryFilter, selectedServiceFilter, activeTimeSlot, searchQuery, categoryFromUrl, moreFilterMatchingIds, moreFilterTimeSlots, detectedNeighborhood, searchLevel, totalCount, pinIdsParam, availabilityRestrictedIds]);

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
      const selectFields = "id, name, city, categories, engagements, latitude, longitude, images, neighborhood, rating, computed_rating, total_review_count, wtuce_status";
      const all: Business[] = [];
      let offset = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase
          .from("businesses")
          .select(selectFields)
          .eq("is_active", true)
          .ilike("city", effectiveCityForMap)
          .range(offset, offset + PAGE - 1);
        if (!data || data.length === 0) break;
        all.push(...(data as unknown as Business[]));
        if (data.length < PAGE) break;
        offset += PAGE;
      }
      if (!cancelled) setAllCityMapBusinesses(all as Business[]);
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [effectiveCityForMap]);

  // "Tous" tab: show search results only (desktop)
  const mapPoiItemsSearch: PoiMapItem[] = useMemo(() => {
    return buildMapPoiItems(filteredBusinesses, true);
  }, [buildMapPoiItems, filteredBusinesses]);

  // "Tous" tab: mobile/tablet
  const mobileMapPoiItems: PoiMapItem[] = useMemo(() => buildMapPoiItems(filteredBusinesses, false), [buildMapPoiItems, filteredBusinesses]);

  // Helper: sort and slice for front structure category filtering
  const buildFsCategoryItems = useCallback((guardDesktop: boolean): PoiMapItem[] => {
    if (!fsFilterSubcategories) return [];
    // Use allCityMapBusinesses when available, fall back to filteredBusinesses
    const pool = allCityMapBusinesses.length > 0 ? allCityMapBusinesses : filteredBusinesses;
    const matching = pool.filter(b =>
      b.categories?.some((cat: string) => fsFilterSubcategories.has(cat))
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
    return buildMapPoiItems(matching.slice(0, 20), guardDesktop);
  }, [fsFilterSubcategories, allCityMapBusinesses, filteredBusinesses, buildMapPoiItems]);

  // Desktop map items
  const mapPoiItems: PoiMapItem[] = useMemo(() => {
    if (!fsFilterSubcategories) return mapPoiItemsSearch;
    return buildFsCategoryItems(true);
  }, [mapPoiItemsSearch, fsFilterSubcategories, buildFsCategoryItems]);

  // Mobile/tablet map items
  const mobileMapPoiItemsFinal: PoiMapItem[] = useMemo(() => {
    if (!fsFilterSubcategories) return mobileMapPoiItems;
    return buildFsCategoryItems(false);
  }, [mobileMapPoiItems, fsFilterSubcategories, buildFsCategoryItems]);

  // The top-ranked business ID for Gold marker (always highlight #1)
  const fsTopBusinessId: string | null = useMemo(() => {
    const items = mapPoiItems.length > 0 ? mapPoiItems : mobileMapPoiItemsFinal;
    return items[0]?.id || null;
  }, [mapPoiItems, mobileMapPoiItemsFinal]);

  const { tabs: mobileFrontTabs } = useFrontStructureTabs(effectiveCityForMap || null);




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
  const totalPages = useMemo(() => {
    if (serverTotalCount <= ITEMS_PER_PAGE) return 1;
    return Math.ceil(serverTotalCount / ITEMS_PER_PAGE);
  }, [serverTotalCount]);
  // With server-side pagination, filteredBusinesses already contains only the current page's results
  const paginatedBusinesses = useMemo(() => {
    return filteredBusinesses;
  }, [filteredBusinesses]);

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

        const selectFields = "id, name, description, city, region, address, phone, whatsapp, skype, website, logo_url, images, main_category, categories, services, engagements, online_shop_url, presentation_mode, wtuce_status, is_regulated_activity, latitude, longitude, google_maps_url, rating, computed_rating, total_review_count, gamme_id, badge_id, hook_fr, hook_en, hook_ar, opening_hours, show_opening_hours, is_open_24h, vacation_dates, zone_chalandise, is_visible_locale, zone_city_ids, default_service, neighborhood, priority_score";
        const { data, error } = await supabase
          .from("businesses")
          .select(selectFields)
          .eq("is_active", true)
          .in("id", orderedIds);

        if (fetchId !== latestFetchIdRef.current) return;
        if (error) {
          console.error("Error fetching pinned businesses:", error);
          setPinnedBusinesses([]);
          setAllBusinesses([]);
        } else {
          const byId: Record<string, Business> = {};
          (data as unknown as Business[] || []).forEach((b) => { byId[b.id] = { ...b, distance_km: null }; });
          const ordered = orderedIds.map(id => byId[id]).filter(Boolean) as Business[];
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

      // ── Badge filter path: load businesses tagged with this badge ──
      if (badgeIdParam) {
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
        setPinnedBusinesses([]);

        const { data: bbData } = await supabase
          .from("business_badges")
          .select("business_id")
          .eq("badge_id", badgeIdParam);
        const ids = (bbData || []).map((r: any) => r.business_id);
        if (fetchId !== latestFetchIdRef.current) return;
        if (ids.length === 0) {
          setAllBusinesses([]);
          setTotalCount(0);
          setIsLoading(false);
          return;
        }
        const selectFields = "id, name, description, city, region, address, phone, whatsapp, skype, website, logo_url, images, main_category, categories, services, engagements, online_shop_url, presentation_mode, wtuce_status, is_regulated_activity, latitude, longitude, google_maps_url, rating, computed_rating, total_review_count, gamme_id, badge_id, hook_fr, hook_en, hook_ar, opening_hours, show_opening_hours, is_open_24h, vacation_dates, zone_chalandise, is_visible_locale, zone_city_ids, default_service, neighborhood, priority_score";
        const { data: bizData } = await supabase
          .from("businesses")
          .select(selectFields)
          .eq("is_active", true)
          .in("id", ids);
        if (fetchId !== latestFetchIdRef.current) return;
        const list = ((bizData as unknown as Business[]) || []).map(b => ({ ...b, distance_km: null }));
        setAllBusinesses(list);
        setTotalCount(list.length);
        setSearchMessage("");
        setIsLoading(false);
        return;
      }

      setPinnedBusinesses([]);

      if (!searchQuery.trim() && !categoryFromUrl) {
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
        // Use edge function for full-text search with server-side pagination
        const { data, error } = await supabase.functions.invoke<SearchResult>("business-search", {
          body: { 
            query: searchQuery.trim() || categoryFromUrl || undefined,
            spoken: spokenText || undefined,
            language: language,
            pageSize: SERVER_PAGE_SIZE,
            offset: 0,
            compact: "card",
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
            if (biz.length >= 1 && searchQuery.trim()) {
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
  }, [searchQuery, categoryFromUrl, language, urlT, pinIdsParam, badgeIdParam]);

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
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Compute server offset for the requested page
    const offset = (page - 1) * ITEMS_PER_PAGE;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<SearchResult>("business-search", {
        body: {
          query: searchQuery.trim() || searchParams.get("category") || undefined,
          spoken: searchParams.get("spoken") || undefined,
          language: language,
          pageSize: SERVER_PAGE_SIZE,
          offset,
          compact: "card",
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

  const startResult = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endResult = Math.min(startResult + ITEMS_PER_PAGE - 1, serverTotalCount);
  const displayedResultsCount = serverTotalCount;
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
    <div className="min-h-screen bg-white" style={{ overflowX: 'clip' }}>
      <Header compact rightContent={
        <div data-tab-bar ref={(el) => {
          if (el) {
            const active = el.querySelector('[data-active-tab="true"]') as HTMLElement;
            if (active) {
              const scrollLeft = active.offsetLeft - el.clientWidth / 2 + active.offsetWidth / 2;
              el.scrollTo({ left: scrollLeft, behavior: "smooth" });
            }
          }
        }} className="flex gap-0 overflow-x-auto scrollbar-hide whitespace-nowrap justify-start" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {[
            { key: "suggestions", icon: <Sparkles className="h-4 w-4" />, label: language === "en" ? "Results" : language === "ar" ? "النتائج" : "Résultats", count: totalCount },
            ...(badgeIdParam && badgeLabelParam ? [{ key: "hashtag", icon: <Hash className="h-4 w-4" />, label: badgeLabelParam, count: undefined as number | undefined }] : []),
            { key: "poi", icon: <MapPin className="h-4 w-4" />, label: language === "en" ? "Points of Interest" : language === "ar" ? "أماكن مهمة" : "Lieux d'intérêt" },
            { key: "destinations", icon: <Compass className="h-4 w-4" />, label: language === "en" ? "Destinations" : language === "ar" ? "وجهات" : "Destinations" },
          ].map((tab) => (
            <button
              key={tab.key}
              data-active-tab={activeTab === tab.key ? "true" : undefined}
              onClick={(e) => {
                resetPanelStates();
                setCompactPanelBusiness(null);
                setIsCompactPanelExpanded(false);
                setOverlaySelectedBusiness(null);
                setIsOverlayPanelExpanded(false);
                setActiveTab(tab.key as any);
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
                activeTab === tab.key
                  ? "border-primary text-primary"
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
          ))}
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
        onDisableGeo={() => geo.decline()}
      />

      {/* Hidden AISearchAnswer instance — generates AI text for Sticky 4 (overlay disabled) */}
      {searchQuery && !isLoading && filteredBusinesses.length > 0 && !aiAnswerText && !searchParams.get("pinIds") && (
        <div className="hidden">
          <AISearchAnswer
            query={spokenText || searchQuery}
            spokenText={spokenText || undefined}
            businesses={filteredBusinesses}
            isSearchLoading={isLoading}
            onAnswerReady={handleAiAnswerReady}
            externalRegenerateKey={aiRegenerateKey}
          />
        </div>
      )}

      {/* Warning Overlay — forces user to pick city + category */}
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
            // If category is already known, dismiss overlay immediately to avoid
            // it reappearing when the new search resets detectedSubcategory
            if (selectedCategoryFilter || detectedSubcategory || detectedCategory) {
              setWarningDismissed(true);
            }
          }}
          onSelectCategory={(cat) => {
            setSelectedCategoryFilter(cat);
            // If city is already known, dismiss overlay immediately
            if ((selectedCity && selectedCity !== "all") || detectedCity) {
              setWarningDismissed(true);
            }
          }}
          onClose={() => setWarningDismissed(true)}
        />
      )}

      {/* AI Suggestion Overlay — fullscreen takeover shown on arrival from homepage */}
      {showAiPopup && (
        <div className="fixed inset-0 z-[9990] flex bg-white animate-in fade-in duration-200">
          {/* Left panel: AI suggestion */}
          <div ref={overlayLeftPanelRef} className={`relative flex flex-col justify-center transition-all duration-500 ease-out ${overlaySelectedBusiness ? "w-1/2 border-r border-border" : "w-full"}`}>
          {/* Mobile sticky top bar: speaker + CTA + close */}
          <div className="sticky top-0 left-0 right-0 sm:hidden flex items-center justify-between px-4 py-3 bg-white z-10">
            {/* Speaker left */}
            <div>
              {(ttsStatus === "playing" || ttsStatus === "loading") ? (
                <button
                  onClick={ttsStop}
                  className="p-2 rounded-full bg-black hover:bg-black/80 transition-colors"
                >
                  {ttsStatus === "loading" ? <Loader className="h-5 w-5 text-white animate-spin" /> : <VolumeX className="h-5 w-5 text-white" />}
                </button>
              ) : (
                <button
                  onClick={() => {
                    const cleanText = aiAnswerText.replace(/\*{1,2}/g, "").replace(/^[-•]\s+/gm, "").replace(/^\d+[.)]\s+/gm, "");
                    const intro = ttsIntroPhrase ? `${ttsIntroPhrase}. ` : "";
                    ttsIntroWordCountRef.current = intro.trim().split(/\s+/).filter(Boolean).length;
                    voiceLoopRef.current = true;
                    ttsSpeak(intro + cleanText + " … Vous pouvez me poser une autre question.", undefined, true);
                  }}
                  className="p-2 rounded-full bg-black hover:bg-black/80 transition-colors"
                  title={language === "en" ? "Listen" : language === "ar" ? "استمع" : "Écouter"}
                >
                  <Volume2 className="h-5 w-5 text-white" />
                </button>
              )}
            </div>
            {/* CTA center */}
            <button
              onClick={() => { setShowAiPopup(false); setOverlaySelectedBusiness(null); }}
              className="inline-flex items-center px-5 py-2 rounded-full bg-gold text-black text-sm font-semibold hover:bg-gold/90 transition-colors uppercase whitespace-nowrap"
            >
              {language === "en" ? "See results" : language === "ar" ? "عرض النتائج" : "Voir les résultats"}
            </button>
            {/* Close right */}
            <button
              onClick={() => { setShowAiPopup(false); setOverlaySelectedBusiness(null); }}
              className="p-2 rounded-full bg-black hover:bg-black/80 transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
          {/* Desktop close button */}
          <button
            onClick={() => { setShowAiPopup(false); setOverlaySelectedBusiness(null); }}
            className="absolute top-6 right-6 p-2 rounded-full bg-black hover:bg-black/80 transition-colors z-10 hidden sm:block"
          >
            <X className="h-6 w-6 text-white" />
          </button>

          {/* AI text — scrollable center, wider */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4">
            {/* Top section: query + count + top "Voir les résultats" */}
            <div className="pt-2 sm:pt-14 pb-3 text-center">
              {/* Desktop CTA */}
              <button
                onClick={() => { setShowAiPopup(false); setOverlaySelectedBusiness(null); }}
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gold text-black text-sm font-semibold hover:bg-gold/90 transition-colors mb-4"
              >
                {language === "en" ? "See results" : language === "ar" ? "عرض النتائج" : "Voir les résultats"}
              </button>
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
                  <p className="text-muted-foreground text-sm">
                    {language === "en" ? "Search results for" : language === "ar" ? "نتائج البحث عن" : "Résultats de recherche pour"}
                  </p>
                  <p className="text-lg md:text-xl font-bold text-foreground mt-1">
                    «&nbsp;{(spokenText || searchQuery)}&nbsp;»
                  </p>
                  {/* Active filters as chips — hidden on mobile */}
                  {(() => {
                    const chips: { label: string; color: string }[] = [];
                    if (selectedCity && selectedCity !== "all") chips.push({ label: `📍 ${selectedCity}`, color: "bg-secondary/15 text-secondary" });
                    if (selectedCategoryFilter) chips.push({ label: selectedCategoryFilter, color: "bg-primary/15 text-primary" });
                    if (selectedSubcategoryFilter) chips.push({ label: selectedSubcategoryFilter, color: "bg-primary/15 text-primary" });
                    if (selectedServiceFilter) chips.push({ label: selectedServiceFilter, color: "bg-gold/15 text-gold" });
                    if (detectedSubcategory && !selectedSubcategoryFilter && !selectedCategoryFilter) chips.push({ label: detectedSubcategory, color: "bg-muted text-muted-foreground" });
                    if (detectedCity && (!selectedCity || selectedCity === "all")) chips.push({ label: `📍 ${detectedCity}`, color: "bg-muted text-muted-foreground" });
                    return chips.length > 0 ? (
                      <div className="hidden sm:flex overflow-x-auto justify-center gap-1.5 mt-2 scrollbar-hide">
                        {chips.map((c, i) => (
                          <span key={i} className={`inline-block text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap ${c.color}`}>
                            {c.label}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  <p className="text-primary font-semibold mt-2">
                    {displayedResultsCount} {language === "en" ? "establishments found" : language === "ar" ? "مؤسسة وجدت" : "établissements trouvés"}
                  </p>
                </>
              )}
            </div>

            {/* Disambiguation prompts — only for Results tab */}
            {activeTab === "suggestions" && !selectedCategoryFilter && !detectedCategory && !selectedSubcategoryFilter && !detectedSubcategory && (() => {
              const cats = [...new Set(allBusinesses.map(b => b.main_category).filter(Boolean))] as string[];
              // If only 1 category, show subcategories directly
              if (cats.length === 1) {
                const singleCat = cats[0];
                const subCounts: Record<string, number> = {};
                for (const b of allBusinesses) {
                  if (b.main_category === singleCat && b.categories) {
                    for (const c of b.categories) {
                      subCounts[c] = (subCounts[c] || 0) + 1;
                    }
                  }
                }
                const subcatList = Object.entries(subCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => ({ name, count }));
                if (subcatList.length > 1) {
                  return (
                    <div className="pb-4">
                      <div className="max-w-3xl mx-auto text-center">
                        <p className="text-sm font-medium text-foreground mb-3">
                          {language === "en" ? "What are you looking for?" : language === "ar" ? "ماذا تبحث عنه؟" : "Que cherchez-vous ?"}
                        </p>
                        <div className="flex overflow-x-auto gap-2 scrollbar-hide">
                          {subcatList.map(sub => (
                            <button
                              key={sub.name}
                              onClick={() => {
                                setSelectedCategoryFilter(singleCat);
                                setSelectedSubcategoryFilter(sub.name);
                                setOverlaySelectedBusiness(null);
                                setAiAnswerText("");
                                setAiRegenerateKey(k => k + 1);
                              }}
                              className="shrink-0 px-4 py-2 rounded-full border border-border bg-card text-sm text-foreground hover:border-gold/50 hover:bg-gold/10 transition-colors whitespace-nowrap"
                            >
                              {sub.name}
                              <span className="ml-1.5 text-xs text-muted-foreground">{sub.count}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }
              }
              // Multiple categories or no subcats: show categories
              if (cats.length > 1) {
                return (
                  <div className="pb-4">
                    <div className="max-w-3xl mx-auto text-center">
                      <p className="text-sm font-medium text-foreground mb-3">
                        {language === "en" ? "What are you looking for?" : language === "ar" ? "ماذا تبحث عنه؟" : "Que cherchez-vous ?"}
                      </p>
                      <div className="flex overflow-x-auto gap-2 scrollbar-hide">
                        {cats.slice(0, 8).map(cat => (
                          <button
                            key={cat}
                            onClick={() => {
                              setSelectedCategoryFilter(cat);
                              setOverlaySelectedBusiness(null);
                              setAiAnswerText("");
                              setAiRegenerateKey(k => k + 1);
                            }}
                            className="shrink-0 px-4 py-2 rounded-full border border-border bg-card text-sm text-foreground hover:border-gold/50 hover:bg-gold/10 transition-colors whitespace-nowrap"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Subcategory disambiguation — only for Results tab */}
            {activeTab === "suggestions" && !selectedSubcategoryFilter && !detectedSubcategory && (selectedCategoryFilter || detectedCategory) && (() => {
              const effectiveCat = selectedCategoryFilter || detectedCategory;
              const subCounts: Record<string, number> = {};
              for (const b of allBusinesses) {
                if (b.main_category === effectiveCat && b.categories) {
                  for (const c of b.categories) {
                    subCounts[c] = (subCounts[c] || 0) + 1;
                  }
                }
              }
              const subcatList = Object.entries(subCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => ({ name, count }));
              if (subcatList.length <= 1) return null;
              return (
                <div className="pb-4">
                  <div className="max-w-3xl mx-auto text-center">
                    <p className="text-sm font-medium text-foreground mb-3">
                      {language === "en" ? "What type exactly?" : language === "ar" ? "أي نوع بالتحديد؟" : "Quel type précisément ?"}
                    </p>
                    <div className="flex overflow-x-auto gap-2 scrollbar-hide">
                      {subcatList.map(sub => (
                        <button
                          key={sub.name}
                          onClick={() => {
                            if (!selectedCategoryFilter && effectiveCat) setSelectedCategoryFilter(effectiveCat);
                            setSelectedSubcategoryFilter(sub.name);
                            setOverlaySelectedBusiness(null);
                            setAiAnswerText("");
                            setAiRegenerateKey(k => k + 1);
                          }}
                          className="shrink-0 px-4 py-2 rounded-full border border-border bg-card text-sm text-foreground hover:border-gold/50 hover:bg-gold/10 transition-colors whitespace-nowrap"
                        >
                          {sub.name}
                          <span className="ml-1.5 text-xs text-muted-foreground">{sub.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {activeTab === "suggestions" && (!selectedCity || selectedCity === "all") && !detectedCity && (
              <div className="pb-4">
                <div className="max-w-3xl mx-auto text-center">
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

            <div className="max-w-3xl mx-auto">
              <div className="text-xs sm:text-base text-foreground/80 leading-relaxed whitespace-pre-line">
                {(() => {
                  const currentAiText = activeTab === "poi" ? poiAiText : activeTab === "destinations" ? destAiText : aiAnswerText;
                  const isCurrentLoading = activeTab === "poi" ? isPoiAiLoading : activeTab === "destinations" ? isDestAiLoading : (!aiAnswerText || isAiRegenerating);
                  if (isCurrentLoading) {
                    return (
                      <div className="flex items-center gap-3 py-8 justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-gold" />
                        <span className="text-sm italic text-muted-foreground">
                          {language === "en" ? "Generating suggestion…" : language === "ar" ? "جاري إنشاء الاقتراح…" : "Génération de la suggestion…"}
                        </span>
                      </div>
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
                    : allBusinesses as unknown as AIBusinessData[];
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
                      : undefined
                  );
                })()}
              </div>

              {/* 3 boutons + Voir résultats — sous le texte IA, même marge que le haut */}
              <div className="flex flex-col items-center gap-4 pt-14 pb-24">
                <button
                  onClick={() => { setShowAiPopup(false); setOverlaySelectedBusiness(null); }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gold text-black text-sm font-semibold hover:bg-gold/90 transition-colors"
                >
                  {language === "en" ? "See results" : language === "ar" ? "عرض النتائج" : "Voir les résultats"}
                  <ChevronRight className="h-4 w-4" />
                </button>
                {/* Adresse géolocalisée */}
                {geo.isEnabled && (geo.confirmedAddress || geo.detectedCity) && (
                  <p className="text-sm text-muted-foreground font-medium">
                    📍 {geo.confirmedAddress || geo.detectedCity}
                  </p>
                )}
                <div className="flex items-center justify-center gap-16">
                  {/* Listen */}
                  <div className="relative flex items-center justify-center">
                    <span className="absolute w-16 h-16 rounded-full border border-secondary/40 animate-[ripple_2.4s_ease-out_infinite]" />
                    <span className="absolute w-16 h-16 rounded-full border border-secondary/30 animate-[ripple_2.4s_ease-out_0.6s_infinite]" />
                    <span className="absolute w-16 h-16 rounded-full border border-secondary/20 animate-[ripple_2.4s_ease-out_1.2s_infinite]" />
                    {(ttsStatus === "playing" || ttsStatus === "loading") ? (
                      <button
                        onClick={ttsStop}
                        className="relative z-10 w-16 h-16 rounded-full bg-black flex items-center justify-center shadow-lg transition-all hover:scale-105"
                      >
                        {ttsStatus === "loading" ? <Loader className="h-7 w-7 text-white animate-spin" /> : <VolumeX className="h-7 w-7 text-white" />}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const cleanText = aiAnswerText.replace(/\*{1,2}/g, "").replace(/^[-•]\s+/gm, "").replace(/^\d+[.)]\s+/gm, "");
                          const intro = ttsIntroPhrase ? `${ttsIntroPhrase}. ` : "";
                          ttsIntroWordCountRef.current = intro.trim().split(/\s+/).filter(Boolean).length;
                          voiceLoopRef.current = true;
                          ttsSpeak(intro + cleanText + " … Vous pouvez me poser une autre question.", undefined, true);
                        }}
                        className="relative z-10 w-16 h-16 rounded-full bg-black flex items-center justify-center shadow-lg transition-all hover:scale-105"
                        title={language === "en" ? "Listen" : language === "ar" ? "استمع" : "Écouter"}
                      >
                        <Volume2 className="h-7 w-7 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>

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
      )}
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
        />
      )}

      {activeTab === "hashtag" && badgeIdParam && (
        <HashtagTabContent
          badgeId={badgeIdParam}
          badgeLabel={badgeLabelParam || "#"}
          onOpenVideo={(bizId, videoUrl) => {
            setCompactPanelInitialVideoUrl(videoUrl);
            openCompactPanel({ id: bizId, name: "" } as any);
          }}
        />
      )}





      {activeTab === "suggestions" && (
        <>
          <ResultsTabContent
            resultsRef={resultsRef}
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
            filteredBusinesses={filteredBusinesses}
            paginatedBusinesses={paginatedBusinesses}
            businessLabelLogos={businessLabelLogos}
            mapPoiItems={mapPoiItems}
            mapCenterForResults={mapCenterForResults}
            hoveredResultId={hoveredResultId}
            setHoveredResultId={setHoveredResultId}
            currentPage={currentPage}
            totalPages={totalPages}
            startResult={startResult}
            endResult={endResult}
            displayedResultsCount={displayedResultsCount}
            goToPage={goToPage}
            stickyAiText={stickyAiText}
            searchQuery={searchQuery}
            spokenText={spokenText}
            activeTimeSlot={activeTimeSlot}
            language={language}
            openCompactPanel={openCompactPanel}
            getDistanceKm={getDistanceKm}
            setShowMobileMap={setShowMobileMap}
            setShowAiPopup={setShowAiPopup}
            t={t}
            effectiveCity={effectiveCityForMap}
            onFrontStructureFilter={(subNames) => setFsFilterSubcategories(subNames)}
            fsTopBusinessId={fsTopBusinessId}
            hideAiSuggestion={!!searchParams.get("pinIds")}
            allCityMapBusinesses={allCityMapBusinesses}
            hotelSearchInfo={hotelSearchInfoForResults}
          />
        </>
      )}

      {/* Mobile/Tablet Map Overlay — slide-in from right */}
      {isSubDesktop && showMobileMap && (
        <div className="fixed inset-0 z-[201] bg-background animate-slide-in-right lg:hidden">
          {activeTab === "suggestions" ? (
            <div className="absolute top-0 left-0 right-0 z-[80] flex flex-col backdrop-blur-sm">
              <div className="flex items-center gap-3 px-3 py-3">
                <button
                  onClick={() => setShowMobileMap(false)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-black shadow-lg shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium text-white truncate drop-shadow-md">
                  {mobileMapPoiItemsFinal.length} {language === "en" ? "results for" : language === "ar" ? "نتائج لـ" : "résultats pour"} "{mobileFsTabId ? `${mobileFrontTabs.find(t => t.id === mobileFsTabId)?.name || ''}${effectiveCityForMap ? ` à ${effectiveCityForMap}` : ''}`.trim() : searchQuery}"
                </span>
              </div>
              {mobileFrontTabs.length > 0 && (
                <FrontStructureNavBar
                  tabs={mobileFrontTabs}
                  activeTabId={mobileFsTabId}
                  onTabClick={(tabId) => {
                    setMobileFsTabId(tabId);
                    if (!tabId) {
                      setFsFilterSubcategories(null);
                    } else {
                      const tab = mobileFrontTabs.find(t => t.id === tabId);
                      if (tab) {
                        setFsFilterSubcategories(new Set(tab.subcategoryNames));
                      }
                    }
                  }}
                />
              )}
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
              subcategoryIconMap={activeTab === "suggestions" ? subcategoryIconMap : undefined}
              highlightColor={activeTab === "suggestions" ? { bg: "#D4AF37", fg: "#1a1a1a", border: "#D4AF37" } : undefined}
            />
            <PanelSearchBar
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
        onVoiceStart={() => toggleRecording()}
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

      {/* Bottom floating search bar — hidden when the right-side Google Map is visible (it has its own search bar) */}
      {(() => {
        const rightMapVisible = hasKnownLocation && !compactPanelBusiness && (
          (activeTab === "suggestions" && !hideResultsMap) ||
          (activeTab === "poi" && !hidePoiMap) ||
          (activeTab === "destinations" && !hideDestMap)
        );
        return !compactPanelBusiness && !rightMapVisible;
      })() && (
        <>
          {bottomSearchOverlayOpen && (
            <div
              className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
              onClick={() => setBottomSearchCloseTrigger((n) => n + 1)}
            />
          )}
          <div
            className={`fixed pointer-events-none ${
              bottomSearchOverlayOpen
                ? "inset-y-0 left-1/2 -translate-x-1/2 w-full lg:w-1/2 z-[201]"
                : "bottom-0 left-1/2 -translate-x-1/2 w-[90%] lg:w-1/2 z-[85]"
            }`}
          >
            <div className="relative w-full h-full pointer-events-auto">
              <PanelSearchBar
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
                closeTrigger={bottomSearchCloseTrigger}
                noToolbarOffset
                iconVariant="black"
                solidBackground
              />
            </div>
          </div>
        </>
      )}

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
            style={{ height: isSubDesktop ? undefined : "100vh" }}
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
    </div>
  );
};

export default SearchPage;
