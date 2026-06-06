/// <reference types="@types/google.maps" />
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { X, Info, MapPin } from "lucide-react";
import MapBusinessInfoCard from "@/components/MapBusinessInfoCard";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";

const GEO_STORAGE_KEY = "geo_preference";
const GEO_MANUAL_COORDS_KEY = "geo_manual_coords";
const GEO_MANUAL_ADDRESS_KEY = "geo_manual_address";
const GEO_AUTO_COORDS_KEY = "geo_auto_coords";

const parseStoredCoords = (key: string): { lat: number; lng: number } | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat?: unknown; lng?: unknown };
    return typeof parsed.lat === "number" && typeof parsed.lng === "number"
      ? { lat: parsed.lat, lng: parsed.lng } : null;
  } catch { return null; }
};

const readStoredOrigin = (): { lat: number; lng: number } | null =>
  parseStoredCoords(GEO_MANUAL_COORDS_KEY) || parseStoredCoords(GEO_AUTO_COORDS_KEY);

const sameCoords = (a: { lat: number; lng: number } | null, b: { lat: number; lng: number } | null) =>
  (!a && !b) || (!!a && !!b && a.lat === b.lat && a.lng === b.lng);

/* ── Google Maps loader (shared singleton) ── */
let gmapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (gmapsPromise) return gmapsPromise;
  if (window.google?.maps) { gmapsPromise = Promise.resolve(); return gmapsPromise; }
  gmapsPromise = new Promise((resolve, reject) => {
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-google-maps-key`, {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(({ key }) => {
        if (!key) throw new Error("No key returned");
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry,marker`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => { gmapsPromise = null; reject(new Error("Failed to load Google Maps")); };
        document.head.appendChild(script);
      })
      .catch((err) => { gmapsPromise = null; reject(err); });
  });
  return gmapsPromise;
}

