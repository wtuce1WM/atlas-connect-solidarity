/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Loader2, Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { isInMoroccoBounds } from "@/lib/geoBounds";

interface MapBusiness {
  id: string;
  name: string;
  city: string;
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  main_category?: string | null;
  categories?: string[] | null;
  latitude: number | null;
  longitude: number | null;
  wtuce_status?: string | null;
  logo_url?: string | null;
  neighborhood?: string | null;
  images?: string[] | null;
  hook_fr?: string | null;
  computed_rating?: number | null;
  total_review_count?: number | null;
}

interface BusinessMapProps {
  businesses?: MapBusiness[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  isLoading?: boolean;
  forceOverview?: boolean;
  /** When set, only markers within ~50km of this point are shown (filters out national-scope businesses physically elsewhere) */
  cityCenter?: { lat: number; lng: number } | null;
  /** When set, only markers within ~1km of this point are shown (neighborhood-level filtering) */
  neighborhoodCenter?: { lat: number; lng: number } | null;
  /** Callback when user clicks "Voir la fiche" in the InfoWindow */
  onBusinessClick?: (business: MapBusiness) => void;
  /** Override default map styles (e.g. beige theme matching POI map) */
  mapStyles?: google.maps.MapTypeStyle[];
}

declare global {
  interface Window {
    google: any;
  }
}

/* ── Google Maps loader (shared with LocationPickerDialog) ── */
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
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,marker`;
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

/* ── Marker SVG builder ── */
function markerSvgUrl(isVerified: boolean): string {
  const color = isVerified ? "#D4AF37" : "#3b82f6";
  const border = isVerified ? "#B8860B" : "#2563eb";
  const badge = isVerified
    ? `<circle cx="20" cy="6" r="6" fill="#D4AF37" stroke="white" stroke-width="1.5"/><text x="20" y="9" text-anchor="middle" fill="white" font-size="8" font-weight="bold">✓</text>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <path d="M14 0 C6.268 0 0 6.268 0 14 C0 24.5 14 40 14 40 S28 24.5 28 14 C28 6.268 21.732 0 14 0Z" fill="${color}" stroke="${border}" stroke-width="1"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
    ${badge}
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/* ── InfoWindow HTML ── */
function infoHtml(b: MapBusiness, hasClickHandler: boolean): string {
  const isVerified = b.wtuce_status === "verified";
  const subcategory = b.categories?.[0] || b.main_category || "";
  const thumbnail = b.images?.[0] || "";

  // Build review info from computed fields
  const ratingOn20 = b.computed_rating;
  const reviewCount = b.total_review_count;
  let starsHtml = "";
  if (ratingOn20) {
    starsHtml = `<div style="font-size:11px;color:#D4AF37;margin-bottom:4px;">
      <span style="font-weight:600;">★ ${Number(ratingOn20).toFixed(1)}/20</span>
      ${reviewCount ? `<span style="color:#888;font-size:10px;margin-left:4px;">(${reviewCount} avis)</span>` : ""}
    </div>`;
  }

  const actionBtn = hasClickHandler
    ? `<button data-business-id="${b.id}" style="flex:1;padding:6px 0;border-radius:6px;background:#D4AF37;color:white;font-size:11px;font-weight:600;border:none;cursor:pointer;">Voir la fiche →</button>`
    : `<a href="/business/${b.id}" style="flex:1;padding:6px 0;border-radius:6px;background:#D4AF37;color:white;font-size:11px;font-weight:600;text-decoration:none;text-align:center;display:block;">Voir la fiche →</a>`;

  return `<div style="min-width:220px;max-width:280px;font-family:system-ui,sans-serif;overflow:hidden;">
    ${thumbnail ? `<div style="width:100%;height:120px;overflow:hidden;border-radius:8px;margin-bottom:8px;">
      <img src="${thumbnail}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.style.display='none'" />
    </div>` : ""}
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
      <span style="font-weight:700;font-size:13px;color:#1a1a1a;flex:1;">${b.name}</span>
      ${isVerified ? `<span style="display:inline-flex;align-items:center;gap:2px;padding:1px 6px;border-radius:9999px;background:#D4AF37;color:white;font-size:9px;font-weight:600;flex-shrink:0;">✓</span>` : ""}
    </div>
    ${subcategory ? `<div style="font-size:11px;color:#D4AF37;font-weight:500;margin-bottom:2px;">${subcategory}</div>` : ""}
    ${starsHtml}
    <div style="font-size:10px;color:#888;margin-bottom:6px;">📍 ${b.city}${b.neighborhood ? ` · ${b.neighborhood}` : ""}</div>
    <div style="display:flex;gap:6px;">
      ${actionBtn}
      <button data-directions-id="${b.id}" style="flex:1;padding:6px 0;border-radius:6px;background:#f3f4f6;color:#333;font-size:11px;font-weight:500;border:none;cursor:pointer;">Itinéraire →</button>
    </div>
  </div>`;
}

/* ── Component ── */
/* Haversine approx distance in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const BusinessMap = ({
  businesses: externalBusinesses,
  center,
  zoom = 6,
  height = "500px",
  isLoading: externalLoading,
  forceOverview = false,
  cityCenter = null,
  neighborhoodCenter = null,
  onBusinessClick,
  mapStyles,
}: BusinessMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapShellRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const rippleOverlayRef = useRef<google.maps.OverlayView | null>(null);
  const rippleDivRef = useRef<HTMLDivElement | null>(null);
  const lastFingerprintRef = useRef<string>("");
  const markerOpenedAtRef = useRef<number>(0);

  const [internalBusinesses, setInternalBusinesses] = useState<MapBusiness[]>([]);
  const [internalLoading, setInternalLoading] = useState(!externalBusinesses);
  const [gmapsReady, setGmapsReady] = useState(false);
  const [gmapsError, setGmapsError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const businesses = externalBusinesses || internalBusinesses;
  const isLoading = externalLoading ?? internalLoading;

  // Load Google Maps API
  useEffect(() => {
    loadGoogleMaps()
      .then(() => setGmapsReady(true))
      .catch(() => setGmapsError(true));
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === mapShellRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const shell = mapShellRef.current;
    if (!shell) return;
    if (document.fullscreenElement === shell) {
      await document.exitFullscreen();
      return;
    }
    await shell.requestFullscreen();
  };

  // Fetch all businesses if none provided
  useEffect(() => {
    if (externalBusinesses) return;
    const fetchAll = async () => {
      setInternalLoading(true);
      const { data } = await supabase
        .from("businesses")
        .select("id, name, city, address, phone, whatsapp, main_category, categories, latitude, longitude, wtuce_status, logo_url, neighborhood")
        .eq("is_active", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      if (data) setInternalBusinesses(data as MapBusiness[]);
      setInternalLoading(false);
    };
    fetchAll();
  }, [externalBusinesses]);

  const geoBusinesses = useMemo(() => {
    const MAX_CITY_RADIUS_KM = 60;
    const MAX_NEIGHBORHOOD_RADIUS_KM = 1;
    const withCoordinates = businesses.filter((b) => {
      if (b.latitude == null || b.longitude == null) return false;
      // Only show markers within Morocco's bounding box
      if (b.latitude < 21 || b.latitude > 36.5 || b.longitude < -17.5 || b.longitude > -1) return false;
      // When a neighborhood center is known, use tight 1km radius
      if (neighborhoodCenter) {
        const dist = haversineKm(neighborhoodCenter.lat, neighborhoodCenter.lng, b.latitude, b.longitude);
        if (dist > MAX_NEIGHBORHOOD_RADIUS_KM) return false;
      } else if (cityCenter) {
        // When a city center is known, exclude markers too far from it
        const dist = haversineKm(cityCenter.lat, cityCenter.lng, b.latitude, b.longitude);
        if (dist > MAX_CITY_RADIUS_KM) return false;
      }
      return true;
    });
    const uniqueById = new Map<string, MapBusiness>();
    for (const business of withCoordinates) {
      if (!uniqueById.has(business.id)) uniqueById.set(business.id, business);
    }
    return Array.from(uniqueById.values());
  }, [businesses, cityCenter, neighborhoodCenter]);

  // Fingerprint to force marker rebuild when wtuce_status changes
  const businessFingerprint = useMemo(
    () => geoBusinesses.map(b => `${b.id}:${b.wtuce_status ?? ""}`).join(","),
    [geoBusinesses]
  );

  // Initialize map once gmaps is ready
  useEffect(() => {
    if (!gmapsReady || !mapContainerRef.current || mapRef.current) return;

    const map = new google.maps.Map(mapContainerRef.current, {
      center: center || { lat: 31.63, lng: -7.98 },
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
      gestureHandling: "greedy",
      styles: mapStyles ?? [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    });

    mapRef.current = map;
    infoWindowRef.current = new google.maps.InfoWindow();

    // Create ripple overlay for selected marker
    const rippleDiv = document.createElement("div");
    rippleDiv.style.cssText = "position:absolute;pointer-events:none;display:none;";
    rippleDiv.innerHTML = `
      <style>
        @keyframes gmapRipple {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
        .gmap-ripple-ring {
          position: absolute; top: 50%; left: 50%; width: 28px; height: 28px;
          margin-left: -14px; margin-top: -14px; border-radius: 50%;
          border: 2px solid; animation: gmapRipple 2.4s ease-out infinite;
        }
      </style>
      <div class="gmap-ripple-ring" style="border-color:#EA4335;animation-delay:0s"></div>
      <div class="gmap-ripple-ring" style="border-color:#34A853;animation-delay:0.6s"></div>
      <div class="gmap-ripple-ring" style="border-color:#FBBC05;animation-delay:1.2s"></div>
    `;
    rippleDivRef.current = rippleDiv;

    class RippleOverlay extends google.maps.OverlayView {
      private pos: google.maps.LatLng | null = null;
      private div: HTMLDivElement;
      constructor(div: HTMLDivElement) { super(); this.div = div; }
      setPosition(p: google.maps.LatLng) { this.pos = p; this.div.style.display = "block"; this.draw(); }
      hide() { this.div.style.display = "none"; this.pos = null; }
      onAdd() { this.getPanes()?.overlayLayer.appendChild(this.div); }
      draw() {
        if (!this.pos) return;
        const proj = this.getProjection();
        if (!proj) return;
        const pt = proj.fromLatLngToDivPixel(this.pos);
        if (!pt) return;
        this.div.style.left = pt.x + "px";
        this.div.style.top = (pt.y - 20) + "px"; // offset to marker center
      }
      onRemove() { this.div.parentNode?.removeChild(this.div); }
    }

    const overlay = new RippleOverlay(rippleDiv);
    overlay.setMap(map);
    rippleOverlayRef.current = overlay;

    // Hide ripple when infoWindow is closed
    infoWindowRef.current.addListener("closeclick", () => {
      (overlay as any).hide();
    });

    return () => {
      overlay.setMap(null);
      mapRef.current = null;
    };
  }, [gmapsReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setOptions({ fullscreenControl: false });
  }, [gmapsReady]);

  // Update markers when businesses change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isLoading || !gmapsReady) return;

    // Skip rebuild if businesses haven't actually changed
    if (businessFingerprint === lastFingerprintRef.current && markersRef.current.length > 0) return;
    lastFingerprintRef.current = businessFingerprint;

    // Clear previous
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }

    const infoWindow = infoWindowRef.current!;
    const markers: google.maps.Marker[] = [];

    for (const b of geoBusinesses) {
      const isVerified = b.wtuce_status === "verified";
      const marker = new google.maps.Marker({
        position: { lat: b.latitude!, lng: b.longitude! },
        icon: {
          url: markerSvgUrl(isVerified),
          scaledSize: new google.maps.Size(28, 40),
          anchor: new google.maps.Point(14, 40),
        },
        title: b.name,
      });

      // Store verified status for cluster renderer
      (marker as any)._isVerified = isVerified;

      marker.addListener("click", () => {
        markerOpenedAtRef.current = Date.now();
        infoWindow.setContent(infoHtml(b, !!onBusinessClick));
        infoWindow.open(map, marker);

        // Attach click handlers inside InfoWindow
        google.maps.event.addListenerOnce(infoWindow, "domready", () => {
          // "Voir la fiche" button
          if (onBusinessClick) {
            const btn = document.querySelector(`button[data-business-id="${b.id}"]`);
            if (btn) {
              btn.addEventListener("click", (e) => {
                e.preventDefault();
                // Ignore the synthetic "ghost click" that follows the marker tap on touch devices
                if (Date.now() - markerOpenedAtRef.current < 500) return;
                onBusinessClick(b);
              });
            }
          }
          // "Itinéraire" button — use window.open to avoid ERR_BLOCKED_BY_RESPONSE
          const dirBtn = document.querySelector(`button[data-directions-id="${b.id}"]`);
          if (dirBtn) {
            dirBtn.addEventListener("click", (e) => {
              e.preventDefault();
              if (Date.now() - markerOpenedAtRef.current < 500) return;
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}`, "_blank");
            });
          }
        });

        // Show ripple on selected marker
        const overlay = rippleOverlayRef.current as any;
        if (overlay && marker.getPosition()) {
          overlay.setPosition(marker.getPosition()!);
        }
      });

      markers.push(marker);
    }

    markersRef.current = markers;

    // Cluster with custom renderer
    const clusterer = new MarkerClusterer({
      map,
      markers,
      renderer: {
        render({ count, position, markers: clusterMarkers }) {
          const hasVerified = clusterMarkers?.some((m: any) => (m as any)._isVerified);
          const size = count < 10 ? 36 : count < 50 ? 44 : 52;
          const bg = hasVerified
            ? "linear-gradient(135deg, #D4AF37, #B8860B)"
            : "linear-gradient(135deg, #3b82f6, #2563eb)";

          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <defs>
              <linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${hasVerified ? "#D4AF37" : "#3b82f6"}"/>
                <stop offset="100%" style="stop-color:${hasVerified ? "#B8860B" : "#2563eb"}"/>
              </linearGradient>
            </defs>
            <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="url(#cg)" stroke="white" stroke-width="2"/>
            <text x="${size / 2}" y="${size / 2 + 4}" text-anchor="middle" fill="white" font-size="${count < 10 ? 12 : 14}" font-weight="700">${count}</text>
          </svg>`;

          return new google.maps.Marker({
            position,
            icon: {
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
              scaledSize: new google.maps.Size(size, size),
              anchor: new google.maps.Point(size / 2, size / 2),
            },
            zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
          });
        },
      },
    });

    clustererRef.current = clusterer;

    // Fit bounds — prefer fitBounds whenever markers are available
    if (forceOverview) {
      // No city selected: show all of Morocco centered
      map.setCenter({ lat: 29.5, lng: -7.5 });
      map.setZoom(5);
    } else if (geoBusinesses.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      geoBusinesses.forEach((b) => bounds.extend({ lat: b.latitude!, lng: b.longitude! }));
      map.fitBounds(bounds, 40);
      // Cap zoom
      const listener = google.maps.event.addListener(map, "idle", () => {
        if ((map.getZoom() || 0) > 14) map.setZoom(14);
        google.maps.event.removeListener(listener);
      });
    } else if (center) {
      map.setCenter(center);
      map.setZoom(zoom);
    } else {
      map.setCenter({ lat: 31.63, lng: -7.98 });
      map.setZoom(6);
    }
  }, [geoBusinesses, businessFingerprint, isLoading, gmapsReady, center, zoom, forceOverview]);

  if (gmapsError) {
    return (
      <div className="flex items-center justify-center bg-muted/30 rounded-xl text-sm text-muted-foreground" style={{ height }}>
        Impossible de charger Google Maps
      </div>
    );
  }

  if (isLoading || !gmapsReady) {
    return (
      <div className="flex items-center justify-center rounded-xl" style={{ height, backgroundColor: "#e5e3df" }}>
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  const verifiedCount = geoBusinesses.filter((b) => b.wtuce_status === "verified").length;

  return (
    <div ref={mapShellRef} className="relative rounded-xl overflow-hidden border border-border shadow-sm">
      <style>{`
        .gm-style .gm-fullscreen-control { display: none !important; }
        .gm-style .gm-ui-hover-effect {
          background: #000 !important;
          border-radius: 9999px !important;
          opacity: 1 !important;
          width: 28px !important;
          height: 28px !important;
          top: 6px !important;
          right: 6px !important;
}
        .gm-style .gm-ui-hover-effect > span {
          background-color: #fff !important;
          margin: 6px !important;
          width: 16px !important;
          height: 16px !important;
        }
      `}</style>
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute right-3 top-14 z-20 rounded-md border border-border bg-background/90 p-2 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-accent"
        title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
        aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>

      {/* Stats bar */}
      <div className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-md border border-border">
        <span className="font-semibold text-foreground">{geoBusinesses.length}</span> établissements sur la carte
        {verifiedCount > 0 && (
          <span className="ml-2">
            dont <span className="font-semibold" style={{ color: "#D4AF37" }}>{verifiedCount}</span> vérifiés
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px] text-muted-foreground shadow-md border border-border flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#D4AF37" }} />
          Vérifié ({verifiedCount})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#3b82f6" }} />
          Standard ({geoBusinesses.length - verifiedCount})
        </span>
      </div>

      <div ref={mapContainerRef} style={{ height, width: "100%" }} />
    </div>
  );
};

export default BusinessMap;
