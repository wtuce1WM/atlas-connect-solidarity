import { useRef, useState, useCallback, useEffect } from "react";
import { Building2, ChevronLeft, ChevronRight, Map, Clock, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchResultCard from "@/components/SearchResultCard";
import AISuggestionCard from "@/components/AISuggestionCard";
import PoiGoogleMap from "@/components/PoiGoogleMap";
import type { PoiMapItem } from "@/components/PoiGoogleMap";
import PanelSearchBar from "@/components/PanelSearchBar";
import FrontStructureNavBar from "@/components/FrontStructureNavBar";
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
  fsTopBusinessId?: string | null;
  allCityMapBusinesses?: Business[];
  hideAiSuggestion?: boolean;
  hotelSearchInfo?: { city: string; checkIn: string; checkOut: string; adults: number } | null;
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
  getDistanceKm,
  setShowMobileMap,
  setShowAiPopup,
  t,
  effectiveCity,
  onFrontStructureFilter,
  fsTopBusinessId,
  allCityMapBusinesses,
  hideAiSuggestion,
  hotelSearchInfo,
}: ResultsTabContentProps) {
  const { tabs: frontTabs } = useFrontStructureTabs(effectiveCity || null);
  const [activeFsTabId, setActiveFsTabId] = useState<string | null>(null);

  const handleFsTabClick = (tabId: string | null) => {
    setActiveFsTabId(tabId);
    if (!tabId) {
      onFrontStructureFilter?.(null);
    } else {
      const tab = frontTabs.find(t => t.id === tabId);
      onFrontStructureFilter?.(tab?.subcategoryNames || null);
    }
  };

  // Reset active tab when city or search query changes
  useEffect(() => {
    setActiveFsTabId(null);
  }, [effectiveCity, searchQuery]);

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
              {/* Bar: Results count + Carte — STICKY 5 */}
              <div ref={resultsBarRef} data-results-bar className="sticky z-[19] bg-white lg:bg-white flex items-center justify-center px-4 gap-2 relative py-4 sm:py-2 md:py-2 lg:py-1.5 lg:hidden" style={{ top: '53px' }}>
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
              {/* Hotel availability search header */}
              {hotelSearchInfo && (
                <div className="mt-4 mb-2 px-1">
                  <p className="text-sm font-medium text-neutral-900">
                    {language === "en" ? "Hotels available in" : "Hôtels disponibles à"} {hotelSearchInfo.city}. {hotelSearchInfo.checkIn} → {hotelSearchInfo.checkOut} · {hotelSearchInfo.adults} {language === "en" ? "adult(s)" : "adulte(s)"}
                  </p>
                </div>
              )}
              {/* Results grid */}
              <div className={`grid gap-4 pt-10 sm:pt-4 md:pt-4 lg:pt-14 pb-6 [overflow-anchor:none] ${compactPanelBusiness ? "grid-cols-1 sm:grid-cols-2" : (hasKnownLocation && !hideResultsMap) ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
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

                  if (index === 2 && currentPage === 1 && !hideAiSuggestion) {
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
                pois={mapPoiItems}
                selectedPoiId={hoveredResultId || compactPanelBusiness?.id || fsTopBusinessId || null}
                onPoiClick={(poiId) => {
                  const biz = filteredBusinesses.find(b => b.id === poiId)
                    || allCityMapBusinesses?.find(b => b.id === poiId);
                  if (biz) openCompactPanel({ id: biz.id, name: biz.name } as AIBusinessData);
                }}
                center={mapCenterForResults}
                fitToMarkers
              />
              <div className="absolute top-0 left-0 right-0 z-[80] flex flex-col backdrop-blur-sm">
                <div className="flex items-center gap-3 px-3 py-3">
                  <button
                    type="button"
                    onClick={() => setHideResultsMap(true)}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-black shadow-lg shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium text-white truncate drop-shadow-md">
                    {mapPoiItems.length} {language === "en" ? "results for" : language === "ar" ? "نتائج لـ" : "résultats pour"} "{activeFsTabId ? `${frontTabs.find(t => t.id === activeFsTabId)?.name || ''}${effectiveCity ? ` à ${effectiveCity}` : ''}`.trim() : searchQuery}"
                  </span>
                </div>
                <FrontStructureNavBar
                  tabs={frontTabs}
                  activeTabId={activeFsTabId}
                  onTabClick={handleFsTabClick}
                />
              </div>
              <PanelSearchBar
                onSearch={onSearchNavigate}
                onHotelSearch={onHotelSearch}
                onBusinessSelect={onBusinessSelect}
                closeTrigger={mapPanelCloseTrigger}
                noToolbarOffset
                solidBackground
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
