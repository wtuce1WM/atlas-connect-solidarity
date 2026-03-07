import { useSearchParams, Link, useNavigate } from "react-router-dom";
import SearchInput from "@/components/SearchInput";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGeolocation } from "@/hooks/useGeolocation";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import { extractTimeSlot, isOpenDuringSlot, getCurrentTimePeriod, type TimeSlot, type TimePeriod } from "@/lib/timeSlots";
import zitounMaskImg from "@/assets/zitoun-mask.jpg";
import logoGold from "@/assets/logoGOLDsimple.webp";
import LoadingScreen from "@/components/LoadingScreen";
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

import { Loader2, Building2, ChevronLeft, ChevronRight, Search, Mic, Loader, MapPin, MapPinOff, X, Volume2, VolumeX, Clock, Map, Sparkles, SlidersHorizontal, ChevronDown, ChevronUp, RefreshCw, Compass, Maximize2, Minimize2 } from "lucide-react";
import MoreFiltersPopup from "@/components/MoreFiltersPopup";
import { lazy, Suspense } from "react";
const BusinessMap = lazy(() => import("@/components/BusinessMap"));
import PoiSection from "@/components/PoiSection";
import DestinationSection, { type DestinationItem } from "@/components/DestinationSection";
import DestinationBusinessesPanel from "@/components/DestinationBusinessesPanel";
import BusinessCard, { type BusinessCardData, type Gamme, type Badge, type SubcategoryRef, type BadgeSubcategoryRef } from "@/components/BusinessCard";
import AISearchAnswer, { parseInline, type BusinessData as AIBusinessData } from "@/components/AISearchAnswer";
import BusinessSlidePanel from "@/components/BusinessSlidePanel";
import SlidePanelHeader from "@/components/SlidePanelHeader";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useToast } from "@/hooks/use-toast";
import LocationPickerDialog from "@/components/LocationPickerDialog";

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
  services: string[] | null;
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
  zone_chalandise?: string | null;
  is_visible_locale?: boolean;
  zone_city_ids?: string[] | null;
}

