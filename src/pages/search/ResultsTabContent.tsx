import { useRef, useState, useCallback, useEffect, useMemo, lazy, Suspense } from "react";
import { Building2, ChevronLeft, ChevronRight, Map, X, Star, Leaf, Truck, Accessibility, Package, Award, Loader2, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import BusinessCard, { type BusinessCardData, type Gamme, type Badge, type SubcategoryRef, type BadgeSubcategoryRef } from "@/components/BusinessCard";
import SearchResultCard from "@/components/SearchResultCard";
import AISuggestionCard from "@/components/AISuggestionCard";
import PoiGoogleMap from "@/components/PoiGoogleMap";
import type { PoiMapItem } from "@/components/PoiGoogleMap";
import type { BusinessData as AIBusinessData } from "@/components/AISearchAnswer";
import EmergencyNumbers from "@/components/EmergencyNumbers";
import CelebrityGuide from "@/pages/search/CelebrityGuide";
import type { Business } from "@/pages/search/types";
import type { TimeSlot } from "@/lib/timeSlots";
import zitounMaskImg from "@/assets/zitoun-mask.jpg";

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

export interface ResultsTabContentProps {
  // Refs
  resultsRef: React.RefObject<HTMLDivElement>;
  resultsBarRef: React.RefObject<HTMLDivElement>;
  // Layout
  compactPanelBusiness: AIBusinessData | null;
  hasKnownLocation: boolean;
  hideResultsMap: boolean;
  isCategoryFilterActive: boolean;
  isMobile: boolean;
  isSubDesktop: boolean;
  isLoading: boolean;
  // Data
  filteredBusinesses: Business[];
  paginatedBusinesses: Business[];
  businessLabelLogos: Record<string, string[]>;
  celebrityBusinesses: Business[];
  gammes: Gamme[];
  badges: Badge[];
  subcategories: SubcategoryRef[];
  badgeSubcategories: BadgeSubcategoryRef[];
  // Map
  mapPoiItems: PoiMapItem[];
  mapCenterForResults: { lat: number; lng: number } | undefined;
  hoveredResultId: string | null;
  setHoveredResultId: (id: string | null) => void;
  // Pagination
  currentPage: number;
  totalPages: number;
  startResult: number;
  endResult: number;
  displayedResultsCount: number;
  goToPage: (page: number) => void;
  // AI
  stickyAiText: string;
  // Search context
  searchQuery: string;
  spokenText: string;
  activeTimeSlot: TimeSlot | null;
  language: string;
  // Easter eggs
  showZitounEasterEgg: boolean;
  showCelebrityGuide: boolean;
  showSosMedecin: boolean;
  showPompiers: boolean;
  // Callbacks
  openCompactPanel: (biz: AIBusinessData) => void;
  getDistanceKm: (b: Business) => number | null;
  setShowMobileMap: (v: boolean) => void;
  setShowAiPopup: (v: boolean) => void;
  // Translations
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
}

export default function ResultsTabContent({
  resultsRef,
  resultsBarRef,
  compactPanelBusiness,
  hasKnownLocation,
  hideResultsMap,
  isCategoryFilterActive,
  isMobile,
  isSubDesktop,
  isLoading,
  filteredBusinesses,
  paginatedBusinesses,
  businessLabelLogos,
  celebrityBusinesses,
  gammes,
  badges,
  subcategories,
  badgeSubcategories,
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
  showZitounEasterEgg,
  showCelebrityGuide,
  showSosMedecin,
  showPompiers,
  openCompactPanel,
  getDistanceKm,
  setShowMobileMap,
  setShowAiPopup,
  t,
}: ResultsTabContentProps) {
  return (
    <section
      ref={resultsRef}
      className={`bg-white pb-6 lg:pb-4 transition-all duration-300 [overflow-anchor:none] ${compactPanelBusiness ? "w-full lg:w-1/2" : "w-full"}`}
    >
      {/* Split layout wrapper: results left + map right when city/neighborhood known */}
      <div className={hasKnownLocation && !compactPanelBusiness ? "flex gap-0" : ""}>
        <div className={`pt-4 ${hasKnownLocation && !compactPanelBusiness ? "w-1/2 overflow-visible" : "w-full"} mx-auto px-4 ${compactPanelBusiness ? "max-w-full" : hasKnownLocation ? "max-w-full" : "max-w-full lg:max-w-[80%]"}`}>
          {/* Filters: City + Geo toggle — on mobile shown before hero via order */}
          <div className={`${isCategoryFilterActive ? 'mb-3' : 'mb-8'} flex flex-wrap items-center gap-3 ${isMobile ? 'hidden' : ''} ${!activeTimeSlot ? 'lg:mb-0 lg:hidden' : ''}`}>
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
              <div className={`grid gap-4 pt-10 sm:pt-12 lg:pt-14 pb-28 [overflow-anchor:none] ${compactPanelBusiness ? "grid-cols-1 sm:grid-cols-2" : (hasKnownLocation && !hideResultsMap) ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
                {paginatedBusinesses.map((business, index) => {
                  const card = (
                    <SearchResultCard
                      key={business.id}
                      business={business as any}
                      index={index}
                      labelLogos={businessLabelLogos[business.id] || []}
                      distanceKm={getDistanceKm(business)}
                      onClick={() => openCompactPanel({ id: business.id, name: business.name } as AIBusinessData)}
                      onMouseEnter={() => setHoveredResultId(business.id)}
                      onMouseLeave={() => setHoveredResultId(null)}
                    />
                  );

                  if (index === 2 && currentPage === 1) {
                    return [
                      card,
                      <AISuggestionCard
                        key="ai-suggestion-card"
                        stickyAiText={stickyAiText}
                        language={language}
                        onOpen={() => setShowAiPopup(true)}
                      />,
                    ];
                  }

                  return card;
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mb-4 flex flex-col items-center gap-1">
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
          <div className="w-1/2 sticky top-0 h-screen z-[50] relative overflow-hidden">
            <PoiGoogleMap
              pois={mapPoiItems}
              selectedPoiId={hoveredResultId || compactPanelBusiness?.id || null}
              onPoiClick={(poiId) => {
                const biz = filteredBusinesses.find(b => b.id === poiId);
                if (biz) openCompactPanel({ id: biz.id, name: biz.name } as AIBusinessData);
              }}
              center={mapCenterForResults}
              fitToMarkers
            />
          </div>
        )}
      </div>
    </section>
  );
}
