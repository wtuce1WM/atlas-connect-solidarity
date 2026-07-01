import { useState, useEffect, useMemo } from "react";
import { Map as MapIcon, X, SlidersHorizontal, Navigation } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import PoiSection from "@/components/PoiSection";
import PoiGoogleMap from "@/components/PoiGoogleMap";
import type { PoiMapItem } from "@/components/PoiGoogleMap";
import BookOnlineSlidePanel from "@/components/BookOnlineSlidePanel";
import SlidePanelHeader from "@/components/SlidePanelHeader";
import PanelSearchBar from "@/components/PanelSearchBar";
import { haversineKm } from "@/lib/haversine";
import { mapLabel } from "@/lib/mapLabels";
import { useTaxonomyTranslations } from "@/hooks/useTaxonomyTranslations";

interface PoiTabContentProps {
  selectedCity: string;
  detectedCity: string | null;
  language: string;
  hasKnownLocation: boolean;
  isSubDesktop: boolean;
  hidePoiMap: boolean;
  setHidePoiMap: (v: boolean) => void;
  setShowMobileMap: (v: boolean) => void;
  mapCenterForResults?: { lat: number; lng: number };
  citiesWithPriority: { name: string; priority: number; id?: string; latitude?: number | null; longitude?: number | null }[];
  voiceStatus: string;
  mapPanelCloseTrigger: number;
  setMapPanelCloseTrigger: React.Dispatch<React.SetStateAction<number>>;
  allPois: PoiMapItem[];
  setAllPois: React.Dispatch<React.SetStateAction<PoiMapItem[]>>;
  hoveredPoiId: string | null;
  setHoveredPoiId: (id: string | null) => void;
  onSearchNavigate: (params: Record<string, string>) => void;
  onBusinessSelect: (bizId: string) => void;
  onPanelOpenChange?: (open: boolean) => void;
  userCoords?: { lat: number; lng: number } | null;
}

