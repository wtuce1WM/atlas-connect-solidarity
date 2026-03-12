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
  rating?: number | null;
  avgOn20?: number | null;
  totalReviews?: number;
  subcategory?: string | null;
}

interface PoiGoogleMapProps {
  pois: PoiMapItem[];
  selectedPoiId: string | null;
  onPoiClick?: (poiId: string) => void;
  center?: { lat: number; lng: number };
  subcategoryIconMap?: Record<string, string>;
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

/* ── Lucide icon SVG cache ── */
const iconSvgCache = new Map<string, string>();
function toKebabCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

async function fetchLucideIcon(name: string): Promise<string> {
  if (iconSvgCache.has(name)) return iconSvgCache.get(name)!;
  const kebab = toKebabCase(name);
  try {
    const res = await fetch(`https://unpkg.com/lucide-static@latest/icons/${kebab}.svg`);
    if (!res.ok) throw new Error("not found");
    let svg = await res.text();
    // Make it small and white
    svg = svg.replace(/<svg /, '<svg width="14" height="14" ');
    iconSvgCache.set(name, svg);
    return svg;
  } catch {
    iconSvgCache.set(name, "");
    return "";
  }
}

/* ── Custom Label Overlay ── */
type LabelMarkerOverlay = google.maps.OverlayView & {
  setHighlighted: (val: boolean) => void;
};

const createLabelMarkerClass = (gmaps: typeof google.maps) =>
  class LabelMarker extends gmaps.OverlayView {
    private div: HTMLDivElement | null = null;
    private position: google.maps.LatLng;
    private name: string;
    private iconSvg: string;
    private highlighted: boolean;
    private _onClick?: () => void;
    private _onMouseOver?: () => void;
    private _onMouseOut?: () => void;

    constructor(
      position: google.maps.LatLngLiteral,
      map: google.maps.Map,
      name: string,
      iconSvg: string,
      highlighted: boolean,
      onClick?: () => void,
      onMouseOver?: () => void,
      onMouseOut?: () => void,
    ) {
      super();
      this.position = new gmaps.LatLng(position.lat, position.lng);
      this.name = name;
      this.iconSvg = iconSvg;
      this.highlighted = highlighted;
      this._onClick = onClick;
      this._onMouseOver = onMouseOver;
      this._onMouseOut = onMouseOut;
      this.setMap(map);
    }

    onAdd() {
      this.div = document.createElement("div");
      this.applyStyle();
      this.div.addEventListener("click", (e) => {
        e.stopPropagation();
        this._onClick?.();
      });
      this.div.addEventListener("mouseenter", () => this._onMouseOver?.());
      this.div.addEventListener("mouseleave", () => this._onMouseOut?.());
      const panes = this.getPanes();
      panes?.overlayMouseTarget.appendChild(this.div);
    }

    draw() {
      if (!this.div) return;
      const proj = this.getProjection();
      if (!proj) return;
      const point = proj.fromLatLngToDivPixel(this.position);
      if (!point) return;
      this.div.style.left = `${point.x}px`;
      this.div.style.top = `${point.y}px`;
    }

    onRemove() {
      if (this.div?.parentNode) {
        this.div.parentNode.removeChild(this.div);
        this.div = null;
      }
    }

    setHighlighted(val: boolean) {
      this.highlighted = val;
      if (this.div) this.applyStyle();
    }

