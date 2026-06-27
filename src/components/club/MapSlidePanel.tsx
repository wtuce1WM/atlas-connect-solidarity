/// <reference types="@types/google.maps" />
import { useEffect, useMemo, useState } from "react";
import { X, Share2, Bookmark, BookmarkCheck } from "lucide-react";
import PoiGoogleMap, { type PoiMapItem } from "@/components/PoiGoogleMap";

export interface MapPanelBusiness {
  id: string;
  name: string;
  slug?: string;
  city?: string | null;
  neighborhood?: string | null;
  latitude: number | null;
  longitude: number | null;
  images?: string[] | null;
  main_category?: string | null;
  categories?: string[] | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  tripadvisor_rating?: number | null;
  tripadvisor_review_count?: number | null;
  computed_rating?: number | null;
  total_review_count?: number | null;
  engagements?: string[] | null;
}

interface MapSlidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  businesses: MapPanelBusiness[];
  isMobile?: boolean;
  onShare?: () => void;
  onBookmark?: () => void;
  isBookmarked?: boolean;
}

const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  marrakech: { lat: 31.6295, lng: -7.9811 },
  essaouira: { lat: 31.5085, lng: -9.7595 },
  agafay: { lat: 31.45, lng: -8.15 },
  casablanca: { lat: 33.5731, lng: -7.5898 },
  rabat: { lat: 34.0209, lng: -6.8416 },
  fes: { lat: 34.0181, lng: -5.0078 },
  fès: { lat: 34.0181, lng: -5.0078 },
  tanger: { lat: 35.7595, lng: -5.834 },
  agadir: { lat: 30.4278, lng: -9.5981 },
  ouarzazate: { lat: 30.9189, lng: -6.8934 },
  chefchaouen: { lat: 35.1689, lng: -5.2636 },
};
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const MapSlidePanel = ({ open, onClose, title, businesses, isMobile, onShare, onBookmark, isBookmarked }: MapSlidePanelProps) => {
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || userPos || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 600000 },
    );
  }, [open, userPos]);

  const mapBusinesses = useMemo(
    () =>
      businesses
        .filter((b) => b.latitude != null && b.longitude != null)
        .filter((b) => {
          const engs: string[] = b.engagements || [];
          return !engs.some((e) => {
            const n = e.toLowerCase().trim();
            return n === "web only" || n === "logistique:web only" || n.endsWith(":web only");
          });
        }),
    [businesses],
  );

  const pois: PoiMapItem[] = useMemo(
    () =>
      mapBusinesses.map((b) => {
        const rating =
          b.computed_rating ??
          b.google_rating ??
          b.tripadvisor_rating ??
          null;
        const totalReviews =
          b.total_review_count ??
          (b.google_review_count || 0) + (b.tripadvisor_review_count || 0);
        return {
          id: b.id,
          name: b.name,
          latitude: b.latitude,
          longitude: b.longitude,
          images: b.images,
          city: b.city,
          neighborhood: b.neighborhood,
          rating,
          avgOn20: rating != null ? Math.round(rating * 4 * 10) / 10 : null,
          totalReviews,
          subcategory: b.main_category,
          subcategories: b.categories,
        };
      }),
    [mapBusinesses],
  );

  const cityCenter = useMemo(() => {
    if (!mapBusinesses.length) return undefined;
    const counts = new Map<string, number>();
    for (const b of mapBusinesses) {
      if (!b.city) continue;
      counts.set(normalize(b.city), (counts.get(normalize(b.city)) || 0) + 1);
    }
    if (!counts.size) return undefined;
    const [dominant] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    return CITY_CENTERS[dominant];
  }, [mapBusinesses]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[80]" onClick={onClose} />
      <div
        className={`fixed z-[81] bg-[#ECD6B8] shadow-2xl overflow-hidden flex flex-col
          ${isMobile ? "inset-0" : "top-0 right-0 h-full w-full max-w-[640px] rounded-l-2xl"}`}
      >
        {/* Map fills the panel; toolbar floats on top */}
        <div className="relative flex-1">
          <PoiGoogleMap
            pois={pois}
            selectedPoiId={selectedId}
            onPoiClick={(id) => setSelectedId(id)}
            center={cityCenter || userPos || undefined}
            fitToMarkers
            userLocation={userPos}
          />

          {/* Floating toolbar — same layout as /search */}
          <div className="absolute top-0 left-0 right-0 z-[80] flex flex-col pointer-events-none">
            <div className="relative h-[52px] w-full flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 left-3 z-[15] h-9 w-9 flex items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-white/90 transition-opacity pointer-events-auto"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute top-3 left-14 right-24 z-[10] flex justify-center w-[calc(100%-152px)]">
                <div
                  className="px-3 py-1.5 rounded-full bg-white/30 backdrop-blur-md text-black text-sm font-semibold truncate shadow-sm pointer-events-auto"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {title || `${mapBusinesses.length} lieux`}
                </div>
              </div>

              <div className="absolute top-3 right-3 z-[15] flex items-center gap-2 pointer-events-auto">
                {onBookmark && (
                  <button
                    type="button"
                    onClick={onBookmark}
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-white shadow-lg hover:bg-white/90"
                    aria-label="Bookmark"
                    title={isBookmarked ? "Retirer le bookmark" : "Bookmarker"}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4 text-[#6050DC]" fill="currentColor" strokeWidth={2.5} />
                    ) : (
                      <Bookmark className="h-4 w-4 text-[#6050DC]" strokeWidth={2.5} />
                    )}
                  </button>
                )}
                {onShare && (
                  <button
                    type="button"
                    onClick={onShare}
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-white/90"
                    aria-label="Partager"
                    title="Partager"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MapSlidePanel;
