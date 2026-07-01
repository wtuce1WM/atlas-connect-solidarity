import { useEffect, useRef, useState } from "react";
import { Map, X } from "lucide-react";
import DestinationSection, { type DestinationItem } from "@/components/DestinationSection";
import DestinationSlidePanel from "@/components/DestinationSlidePanel";
import PoiGoogleMap from "@/components/PoiGoogleMap";
import type { PoiMapItem } from "@/components/PoiGoogleMap";
import BookOnlineSlidePanel from "@/components/BookOnlineSlidePanel";
import SlidePanelHeader from "@/components/SlidePanelHeader";
import PanelSearchBar from "@/components/PanelSearchBar";
import { mapLabel } from "@/lib/mapLabels";

interface DestinationsTabContentProps {
  selectedCity: string;
  detectedCity: string | null;
  language: string;
  hasKnownLocation: boolean;
  isSubDesktop: boolean;
  hideDestMap: boolean;
  setHideDestMap: (v: boolean) => void;
  setShowMobileMap: (v: boolean) => void;
  mapCenterForResults?: { lat: number; lng: number };
  citiesWithPriority: { name: string; priority: number; id?: string; latitude?: number | null; longitude?: number | null }[];
  voiceStatus: string;
  mapPanelCloseTrigger: number;
  setMapPanelCloseTrigger: React.Dispatch<React.SetStateAction<number>>;
  allDests: PoiMapItem[];
  setAllDests: React.Dispatch<React.SetStateAction<PoiMapItem[]>>;
  allDestItems: DestinationItem[];
  setAllDestItems: React.Dispatch<React.SetStateAction<DestinationItem[]>>;
  hoveredDestId: string | null;
  setHoveredDestId: (id: string | null) => void;
  onSearchNavigate: (params: Record<string, string>) => void;
  onBusinessSelect: (bizId: string) => void;
  userCoords?: { lat: number; lng: number } | null;
  openDestinationId?: string | null;
}

