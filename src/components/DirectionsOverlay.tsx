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
  (!a && !b) || (!!a && !!b && Math.abs(a.lat - b.lat) < 0.000001 && Math.abs(a.lng - b.lng) < 0.000001);

type DirectionsMode = "walking" | "driving";
interface RouteData { encodedPolyline: string; viewport?: unknown; distanceMeters?: number | null; duration?: string | null }
const routeCache = new Map<string, RouteData>();
const coordKey = (coords: { lat: number; lng: number }) => `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;

const decodeEncodedPolyline = (encoded: string): google.maps.LatLngLiteral[] => {
  const path: google.maps.LatLngLiteral[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    path.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return path;
};

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
  const [directionsMode, setDirectionsMode] = useState<DirectionsMode>("walking");
  const [userOrigin, setUserOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [storedOrigin, setStoredOrigin] = useState<{ lat: number; lng: number } | null>(() => readStoredOrigin());
  const [originError, setOriginError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceMeters: number | null; duration: string | null } | null>(null);
  const [showInfoCard, setShowInfoCard] = useState(true);
  const [cardOffset, setCardOffset] = useState(0);
  const cardOffsetRef = useRef(0);
  const [mapsReady, setMapsReady] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRenderersRef = useRef<google.maps.DirectionsRenderer[]>([]);
  const routeLabelsRef = useRef<google.maps.OverlayView[]>([]);
  const routeRequestRef = useRef(0);
  const originMarkerRef = useRef<google.maps.Marker | null>(null);
  const destMarkerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
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
    const sync = () => {
      const next = readStoredOrigin();
      setStoredOrigin((current) => sameCoords(current, next) ? current : next);
    };
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
      setUserOrigin((current) => sameCoords(current, next) ? current : next);
      setStoredOrigin((current) => sameCoords(current, next) ? current : next);
      setOriginError(null);
      return;
    }
    if (!geo.isEnabled && !storedOrigin) { setUserOrigin(null); return; }
    if (!storedOrigin) requestBrowserOrigin();
  }, [geo.coords, geo.isEnabled, storedOrigin, requestBrowserOrigin]);

  const origin = useMemo(() => userOrigin || storedOrigin, [userOrigin, storedOrigin]);
  const destLatLng = useMemo(() => (
    business.latitude != null && business.longitude != null
      ? { lat: business.latitude, lng: business.longitude }
      : null
  ), [business.latitude, business.longitude]);
  const destRaw = destLatLng ? `${destLatLng.lat},${destLatLng.lng}` : (business.address || business.name);
  const routeKey = useMemo(() => (
    origin && destLatLng ? `${directionsMode}:${coordKey(origin)}:${coordKey(destLatLng)}` : null
  ), [origin, destLatLng, directionsMode]);
  const needsGeoConsent = !origin && !geo.isEnabled && !originError;
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
      const next = Math.max(0, Math.ceil(rect.bottom - top) + 8);
      setCardOffset((current) => current === next ? current : next);
      cardOffsetRef.current = next;
      // Re-fit current bounds to account for new offset, without refetching route
      const map = mapRef.current;
      const poly = polylineRef.current;
      if (map && poly) {
        const b = new google.maps.LatLngBounds();
        poly.getPath().forEach((p) => b.extend(p));
        map.fitBounds(b, { top: next + 24, left: 32, right: 32, bottom: 48 });
      }
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

  // Native Google DirectionsService + DirectionsRenderer (route, markers A/B, time & distance natives)
  useEffect(() => {
    if (!mapsReady || !showMap || !mapRef.current || !origin || !destLatLng) return;
    const gmaps = window.google.maps;
    const map = mapRef.current;
    let cancelled = false;
    const requestId = ++routeRequestRef.current;
    setRouteError(null);
    setRouteInfo(null);

    // Clear our custom markers + polyline + info window — DirectionsRenderer handles all of this natively
    if (originMarkerRef.current) { originMarkerRef.current.setMap(null); originMarkerRef.current = null; }
    if (destMarkerRef.current) { destMarkerRef.current.setMap(null); destMarkerRef.current = null; }
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
    if (infoWindowRef.current) { infoWindowRef.current.close(); infoWindowRef.current = null; }
    directionsRenderersRef.current.forEach((r) => r.setMap(null));
    directionsRenderersRef.current = [];
    routeLabelsRef.current.forEach((ov) => ov.setMap(null));
    routeLabelsRef.current = [];
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!directionsServiceRef.current) directionsServiceRef.current = new gmaps.DirectionsService();

    directionsServiceRef.current.route(
      {
        origin,
        destination: destLatLng,
        travelMode: directionsMode === "walking" ? gmaps.TravelMode.WALKING : gmaps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      },
      (result, status) => {
        if (cancelled || requestId !== routeRequestRef.current) return;
        if (status !== gmaps.DirectionsStatus.OK || !result) {
          setRouteError("Itinéraire indisponible (vérifiez l'activation de l'API Directions Google)");
          const b = new gmaps.LatLngBounds();
          b.extend(origin); b.extend(destLatLng);
          map.fitBounds(b, { top: cardOffsetRef.current + 24, left: 32, right: 32, bottom: 48 });
          return;
        }

        const routes = result.routes || [];
        // Render each alternative — primary first goes on top
        routes.forEach((route, idx) => {
          const isPrimary = idx === 0;
          // For walking: use Google's native dotted style (suppressPolylines → manual dots).
          // For driving: classic blue solid line.
          const renderer = new gmaps.DirectionsRenderer({
            map,
            directions: result,
            routeIndex: idx,
            suppressMarkers: !isPrimary,
            preserveViewport: true,
            suppressPolylines: directionsMode === "walking",
          });
          directionsRenderersRef.current.push(renderer);

          const leg = route.legs?.[0];
          if (!leg) return;
          const path: google.maps.LatLng[] = [];
          leg.steps?.forEach((s) => s.path?.forEach((p) => path.push(p)));

          // Manual walking polyline: dotted dark-blue circles (Google native style)
          if (directionsMode === "walking") {
            const color = isPrimary ? "#1a237e" : "#5c6bc0";
            const dotted = new gmaps.Polyline({
              path,
              map,
              strokeOpacity: 0,
              zIndex: isPrimary ? 10 : 1,
              icons: [{
                icon: {
                  path: gmaps.SymbolPath.CIRCLE,
                  scale: 4,
                  fillColor: color,
                  fillOpacity: 1,
                  strokeColor: color,
                  strokeWeight: 1,
                },
                offset: "0",
                repeat: "12px",
              }],
            });
            polylinesRef.current.push(dotted);
          }

          // Label with tail (Google Maps "alt route" style)
          const mid = path[Math.floor(path.length / 2)] || leg.end_location;
          const dur = leg.duration?.text || "";
          const dist = leg.distance?.text || "";
          const icon = directionsMode === "walking" ? "🚶" : "🚗";

          class PillOverlay extends gmaps.OverlayView {
            private div?: HTMLDivElement;
            private pos: google.maps.LatLng;
            constructor(pos: google.maps.LatLng) { super(); this.pos = pos; }
            onAdd() {
              const wrap = document.createElement("div");
              wrap.style.cssText = `position:absolute;transform:translate(-50%,calc(-100% - 10px));pointer-events:none;z-index:${isPrimary ? 50 : 40};filter:drop-shadow(0 1px 2px rgba(0,0,0,0.25));`;
              wrap.innerHTML = `
                <div style="background:#fff;border:1px solid rgba(0,0,0,0.2);border-radius:4px;padding:6px 10px;font-family:'Avenir Next','Avenir','Nunito Sans',Arial,sans-serif;white-space:nowrap;">
                  <div style="font-size:13px;font-weight:600;color:#202124;line-height:1.15;">${icon} ${dur}</div>
                  <div style="font-size:11px;color:#5f6368;line-height:1.15;margin-top:1px;">${dist}</div>
                </div>
                <div style="position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid #fff;"></div>
              `;
              this.div = wrap;
              this.getPanes()!.floatPane.appendChild(wrap);
            }
            draw() {
              if (!this.div) return;
              const p = this.getProjection()?.fromLatLngToDivPixel(this.pos);
              if (!p) return;
              this.div.style.left = p.x + "px";
              this.div.style.top = p.y + "px";
            }
            onRemove() { this.div?.remove(); this.div = undefined; }
          }
          const overlay = new PillOverlay(mid) as unknown as google.maps.OverlayView;
          overlay.setMap(map);
          routeLabelsRef.current.push(overlay);
        });

        const primary = routes[0];
        const leg0 = primary?.legs?.[0];
        if (leg0) {
          setRouteInfo({
            distanceMeters: leg0.distance?.value ?? null,
            duration: leg0.duration?.value != null ? `${leg0.duration.value}s` : null,
          });
        }
        const bounds = primary?.bounds;
        if (bounds) {
          map.fitBounds(bounds, { top: cardOffsetRef.current + 24, left: 32, right: 32, bottom: 48 });
        }
      }
    );

    return () => { cancelled = true; };
  }, [mapsReady, showMap, origin, destLatLng, directionsMode, business.name]);

  const formatDistance = (m: number | null) => {
    if (m == null) return null;
    return m >= 1000 ? `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km` : `${Math.round(m)} m`;
  };
  const formatDuration = (d: string | null) => {
    if (!d) return null;
    const secs = parseInt(d.replace(/s$/, ""), 10);
    if (!Number.isFinite(secs)) return null;
    if (secs < 60) return `${secs} s`;
    const mins = Math.round(secs / 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const r = mins % 60;
    return r ? `${h} h ${r} min` : `${h} h`;
  };

  const routeDurationLabel = routeInfo ? formatDuration(routeInfo.duration) : null;
  const routeDistanceLabel = routeInfo ? formatDistance(routeInfo.distanceMeters) : null;


  const originParam = origin ? encodeURIComponent(`${origin.lat},${origin.lng}`) : null;
  const destParam = encodeURIComponent(destRaw);
  const googleTravelMode = directionsMode === "walking" ? "walking" : "driving";
  const appleDirFlag = directionsMode === "walking" ? "w" : "d";

  return (
    <div className="absolute inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom duration-500 ease-out">
      <div className="shrink-0 flex items-center px-4 py-2 border-b bg-white">
        <button
          onClick={onClose}
          className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-black text-white shadow-lg hover:opacity-90 transition-opacity"
          title="Fermer" aria-label="Fermer l'itinéraire"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex-1 flex items-center justify-center min-w-0 px-2">
          <div className="flex items-center gap-2 min-w-0">
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
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <a href={`https://www.google.com/maps/dir/?api=1${originParam ? `&origin=${originParam}` : ""}&destination=${destParam}&travelmode=${googleTravelMode}`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted transition-colors" title="Google Maps">
            <img src="https://www.gstatic.com/images/branding/product/1x/maps_48dp.png" alt="Google Maps" className="h-6 w-6 object-contain" />
          </a>
          <a href={business.latitude && business.longitude ? `https://waze.com/ul?ll=${business.latitude},${business.longitude}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(destRaw)}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted transition-colors" title="Waze">
            <img src="https://www.waze.com/favicon.ico" alt="Waze" className="h-6 w-6 object-contain" />
          </a>
          <a href={business.latitude && business.longitude ? `https://maps.apple.com/?daddr=${business.latitude},${business.longitude}&dirflg=${appleDirFlag}` : `https://maps.apple.com/?daddr=${encodeURIComponent(destRaw)}&dirflg=${appleDirFlag}`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted transition-colors" title="Apple Plans">
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