const PoiTabContent = ({
  selectedCity,
  detectedCity,
  language,
  hasKnownLocation,
  isSubDesktop,
  hidePoiMap,
  setHidePoiMap,
  setShowMobileMap,
  mapCenterForResults,
  citiesWithPriority,
  voiceStatus,
  mapPanelCloseTrigger,
  setMapPanelCloseTrigger,
  allPois,
  setAllPois,
  hoveredPoiId,
  setHoveredPoiId,
  onSearchNavigate,
  onBusinessSelect,
  onPanelOpenChange,
  userCoords,
}: PoiTabContentProps) => {
  const poiCity = selectedCity && selectedCity !== "all" ? selectedCity : detectedCity;

  const LABELS = {
    fr: {
      attractions: "Attractions",
      allAttractions: "Toutes les attractions",
      proximity: "À proximité",
      allDistances: "Toutes distances",
      lt500m: "Moins de 500 m", lt1km: "Moins de 1 km", lt5km: "Moins de 5 km", lt10km: "Moins de 10 km",
    },
    en: {
      attractions: "Attractions",
      allAttractions: "All attractions",
      proximity: "Nearby",
      allDistances: "All distances",
      lt500m: "Under 500 m", lt1km: "Under 1 km", lt5km: "Under 5 km", lt10km: "Under 10 km",
    },
    ar: {
      attractions: "معالم",
      allAttractions: "كل المعالم",
      proximity: "بالقرب",
      allDistances: "كل المسافات",
      lt500m: "أقل من 500 م", lt1km: "أقل من 1 كم", lt5km: "أقل من 5 كم", lt10km: "أقل من 10 كم",
    },
  };
  const L = LABELS[language as keyof typeof LABELS] ?? LABELS.fr;
  const { translateSubcategory } = useTaxonomyTranslations();

  const [poiSelectedBusinessId, setPoiSelectedBusinessId] = useState<string | null>(null);
  useEffect(() => { onPanelOpenChange?.(!!poiSelectedBusinessId); }, [poiSelectedBusinessId, onPanelOpenChange]);
  const [poiPanelExpanded, setPoiPanelExpanded] = useState(false);
  const [poiSubcat, setPoiSubcat] = useState<string | null>(null);
  const [poiProximityKm, setPoiProximityKm] = useState<number | null>(null);
  useEffect(() => { setPoiSubcat(null); setPoiProximityKm(null); }, [poiCity]);

  const subcatCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of allPois) {
      const subs = (p as any).subcategories as string[] | null | undefined;
      const k = (subs?.[0] ?? "").trim();
      if (!k) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [allPois]);

  const proxOpts = useMemo(
    () => [
      { km: 0.5, label: L.lt500m },
      { km: 1, label: L.lt1km },
      { km: 5, label: L.lt5km },
      { km: 10, label: L.lt10km },
    ],
    [L]
  );
  const proxCountsByKm = useMemo(() => {
    const counts: Record<number, number> = { 0.5: 0, 1: 0, 5: 0, 10: 0 };
    if (!userCoords) return counts;
    for (const p of allPois) {
      if (p.latitude == null || p.longitude == null) continue;
      const d = haversineKm(userCoords.lat, userCoords.lng, p.latitude, p.longitude);
      if (d <= 0.5) counts[0.5]++;
      if (d <= 1) counts[1]++;
      if (d <= 5) counts[5]++;
      if (d <= 10) counts[10]++;
    }
    return counts;
  }, [allPois, userCoords]);
  const proxHasAny = !!userCoords && (proxCountsByKm[10] ?? 0) > 0;
  const proxActiveOpt = proxOpts.find(o => o.km === poiProximityKm);
  const proximityActive = !!(userCoords && poiProximityKm);

  const filteredPois = useMemo(() => {
    let list = allPois;
    if (poiSubcat) {
      list = list.filter((p) => ((p as any).subcategories as string[] | null | undefined)?.[0] === poiSubcat);
    }
    if (userCoords && poiProximityKm) {
      list = list.filter((p) => {
        if (p.latitude == null || p.longitude == null) return false;
        return haversineKm(userCoords.lat, userCoords.lng, p.latitude, p.longitude) <= poiProximityKm;
      });
    }
    return list;
  }, [allPois, poiSubcat, poiProximityKm, userCoords]);

  const [poiMapBusiness, setPoiMapBusiness] = useState<{
    name: string;
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    google_maps_url: string | null;
    id: string;
  } | null>(null);

  return (
    <div className="flex">
      <section
        className={`pb-0 lg:pb-0 bg-transparent transition-all duration-300 ${
          poiSelectedBusinessId || poiMapBusiness
            ? "w-1/2"
            : hasKnownLocation && !hidePoiMap
            ? "w-1/2"
            : "w-full"
        }`}
      >
        <div className="pt-4 mx-auto px-4 max-w-full">
          {/* Sticky bar for POI — Carte badge only (mobile/tablet) + desktop spacer */}
          <div
            className="sticky z-[19] bg-transparent flex items-center justify-center px-4 gap-2 relative py-4 sm:py-4 lg:py-1.5 lg:hidden"
            style={{ top: "53px" }}
          >
            {isSubDesktop && (
              <button
                onClick={() => setShowMobileMap(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium shadow-lg hover:bg-foreground/90 transition-colors"
              >
                <MapIcon className="h-4 w-4" />
                {language === "en" ? "Map" : language === "ar" ? "خريطة" : "Carte"}
              </button>
            )}
          </div>
          <PoiSection
            city={poiCity}
            language={language}
            onBusinessClick={(bizId) => {
              setPoiMapBusiness(null);
              setPoiSelectedBusinessId(bizId);
              setMapPanelCloseTrigger((n) => n + 1);
            }}
            columns={hasKnownLocation && !hidePoiMap ? 2 : undefined}
            onMapClick={
              hasKnownLocation
                ? (biz) => {
                    setHoveredPoiId(biz.id);
                  }
                : (biz) => {
                    setPoiSelectedBusinessId(null);
                    setPoiMapBusiness({
                      id: biz.id,
                      name: biz.name,
                      latitude: biz.latitude,
                      longitude: biz.longitude,
                      address: biz.address,
                      google_maps_url: biz.google_maps_url,
                    });
                  }
            }
            onPoisLoaded={(loadedPois) =>
              setAllPois(
                loadedPois.map((p) => {
                  const avgOn20 = (p as any).computed_rating ?? p.rating ?? null;
                  const totalReviews = (p as any).total_review_count ?? 0;
                  return {
                    id: p.id,
                    name: p.name,
                    latitude: p.latitude,
                    longitude: p.longitude,
                    images: p.images,
                    city: p.city,
                    neighborhood: p.neighborhood,
                    avgOn20,
                    totalReviews,
                    subcategories: p.categories ?? null,
                  };
                })
              )
            }
            onHover={setHoveredPoiId}
            userCoords={userCoords}
          />
          {allPois.length > 0 && <div className="mb-0" />}
        </div>
      </section>

      {/* Sticky map for POI — shown when location known and no panel open */}
      {hasKnownLocation && !poiSelectedBusinessId && !poiMapBusiness && !hidePoiMap && (
        <div className="w-1/2 sticky top-0 h-screen z-[50] relative overflow-hidden">
          <button
            onClick={() => setHidePoiMap(true)}
            className="absolute top-3 left-3 z-[60] w-8 h-8 flex items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-white/90 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <PoiGoogleMap
            pois={filteredPois}
            selectedPoiId={null}
            hoveredPoiId={hoveredPoiId || null}
            onPoiClick={(poiId) => {
              setPoiMapBusiness(null);
              setPoiSelectedBusinessId(poiId);
            }}
            center={mapCenterForResults}
            fitToMarkers
            userLocation={userCoords ?? null}
            userMarkerLabel={mapLabel("youAreHere", language)}
          />
          {(subcatCounts.length > 0 || !!userCoords) && (
            <div className="absolute top-[64px] left-1/2 -translate-x-1/2 z-[60] flex flex-wrap items-center justify-center gap-2">
              {subcatCounts.length > 0 && (
                <div className="inline-flex rounded-full bg-black/60 backdrop-blur-sm p-0.5 text-[11px] font-semibold uppercase tracking-wider" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${poiSubcat ? "bg-[#3B3B3B] text-white" : "text-white/90 hover:text-white"}`}
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        {poiSubcat ? translateSubcategory(poiSubcat, language) : L.attractions}
                        {poiSubcat && <span className="ml-0.5 opacity-70">{filteredPois.length}</span>}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="z-[210] max-h-80 overflow-y-auto">
                      {poiSubcat && (
                        <DropdownMenuItem onSelect={() => setPoiSubcat(null)}>
                          {L.allAttractions} <span className="ml-1 opacity-60">({allPois.length})</span>
                        </DropdownMenuItem>
                      )}
                      {subcatCounts.map(([name, count]) => (
                        <DropdownMenuItem key={name} onSelect={() => setPoiSubcat(name)}>
                          {translateSubcategory(name, language)} <span className="ml-1 opacity-60">({count})</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              {!!userCoords && (
                <div className="inline-flex rounded-full bg-black/60 backdrop-blur-sm p-0.5 text-[11px] font-semibold uppercase tracking-wider" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${proximityActive ? "bg-[#3B3B3B] text-white" : "text-white/90 hover:text-white"}`}
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        {proxActiveOpt ? proxActiveOpt.label : L.proximity}
                        {proximityActive && (
                          <span className="ml-0.5 opacity-70">{proxCountsByKm[poiProximityKm!] ?? 0}</span>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="z-[210]">
                      {poiProximityKm != null && (
                        <DropdownMenuItem onSelect={() => setPoiProximityKm(null)}>
                          {L.allDistances}
                        </DropdownMenuItem>
                      )}
                      {proxOpts.map(o => {
                        const count = proxCountsByKm[o.km] ?? 0;
                        const disabled = count === 0;
                        return (
                          <DropdownMenuItem
                            key={o.km}
                            disabled={disabled}
                            onSelect={(e) => {
                              if (disabled) { e.preventDefault(); return; }
                              setPoiProximityKm(o.km);
                            }}
                            className={disabled ? "opacity-40 pointer-events-none" : ""}
                          >
                            {o.label} <span className="ml-1 opacity-60">({count})</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          )}
          <PanelSearchBar
            onSearch={onSearchNavigate}
            onBusinessSelect={onBusinessSelect}
            onAiClick={() => window.dispatchEvent(new Event("open-ai-tab"))}
            closeTrigger={mapPanelCloseTrigger}
            noToolbarOffset
            solidBackground
          />
        </div>
      )}

      {/* Backdrop when expanded */}
      {poiSelectedBusinessId && poiPanelExpanded && (
        <div
          className="fixed inset-0 top-[53px] z-[39] bg-black/40 backdrop-blur-[2px]"
          style={{ opacity: 0, animation: "panelFadeIn 0.2s ease-out 0.1s forwards" }}
          onClick={() => setPoiPanelExpanded(false)}
        />
      )}

      {/* Business detail panel */}
      {poiSelectedBusinessId && (
        <div
          className={`fixed top-0 left-0 right-0 bottom-0 z-40 bg-background shadow-2xl overflow-hidden flex flex-col animate-slide-in-right lg:left-auto lg:bottom-auto lg:border-l lg:border-border lg:transition-[width] lg:duration-300 lg:ease-out ${
            poiPanelExpanded
              ? "lg:w-full border-l-2 border-border shadow-[-8px_0_30px_-5px_rgba(0,0,0,0.15)]"
              : "lg:w-1/2"
          }`}
          style={{ height: isSubDesktop ? undefined : "100vh" }}
        >
          <SlidePanelHeader
            onClose={() => {
              setPoiSelectedBusinessId(null);
              setPoiPanelExpanded(false);
            }}
            alwaysDark
          />
          <div className="flex-1 min-h-0 overflow-visible">
            {(() => {
              const idx = allPois.findIndex((p) => p.id === poiSelectedBusinessId);
              return (
                <BookOnlineSlidePanel
                  businessId={poiSelectedBusinessId}
                  onClose={() => {
                    setPoiSelectedBusinessId(null);
                    setPoiPanelExpanded(false);
                  }}
                  forceMuted={voiceStatus === "recording" || voiceStatus === "processing"}
                  showSearchBar={true}
                  onSearch={onSearchNavigate}
                  onSearchBusinessSelect={onBusinessSelect}
                  onPrevBusiness={() => {
                    if (idx > 0) setPoiSelectedBusinessId(allPois[idx - 1].id);
                  }}
                  onNextBusiness={() => {
                    if (idx >= 0 && idx < allPois.length - 1) setPoiSelectedBusinessId(allPois[idx + 1].id);
                  }}
                  hasPrevBusiness={idx > 0}
                  hasNextBusiness={idx >= 0 && idx < allPois.length - 1}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* Map panel for individual POI */}
      {poiMapBusiness && (
        <div
          className="fixed top-0 left-0 right-0 z-40 bg-background shadow-2xl overflow-hidden flex flex-col animate-slide-up-from-bottom lg:w-1/2 lg:left-auto lg:border-l lg:border-border"
          style={{ height: "100vh" }}
        >
          <SlidePanelHeader
            onClose={() => setPoiMapBusiness(null)}
            centerContent={poiMapBusiness.name}
          />
          <div className="flex-1 min-h-0">
            <PoiGoogleMap
              pois={allPois}
              selectedPoiId={poiMapBusiness.id}
              center={(() => {
                const city = citiesWithPriority.find((c) => c.name === (selectedCity && selectedCity !== "all" ? selectedCity : undefined));
                if (city?.latitude && city?.longitude) return { lat: city.latitude, lng: city.longitude };
                return undefined;
              })()}
              fitToMarkers
              onPoiClick={(poiId) => {
                const poi = allPois.find((p) => p.id === poiId);
                if (poi)
                  setPoiMapBusiness({
                    id: poi.id,
                    name: poi.name,
                    latitude: poi.latitude,
                    longitude: poi.longitude,
                    address: null,
                    google_maps_url: null,
                  });
              }}
              userLocation={userCoords ?? null}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PoiTabContent;
