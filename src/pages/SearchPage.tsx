import { useSearchParams, Link, useNavigate } from "react-router-dom";
import SearchInput from "@/components/SearchInput";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSEO } from "@/hooks/useSEO";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGeolocation } from "@/hooks/useGeolocation";

import { extractTimeSlot, isOpenDuringSlot, getCurrentTimePeriod, type TimeSlot, type TimePeriod } from "@/lib/timeSlots";
import { isCurrentlyOpen as isCurrentlyOpenCheck } from "@/lib/formatOpeningHours";
import { haversineKm } from "@/lib/haversine";
import zitounMaskImg from "@/assets/zitoun-mask.jpg";
import logoGold from "@/assets/logoGOLDsimple.webp";
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

import { Loader2, Building2, ChevronLeft, ChevronRight, Search, Mic, Loader, MapPin, MapPinOff, X, Volume2, VolumeX, Clock, Map, Sparkles, SlidersHorizontal, ChevronDown, ChevronUp, RefreshCw, Compass, Maximize2, Minimize2, Star, Leaf, Truck, Accessibility, Package, Award } from "lucide-react";
import MoreFiltersPopup from "@/components/MoreFiltersPopup";
import { lazy, Suspense } from "react";
const BusinessMap = lazy(() => import("@/components/BusinessMap"));
import PoiSection from "@/components/PoiSection";
import DestinationSection, { type DestinationItem } from "@/components/DestinationSection";
import DestinationBusinessesPanel from "@/components/DestinationBusinessesPanel";
import BusinessCard, { type BusinessCardData, type Gamme, type Badge, type SubcategoryRef, type BadgeSubcategoryRef } from "@/components/BusinessCard";
import AISearchAnswer, { parseInline, type BusinessData as AIBusinessData } from "@/components/AISearchAnswer";
import BookOnlineSlidePanel from "@/components/BookOnlineSlidePanel";
import SlidePanelHeader from "@/components/SlidePanelHeader";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";
import MobileSearchOverlay from "@/components/MobileSearchOverlay";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useTextToSpeech, preloadTTS } from "@/hooks/useTextToSpeech";
import { useToast } from "@/hooks/use-toast";
import LocationPickerDialog from "@/components/LocationPickerDialog";
import WarningOverlay from "@/components/WarningOverlay";
import EmergencyNumbers from "@/components/EmergencyNumbers";
import { useSearchHistory } from "@/hooks/useSearchHistory";

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
  trustpilot_rating?: number | null;
  getyourguide_rating?: number | null;
  viator_rating?: number | null;
  avis_verifies_rating?: number | null;
  tourradar_rating?: number | null;
  google_review_count?: number | null;
  tripadvisor_review_count?: number | null;
  restaurant_guru_review_count?: number | null;
  trustpilot_review_count?: number | null;
  getyourguide_review_count?: number | null;
  viator_review_count?: number | null;
  avis_verifies_review_count?: number | null;
  tourradar_review_count?: number | null;
  opening_hours?: Record<string, { open?: string; close?: string; closed?: boolean; continuous?: boolean }> | null;
  show_opening_hours?: boolean | null;
  is_open_24h?: boolean | null;
  vacation_dates?: unknown;
  zone_chalandise?: string | null;
  is_visible_locale?: boolean;
  zone_city_ids?: string[] | null;
  destination_enriched?: boolean;
  default_service?: string | null;
  neighborhood?: string | null;
  engagements?: string[];
  online_shop_url?: string | null;
  presentation_mode?: string | null;
}

