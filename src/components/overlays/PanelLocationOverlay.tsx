/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from "react";
import { X, MapPin, Navigation, Search, Loader, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    google: any;
  }
}

interface PanelLocationOverlayProps {
  open: boolean;
  onClose: () => void;
  /** "absolute" (default, fills parent) or "popup" (fixed centered modal with backdrop) */
  variant?: "absolute" | "popup";
}

const DEFAULT_CENTER = { lat: 31.6295, lng: -7.9811 };

const PL_T = {
  fr: { chooseAddress: "Choisir votre adresse", myPosition: "Ma position", dontGeolocate: "Ne pas me géolocaliser", enterAddress: "Saisir une adresse…", confirmAddress: "Confirmer cette adresse" },
  en: { chooseAddress: "Choose your address", myPosition: "My position", dontGeolocate: "Don't geolocate me", enterAddress: "Enter an address…", confirmAddress: "Confirm this address" },
  ar: { chooseAddress: "اختر عنوانك", myPosition: "موقعي", dontGeolocate: "لا تحدد موقعي", enterAddress: "أدخل عنوانًا…", confirmAddress: "تأكيد هذا العنوان" },
} as const;


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
        script.onerror = () => { gmapsPromise = null; reject(new Error("Failed to load Google Maps")); };
        document.head.appendChild(script);
      })
      .catch((err) => { gmapsPromise = null; reject(err); });
  });
  return gmapsPromise;
}

const PanelLocationOverlay = ({ open, onClose, variant = "absolute" }: PanelLocationOverlayProps) => {
  const { language } = useLanguage();
  const T = (PL_T as any)[language] || PL_T.fr;

  const geo = useGeolocation();

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
  const [openCount, setOpenCount] = useState(0);
  const [waitingForPosition, setWaitingForPosition] = useState(false);

  const coords = geo.isEnabled && geo.coords ? geo.coords : null;
  const activeCoords = selectedCoords || coords;

  useEffect(() => {
    selectedCoordsRef.current = selectedCoords;
  }, [selectedCoords]);

  useEffect(() => {
    selectedAddressRef.current = selectedAddress;
  }, [selectedAddress]);

  // Load maps on open
  useEffect(() => {
    if (open) {
      setOpenCount((c) => c + 1);
      loadGoogleMaps()
        .then(() => setMapsLoaded(true))
        .catch((err: any) => console.error("Google Maps load error:", err));
    }
  }, [open]);

  // Init map each time dialog opens
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
        if (autocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "ma" },
          fields: ["geometry", "formatted_address", "name"],
        });
        autocompleteRef.current = autocomplete;
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
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [openCount, mapsLoaded]);

  // Center map when coords change
  useEffect(() => {
    if (!mapRef.current || !activeCoords) return;
    mapRef.current.setCenter(activeCoords);
    mapRef.current.setZoom(14);
    placeMarker(activeCoords);
  }, [activeCoords?.lat, activeCoords?.lng]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedCoords(null);
      setSelectedAddress("");
      setAddressQuery("");
      setWaitingForPosition(false);
    }
  }, [open]);

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

  const placeMarker = useCallback((pos: { lat: number; lng: number }) => {
    if (!mapRef.current) return;
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
    } else {
      markerRef.current = new window.google.maps.Marker({
        position: pos,
        map: mapRef.current,
        draggable: true,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#b89a5a",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
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
  }, [reverseGeocode]);

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
    if (!navigator.geolocation) return;
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
      (err) => {
        console.warn("Geolocation denied/error:", err);
        setWaitingForPosition(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = async () => {
    const coordsToConfirm = selectedCoordsRef.current || coords;

    if (coordsToConfirm) {
      const addressToConfirm = selectedAddressRef.current || await reverseGeocode(coordsToConfirm) || addressQuery || geo.detectedCity || `${coordsToConfirm.lat.toFixed(5)}, ${coordsToConfirm.lng.toFixed(5)}`;
      geo.setManualLocation(coordsToConfirm, addressToConfirm);
      handleClose();
    }
  };

  const handleDisableGeo = () => {
    try {
      localStorage.removeItem("geo_manual_coords");
      localStorage.removeItem("geo_manual_address");
    } catch { /* noop */ }
    geo.decline();
    handleClose();
  };

  const [closing, setClosing] = useState(false);
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 200);
  }, [onClose]);

  if (!open && !closing) return null;

  const isPopup = variant === "popup";

  const content = (
    <div
      className={
        isPopup
          ? `relative w-full max-w-2xl h-[90vh] max-h-[700px] bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden ${closing ? "animate-out zoom-out-95 duration-200" : "animate-in zoom-in-95 duration-200"}`
          : `absolute inset-0 z-[90] bg-background flex flex-col ${closing ? "animate-out slide-out-to-bottom duration-200" : "animate-in slide-in-from-bottom duration-200"}`
      }
      onClick={isPopup ? (e) => e.stopPropagation() : undefined}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={handleClose}
          className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <span className="font-semibold text-sm">
            {T.chooseAddress}
          </span>
          {geo.isEnabled && (geo.confirmedAddress || geo.detectedCity) && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">📍 {geo.confirmedAddress || geo.detectedCity}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 px-4 pt-3 space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseCurrentPosition}
            disabled={geo.isDetecting}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-gold text-white font-medium text-sm hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {geo.isDetecting ? <Loader className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            {T.myPosition}
          </button>
          <button
            type="button"
            onClick={handleDisableGeo}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <X className="h-4 w-4" />
            {T.dontGeolocate}
          </button>
        </div>

        {/* Search bar with autocomplete */}
        <div className="relative flex items-center border border-border rounded-xl overflow-hidden focus-within:border-gold/50 transition-colors">
          <Search className="h-4 w-4 text-muted-foreground ml-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={addressQuery}
            onChange={(e) => setAddressQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearchAddress(); } }}
            placeholder={T.enterAddress}
            className="flex-1 py-3 px-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {addressQuery && (
            <button
              type="button"
              onClick={() => { setAddressQuery(""); setSelectedCoords(null); setSelectedAddress(""); }}
              className="p-1.5 mr-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleSearchAddress}
            disabled={isSearching || !addressQuery.trim()}
            className="h-full px-3 py-3 bg-gold/10 hover:bg-gold/20 text-gold transition-colors disabled:opacity-40"
          >
            {isSearching ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 mx-4 mt-3 rounded-xl overflow-hidden border border-border min-h-[200px]">
        {!mapsLoaded ? (
          <div className="w-full h-full min-h-[200px] flex items-center justify-center bg-muted">
            <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div ref={mapContainerRef} className="w-full h-full min-h-[200px]" />
        )}
      </div>

      {/* Confirm button */}
      <div className="shrink-0 p-4 pt-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!activeCoords}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366] text-white font-semibold text-sm hover:bg-[#25D366]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Check className="h-4 w-4" />
          {T.confirmAddress}
        </button>
      </div>
    </div>
  );

  if (isPopup) {
    return (
      <div
        className={`fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 ${closing ? "animate-out fade-out duration-200" : "animate-in fade-in duration-200"}`}
        onClick={handleClose}
      >
        {content}
      </div>
    );
  }

  return content;
};

export default PanelLocationOverlay;