const TERRACOTTA = "#C04F17";
const buildPinIcon = (gmaps: typeof google.maps): google.maps.Icon => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 384 512"><path fill="${TERRACOTTA}" stroke="#ffffff" stroke-width="16" d="M192 0C86 0 0 86 0 192c0 144 192 320 192 320s192-176 192-320C384 86 298 0 192 0zm0 272c-44.2 0-80-35.8-80-80s35.8-80 80-80 80 35.8 80 80-35.8 80-80 80z"/></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new gmaps.Size(32, 40),
    anchor: new gmaps.Point(16, 40),
  };
};

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
  const [userOrigin, setUserOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [storedOrigin, setStoredOrigin] = useState<{ lat: number; lng: number } | null>(() => readStoredOrigin());
  const [originError, setOriginError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showInfoCard, setShowInfoCard] = useState(true);
  const [cardOffset, setCardOffset] = useState(0);
  const [mapsReady, setMapsReady] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const originMarkerRef = useRef<google.maps.Marker | null>(null);
  const destMarkerRef = useRef<google.maps.Marker | null>(null);
  const geo = useGeolocation();

  const requestBrowserOrigin = useCallback(() => {
    if (!navigator.geolocation) { setOriginError("Géolocalisation indisponible"); return; }
    setOriginError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserOrigin(next); setStoredOrigin(next); setOriginError(null);
        try {
          window.localStorage.setItem(GEO_STORAGE_KEY, "enabled");
          window.localStorage.removeItem(GEO_MANUAL_COORDS_KEY);
          window.localStorage.removeItem(GEO_MANUAL_ADDRESS_KEY);
          window.localStorage.setItem(GEO_AUTO_COORDS_KEY, JSON.stringify(next));
          window.dispatchEvent(new CustomEvent("geo:changed"));
        } catch { /* noop */ }
      },
      (err) => { setUserOrigin(null); setOriginError(err.message || "Position indisponible"); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    const sync = () => setStoredOrigin(readStoredOrigin());
    sync();
    window.addEventListener("geo:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("geo:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (geo.coords) {
      const next = { lat: geo.coords.lat, lng: geo.coords.lng };
      setUserOrigin(next); setStoredOrigin(next); setOriginError(null);
      return;
    }
    if (!geo.isEnabled && !storedOrigin) { setUserOrigin(null); return; }
    if (!storedOrigin) requestBrowserOrigin();
  }, [geo.coords, geo.isEnabled, storedOrigin, requestBrowserOrigin]);

  const origin = userOrigin || storedOrigin;
  const destLatLng = business.latitude != null && business.longitude != null
    ? { lat: business.latitude, lng: business.longitude } : null;
  const destRaw = destLatLng ? `${destLatLng.lat},${destLatLng.lng}` : (business.address || business.name);
  const needsGeoConsent = !origin && (!geo.isEnabled || !!originError);
  const waitingForOrigin = !origin && geo.isEnabled && !originError;
  const showMap = !!origin && !!destLatLng && !needsGeoConsent && !waitingForOrigin;

  // Measure info card for fitBounds padding
  useEffect(() => {
    if (!showInfoCard) { setCardOffset(0); return; }
    const container = mapContainerRef.current;
    if (!container) return;
    let raf = 0;
    const measure = () => {
      const el = container.querySelector<HTMLElement>("[data-info-card]");
      if (!el) { raf = requestAnimationFrame(measure); return; }
      const rect = el.getBoundingClientRect();
      const top = container.getBoundingClientRect().top;
      setCardOffset(Math.max(0, Math.ceil(rect.bottom - top) + 8));
    };
    measure();
    const ro = new ResizeObserver(measure);
    const el = container.querySelector<HTMLElement>("[data-info-card]");
    if (el) ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [showInfoCard, showMap]);

  useEffect(() => {
    if (!showMap) return;
    loadGoogleMaps().then(() => setMapsReady(true)).catch((e) => {
      console.error(e); setRouteError("Impossible de charger la carte");
    });
  }, [showMap]);

  useEffect(() => {
    if (!mapsReady || !showMap || !mapDivRef.current || mapRef.current || !origin) return;
    const gmaps = window.google.maps;
    mapRef.current = new gmaps.Map(mapDivRef.current, {
      center: origin, zoom: 13,
      mapTypeControl: false, streetViewControl: false,
      fullscreenControl: false, zoomControl: true,
      gestureHandling: "greedy", clickableIcons: false,
    });
  }, [mapsReady, showMap, origin]);

  // Fetch route + draw
  useEffect(() => {
    if (!mapsReady || !showMap || !mapRef.current || !origin || !destLatLng) return;
    const gmaps = window.google.maps;
    const map = mapRef.current;
    let cancelled = false;
    setRouteError(null);

    // Origin marker (terracotta Pin)
    if (originMarkerRef.current) originMarkerRef.current.setMap(null);
    originMarkerRef.current = new gmaps.Marker({
      position: origin, map, icon: buildPinIcon(gmaps),
      title: "Vous êtes ici", zIndex: 2000,
    });
    // Destination marker (default red)
    if (destMarkerRef.current) destMarkerRef.current.setMap(null);
    destMarkerRef.current = new gmaps.Marker({
      position: destLatLng, map, title: business.name,
    });

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("compute-route", {
          body: { origin, destination: destLatLng, mode: directionsMode },
        });
        if (cancelled) return;
        if (error || !data?.encodedPolyline) {
          setRouteError("Itinéraire indisponible");
          // Fallback: fit on origin + destination
          const b = new gmaps.LatLngBounds();
          b.extend(origin); b.extend(destLatLng);
          map.fitBounds(b, { top: cardOffset + 24, left: 32, right: 32, bottom: 48 });
          return;
        }
        const path = gmaps.geometry.encoding.decodePath(data.encodedPolyline);
        if (polylineRef.current) polylineRef.current.setMap(null);
        polylineRef.current = new gmaps.Polyline({
          path, map, strokeColor: TERRACOTTA, strokeWeight: 5, strokeOpacity: 0.9,
        });
        const bounds = new gmaps.LatLngBounds();
        path.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, { top: cardOffset + 24, left: 32, right: 32, bottom: 48 });
      } catch (e) {
        if (!cancelled) {
          console.error(e); setRouteError("Itinéraire indisponible");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [mapsReady, showMap, origin, destLatLng, directionsMode, cardOffset, business.name]);

  const originParam = origin ? encodeURIComponent(`${origin.lat},${origin.lng}`) : null;
  const destParam = encodeURIComponent(destRaw);

  return (
    <div className="absolute inset-0 z-[100] bg-white flex flex-col">
      <div className="shrink-0 flex items-center px-4 py-2 border-b bg-white">
        <button
          onClick={onClose}
          className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-black text-white shadow-lg hover:opacity-90 transition-opacity"
          title="Fermer" aria-label="Fermer l'itinéraire"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center bg-muted rounded-full p-0.5">
            <button
              onClick={() => setDirectionsMode("walking")}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${directionsMode === "walking" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >🚶 À pied</button>
            <button
              onClick={() => setDirectionsMode("driving")}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${directionsMode === "driving" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >🚗 Voiture</button>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <a href={`https://www.google.com/maps/dir/?api=1${originParam ? `&origin=${originParam}` : ""}&destination=${destParam}`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted transition-colors" title="Google Maps">
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
      <div ref={mapContainerRef} className="flex-1 relative min-h-0">
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
                onClick={() => { geo.accept(); requestBrowserOrigin(); }}
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
          <>
            <div ref={mapDivRef} className="absolute inset-0 w-full h-full" />
            {routeError && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-full">
                {routeError}
              </div>
            )}
          </>
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