const DestinationsTabContent = ({
  selectedCity,
  detectedCity,
  language,
  hasKnownLocation,
  isSubDesktop,
  hideDestMap,
  setHideDestMap,
  setShowMobileMap,
  mapCenterForResults,
  citiesWithPriority,
  voiceStatus,
  mapPanelCloseTrigger,
  setMapPanelCloseTrigger,
  allDests,
  setAllDests,
  allDestItems,
  setAllDestItems,
  hoveredDestId,
  setHoveredDestId,
  onSearchNavigate,
  onBusinessSelect,
  userCoords,
  openDestinationId,
}: DestinationsTabContentProps) => {
  const destCity = selectedCity && selectedCity !== "all" ? selectedCity : detectedCity;

  const [selectedDestination, setSelectedDestination] = useState<DestinationItem | null>(null);
  const [destSelectedBusinessId, setDestSelectedBusinessId] = useState<string | null>(null);
  const [destPanelExpanded, setDestPanelExpanded] = useState(false);
  const [destMapItem, setDestMapItem] = useState<{
    id: string;
    name_fr: string;
    latitude: number | null;
    longitude: number | null;
  } | null>(null);

  // Auto-open destination panel when URL param ?openDestination=<id> is set
  const lastOpenedRef = useRef<string | null>(null);
  useEffect(() => {
    if (openDestinationId && lastOpenedRef.current !== openDestinationId) {
      lastOpenedRef.current = openDestinationId;
      setSelectedDestination({ id: openDestinationId } as DestinationItem);
      setDestMapItem(null);
    }
  }, [openDestinationId]);

  const hasRightPanel = !!destMapItem || !!selectedDestination;

  return (
    <div className="flex">
      <section
        className={`pb-0 lg:pb-0 bg-transparent transition-all duration-300 ${
          hasRightPanel ? "w-1/2" : hasKnownLocation && !hideDestMap ? "w-1/2" : "w-full"
        }`}
      >
        <div className="pt-4 mx-auto px-4 max-w-full">
          {/* Sticky bar for Destinations — Carte badge only (mobile/tablet) */}
          <div
            className="sticky z-[19] bg-transparent flex items-center justify-center px-4 gap-2 relative py-4 sm:py-4 lg:py-1.5 lg:hidden"
            style={{ top: "53px" }}
          >
            {isSubDesktop && (
              <button
                onClick={() => setShowMobileMap(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium shadow-lg hover:bg-foreground/90 transition-colors"
              >
                <Map className="h-4 w-4" />
                {language === "en" ? "Map" : language === "ar" ? "خريطة" : "Carte"}
              </button>
            )}
          </div>

          <DestinationSection
            city={destCity}
            language={language}
            columns={hasKnownLocation && !hideDestMap ? 2 : undefined}
            onDestinationClick={(destId) => {
              const dest = allDestItems.find((d) => d.id === destId);
              if (dest) {
                setSelectedDestination(dest);
                setDestMapItem(null);
                setMapPanelCloseTrigger((n) => n + 1);
              }
            }}
            onMapClick={
              hasKnownLocation
                ? (dest) => {
                    setHoveredDestId(dest.id);
                  }
                : (dest) => {
                    setDestMapItem(dest);
                    setSelectedDestination(null);
                    setAllDests((prev) => prev);
                  }
            }
            onDestinationsLoaded={(dests) => {
              setAllDestItems(dests);
              setAllDests(
                dests.map((d) => ({
                  id: d.id,
                  name: d.name_fr,
                  latitude: d.latitude,
                  longitude: d.longitude,
                  images:
                    d.images && d.images.length > 0
                      ? d.images
                      : d.image_url
                      ? [d.image_url]
                      : null,
                }))
              );
            }}
            onHover={setHoveredDestId}
          />
          {allDestItems.length > 0 && <div className="mb-0" />}
        </div>
      </section>

      {/* Sticky map for Destinations */}
      {hasKnownLocation && !hasRightPanel && !hideDestMap && (
        <div className="w-1/2 sticky top-0 h-screen z-[50] relative overflow-hidden">
          <button
            onClick={() => setHideDestMap(true)}
            className="absolute top-3 left-3 z-[60] w-8 h-8 flex items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-white/90 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <PoiGoogleMap
            pois={allDests}
            selectedPoiId={null}
            hoveredPoiId={hoveredDestId || null}
            onPoiClick={(id) => {
              const dest = allDestItems.find((d) => d.id === id);
              if (dest) {
                setSelectedDestination(dest);
                setDestMapItem(null);
              }
            }}
            center={mapCenterForResults}
            fitToMarkers
            userLocation={userCoords ?? null}
            userMarkerLabel={mapLabel("youAreHere", language)}
          />
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

      {/* Destination immersive panel */}
      {selectedDestination && (() => {
        const idx = allDestItems.findIndex((d) => d.id === selectedDestination.id);
        const hasPrev = idx > 0;
        const hasNext = idx >= 0 && idx < allDestItems.length - 1;
        return (
          <div
            className="fixed top-0 left-0 right-0 z-[220] bg-background shadow-2xl overflow-hidden flex flex-col animate-slide-in-right lg:left-auto lg:w-1/2 lg:border-l lg:border-border"
            style={{ height: "100dvh" }}
          >
            <DestinationSlidePanel
              destinationId={selectedDestination.id}
              onClose={() => setSelectedDestination(null)}
              slideFrom="right"
              showSearchBar
              onSearch={onSearchNavigate}
              onSearchBusinessSelect={onBusinessSelect}
              hasPrevDestination={hasPrev}
              hasNextDestination={hasNext}
              onPrevDestination={hasPrev ? () => setSelectedDestination(allDestItems[idx - 1]) : undefined}
              onNextDestination={hasNext ? () => setSelectedDestination(allDestItems[idx + 1]) : undefined}
            />
          </div>
        );
      })()}

      {/* Backdrop for mobile */}
      {destSelectedBusinessId && isSubDesktop && (
        <div className="fixed inset-0 z-[39] bg-background" />
      )}

      {/* Business detail panel */}
      {destSelectedBusinessId && (
        <div
          className={`fixed top-0 left-0 right-0 z-[220] bg-background shadow-2xl overflow-visible flex flex-col animate-slide-in-right lg:left-auto lg:border-l lg:border-border lg:transition-[width] lg:duration-300 lg:ease-out ${
            destPanelExpanded ? "lg:w-full" : "lg:w-1/2"
          }`}
          style={{ height: "100dvh" }}
        >
           <div className="flex-1 min-h-0 overflow-visible">
            <BookOnlineSlidePanel
              businessId={destSelectedBusinessId}
              onClose={() => {
                setDestSelectedBusinessId(null);
                setDestPanelExpanded(false);
              }}
              forceMuted={voiceStatus === "recording" || voiceStatus === "processing"}
            />
          </div>
        </div>
      )}

      {/* Map panel for individual destination */}
      {destMapItem && !selectedDestination && (
        <div
          className="fixed top-0 left-0 right-0 z-40 bg-background shadow-2xl overflow-hidden flex flex-col animate-slide-up-from-bottom lg:w-1/2 lg:left-auto lg:border-l lg:border-border"
          style={{ height: "100dvh" }}
        >
          <SlidePanelHeader
            onClose={() => setDestMapItem(null)}
            centerContent={destMapItem.name_fr}
          />
          <div className="flex-1 min-h-0">
            <PoiGoogleMap
              pois={allDests}
              selectedPoiId={destMapItem.id}
              center={(() => {
                if (destMapItem.latitude && destMapItem.longitude)
                  return { lat: destMapItem.latitude, lng: destMapItem.longitude };
                const city = citiesWithPriority.find((c) => c.name === selectedCity);
                if (city?.latitude && city?.longitude) return { lat: city.latitude, lng: city.longitude };
                return undefined;
              })()}
              fitToMarkers
              onPoiClick={(id) => {
                const d = allDests.find((p) => p.id === id);
                if (d) {
                  setDestMapItem((prev) =>
                    prev
                      ? { ...prev, id: d.id, name_fr: d.name, latitude: d.latitude, longitude: d.longitude }
                      : prev
                  );
                }
              }}
              userLocation={userCoords ?? null}
              userMarkerLabel={mapLabel("youAreHere", language)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DestinationsTabContent;
