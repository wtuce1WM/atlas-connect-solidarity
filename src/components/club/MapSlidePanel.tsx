import { useEffect, useMemo } from "react";
import { X, MapPin } from "lucide-react";
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
}

interface MapSlidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  businesses: MapPanelBusiness[];
  isMobile?: boolean;
}

// Approximate centers for known Moroccan cities (mirrors /search behavior).
const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  marrakech: { lat: 31.6295, lng: -7.9811 },
  essaouira: { lat: 31.5085, lng: -9.7595 },
  agafay: { lat: 31.4500, lng: -8.1500 },
  casablanca: { lat: 33.5731, lng: -7.5898 },
  rabat: { lat: 34.0209, lng: -6.8416 },
  fes: { lat: 34.0181, lng: -5.0078 },
  fès: { lat: 34.0181, lng: -5.0078 },
  tanger: { lat: 35.7595, lng: -5.8340 },
  agadir: { lat: 30.4278, lng: -9.5981 },
  ouarzazate: { lat: 30.9189, lng: -6.8934 },
  chefchaouen: { lat: 35.1689, lng: -5.2636 },
};

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const MapSlidePanel = ({ open, onClose, title, businesses, isMobile }: MapSlidePanelProps) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const mapBusinesses = useMemo(() => businesses
    .filter((b) => b.latitude != null && b.longitude != null)
    .filter((b) => {
      const engs: string[] = b.engagements || [];
      const isWebOnly = engs.some((e: string) => {
        const n = e.toLowerCase().trim();
        return n === "web only" || n === "logistique:web only" || n.endsWith(":web only");
      });
      return !isWebOnly;
    })
    .map((b) => ({
      id: b.id,
      name: b.name,
      city: b.city || "",
      address: b.address ?? null,
      phone: b.phone ?? null,
      whatsapp: b.whatsapp ?? null,
      main_category: b.main_category ?? null,
      categories: b.categories ?? null,
      latitude: b.latitude,
      longitude: b.longitude,
      wtuce_status: b.wtuce_status ?? null,
      logo_url: b.logo_url ?? null,
      neighborhood: b.neighborhood ?? null,
      images: b.images ?? null,
      hook_fr: b.hook_fr ?? null,
      google_rating: b.google_rating ?? null,
      google_review_count: b.google_review_count ?? null,
      tripadvisor_rating: b.tripadvisor_rating ?? null,
      tripadvisor_review_count: b.tripadvisor_review_count ?? null,
    })), [businesses]);

  // Compute a city center when all (or majority) of businesses share the same city.
  const cityCenter = useMemo(() => {
    if (!mapBusinesses.length) return null;
    const counts = new Map<string, number>();
    for (const b of mapBusinesses) {
      if (!b.city) continue;
      const key = normalize(b.city);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    if (!counts.size) return null;
    const [dominant] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    return CITY_CENTERS[dominant] || null;
  }, [mapBusinesses]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[80]"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`fixed z-[81] bg-[#ECD6B8] shadow-2xl flex flex-col
          ${isMobile
            ? "inset-0"
            : "top-0 right-0 h-full w-full max-w-[640px] rounded-l-2xl"}`}
      >
        <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/40">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="h-4 w-4 text-[#C04F17] shrink-0" />
            <div className="text-sm font-semibold text-[#C04F17] truncate">
              {title || `${mapBusinesses.length} lieux sur la carte`}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-white/60 text-[#C04F17]"
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 min-h-0 p-2 md:p-3 [&>div]:h-full">
          {mapBusinesses.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-[#C04F17]/70 p-6 text-center">
              Aucune coordonnée disponible pour ces établissements.
            </div>
          ) : (
            <BusinessMap
              businesses={mapBusinesses as any}
              height="100%"
              forceOverview={!cityCenter}
              cityCenter={cityCenter}
              onBusinessClick={(b: any) => {
                const slug = businesses.find((x) => x.id === b.id)?.slug;
                if (slug) window.open(`/b/${slug}`, "_blank", "noopener,noreferrer");
              }}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default MapSlidePanel;
