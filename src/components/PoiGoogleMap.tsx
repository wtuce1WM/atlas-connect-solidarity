/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export interface PoiMapItem {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  images?: string[] | null;
  city?: string | null;
  neighborhood?: string | null;
}

interface PoiGoogleMapProps {
  pois: PoiMapItem[];
  selectedPoiId: string | null;
  onPoiClick?: (poiId: string) => void;
  center?: { lat: number; lng: number };
}

/* ── Google Maps loader (reuses shared singleton) ── */
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

function markerSvgUrl(isSelected: boolean): string {
  const color = isSelected ? "#ef4444" : "#D4AF37";
  const border = isSelected ? "#b91c1c" : "#B8860B";
  const size = isSelected ? 36 : 28;
  const h = isSelected ? 50 : 40;
  const r = isSelected ? 8 : 6;
  const cy = size / 2;
  const cx = size / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 ${size} ${h}">
    <path d="M${cx} 0 C${cx * 0.45} 0 0 ${cx * 0.45} 0 ${cx} C0 ${h * 0.6125} ${cx} ${h} ${cx} ${h} S${size} ${h * 0.6125} ${size} ${cx} C${size} ${cx * 0.45} ${cx * 1.55} 0 ${cx} 0Z" fill="${color}" stroke="${border}" stroke-width="1.5"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="white"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const PoiGoogleMap = ({ pois, selectedPoiId, onPoiClick, center }: PoiGoogleMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [ready, setReady] = useState(false);

  // Load Google Maps
  useEffect(() => {
    loadGoogleMaps().then(() => setReady(true)).catch(console.error);
  }, []);

  // Init map
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    mapRef.current = new google.maps.Map(containerRef.current, {
      center: center || { lat: 31.63, lng: -7.98 },
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
    });
    infoWindowRef.current = new google.maps.InfoWindow();
  }, [ready]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    pois.forEach((poi) => {
      if (!poi.latitude || !poi.longitude) return;
      hasPoints = true;
      const isSelected = poi.id === selectedPoiId;
      const position = { lat: poi.latitude, lng: poi.longitude };
      bounds.extend(position);

      const marker = new google.maps.Marker({
        position,
        map,
        title: poi.name,
        icon: {
          url: markerSvgUrl(isSelected),
          scaledSize: new google.maps.Size(isSelected ? 36 : 28, isSelected ? 50 : 40),
          anchor: new google.maps.Point(isSelected ? 18 : 14, isSelected ? 50 : 40),
        },
        zIndex: isSelected ? 1000 : 1,
      });

      marker.addListener("mouseover", () => {
        const img = poi.images?.[0];
        const html = `<div style="min-width:160px;max-width:220px;font-family:system-ui,sans-serif;">
          ${img ? `<img src="${img}" style="width:100%;height:80px;object-fit:cover;border-radius:6px 6px 0 0;" />` : ""}
          <div style="padding:8px;">
            <div style="font-weight:700;font-size:13px;">${poi.name}</div>
            <div style="font-size:11px;color:#666;margin-top:2px;">${poi.city || ""}${poi.neighborhood ? ` · ${poi.neighborhood}` : ""}</div>
          </div>
        </div>`;
        infoWindowRef.current?.setContent(html);
        infoWindowRef.current?.open(map, marker);
      });

      marker.addListener("mouseout", () => {
        infoWindowRef.current?.close();
      });

      marker.addListener("click", () => {
        map.setZoom(16);
        map.panTo(position);
        onPoiClick?.(poi.id);
      });

      markersRef.current.push(marker);
    });

    if (center) {
      bounds.extend(center);
    }

    if (hasPoints || center) {
      google.maps.event.trigger(map, "resize");
      map.fitBounds(bounds, 40);
      google.maps.event.addListenerOnce(map, "idle", () => {
        const z = map.getZoom();
        if (z && z > 16) map.setZoom(16);
        if (center) map.setCenter(center);
      });
    }
  }, [pois, selectedPoiId, ready, center]);

  // Keep city centered when a city center is provided
  useEffect(() => {
    if (!mapRef.current || !center) return;
    mapRef.current.setCenter(center);
  }, [center]);

  // Pan to selected (only when no forced city center)
  useEffect(() => {
    if (!mapRef.current || !selectedPoiId || center) return;
    const poi = pois.find((p) => p.id === selectedPoiId);
    if (poi?.latitude && poi?.longitude) {
      mapRef.current.panTo({ lat: poi.latitude, lng: poi.longitude });
    }
  }, [selectedPoiId, pois, center]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
};

export default PoiGoogleMap;
