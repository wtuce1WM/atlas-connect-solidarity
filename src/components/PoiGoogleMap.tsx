/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from "react";
import { Loader2, Maximize2, Minimize2 } from "lucide-react";

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
  /** Custom marker colors (bg, text, border) for special pins */
  markerColor?: { bg: string; fg: string; border: string };
}

interface PoiGoogleMapProps {
  pois: PoiMapItem[];
  selectedPoiId: string | null;
  onPoiClick?: (poiId: string) => void;
  center?: { lat: number; lng: number };
  subcategoryIconMap?: Record<string, string>;
  /** When true, fitBounds on markers instead of forcing center */
  fitToMarkers?: boolean;
  /** Custom highlight color for the selected marker (default: dark) */
  highlightColor?: { bg: string; fg: string; border: string };
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
    .replace(/([a-zA-Z])(\d)/g, "$1-$2")
    .replace(/(\d)([a-zA-Z])/g, "$1-$2")
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
    private customColor?: { bg: string; fg: string; border: string };
    private highlightColor?: { bg: string; fg: string; border: string };
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
      customColor?: { bg: string; fg: string; border: string },
    ) {
      super();
      this.position = new gmaps.LatLng(position.lat, position.lng);
      this.name = name;
      this.iconSvg = iconSvg;
      this.highlighted = highlighted;
      this.customColor = customColor;
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
      const bg = this.customColor ? this.customColor.bg : (this.highlighted ? "#1a1a1a" : "#ffffff");
      const fg = this.customColor ? this.customColor.fg : (this.highlighted ? "#ffffff" : "#1a1a1a");
      const border = this.customColor ? this.customColor.border : (this.highlighted ? "#1a1a1a" : "#d1d5db");
      const shadow = this.highlighted
        ? "0 2px 8px rgba(0,0,0,0.4)"
        : "0 1px 4px rgba(0,0,0,0.15)";
      const scale = this.highlighted ? "scale(1.08)" : "scale(1)";
      const z = this.customColor ? "999" : (this.highlighted ? "1000" : "1");

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

const PoiGoogleMap = ({ pois, selectedPoiId, onPoiClick, center, subcategoryIconMap, fitToMarkers, highlightColor }: PoiGoogleMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapShellRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<Map<string, LabelMarkerOverlay>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [ready, setReady] = useState(false);
  const hasFittedRef = useRef(false);
  const [iconCache, setIconCache] = useState<Map<string, string>>(new Map());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoWindowHoveredRef = useRef(false);

  // Load Google Maps
  useEffect(() => {
    loadGoogleMaps().then(() => setReady(true)).catch(console.error);
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
    const gmaps = window.google?.maps;
    if (!ready || !gmaps || !containerRef.current || mapRef.current) return;
    mapRef.current = new gmaps.Map(containerRef.current, {
      center: center || { lat: 31.63, lng: -7.98 },
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      gestureHandling: "greedy",
      styles: [
        { elementType: "geometry", stylers: [{ color: "#1d1d1d" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1d1d1d" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#6b6b6b" }] },
        { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#333333" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c2c" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#555555" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3a3a" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e0e0e" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
        { featureType: "poi", elementType: "geometry", stylers: [{ color: "#252525" }] },
        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#555555" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1a2e1a" }] },
        { featureType: "transit", elementType: "geometry", stylers: [{ color: "#252525" }] },
        { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#1d1d1d" }] },
      ],
    });
    infoWindowRef.current = new gmaps.InfoWindow();
  }, [ready, center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setOptions({ fullscreenControl: false });
  }, [ready]);

  // Create/update label markers when pois change
  useEffect(() => {
    const map = mapRef.current;
    const gmaps = window.google?.maps;
    if (!map || !gmaps) return;
    const LabelMarker = createLabelMarkerClass(gmaps);

    // Clear old overlays
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current.clear();
    hasFittedRef.current = false;

    const bounds = new gmaps.LatLngBounds();
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
          infoWindowRef.current?.setOptions({ pixelOffset: new gmaps.Size(0, -30) });
          infoWindowRef.current?.setPosition(position);
          infoWindowRef.current?.open(map);
          // Make infowindow clickable + hoverable
          gmaps.event.addListenerOnce(infoWindowRef.current!, "domready", () => {
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
        poi.markerColor,
      );

      overlaysRef.current.set(poi.id, overlay);
    });

    if (center) bounds.extend(center);

    if (hasPoints || center) {
      gmaps.event.trigger(map, "resize");
      // Use generous padding when fitting to markers so labels aren't clipped
      const padding = fitToMarkers
        ? { top: 60, right: 60, bottom: 60, left: 100 }
        : 40;
      map.fitBounds(bounds, padding);
      gmaps.event.addListenerOnce(map, "idle", () => {
        const z = map.getZoom();
        if (z && z > 16) map.setZoom(16);
        // Only force city center when not in fitToMarkers mode
        if (center && !(fitToMarkers && hasPoints)) map.setCenter(center);
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

  // Keep city centered when a city center is provided (skip in fitToMarkers mode)
  useEffect(() => {
    if (!mapRef.current || !center || fitToMarkers) return;
    mapRef.current.setCenter(center);
  }, [center, fitToMarkers]);

  // Smooth pan + zoom to selected poi — speed & easing adapt to distance/zoom delta
  useEffect(() => {
    if (!mapRef.current || !selectedPoiId) return;
    const poi = pois.find((p) => p.id === selectedPoiId);
    if (!poi?.latitude || !poi?.longitude) return;

    const map = mapRef.current;
    const target = { lat: poi.latitude, lng: poi.longitude };
    const startCenter = map.getCenter();
    if (!startCenter) { map.panTo(target); return; }

    const startLat = startCenter.lat();
    const startLng = startCenter.lng();
    const startZoom = map.getZoom() || 12;
    // Compute geographic distance (degrees) to calibrate animation
    const dLat = target.lat - startLat;
    const dLng = target.lng - startLng;
    const distance = Math.sqrt(dLat * dLat + dLng * dLng);
    const isFar = distance >= 0.5;

    const targetZoom = Math.max(startZoom, isFar ? 13 : 14);
    const zoomDelta = Math.abs(targetZoom - startZoom);

    // Adaptive duration: short for nearby pans, longer for big jumps
    const baseDuration = isFar
      ? Math.min(1200 + distance * 3000, 3500)
      : distance < 0.005
        ? 500
        : Math.min(600 + distance * 8000, 1800);
    const zoomBonus = zoomDelta * 120;
    const DURATION = Math.round(Math.min(baseDuration + zoomBonus, 4000));

    // Adaptive easing for position: snappy close, smooth mid
    const posEase = distance < 0.005
      ? (t: number) => 1 - Math.pow(1 - t, 3) // ease-out cubic
      : (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // ease-in-out cubic

    // For far distances: "fly" zoom curve — zoom out to a cruise altitude then back down
    // Cruise altitude = midpoint zoom between current and a pulled-back level
    const cruiseZoom = isFar
      ? Math.min(startZoom, targetZoom) - Math.min(3 + distance * 8, 6) // pull back 3-6 zoom levels
      : startZoom;
    const minCruise = Math.max(cruiseZoom, 5); // never go below zoom 5

    const startTime = performance.now();
    let rafId: number;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      const t = posEase(progress);

      const lat = startLat + dLat * t;
      const lng = startLng + dLng * t;

      let zoom: number;
      if (isFar) {
        // Parabolic zoom: zoom out during first half, zoom in during second half
        // z(t) = startZoom + (minCruise - startZoom) * up(t) + (targetZoom - minCruise) * down(t)
        // Simplified: use a sine-based curve that dips in the middle
        const zoomDip = Math.sin(progress * Math.PI); // 0→1→0 bell curve
        const linearZoom = startZoom + (targetZoom - startZoom) * progress;
        const dipAmount = linearZoom - minCruise;
        zoom = linearZoom - dipAmount * zoomDip;
      } else {
        zoom = startZoom + (targetZoom - startZoom) * t;
      }

      map.moveCamera({ center: { lat, lng }, zoom });

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
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
      <style>{`.gm-style .gm-style-iw-chr { display: none !important; } .gm-style .gm-style-iw { padding: 0 !important; } .gm-style .gm-style-iw-d { overflow: hidden !important; } .gm-style .gm-fullscreen-control { display: none !important; } .gm-style .gm-bundled-control button[aria-label*="location" i], .gm-style .gm-bundled-control button[aria-label*="position" i], .gm-style .gm-bundled-control button[title*="location" i], .gm-style button.gm-control-active[draggable="false"][aria-label] { display: none !important; } .gm-style .gmnoprint[role="menubar"] ~ .gmnoprint:not([role]) { display: none !important; }`}</style>
      <div ref={mapShellRef} className="relative w-full h-full">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </>
  );
};

export default PoiGoogleMap;
