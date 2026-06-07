import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronLeft, ChevronRight, Map, Clock, MapPin, X, Heart, SlidersHorizontal, Navigation } from "lucide-react";
import { haversineKm } from "@/lib/haversine";
import ShareButton from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import SearchResultCard from "@/components/SearchResultCard";
import AISuggestionCard from "@/components/AISuggestionCard";
import PoiGoogleMap from "@/components/PoiGoogleMap";
import type { PoiMapItem } from "@/components/PoiGoogleMap";
import PanelSearchBar from "@/components/PanelSearchBar";
import FrontStructureNavBar from "@/components/FrontStructureNavBar";
import FrontStructureSubNavBar from "@/components/FrontStructureSubNavBar";
import FrontStructureSubFilterContent from "@/components/FrontStructureSubFilterContent";
import FiltersOverlayFlow from "@/components/FiltersOverlayFlow";
import { useFrontStructureTabs } from "@/hooks/useFrontStructureTabs";
import type { BusinessData as AIBusinessData } from "@/components/AISearchAnswer";
import type { Business } from "@/pages/search/types";
import type { TimeSlot } from "@/lib/timeSlots";

export interface ResultsTabContentProps {
  resultsRef: React.RefObject<HTMLDivElement>;
  resultsBarRef: React.RefObject<HTMLDivElement>;
  compactPanelBusiness: AIBusinessData | null;
  hasKnownLocation: boolean;
  hideResultsMap: boolean;
  setHideResultsMap: (v: boolean) => void;
  mapPanelCloseTrigger: number;
  onSearchNavigate: (params: Record<string, string>) => void;
  onHotelSearch?: (intent: { city: string; checkIn?: string; checkOut?: string; adults?: number }, spokenText: string) => void;
  onBusinessSelect: (bizId: string) => void;
  isCategoryFilterActive: boolean;
  isMobile: boolean;
  isSubDesktop: boolean;
  isLoading: boolean;
  filteredBusinesses: Business[];
  paginatedBusinesses: Business[];
  businessLabelLogos: Record<string, string[]>;
  mapPoiItems: PoiMapItem[];
  mapCenterForResults: { lat: number; lng: number } | undefined;
  hoveredResultId: string | null;
  setHoveredResultId: (id: string | null) => void;
  currentPage: number;
  totalPages: number;
  startResult: number;
  endResult: number;
  displayedResultsCount: number;
  goToPage: (page: number) => void;
  stickyAiText: string;
  searchQuery: string;
  spokenText: string;
  activeTimeSlot: TimeSlot | null;
  language: string;
  openCompactPanel: (biz: AIBusinessData) => void;
  onCloseCompactPanel?: () => void;
  getDistanceKm: (b: Business) => number | null;
  setShowMobileMap: (v: boolean) => void;
  setShowAiPopup: (v: boolean) => void;
  t: {
    noResults: string;
    tryAnother: string;
    verified: string;
    showing: string;
    to: string;
    results: string;
    previous: string;
    next: string;
  };
  effectiveCity?: string | null;
  onFrontStructureFilter?: (subcategoryNames: Set<string> | null) => void;
  onFrontStructureServicesFilter?: (services: Set<string> | null) => void;
  fsTopBusinessId?: string | null;
  allCityMapBusinesses?: Business[];
  allSearchMapBusinesses?: Business[];
  allSearchMapPoiItems?: PoiMapItem[];
  hideAiSuggestion?: boolean;
  hotelSearchInfo?: { city: string; checkIn: string; checkOut: string; adults: number } | null;
  showAllSearchMarkers?: boolean;
  onToggleShowAllSearchMarkers?: () => void;
  searchResultsTotal?: number;
  fsMatchingCount?: number;
  labelFromUrl?: string;
  userCoords?: { lat: number; lng: number } | null;
  belowCardsSlot?: React.ReactNode;
}

