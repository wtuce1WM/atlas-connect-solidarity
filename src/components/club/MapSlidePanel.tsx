import { useEffect } from "react";
import { X, MapPin } from "lucide-react";
import BusinessMap from "@/components/BusinessMap";

export interface MapPanelBusiness {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  main_category?: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface MapSlidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  businesses: MapPanelBusiness[];
  isMobile?: boolean;
}

const MapSlidePanel = ({ open, onClose, title, businesses, isMobile }: MapSlidePanelProps) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const mapBusinesses = businesses
    .filter((b) => b.latitude != null && b.longitude != null)
    .map((b) => ({
      id: b.id,
      name: b.name,
      city: b.city || "",
      address: b.address ?? null,
      main_category: b.main_category ?? null,
      neighborhood: b.neighborhood ?? null,
      latitude: b.latitude,
      longitude: b.longitude,
    }));

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

        <div className="flex-1 min-h-0">
          {mapBusinesses.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-[#C04F17]/70 p-6 text-center">
              Aucune coordonnée disponible pour ces établissements.
            </div>
          ) : (
            <BusinessMap
              businesses={mapBusinesses as any}
              height="100%"
              forceOverview
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
