/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Navigation, Search, X, Loader, Check, MapPin } from "lucide-react";
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
  /** Optional host business (e.g. embed context). When provided, its marker is shown and selectable. */
  hostLocation?: { lat: number; lng: number } | null;
  hostLabel?: string | null;
  /** Optional explicit theme override (bypasses global dark tokens). Used by /embed/ask. */
  theme?: "light" | "dark";
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
        gmapsPromise = null;
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
  hostLocation,
  hostLabel,
  theme,
}: LocationPickerDialogProps) => {
  const { language } = useLanguage();
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const hostMarkerRef = useRef<any>(null);
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
  const [openCount, setOpenCount] = useState(0);
  const [waitingForPosition, setWaitingForPosition] = useState(false);

  const activeCoords = selectedCoords || (isEnabled && coords ? coords : null);

  // ---- Themed class helpers (embed/ask overrides only when `theme` prop is set) ----
  const themed = {
    surface: theme === "light" ? "bg-white text-neutral-900"
           : theme === "dark" ? "bg-neutral-950 text-neutral-100"
           : "bg-background text-foreground",
    border: theme === "light" ? "border-neutral-200"
          : theme === "dark" ? "border-neutral-800"
          : "border-border",
    muted: theme === "light" ? "text-neutral-500"
         : theme === "dark" ? "text-neutral-400"
         : "text-muted-foreground",
    fg: theme === "light" ? "text-neutral-900"
      : theme === "dark" ? "text-neutral-100"
      : "text-foreground",
    mapBg: theme === "light" ? "bg-neutral-100"
         : theme === "dark" ? "bg-neutral-900"
         : "bg-muted",
    inputPlaceholder: theme === "light" ? "placeholder:text-neutral-400"
                    : theme === "dark" ? "placeholder:text-neutral-500"
                    : "placeholder:text-muted-foreground",
    closeBtn: theme === "light"
      ? "bg-neutral-900 text-white hover:bg-neutral-800"
      : theme === "dark"
      ? "bg-white text-neutral-900 hover:bg-neutral-200"
      : "bg-black text-white hover:bg-black/80",
    hostBtn: theme === "light"
      ? "bg-neutral-900 text-white hover:bg-neutral-800"
      : theme === "dark"
      ? "bg-white text-neutral-900 hover:bg-neutral-200"
      : "bg-primary text-primary-foreground hover:bg-primary/90",
  };

  useEffect(() => { selectedCoordsRef.current = selectedCoords; }, [selectedCoords]);
  useEffect(() => { selectedAddressRef.current = selectedAddress; }, [selectedAddress]);

  useEffect(() => {
    if (open) {
      setOpenCount((c) => c + 1);
      loadGoogleMaps()
        .then(() => setMapsLoaded(true))
        .catch((err: any) => console.error("Google Maps load error:", err));
    }
  }, [open]);

  useEffect(() => {
    if (!open || !mapsLoaded) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      const center = activeCoords || hostLocation || DEFAULT_CENTER;
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
      hostMarkerRef.current = null;

      // Host marker (distinct visual, clickable to select the host location)
      if (hostLocation) {
        const hostSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120" viewBox="0 0 240 120">
          <g transform="translate(96,0)">
            <path fill="#D4AF37" stroke="#ffffff" stroke-width="2" d="M24 0C10.7 0 0 10.7 0 24c0 18 24 40 24 40s24-22 24-40C48 10.7 37.3 0 24 0zm0 34c-5.5 0-10-4.5-10-10s4.5-10 10-10 10 4.5 10 10-4.5 10-10 10z"/>
          </g>
          <g transform="translate(20,72)" filter="url(#sh)">
            <rect width="200" height="34" rx="17" fill="#D4AF37"/>
            <text x="100" y="22" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="13" font-weight="700" fill="#ffffff">${(hostLabel || "Établissement").replace(/[<>&]/g, "").slice(0, 26)}</text>
          </g>
          <defs><filter id="sh" x="-10%" y="-30%" width="120%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter></defs>
        </svg>`;
        hostMarkerRef.current = new window.google.maps.Marker({
          position: hostLocation,
          map,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(hostSvg)}`,
            scaledSize: new window.google.maps.Size(156, 78),
            anchor: new window.google.maps.Point(78, 42),
          },
          zIndex: 5,
        });
        hostMarkerRef.current.addListener("click", () => selectHostLocation());
      }

      if (activeCoords) placeMarker(activeCoords);

      map.addListener("click", (e: any) => {
        if (!e.latLng) return;
        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        selectedCoordsRef.current = pos;
        setSelectedCoords(pos);
        placeMarker(pos);
        reverseGeocode(pos);
      });

      if (inputRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "ma" },
          fields: ["geometry", "formatted_address", "name"],
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place.geometry?.location) {
            const pos = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
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
      hostMarkerRef.current = null;
      autocompleteRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCount, mapsLoaded]);

  useEffect(() => {
    if (!mapRef.current || !activeCoords) return;
    mapRef.current.setCenter(activeCoords);
    mapRef.current.setZoom(14);
    placeMarker(activeCoords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCoords?.lat, activeCoords?.lng]);

  useEffect(() => {
    if (!open) {
      setSelectedCoords(null);
      setSelectedAddress("");
      setAddressQuery("");
      setWaitingForPosition(false);
    }
  }, [open]);

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
        zIndex: 10,
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
    } catch { /* fallthrough */ }

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

  const selectHostLocation = useCallback(() => {
    if (!hostLocation) return;
    selectedCoordsRef.current = hostLocation;
    setSelectedCoords(hostLocation);
    placeMarker(hostLocation);
    mapRef.current?.setCenter(hostLocation);
    mapRef.current?.setZoom(16);
    const label = hostLabel || "";
    if (label) {
      selectedAddressRef.current = label;
      setSelectedAddress(label);
      setAddressQuery(label);
    } else {
      reverseGeocode(hostLocation);
    }
  }, [hostLocation, hostLabel, placeMarker, reverseGeocode]);

  const handleSearchAddress = useCallback(() => {
    if (!addressQuery.trim() || !window.google?.maps) return;
    setIsSearching(true);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: addressQuery, region: "ma" }, (results: any, status: any) => {
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
    });
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
      () => setWaitingForPosition(false),
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
    if (e.key === "Enter") { e.preventDefault(); handleSearchAddress(); }
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
            "fixed z-[300] grid w-full border shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            themed.surface,
            themed.border,
            "inset-0 rounded-none max-h-full",
            "sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-lg md:max-w-2xl sm:rounded-2xl sm:max-h-[90vh]",
            "p-0 gap-0 overflow-hidden flex flex-col"
          )}
        >
          <DialogPrimitive.Close className={cn("absolute left-4 top-4 rounded-full w-8 h-8 flex items-center justify-center transition-colors focus:outline-none disabled:pointer-events-none z-10", themed.closeBtn)}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
          <DialogHeader className="p-5 pb-3 shrink-0 text-center sm:text-center">
            <DialogTitle className={cn("text-lg font-bold text-center", themed.fg)} style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {language === "en" ? "Choose your address" : language === "ar" ? "اختر عنوانك" : "Choisir votre adresse"}
            </DialogTitle>
            {detectedCity && isEnabled && (
              <p className={cn("text-xs mt-0.5 text-center", themed.muted)} style={{ fontFamily: "'Montserrat', sans-serif" }}>📍 {detectedCity}</p>
            )}
          </DialogHeader>

          <div className="px-5 space-y-3 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleUseCurrentPosition}
                disabled={isDetecting}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-gold text-white font-medium text-sm normal-case tracking-normal hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {isDetecting || waitingForPosition ? <Loader className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                {language === "en" ? "My position" : language === "ar" ? "موقعي" : "Ma position"}
              </button>
              {hostLocation && (
                <button
                  onClick={selectHostLocation}
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                  className={cn(
                    "flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-medium text-sm normal-case tracking-normal transition-colors",
                    themed.hostBtn
                  )}
                  title={hostLabel || ""}
                >
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{hostLabel || (language === "en" ? "The venue" : language === "ar" ? "المكان" : "L'établissement")}</span>
                </button>
              )}
              {onDisableGeo && (
                <button
                  onClick={() => { onDisableGeo(); onOpenChange(false); }}
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm normal-case tracking-normal hover:bg-primary/90 transition-colors"
                >
                  <X className="h-4 w-4" />
                  {language === "en" ? "Don't geolocate me" : language === "ar" ? "لا تحدد موقعي" : "Ne pas me géolocaliser"}
                </button>
              )}
            </div>

            <div className={cn("relative flex items-center border rounded-xl overflow-hidden focus-within:border-gold/50 transition-colors", themed.border)}>
              <Search className={cn("h-4 w-4 ml-3 shrink-0", themed.muted)} />
              <input
                ref={inputRef}
                type="text"
                value={addressQuery}
                onChange={(e) => setAddressQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={language === "en" ? "Enter an address…" : language === "ar" ? "أدخل عنوانًا…" : "Saisir une adresse…"}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
                className={cn("flex-1 py-3 px-2 text-sm bg-transparent focus:outline-none", themed.fg, themed.inputPlaceholder)}
              />
              {addressQuery && (
                <button
                  onClick={() => { setAddressQuery(""); setSelectedCoords(null); setSelectedAddress(""); }}
                  className={cn("p-1.5 mr-1 hover:opacity-100", themed.muted)}
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

          <div className={cn("mx-5 mt-3 rounded-xl overflow-hidden border flex-1 min-h-[400px]", themed.border)}>
            {!mapsLoaded ? (
              <div className={cn("w-full h-full min-h-[400px] flex items-center justify-center", themed.mapBg)}>
                <Loader className={cn("h-6 w-6 animate-spin", themed.muted)} />
              </div>
            ) : (
              <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />
            )}
          </div>

          <div className="p-5 pt-3 shrink-0">
            <button
              onClick={handleConfirm}
              disabled={!activeCoords}
              style={{ backgroundColor: "#25D366", fontFamily: "'Montserrat', sans-serif" }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold text-sm normal-case tracking-normal hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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