export default function ResultsTabContent({
  resultsRef,
  resultsBarRef,
  compactPanelBusiness,
  hasKnownLocation,
  hideResultsMap,
  setHideResultsMap,
  mapPanelCloseTrigger,
  onSearchNavigate,
  onHotelSearch,
  onBusinessSelect,
  isCategoryFilterActive,
  isMobile,
  isSubDesktop,
  isLoading,
  filteredBusinesses,
  paginatedBusinesses,
  businessLabelLogos,
  mapPoiItems,
  mapCenterForResults,
  hoveredResultId,
  setHoveredResultId,
  currentPage,
  totalPages,
  startResult,
  endResult,
  displayedResultsCount,
  goToPage,
  stickyAiText,
  searchQuery,
  spokenText,
  activeTimeSlot,
  language,
  openCompactPanel,
  onCloseCompactPanel,
  getDistanceKm,
  setShowMobileMap,
  setShowAiPopup,
  t,
  effectiveCity,
  onFrontStructureFilter,
  onFrontStructureServicesFilter,
  fsTopBusinessId,
  allCityMapBusinesses,
  allSearchMapBusinesses,
  allSearchMapPoiItems,
  hideAiSuggestion,
  hotelSearchInfo,
  showAllSearchMarkers,
  onToggleShowAllSearchMarkers,
  searchResultsTotal,
  fsMatchingCount,
  labelFromUrl,
  userCoords,
  belowCardsSlot,
}: ResultsTabContentProps) {
  const { tabs: frontTabs } = useFrontStructureTabs(effectiveCity || null);
  const [activeFsTabId, setActiveFsTabId] = useState<string | null>(null);
  const [activeFsSubId, setActiveFsSubId] = useState<string | null>(null);
  const [activeFsServices, setActiveFsServices] = useState<string[]>([]);
  const [showFiltersOverlay, setShowFiltersOverlay] = useState(false);
  // Filtre "à proximité" — actif uniquement en mode "Tous" et si on connait la position user.
  const [proximityKm, setProximityKm] = useState<number | null>(null);
  // Reset le filtre proximité quand on change de ville, requête, sous-cat ou quand on quitte "Tous"
  useEffect(() => { setProximityKm(null); }, [effectiveCity, searchQuery, activeFsSubId]);

  const proximityActive = !!(proximityKm && userCoords);

  // Masquer le filtre "À proximité" si l'utilisateur est à plus de 10 km du centre de recherche
  const userNearSearchArea = useMemo(() => {
    if (!userCoords) return false;
    if (!mapCenterForResults) return true;
    const d = haversineKm(userCoords.lat, userCoords.lng, mapCenterForResults.lat, mapCenterForResults.lng);
    return d <= 10;
  }, [userCoords, mapCenterForResults]);

  const proximityFilteredBusinesses = useMemo(() => {
    if (!proximityActive) return null;
    // Use the full search map pool (same as the markers) so the cards never miss
    // a result that's only loaded in the map pool, not yet in the paginated list.
    const pool = (allSearchMapBusinesses && allSearchMapBusinesses.length > filteredBusinesses.length)
      ? allSearchMapBusinesses
      : filteredBusinesses;
    return pool.filter((b) => {
      const d = getDistanceKm(b);
      return d != null && d <= proximityKm!;
    });
  }, [proximityActive, proximityKm, filteredBusinesses, allSearchMapBusinesses, getDistanceKm]);

  const proximityFilteredMapPoiItems = useMemo(() => {
    if (!proximityActive) return null;
    const pool = (allSearchMapPoiItems && allSearchMapPoiItems.length > mapPoiItems.length)
      ? allSearchMapPoiItems
      : mapPoiItems;
    return pool.filter((p) => {
      if (p.latitude == null || p.longitude == null) return false;
      const d = haversineKm(userCoords!.lat, userCoords!.lng, p.latitude, p.longitude);
      return d <= proximityKm!;
    });
  }, [proximityActive, proximityKm, mapPoiItems, allSearchMapPoiItems, userCoords]);

  const effectiveBusinesses = proximityFilteredBusinesses ?? paginatedBusinesses;
  const effectiveMapPoiItems = proximityFilteredMapPoiItems ?? mapPoiItems;
  const proximityCount = proximityFilteredBusinesses?.length ?? 0;

  useEffect(() => { if (compactPanelBusiness) setShowFiltersOverlay(false); }, [compactPanelBusiness]);
  useEffect(() => {
    const handler = () => setShowFiltersOverlay(true);
    window.addEventListener("open-results-filters", handler);
    return () => window.removeEventListener("open-results-filters", handler);
  }, []);
  useEffect(() => {
    if (!showFiltersOverlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [showFiltersOverlay]);
  const autoFsLabelKeyRef = useRef<string | null>(null);
  const resolvedHotelSearchInfo = hotelSearchInfo || (() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const city = params.get("hotelCity");
    const checkIn = params.get("hotelCheckIn");
    const checkOut = params.get("hotelCheckOut");
    const adults = params.get("hotelAdults");
    return city && checkIn && checkOut && adults
      ? { city, checkIn, checkOut, adults: parseInt(adults, 10) || 0 }
      : null;
  })();

  // Union of all front_structure subcategory names — used as the default
  // filter when no specific FS tab is selected, so results stay constrained
  // to the front_structure scope.
  const allFsNames = useMemo(() => {
    const s = new Set<string>();
    for (const t of frontTabs) for (const n of t.subcategoryNames) s.add(n);
    return s;
  }, [frontTabs]);

  const handleFsTabClick = (tabId: string | null) => {
    setActiveFsTabId(tabId);
    setActiveFsSubId(null);
    setActiveFsServices([]);
    onFrontStructureServicesFilter?.(null);
    if (!tabId) {
      onFrontStructureFilter?.(allFsNames.size > 0 ? allFsNames : null);
    } else {
      const tab = frontTabs.find(t => t.id === tabId);
      onFrontStructureFilter?.(tab?.subcategoryNames || null);
    }
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const handleFsSubClick = (subId: string | null) => {
    setActiveFsSubId(subId);
    setActiveFsServices([]);
    onFrontStructureServicesFilter?.(null);
    const tab = activeFsTabId ? frontTabs.find(t => t.id === activeFsTabId) : null;
    if (!tab) return;
    if (!subId) {
      onFrontStructureFilter?.(tab.subcategoryNames);
    } else {
      const sub = tab.subcategories.find(s => s.id === subId);
      onFrontStructureFilter?.(sub?.names || tab.subcategoryNames);
    }
    requestAnimationFrame(() => {
      const el = resultsBarRef.current;
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 60;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };


  const handleFsServicesChange = (svcs: string[]) => {
    setActiveFsServices(svcs);
    onFrontStructureServicesFilter?.(svcs.length > 0 ? new Set(svcs) : null);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  // Reset active tab when city or search query changes
  useEffect(() => {
    setActiveFsTabId(null);
    setActiveFsSubId(null);
    setActiveFsServices([]);
    onFrontStructureServicesFilter?.(null);
  }, [effectiveCity, searchQuery]);

  // Always constrain browse results to the front_structure scope when no specific
  // FS tab is selected. Do not apply this default during a text/server search:
  // it would re-count only the currently loaded page (21) instead of totalCount.
  useEffect(() => {
    if (activeFsTabId) return;
    if (searchQuery.trim()) return;
    // Skip the default-all FS filter when the URL already conveys an explicit
    // label intent (e.g. extra card "Ateliers" with pinIds). Otherwise the
    // 132+ allFsNames set would override pinIds and inflate the result count.
    if (labelFromUrl && labelFromUrl.trim()) return;
    if (allFsNames.size === 0) return;
    onFrontStructureFilter?.(allFsNames);
  }, [activeFsTabId, allFsNames, onFrontStructureFilter, searchQuery, labelFromUrl]);

  // When landing on a front-structure URL (e.g. label=Hébergement), select that tab
  // so the subcategory/services filter is visible immediately.
  useEffect(() => {
    const label = (labelFromUrl || "").replace(/^#+/, "").trim().toLowerCase();
    const key = `${effectiveCity || ""}|${label}`;
    if (!label || autoFsLabelKeyRef.current === key || frontTabs.length === 0) return;

    // 1) Try exact match on a front-structure tab name (e.g. "Hébergement")
    const tab = frontTabs.find((t) => t.name.trim().toLowerCase() === label);
    if (tab) {
      autoFsLabelKeyRef.current = key;
      setActiveFsTabId(tab.id);
      setActiveFsSubId(null);
      setActiveFsServices([]);
      onFrontStructureFilter?.(tab.subcategoryNames);
      onFrontStructureServicesFilter?.(null);
      return;
    }

    // 2) Try matching a subcategory inside any tab (e.g. label="Piscines")
    for (const t of frontTabs) {
      const sub = t.subcategories.find((s) => s.name.trim().toLowerCase() === label);
      if (sub) {
        autoFsLabelKeyRef.current = key;
        setActiveFsTabId(t.id);
        setActiveFsSubId(sub.id);
        setActiveFsServices([]);
        onFrontStructureFilter?.(sub.names);
        onFrontStructureServicesFilter?.(null);
        return;
      }
    }
  }, [labelFromUrl, effectiveCity, frontTabs]);

  // Auto-select the FS tab matching the dominant main_category of current
  // results, so the sub-category filter is directly visible on the map even
  // when the search did not detect a sub-category (e.g. "manger une glace dans la medina").
  // Skip when the URL already provides an explicit label intent (e.g. manual card
  // like "Piscines"): the dominant-category heuristic would otherwise mis-classify
  // pin-based results (a pool in a restaurant would auto-select "Restauration").
  useEffect(() => {
    if (activeFsTabId) return;
    if (labelFromUrl && labelFromUrl.trim()) return;
    if (!frontTabs.length || !filteredBusinesses?.length) return;
    const counts: Record<string, number> = {};
    for (const b of filteredBusinesses as any[]) {
      const cats: string[] = [b.main_category, ...(Array.isArray(b.categories) ? b.categories : [])].filter(Boolean);
      for (const tab of frontTabs) {
        if (cats.some((c) => tab.subcategoryNames.has(c))) {
          counts[tab.id] = (counts[tab.id] || 0) + 1;
        }
      }
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return;
    const [bestId, bestCount] = entries[0];
    const secondCount = entries[1]?.[1] ?? 0;
    const total = filteredBusinesses.length;
    // Only auto-lock a main category when the dominance is clear:
    // - best tab covers at least 60% of results,
    // - AND it is at least twice the runner-up.
    // Otherwise leave it null so the badge stays "Catégorie" (ambiguous search).
    const dominant = bestCount / total >= 0.6 && bestCount >= secondCount * 2;
    if (!dominant) return;
    setActiveFsTabId(bestId);

  }, [frontTabs, filteredBusinesses, activeFsTabId, labelFromUrl]);


  const activeFsTab = activeFsTabId ? frontTabs.find(t => t.id === activeFsTabId) : null;


  return (
    <section
      ref={resultsRef}
      className={`bg-white pb-6 lg:pb-4 [overflow-anchor:none] ${compactPanelBusiness ? "w-full lg:w-1/2" : "w-full"}`}
    >
        <div className={hasKnownLocation && !compactPanelBusiness && !hideResultsMap ? "flex gap-0" : ""}>
          <div className={`pt-4 ${hasKnownLocation && !compactPanelBusiness && !hideResultsMap ? "w-1/2 overflow-visible" : "w-full"} mx-auto px-4 max-w-full`}>
          {/* Filters: Time slot indicator */}
          <div className={`${isCategoryFilterActive ? 'mb-3' : 'mb-8'} flex flex-wrap items-center gap-3 ${isMobile ? 'hidden' : ''} ${!activeTimeSlot ? 'lg:mb-0 lg:hidden' : ''}`}>
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
          </div>

          {isLoading ? null : filteredBusinesses.length === 0 ? (
            <div className="text-center py-16 relative">
              <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl text-muted-foreground mb-2">{t.noResults}</p>
              <p className="text-sm text-muted-foreground">{t.tryAnother}</p>
            </div>
          ) : filteredBusinesses.length > 0 ? (
            <>
              {/* Hotel availability search header */}
              {resolvedHotelSearchInfo && (
                <div className="sticky z-[21] -mx-4 mb-4 bg-white px-4 py-2 shadow-sm top-[53px] lg:top-[53px] lg:pt-[17px]">
                  <p className="mx-auto max-w-screen-2xl text-base font-semibold leading-snug text-neutral-900">
                    <span className="text-black mr-1">{filteredBusinesses.length}</span>
                    {language === "en" ? "Hotels available in" : `Hôtel${filteredBusinesses.length > 1 ? 's' : ''} disponible${filteredBusinesses.length > 1 ? 's' : ''} à`} {resolvedHotelSearchInfo.city}.<br className="sm:hidden" /> <span>{resolvedHotelSearchInfo.checkIn} → {resolvedHotelSearchInfo.checkOut} · {resolvedHotelSearchInfo.adults} {language === "en" ? "adult(s)" : "adulte(s)"}</span>
                  </p>
                </div>
              )}
              {/* Bar: Results count + Carte — STICKY 5 */}
              <div ref={resultsBarRef} data-results-bar className={`sticky z-[25] bg-white lg:bg-white flex items-center justify-center px-4 gap-2 relative py-4 sm:py-2 md:py-2 md:min-h-[40px] lg:py-1.5 lg:min-h-[40px] ${resolvedHotelSearchInfo ? 'top-[101px] md:top-[91px]' : 'top-[53px] md:top-[60px]'}`}>
                <button
                  onClick={() => {
                    setShowFiltersOverlay(false);
                    if (compactPanelBusiness) onCloseCompactPanel?.();
                    if (hasKnownLocation && hideResultsMap) {
                      setHideResultsMap(false);
                    } else {
                      setShowMobileMap(true);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium shadow-lg hover:bg-foreground/90 transition-colors"
                >
                  <Map className="h-4 w-4" />
                  {language === "en" ? "Map" : language === "ar" ? "خريطة" : "Carte"}
                </button>
                <button
                  onClick={() => setShowFiltersOverlay(v => {
                    const next = !v;
                    if (next) {
                      if (hasKnownLocation && hideResultsMap) setHideResultsMap(false);
                      setActiveFsTabId(null);
                      setActiveFsSubId(null);
                    }
                    return next;
                  })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium shadow-lg hover:bg-foreground/90 transition-colors"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {language === "en" ? "Filters" : language === "ar" ? "فلاتر" : "Filtres"}
                </button>
              </div>
              {/* Results grid */}
              <div className={`grid gap-4 ${resolvedHotelSearchInfo ? "pt-2 lg:pt-10" : "pt-10 sm:pt-4 md:pt-4 lg:pt-14"} pb-6 [overflow-anchor:none] ${compactPanelBusiness ? "grid-cols-1 sm:grid-cols-2" : (hasKnownLocation && !hideResultsMap) ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
                {effectiveBusinesses.map((business, index) => {
                  const card = (
                    <SearchResultCard
                      key={business.id}
                      business={business as any}
                      index={index}
                      labelLogos={businessLabelLogos[business.id] || []}
                      distanceKm={getDistanceKm(business)}
                      onClick={() => { setShowFiltersOverlay(false); openCompactPanel({ id: business.id, name: business.name, videoUrl: (business as any).videoUrl } as unknown as AIBusinessData); }}
                      onMouseEnter={() => setHoveredResultId(business.id)}
                      onMouseLeave={() => setHoveredResultId(null)}
                    />
                  );

                  return card;
                })}
              </div>

              {belowCardsSlot}

              {/* Pagination */}
              {!proximityActive && totalPages > 1 && (
                <div className="mb-20 flex flex-col items-center gap-1">
                  <p className="text-sm text-muted-foreground">
                    {t.showing} {startResult} {t.to} {endResult} sur {displayedResultsCount} {t.results}
                  </p>
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
        {hasKnownLocation && !compactPanelBusiness && !hideResultsMap && (
          <div className="w-1/2 sticky top-0 h-screen z-[50] overflow-hidden">
            <div className="relative h-full min-h-0">
              <PoiGoogleMap
                pois={effectiveMapPoiItems}
                selectedPoiId={compactPanelBusiness?.id || null}
                hoveredPoiId={hoveredResultId || null}
                onPoiClick={(poiId) => {
                  const biz = filteredBusinesses.find(b => b.id === poiId)
                    || allCityMapBusinesses?.find(b => b.id === poiId);
                  if (biz) openCompactPanel({ id: biz.id, name: biz.name } as AIBusinessData);
                }}
                center={mapCenterForResults}
                fitToMarkers
                userLocation={userCoords ?? null}
              />
              <div className="absolute top-0 left-0 right-0 z-[80] flex flex-col">
                <div className="relative z-10 flex items-center gap-3 px-3 py-3 bg-white/30 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setHideResultsMap(true)}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-black shadow-lg shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <span className="flex-1 text-center text-sm font-medium text-black truncate">
                    {(spokenText || searchQuery || labelFromUrl || "").trim()}
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
                      title={spokenText || searchQuery || "Recherche"}
                      variant="dark"
                      className="shrink-0"
                    />
                  </div>
                </div>
                {(() => {
                  const total = Math.max(searchResultsTotal ?? 0, fsMatchingCount ?? 0, mapPoiItems.length);
                  const showToggle = total > 20 || !!activeFsSubId || !!showAllSearchMarkers;
                  return (
                    <div className="flex items-center justify-center gap-2 px-3 pt-3 pb-2">
                      {showToggle && (
                        <div className="inline-flex rounded-full bg-black/50 backdrop-blur-sm p-0.5 text-[11px] font-semibold uppercase tracking-wider" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                          <button
                            type="button"
                            onClick={() => { if (activeFsSubId) handleFsSubClick(null); if (showAllSearchMarkers) onToggleShowAllSearchMarkers?.(); }}
                            className={`px-3 py-1 rounded-full transition-colors ${!showAllSearchMarkers && !activeFsSubId ? "bg-[#D4AF37] text-black" : "text-white/80 hover:text-white"}`}
                          >
                            Top 20
                          </button>
                          <button
                            type="button"
                            onClick={() => { if (activeFsSubId) handleFsSubClick(null); if (!showAllSearchMarkers) onToggleShowAllSearchMarkers?.(); }}
                            className={`px-3 py-1 rounded-full transition-colors ${showAllSearchMarkers && !activeFsSubId ? "bg-[#D4AF37] text-black" : "text-white/80 hover:text-white"}`}
                          >
                            Tous <span className="ml-0.5 opacity-70">{total}</span>
                          </button>
                        </div>
                      )}
                      {(() => {
                        const tab = activeFsTabId ? frontTabs.find(t => t.id === activeFsTabId) : null;
                        // When a main category is locked, expose its sub-categories.
                        // Otherwise (ambiguous search), expose the front-structure
                        // categories themselves so the user can narrow down.
                        if (tab) {
                          const subs = tab.subcategories ?? [];
                          if (subs.length === 0) return null;
                          const activeSubName = activeFsSubId
                            ? (subs.find(s => s.id === activeFsSubId)?.name ?? "Sous-catégorie")
                            : "Sous-catégorie";
                          return (
                            <div className="inline-flex rounded-full bg-black/50 backdrop-blur-sm p-0.5 text-[11px] font-semibold uppercase tracking-wider" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${activeFsSubId ? "bg-[#D4AF37] text-black" : "text-white/80 hover:text-white"}`}
                                  >
                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                    {activeSubName}
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="z-[95] max-h-80 overflow-y-auto">
                                  {activeFsSubId && (
                                    <DropdownMenuItem onSelect={() => handleFsSubClick(null)}>
                                      Toutes les sous-catégories
                                    </DropdownMenuItem>
                                  )}
                                  {subs.map((s) => (
                                    <DropdownMenuItem key={s.id} onSelect={() => handleFsSubClick(s.id)}>
                                      {s.name} <span className="ml-1 opacity-60">({s.count})</span>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          );
                        }
                        if (frontTabs.length === 0) return null;
                        return (
                          <div className="inline-flex rounded-full bg-black/50 backdrop-blur-sm p-0.5 text-[11px] font-semibold uppercase tracking-wider" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors text-white/80 hover:text-white"
                                >
                                  <SlidersHorizontal className="h-3.5 w-3.5" />
                                  Catégorie
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="z-[95] max-h-80 overflow-y-auto">
                                {frontTabs.map((ft) => (
                                  <DropdownMenuItem key={ft.id} onSelect={() => handleFsTabClick(ft.id)}>
                                    {ft.name} <span className="ml-1 opacity-60">({ft.count})</span>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })()}
                      {/* Filtre "À proximité" — visible uniquement en mode "Tous" et si on connait la position user */}
                      {userCoords && (() => {
                        const opts: { km: number; label: string }[] = [
                          { km: 0.5, label: "Moins de 500 m" },
                          { km: 1, label: "Moins de 1 km" },
                          { km: 5, label: "Moins de 5 km" },
                          { km: 10, label: "Moins de 10 km" },
                        ];
                        const active = opts.find(o => o.km === proximityKm);
                        return (
                          <div className="inline-flex rounded-full bg-black/50 backdrop-blur-sm p-0.5 text-[11px] font-semibold uppercase tracking-wider" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${proximityActive ? "bg-[#D4AF37] text-black" : "text-white/80 hover:text-white"}`}
                                >
                                  <Navigation className="h-3.5 w-3.5" />
                                  {active ? active.label : "À proximité"}
                                  {proximityActive && (
                                    <span className="ml-0.5 opacity-70">{proximityCount}</span>
                                  )}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="z-[95]">
                                {proximityKm != null && (
                                  <DropdownMenuItem onSelect={() => setProximityKm(null)}>
                                    Toutes distances
                                  </DropdownMenuItem>
                                )}
                                {opts.map(o => (
                                  <DropdownMenuItem key={o.km} onSelect={() => setProximityKm(o.km)}>
                                    {o.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
              {/* Bottom floating PanelSearchBar is rendered by SearchPage (single source) to avoid duplicate FAB buttons over the map. */}
            </div>
          </div>
        )}
        {/* Filters overlay — single-column 3-step flow (Structure → Sous-catégorie → Service) */}
        {showFiltersOverlay && (() => {
          const pool = (allCityMapBusinesses && allCityMapBusinesses.length > 0)
            ? allCityMapBusinesses
            : filteredBusinesses;
          return (
            <div
              className="fixed inset-0 z-[230] shadow-2xl flex flex-col bg-no-repeat bg-cover bg-center animate-slide-up-from-bottom lg:left-1/2"
              style={{ backgroundImage: "url('/hero_magical_realism_v3.jpg')" }}
            >
              <FiltersOverlayFlow
                frontTabs={frontTabs}
                activeFsTabId={activeFsTabId}
                activeFsSubId={activeFsSubId}
                activeFsServices={activeFsServices}
                onTabClick={handleFsTabClick}
                onSubClick={handleFsSubClick}
                onServicesChange={handleFsServicesChange}
                pool={pool}
                onClose={() => setShowFiltersOverlay(false)}
              />
            </div>
          );
        })()}


      </div>
    </section>
  );
}
