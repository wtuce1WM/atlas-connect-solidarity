/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

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
}

interface BusinessMapProps {
  businesses?: MapBusiness[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  isLoading?: boolean;
  forceOverview?: boolean;
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
function infoHtml(b: MapBusiness): string {
  const isVerified = b.wtuce_status === "verified";
  const subcategory = b.categories?.[0] || b.main_category || "";
  const verifiedBadge = isVerified
    ? `<span style="display:inline-flex;align-items:center;gap:2px;padding:1px 6px;border-radius:9999px;background:#D4AF37;color:white;font-size:10px;font-weight:600;">✓ Vérifié</span>`
    : "";

  return `<div style="min-width:180px;max-width:240px;font-family:system-ui,sans-serif;">
    <div style="display:flex;align-items:start;gap:8px;margin-bottom:6px;">
      ${b.logo_url ? `<img src="${b.logo_url}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'" />` : ""}
      <div>
        <a href="/business/${b.id}" style="font-weight:600;font-size:13px;color:#1a1a1a;text-decoration:none;">${b.name}</a>
        ${verifiedBadge}
      </div>
    </div>
    <div style="font-size:11px;color:#666;">
      ${subcategory ? `<div style="color:#D4AF37;font-weight:500;margin-bottom:2px;">${subcategory}</div>` : ""}
      <div>📍 ${b.city}${b.neighborhood ? ` · ${b.neighborhood}` : ""}${b.address ? ` — ${b.address}` : ""}</div>
      ${b.phone ? `<div style="margin-top:2px;"><a href="tel:${b.phone}" style="color:#3b82f6;text-decoration:none;">📞 ${b.phone}</a></div>` : ""}
    </div>
    <div style="margin-top:6px;display:flex;gap:6px;">
      <a href="/business/${b.id}" style="font-size:11px;color:#D4AF37;font-weight:500;text-decoration:none;">Voir la fiche →</a>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}" target="_blank" style="font-size:11px;color:#3b82f6;font-weight:500;text-decoration:none;">Itinéraire →</a>
    </div>
  </div>`;
}

/* ── Component ── */
const BusinessMap = ({
  businesses: externalBusinesses,
  center,
  zoom = 6,
  height = "500px",
  isLoading: externalLoading,
  forceOverview = false,
}: BusinessMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [internalBusinesses, setInternalBusinesses] = useState<MapBusiness[]>([]);
  const [internalLoading, setInternalLoading] = useState(!externalBusinesses);
  const [gmapsReady, setGmapsReady] = useState(false);
  const [gmapsError, setGmapsError] = useState(false);

  const businesses = externalBusinesses || internalBusinesses;
  const isLoading = externalLoading ?? internalLoading;

  // Load Google Maps API
  useEffect(() => {
    loadGoogleMaps()
      .then(() => setGmapsReady(true))
      .catch(() => setGmapsError(true));
  }, []);

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
    const withCoordinates = businesses.filter((b) => b.latitude != null && b.longitude != null);
    const uniqueById = new Map<string, MapBusiness>();
    for (const business of withCoordinates) {
      if (!uniqueById.has(business.id)) uniqueById.set(business.id, business);
    }
    return Array.from(uniqueById.values());
  }, [businesses]);

  // Initialize map once gmaps is ready
  useEffect(() => {
    if (!gmapsReady || !mapContainerRef.current || mapRef.current) return;

    const map = new google.maps.Map(mapContainerRef.current, {
      center: center || { lat: 31.63, lng: -7.98 },
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    });

    mapRef.current = map;
    infoWindowRef.current = new google.maps.InfoWindow();

    return () => {
      mapRef.current = null;
    };
  }, [gmapsReady]);

  // Update markers when businesses change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isLoading || !gmapsReady) return;

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
        infoWindow.setContent(infoHtml(b));
        infoWindow.open(map, marker);
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

    // Fit bounds
    if (forceOverview) {
      // No city selected: show all of Morocco centered
      map.setCenter({ lat: 29.5, lng: -7.5 });
      map.setZoom(5);
    } else if (geoBusinesses.length > 0 && !center) {
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
  }, [geoBusinesses, isLoading, gmapsReady, center, zoom, forceOverview]);

  if (gmapsError) {
    return (
      <div className="flex items-center justify-center bg-muted/30 rounded-xl text-sm text-muted-foreground" style={{ height }}>
        Impossible de charger Google Maps
      </div>
    );
  }

  if (isLoading || !gmapsReady) {
    return (
      <div className="flex items-center justify-center bg-muted/30 rounded-xl" style={{ height }}>
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  const verifiedCount = geoBusinesses.filter((b) => b.wtuce_status === "verified").length;

  return (
    <div className="relative rounded-xl overflow-hidden border border-border shadow-sm">
      {/* Stats bar */}
      <div className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-md border border-border">
        <span className="text-gold font-semibold">{geoBusinesses.length}</span> établissements sur la carte
        {verifiedCount > 0 && (
          <span className="ml-2">
            · <span className="text-gold">★</span> {verifiedCount} vérifiés
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px] text-muted-foreground shadow-md border border-border flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#D4AF37" }} />
          Vérifié WTUCE
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#3b82f6" }} />
          Standard
        </span>
      </div>

      <div ref={mapContainerRef} style={{ height, width: "100%" }} />
    </div>
  );
};

export default BusinessMap;
