import { useState, useEffect } from "react";
import { GOOGLE_MAPS_EMBED_KEY } from "@/lib/googleMapsKey";
import { X, Info } from "lucide-react";
import MapBusinessInfoCard from "@/components/MapBusinessInfoCard";

interface DirectionsOverlayProps {
  business: {
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    phone?: string | null;
    city?: string | null;
    logo_url?: string | null;
  };
  onClose: () => void;
}

const DirectionsOverlay = ({ business, onClose }: DirectionsOverlayProps) => {
  const [directionsMode, setDirectionsMode] = useState<"walking" | "driving">("walking");
  const [userOrigin, setUserOrigin] = useState<string | null>(null);
  const [showInfoCard, setShowInfoCard] = useState(true);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserOrigin(`${pos.coords.latitude},${pos.coords.longitude}`),
        () => {}
      );
    }
  }, []);

  const dest = business.latitude && business.longitude
    ? `${business.latitude},${business.longitude}`
    : encodeURIComponent(business.address || business.name);
  const destRaw = business.latitude && business.longitude
    ? `${business.latitude},${business.longitude}`
    : business.address || business.name;

  return (
    <div className="absolute inset-0 z-[60] bg-white flex flex-col">
      <div className="shrink-0 flex items-center px-4 py-2 border-b bg-white">
        <button
          onClick={onClose}
          className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-black text-white shadow-lg hover:opacity-90 transition-opacity"
          title="Fermer"
          aria-label="Fermer l'itinéraire"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center bg-muted rounded-full p-0.5">
            <button
              onClick={() => setDirectionsMode("walking")}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${directionsMode === "walking" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              🚶 À pied
            </button>
            <button
              onClick={() => setDirectionsMode("driving")}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${directionsMode === "driving" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              🚗 Voiture
            </button>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${dest}`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted transition-colors" title="Google Maps">
            <img src="https://www.gstatic.com/images/branding/product/1x/maps_48dp.png" alt="Google Maps" className="h-6 w-6 object-contain" />
          </a>
          <a href={business.latitude && business.longitude ? `https://waze.com/ul?ll=${business.latitude},${business.longitude}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(destRaw)}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted transition-colors" title="Waze">
            <img src="https://www.waze.com/favicon.ico" alt="Waze" className="h-6 w-6 object-contain" />
          </a>
          <a href={business.latitude && business.longitude ? `https://maps.apple.com/?daddr=${business.latitude},${business.longitude}&dirflg=d` : `https://maps.apple.com/?daddr=${encodeURIComponent(destRaw)}&dirflg=d`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted transition-colors" title="Apple Plans">
            <img src="https://www.apple.com/favicon.ico" alt="Apple Plans" className="h-7 w-7 object-contain" />
          </a>
        </div>
      </div>
      <div className="flex-1 relative min-h-0">
        <iframe
          src={`https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_EMBED_KEY}&origin=${userOrigin || "My+location"}&destination=${dest}&mode=${directionsMode}`}
          className="absolute inset-0 w-full h-full border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Itinéraire vers ${business.name}`}
        />
        {showInfoCard && (
          <MapBusinessInfoCard business={business} onClose={() => setShowInfoCard(false)} hideDirections hideClose />
        )}
        {!showInfoCard && (
          <button
            onClick={() => setShowInfoCard(true)}
            className="absolute top-2 left-2 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:opacity-90 transition-opacity"
            title="Infos établissement"
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default DirectionsOverlay;
