import { useState, useEffect } from "react";
import { GOOGLE_MAPS_EMBED_KEY } from "@/lib/googleMapsKey";
import { X, Info, MapPin } from "lucide-react";
import MapBusinessInfoCard from "@/components/MapBusinessInfoCard";
import { useGeolocation } from "@/hooks/useGeolocation";

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
  const [originError, setOriginError] = useState<string | null>(null);
  const [showInfoCard, setShowInfoCard] = useState(true);
  const geo = useGeolocation();

  useEffect(() => {
    if (geo.coords) {
      setUserOrigin(`${geo.coords.lat},${geo.coords.lng}`);
      setOriginError(null);
      return;
    }
    if (!geo.isEnabled) {
      setUserOrigin(null);
      return;
    }
    if (navigator.geolocation) {
      setOriginError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserOrigin(`${pos.coords.latitude},${pos.coords.longitude}`);
          setOriginError(null);
        },
        (err) => {
          setUserOrigin(null);
          setOriginError(err.message || "Position indisponible");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, [geo.coords, geo.isEnabled]);

  const dest = business.latitude && business.longitude
    ? `${business.latitude},${business.longitude}`
    : encodeURIComponent(business.address || business.name);
  const destRaw = business.latitude && business.longitude
    ? `${business.latitude},${business.longitude}`
    : business.address || business.name;
  const needsGeoConsent = !userOrigin && !geo.isEnabled;
  const waitingForOrigin = !userOrigin && geo.isEnabled && !originError;


  return (
    <div className="absolute inset-0 z-[100] bg-white flex flex-col">
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
        {needsGeoConsent ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-muted/30">
            <div className="max-w-sm w-full bg-background rounded-2xl shadow-xl p-6 text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-[#C04F17]/10 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-[#C04F17]" />
              </div>
              <h3 className="text-base font-semibold">Activer la localisation</h3>
              <p className="text-sm text-muted-foreground">
                Pour calculer l'itinéraire depuis votre position, autorisez l'accès à votre localisation.
              </p>
              <button
                onClick={geo.accept}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#C04F17] text-white px-4 py-2 text-sm font-medium hover:bg-[#C04F17]/90 transition-colors"
              >
                <MapPin className="h-4 w-4" /> Activer ma localisation
              </button>
            </div>
          </div>
        ) : waitingForOrigin ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
            <div className="text-sm text-muted-foreground">Localisation en cours…</div>
          </div>
        ) : originError && !userOrigin ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-muted/30">
            <div className="max-w-sm w-full bg-background rounded-2xl shadow-xl p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Impossible d'obtenir votre position. Vérifiez l'autorisation de localisation du navigateur.
              </p>
            </div>
          </div>
        ) : (
          <iframe
            src={`https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_EMBED_KEY}&origin=${userOrigin}&destination=${dest}&mode=${directionsMode}`}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Itinéraire vers ${business.name}`}
          />
        )}
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
