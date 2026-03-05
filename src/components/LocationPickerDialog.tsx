import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Navigation, Search, X, Loader, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LocationPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current geo coords from the hook */
  coords: { lat: number; lng: number } | null;
  detectedCity: string | null;
  isEnabled: boolean;
  isDetecting: boolean;
  onUseCurrentPosition: () => void;
  onConfirm: (coords: { lat: number; lng: number }, address: string) => void;
}

// Default center: Marrakech
const DEFAULT_CENTER: [number, number] = [31.6295, -7.9811];

const LocationPickerDialog = ({
  open,
  onOpenChange,
  coords,
  detectedCity,
  isEnabled,
  isDetecting,
  onUseCurrentPosition,
  onConfirm,
}: LocationPickerDialogProps) => {
  const { language } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [addressQuery, setAddressQuery] = useState("");
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Determine the active position to show on map
  const activeCoords = selectedCoords || (isEnabled && coords ? coords : null);

  // Create/update map when dialog opens
  useEffect(() => {
    if (!open) return;

    // Small delay to let the dialog render the container
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapRef.current) {
        const center = activeCoords
          ? [activeCoords.lat, activeCoords.lng] as [number, number]
          : DEFAULT_CENTER;

        const map = L.map(mapContainerRef.current, {
          center,
          zoom: 14,
          zoomControl: true,
          attributionControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;

        if (activeCoords) {
          addMarker(activeCoords.lat, activeCoords.lng);
        }

        // Click on map to place marker
        map.on("click", (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          setSelectedCoords({ lat, lng });
          addMarker(lat, lng);
          reverseGeocode(lat, lng);
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [open]);

  // Update map when activeCoords change
  useEffect(() => {
    if (!mapRef.current || !activeCoords) return;
    mapRef.current.setView([activeCoords.lat, activeCoords.lng], 14);
    addMarker(activeCoords.lat, activeCoords.lng);
  }, [activeCoords?.lat, activeCoords?.lng]);

  // Cleanup map on dialog close
  useEffect(() => {
    if (!open && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
    }
  }, [open]);

  const addMarker = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const goldIcon = L.divIcon({
        className: "",
        html: `<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;background:#b89a5a;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="#b89a5a"/></svg>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });
      markerRef.current = L.marker([lat, lng], { icon: goldIcon }).addTo(mapRef.current);
    }
  }, []);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`);
      const data = await res.json();
      if (data.display_name) {
        setSelectedAddress(data.display_name);
        setAddressQuery(data.display_name);
      }
    } catch {
      // ignore
    }
  };

  const handleSearchAddress = async () => {
    if (!addressQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&limit=1&accept-language=fr`
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lon);
        setSelectedCoords({ lat: parsedLat, lng: parsedLng });
        setSelectedAddress(display_name);
        setAddressQuery(display_name);
        if (mapRef.current) {
          mapRef.current.setView([parsedLat, parsedLng], 14);
          addMarker(parsedLat, parsedLng);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseCurrentPosition = () => {
    onUseCurrentPosition();
    // If we already have coords, use them
    if (coords) {
      setSelectedCoords(coords);
      setSelectedAddress(detectedCity || "");
      setAddressQuery(detectedCity || "");
    }
  };

  const handleConfirm = () => {
    if (activeCoords) {
      onConfirm(activeCoords, selectedAddress || detectedCity || "");
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchAddress();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {language === "en" ? "Choose your address" : language === "ar" ? "اختر عنوانك" : "Choisir votre adresse"}
              </DialogTitle>
              {detectedCity && isEnabled && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  📍 {detectedCity}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 space-y-3 shrink-0">
          {/* Use current position button */}
          <button
            onClick={handleUseCurrentPosition}
            disabled={isDetecting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gold text-white font-medium text-sm hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {isDetecting ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {language === "en"
              ? "Use my current position"
              : language === "ar"
              ? "استخدام موقعي الحالي"
              : "Utiliser ma position actuelle"}
          </button>

          {/* Address search field */}
          <div className="relative flex items-center border border-border rounded-xl overflow-hidden focus-within:border-gold/50 transition-colors">
            <Search className="h-4 w-4 text-muted-foreground ml-3 shrink-0" />
            <input
              type="text"
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                language === "en"
                  ? "Enter an address…"
                  : language === "ar"
                  ? "أدخل عنوانًا…"
                  : "Saisir une adresse…"
              }
              className="flex-1 py-3 px-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {addressQuery && (
              <button
                onClick={() => { setAddressQuery(""); setSelectedCoords(null); setSelectedAddress(""); }}
                className="p-1.5 mr-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={handleSearchAddress}
              disabled={isSearching || !addressQuery.trim()}
              className="h-full px-3 py-3 bg-gold/10 hover:bg-gold/20 text-gold transition-colors disabled:opacity-40"
            >
              {isSearching ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Map */}
        <div className="mx-5 mt-3 rounded-xl overflow-hidden border border-border flex-1 min-h-[250px]">
          <div ref={mapContainerRef} className="w-full h-full min-h-[250px]" />
        </div>

        {/* Confirm button */}
        <div className="p-5 pt-3 shrink-0">
          <button
            onClick={handleConfirm}
            disabled={!activeCoords}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gold text-white font-semibold text-sm hover:bg-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="h-4 w-4" />
            {language === "en"
              ? "Confirm this address"
              : language === "ar"
              ? "تأكيد هذا العنوان"
              : "Confirmer cette adresse"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPickerDialog;
