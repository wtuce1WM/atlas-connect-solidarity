import { useEffect, useMemo, useState } from "react";
import { X, Share2, Bookmark, BookmarkCheck } from "lucide-react";
import BusinessMap from "@/components/BusinessMap";

export interface MapPanelBusiness {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  main_category?: string | null;
  categories?: string[] | null;
  latitude: number | null;
  longitude: number | null;
  wtuce_status?: string | null;
  logo_url?: string | null;
  images?: string[] | null;
  hook_fr?: string | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  tripadvisor_rating?: number | null;
  tripadvisor_review_count?: number | null;
  engagements?: string[] | null;
  computed_rating?: number | null;
  total_review_count?: number | null;
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

  const cityCenter = useMemo(() => {
    if (!mapBusinesses.length) return null;
    const counts = new Map<string, number>();
    for (const b of mapBusinesses) {
      if (!b.city) continue;
      counts.set(normalize(b.city), (counts.get(normalize(b.city)) || 0) + 1);
    }
    if (!counts.size) return null;
    const [dominant] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    return CITY_CENTERS[dominant] || null;
  }, [mapBusinesses]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[80]" onClick={onClose} />
      <div
        className={`fixed z-[81] bg-[#ECD6B8] shadow-2xl overflow-hidden flex flex-col
          ${isMobile ? "inset-0" : "top-0 right-0 h-full w-full max-w-[640px] rounded-l-2xl"}`}
      >
        {/* Toolbar: close left, title center, share+bookmark right */}
        <div className="shrink-0 flex items-center justify-between px-3 py-2 bg-[#ECD6B8] border-b border-[#C04F17]/15 z-10">
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-white text-[#C04F17] shadow hover:bg-white/90"
            title="Fermer"
            aria-label="Fermer la carte"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex-1 px-3 truncate text-center text-xs font-semibold text-[#C04F17]">
            {title || `${mapBusinesses.length} lieux sur la carte`}
          </div>

          <div className="flex items-center gap-2">
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="h-9 w-9 flex items-center justify-center rounded-full bg-white text-[#C04F17] shadow hover:bg-white/90"
                title="Partager"
                aria-label="Partager la conversation"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
            {onBookmark && (
              <button
                type="button"
                onClick={onBookmark}
                className="h-9 w-9 flex items-center justify-center rounded-full bg-white text-[#C04F17] shadow hover:bg-white/90"
                title={isBookmarked ? "Retirer le bookmark" : "Bookmarker"}
                aria-label="Bookmark"
              >
                {isBookmarked ? <BookmarkCheck className="h-4 w-4" fill="currentColor" /> : <Bookmark className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Map — fills remaining space; force inner shell to 100% height */}
        <div className="flex-1 relative [&>div]:h-full [&>div]:rounded-none [&>div]:border-0 [&>div>div:last-child]:!h-full">
          <BusinessMap
            businesses={mapBusinesses as any}
            isLoading={false}
            height="100%"
            cityCenter={cityCenter || userPos}
            neighborhoodCenter={null}
            forceOverview={!cityCenter && !userPos}
            center={userPos || undefined}
          />
        </div>
      </div>
    </>
  );
};

export default MapSlidePanel;
