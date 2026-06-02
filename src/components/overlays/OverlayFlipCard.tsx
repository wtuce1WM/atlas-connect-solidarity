import React, { Suspense, useMemo } from "react";
import { Star, Quote } from "lucide-react";
import { ChevronLeft, ChevronDown, ChevronUp, Map as MapIcon } from "lucide-react";
import { LazyPoiGoogleMap } from "./LazyOverlays";
import type { PoiMapItem } from "@/components/PoiGoogleMap";
import { GOLD } from "@/lib/overlayConstants";
import DynamicIcon from "@/components/DynamicIcon";

export interface HighlightItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  image_url: string | null;
  sort_order: number;
}

interface FlipCardProps {
  flipped: boolean;
  onFlip: () => void;
  onUnflip: () => void;
  /** Name displayed in the card header (uppercase Josefin Sans) */
  name: string;
  /** Optional hook text below the name */
  hook?: string | null;
  /** HTML description content — collapsible */
  description?: string | null;
  descExpanded?: boolean;
  onToggleDesc?: () => void;
  /** Map markers for the back face */
  mapMarkers: PoiMapItem[];
  /** The selected marker (gold) on the back face */
  selectedMarkerId: string;
  /** Center coordinates for the back face map */
  selectedLat?: number | null;
  selectedLng?: number | null;
  /** Back face header label */
  backLabel: string;
  /** Whether to show the map toggle button */
  showMapButton?: boolean;
  /** Optional default review to display */
  defaultReview?: { author_name: string; text: string; rating: number; source: string } | null;
  /** Optional highlights displayed at the bottom of the expanded description */
  highlights?: HighlightItem[];
  highlightsSectionTitle?: string | null;
  highlightsSectionIntro?: string | null;
}

const OverlayFlipCard = ({
  flipped, onFlip, onUnflip,
  name, hook, description, descExpanded, onToggleDesc,
  mapMarkers, selectedMarkerId, selectedLat, selectedLng,
  backLabel, showMapButton = true, defaultReview,
  highlights, highlightsSectionTitle, highlightsSectionIntro,
}: FlipCardProps) => {
  const visibleHighlights = useMemo(
    () => (highlights || []).filter(h => (h.title?.trim() || h.description?.trim())),
    [highlights]
  );
  const pois = useMemo(() => {
    const selected = selectedLat && selectedLng ? [{
      id: selectedMarkerId, name, latitude: selectedLat, longitude: selectedLng,
      city: null, neighborhood: null, images: null,
      markerColor: GOLD,
    }] : [];
    return [...selected, ...mapMarkers.filter(m => m.id !== selectedMarkerId)];
  }, [selectedMarkerId, selectedLat, selectedLng, name, mapMarkers]);

  const center = useMemo(
    () => selectedLat && selectedLng ? { lat: selectedLat, lng: selectedLng } : undefined,
    [selectedLat, selectedLng]
  );

  return (
    <div className="flex-1 flex items-start justify-center overflow-hidden min-h-0" style={{ perspective: "1200px" }}>
      <div
        className={`w-[95%] md:w-[90%] lg:w-[85%] relative ${flipped ? "h-[calc(100%-2rem)]" : "max-h-full"}`}
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* FRONT — Description */}
        <div
          className="rounded-2xl bg-black/40 backdrop-blur-sm p-4 md:p-6 flex h-full min-h-0 flex-col gap-5 text-white"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold uppercase truncate drop-shadow-lg min-w-0 flex-1" style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '0.12em', WebkitTextStroke: '0.8px currentColor', textShadow: '0 0 0 currentColor' }}>{name}</h2>
              <div className="flex items-center gap-2 shrink-0">
                {showMapButton && mapMarkers.length > 0 && (
                  <button
                    onClick={onFlip}
                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                    aria-label="Voir la carte"
                    title="Voir sur la carte"
                  >
                    <MapIcon className="h-4 w-4" />
                  </button>
                )}
                {description && onToggleDesc && (
                  <button
                    onClick={onToggleDesc}
                    className="shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                    aria-label={descExpanded ? "Replier" : "Déplier"}
                  >
                    {descExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
            {hook && (
              <p className="text-sm md:text-lg leading-relaxed tracking-[0.02em] text-white/90 line-clamp-2" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>{hook}</p>
            )}
          </div>

          {description && descExpanded && onToggleDesc && (
            <div className="min-h-0 overflow-y-auto overscroll-contain pr-2" style={{ maxHeight: "min(35vh, 280px)" }}>
              <div
                className="prose prose-invert prose-sm max-w-none break-words text-sm leading-relaxed font-['Roboto',sans-serif] prose-josefin-headings card1-headings [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white [&_ul]:list-disc [&_li::marker]:text-gold [&_h2]:!font-bold [&_h3]:!font-bold"
                dangerouslySetInnerHTML={{ __html: description }}
              />

              {visibleHighlights.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  {(highlightsSectionTitle || highlightsSectionIntro) && (
                    <div className="mb-4">
                      {highlightsSectionTitle && (
                        <h3
                          className="text-base font-bold uppercase tracking-[0.12em] text-white mb-2"
                          style={{ fontFamily: "'Josefin Sans', sans-serif" }}
                        >
                          {highlightsSectionTitle}
                        </h3>
                      )}
                      {highlightsSectionIntro && (
                        <p className="text-sm text-white/80 leading-relaxed font-['Roboto',sans-serif]">
                          {highlightsSectionIntro}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {visibleHighlights.map((h) => (
                      <div
                        key={h.id}
                        className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm p-3 flex flex-col gap-2"
                      >
                        {h.image_url && (
                          <div className="w-full h-24 rounded-lg overflow-hidden bg-white/5">
                            <img src={h.image_url} alt={h.title} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <DynamicIcon name={h.icon} className="h-4 w-4 text-primary shrink-0" />
                          {h.title && (
                            <h4
                              className="text-xs font-bold uppercase tracking-[0.1em] text-white"
                              style={{ fontFamily: "'Josefin Sans', sans-serif", WebkitTextStroke: '0.6px currentColor', textShadow: '0 0 0 currentColor' }}
                            >
                              {h.title}
                            </h4>
                          )}
                        </div>
                        {h.description && (
                          <p className="text-xs text-white/80 leading-relaxed font-['Roboto',sans-serif]">
                            {h.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {defaultReview && (
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Quote className="h-4 w-4 text-gold shrink-0 rotate-180" />
                <span className="text-xs font-semibold text-white/90 truncate">{defaultReview.author_name}</span>
                <div className="flex items-center gap-0.5 ml-auto shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3 w-3 ${i < defaultReview.rating ? "text-gold fill-gold" : "text-white/30"}`} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-white/80 leading-relaxed line-clamp-3 italic">{defaultReview.text}</p>
              <span className="text-[10px] text-white/50">{defaultReview.source}</span>
            </div>
          )}
        </div>

        {/* BACK — Google Map */}
        <div
          className="absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-sm overflow-hidden flex flex-col"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex items-center gap-3 p-4 text-white">
            <button
              onClick={onUnflip}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              aria-label="Retourner"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="text-sm font-semibold truncate">{backLabel}</h3>
          </div>
          <div className="flex-1 min-h-0">
            {flipped && pois.length > 0 && (
              <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}>
                <LazyPoiGoogleMap
                  pois={pois}
                  selectedPoiId={selectedMarkerId}
                  highlightColor={GOLD}
                  center={center}
                  fitToMarkers
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverlayFlipCard;