interface SearchResult {
  businesses: Business[];
  searchLevel: string;
  message: string;
  totalResults: number;
  totalCount?: number;
  detectedSubcategory?: string | null;
  detectedCity?: string | null;
  searchMode?: string | null;
  bundleTimeSlots?: string[];
  disambiguationType?: "needs_category" | "needs_city" | null;
  synonymUsed?: boolean;
  preciseMatch?: boolean;
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

// Horizontal scroll row for grouped subcategory view
const GroupedSubcategoryRow = ({
  subcategory,
  businesses,
  gammes,
  badges,
  subcategories: subcategoriesRef,
  badgeSubcategories,
  verifiedLabel,
  getDistanceKm,
  activeTimeSlot,
}: {
  subcategory: string;
  businesses: Business[];
  gammes: Gamme[];
  badges: Badge[];
  subcategories: SubcategoryRef[];
  badgeSubcategories: BadgeSubcategoryRef[];
  verifiedLabel: string;
  getDistanceKm: (b: Business) => number | null;
  activeTimeSlot: TimeSlot | null;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, [checkScroll, businesses.length]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-foreground">{subcategory}</h2>
        <span className="text-sm text-muted-foreground">({businesses.length})</span>
        <div className="flex-1 h-px bg-border" />
        {(canScrollLeft || canScrollRight) && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-gold/40 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-gold/40 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {businesses.map((business) => (
          <div key={business.id} className="snap-start shrink-0 w-[280px] sm:w-[300px]">
            <BusinessCard
              business={business as BusinessCardData}
              gammes={gammes}
              badges={badges}
              subcategories={subcategoriesRef}
              badgeSubcategories={badgeSubcategories}
              verifiedLabel={verifiedLabel}
              distanceKm={getDistanceKm(business)}
              activeTimeSlot={activeTimeSlot}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [detectedSubcategory, setDetectedSubcategory] = useState<string | null>(null);
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
  
  const categoryFromUrl = searchParams.get("category") || "";
  const [celebrityBusinesses, setCelebrityBusinesses] = useState<Business[]>([]);
  const [ttsIntroPhrase, setTtsIntroPhrase] = useState<string>("");
  const [aiAnswerText, setAiAnswerText] = useState<string>("");
   const [activeTab, setActiveTab] = useState<"suggestions" | "map" | "poi" | "destinations">("suggestions");
   const [detectedCity, setDetectedCity] = useState<string | null>(null);
   const [disambiguationType, setDisambiguationType] = useState<"needs_category" | "needs_city" | null>(null);
   const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
   const [selectedSubcategoryFilter, setSelectedSubcategoryFilter] = useState<string | null>(null);
   const [selectedServiceFilter, setSelectedServiceFilter] = useState<string | null>(null);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [moreFilterTimeSlots, setMoreFilterTimeSlots] = useState<string[]>([]);
  const [moreFilterEngagements, setMoreFilterEngagements] = useState<string[]>([]);
  const [moreFilterCommodites, setMoreFilterCommodites] = useState<string[]>([]);
  const [moreFilterMatchingIds, setMoreFilterMatchingIds] = useState<Set<string> | null>(null);
  const [extraFilterBusinesses, setExtraFilterBusinesses] = useState<Business[]>([]);

  // Track whether a category/subcategory filter is active (compact AI mode)
  const isCategoryFilterActive = !!(selectedCategoryFilter || selectedSubcategoryFilter || selectedServiceFilter);
  const [isAiSummaryExpanded, setIsAiSummaryExpanded] = useState(false);

  // Collapse AI summary and scroll results into view when any filter changes
  useEffect(() => {
    setIsAiSummaryExpanded(false);
    // After a filter change, ensure the results section is visible below the sticky stack
    requestAnimationFrame(() => {
      const resultsEl = resultsRef.current;
      if (!resultsEl) return;
      const aiBar = document.querySelector<HTMLElement>('[data-ai-bar]');
      const lastSticky = aiBar
        || document.querySelector<HTMLElement>('[data-search-service-filter]')
        || document.querySelector<HTMLElement>('[data-service-filter]')
        || document.querySelector<HTMLElement>('[data-subcategory-filter]')
        || document.querySelector<HTMLElement>('[data-category-filter]')
        || document.querySelector<HTMLElement>('[data-city-bar]')
        || document.querySelector<HTMLElement>('[data-tab-bar]');
      if (!lastSticky) return;
      const stickyComputedTop = Number.parseFloat(window.getComputedStyle(lastSticky).top || '0');
      const stickyH = lastSticky.getBoundingClientRect().height;
      const stickyBottom = (Number.isFinite(stickyComputedTop) ? stickyComputedTop : 0) + stickyH;
      const resultsTop = resultsEl.getBoundingClientRect().top + window.scrollY;
      const targetScroll = resultsTop - stickyBottom - 8;
      if (window.scrollY > targetScroll) {
        window.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
      }
    });
  }, [selectedCategoryFilter, selectedSubcategoryFilter, selectedServiceFilter, selectedCity]);

  // Fetch extra businesses from DB when entonnoir filters narrow beyond search results
  // Skip when the search returned precise results (synonym or service/keyword detection)
  useEffect(() => {
    if (!selectedCategoryFilter || preciseMatch) {
      setExtraFilterBusinesses([]);
      return;
    }
    const fetchExtra = async () => {
      // Use detectedCity from search engine as fallback when no city is manually selected
      const effectiveCity = (selectedCity && selectedCity !== "all") ? selectedCity : detectedCity;
      
      let query = supabase
        .from("businesses")
        .select("id, name, description, city, region, address, phone, whatsapp, skype, website, logo_url, images, main_category, categories, services, wtuce_status, is_regulated_activity, latitude, longitude, google_maps_url, rating, gamme_id, badge_id, hook_fr, hook_en, hook_ar, google_rating, tripadvisor_rating, restaurant_guru_rating, google_review_count, tripadvisor_review_count, restaurant_guru_review_count, opening_hours, is_open_24h, vacation_dates, zone_chalandise, is_visible_locale, zone_city_ids")
        .eq("is_active", true)
        .eq("main_category", selectedCategoryFilter);

      if (effectiveCity) {
        query = query.ilike("city", effectiveCity);
      }

      if (selectedSubcategoryFilter) {
        query = query.contains("categories", [selectedSubcategoryFilter]);
      }
      if (selectedServiceFilter) {
        query = query.contains("services", [selectedServiceFilter]);
      }

      const { data } = await query.limit(200);
      if (data) {
        const mapped = data.map((b: any) => ({
          ...b,
          distance_km: null,
        })) as Business[];
        setExtraFilterBusinesses(mapped);
      }
    };
    fetchExtra();
  }, [selectedCategoryFilter, selectedSubcategoryFilter, selectedServiceFilter, selectedCity, detectedCity, preciseMatch]);

   // Track when user has scrolled down to the tab bar — lock scroll above it from that point
   const [hasReachedTabBar, setHasReachedTabBar] = useState(false);

   useEffect(() => {
     setHasReachedTabBar(false);
   }, [searchQuery]);

   useEffect(() => {
     const handleScroll = () => {
       const tabBar = document.querySelector('[data-tab-bar]');
       if (!tabBar) return;
       const tabBarTop = tabBar.getBoundingClientRect().top + window.scrollY - 60;
       // Once the user scrolls to the tab bar, lock it
       if (!hasReachedTabBar && window.scrollY >= tabBarTop && tabBarTop > 0) {
         setHasReachedTabBar(true);
       }
       // When locked, prevent scrolling above the tab bar
       if (hasReachedTabBar && window.scrollY < tabBarTop) {
         window.scrollTo({ top: tabBarTop, behavior: "auto" });
       }
     };
     window.addEventListener("scroll", handleScroll, { passive: false });
     return () => window.removeEventListener("scroll", handleScroll);
   }, [hasReachedTabBar, searchQuery]);

   // Measure sticky bar heights dynamically for perfect stacking
   const [stickyTops, setStickyTops] = useState({ cityBar: 104, serviceBar: 148 });
   const [stickyStackPadding, setStickyStackPadding] = useState(0);
   useEffect(() => {
     const measure = () => {
       const tabBar = document.querySelector<HTMLElement>('[data-tab-bar]');
       const cityBar = document.querySelector<HTMLElement>('[data-city-bar]');
       const tabH = tabBar ? tabBar.getBoundingClientRect().height : 44;
       const cityBarTop = 60 + tabH;
       const cityH = cityBar ? cityBar.getBoundingClientRect().height : 0;
       const serviceBarTop = cityBarTop + cityH;
       setStickyTops(prev => {
         if (prev.cityBar === cityBarTop && prev.serviceBar === serviceBarTop) return prev;
         return { cityBar: cityBarTop, serviceBar: serviceBarTop };
       });

       // Measure the bottom of the last sticky bar to compute content padding
       const aiBar = document.querySelector<HTMLElement>('[data-ai-bar]');
       const searchSvcBar = document.querySelector<HTMLElement>('[data-search-service-filter]');
       const svcBar = document.querySelector<HTMLElement>('[data-service-filter]');
       const subBar = document.querySelector<HTMLElement>('[data-subcategory-filter]');
       const catBar = document.querySelector<HTMLElement>('[data-category-filter]');
       const lastSticky = aiBar || searchSvcBar || svcBar || subBar || catBar || cityBar || tabBar;
       if (lastSticky) {
         const computedTop = Number.parseFloat(window.getComputedStyle(lastSticky).top || '0');
         const h = lastSticky.getBoundingClientRect().height;
         const bottom = (Number.isFinite(computedTop) ? computedTop : 0) + h;
         setStickyStackPadding(prev => prev === bottom ? prev : bottom);
       }
     };
     // Measure after DOM settles
     const t1 = setTimeout(measure, 50);
     const t2 = setTimeout(measure, 300);
     const t3 = setTimeout(measure, 800);
     window.addEventListener("resize", measure);
     return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); window.removeEventListener("resize", measure); };
   });

   const [aiRegenerateKey, setAiRegenerateKey] = useState(0);
   const [isAiRegenerating, setIsAiRegenerating] = useState(false);
    const [compactPanelBusiness, setCompactPanelBusiness] = useState<AIBusinessData | null>(null);
    const [isCompactPanelExpanded, setIsCompactPanelExpanded] = useState(false);
     const [poiSelectedBusinessId, setPoiSelectedBusinessId] = useState<string | null>(null);
     const [poiPanelExpanded, setPoiPanelExpanded] = useState(false);
     const [poiBusinessImageCount, setPoiBusinessImageCount] = useState(0);
     const [poiMapBusiness, setPoiMapBusiness] = useState<{ name: string; latitude: number | null; longitude: number | null; address: string | null; google_maps_url: string | null; id: string } | null>(null);
     const [allPois, setAllPois] = useState<PoiMapItem[]>([]);
     const [destMapItem, setDestMapItem] = useState<{ id: string; name_fr: string; latitude: number | null; longitude: number | null } | null>(null);
     const [allDests, setAllDests] = useState<PoiMapItem[]>([]);
      const [selectedDestination, setSelectedDestination] = useState<DestinationItem | null>(null);
      const [destSelectedBusinessId, setDestSelectedBusinessId] = useState<string | null>(null);
      const [destPanelExpanded, setDestPanelExpanded] = useState(false);
     const [allDestItems, setAllDestItems] = useState<DestinationItem[]>([]);
   const resetPanelStates = () => {
     setPoiSelectedBusinessId(null);
     setPoiPanelExpanded(false);
     setPoiMapBusiness(null);
     setDestMapItem(null);
     setSelectedDestination(null);
     setDestSelectedBusinessId(null);
     setDestPanelExpanded(false);
   };
   const [locationDialogOpen, setLocationDialogOpen] = useState(false);
   const heroAiRef = useRef<HTMLDivElement>(null);
   const [hasScrolledPastHeroAi, setHasScrolledPastHeroAi] = useState(false);
    const [showAiPopup, setShowAiPopup] = useState(false);
    const aiPopupShownRef = useRef(false);
    const [overlaySelectedBusiness, setOverlaySelectedBusiness] = useState<AIBusinessData | null>(null);
    const [isOverlayPanelExpanded, setIsOverlayPanelExpanded] = useState(false);
    const overlayLeftPanelRef = useRef<HTMLDivElement>(null);
   // Reset when query changes
   useEffect(() => {
     setHasScrolledPastHeroAi(false);
     aiPopupShownRef.current = false;
   }, [searchQuery]);

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

  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

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
  const [showResultsOverlay, setShowResultsOverlay] = useState(false);
  const [overlayDismissing, setOverlayDismissing] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
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

  // Auto-select city from geolocation only when there is no active search query
  useEffect(() => {
    const hasActiveQuery = !!searchQuery.trim() || !!categoryFromUrl;
    if (!hasActiveQuery && !queryHasExplicitCity && geo.isEnabled && geo.detectedCity && selectedCity === "all") {
      setSelectedCity(geo.detectedCity);
      setIsGeoCityAutoSelected(true);
    }
  }, [searchQuery, categoryFromUrl, queryHasExplicitCity, geo.isEnabled, geo.detectedCity, selectedCity]);

  // If query explicitly targets a city, don't keep a stale geo city filter
  useEffect(() => {
    if (queryHasExplicitCity && selectedCity !== "all") {
      setSelectedCity("all");
      setIsGeoCityAutoSelected(false);
    }
  }, [queryHasExplicitCity, selectedCity]);

  // Clear auto geo city filter as soon as user starts a free-text search without explicit city
  useEffect(() => {
    if (isGeoCityAutoSelected && !!searchQuery.trim() && !queryHasExplicitCity && selectedCity !== "all") {
      setSelectedCity("all");
      setIsGeoCityAutoSelected(false);
    }
  }, [isGeoCityAutoSelected, searchQuery, queryHasExplicitCity, selectedCity]);

  // If query has country scope (e.g. "maroc"), force "all" cities
  useEffect(() => {
    if (queryHasCountryScope && selectedCity !== "all") {
      setSelectedCity("all");
      setIsGeoCityAutoSelected(false);
    }
  }, [queryHasCountryScope, selectedCity]);

  // Regenerate AI answer when city filter changes (e.g. "hotel" + city selection)
  const prevCityForAiRef = useRef<string>(selectedCity);
  useEffect(() => {
    const prev = prevCityForAiRef.current;
    prevCityForAiRef.current = selectedCity;
    // Only trigger when city actually changed, there's a search query, and we already have results
    if (prev === selectedCity) return;
    if (!searchQuery.trim() || isLoading) return;
    if (allBusinesses.length === 0) return;

    // Build the filtered list for the new city
    const cityFiltered = (selectedCity && selectedCity !== "all")
      ? allBusinesses.filter(b => {
          if (b.city === selectedCity) return true;
          const cId = citiesWithPriority.find(c => c.name === selectedCity)?.id;
          if (cId && b.zone_city_ids?.includes(cId) && b.is_visible_locale) return true;
          return false;
        })
      : allBusinesses;

    if (cityFiltered.length === 0) return;

    const top10 = cityFiltered.slice(0, 10);
    const combinedQuery = (selectedCity && selectedCity !== "all")
      ? `${searchQuery} ${selectedCity}`
      : searchQuery;

    setIsAiRegenerating(true);
    setIsAiSummaryExpanded(false);
    supabase.functions.invoke("ai-search-answer", {
      body: {
        query: combinedQuery,
        spokenText: spokenText || undefined,
        businesses: top10.map(b => ({
          name: b.name,
          city: b.city,
          main_category: b.main_category,
          categories: b.categories,
          hook_fr: b.hook_fr,
          wtuce_status: b.wtuce_status,
        })),
        language,
      },
    }).then(({ data }) => {
      if (data?.answer) setAiAnswerText(data.answer);
    }).catch(e => {
      console.error("AI city-regenerate error:", e);
    }).finally(() => {
      setIsAiRegenerating(false);
    });
  }, [selectedCity]);

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
      (data || []).forEach((b: any) => {
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
        const msg = lang === "en"
          ? `I couldn't find ${hotelName} in our directory.`
          : `Je n'ai pas trouvé ${hotelName} dans notre annuaire.`;
        ttsSpeak(msg);
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
        const msg = lang === "en"
          ? `${biz.name} doesn't have real-time availability enabled yet.`
          : `${biz.name} n'a pas encore la disponibilité en temps réel activée.`;
        ttsSpeak(msg);
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

      // 5. Build TTS response
      let ttsMsg: string;
      if (allOffers.length === 0) {
        ttsMsg = lang === "en"
          ? `Sorry, ${biz.name} has no availability from ${finalCheckIn} to ${finalCheckOut}.`
          : `Désolé, ${biz.name} n'a aucune disponibilité du ${formatDateFr(finalCheckIn)} au ${formatDateFr(finalCheckOut)}.`;
      } else {
        const cheapest = allOffers.reduce((min, o) =>
          parseFloat(o.price.total) < parseFloat(min.price.total) ? o : min
        );
        const priceStr = `${Math.round(parseFloat(cheapest.price.total))} ${cheapest.price.currency}`;

        ttsMsg = lang === "en"
          ? `${biz.name} has ${allOffers.length} room${allOffers.length > 1 ? "s" : ""} available from ${finalCheckIn} to ${finalCheckOut}, starting at ${priceStr}.`
          : `${biz.name} a ${allOffers.length} chambre${allOffers.length > 1 ? "s" : ""} disponible${allOffers.length > 1 ? "s" : ""} du ${formatDateFr(finalCheckIn)} au ${formatDateFr(finalCheckOut)}, à partir de ${priceStr}.`;
      }

      voiceLoopRef.current = true;
      ttsSpeak(ttsMsg);

    } catch (err) {
      console.error("Hotel availability voice error:", err);
      const msg = lang === "en"
        ? "Sorry, I couldn't check the availability. Please try again."
        : "Désolé, je n'ai pas pu vérifier la disponibilité. Réessayez.";
      ttsSpeak(msg);
    }
  }, [language, ttsSpeak]);

  const { status: voiceStatus, toggleRecording, liveTranscript } = useVoiceSearch({
    onTranscript: (keywords, spoken, category, timeKeyword) => {
      isVoiceSearchRef.current = true;
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
    onError: (message) => {
      toast({ variant: "destructive", title: "Erreur microphone", description: message });
    },
  });
  toggleRecordingRef.current = toggleRecording;

  // Get cities available in results, sorted by priority score
  // Show cities that are either the direct city of a result OR covered via zone_city_ids
  const availableCities = useMemo(() => {
    // Collect direct cities
    const coveredCityNames = new Set<string>();
    const coveredCityIds = new Set<string>();

    for (const b of allBusinesses) {
      if (b.city) coveredCityNames.add(b.city);
      if (b.zone_city_ids && b.is_visible_locale) {
        for (const cid of b.zone_city_ids) {
          coveredCityIds.add(cid);
        }
      }
    }

    return citiesWithPriority
      .filter(c => coveredCityNames.has(c.name) || (c.id && coveredCityIds.has(c.id)))
      .sort((a, b) => a.priority - b.priority)
      .map(c => c.name);
  }, [allBusinesses, citiesWithPriority]);

  const getEffectiveRating = (b: typeof allBusinesses[0]): number | null => {
    if (b.rating) return Number(b.rating);
    return computeWeightedRatingOn20(collectRatingSources(b));
  };

  // Compute distance between user coords and a business
  const getDistanceKm = useCallback((b: Business): number | null => {
    if (!geo.isEnabled || !geo.coords || b.latitude == null || b.longitude == null) return null;
    const R = 6371;
    const dLat = ((b.latitude - geo.coords.lat) * Math.PI) / 180;
    const dLon = ((b.longitude - geo.coords.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((geo.coords.lat * Math.PI) / 180) *
        Math.cos((b.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [geo.isEnabled, geo.coords]);

  // Sort: WTUCE verified first (by rating desc), then non-verified (by rating desc)
  const sortWtuceAndRating = (a: Business, b: Business) => {
    const aVerified = a.wtuce_status === "verified" ? 0 : 1;
    const bVerified = b.wtuce_status === "verified" ? 0 : 1;
    if (aVerified !== bVerified) return aVerified - bVerified;
    return (getEffectiveRating(b) ?? -1) - (getEffectiveRating(a) ?? -1);
  };

  // Filter businesses by city. Include businesses that cover the city via zone_city_ids.
  const selectedCityId = useMemo(() => {
    if (!selectedCity || selectedCity === "all") return null;
    return citiesWithPriority.find(c => c.name === selectedCity)?.id || null;
  }, [selectedCity, citiesWithPriority]);

  const filteredBusinesses = useMemo(() => {
    // Merge search results with extra businesses fetched for entonnoir filters (deduplicate by id)
    const mergedBase = selectedCategoryFilter && extraFilterBusinesses.length > 0
      ? (() => {
          const ids = new Set(allBusinesses.map(b => b.id));
          const extras = extraFilterBusinesses.filter(b => !ids.has(b.id));
          return [...allBusinesses, ...extras];
        })()
      : allBusinesses;
    let filtered = mergedBase;
    if (selectedCity && selectedCity !== "all") {
      filtered = mergedBase.filter(b => {
        // Direct city match
        if (b.city === selectedCity) return true;
        // National/zone businesses that cover this city
        if (selectedCityId && b.zone_city_ids?.includes(selectedCityId) && b.is_visible_locale) return true;
        return false;
      });
    }
    // Apply category filter from CityCategoryFilter
    if (selectedCategoryFilter) {
      filtered = filtered.filter(b => b.main_category === selectedCategoryFilter);
    }
    // Apply subcategory filter
    if (selectedSubcategoryFilter) {
      filtered = filtered.filter(b => b.categories && b.categories.includes(selectedSubcategoryFilter));
    }
    // Apply service filter
    if (selectedServiceFilter) {
      filtered = filtered.filter(b => b.services && b.services.includes(selectedServiceFilter));
    }
    // Apply "More filters" engagement/commodité filter
    if (moreFilterMatchingIds) {
      filtered = filtered.filter(b => moreFilterMatchingIds.has(b.id));
    }
    // Apply "More filters" time slot filter
    if (moreFilterTimeSlots.length > 0) {
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
      return hasActiveSearch ? [...openDuring, ...rest] : [...openDuring.sort(sortWtuceAndRating), ...rest.sort(sortWtuceAndRating)];
    }

    // Always sort by WTUCE status first, then by rating (highest first)
    return [...filtered].sort(sortWtuceAndRating);
  }, [allBusinesses, extraFilterBusinesses, selectedCity, selectedCityId, selectedCategoryFilter, selectedSubcategoryFilter, selectedServiceFilter, activeTimeSlot, searchQuery, categoryFromUrl, moreFilterMatchingIds, moreFilterTimeSlots]);

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

  const searchServiceFilters = useMemo(() => {
    if (!searchQuery.trim() || allBusinesses.length === 0) return [];
    if (selectedCategoryFilter || selectedSubcategoryFilter) return [];

    // Determine which service names are allowed based on detected subcategory
    let allowedNames: Set<string>;
    if (detectedSubcategory && filteredServicesBySubcategory[detectedSubcategory]) {
      allowedNames = filteredServicesBySubcategory[detectedSubcategory];
    } else {
      allowedNames = allFilteredServiceNames;
    }

    const source = selectedCity === "all" ? allBusinesses : allBusinesses.filter(b => b.city === selectedCity);
    const countMap: Record<string, number> = {};
    for (const b of source) {
      if (b.services) {
        for (const s of b.services) {
          if (!allowedNames.has(s)) continue;
          // If this service has city restrictions (from service_city_filters), respect them
          const allowedCities = serviceCityLookup[s];
          if (allowedCities && allowedCities.length > 0 && selectedCity !== "all") {
            if (!allowedCities.some(c => c.toLowerCase() === selectedCity.toLowerCase())) continue;
          }
          countMap[s] = (countMap[s] || 0) + 1;
        }
      }
    }
    return Object.entries(countMap)
      .filter(([, count]) => count >= 1)
      .sort((a, b) => a[0].localeCompare(b[0], "fr"))
      .map(([name, count]) => ({ name, count }));
  }, [searchQuery, allBusinesses, selectedCity, selectedCategoryFilter, selectedSubcategoryFilter, serviceCityLookup, allFilteredServiceNames, filteredServicesBySubcategory, detectedSubcategory]);

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

  // Paginate (only for non-grouped view)
  const totalPages = Math.ceil(filteredBusinesses.length / ITEMS_PER_PAGE);
  const paginatedBusinesses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBusinesses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBusinesses, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, searchQuery, selectedCategoryFilter, selectedSubcategoryFilter, selectedServiceFilter]);

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
      setDetectedSubcategory(null);
      setSynonymUsed(false);
      setPreciseMatch(false);
      setSearchMode(null);
      try {
        // Fetch cities with sort_order
        const { data: citiesData } = await supabase
          .from("cities")
          .select("id, name_fr, sort_order, latitude, longitude")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (fetchId !== latestFetchIdRef.current) return;

        if (citiesData) {
          setCitiesWithPriority(
            citiesData.map(c => ({ name: c.name_fr, id: c.id, priority: c.sort_order || 0, latitude: c.latitude, longitude: c.longitude }))
          );
        }

        // Use edge function for full-text search
        const { data, error } = await supabase.functions.invoke<SearchResult>("business-search", {
          body: { 
            query: searchQuery.trim() || categoryFromUrl || undefined,
            spoken: spokenText || undefined,
            language: language,
            limit: 500,
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
           setDisambiguationType(data.disambiguationType || null);

          // Auto-select category + subcategory when engine detected a subcategory
          if (finalDetectedSubcategory && businesses.length > 0) {
            // Derive parent category from a business that actually has the detected subcategory
            const matchingBusiness = businesses.find(b => 
              b.categories?.includes(finalDetectedSubcategory!)
            ) || businesses[0];
            const parentCategory = matchingBusiness?.main_category || null;
            setSelectedCategoryFilter(parentCategory);
            setSelectedSubcategoryFilter(finalDetectedSubcategory);
            setSelectedServiceFilter(null);

            // Auto-select city if not detected and only one city in results
            // Only auto-select when geolocation is enabled; when geo is off, keep national scope
            if (!data.detectedCity && !queryHasCountryScope && geo.isEnabled) {
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
            setTotalCount(data.totalCount || null);
            setSearchMessage(data.message || "");
            
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

   // Show AI popup when arriving from homepage (non-voice) once AI text is ready
   useEffect(() => {
     if (
       !isLoading &&
       searchQuery &&
       !spokenText &&
       aiAnswerText &&
       allBusinesses.length > 0 &&
       !aiPopupShownRef.current
     ) {
       aiPopupShownRef.current = true;
       setShowAiPopup(true);
     }
   }, [isLoading, searchQuery, spokenText, aiAnswerText, allBusinesses.length]);

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

  // Auto-regenerate AI text when a filter changes (category/subcategory/service)
  const prevFilterRef = useRef({ cat: "", sub: "", svc: "" });
  useEffect(() => {
    const prev = prevFilterRef.current;
    const changed =
      prev.cat !== (selectedCategoryFilter || "") ||
      prev.sub !== (selectedSubcategoryFilter || "") ||
      prev.svc !== (selectedServiceFilter || "");
    prevFilterRef.current = {
      cat: selectedCategoryFilter || "",
      sub: selectedSubcategoryFilter || "",
      svc: selectedServiceFilter || "",
    };
    if (!changed || !aiAnswerText || isAiRegenerating) return;
    if (!selectedCategoryFilter && !selectedSubcategoryFilter && !selectedServiceFilter) return;

    const regenerate = async () => {
      setIsAiRegenerating(true);
      try {
        await new Promise(r => setTimeout(r, 150));
        const top10 = filteredBusinesses.slice(0, 10);
        if (top10.length === 0) { setIsAiRegenerating(false); return; }
        const { data } = await supabase.functions.invoke("ai-search-answer", {
          body: {
            query: spokenText || searchQuery,
            spokenText: spokenText || undefined,
            businesses: top10.map(b => ({
              name: b.name, city: b.city, main_category: b.main_category,
              categories: b.categories, hook_fr: b.hook_fr, wtuce_status: b.wtuce_status,
            })),
            language,
            vary: Date.now() % 1000,
          },
        });
        if (data?.answer) setAiAnswerText(data.answer);
      } catch (e) {
        console.error("AI filter-regenerate error:", e);
      } finally {
        setIsAiRegenerating(false);
      }
    };
    regenerate();
  }, [selectedCategoryFilter, selectedSubcategoryFilter, selectedServiceFilter]);


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

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startResult = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endResult = Math.min(currentPage * ITEMS_PER_PAGE, filteredBusinesses.length);
  const displayedResultsCount = totalCount && totalCount > filteredBusinesses.length ? totalCount : filteredBusinesses.length;

  const showZitounEasterEgg = !isLoading && isZitounMask(spokenText || searchQuery);
  const showCelebrityGuide = !isLoading && isCelebrityQuery(spokenText || searchQuery);
  const showSosMedecin = isSosMedecinQuery(spokenText || searchQuery);
  const showPompiers = isPompiersQuery(spokenText || searchQuery);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hidden AISearchAnswer instance — always renders to ensure onAnswerReady fires even when hero is hidden */}
      {searchQuery && !isLoading && filteredBusinesses.length > 0 && !aiAnswerText && (
        <div className="hidden">
          <AISearchAnswer
            query={spokenText || searchQuery}
            spokenText={spokenText || undefined}
            businesses={filteredBusinesses}
            isSearchLoading={isLoading}
            onAnswerReady={setAiAnswerText}
            externalRegenerateKey={aiRegenerateKey}
          />
        </div>
      )}

      {/* AI Suggestion Overlay — fullscreen takeover shown on arrival from homepage */}
      {showAiPopup && (
        <div className="fixed inset-0 z-40 flex bg-background/95 backdrop-blur-sm animate-in fade-in duration-200" style={{ top: "53px" }}>
          {/* Left panel: AI suggestion */}
          <div ref={overlayLeftPanelRef} className={`relative flex flex-col transition-all duration-500 ease-out ${overlaySelectedBusiness ? "w-1/2 border-r border-border" : "w-full"}`}>
          {/* Close button */}
          <button
            onClick={() => { setShowAiPopup(false); setOverlaySelectedBusiness(null); }}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted transition-colors z-10"
          >
            <X className="h-6 w-6 text-muted-foreground" />
          </button>

          {/* Top section: query + count + top "Voir les résultats" */}
          <div className="pt-14 pb-3 px-6 text-center">
            <button
              onClick={() => { setShowAiPopup(false); setOverlaySelectedBusiness(null); }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gold text-black text-sm font-semibold hover:bg-gold/90 transition-colors mb-4"
            >
              {language === "en" ? "See results" : language === "ar" ? "عرض النتائج" : "Voir les résultats"}
              <ChevronRight className="h-4 w-4" />
            </button>
            <p className="text-muted-foreground text-sm">
              {language === "en" ? "Search results for" : language === "ar" ? "نتائج البحث عن" : "Résultats de recherche pour"}
            </p>
            <p className="text-lg md:text-xl font-bold text-foreground mt-1">
              «&nbsp;{(spokenText || searchQuery)}{selectedCity && selectedCity !== "all" ? ` ${selectedCity}` : ""}&nbsp;»
            </p>
            <p className="text-gold font-semibold mt-1">
              {displayedResultsCount} {language === "en" ? "establishments found" : language === "ar" ? "مؤسسة وجدت" : "établissements trouvés"}
            </p>
          </div>

          {/* Disambiguation prompts */}
          {disambiguationType === "needs_category" && (
            <div className="px-6 pb-4">
              <div className="max-w-3xl mx-auto text-center">
                <p className="text-sm font-medium text-foreground mb-3">
                  {language === "en" ? "What are you looking for?" : language === "ar" ? "ماذا تبحث عنه؟" : "Que cherchez-vous ?"}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {(() => {
                    const cats = [...new Set(allBusinesses.map(b => b.main_category).filter(Boolean))] as string[];
                    return cats.slice(0, 8).map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategoryFilter(cat);
                          setShowAiPopup(false);
                          setOverlaySelectedBusiness(null);
                        }}
                        className="px-4 py-2 rounded-full border border-border bg-card text-sm text-foreground hover:border-gold/50 hover:bg-gold/10 transition-colors"
                      >
                        {cat}
                      </button>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {disambiguationType === "needs_city" && (!selectedCity || selectedCity === "all") && (
            <div className="px-6 pb-4">
              <div className="max-w-3xl mx-auto text-center">
                <p className="text-sm font-medium text-foreground mb-3">
                  {language === "en" ? "Where are you looking?" : language === "ar" ? "أين تبحث؟" : "Où le cherchez-vous ?"}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {citiesWithPriority.slice(0, 10).map(c => (
                    <button
                      key={c.name}
                      onClick={() => {
                        setSelectedCity(c.name);
                        setIsGeoCityAutoSelected(false);
                        setShowAiPopup(false);
                        setOverlaySelectedBusiness(null);
                      }}
                      className="px-4 py-2 rounded-full border border-border bg-card text-sm text-foreground hover:border-gold/50 hover:bg-gold/10 transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5 inline mr-1.5 text-muted-foreground" />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI text — scrollable center, wider */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-gold" />
                <span className="text-xs font-semibold text-gold uppercase tracking-wider">Suggestion IA</span>
              </div>
              <div className="text-base text-foreground/80 leading-relaxed whitespace-pre-line">
                {(!aiAnswerText || isAiRegenerating) ? (
                  <div className="flex items-center gap-3 py-8 justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-gold" />
                    <span className="text-sm italic text-muted-foreground">
                      {language === "en" ? "Generating suggestion…" : language === "ar" ? "جاري إنشاء الاقتراح…" : "Génération de la suggestion…"}
                    </span>
                  </div>
                ) : parseInline(
                  aiAnswerText,
                  allBusinesses as unknown as AIBusinessData[],
                  (b: AIBusinessData) => setOverlaySelectedBusiness(b),
                  "ai-popup"
                )}
              </div>

              {/* 3 boutons + Voir résultats — sous le texte IA, même marge que le haut */}
              <div className="flex flex-col items-center gap-4 pt-14">
                {/* Adresse géolocalisée */}
                {geo.isEnabled && (geo.confirmedAddress || geo.detectedCity) && (
                  <p className="text-sm text-muted-foreground font-medium">
                    📍 {geo.confirmedAddress || geo.detectedCity}
                  </p>
                )}
                <div className="flex items-center justify-center gap-6">
                  {/* Listen */}
                  <div className="relative">
                    {(ttsStatus === "playing" || ttsStatus === "loading") ? (
                      <button
                        onClick={ttsStop}
                        className="relative w-16 h-16 rounded-full bg-black flex items-center justify-center shadow-lg transition-all hover:scale-105"
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
                        className="relative w-16 h-16 rounded-full bg-black flex items-center justify-center shadow-lg transition-all hover:scale-105"
                        title={language === "en" ? "Listen" : language === "ar" ? "استمع" : "Écouter"}
                      >
                        <Volume2 className="h-7 w-7 text-white" />
                      </button>
                    )}
                  </div>
                  {/* Geo */}
                  <div className="relative">
                    <button
                      onClick={() => setLocationDialogOpen(true)}
                      className="relative w-16 h-16 rounded-full bg-black flex items-center justify-center shadow-lg transition-all hover:scale-105"
                      title={language === "en" ? "Geolocate yourself" : language === "ar" ? "حدد موقعك" : "Géolocalisez-vous"}
                    >
                      <MapPin className="h-7 w-7 text-white" />
                    </button>
                  </div>
                  {/* Mic */}
                  <div className="relative">
                    <button
                      onClick={() => toggleRecording()}
                      className="relative w-16 h-16 rounded-full bg-black flex items-center justify-center shadow-lg transition-all hover:scale-105"
                      title={language === "en" ? "Voice search" : language === "ar" ? "بحث صوتي" : "Recherche vocale"}
                    >
                      <Mic className="h-7 w-7 text-white" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => { setShowAiPopup(false); setOverlaySelectedBusiness(null); }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gold text-black text-sm font-semibold hover:bg-gold/90 transition-colors"
                >
                  {language === "en" ? "See results" : language === "ar" ? "عرض النتائج" : "Voir les résultats"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          </div>

          {/* Right panel: Business detail */}
          {overlaySelectedBusiness && (
            <div className={`h-full flex flex-col bg-background animate-in slide-in-from-right duration-300 transition-all ${isOverlayPanelExpanded ? "w-[80%]" : "w-1/2"}`}>
              <SlidePanelHeader
                onClose={() => { setOverlaySelectedBusiness(null); setIsOverlayPanelExpanded(false); }}
                isExpanded={isOverlayPanelExpanded}
                onToggleExpand={() => setIsOverlayPanelExpanded(prev => !prev)}
                toolbarCenterId="overlay-slide-panel-toolbar-center"
                toolbarRightId="overlay-slide-panel-toolbar"
              />
              <div className="flex-1 min-h-0">
                <BusinessSlidePanel
                  businessId={overlaySelectedBusiness.id}
                  onClose={() => { setOverlaySelectedBusiness(null); setIsOverlayPanelExpanded(false); }}
                  isExpanded={isOverlayPanelExpanded}
                  onToggleExpand={() => setIsOverlayPanelExpanded(prev => !prev)}
                  leftPanelPortalRef={overlayLeftPanelRef}
                />
              </div>
            </div>
          )}
        </div>
      )}
      {showResultsOverlay && isMobile && (
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
            <p className="text-foreground font-semibold text-lg mb-5">
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
        <div className="bg-background pt-20 pb-2 px-4 flex flex-wrap items-center gap-2">
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

      {/* Hero Section - DISABLED */}
      {false && (
      <section className={`bg-background relative ${(isCategoryFilterActive || hasReachedTabBar) ? 'hidden' : 'pt-6 lg:pt-28 pb-8 lg:pb-16'} ${isMobile && spokenText && filteredBusinesses.length > 0 ? 'hidden' : ''}`}>
        <div className="mx-auto px-4 relative max-w-[80%]">
          {(searchQuery || categoryFromUrl) && (
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2">
                {searchQuery ? (
                  <>{t.searchResults} {t.for}<br />«&nbsp;<span className="text-muted-foreground italic font-normal">{spokenText || searchQuery}</span>&nbsp;»</>
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
            </div>
          )}
        </div>
      </section>
      )}

      {/* Tab Bar — stickybar 1 (above cities) */}
      <section data-tab-bar className="sticky top-[60px] z-[20] bg-white border-b border-border relative">
        <span className="absolute top-0 left-1 z-[60] bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded select-all cursor-text">🔴 STICKY 1</span>
        <div className="mx-auto px-4 max-w-[80%]">
          <div className="flex gap-0">
            <button
              onClick={() => { resetPanelStates(); setActiveTab("suggestions"); }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "suggestions"
                  ? "border-gold text-gold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              {language === "en" ? "Results" : language === "ar" ? "النتائج" : "Résultats"}
            </button>
            <button
              onClick={() => { resetPanelStates(); setActiveTab("map"); }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "map"
                  ? "border-gold text-gold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Map className="h-4 w-4" />
              {language === "en" ? "Map" : language === "ar" ? "خريطة" : "Carte"}
            </button>
            <button
              onClick={() => { resetPanelStates(); setActiveTab("poi"); }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "poi"
                  ? "border-gold text-gold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapPin className="h-4 w-4" />
              {language === "en" ? "Points of Interest" : language === "ar" ? "أماكن مهمة" : "Lieux d'intérêt"}
            </button>
            <button
              onClick={() => { resetPanelStates(); setActiveTab("destinations"); }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "destinations"
                  ? "border-gold text-gold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Compass className="h-4 w-4" />
              {language === "en" ? "Destinations" : language === "ar" ? "وجهات" : "Destinations"}
            </button>
          </div>
        </div>
      </section>

      {/* City Bar — stickybar 2 (below tabs) */}
      {availableCities.length > 1 && !queryHasExplicitCity && activeTab === "suggestions" && (
        <div data-city-bar className="sticky z-[6] bg-white border-b border-border py-2 relative" style={{ top: `${stickyTops.cityBar}px` }}>
          <span className="absolute top-0 left-1 z-[60] bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded select-all cursor-text">🟠 STICKY 2</span>
          <div className="mx-auto px-4 max-w-[80%]">
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
              <button
                onClick={() => handleCityChange("all")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  selectedCity === "all"
                    ? "bg-gold/20 border-gold text-gold shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:border-gold/40 hover:text-foreground"
                }`}
              >
                <MapPin size={14} className={selectedCity === "all" ? "text-gold" : "text-muted-foreground"} />
                <span>{t.allCities}</span>
              </button>
              {availableCities.map((city) => {
                const isSelected = selectedCity === city;
                return (
                  <button
                    key={city}
                    onClick={() => handleCityChange(isSelected ? "all" : city)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                      isSelected
                        ? "bg-gold/20 border-gold text-gold shadow-sm"
                        : "bg-card border-border text-muted-foreground hover:border-gold/40 hover:text-foreground"
                    }`}
                  >
                    <MapPin size={14} className={isSelected ? "text-gold" : "text-muted-foreground"} />
                    <span>{city}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sticky Category + Subcategory Filters — above services */}
      {activeTab === "suggestions" && allBusinesses.length > 0 && !isLoading && (
        <CityCategoryFilter
          cityName={detectedCity || (selectedCity && selectedCity !== "all" ? selectedCity : null) || ""}
          hasCityBar={availableCities.length > 1 && !queryHasExplicitCity}
          stickyBaseTop={stickyTops.serviceBar}
          selectedCategory={selectedCategoryFilter}
          onSelectCategory={(cat) => {
            setSelectedCategoryFilter(cat);
            setSelectedSubcategoryFilter(null);
            setSelectedServiceFilter(null);
            requestAnimationFrame(() => {
              const tabBar = document.querySelector('[data-tab-bar]');
              if (tabBar) {
                const y = tabBar.getBoundingClientRect().top + window.scrollY - 60;
                window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
              }
            });
          }}
          selectedSubcategory={selectedSubcategoryFilter}
          onSelectSubcategory={(sub) => {
            setSelectedSubcategoryFilter(sub);
            setSelectedServiceFilter(null);
            requestAnimationFrame(() => {
              const tabBar = document.querySelector('[data-tab-bar]');
              if (tabBar) {
                const y = tabBar.getBoundingClientRect().top + window.scrollY - 60;
                window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
              }
            });
          }}
          selectedService={selectedServiceFilter}
          onSelectService={(svc) => {
            setSelectedServiceFilter(svc);
          }}
        />
      )}

      {/* Search-derived service filter bar — COMMENTED OUT
      {searchServiceFilters.length >= 1 && !isLoading && !selectedCategoryFilter && !selectedSubcategoryFilter && (
        <div data-search-service-filter className="sticky z-[2] bg-background border-b border-border py-2 relative" ref={(el) => { if (el) { const catEl = document.querySelector<HTMLElement>('[data-category-filter]'); if (catEl) { const catBottom = parseFloat(catEl.style.top || '0') + catEl.getBoundingClientRect().height; el.style.top = `${catBottom}px`; } else { el.style.top = `${stickyTops.serviceBar}px`; } } }}>
          <span className="absolute top-0 left-1 z-[60] bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded select-all cursor-text">🟢 STICKY 3</span>
          <div className="mx-auto px-4 max-w-[80%]">
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
              {searchServiceFilters.map((svc) => {
                const isSelected = selectedServiceFilter === svc.name;
                return (
                  <button
                    key={svc.name}
                    onClick={() => setSelectedServiceFilter(isSelected ? null : svc.name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                      isSelected
                        ? "bg-gold/20 border-gold text-gold shadow-sm"
                        : "bg-card border-border text-muted-foreground hover:border-gold/40 hover:text-foreground"
                    }`}
                  >
                    <span>{svc.name}</span>
                    <span className={`text-[10px] ${isSelected ? "text-gold/70" : "text-muted-foreground/60"}`}>
                      {svc.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      */}

      {activeTab === "map" && (
        <section className="pt-4 pb-4 lg:pt-20 lg:pb-4 bg-background">
          <div className="mx-auto px-2 md:px-4 lg:max-w-[80%]">
            <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>}>
              <BusinessMap
                businesses={filteredBusinesses.map((b) => ({
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
                  neighborhood: (b as any).neighborhood,
                }))}
                height="calc(100vh - 250px)"
                isLoading={isLoading}
                forceOverview={!selectedCity || selectedCity === "all"}
              />
            </Suspense>
          </div>
        </section>
      )}

      {activeTab === "poi" && (() => {
        const poiCity = selectedCity && selectedCity !== "all" ? selectedCity : detectedCity;

        return (
          <div className={`flex ${(poiSelectedBusinessId || poiMapBusiness) ? "" : ""}`}>
            <section className={`pt-16 pb-6 lg:pt-20 lg:pb-12 bg-background transition-all duration-300 ${(poiSelectedBusinessId || poiMapBusiness) ? "hidden lg:block lg:w-1/2" : "w-full"}`}>
              <div className={`mx-auto px-4 ${(poiSelectedBusinessId || poiMapBusiness) ? "max-w-full" : "max-w-[80%]"}`}>
                <PoiSection
                  city={poiCity}
                  language={language}
                  onBusinessClick={(bizId) => { setPoiMapBusiness(null); setPoiSelectedBusinessId(bizId); }}
                  columns={(poiSelectedBusinessId || poiMapBusiness) ? 3 : undefined}
                  onMapClick={(biz) => { setPoiSelectedBusinessId(null); setPoiMapBusiness({ id: biz.id, name: biz.name, latitude: biz.latitude, longitude: biz.longitude, address: biz.address, google_maps_url: biz.google_maps_url }); }}
                  onPoisLoaded={(loadedPois) => setAllPois(loadedPois.map(p => {
                    const sources = collectRatingSources(p);
                    const avgOn20 = p.rating ?? computeWeightedRatingOn20(sources);
                    const totalReviews = sources.reduce((s, r) => s + r.count, 0);
                    return { id: p.id, name: p.name, latitude: p.latitude, longitude: p.longitude, images: p.images, city: p.city, neighborhood: p.neighborhood, avgOn20, totalReviews };
                  }))}
                />
              </div>
            </section>
            {poiSelectedBusinessId && poiPanelExpanded && (
              <div
                className="fixed inset-0 top-[53px] z-[39] bg-black/40 backdrop-blur-[2px]"
                style={{ opacity: 0, animation: "panelFadeIn 0.2s ease-out 0.1s forwards" }}
                onClick={() => setPoiPanelExpanded(false)}
              />
            )}
            {poiSelectedBusinessId && (
              <div className={`fixed top-0 left-0 right-0 z-40 bg-background shadow-2xl overflow-hidden flex flex-col animate-slide-in-right lg:top-[53px] lg:left-auto lg:border-l lg:border-border ${poiPanelExpanded ? "lg:w-[80%] border-l-2 border-border shadow-[-8px_0_30px_-5px_rgba(0,0,0,0.15)]" : "lg:w-1/2"} transition-all duration-500 ease-out`} style={{ height: isMobile ? "100vh" : "calc(100vh - 53px)" }}>
                <SlidePanelHeader
                  onClose={() => { setPoiSelectedBusinessId(null); setPoiPanelExpanded(false); }}
                  isExpanded={poiPanelExpanded}
                  onToggleExpand={poiBusinessImageCount > 1 ? () => setPoiPanelExpanded(v => !v) : undefined}
                />
                <div className="flex-1 min-h-0">
                  <BusinessSlidePanel
                    businessId={poiSelectedBusinessId}
                    onClose={() => { setPoiSelectedBusinessId(null); setPoiPanelExpanded(false); }}
                    isExpanded={poiPanelExpanded}
                    onToggleExpand={poiBusinessImageCount > 1 ? () => setPoiPanelExpanded(v => !v) : undefined}
                    onImageCount={setPoiBusinessImageCount}
                  />
                </div>
              </div>
            )}
            {poiMapBusiness && (
              <div className={`fixed top-0 left-0 right-0 z-40 bg-background shadow-2xl overflow-hidden flex flex-col animate-slide-up-from-bottom lg:w-1/2 lg:top-[54px] lg:left-auto lg:border-l lg:border-border`} style={{ height: isMobile ? "100vh" : "calc(100vh - 54px)" }}>
                <SlidePanelHeader
                  onClose={() => setPoiMapBusiness(null)}
                  centerContent={poiMapBusiness.name}
                />
                <div className="flex-1 min-h-0">
                  <PoiGoogleMap
                    pois={allPois}
                    selectedPoiId={poiMapBusiness.id}
                    center={(() => {
                      const city = citiesWithPriority.find(c => c.name === selectedCity);
                      if (city?.latitude && city?.longitude) return { lat: city.latitude, lng: city.longitude };
                      return undefined;
                    })()}
                    onPoiClick={(poiId) => {
                      const poi = allPois.find(p => p.id === poiId);
                      if (poi) setPoiMapBusiness({ id: poi.id, name: poi.name, latitude: poi.latitude, longitude: poi.longitude, address: null, google_maps_url: null });
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {activeTab === "destinations" && (() => {
        const destCity = selectedCity && selectedCity !== "all" ? selectedCity : detectedCity;
        const hasRightPanel = !!destMapItem || !!selectedDestination;
        return (
          <div className="flex">
            <section className={`pt-16 pb-6 lg:pt-20 lg:pb-12 bg-background transition-all duration-300 ${hasRightPanel ? "w-1/2" : "w-full"}`}>
              <div className={`mx-auto px-4 ${hasRightPanel ? "max-w-full" : "max-w-[80%]"}`}>
                <DestinationSection
                  city={destCity}
                  language={language}
                  columns={hasRightPanel ? 3 : undefined}
                  onDestinationClick={(destId) => {
                    const dest = allDestItems.find(d => d.id === destId);
                    if (dest) {
                      setSelectedDestination(dest);
                      setDestMapItem(null);
                    }
                  }}
                  onMapClick={(dest) => {
                    setDestMapItem(dest);
                    setSelectedDestination(null);
                    setAllDests(prev => prev);
                  }}
                  onDestinationsLoaded={(dests) => {
                    setAllDestItems(dests);
                    setAllDests(dests.map(d => ({
                      id: d.id,
                      name: d.name_fr,
                      latitude: d.latitude,
                      longitude: d.longitude,
                      images: (d.images && d.images.length > 0) ? d.images : (d.image_url ? [d.image_url] : null),
                    })));
                  }}
                />
              </div>
            </section>
            {selectedDestination && (
              <DestinationBusinessesPanel
                destination={selectedDestination}
                language={language}
                onClose={() => setSelectedDestination(null)}
                onBusinessClick={(bizId) => {
                  setDestSelectedBusinessId(bizId);
                }}
              />
            )}
            {destSelectedBusinessId && (
              <div className={`fixed top-[54px] right-0 z-40 bg-background shadow-2xl border-l border-border overflow-hidden flex flex-col animate-slide-in-right transition-all duration-500 ease-out ${destPanelExpanded ? "w-[80%]" : "w-1/2"}`} style={{ height: "calc(100vh - 54px)" }}>
                <SlidePanelHeader
                  onClose={() => { setDestSelectedBusinessId(null); setDestPanelExpanded(false); }}
                  isExpanded={destPanelExpanded}
                  onToggleExpand={() => setDestPanelExpanded(prev => !prev)}
                />
                <div className="flex-1 min-h-0">
                  <BusinessSlidePanel
                    businessId={destSelectedBusinessId}
                    onClose={() => { setDestSelectedBusinessId(null); setDestPanelExpanded(false); }}
                    isExpanded={destPanelExpanded}
                    onToggleExpand={() => setDestPanelExpanded(prev => !prev)}
                  />
                </div>
              </div>
            )}
            {destMapItem && !selectedDestination && (
              <div className={`fixed top-0 left-0 right-0 z-40 bg-background shadow-2xl overflow-hidden flex flex-col animate-slide-up-from-bottom lg:w-1/2 lg:top-[54px] lg:left-auto lg:border-l lg:border-border`} style={{ height: isMobile ? "100vh" : "calc(100vh - 54px)" }}>
                <SlidePanelHeader
                  onClose={() => setDestMapItem(null)}
                  centerContent={destMapItem.name_fr}
                />
                <div className="flex-1 min-h-0">
                  <PoiGoogleMap
                    pois={allDests}
                    selectedPoiId={destMapItem.id}
                    center={(() => {
                      if (destMapItem.latitude && destMapItem.longitude) return { lat: destMapItem.latitude, lng: destMapItem.longitude };
                      const city = citiesWithPriority.find(c => c.name === selectedCity);
                      if (city?.latitude && city?.longitude) return { lat: city.latitude, lng: city.longitude };
                      return undefined;
                    })()}
                    onPoiClick={(id) => {
                      const d = allDests.find(p => p.id === id);
                      if (d) {
                        setDestMapItem(prev => prev ? { ...prev, id: d.id, name_fr: d.name, latitude: d.latitude, longitude: d.longitude } : prev);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* AI Summary Bar — sticky below all filter bars (OUTSIDE section for proper sticky) */}
      {activeTab === "suggestions" && (isCategoryFilterActive || hasScrolledPastHeroAi) && (aiAnswerText || isAiRegenerating) && (() => {
        const hasCB = availableCities.length > 1 && !queryHasExplicitCity;
        const baseTop = 104 + (hasCB ? 44 : 0);
        const categoryEl = typeof document !== "undefined"
          ? document.querySelector<HTMLElement>("[data-category-filter]")
          : null;
        const subcategoryEl = typeof document !== "undefined"
          ? document.querySelector<HTMLElement>("[data-subcategory-filter]")
          : null;
        const serviceEl = typeof document !== "undefined"
          ? document.querySelector<HTMLElement>("[data-service-filter]")
          : null;
        const searchServiceEl = typeof document !== "undefined"
          ? document.querySelector<HTMLElement>("[data-search-service-filter]")
          : null;

        const getStickyBottom = (el: HTMLElement | null) => {
          if (!el || typeof window === "undefined") return 0;
          const computedTop = Number.parseFloat(window.getComputedStyle(el).top || "0");
          const safeTop = Number.isFinite(computedTop) ? computedTop : 0;
          return safeTop + el.getBoundingClientRect().height;
        };

        const filterBottom = (serviceEl && getStickyBottom(serviceEl))
          || (subcategoryEl && getStickyBottom(subcategoryEl))
          || (categoryEl && getStickyBottom(categoryEl))
          || (searchServiceEl && getStickyBottom(searchServiceEl));
        // When no filter bars exist (hero scroll mode), stick just below the tab bar or header
        const tabBarEl = typeof document !== "undefined"
          ? document.querySelector<HTMLElement>("[data-tab-bar]")
          : null;
        const aiTop = filterBottom
          || (tabBarEl ? getStickyBottom(tabBarEl) : null)
          || (baseTop + 62);

        return (
          <div data-ai-bar className="sticky z-[1] bg-white border-b border-border py-2 relative" style={{ top: `${aiTop}px` }}>
            <span className="absolute top-0 left-1 z-[60] bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded select-all cursor-text">🔵 STICKY 4</span>
            <div className="mx-auto px-4 max-w-[80%]">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className={`text-sm text-muted-foreground leading-relaxed ${isAiSummaryExpanded ? '' : 'line-clamp-2'}`}>
                    <Sparkles className="h-3.5 w-3.5 inline-block mr-1.5 text-gold align-text-bottom" />
                    {isAiRegenerating ? (
                      <span className="italic text-muted-foreground/60">{language === "en" ? "Regenerating…" : "Régénération en cours…"}</span>
                    ) : parseInline(
                      aiAnswerText.replace(/^[-•]\s+/gm, "").replace(/^\d+[.)]\s+/gm, "").replace(/\n+/g, " "),
                      allBusinesses as unknown as AIBusinessData[],
                      (b) => setCompactPanelBusiness(b),
                      "compact-ai"
                    )}
                  </div>
                  <button
                    onClick={() => setIsAiSummaryExpanded(!isAiSummaryExpanded)}
                    className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-gold hover:text-gold/80 transition-colors"
                  >
                    {isAiSummaryExpanded ? (
                      <><ChevronUp className="h-3 w-3" />{language === "en" ? "Show less" : "Réduire"}</>
                    ) : (
                      <><ChevronDown className="h-3 w-3" />{language === "en" ? "Read more" : "Lire la suite"}</>
                    )}
                  </button>
                </div>
                <button
                  disabled={isAiRegenerating}
                  onClick={async () => {
                    if (isAiRegenerating) return;
                    // If no filters active, use the standard regenerate flow
                    if (!isCategoryFilterActive) {
                      setAiAnswerText("");
                      setAiRegenerateKey(k => k + 1);
                      return;
                    }
                    // Regenerate with filtered businesses
                    setIsAiRegenerating(true);
                    // Don't clear aiAnswerText to keep the sticky bar visible
                    try {
                      const top10 = filteredBusinesses.slice(0, 10);
                      const { data } = await supabase.functions.invoke("ai-search-answer", {
                        body: {
                          query: spokenText || searchQuery,
                          spokenText: spokenText || undefined,
                          businesses: top10.map(b => ({
                            name: b.name,
                            city: b.city,
                            main_category: b.main_category,
                            categories: b.categories,
                            hook_fr: b.hook_fr,
                            wtuce_status: b.wtuce_status,
                          })),
                          language,
                          vary: Date.now() % 1000,
                        },
                      });
                      if (data?.answer) setAiAnswerText(data.answer);
                    } catch (e) {
                      console.error("AI regenerate error:", e);
                    } finally {
                      setIsAiRegenerating(false);
                    }
                  }}
                  className="shrink-0 w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-foreground/80 transition-colors shadow-lg mt-0.5 disabled:opacity-50"
                  title={language === "en" ? "Generate another suggestion" : "Régénérer la suggestion"}
                >
                  <RefreshCw className={`h-5 w-5 ${isAiRegenerating ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => { aiPopupShownRef.current = false; setShowAiPopup(true); }}
                  className="shrink-0 w-10 h-10 rounded-full bg-gold text-black flex items-center justify-center hover:bg-gold/90 transition-colors shadow-lg mt-0.5"
                  title={language === "en" ? "View AI suggestion" : "Voir la suggestion IA"}
                >
                  <Sparkles className="h-5 w-5" />
                </button>
              </div>
              {/* Action buttons row: Plus de filtres, Écouter, Géolocalisation */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                <button
                  onClick={() => setMoreFiltersOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                    (moreFilterTimeSlots.length + moreFilterEngagements.length + moreFilterCommodites.length) > 0
                      ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                      : "border-dashed border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  <SlidersHorizontal size={14} />
                  <span>Plus de filtres</span>
                  {(moreFilterTimeSlots.length + moreFilterEngagements.length + moreFilterCommodites.length) > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {moreFilterTimeSlots.length + moreFilterEngagements.length + moreFilterCommodites.length}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  {(ttsStatus === "playing" || ttsStatus === "loading") ? (
                    <button
                      onClick={ttsStop}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/20 text-gold text-xs font-medium hover:bg-gold/30 transition-colors"
                    >
                      {ttsStatus === "loading" ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}
                      {ttsStatus === "loading" ? "…" : "Stop"}
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-gold/30 text-gold text-xs font-medium hover:bg-gold/20 transition-colors"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      {language === "en" ? "Listen" : language === "ar" ? "استمع" : "Écouter"}
                    </button>
                  )}
                  {!isMobile && (
                    <>
                      <button
                        onClick={() => setLocationDialogOpen(true)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          geo.isEnabled
                            ? "bg-gold/20 text-gold border border-gold/40"
                            : "bg-card text-muted-foreground border border-border hover:border-gold/30"
                        }`}
                      >
                        {geo.isDetecting ? (
                          <Loader className="h-3 w-3 animate-spin" />
                        ) : geo.isEnabled ? (
                          <MapPin className="h-3 w-3" />
                        ) : (
                          <MapPinOff className="h-3 w-3" />
                        )}
                        {geo.isDetecting
                          ? "…"
                          : geo.isEnabled && geo.confirmedAddress
                          ? `📍 ${geo.confirmedAddress}`
                          : geo.isEnabled && geo.detectedCity
                          ? `📍 ${geo.detectedCity}`
                          : geo.isEnabled
                          ? (language === "en" ? "No city" : "Aucune ville")
                          : (language === "en" ? "Location" : "Position")
                        }
                      </button>
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
                        }}
                        onDisableGeo={() => geo.decline()}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Filters & Results — Suggestion IA tab */}
      {activeTab === "suggestions" && (
      <section
        ref={resultsRef}
        className="bg-background pb-6 lg:pb-4 pt-4"
      >
        <div className="mx-auto px-4 max-w-[80%]">
          {/* Filters: City + Geo toggle — on mobile shown before hero via order */}
          <div className={`${isCategoryFilterActive ? 'mb-3' : 'mb-8'} flex flex-wrap items-center gap-3 ${isMobile ? 'hidden' : ''}`}>
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

           {/* City filter moved to sticky bar above tabs */}
          </div>

          {/* Easter egg: Zitoun Mask/Musk - fullscreen overlay */}
          {showZitounEasterEgg && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <img
                  src={zitounMaskImg}
                  alt="Zitoun Mask"
                  className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                />
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-8 py-4 rounded-2xl border border-gold/30 text-center">
                  <p className="text-gold font-semibold text-2xl">Zitoun Musk</p>
                  <p className="text-white/70 text-sm mt-1">Le légendaire gnawa en string léopard</p>
                </div>
                <button
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>('input[type="text"]');
                    if (input) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }
                    window.history.back();
                  }}
                  className="absolute top-6 right-6 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
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
                      distanceKm={getDistanceKm(business)}
                      activeTimeSlot={activeTimeSlot}
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

          {/* Category filter moved to sticky zones above */}

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-gold" />
            </div>
          ) : filteredBusinesses.length === 0 && !showZitounEasterEgg && !showCelebrityGuide && !showSosMedecin && !showPompiers ? (
            <div className="text-center py-16 relative">
              <span className="absolute top-0 left-1 z-[60] bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded select-all cursor-text">🟣 ZONE EMPTY STATE</span>
              <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl text-muted-foreground mb-2">{t.noResults}</p>
              <p className="text-sm text-muted-foreground">{t.tryAnother}</p>
            </div>
          ) : !showCelebrityGuide && !showSosMedecin && !showPompiers && filteredBusinesses.length > 0 ? (
            <>
              {/* Results — Grouped by subcategory with horizontal scroll, or flat paginated grid */}
              {groupedBusinesses ? (
                <div className="space-y-10">
                  {groupedBusinesses.map((group) => (
                    <GroupedSubcategoryRow
                      key={group.subcategory}
                      subcategory={group.subcategory}
                      businesses={group.businesses}
                      gammes={gammes}
                      badges={badges}
                      subcategories={subcategories}
                      badgeSubcategories={badgeSubcategories}
                      verifiedLabel={t.verified}
                      getDistanceKm={getDistanceKm}
                      activeTimeSlot={activeTimeSlot}
                    />
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
                      distanceKm={getDistanceKm(business)}
                      activeTimeSlot={activeTimeSlot}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && !groupedBusinesses && (
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
      )}

      <div className="h-28" />
      <Footer />

      {/* Floating Search Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[120] border-t border-gold/20 py-3 px-4 bg-black/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto">
          <SearchInput
            variant="floating"
            value={inputValue}
            onChange={setInputValue}
            showSuggestions={true}
            suggestionMode="text"
            suggestionsPosition="top"
            onSubmit={(query) => {
              setSelectedCategoryFilter(null);
              setSelectedSubcategoryFilter(null);
              setSelectedServiceFilter(null);
              setSearchQuery(query);
              const params: Record<string, string> = { q: query };
              const timeResult = extractTimeSlot(query);
              if (timeResult) {
                params.timeStart = String(timeResult.timeSlot.startHour);
                params.timeEnd = String(timeResult.timeSlot.endHour);
                params.timeDayOffset = String(timeResult.timeSlot.dayOffset);
                if (timeResult.timeSlot.dayOfWeek !== null) params.timeDayOfWeek = String(timeResult.timeSlot.dayOfWeek);
              }
              setSearchParams(params);
              if (isMobile) window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            voiceControl={{ status: voiceStatus, toggleRecording, liveTranscript }}
          />
        </div>
      </div>


      {/* Google-style voice search overlay */}
      <VoiceSearchOverlay
        isOpen={voiceStatus === "recording" || voiceStatus === "processing"}
        liveTranscript={liveTranscript}
        onClose={() => toggleRecording()}
      />

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

          {/* Left panel — full AI text (hidden when expanded) */}
          {!isCompactPanelExpanded && (
          <div
            className="fixed top-[62px] left-0 w-1/2 z-[100] bg-background border-r border-border shadow-xl flex flex-col animate-fade-in"
            style={{ height: "calc(100vh - 62px)" }}
          >
            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2 text-gold">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-semibold">{language === "en" ? "AI Summary" : "Résumé IA"}</span>
              </div>
              <button
                onClick={() => { setCompactPanelBusiness(null); setIsCompactPanelExpanded(false); }}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
              <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
                {parseInline(
                  aiAnswerText.replace(/^[-•]\s+/gm, "").replace(/^\d+[.)]\s+/gm, "").replace(/\n+/g, " "),
                  allBusinesses as unknown as AIBusinessData[],
                  (b) => setCompactPanelBusiness(b),
                  "left-panel-ai"
                )}
              </div>
            </div>
          </div>
          )}

          {/* Right panel — business detail */}
          <div
            className={`fixed top-[53px] right-0 z-[100] bg-background shadow-2xl border-l border-border overflow-hidden flex flex-col transition-all duration-500 ease-out ${isCompactPanelExpanded ? "border-l-2 shadow-[-8px_0_30px_-5px_rgba(0,0,0,0.15)]" : "animate-slide-in-right"}`}
            style={{ height: "calc(100vh - 53px)", width: isCompactPanelExpanded ? "80%" : "50%" }}
          >
            <SlidePanelHeader
              onClose={() => { setCompactPanelBusiness(null); setIsCompactPanelExpanded(false); }}
              isExpanded={isCompactPanelExpanded}
              onToggleExpand={() => setIsCompactPanelExpanded(prev => !prev)}
            />
            <div className="flex-1 min-h-0">
              <BusinessSlidePanel
                businessId={compactPanelBusiness.id}
                onClose={() => { setCompactPanelBusiness(null); setIsCompactPanelExpanded(false); }}
                isExpanded={isCompactPanelExpanded}
                onToggleExpand={() => setIsCompactPanelExpanded(prev => !prev)}
              />
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