interface SearchResult {
  businesses: Business[];
  searchLevel: string;
  message: string;
  totalResults: number;
  totalCount?: number;
  detectedSubcategory?: string | null;
  detectedCity?: string | null;
  detectedNeighborhood?: string | null;
  detectedCategory?: string | null;
  detectedService?: string | null;
  intentSubcategoryConflict?: boolean;
  searchMode?: string | null;
  bundleTimeSlots?: string[];
  disambiguationType?: "needs_category" | "needs_city" | null;
  synonymUsed?: boolean;
  preciseMatch?: boolean;
  exactNameMatchIsolation?: boolean;
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
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
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
  const [activeEasterEggNames, setActiveEasterEggNames] = useState<Set<string>>(new Set());
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
  useEffect(() => {
    if (urlQ !== searchQuery || urlT) {
      setSearchQuery(urlQ);
      setInputValue(urlQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQ, urlT]);


  // Handle openBusiness URL param (from FloatingSearchBar recently viewed)
  useEffect(() => {
    const openBizId = searchParams.get("openBusiness");
    if (openBizId) {
      openCompactPanel({ id: openBizId, name: "" } as any);
      // Clean up the param from URL
      const next = new URLSearchParams(searchParams);
      next.delete("openBusiness");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams]);

  // Fetch active easter eggs once
  useEffect(() => {
    supabase.from("easter_eggs").select("name, is_active").eq("is_active", true).then(({ data }) => {
      if (data) setActiveEasterEggNames(new Set(data.map((e: any) => e.name)));
    });
  }, []);

  const categoryFromUrl = searchParams.get("category") || "";
  const [celebrityBusinesses, setCelebrityBusinesses] = useState<Business[]>([]);
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
      const bizData = (allBusinesses || []).slice(0, 20).map((b: any) => ({
        id: b.id, name: b.name, city: b.city, main_category: b.main_category,
        categories: b.categories, hook_fr: b.hook_fr, rating: b.rating,
        wtuce_status: b.wtuce_status, images: b.images, logo_url: b.logo_url,
        neighborhood: b.neighborhood, google_rating: b.google_rating,
        google_review_count: b.google_review_count, tripadvisor_rating: b.tripadvisor_rating,
        tripadvisor_review_count: b.tripadvisor_review_count,
      }));
      sessionStorage.setItem("ai_suggestion_businesses", JSON.stringify(bizData));
    } catch {}
    setStickyAiAnimationNonce((prev) => prev + 1);
    // Pre-generate TTS audio in background so it's instant when user clicks speaker
    if (answer) {
      const cleanText = answer.replace(/^[-•]\s+/gm, "").replace(/^\d+[.)]\s+/gm, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/\n+/g, " ");
      const intro = language === "en" ? "Here is what I found. " : "Voici ce que j'ai trouvé. ";
      preloadTTS(intro + cleanText + " … Vous pouvez me poser une autre question.", undefined, true);
    }
  }, [language]);
   const [activeTab, setActiveTab] = useState<"suggestions" | "map" | "poi" | "destinations">("suggestions");
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
        setSubcategoryFilterBusinesses(data.map((b: any) => ({ ...b, distance_km: null })) as Business[]);
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
        setServiceFilterBusinesses(data.map((b: any) => ({ ...b, distance_km: null })) as Business[]);
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
      }, []);

      const closeCompactPanel = useCallback(() => {
        hasInteractedWithCompactPanelRef.current = true;
        hasAutoAlignedResultsRef.current = true;
        setCompactPanelBusiness(null);
        setIsCompactPanelExpanded(false);
        setIsNestedMosaicOpen(false);
      }, []);

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

   // Reset panels, tab, and scroll when query changes
   useEffect(() => {
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
   }, [searchQuery, urlT]);

    // Hide page-level scrollbar when slide panel is open on desktop to prevent overlap with right panel
    useEffect(() => {
      const isDesktop = window.innerWidth >= 1024;
      if (compactPanelBusiness && isDesktop && !isCompactPanelExpanded) {
        document.documentElement.classList.add('hide-scrollbar-panel-open');
      } else {
        document.documentElement.classList.remove('hide-scrollbar-panel-open');
      }
      return () => { document.documentElement.classList.remove('hide-scrollbar-panel-open'); };
    }, [compactPanelBusiness, isCompactPanelExpanded]);

    // Auto-open first result — ref declared here, effect after filteredBusinesses
    const hasAutoOpenedFirstRef = useRef(false);

      // Reset auto-open flag only when NEW data finishes loading (not on stale data)
    const prevUrlTRef = useRef(urlT);
    useEffect(() => {
      if (prevUrlTRef.current !== urlT) {
        // Query changed — block auto-open until new data arrives
        hasAutoOpenedFirstRef.current = true;
        prevUrlTRef.current = urlT;
      }
    }, [urlT]);
    useEffect(() => {
      // Once loading finishes after a query change, allow auto-open
      if (!isLoading) {
        hasAutoOpenedFirstRef.current = false;
      }
    }, [isLoading]);

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

  const { status: voiceStatus, toggleRecording, finishRecording, liveTranscript } = useVoiceSearch({
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

  const getEffectiveRating = (b: typeof allBusinesses[0]): number | null => {
    return (b as any).computed_rating ?? (b.rating ? Number(b.rating) : null);
  };

  // Compute distance between user coords and a business
  const getDistanceKm = useCallback((b: Business): number | null => {
    if (!geo.isEnabled || !geo.coords || b.latitude == null || b.longitude == null) return null;
    // Hide distance if any of the business's subcategories has show_google_map disabled
    const bizCats = b.categories || [];
    if (bizCats.length > 0 && subcategories.some(sc => bizCats.includes(sc.name_fr) && sc.show_google_map === false)) return null;
    return haversineKm(geo.coords.lat, geo.coords.lng, b.latitude, b.longitude);
  }, [geo.isEnabled, geo.coords, subcategories]);

  // Sort: WTUCE verified first (by rating desc), then non-verified (by rating desc)
  const sortWtuceAndRating = (a: Business, b: Business) => {
    const aVerified = a.wtuce_status === "verified" ? 0 : 1;
    const bVerified = b.wtuce_status === "verified" ? 0 : 1;
    if (aVerified !== bVerified) return aVerified - bVerified;
    return (getEffectiveRating(b) ?? -1) - (getEffectiveRating(a) ?? -1);
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
    // When a service filter is manually selected, use the direct DB results as the base
    // instead of merging with FTS results — this ensures we get ALL matching businesses
    let filtered: Business[];
    if (selectedServiceFilter && serviceFilterBusinesses.length > 0) {
      filtered = [...serviceFilterBusinesses];
    } else if (selectedSubcategoryFilter && subcategoryFilterBusinesses.length > 0) {
      // When a subcategory is selected, use direct DB results to get ALL matches
      // but merge with API results when destination enrichment added businesses
      // (those businesses may not match the subcategory but are relevant via destination)
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
    if (selectedCity && selectedCity !== "all") {
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
    // Apply category filter from CityCategoryFilter
    if (selectedCategoryFilter) {
      filtered = filtered.filter(b => b.main_category === selectedCategoryFilter);
    }
    // Apply subcategory filter — but only if at least one business matches
    // (prevents false-positive subcategory detection from hiding name-match results, e.g. "Jardin Majorelle")
    if (selectedSubcategoryFilter) {
      const subcatMatches = filtered.filter(b => b.categories && b.categories.includes(selectedSubcategoryFilter));
      if (subcatMatches.length > 0) {
        filtered = subcatMatches;
      }
    }
    // Apply neighborhood filter when detected from search query
    if (detectedNeighborhood) {
      const nhLower = detectedNeighborhood.toLowerCase();
      const nhFiltered = filtered.filter(b => {
        const bNh = (b.neighborhood || "").toLowerCase();
        return bNh.includes(nhLower) || bNh.includes("toute la ville");
      });
      if (nhFiltered.length > 0) {
        filtered = nhFiltered;
      }
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
  }, [allBusinesses, serviceFilterBusinesses, subcategoryFilterBusinesses, selectedCity, selectedCityId, selectedCategoryFilter, selectedSubcategoryFilter, selectedServiceFilter, activeTimeSlot, searchQuery, categoryFromUrl, moreFilterMatchingIds, moreFilterTimeSlots, detectedNeighborhood, searchLevel]);

  // Build subcategory name → icon name map
  const subcategoryIconMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const sub of subcategories) {
      if ((sub as any).icon) map[sub.name_fr] = (sub as any).icon;
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
      .slice(0, 100)
      .map(b => ({
        id: b.id,
        name: b.name,
        latitude: b.latitude,
        longitude: b.longitude,
        images: b.images,
        city: b.city,
        neighborhood: b.neighborhood,
        rating: b.rating,
        avgOn20: (b as any).computed_rating ?? b.rating ?? null,
        totalReviews: (b as any).total_review_count ?? 0,
        subcategory: b.categories?.[0] || null,
      }));
  }, [hasKnownLocation, isSubDesktop, mapCenterForResults, neighborhoodCoords, effectiveCityForMap]);

  const mapPoiItems: PoiMapItem[] = useMemo(() => buildMapPoiItems(filteredBusinesses, true), [buildMapPoiItems, filteredBusinesses]);
  const mobileMapPoiItems: PoiMapItem[] = useMemo(() => buildMapPoiItems(filteredBusinesses, false), [buildMapPoiItems, filteredBusinesses]);


    // Auto-open first result's slide panel when arriving from external link
    useEffect(() => {
      if (hasAutoOpenedFirstRef.current) return;
      if (isLoading || filteredBusinesses.length === 0) return;
      if (!searchQuery) return;
      if (hasInteractedWithCompactPanelRef.current) return;
      hasAutoOpenedFirstRef.current = true;
      const first = filteredBusinesses[0];
      openCompactPanel({ id: first.id, name: first.name } as AIBusinessData);
    }, [isLoading, filteredBusinesses, searchQuery, urlT, openCompactPanel]);


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

  // Paginate (only for non-grouped view)
  // Page 1 shows 1 fewer business to account for the AI suggestion card slot
  const PAGE_1_ITEMS = ITEMS_PER_PAGE - 1;
  const totalPages = useMemo(() => {
    if (filteredBusinesses.length <= PAGE_1_ITEMS) return 1;
    return 1 + Math.ceil((filteredBusinesses.length - PAGE_1_ITEMS) / ITEMS_PER_PAGE);
  }, [filteredBusinesses.length]);
  const paginatedBusinesses = useMemo(() => {
    if (currentPage === 1) {
      return filteredBusinesses.slice(0, PAGE_1_ITEMS);
    }
    const start = PAGE_1_ITEMS + (currentPage - 2) * ITEMS_PER_PAGE;
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
            const resultMainCategories = new Set(businesses.map(b => b.main_category).filter(Boolean));
            const isMultiCategoryResult = resultMainCategories.size > 1;
            const shouldSkipAutoFilter = data.exactNameMatchIsolation || data.synonymUsed || data.intentSubcategoryConflict || isHeuristicFallbackWithPrecise || isHeuristicFallback || (data.preciseMatch && !safeDetectedSubcategory) || isMultiCategoryResult;
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
            setTotalCount(data.totalCount || null);
            setSearchMessage(data.message || "");

            // Auto-open business detail when exact name match found
            const biz = data.businesses || [];
            if (biz.length >= 1 && searchQuery.trim()) {
              const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/s\b/g, "").trim();
              const qNorm = normalize(searchQuery);
              const exactMatch = biz.find((b: any) => normalize(b.name) === qNorm);
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
  }, [searchQuery, categoryFromUrl, language, urlT]);

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
      (labelsData as any[]).forEach((l: any) => {
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
    const ratingOn20 = (b as any).computed_rating ?? b.rating ?? null;
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

  const navigate = useNavigate();

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setIsGeoCityAutoSelected(false);
    // TEMP DISABLED: auto-regenerate AI text on city filter change
    // setAiAnswerText("");
    // setAiRegenerateKey(k => k + 1);
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

  const startResult = currentPage === 1 ? 1 : PAGE_1_ITEMS + (currentPage - 2) * ITEMS_PER_PAGE + 1;
  const endResult = Math.min(startResult + paginatedBusinesses.length - 1, filteredBusinesses.length);
  const displayedResultsCount = totalCount && totalCount > filteredBusinesses.length ? totalCount : filteredBusinesses.length;
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

  // Word-by-word animation disabled (Sticky 4 bar is disabled) — set immediately to avoid
  // ~22 state updates/sec that cause scroll jank in the left panel during AI loading
  useEffect(() => {
    if (!stickyAiText || isAiRegenerating) {
      setStickyAiVisibleWordIndex(-1);
      return;
    }
    setStickyAiVisibleWordIndex(Number.MAX_SAFE_INTEGER);
  }, [stickyAiAnimationNonce, stickyAiText, stickyAiWordCount, isAiRegenerating]);

  const showZitounEasterEgg = !isLoading && activeEasterEggNames.has("Zitoun Musk") && isZitounMask(spokenText || searchQuery);
  const showCelebrityGuide = !isLoading && activeEasterEggNames.has("Célébrités") && isCelebrityQuery(spokenText || searchQuery);
  const showSosMedecin = activeEasterEggNames.has("SOS Médecin") && isSosMedecinQuery(spokenText || searchQuery);
  const showPompiers = activeEasterEggNames.has("Pompiers") && isPompiersQuery(spokenText || searchQuery);

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
      {searchQuery && !isLoading && filteredBusinesses.length > 0 && !aiAnswerText && (
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
        <div className="fixed inset-0 z-[9990] flex bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Left panel: AI suggestion */}
          <div ref={overlayLeftPanelRef} className={`relative flex flex-col justify-center transition-all duration-500 ease-out ${overlaySelectedBusiness ? "w-1/2 border-r border-border" : "w-full"}`}>
          {/* Mobile sticky top bar: speaker + CTA + close */}
          <div className="sticky top-0 left-0 right-0 sm:hidden flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur-sm z-10">
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
                    {filteredBusinesses.length} {language === "en" ? "establishments found" : language === "ar" ? "مؤسسة وجدت" : "établissements trouvés"}
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
                        const dest = allDestItems.find(d => d.id === b.id);
                        if (dest) setSelectedDestination(dest);
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
                toolbarCenterId="overlay-slide-panel-toolbar-center"
                toolbarRightId="overlay-slide-panel-toolbar"
              />
              <div className="flex-1 min-h-0">
                <BookOnlineSlidePanel
                  businessId={overlaySelectedBusiness.id}
                  onClose={() => { setOverlaySelectedBusiness(null); setIsOverlayPanelExpanded(false); }}
                  forceMuted={voiceStatus === "recording" || voiceStatus === "processing"}
                />
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

      {/* Geolocation consent banner disabled to avoid fullscreen overlay UX */}

      {/* Mobile-only: geo + time badges removed — geo button lives in sticky tab bars */}

      {/* Hero Section - DISABLED */}















      {activeTab === "map" && (
        <section className="pt-4 pb-4 lg:pt-20 lg:pb-4 bg-white dark:bg-zinc-900">
          <div className="mx-auto px-2 md:px-4 lg:max-w-[80%]">
            <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>}>
              <BusinessMap
                businesses={filteredBusinesses
                  .filter((b) => {
                    const engs: string[] = (b as any).engagements || [];
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
                  neighborhood: (b as any).neighborhood,
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

      {activeTab === "poi" && (() => {
        const poiCity = selectedCity && selectedCity !== "all" ? selectedCity : detectedCity;

        return (
          <div className="flex">
            <section className={`pb-6 lg:pb-12 bg-white dark:bg-zinc-900 transition-all duration-300 ${(poiSelectedBusinessId || poiMapBusiness) ? "w-1/2" : hasKnownLocation ? "w-1/2" : "w-full"}`}>
              <div className={`mx-auto px-4 ${(poiSelectedBusinessId || poiMapBusiness || hasKnownLocation) ? "max-w-full" : "max-w-[80%]"}`}>
                {/* Sticky bar for POI — mirrors STICKY 5 */}
                <div className="sticky z-[19] bg-white flex items-center justify-end px-4 gap-2 relative py-2 mb-2 border-b border-border/40" style={{ top: `${Math.max(stickyStackPadding || 0, 104)}px` }}>
                  {/* Left: Carte on tablet only */}
                  <div className="hidden sm:flex lg:hidden items-center absolute left-4">
                    {isSubDesktop && (
                      <button
                        onClick={() => setShowMobileMap(true)}
                        className="hidden sm:inline-flex lg:hidden items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium shadow-lg hover:bg-foreground/90 transition-colors"
                      >
                        <Map className="h-4 w-4" />
                        {language === "en" ? "Map" : language === "ar" ? "خريطة" : "Carte"}
                      </button>
                    )}
                  </div>
                  {/* Center: AI suggestion — centered on tablet via absolute */}
                  <button
                    onClick={() => {
                      if (!poiAiText && !isPoiAiLoading) {
                        fetchTabAiText("poi", poiCity, allPois.map(p => ({ name: p.name, city: poiCity })));
                      }
                      setShowAiPopup(true);
                    }}
                    className="shrink-0 w-9 h-9 rounded-full bg-gold text-black flex items-center justify-center hover:bg-gold/90 transition-colors shadow-md sm:absolute sm:left-1/2 sm:-translate-x-1/2 lg:absolute lg:left-1/2 lg:-translate-x-1/2"
                    title={language === "en" ? "View AI suggestion" : "Voir la suggestion IA"}
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                  {/* Right: Carte (mobile only) + Localisation */}
                  <div className="flex items-center gap-2 lg:ml-auto">
                    {isSubDesktop && (
                      <button
                        onClick={() => setShowMobileMap(true)}
                        className="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium shadow-lg hover:bg-foreground/90 transition-colors"
                      >
                        <Map className="h-4 w-4" />
                        {language === "en" ? "Map" : language === "ar" ? "خريطة" : "Carte"}
                      </button>
                    )}
                    <button
                      onClick={() => setLocationDialogOpen(true)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        geo.isEnabled && (geo.detectedNeighborhood || geo.detectedCity || geo.confirmedAddress)
                          ? "bg-gold/20 text-gold border border-gold/40"
                          : "bg-[#C04F17] text-white border border-[#C04F17] hover:bg-[#C04F17]/90"
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
                        : geo.isEnabled && (geo.detectedNeighborhood || geo.detectedCity)
                        ? `📍 ${[geo.detectedNeighborhood, geo.detectedCity].filter(Boolean).join(", ")}`
                        : geo.isEnabled && geo.confirmedAddress
                        ? `📍 ${geo.confirmedAddress}`
                        : (language === "en" ? "Location" : language === "ar" ? "الموقع" : "Localisation")
                      }
                    </button>
                  </div>
                </div>
                <PoiSection
                  city={poiCity}
                  language={language}
                   onBusinessClick={(bizId) => {
                     setPoiMapBusiness(null);
                     setPoiSelectedBusinessId(bizId);
                   }}
                  columns={hasKnownLocation ? 2 : undefined}
                  onMapClick={hasKnownLocation ? (biz) => { setHoveredPoiId(biz.id); } : (biz) => { setPoiSelectedBusinessId(null); setPoiMapBusiness({ id: biz.id, name: biz.name, latitude: biz.latitude, longitude: biz.longitude, address: biz.address, google_maps_url: biz.google_maps_url }); }}
                   onPoisLoaded={(loadedPois) => setAllPois(loadedPois.map(p => {
                    const avgOn20 = (p as any).computed_rating ?? p.rating ?? null;
                    const totalReviews = (p as any).total_review_count ?? 0;
                    return { id: p.id, name: p.name, latitude: p.latitude, longitude: p.longitude, images: p.images, city: p.city, neighborhood: p.neighborhood, avgOn20, totalReviews };
                  }))}
                  onHover={setHoveredPoiId}
                />
                {allPois.length > 0 && (
                  <p className="text-xs text-muted-foreground font-medium mt-4 text-center">
                    {language === "en" ? "Points of Interest" : language === "ar" ? "أماكن مهمة" : "Lieux d'intérêt"}{poiCity && ` — ${poiCity}`} · {allPois.length} {language === "en" ? "results" : "résultats"}
                  </p>
                )}
              </div>
            </section>
            {/* Sticky map for POI — shown when location known and no panel open */}
            {hasKnownLocation && !poiSelectedBusinessId && !poiMapBusiness && (
              <div className="w-1/2 sticky top-0 h-screen z-[50]">
                <PoiGoogleMap
                  pois={allPois}
                  selectedPoiId={hoveredPoiId || null}
                  onPoiClick={(poiId) => {
                    setPoiMapBusiness(null);
                    setPoiSelectedBusinessId(poiId);
                  }}
                  center={mapCenterForResults}
                  fitToMarkers
                />
              </div>
            )}
            {poiSelectedBusinessId && poiPanelExpanded && (
              <div
                className="fixed inset-0 top-[53px] z-[39] bg-black/40 backdrop-blur-[2px]"
                style={{ opacity: 0, animation: "panelFadeIn 0.2s ease-out 0.1s forwards" }}
                onClick={() => setPoiPanelExpanded(false)}
              />
            )}
            {poiSelectedBusinessId && (
              <div className={`fixed top-0 left-0 right-0 bottom-0 z-40 bg-background shadow-2xl overflow-hidden flex flex-col animate-slide-in-right lg:left-auto lg:bottom-auto lg:border-l lg:border-border lg:transition-[width] lg:duration-300 lg:ease-out ${poiPanelExpanded ? "lg:w-full border-l-2 border-border shadow-[-8px_0_30px_-5px_rgba(0,0,0,0.15)]" : "lg:w-1/2"}`} style={{ height: isSubDesktop ? undefined : "100vh" }}>
                <BookOnlineSlidePanel
                  businessId={poiSelectedBusinessId}
                  onClose={() => { setPoiSelectedBusinessId(null); setPoiPanelExpanded(false); }}
                  forceMuted={voiceStatus === "recording" || voiceStatus === "processing"}
                />
              </div>
            )}
            {poiMapBusiness && (
              <div className={`fixed top-0 left-0 right-0 z-40 bg-background shadow-2xl overflow-hidden flex flex-col animate-slide-up-from-bottom lg:w-1/2 lg:left-auto lg:border-l lg:border-border`} style={{ height: "100vh" }}>
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
                    fitToMarkers
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
            <section className={`pb-6 lg:pb-12 bg-white dark:bg-zinc-900 transition-all duration-300 ${hasRightPanel ? "w-1/2" : hasKnownLocation ? "w-1/2" : "w-full"}`}>
              <div className={`mx-auto px-4 ${(hasRightPanel || hasKnownLocation) ? "max-w-full" : "max-w-[80%]"}`}>
                {/* Sticky bar for Destinations — mirrors STICKY 5 */}
                <div className="sticky z-[19] bg-white flex items-center justify-end px-4 gap-2 relative py-2 mb-2 border-b border-border/40" style={{ top: `${Math.max(stickyStackPadding || 0, 104)}px` }}>
                  {/* Left: Carte on tablet only */}
                  <div className="hidden sm:flex lg:hidden items-center absolute left-4">
                    {isSubDesktop && (
                      <button
                        onClick={() => setShowMobileMap(true)}
                        className="hidden sm:inline-flex lg:hidden items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium shadow-lg hover:bg-foreground/90 transition-colors"
                      >
                        <Map className="h-4 w-4" />
                        {language === "en" ? "Map" : language === "ar" ? "خريطة" : "Carte"}
                      </button>
                    )}
                  </div>
                  {/* Center: AI suggestion — centered on tablet via absolute */}
                  <button
                    onClick={() => {
                      if (!destAiText && !isDestAiLoading) {
                        fetchTabAiText("destinations", destCity, allDestItems.map(d => ({ name: language === "en" && d.name_en ? d.name_en : d.name_fr, city: destCity })));
                      }
                      setShowAiPopup(true);
                    }}
                    className="shrink-0 w-9 h-9 rounded-full bg-gold text-black flex items-center justify-center hover:bg-gold/90 transition-colors shadow-md sm:absolute sm:left-1/2 sm:-translate-x-1/2 lg:absolute lg:left-1/2 lg:-translate-x-1/2"
                    title={language === "en" ? "View AI suggestion" : "Voir la suggestion IA"}
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                  {/* Right: Carte (mobile only) + Localisation */}
                  <div className="flex items-center gap-2 lg:ml-auto">
                    {isSubDesktop && (
                      <button
                        onClick={() => setShowMobileMap(true)}
                        className="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium shadow-lg hover:bg-foreground/90 transition-colors"
                      >
                        <Map className="h-4 w-4" />
                        {language === "en" ? "Map" : language === "ar" ? "خريطة" : "Carte"}
                      </button>
                    )}
                    <button
                      onClick={() => setLocationDialogOpen(true)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        geo.isEnabled && (geo.detectedNeighborhood || geo.detectedCity || geo.confirmedAddress)
                          ? "bg-gold/20 text-gold border border-gold/40"
                          : "bg-[#C04F17] text-white border border-[#C04F17] hover:bg-[#C04F17]/90"
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
                        : geo.isEnabled && (geo.detectedNeighborhood || geo.detectedCity)
                        ? `📍 ${[geo.detectedNeighborhood, geo.detectedCity].filter(Boolean).join(", ")}`
                        : geo.isEnabled && geo.confirmedAddress
                        ? `📍 ${geo.confirmedAddress}`
                        : (language === "en" ? "Location" : language === "ar" ? "الموقع" : "Localisation")
                      }
                    </button>
                  </div>
                </div>
                
                
                <DestinationSection
                  city={destCity}
                  language={language}
                  columns={hasKnownLocation ? 2 : undefined}
                  onDestinationClick={(destId) => {
                    const dest = allDestItems.find(d => d.id === destId);
                    if (dest) {
                      setSelectedDestination(dest);
                      setDestMapItem(null);
                    }
                  }}
                   onMapClick={hasKnownLocation ? (dest) => { setHoveredDestId(dest.id); } : (dest) => {
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
                  onHover={setHoveredDestId}
                />
                {allDestItems.length > 0 && (
                  <p className="text-xs text-muted-foreground font-medium mt-4 text-center">
                    {language === "en" ? "Destinations" : language === "ar" ? "وجهات" : "Destinations"}{destCity && ` — ${destCity}`} · {allDestItems.length} {language === "en" ? "results" : "résultats"}
                  </p>
                )}
              </div>
            </section>
            {/* Sticky map for Destinations — shown when location known and no panel open */}
            {hasKnownLocation && !hasRightPanel && (
              <div className="w-1/2 sticky top-0 h-screen z-[50]">
                <PoiGoogleMap
                  pois={allDests}
                  selectedPoiId={hoveredDestId || null}
                  onPoiClick={(id) => {
                    const dest = allDestItems.find(d => d.id === id);
                    if (dest) {
                      setSelectedDestination(dest);
                      setDestMapItem(null);
                    }
                  }}
                  center={mapCenterForResults}
                  fitToMarkers
                />
              </div>
            )}
            {selectedDestination && (
              <DestinationBusinessesPanel
                destination={selectedDestination}
                language={language}
                onClose={() => setSelectedDestination(null)}
                onBusinessClick={(bizId) => setDestSelectedBusinessId(bizId)}
              />
            )}
            {destSelectedBusinessId && isSubDesktop && (
              <div className="fixed inset-0 z-[39] bg-background" />
            )}
            {destSelectedBusinessId && (
              <div className={`fixed top-0 left-0 right-0 z-[220] bg-background shadow-2xl overflow-visible flex flex-col animate-slide-in-right lg:left-auto lg:border-l lg:border-border lg:transition-[width] lg:duration-300 lg:ease-out ${destPanelExpanded ? "lg:w-full" : "lg:w-1/2"}`} style={{ height: "100vh" }}>
                <div className="flex-1 min-h-0">
                  <BookOnlineSlidePanel
                    businessId={destSelectedBusinessId}
                    onClose={() => { setDestSelectedBusinessId(null); setDestPanelExpanded(false); }}
                    forceMuted={voiceStatus === "recording" || voiceStatus === "processing"}
                  />
                </div>
              </div>
            )}
            {destMapItem && !selectedDestination && (
              <div className={`fixed top-0 left-0 right-0 z-40 bg-background shadow-2xl overflow-hidden flex flex-col animate-slide-up-from-bottom lg:w-1/2 lg:left-auto lg:border-l lg:border-border`} style={{ height: "100vh" }}>
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
                    fitToMarkers
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




      {/* Filters & Results — Suggestion IA tab */}
      {activeTab === "suggestions" && (
      <section
         ref={resultsRef}
         className={`bg-white pt-4 pb-6 lg:pb-4 transition-all duration-300 [overflow-anchor:none] ${compactPanelBusiness ? "w-full lg:w-1/2" : "w-full"}`}
       >
        {/* Split layout wrapper: results left + map right when city/neighborhood known */}
        <div className={hasKnownLocation && !compactPanelBusiness ? "flex gap-0" : ""}>
        <div className={`${hasKnownLocation && !compactPanelBusiness ? "w-1/2 overflow-visible" : "w-full"} mx-auto px-4 ${compactPanelBusiness ? "max-w-full" : hasKnownLocation ? "max-w-full" : "max-w-full lg:max-w-[80%]"}`}
        >
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

          {showSosMedecin && <EmergencyNumbers variant="sos" />}
          {showPompiers && <EmergencyNumbers variant="pompiers" />}

          {/* Category filter moved to sticky zones above */}

          {isLoading ? null : filteredBusinesses.length === 0 && !showZitounEasterEgg && !showCelebrityGuide && !showSosMedecin && !showPompiers ? (
            <div className="text-center py-16 relative">
              <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl text-muted-foreground mb-2">{t.noResults}</p>
              <p className="text-sm text-muted-foreground">{t.tryAnother}</p>
            </div>
          ) : !showCelebrityGuide && !showSosMedecin && !showPompiers && filteredBusinesses.length > 0 ? (
            <>
               {/* Bar: Results count + Carte — STICKY 5 */}
               <div ref={resultsBarRef} data-results-bar className="sticky z-[19] bg-white lg:bg-white flex items-center justify-center px-4 gap-2 relative py-4 sm:py-4 lg:py-1.5 lg:hidden" style={{ top: '53px' }}>
                {isSubDesktop && (
                  <button
                    onClick={() => setShowMobileMap(true)}
                    className="lg:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium shadow-lg hover:bg-foreground/90 transition-colors"
                  >
                    <Map className="h-4 w-4" />
                    {language === "en" ? "Map" : language === "ar" ? "خريطة" : "Carte"}
                  </button>
                )}
              </div>
              {/* Fallback-style cards in 4-column grid */}
              <div className={`grid gap-4 pt-10 sm:pt-4 lg:pt-6 pb-28 [overflow-anchor:none] ${compactPanelBusiness ? "grid-cols-1 sm:grid-cols-2" : hasKnownLocation ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
                {paginatedBusinesses.map((business, index) => {
                  const img = business.images?.[0] || business.logo_url;
                  const avgOn20 = (business as any).computed_rating ?? business.rating ?? null;
                  const totalReviews = (business as any).total_review_count ?? 0;
                  const subcat = business.categories?.[0] || null;

                   const card = (
                     <div
                       key={business.id}
                       data-result-card={index === 0 ? "true" : undefined}
                       onClick={() => openCompactPanel({ id: business.id, name: business.name } as AIBusinessData)}
                      onMouseEnter={() => setHoveredResultId(business.id)}
                      onMouseLeave={() => setHoveredResultId(null)}
                      className="group overflow-hidden rounded-xl border border-border shadow-sm hover:shadow-md transition-all cursor-pointer relative aspect-square bg-muted"
                    >
                        {img ? (
                          <img src={img} alt={business.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Building2 className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        {business.wtuce_status === "verified" && (
                          <div className="absolute top-2 right-2 z-[15]">
                            <img src={logoGold} alt="Vérifié" className="w-12 h-12 object-contain" />
                          </div>
                        )}
                        
                        <div className="absolute top-2 left-2 z-[15] flex flex-wrap gap-1">
                          {subcat && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gold text-gold-foreground">
                              {subcat}
                            </span>
                          )}
                          {business.default_service && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-black text-white border border-white/20">
                              {business.default_service}
                            </span>
                          )}
                          {(() => {
                            if (!business.is_open_24h && !business.show_opening_hours) return null;
                            if (business.is_open_24h) {
                              return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#25D366] text-black">Ouvert 24h</span>;
                            }
                            if (!business.opening_hours) return null;

                            const frToEn: Record<string, string> = {
                              lundi: "monday", mardi: "tuesday", mercredi: "wednesday", jeudi: "thursday",
                              vendredi: "friday", samedi: "saturday", dimanche: "sunday",
                            };
                            const rawOH = business.opening_hours as Record<string, { open?: string; close?: string; open2?: string; close2?: string; closed?: boolean; continuous?: boolean }>;
                            const oh = Object.entries(rawOH).reduce((acc, [k, v]) => {
                              acc[frToEn[k] || k] = v;
                              return acc;
                            }, {} as Record<string, { open?: string; close?: string; open2?: string; close2?: string; closed?: boolean; continuous?: boolean }>);

                            const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                            const now = new Date();
                            const todayKey = days[now.getDay()];
                            if (isCurrentlyOpenCheck(oh[todayKey])) {
                              return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#25D366] text-black">Ouvert</span>;
                            }

                            const nowMin = now.getHours() * 60 + now.getMinutes();
                            const dh = oh[todayKey];
                            let badge: string | null = null;
                            if (dh && !dh.closed && dh.open) {
                              const [oH, oM] = dh.open.split(":").map(Number);
                              if (oH * 60 + (oM || 0) > nowMin) badge = `Ouvre à ${dh.open}`;
                              else if (dh.open2 && !dh.continuous) {
                                const [oH2, oM2] = dh.open2.split(":").map(Number);
                                if (oH2 * 60 + (oM2 || 0) > nowMin) badge = `Ouvre à ${dh.open2}`;
                              }
                            }
                            if (!badge) {
                              const dayLabels = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
                              for (let i = 1; i <= 7; i++) {
                                const idx = (now.getDay() + i) % 7;
                                const nd = oh[days[idx]];
                                if (nd && !nd.closed && nd.open) {
                                  badge = `Ouvre ${dayLabels[idx]} à ${nd.open}`;
                                  break;
                                }
                              }
                            }
                            if (!badge) return null;
                            return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary text-primary-foreground">{badge}</span>;
                          })()}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 z-[15] p-3 space-y-1">
                          {/* Label logos - above name */}
                          {businessLabelLogos[business.id]?.length > 0 && (
                            <div className="flex gap-2">
                              {businessLabelLogos[business.id].map((logoUrl, li) => (
                                <img key={li} src={logoUrl} alt="" className="h-14 w-auto object-contain drop-shadow-lg" />
                              ))}
                            </div>
                          )}
                          <p className="font-semibold text-base text-white leading-tight line-clamp-2" style={{ fontFamily: "'Josefin Sans', sans-serif", textTransform: "none", letterSpacing: "0.02em" }}>{business.name}</p>
                          {avgOn20 !== null && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Star className="h-3 w-3 text-gold fill-gold" />
                              <span className="font-medium text-white">{avgOn20}/20</span>
                              {totalReviews > 0 && (
                                <span className="text-white/70">· {totalReviews} avis</span>
                              )}
                            </div>
                          )}
                          {business.city && (
                            <div className="flex items-center gap-1 text-xs text-white/60">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{business.neighborhood ? `${business.city}, ${business.neighborhood}` : business.city}</span>
                              {(() => {
                                const dist = getDistanceKm(business);
                                if (dist == null) return null;
                                return (
                                  <span className="ml-auto text-[10px] font-medium text-gold whitespace-nowrap">
                                    {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                          {/* Engagements, Certifications & Logistics badges */}
                          {(() => {
                            const engs = (business.engagements || []);
                            const standards = engs.filter(e => !e.startsWith("Logistique:") && !e.startsWith("Certification:"));
                            const certifications = engs.filter(e => e.startsWith("Certification:")).map(e => e.replace("Certification:", "").trim());
                            const logistics = engs.filter(e => e.startsWith("Logistique:")).map(e => e.replace("Logistique:", "").trim());
                            if (standards.length === 0 && logistics.length === 0 && certifications.length === 0) return null;
                            const getLogIcon = (l: string) => {
                              const lower = l.toLowerCase();
                              if (lower.includes("livraison")) return Truck;
                              if (lower.includes("pmr") || lower.includes("handicap") || lower.includes("accès")) return Accessibility;
                              return Package;
                            };
                            return (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {certifications.map((c, i) => (
                                  <span key={`c-${i}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/30 text-amber-200 backdrop-blur-sm">
                                    <Award className="h-2.5 w-2.5" />{c}
                                  </span>
                                ))}
                                {standards.map((e, i) => (
                                  <span key={`e-${i}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-500/30 text-green-200 backdrop-blur-sm">
                                    <Leaf className="h-2.5 w-2.5" />{e}
                                  </span>
                                ))}
                                {logistics.map((l, i) => {
                                  const Icon = getLogIcon(l);
                                  return (
                                    <span key={`l-${i}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/30 text-blue-200 backdrop-blur-sm">
                                      <Icon className="h-2.5 w-2.5" />{l}
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                    </div>
                  );

                  // Insert AI suggestion card (stable slot) after the 3rd result (index 2), only on page 1 and not when showing same-category
                  if (index === 2 && currentPage === 1) {
                    const isAiReady = !!stickyAiText;
                    return [
                      card,
                      <div
                        key="ai-suggestion-card"
                        className={`overflow-hidden rounded-xl border-2 shadow-md relative aspect-square bg-gradient-to-br from-gold/5 via-background to-gold/10 flex flex-col transition-colors transition-shadow ${
                          isAiReady
                            ? "border-gold/60 cursor-pointer hover:shadow-lg hover:border-gold"
                            : "border-gold/30"
                        }`}
                        onClick={isAiReady ? () => setShowAiPopup(true) : undefined}
                      >
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gold text-gold-foreground flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Suggestion IA
                          </span>
                        </div>

                        {isAiReady ? (
                          <>
                            <div className="flex-1 flex items-center p-4 pt-10 overflow-hidden">
                              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-[10]">
                                {stickyAiText}
                              </p>
                            </div>
                            <div className="p-3 pt-0">
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Sparkles className="h-2.5 w-2.5 text-gold" />
                                <span>{language === "fr" ? "Généré par IA à partir de vos résultats" : language === "ar" ? "تم إنشاؤه بالذكاء الاصطناعي" : "AI-generated from your results"}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center px-4">
                            <Loader2 className="h-6 w-6 animate-spin text-gold mb-2" />
                            <span className="text-xs text-muted-foreground text-center">{language === "fr" ? "Suggestion IA en cours…" : language === "ar" ? "جارٍ التحميل…" : "Loading AI suggestion…"}</span>
                          </div>
                        )}
                      </div>,
                    ];
                  }

                  return card;
                })}
              </div>
              {filteredBusinesses.length > 0 && (
                <p className="text-xs text-muted-foreground font-medium mt-4 text-center">
                  {t.showing} {startResult} {t.to} {endResult} {t.of} {filteredBusinesses.length} {t.results}
                </p>
              )}
              {/* OLD grouped/paginated BusinessCard display:
              {groupedBusinesses ? (
                <div className="space-y-10">
                  {groupedBusinesses.map((group) => (
                    <GroupedSubcategoryRow ... />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {paginatedBusinesses.map((business) => (
                    <BusinessCard ... />
                  ))}
                </div>
              )}
              */}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 mb-24 flex flex-col items-center gap-4">
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
        {/* Right side: Sticky Google Map when city/neighborhood known */}
        {hasKnownLocation && !compactPanelBusiness && (
          <div className="w-1/2 sticky top-[53px] h-[calc(100vh-53px)]">
            <PoiGoogleMap
              pois={mapPoiItems}
              selectedPoiId={hoveredResultId || compactPanelBusiness?.id || null}
              onPoiClick={(poiId) => {
                const biz = filteredBusinesses.find(b => b.id === poiId);
                if (biz) openCompactPanel({ id: biz.id, name: biz.name } as AIBusinessData);
              }}
              center={mapCenterForResults}
              fitToMarkers
              subcategoryIconMap={subcategoryIconMap}
              highlightColor={{ bg: "#D4AF37", fg: "#1a1a1a", border: "#D4AF37" }}
            />
          </div>
        )}
        </div>
      </section>
      )}


      {/* Mobile/Tablet Map Overlay — slide-in from right */}
      {isSubDesktop && showMobileMap && (
        <div className="fixed inset-0 z-[201] bg-background animate-slide-in-right lg:hidden">
          {/* Close button overlaid on map — top-left */}
          <button
            onClick={() => setShowMobileMap(false)}
            className="absolute top-3 left-3 z-10 w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg hover:bg-foreground/90 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          {/* Map — full height */}
          <div className="w-full h-full">
            <PoiGoogleMap
              pois={activeTab === "poi" ? allPois : activeTab === "destinations" ? allDests : mobileMapPoiItems}
              selectedPoiId={activeTab === "poi" ? (hoveredPoiId || null) : activeTab === "destinations" ? (hoveredDestId || null) : (hoveredResultId || compactPanelBusiness?.id || null)}
              onPoiClick={(poiId) => {
                if (activeTab === "poi") {
                  setShowMobileMap(false);
                  setPoiMapBusiness(null);
                  setPoiSelectedBusinessId(poiId);
                } else if (activeTab === "destinations") {
                  const dest = allDestItems.find(d => d.id === poiId);
                  if (dest) {
                    setShowMobileMap(false);
                    setSelectedDestination(dest);
                    setDestMapItem(null);
                  }
                } else {
                  const biz = filteredBusinesses.find(b => b.id === poiId);
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

          {/* Left panel — full AI text — DISABLED */}
          {false && !isCompactPanelExpanded && !isSubDesktop && (
          <div
            className="fixed top-[48px] left-0 w-1/2 z-[100] bg-white dark:bg-zinc-900 border-r border-border shadow-xl flex flex-col animate-fade-in"
            style={{ height: "calc(100vh - 48px)" }}
          >
            <div className="shrink-0 flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-semibold">{language === "en" ? "AI Summary" : "Résumé IA"}</span>
              </div>
              <button
                onClick={() => closeCompactPanel()}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
               <div className="mb-4 text-center">
                {activeTab === "poi" ? (
                  <>
                    <p className="text-muted-foreground text-sm">
                      {language === "en" ? "Points of interest" : language === "ar" ? "أماكن الاهتمام" : "Lieux d'intérêt"}
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      {language === "en"
                        ? `10 recommended places out of ${allPois.length} found`
                        : `10 lieux recommandés sur ${allPois.length} lieux trouvés`}
                    </p>
                  </>
                ) : activeTab === "destinations" ? (
                  <>
                    <p className="text-muted-foreground text-sm">
                      {language === "en" ? "Destinations" : language === "ar" ? "الوجهات" : "Destinations"}
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      {language === "en"
                        ? `10 recommended destinations out of ${allDestItems.length} found`
                        : `10 destinations recommandées sur ${allDestItems.length} destinations trouvées`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground text-sm">
                      {language === "en" ? "Search results for" : language === "ar" ? "نتائج البحث عن" : "Résultats de recherche pour"}
                    </p>
                    <p className="text-lg font-bold text-foreground mt-1">
                      « {searchQuery} »
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      {language === "en"
                        ? `10 recommended establishments out of ${filteredBusinesses.length} found`
                        : language === "ar"
                        ? `10 مؤسسات موصى بها من أصل ${filteredBusinesses.length} وجدت`
                        : `10 établissements recommandés sur ${filteredBusinesses.length} établissements trouvés`}
                    </p>
                  </>
                )}
              </div>
              {(() => {
                // Determine what filters to show based on search context
                const hasCity = !!(detectedCity || (selectedCity && selectedCity !== "all"));
                const hasSubcategory = !!detectedSubcategory;
                const hasServices = searchServiceFilters.length > 0 && hasSubcategory;

                // Compute category counts from results
                const categoryCounts: Record<string, number> = {};
                for (const b of allBusinesses) {
                  if (b.main_category) {
                    categoryCounts[b.main_category] = (categoryCounts[b.main_category] || 0) + 1;
                  }
                }
                const categoryList = Object.entries(categoryCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => ({ name, count }));

                // When only 1 category exists, auto-select it and show subcategories instead
                const singleCategory = categoryList.length === 1 ? categoryList[0].name : null;
                const effectiveCategoryForSubs = selectedCategoryFilter || singleCategory;

                // Compute subcategory counts from results when we have a single/selected category
                let subcategoryList: { name: string; count: number }[] = [];
                if (effectiveCategoryForSubs && !hasSubcategory && !hasServices) {
                  const subCounts: Record<string, number> = {};
                  for (const b of allBusinesses) {
                    if (b.main_category === effectiveCategoryForSubs && b.categories) {
                      for (const c of b.categories) {
                        subCounts[c] = (subCounts[c] || 0) + 1;
                      }
                    }
                  }
                  subcategoryList = Object.entries(subCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, count]) => ({ name, count }));
                }

                const showCityFilter = availableCities.length > 1 && !queryHasExplicitCity;
                const showCategories = !hasSubcategory && categoryList.length > 1 && subcategoryList.length === 0;
                const showSubcategories = subcategoryList.length > 1;
                const showServices = hasServices;

                if (!showCityFilter && !showCategories && !showSubcategories && !showServices) return null;

                return (
                  <div className="mt-3 mb-4">
                    {showCityFilter && (
                      <>
                        <p className="text-base font-bold text-foreground mb-2">
                          {language === "en" ? "Where are you looking?" : language === "ar" ? "أين تبحث؟" : "Où le cherchez-vous ?"}
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
                          <button
                            onClick={() => handleCityChange("all")}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-bold transition-all whitespace-nowrap ${
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
                                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-bold transition-all whitespace-nowrap ${
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
                      </>
                    )}
                    {(showCategories || showSubcategories || showServices) && (
                      <>
                        <p className="text-base font-bold text-foreground mb-2">
                          {language === "en" ? "What are you looking for?" : language === "ar" ? "ماذا تبحث عنه؟" : "Que cherchez-vous ?"}
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          {showServices
                            ? searchServiceFilters.map((svc) => {
                                const isSelected = selectedServiceFilter === svc.name;
                                return (
                                  <button
                                    key={svc.name}
                                    onClick={() => { setSelectedServiceFilter(isSelected ? null : svc.name); }}
                                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-bold transition-all whitespace-nowrap ${
                                      isSelected
                                        ? "bg-primary/20 border-primary text-primary shadow-sm"
                                        : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                    }`}
                                  >
                                    <span>{svc.name}</span>
                                    <span className={`text-xs font-normal ${isSelected ? "text-primary/70" : "text-muted-foreground/60"}`}>
                                      {svc.count}
                                    </span>
                                  </button>
                                );
                              })
                            : showSubcategories
                              ? subcategoryList.map((sub) => {
                                  const isSelected = selectedSubcategoryFilter === sub.name;
                                  return (
                                    <button
                                      key={sub.name}
                                      onClick={() => {
                                        setSelectedSubcategoryFilter(isSelected ? null : sub.name);
                                        setSelectedServiceFilter(null);
                                        if (singleCategory && !selectedCategoryFilter) {
                                          setSelectedCategoryFilter(singleCategory);
                                        }
                                      }}
                                      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-bold transition-all whitespace-nowrap ${
                                        isSelected
                                          ? "bg-primary/20 border-primary text-primary shadow-sm"
                                          : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                      }`}
                                    >
                                      <span>{sub.name}</span>
                                      <span className={`text-xs font-normal ${isSelected ? "text-primary/70" : "text-muted-foreground/60"}`}>
                                        {sub.count}
                                      </span>
                                    </button>
                                  );
                                })
                              : categoryList.map((cat) => {
                                const isSelected = selectedCategoryFilter === cat.name;
                                return (
                                  <button
                                    key={cat.name}
                                    onClick={() => {
                                      setSelectedCategoryFilter(isSelected ? null : cat.name);
                                      setSelectedSubcategoryFilter(null);
                                      setSelectedServiceFilter(null);
                                    }}
                                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-bold transition-all whitespace-nowrap ${
                                      isSelected
                                        ? "bg-primary/20 border-primary text-primary shadow-sm"
                                        : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                    }`}
                                  >
                                    <span>{cat.name}</span>
                                    <span className={`text-xs font-normal ${isSelected ? "text-primary/70" : "text-muted-foreground/60"}`}>
                                      {cat.count}
                                    </span>
                                  </button>
                                );
                              })
                          }
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
              <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
                {(() => {
                  const isTTSActive = ttsStatus === "playing" && ttsSpokenWordIndex >= 0;
                  const karaokeTarget = isTTSActive ? ttsSpokenWordIndex - ttsIntroWordCountRef.current : -1;
                  return parseInline(
                    aiAnswerText.replace(/^[-•]\s+/gm, "").replace(/^\d+[.)]\s+/gm, "").replace(/\n+/g, " "),
                    allBusinesses as unknown as AIBusinessData[],
                    (b) => openCompactPanel(b),
                    "left-panel-ai",
                    isTTSActive
                      ? { wordIndex: 0, target: karaokeTarget, mode: "karaoke" as const }
                      : undefined
                  );
                })()}
              </div>
              {/* Action buttons: Listen, Geo, Mic */}
              <div className="flex items-center justify-center gap-20 pt-8 pb-24">
                {/* Listen */}
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-16 h-16 rounded-full border border-secondary/40 animate-[ripple_2.4s_ease-out_infinite] pointer-events-none" />
                  <span className="absolute w-16 h-16 rounded-full border border-secondary/30 animate-[ripple_2.4s_ease-out_0.6s_infinite] pointer-events-none" />
                  <span className="absolute w-16 h-16 rounded-full border border-secondary/20 animate-[ripple_2.4s_ease-out_1.2s_infinite] pointer-events-none" />
                  {(ttsStatus === "playing" || ttsStatus === "loading") ? (
                    <button
                      onClick={ttsStop}
                      className="relative z-10 w-16 h-16 rounded-full bg-black flex items-center justify-center shadow-lg transition-all hover:scale-105"
                      title={ttsStatus === "loading" ? "Chargement…" : "Stop"}
                    >
                      {ttsStatus === "loading" ? <Loader className="h-7 w-7 text-white animate-spin" /> : <VolumeX className="h-7 w-7 text-white" />}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (!aiAnswerText) return;
                        const cleanText = aiAnswerText.replace(/\*\*/g, "").replace(/^[-•]\s+/gm, "").replace(/^\d+[.)]\s+/gm, "").replace(/\n+/g, " ").trim();
                        const intro = language === "en" ? `Here are my suggestions for ${searchQuery}. ` : `Voici mes suggestions pour ${searchQuery}. `;
                        ttsIntroWordCountRef.current = intro.trim().split(/\s+/).filter(Boolean).length;
                        voiceLoopRef.current = true;
                        ttsSpeak(intro + cleanText + " … Vous pouvez me poser une autre question.", undefined, true);
                      }}
                      className="relative z-10 w-16 h-16 rounded-full bg-black flex items-center justify-center shadow-lg transition-all hover:scale-105"
                      title={language === "en" ? "Listen" : "Écouter"}
                    >
                      <Volume2 className="h-7 w-7 text-white" />
                    </button>
                  )}
                </div>
                {/* Mic */}
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-16 h-16 rounded-full border border-primary/40 animate-[ripple_2.4s_ease-out_infinite] pointer-events-none" />
                  <span className="absolute w-16 h-16 rounded-full border border-primary/30 animate-[ripple_2.4s_ease-out_0.6s_infinite] pointer-events-none" />
                  <span className="absolute w-16 h-16 rounded-full border border-primary/20 animate-[ripple_2.4s_ease-out_1.2s_infinite] pointer-events-none" />
                  <button
                    onClick={() => toggleRecording()}
                    className="relative z-10 w-16 h-16 rounded-full bg-black flex items-center justify-center shadow-lg transition-all hover:scale-105"
                    title={language === "en" ? "Voice search" : "Recherche vocale"}
                  >
                    <Mic className="h-7 w-7 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Right panel — business detail */}
          <div
            className={`fixed top-0 left-0 right-0 bottom-0 z-[220] bg-background shadow-2xl overflow-visible flex flex-col animate-slide-in-right lg:left-auto lg:bottom-auto lg:border-l lg:border-border lg:transition-[width] lg:duration-300 lg:ease-out ${isCompactPanelExpanded ? "lg:w-full border-l-2 shadow-[-8px_0_30px_-5px_rgba(0,0,0,0.15)]" : "lg:w-1/2"}`}
            style={{ height: isSubDesktop ? undefined : "100vh" }}
          >
            {!isNestedMosaicOpen && (
              <SlidePanelHeader
                onClose={handleCompactPanelClose}
                mobileTransparent
              />
            )}
            <div className="flex-1 min-h-0">
              <BookOnlineSlidePanel
                businessId={compactPanelBusiness.id}
                onClose={closeCompactPanel}
                externalOverlayActive={showAiPopup}
                forceMuted={voiceStatus === "recording" || voiceStatus === "processing"}
                interceptCloseRef={compactPanelInterceptCloseRef}
                showSearchBar
                onMosaicStateChange={setIsNestedMosaicOpen}
                onSearch={(params) => {
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