    private applyStyle() {
      if (!this.div) return;
      const bg = this.highlighted ? "#1a1a1a" : "#ffffff";
      const fg = this.highlighted ? "#ffffff" : "#1a1a1a";
      const border = this.highlighted ? "#1a1a1a" : "#d1d5db";
      const shadow = this.highlighted
        ? "0 2px 8px rgba(0,0,0,0.4)"
        : "0 1px 4px rgba(0,0,0,0.15)";
      const scale = this.highlighted ? "scale(1.08)" : "scale(1)";
      const z = this.highlighted ? "1000" : "1";

      this.div.style.cssText = `
      position:absolute;
      transform:translate(-50%,-100%) ${scale};
      transition:transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
      display:flex;align-items:center;gap:4px;
      background:${bg};color:${fg};
      border:1.5px solid ${border};
      border-radius:6px;padding:3px 8px 3px 5px;
      font-family:system-ui,-apple-system,sans-serif;
      font-size:11px;font-weight:600;
      white-space:nowrap;cursor:pointer;
      box-shadow:${shadow};z-index:${z};
      line-height:1.2;
    `;

      const iconHtml = this.iconSvg
        ? `<span style="display:flex;align-items:center;flex-shrink:0;opacity:0.9;">${this.iconSvg}</span>`
        : "";
      const shortName = this.name.length > 22 ? this.name.slice(0, 20) + "…" : this.name;
      this.div.innerHTML = `${iconHtml}<span>${shortName}</span>`;
    }
  };

const PoiGoogleMap = ({ pois, selectedPoiId, onPoiClick, center, subcategoryIconMap }: PoiGoogleMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<Map<string, LabelMarker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [ready, setReady] = useState(false);
  const hasFittedRef = useRef(false);
  const [iconCache, setIconCache] = useState<Map<string, string>>(new Map());
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoWindowHoveredRef = useRef(false);

  // Load Google Maps
  useEffect(() => {
    loadGoogleMaps().then(() => setReady(true)).catch(console.error);
  }, []);

  // Pre-fetch Lucide icons for visible subcategories
  useEffect(() => {
    if (!subcategoryIconMap) return;
    const iconsToFetch = new Set<string>();
    pois.forEach((poi) => {
      if (poi.subcategory) {
        const iconName = subcategoryIconMap[poi.subcategory];
        if (iconName && !iconSvgCache.has(iconName)) iconsToFetch.add(iconName);
      }
    });
    if (iconsToFetch.size === 0) return;
    Promise.all(Array.from(iconsToFetch).map(fetchLucideIcon)).then(() => {
      setIconCache(new Map(iconSvgCache));
    });
  }, [pois, subcategoryIconMap]);

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

  // Create/update label markers when pois change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old overlays
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current.clear();
    hasFittedRef.current = false;

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    pois.forEach((poi) => {
      if (!poi.latitude || !poi.longitude) return;
      hasPoints = true;
      const position = { lat: poi.latitude, lng: poi.longitude };
      bounds.extend(position);

      const iconName = poi.subcategory && subcategoryIconMap
        ? subcategoryIconMap[poi.subcategory]
        : undefined;
      const iconSvg = iconName ? (iconSvgCache.get(iconName) || "") : "";

      const isSelected = poi.id === selectedPoiId;

      const overlay = new LabelMarker(
        position,
        map,
        poi.name,
        iconSvg,
        isSelected,
        () => {
          map.setZoom(16);
          map.panTo(position);
          onPoiClick?.(poi.id);
        },
        () => {
          // Cancel any pending close
          if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
          infoWindowHoveredRef.current = false;

          const img = poi.images?.[0];
          const loc = `${poi.city || ""}${poi.neighborhood ? ` · ${poi.neighborhood}` : ""}`;
          const ratingHtml = poi.avgOn20
            ? `<div style="display:flex;align-items:center;gap:4px;font-size:13px;">
                <span style="color:#D4AF37;">★</span>
                <span style="font-weight:600;">${poi.avgOn20}/20</span>
                ${poi.totalReviews ? `<span style="color:rgba(255,255,255,0.7);">· ${poi.totalReviews} avis</span>` : ""}
              </div>`
            : "";
          const html = `<div data-poi-id="${poi.id}" style="width:260px;font-family:system-ui,sans-serif;overflow:hidden;border-radius:10px;position:relative;cursor:pointer;">
            ${img ? `<img src="${img}" style="width:100%;height:180px;display:block;object-fit:cover;" />` : ""}
            <div style="background:linear-gradient(to top,rgba(0,0,0,0.75),rgba(0,0,0,0.2));position:absolute;bottom:0;left:0;right:0;padding:10px;">
              <div style="font-weight:700;font-size:14px;color:white;line-height:1.3;">${poi.name}</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:3px;">${loc}</div>
              ${ratingHtml ? `<div style="margin-top:3px;color:white;">${ratingHtml}</div>` : ""}
            </div>
          </div>`;
          infoWindowRef.current?.setContent(html);
          infoWindowRef.current?.setOptions({ pixelOffset: new google.maps.Size(0, -30) });
          infoWindowRef.current?.setPosition(position);
          infoWindowRef.current?.open(map);
          // Make infowindow clickable + hoverable
          google.maps.event.addListenerOnce(infoWindowRef.current!, "domready", () => {
            const el = document.querySelector(`[data-poi-id="${poi.id}"]`);
            if (el) {
              (el as HTMLElement).addEventListener("click", () => {
                onPoiClick?.(poi.id);
              });
            }
            // Keep infowindow open while mouse is over it
            const iwContainer = document.querySelector(".gm-style-iw")?.closest(".gm-style-iw-a") 
              || document.querySelector(".gm-style-iw")?.parentElement;
            if (iwContainer) {
              (iwContainer as HTMLElement).addEventListener("mouseenter", () => {
                infoWindowHoveredRef.current = true;
                if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
              });
              (iwContainer as HTMLElement).addEventListener("mouseleave", () => {
                infoWindowHoveredRef.current = false;
                closeTimerRef.current = setTimeout(() => { infoWindowRef.current?.close(); }, 200);
              });
            }
          });
        },
        () => {
          // Delayed close to allow cursor to reach infowindow
          closeTimerRef.current = setTimeout(() => {
            if (!infoWindowHoveredRef.current) {
              infoWindowRef.current?.close();
            }
          }, 300);
        },
      );

      overlaysRef.current.set(poi.id, overlay);
    });

    if (center) bounds.extend(center);

    if (hasPoints || center) {
      google.maps.event.trigger(map, "resize");
      map.fitBounds(bounds, 40);
      google.maps.event.addListenerOnce(map, "idle", () => {
        const z = map.getZoom();
        if (z && z > 16) map.setZoom(16);
        if (center) map.setCenter(center);
        hasFittedRef.current = true;
      });
    }
  }, [pois, ready, center, iconCache]);

  // Update overlay highlighting when selectedPoiId changes
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    overlaysRef.current.forEach((overlay, id) => {
      const isSelected = id === selectedPoiId;
      const isLastHovered = !selectedPoiId && id === prevSelectedRef.current;
      overlay.setHighlighted(isSelected || isLastHovered);
    });
    if (selectedPoiId) {
      prevSelectedRef.current = selectedPoiId;
    }
  }, [selectedPoiId]);

  // Keep city centered when a city center is provided
  useEffect(() => {
    if (!mapRef.current || !center) return;
    mapRef.current.setCenter(center);
  }, [center]);

  // Pan + zoom to selected poi
  useEffect(() => {
    if (!mapRef.current || !selectedPoiId) return;
    const poi = pois.find((p) => p.id === selectedPoiId);
    if (poi?.latitude && poi?.longitude) {
      mapRef.current.panTo({ lat: poi.latitude, lng: poi.longitude });
      const currentZoom = mapRef.current.getZoom();
      if (currentZoom && currentZoom < 15) mapRef.current.setZoom(15);
    }
  }, [selectedPoiId, pois]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <>
      <style>{`.gm-style .gm-style-iw-chr { display: none !important; } .gm-style .gm-style-iw { padding: 0 !important; } .gm-style .gm-style-iw-d { overflow: hidden !important; }`}</style>
      <div ref={containerRef} className="w-full h-full" />
    </>
  );
};

export default PoiGoogleMap;
