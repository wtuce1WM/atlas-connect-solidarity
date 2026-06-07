/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MapPin, Navigation, Search, X, Loader, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    google: any;
  }
}

interface LocationPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coords: { lat: number; lng: number } | null;
  detectedCity: string | null;
  isEnabled: boolean;
  isDetecting: boolean;
  onUseCurrentPosition: () => void;
  onConfirm: (coords: { lat: number; lng: number }, address: string) => void;
  onDisableGeo?: () => void;
}

const DEFAULT_CENTER = { lat: 31.6295, lng: -7.9811 };

let gmapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (gmapsPromise) return gmapsPromise;
  if (window.google?.maps) {
    gmapsPromise = Promise.resolve();
    return gmapsPromise;
  }
  gmapsPromise = new Promise((resolve, reject) => {
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-google-maps-key`, {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(({ key }) => {
        if (!key) throw new Error("No key returned");
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
          gmapsPromise = null;
          reject(new Error("Failed to load Google Maps script"));
        };
        document.head.appendChild(script);
      })
      .catch((err) => {
        gmapsPromise = null; // allow retry
        reject(err);
      });
  });
  return gmapsPromise;
}

const LocationPickerDialog = ({
  open,
  onOpenChange,
  coords,
  detectedCity,
  isEnabled,
  isDetecting,
  onUseCurrentPosition,
  onConfirm,
  onDisableGeo,
}: LocationPickerDialogProps) => {
  const { language } = useLanguage();
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const selectedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const selectedAddressRef = useRef("");

  const [addressQuery, setAddressQuery] = useState("");
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  // Counter that increments each time dialog opens, to force map re-init
  const [openCount, setOpenCount] = useState(0);

  const activeCoords = selectedCoords || (isEnabled && coords ? coords : null);

  useEffect(() => {
    selectedCoordsRef.current = selectedCoords;
  }, [selectedCoords]);

  useEffect(() => {
    selectedAddressRef.current = selectedAddress;
  }, [selectedAddress]);

  // Track open transitions and load Google Maps SDK
  useEffect(() => {
    if (open) {
      setOpenCount((c) => c + 1);
      loadGoogleMaps()
        .then(() => setMapsLoaded(true))
        .catch((err: any) => console.error("Google Maps load error:", err));
    }
  }, [open]);

  // Init map every time dialog opens (openCount changes) and maps SDK is loaded
  // Use a small timeout to ensure the DOM container is rendered by Radix
  useEffect(() => {
    if (!open || !mapsLoaded) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      const center = activeCoords || DEFAULT_CENTER;
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      mapRef.current = map;
      markerRef.current = null;

      if (activeCoords) {
        placeMarker(activeCoords);
      }

      map.addListener("click", (e: any) => {
        if (!e.latLng) return;
        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        selectedCoordsRef.current = pos;
        setSelectedCoords(pos);
        placeMarker(pos);
        reverseGeocode(pos);
      });

      // Init autocomplete
      if (inputRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "ma" },
          fields: ["geometry", "formatted_address", "name"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place.geometry?.location) {
            const pos = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };
            const addr = place.formatted_address || place.name || "";
            selectedCoordsRef.current = pos;
            selectedAddressRef.current = addr;
            setSelectedCoords(pos);
            setSelectedAddress(addr);
            setAddressQuery(addr);
            placeMarker(pos);
            mapRef.current?.setCenter(pos);
            mapRef.current?.setZoom(16);
          }
        });

        autocompleteRef.current = autocomplete;
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      mapRef.current = null;
      markerRef.current = null;
      autocompleteRef.current = null;
      infoWindowRef.current = null;
    };

  }, [openCount, mapsLoaded]);

  useEffect(() => {
    if (!mapRef.current || !activeCoords) return;
    mapRef.current.setCenter(activeCoords);
    mapRef.current.setZoom(14);
    placeMarker(activeCoords);
  }, [activeCoords?.lat, activeCoords?.lng]);

  // Reset selected state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedCoords(null);
      setSelectedAddress("");
      setAddressQuery("");
      setWaitingForPosition(false);
    }
  }, [open]);

  // Track when we're waiting for browser geolocation to resolve
  const [waitingForPosition, setWaitingForPosition] = useState(false);

  const infoWindowRef = useRef<any>(null);

  const placeMarker = useCallback((pos: { lat: number; lng: number }) => {
    if (!mapRef.current) return;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="120" viewBox="0 0 220 120">
      <g transform="translate(86,0)">
        <path fill="#C04F17" stroke="#ffffff" stroke-width="2" d="M24 0C10.7 0 0 10.7 0 24c0 18 24 40 24 40s24-22 24-40C48 10.7 37.3 0 24 0zm0 34c-5.5 0-10-4.5-10-10s4.5-10 10-10 10 4.5 10 10-4.5 10-10 10z"/>
      </g>
      <g transform="translate(40,72)" filter="url(#s)">
        <rect width="140" height="34" rx="17" fill="#C04F17"/>
        <circle cx="18" cy="17" r="8" fill="none" stroke="#ffffff" stroke-width="2"/>
        <circle cx="18" cy="17" r="2.5" fill="#ffffff"/>
        <text x="34" y="22" font-family="system-ui,-apple-system,sans-serif" font-size="13" font-weight="700" fill="#ffffff">Vous êtes ici</text>
      </g>
      <defs><filter id="s" x="-10%" y="-30%" width="120%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter></defs>
    </svg>`;
    const icon = {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(143, 78),
      anchor: new window.google.maps.Point(71, 42),
    };
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
      markerRef.current.setIcon(icon);
    } else {
      markerRef.current = new window.google.maps.Marker({
        position: pos,
        map: mapRef.current,
        icon,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
      });
      markerRef.current.addListener("dragend", (e: any) => {
        if (!e.latLng) return;
        const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        selectedCoordsRef.current = newPos;
        setSelectedCoords(newPos);
        reverseGeocode(newPos);
      });
    }

  }, []);



  const setReverseGeocodedAddress = useCallback((address: string | null) => {
    if (!address) return;
    selectedAddressRef.current = address;
    setSelectedAddress(address);
    setAddressQuery(address);
  }, []);

  const reverseGeocode = useCallback(async (pos: { lat: number; lng: number }): Promise<string | null> => {
    try {
      const { data } = await supabase.functions.invoke("geocode-locations", {
        body: { mode: "reverse", lat: pos.lat, lng: pos.lng },
      });

      if (typeof data?.address === "string" && data.address.trim()) {
        setReverseGeocodedAddress(data.address);
        return data.address;
      }
    } catch {
      // fallback to the browser geocoder below
    }

    if (!window.google?.maps) return null;
    const geocoder = new window.google.maps.Geocoder();
    return new Promise((resolve) => {
      geocoder.geocode({ location: pos }, (results: any, status: any) => {
        const address = status === "OK" && results?.[0]?.formatted_address ? results[0].formatted_address : null;
        setReverseGeocodedAddress(address);
        resolve(address);
      });
    });
  }, [setReverseGeocodedAddress]);

  const handleSearchAddress = useCallback(() => {
    if (!addressQuery.trim() || !window.google?.maps) return;
    setIsSearching(true);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      { address: addressQuery, region: "ma" },
      (results: any, status: any) => {
        setIsSearching(false);
        if (status === "OK" && results?.[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          const pos = { lat: loc.lat(), lng: loc.lng() };
          selectedCoordsRef.current = pos;
          setSelectedCoords(pos);
          const address = results[0].formatted_address || addressQuery;
          selectedAddressRef.current = address;
          setSelectedAddress(address);
          setAddressQuery(address);
          placeMarker(pos);
          mapRef.current?.setCenter(pos);
          mapRef.current?.setZoom(16);
        }
      }
    );
  }, [addressQuery, placeMarker]);

  const handleUseCurrentPosition = () => {
    onUseCurrentPosition();
    selectedAddressRef.current = "";
    setSelectedAddress("");
    setAddressQuery("");
    setWaitingForPosition(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        selectedCoordsRef.current = pos;
        setSelectedCoords(pos);
        placeMarker(pos);
        mapRef.current?.setCenter(pos);
        mapRef.current?.setZoom(14);
        reverseGeocode(pos).finally(() => setWaitingForPosition(false));
      },
      () => {
        setWaitingForPosition(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = async () => {
    const coordsToConfirm = selectedCoordsRef.current || activeCoords;
    if (coordsToConfirm) {
      const addressToConfirm = selectedAddressRef.current || await reverseGeocode(coordsToConfirm) || addressQuery || detectedCity || `${coordsToConfirm.lat.toFixed(5)}, ${coordsToConfirm.lng.toFixed(5)}`;
      onConfirm(coordsToConfirm, addressToConfirm);
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
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[299] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest?.(".pac-container")) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest?.(".pac-container")) e.preventDefault();
          }}
          className={cn(
            "fixed z-[300] grid w-full border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "inset-0 rounded-none max-h-full",
            "sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-lg md:max-w-2xl sm:rounded-2xl sm:max-h-[90vh]",
            "p-0 gap-0 overflow-hidden flex flex-col"
          )}
        >
          <DialogPrimitive.Close className="absolute left-4 top-4 rounded-full bg-black text-white w-8 h-8 flex items-center justify-center hover:bg-black/80 transition-colors focus:outline-none disabled:pointer-events-none z-10">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        <DialogHeader className="p-5 pb-3 shrink-0 text-center sm:text-center">
          <DialogTitle className="text-lg font-bold text-foreground text-center" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
            {language === "en" ? "Choose your address" : language === "ar" ? "اختر عنوانك" : "Choisir votre adresse"}
          </DialogTitle>
          {detectedCity && isEnabled && (
            <p className="text-xs text-muted-foreground mt-0.5 text-center" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>📍 {detectedCity}</p>
          )}
        </DialogHeader>

        <div className="px-5 space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleUseCurrentPosition}
              disabled={isDetecting}
              style={{ fontFamily: "'Josefin Sans', sans-serif" }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-gold text-white font-medium text-sm normal-case tracking-normal hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {isDetecting ? <Loader className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              {language === "en" ? "My position" : language === "ar" ? "موقعي" : "Ma position"}
            </button>
            {onDisableGeo && (
              <button
                onClick={() => { onDisableGeo(); onOpenChange(false); }}
                style={{ fontFamily: "'Josefin Sans', sans-serif" }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm normal-case tracking-normal hover:bg-primary/90 transition-colors"
              >
                <X className="h-4 w-4" />
                {language === "en" ? "Don't geolocate me" : language === "ar" ? "لا تحدد موقعي" : "Ne pas me géolocaliser"}
              </button>
            )}
          </div>

          <div className="relative flex items-center border border-border rounded-xl overflow-hidden focus-within:border-gold/50 transition-colors">
            <Search className="h-4 w-4 text-muted-foreground ml-3 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={language === "en" ? "Enter an address…" : language === "ar" ? "أدخل عنوانًا…" : "Saisir une adresse…"}
              style={{ fontFamily: "'Josefin Sans', sans-serif" }}
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

        <div className="mx-5 mt-3 rounded-xl overflow-hidden border border-border flex-1 min-h-[400px]">
          {!mapsLoaded ? (
            <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-muted">
              <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />
          )}
        </div>

        <div className="p-5 pt-3 shrink-0">
          <button
            onClick={handleConfirm}
            disabled={!activeCoords}
            style={{ backgroundColor: "#25D366", fontFamily: "'Josefin Sans', sans-serif" }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="h-4 w-4" />
            {language === "en" ? "Confirm this address" : language === "ar" ? "تأكيد هذا العنوان" : "Confirmer cette adresse"}
          </button>
        </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default LocationPickerDialog;
