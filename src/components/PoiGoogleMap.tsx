/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState, useMemo } from "react";
import { Loader2, Maximize2, Minimize2, Plus, Minus } from "lucide-react";
import goldPinUrl from "@/assets/location-pin-gold.webp";

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
  subcategories?: string[] | null;
  /** Custom marker colors (bg, text, border) for special pins */
  markerColor?: { bg: string; fg: string; border: string };
}

interface PoiGoogleMapProps {
  pois: PoiMapItem[];
  selectedPoiId: string | null;
  /** Highlight-only id (e.g. hover from list). Does NOT trigger map pan/zoom. */
  hoveredPoiId?: string | null;
  onPoiClick?: (poiId: string) => void;
  center?: { lat: number; lng: number };
  subcategoryIconMap?: Record<string, string>;
  /** When true, fitBounds on markers instead of forcing center */
  fitToMarkers?: boolean;
  /** Overrides the default padding used by fitToMarkers (px). */
  fitPadding?: { top: number; right: number; bottom: number; left: number };
  /** Custom highlight color for the selected marker (default: dark) */
  highlightColor?: { bg: string; fg: string; border: string };
  /** When provided, draws a terracotta dot at the user's geolocation. */
  userLocation?: { lat: number; lng: number } | null;
  /** Label shown on the user geolocation marker. Defaults to "Vous êtes ici". */
  userMarkerLabel?: string;
  /** Visual theme for the map tiles.
   * "light" (default) → 1WM beige palette. "dark" → 1WM dark palette.
   * "default-light" / "default-dark" → native Google Maps color scheme (no custom styles). */
  mapTheme?: "light" | "dark" | "default-light" | "default-dark";
  /** When true, shows native map type control (Plan/Satellite/Relief) + Traffic/Transit toggle buttons. */
  showLayerControls?: boolean;
  /** Optional hex color (e.g. "#EFE6D8") overriding the light theme base/landscape color (widgets only). */
  baseColor?: string | null;
  /** When provided, centers the map so the `center` marker sits at this ratio from the bottom of the viewport (0 = bottom, 0.5 = middle, 1 = top). Overrides fitToMarkers. */
  centerAtBottomRatio?: number;
  /** Base map type: "roadmap" (plan), "satellite" or "terrain" (relief). Default is terrain. */
  mapTypeId?: "roadmap" | "satellite" | "terrain";
  /** When provided together with centerAtBottomRatio, the zoom adjusts so this radius (km) around `center` fits the viewport. */
  fitRadiusKm?: number | null;
  /** Point de référence pour la distance affichée dans la vignette (ex. marqueur Master). Prioritaire sur la géoloc utilisateur. */
  distanceOrigin?: { lat: number; lng: number } | null;
  /** Trace une flèche rouge animée entre deux points, avec l'étiquette de distance au milieu. */
  connector?: {
    from: { lat: number; lng: number };
    to: { lat: number; lng: number };
    label?: string;
  } | null;
}



const LIGHT_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels.text", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", elementType: "labels.icon", stylers: [{ visibility: "on" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#e8f0e3" }] },
  { featureType: "poi.park", elementType: "labels.text", stylers: [{ visibility: "on" }, { color: "#7a8a6e" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "transit.station", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "geometry", stylers: [{ color: "#ECD6B8" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a7a63" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ECD6B8" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#ECD6B8" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#E5CDAB" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#FBF1E1" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#DCC4A1" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#FBF1E1" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#D4B98F" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#FBF1E1" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#F6E8D0" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#b5b5b5" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d9e8f0" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#a8c0cc" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#1c1510" }] },
];

/** Shifts a hex color's lightness by `amount` (-255..255) — used to derive roads/landmass tints. */
const shadeHex = (hex: string, amount: number): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) + amount);
  const g = clamp(((n >> 8) & 255) + amount);
  const b = clamp((n & 255) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

/** Light theme with a custom base color (widget embeds). */
const buildLightStylesWithBase = (base: string): google.maps.MapTypeStyle[] => {
  const manMade = shadeHex(base, -12);
  const road = shadeHex(base, 18);
  const roadStroke = shadeHex(base, -22);
  const roadLocal = shadeHex(base, 8);
  return LIGHT_MAP_STYLES.map((s) => {
    const key = `${s.featureType || ""}|${s.elementType || ""}`;
    const override: Record<string, string> = {
      "|geometry": base,
      "|labels.text.stroke": base,
      "landscape|geometry": base,
      "landscape.man_made|geometry": manMade,
      "road|geometry": road,
      "road|geometry.stroke": roadStroke,
      "road.highway|geometry": road,
      "road.highway|geometry.stroke": roadStroke,
      "road.arterial|geometry": road,
      "road.local|geometry": roadLocal,
    };
    const color = override[key];
    return color ? { ...s, stylers: [{ color }] } : s;
  });
};

// Dark 1WM palette — deep neutral base with warm terracotta/gold accents for roads & labels
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels.text", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", elementType: "labels.icon", stylers: [{ visibility: "on" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#1f2a1e" }] },
  { featureType: "poi.park", elementType: "labels.text", stylers: [{ visibility: "on" }, { color: "#6b7a5e" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "transit.station", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  // Base geometry — deep neutral
  { elementType: "geometry", stylers: [{ color: "#1a1512" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#c9b58f" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1512" }] },
  // Landscape
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#1a1512" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#241c17" }] },
  // Roads — warm terracotta-tinted for readability on dark
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#3a2d24" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#4a3a2e" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4a3a2e" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#5c4636" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#3a2d24" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#2b2219" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a7a63" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  // Water — deep muted blue
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f1a24" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a6272" }] },
  // Administrative
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#d4af37" }] },
];

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
  pulse: (direction: 1 | -1) => void;
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
      highlightColor?: { bg: string; fg: string; border: string },
    ) {
      super();
      this.position = new gmaps.LatLng(position.lat, position.lng);
      this.name = name;
      this.iconSvg = iconSvg;
      this.highlighted = highlighted;
      this.customColor = customColor;
      this.highlightColor = highlightColor;
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
      this.div.addEventListener("mouseenter", () => { this.setHighlighted(true); this._onMouseOver?.(); });
      this.div.addEventListener("mouseleave", () => { this.setHighlighted(false); this._onMouseOut?.(); });
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

    /** Petit effet de resize (zoom-in / zoom-out) sur le marqueur. */
    pulse(direction: 1 | -1) {
      const el = this.div;
      if (!el) return;
      const base = this.highlighted ? 1.08 : 1;
      const peak = base * (direction > 0 ? 1.24 : 0.8);
      el.style.transition = "transform 0.22s cubic-bezier(0.34,1.56,0.64,1)";
      el.style.transform = `translate(-50%,-100%) scale(${peak})`;
      window.setTimeout(() => {
        if (!this.div) return;
        this.div.style.transition = "transform 0.28s cubic-bezier(0.34,1.56,0.64,1)";
        this.div.style.transform = `translate(-50%,-100%) scale(${base})`;
      }, 200);
    }


    private applyStyle() {
      if (!this.div) return;
      const hlc = this.highlightColor;
      const bg = this.customColor ? this.customColor.bg : (this.highlighted && hlc ? hlc.bg : (this.highlighted ? "#000000" : "#ffffff"));
      const fg = this.customColor ? this.customColor.fg : (this.highlighted && hlc ? hlc.fg : (this.highlighted ? "#ffffff" : "#1a1a1a"));
      const border = this.customColor ? this.customColor.border : (this.highlighted && hlc ? hlc.border : (this.highlighted ? "#000000" : "#d1d5db"));
      const shadow = this.highlighted
        ? "0 2px 8px rgba(0,0,0,0.4)"
        : "0 1px 4px rgba(0,0,0,0.15)";
      const scale = this.highlighted ? "scale(1.08)" : "scale(1)";
      const isUserMarker = this.customColor?.bg === "#C04F17" && this.customColor?.border === "#C04F17";
      const z = isUserMarker ? "2000" : (this.customColor ? "999" : (this.highlighted ? "1000" : "1"));

      this.div.style.cssText = `
      position:absolute;
      transform:translate(-50%,-100%) ${scale};
      transition:transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
      display:flex;flex-direction:column;align-items:center;gap:0;
      cursor:pointer;z-index:${z};
    `;

      const iconHtml = this.iconSvg
        ? `<span style="display:flex;align-items:center;flex-shrink:0;opacity:0.9;">${this.iconSvg}</span>`
        : "";
      const shortName = this.name.length > 22 ? this.name.slice(0, 20) + "…" : this.name;

      const pinFill = this.customColor ? this.customColor.bg : "#000000";
      const pinHtml = (this.highlighted || this.customColor)
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 384 512" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));margin-bottom:-2px;"><path fill="${pinFill}" d="M192 0C86 0 0 86 0 192c0 144 192 320 192 320s192-176 192-320C384 86 298 0 192 0zm0 272c-44.2 0-80-35.8-80-80s35.8-80 80-80 80 35.8 80 80-35.8 80-80 80z"/></svg>`
        : "";

      const labelHtml = `<div style="
        display:flex;align-items:center;gap:4px;
        background:${bg};color:${fg};
        border:1.5px solid ${border};
        border-radius:6px;padding:3px 8px 3px 5px;
        font-family:system-ui,-apple-system,sans-serif;
        font-size:11px;font-weight:600;
        white-space:nowrap;
        box-shadow:${shadow};
        line-height:1.2;
      ">${iconHtml}<span>${shortName}</span></div>`;

      this.div.innerHTML = `${pinHtml}${labelHtml}`;
      this.draw();
    }
  };

const PoiGoogleMap = ({ pois, selectedPoiId, hoveredPoiId, onPoiClick, center, subcategoryIconMap, fitToMarkers, fitPadding, highlightColor, userLocation, userMarkerLabel, mapTheme, showLayerControls, baseColor, centerAtBottomRatio, mapTypeId, fitRadiusKm, connector, distanceOrigin }: PoiGoogleMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapShellRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<Map<string, LabelMarkerOverlay>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const userMarkerRef = useRef<LabelMarkerOverlay | null>(null);
  const [ready, setReady] = useState(false);
  const hasFittedRef = useRef(false);
  const [iconCache, setIconCache] = useState<Map<string, string>>(new Map());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [trafficOn, setTrafficOn] = useState(false);
  const [transitOn, setTransitOn] = useState(false);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const transitLayerRef = useRef<google.maps.TransitLayer | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoWindowHoveredRef = useRef(false);
  const openInfoPoiIdRef = useRef<string | null>(null);
  const userLocationRef = useRef(userLocation);
  useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
  const distanceOriginRef = useRef(distanceOrigin);
  useEffect(() => { distanceOriginRef.current = distanceOrigin; }, [distanceOrigin]);

  // Current center ref for anchored zoom handlers (avoids stale closures)
  const centerRef = useRef(center);
  useEffect(() => { centerRef.current = center; }, [center]);

  // Zoom helper shared by wheel, dblclick and zoom buttons
  const applyAnchoredZoomRef = useRef<(newZoom: number) => void>(() => {});

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

  const userMovedRef = useRef(false);

  const isNativeTheme = mapTheme === "default-light" || mapTheme === "default-dark";

  // Convertit la position verticale voulue du marqueur en latitude de centre.
  // Le calcul est fait avant `new Map` : aucune correction/pan après le premier rendu.
  const centerLatForMarkerPosition = (lat: number, zoom: number, markerOffsetFromCenterPx: number) => {
    const siny = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
    const worldY = 128 - 0.5 * Math.log((1 + siny) / (1 - siny)) * (128 / Math.PI);
    // screenY(marker) = worldY(marker) - worldY(center) + viewportCenter.
    const newWorldY = worldY - markerOffsetFromCenterPx / Math.pow(2, zoom);
    const n = Math.PI - (2 * Math.PI * newWorldY) / 256;
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  };

  // Init map
  useEffect(() => {
    const gmaps = window.google?.maps;
    if (!ready || !gmaps || !containerRef.current || mapRef.current) return;
    // En mode décalé, ne jamais construire la carte sur un centre de secours :
    // attendre les coordonnées du Master garantit la bonne position dès la 1re frame.
    if (centerAtBottomRatio != null && !center) return;
    const initZoom = 13;
    let initCenter = center || { lat: 31.63, lng: -7.98 };
    if (center && centerAtBottomRatio != null && centerAtBottomRatio >= 0 && centerAtBottomRatio <= 1) {
      const height = containerRef.current.clientHeight || 0;
      if (height > 0) {
        const markerOffsetFromCenterPx = (0.5 - centerAtBottomRatio) * height;
        initCenter = {
          lat: centerLatForMarkerPosition(center.lat, initZoom, markerOffsetFromCenterPx),
          lng: center.lng,
        };
      }
    }
    const opts: google.maps.MapOptions = {
      center: initCenter,
      zoom: initZoom,
      mapTypeControl: !!showLayerControls,
      mapTypeControlOptions: showLayerControls
        ? {
            style: gmaps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: gmaps.ControlPosition.BOTTOM_LEFT,
            mapTypeIds: [
              gmaps.MapTypeId.ROADMAP,
              gmaps.MapTypeId.SATELLITE,
            ],
          }
        : undefined,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      scrollwheel: false,
      disableDoubleClickZoom: true,
      gestureHandling: "greedy",
      clickableIcons: false,
    };
    if (isNativeTheme) {
      // Native Google Maps color scheme (only honored at construction time).
      (opts as any).colorScheme = mapTheme === "default-dark" ? "DARK" : "LIGHT";
      opts.styles = [];
    } else {
      opts.styles = mapTheme === "dark"
        ? DARK_MAP_STYLES
        : baseColor
          ? buildLightStylesWithBase(baseColor)
          : LIGHT_MAP_STYLES;
    }
    mapRef.current = new gmaps.Map(containerRef.current, opts);
    // disableAutoPan : survoler un POI excentré ne doit jamais déplacer la carte.
    infoWindowRef.current = new gmaps.InfoWindow({ disableAutoPan: true });

    // Zoom helper: keep the Master marker at the same screen pixel while zooming
    applyAnchoredZoomRef.current = (newZoom: number) => {
      const map = mapRef.current;
      if (!map || !gmaps) return;
      const currentZoom = map.getZoom() ?? 13;
      if (newZoom === currentZoom) return;
      const anchor = centerRef.current;
      const currentCenter = map.getCenter();
      if (!anchor || !currentCenter) {
        map.setZoom(newZoom);
        return;
      }
      const projection = map.getProjection();
      if (!projection) {
        map.setZoom(newZoom);
        return;
      }
      const anchorWorld = projection.fromLatLngToPoint(new gmaps.LatLng(anchor.lat, anchor.lng));
      const centerWorld = projection.fromLatLngToPoint(currentCenter);
      const scaleFactor = Math.pow(2, currentZoom - newZoom);
      const newCenterWorld = new gmaps.Point(
        anchorWorld.x + (centerWorld.x - anchorWorld.x) * scaleFactor,
        anchorWorld.y + (centerWorld.y - anchorWorld.y) * scaleFactor,
      );
      map.setZoom(newZoom);
      map.setCenter(projection.fromPointToLatLng(newCenterWorld));
    };

    // Wheel / trackpad pinch zoom — anchored on the Master marker
    const handleWheel = (e: WheelEvent) => {
      const isZoomGesture = e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX);
      if (!isZoomGesture) return;
      e.preventDefault();
      const map = mapRef.current;
      if (!map) return;
      // Geste utilisateur : plus aucun recentrage automatique sur le Master.
      userMovedRef.current = true;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const currentZoom = map.getZoom() ?? 13;
      const deltaZoom = -dy * 0.0018;
      const newZoom = Math.max(4, Math.min(20, Math.round((currentZoom + deltaZoom) * 10) / 10));
      applyAnchoredZoomRef.current(newZoom);
    };

    // Double-click zoom — also anchored on the Master marker
    const handleDblClick = (e: MouseEvent) => {
      e.preventDefault();
      const map = mapRef.current;
      if (!map) return;
      userMovedRef.current = true;
      const currentZoom = map.getZoom() ?? 13;
      applyAnchoredZoomRef.current(Math.min(20, currentZoom + 1));
    };

    // Dès que l'utilisateur déplace la carte, on abandonne le recentrage automatique.
    const markUserMoved = () => { userMovedRef.current = true; };
    mapRef.current.addListener("dragstart", markUserMoved);

    const container = containerRef.current;
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("dblclick", handleDblClick, { passive: false });

    mapRef.current.addListener("click", () => {
      openInfoPoiIdRef.current = null;
      infoWindowRef.current?.close();
    });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("dblclick", handleDblClick);
    };
  }, [ready, center, centerAtBottomRatio]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setOptions({ fullscreenControl: false });
  }, [ready]);

  // Un changement de rayon (pill « À proximité ») est une intention explicite :
  // on réautorise un recentrage/zoom sur le Master.
  useEffect(() => {
    userMovedRef.current = false;
  }, [fitRadiusKm]);

  // Bascule du type de carte (plan / satellite / relief) sans reconstruire la carte.
  useEffect(() => {
    const gmaps = window.google?.maps;
    const map = mapRef.current;
    if (!gmaps || !map) return;
    const mapTypeIds = {
      roadmap: gmaps.MapTypeId.ROADMAP,
      satellite: gmaps.MapTypeId.SATELLITE,
      terrain: gmaps.MapTypeId.TERRAIN,
    };
    map.setMapTypeId(mapTypeIds[mapTypeId] || gmaps.MapTypeId.ROADMAP);
  }, [mapTypeId, ready]);

  // Flèche rouge animée + distance entre deux marqueurs (Master ↔ POI par défaut).
  const connectorRef = useRef<{ line: any; label: any; timer: any } | null>(null);
  useEffect(() => {
    const gmaps = window.google?.maps;
    const map = mapRef.current;
    if (!gmaps || !map) return;

    const clear = () => {
      if (!connectorRef.current) return;
      clearInterval(connectorRef.current.timer);
      connectorRef.current.line?.setMap(null);
      connectorRef.current.label?.setMap(null);
      connectorRef.current = null;
    };
    clear();
    if (!connector) return;

    const path = [
      new gmaps.LatLng(connector.from.lat, connector.from.lng),
      new gmaps.LatLng(connector.to.lat, connector.to.lng),
    ];
    const line = new gmaps.Polyline({
      map,
      path,
      geodesic: true,
      strokeColor: "#E11D48",
      strokeOpacity: 0,
      zIndex: 60,
      icons: [
        {
          icon: { path: "M 0,-1 0,1", strokeColor: "#E11D48", strokeOpacity: 1, strokeWeight: 3, scale: 3 },
          offset: "0",
          repeat: "16px",
        },
        {
          icon: {
            path: gmaps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 4,
            strokeColor: "#E11D48",
            fillColor: "#E11D48",
            fillOpacity: 1,
            strokeWeight: 1,
          },
          offset: "100%",
        },
      ],
    });

    let step = 0;
    const timer = setInterval(() => {
      step = (step + 2) % 200;
      const icons = line.get("icons");
      icons[0].offset = `${step / 2}%`;
      line.set("icons", icons);
    }, 60);

    let label: any = null;
    if (connector.label) {
      const mid = new gmaps.LatLng(
        (connector.from.lat + connector.to.lat) / 2,
        (connector.from.lng + connector.to.lng) / 2,
      );
      label = new gmaps.Marker({
        map,
        position: mid,
        zIndex: 61,
        clickable: false,
        icon: {
          path: gmaps.SymbolPath.CIRCLE,
          scale: 0,
          fillOpacity: 0,
          strokeOpacity: 0,
        },
        label: {
          text: connector.label,
          color: "#E11D48",
          fontSize: "13px",
          fontWeight: "700",
          className: "poi-connector-label",
        } as any,
      });
    }

    connectorRef.current = { line, label, timer };
    return clear;
  }, [connector?.from.lat, connector?.from.lng, connector?.to.lat, connector?.to.lng, connector?.label, ready]);




  // Swap tile styles live when theme changes (only for 1WM styled themes;
  // native colorScheme is fixed at construction — parent must remount via key prop).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isNativeTheme) return;
    map.setOptions({
      styles: mapTheme === "dark"
        ? DARK_MAP_STYLES
        : baseColor
          ? buildLightStylesWithBase(baseColor)
          : LIGHT_MAP_STYLES,
    });
  }, [mapTheme, ready, isNativeTheme, baseColor]);


  // Traffic / Transit layer toggles
  useEffect(() => {
    const gmaps = window.google?.maps;
    const map = mapRef.current;
    if (!gmaps || !map) return;
    if (trafficOn) {
      if (!trafficLayerRef.current) trafficLayerRef.current = new gmaps.TrafficLayer();
      trafficLayerRef.current.setMap(map);
    } else if (trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null);
    }
  }, [trafficOn, ready]);

  useEffect(() => {
    const gmaps = window.google?.maps;
    const map = mapRef.current;
    if (!gmaps || !map) return;
    if (transitOn) {
      if (!transitLayerRef.current) transitLayerRef.current = new gmaps.TransitLayer();
      transitLayerRef.current.setMap(map);
    } else if (transitLayerRef.current) {
      transitLayerRef.current.setMap(null);
    }
  }, [transitOn, ready]);


  // Serialized key to detect when pois/center actually change (not just iconCache)
  const poisKey = useMemo(() => {
    const ids = pois.map(p => p.id).sort().join(",");
    const c = center ? `${center.lat},${center.lng}` : "";
    // Le marqueur "Vous êtes ici" ne doit pas influencer le centrage quand on force
    // un centrage sur le marqueur master (centerAtBottomRatio).
    const u = centerAtBottomRatio != null ? "" : (userLocation ? `${userLocation.lat},${userLocation.lng}` : "");
    const r = centerAtBottomRatio != null ? String(centerAtBottomRatio) : "";
    return `${ids}|${c}|${u}|${r}`;
  }, [pois, center, userLocation, centerAtBottomRatio]);

  // Track whether we need to re-fit bounds (only when pois/center change, not iconCache)
  const needsFitRef = useRef(true);
  const prevPoisKeyRef = useRef("");
  if (prevPoisKeyRef.current !== poisKey) {
    prevPoisKeyRef.current = poisKey;
    needsFitRef.current = true;
  }

  // Stable ref for callbacks so overlays don't need recreation on every render
  const onPoiClickRef = useRef(onPoiClick);
  onPoiClickRef.current = onPoiClick;

  // Cross-fade opacity when markers change
  const [mapOpacity, setMapOpacity] = useState(1);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPoisIdsRef = useRef<string>("");

  useEffect(() => {
    const ids = pois.filter(p => p.latitude && p.longitude).map(p => p.id).sort().join(",");
    if (prevPoisIdsRef.current && prevPoisIdsRef.current !== ids) {
      // New set of markers — trigger cross-fade
      setMapOpacity(0);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = setTimeout(() => setMapOpacity(1), 80);
    }
    prevPoisIdsRef.current = ids;
  }, [pois]);

  // Create/update label markers incrementally to avoid flicker
  useEffect(() => {
    const map = mapRef.current;
    const gmaps = window.google?.maps;
    if (!map || !gmaps) return;
    const LabelMarker = createLabelMarkerClass(gmaps);

    const currentIds = new Set(pois.filter(p => p.latitude && p.longitude).map(p => p.id));
    const existingIds = new Set(overlaysRef.current.keys());

    // Remove markers no longer in the list
    existingIds.forEach(id => {
      if (!currentIds.has(id)) {
        overlaysRef.current.get(id)?.setMap(null);
        overlaysRef.current.delete(id);
      }
    });

    const bounds = new gmaps.LatLngBounds();
    let hasPoints = false;

    pois.forEach((poi) => {
      if (!poi.latitude || !poi.longitude) return;
      hasPoints = true;
      const position = { lat: poi.latitude, lng: poi.longitude };
      bounds.extend(position);

      // Skip if marker already exists
      if (overlaysRef.current.has(poi.id)) return;

      const iconName = poi.subcategory && subcategoryIconMap
        ? subcategoryIconMap[poi.subcategory]
        : undefined;
      const iconSvg = iconName ? (iconSvgCache.get(iconName) || "") : "";

      const isSelected = poi.id === selectedPoiId;

      const showInfo = () => {
        // Cancel any pending close
        if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
        infoWindowHoveredRef.current = false;
        openInfoPoiIdRef.current = poi.id;

        const img = poi.images?.[0];
        const loc = `${poi.city || ""}${poi.neighborhood ? ` · ${poi.neighborhood}` : ""}`;
        const ratingHtml = poi.avgOn20
          ? `<div style="display:flex;align-items:center;gap:4px;font-size:13px;">
              <span style="color:#D4AF37;">★</span>
              <span style="font-weight:600;">${poi.avgOn20}/20</span>
              ${poi.totalReviews ? `<span style="color:rgba(255,255,255,0.7);">· ${poi.totalReviews} avis</span>` : ""}
            </div>`
          : "";
        const currentUserLoc = distanceOriginRef.current || userLocationRef.current;
        const distKm = currentUserLoc && poi.latitude && poi.longitude
          ? (() => {
              const R = 6371;
              const dLat = ((poi.latitude! - currentUserLoc.lat) * Math.PI) / 180;
              const dLon = ((poi.longitude! - currentUserLoc.lng) * Math.PI) / 180;
              const a = Math.sin(dLat / 2) ** 2 + Math.cos((currentUserLoc.lat * Math.PI) / 180) * Math.cos((poi.latitude! * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
              return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            })()
          : null;
        const distHtml = distKm != null
          ? `<div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.6);color:#D4AF37;font-size:11px;font-weight:600;padding:2px 6px;border-radius:4px;backdrop-filter:blur(4px);white-space:nowrap;">${distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`}</div>`
          : "";
        const html = `<div data-poi-id="${poi.id}" style="width:260px;font-family:system-ui,sans-serif;overflow:hidden;border-radius:10px;position:relative;cursor:pointer;">
          ${img ? `<img src="${img}" style="width:100%;height:180px;display:block;object-fit:cover;" />` : ""}
          <div style="background:linear-gradient(to top,rgba(0,0,0,0.75),rgba(0,0,0,0.2));position:absolute;bottom:0;left:0;right:0;padding:10px;">
            <div style="font-weight:700;font-size:14px;color:white;line-height:1.3;">${poi.name}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:3px;">${loc}</div>
            ${ratingHtml ? `<div style="margin-top:3px;color:white;">${ratingHtml}</div>` : ""}
          </div>
          ${distHtml}
        </div>`;
        infoWindowRef.current?.setContent(html);
        // Ancrage dynamique de l'infobulle : au-dessus par défaut, en dessous si le POI
        // est près du haut, et décalage horizontal si elle dépasse d'un bord (padding 12px).
        const IW_W = 268;
        const IW_H = img ? 200 : 90;
        const PAD = 12;
        let offX = 0;
        let offY = -50;
        try {
          const proj = map.getProjection();
          const c = map.getCenter();
          const cw = containerRef.current?.clientWidth || 0;
          const ch = containerRef.current?.clientHeight || 0;
          if (proj && c && cw && ch) {
            const scale = Math.pow(2, map.getZoom() ?? 13);
            const wp = proj.fromLatLngToPoint(new gmaps.LatLng(position.lat, position.lng));
            const wc = proj.fromLatLngToPoint(c);
            const px = (wp.x - wc.x) * scale + cw / 2;
            const py = (wp.y - wc.y) * scale + ch / 2;
            // Vertical : bascule en dessous si pas la place au-dessus.
            if (py - IW_H - 50 < PAD) offY = IW_H + 60;
            // Horizontal : recentrage dans les bords.
            const left = px - IW_W / 2;
            const right = px + IW_W / 2;
            if (left < PAD) offX = PAD - left;
            else if (right > cw - PAD) offX = cw - PAD - right;
          }
        } catch { /* projection indisponible : offsets par défaut */ }
        infoWindowRef.current?.setOptions({ pixelOffset: new gmaps.Size(offX, offY), disableAutoPan: true });

        infoWindowRef.current?.setPosition(position);
        infoWindowRef.current?.open(map);
        // Make infowindow clickable + hoverable
        gmaps.event.addListenerOnce(infoWindowRef.current!, "domready", () => {
          const el = document.querySelector(`[data-poi-id="${poi.id}"]`);
          if (el) {
            (el as HTMLElement).addEventListener("click", () => {
              openInfoPoiIdRef.current = null;
              infoWindowRef.current?.close();
              onPoiClickRef.current?.(poi.id);
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
      };

      const overlay = new LabelMarker(
        position,
        map,
        poi.name,
        iconSvg,
        isSelected,
        () => {
          const isTouch = typeof window !== "undefined" && !window.matchMedia?.("(hover: hover)").matches;
          if (isTouch && openInfoPoiIdRef.current !== poi.id) {
            // First tap on touch devices: show the thumbnail instead of navigating
            showInfo();
            return;
          }
          openInfoPoiIdRef.current = null;
          infoWindowRef.current?.close();
          onPoiClickRef.current?.(poi.id);
        },
        showInfo,
        () => {
          // Delayed close to allow cursor to reach infowindow
          closeTimerRef.current = setTimeout(() => {
            if (!infoWindowHoveredRef.current) {
              infoWindowRef.current?.close();
            }
          }, 300);
        },
        poi.markerColor,
        highlightColor,
      );

      overlaysRef.current.set(poi.id, overlay);
    });

    // En mode Master décalé, le seul centrage a déjà été calculé dans les options
    // de construction de la carte. Aucun fitBounds/setCenter/pan ne doit le remplacer.
    const hasCenterOffset = centerAtBottomRatio != null && center != null && centerAtBottomRatio >= 0 && centerAtBottomRatio <= 1;

    // L'utilisateur a navigué : on laisse la vue telle qu'il l'a laissée.
    if (hasCenterOffset && userMovedRef.current) {
      needsFitRef.current = false;
      hasFittedRef.current = true;
      return;
    }

    if (hasCenterOffset) {

      needsFitRef.current = false;
      hasFittedRef.current = true;
      // Position unique et invariante : le Master reste à `centerAtBottomRatio`
      // du bas, quels que soient les filtres (POI / catégories / rayon).
      const height = containerRef.current?.clientHeight || 0;
      const width = containerRef.current?.clientWidth || 0;
      let z = map.getZoom() ?? 13;
      // Le rayon du pill « À proximité » pilote le zoom : le cercle doit tenir
      // dans le viewport, au-dessus et autour du marqueur Master.
      if (fitRadiusKm && fitRadiusKm > 0 && height > 0 && width > 0 && center) {
        const availablePx = Math.max(
          40,
          Math.min(width / 2, height * Math.max(centerAtBottomRatio!, 0.15)) - 24,
        );
        const metersPerPixelAtZ0 = 156543.03392 * Math.cos((center.lat * Math.PI) / 180);
        const target = Math.log2((metersPerPixelAtZ0 * availablePx) / (fitRadiusKm * 1000));
        z = Math.max(4, Math.min(18, Math.round(target * 2) / 2));
        map.setZoom(z);
      }
      if (height > 0 && center) {
        const markerOffsetFromCenterPx = (0.5 - centerAtBottomRatio!) * height;
        map.setCenter({
          lat: centerLatForMarkerPosition(center.lat, z, markerOffsetFromCenterPx),
          lng: center.lng,
        });
      }
      return;

    }


    // In fitToMarkers mode, fit strictly to result markers so all are visible.
    // Otherwise also include center/userLocation in the bounds.
    if (!(fitToMarkers && hasPoints)) {
      if (center) bounds.extend(center);
    }
    // Always include userLocation so the "Vous êtes ici" marker stays in view
    if (userLocation) bounds.extend(userLocation);

    // Only fitBounds when pois/center actually changed, not on iconCache updates
    if ((hasPoints || center) && needsFitRef.current) {
      needsFitRef.current = false;
      gmaps.event.trigger(map, "resize");
      // Use generous padding when fitting to markers so labels aren't clipped
      const padding = fitToMarkers
        ? (fitPadding ?? { top: 120, right: 120, bottom: 120, left: 160 })
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
  }, [pois, ready, center, iconCache, userLocation, centerAtBottomRatio, fitToMarkers, fitRadiusKm]);

  // Update overlay highlighting when selectedPoiId changes
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const activeId = hoveredPoiId || selectedPoiId || null;
    overlaysRef.current.forEach((overlay, id) => {
      const isSelected = id === activeId;
      const isLastHovered = !activeId && id === prevSelectedRef.current;
      overlay.setHighlighted(isSelected || isLastHovered);
    });
    if (activeId) {
      prevSelectedRef.current = activeId;
    }
  }, [selectedPoiId, hoveredPoiId]);

  // Keep city centered when a city center is provided (skip in fitToMarkers mode,
  // et surtout quand centerAtBottomRatio impose l'unique critère de centrage).
  useEffect(() => {
    if (!mapRef.current || !center || fitToMarkers) return;
    if (centerAtBottomRatio != null) return;
    mapRef.current.setCenter(center);
  }, [center, fitToMarkers, centerAtBottomRatio]);

  // User geolocation marker — same label style as POI markers, terracotta color
  useEffect(() => {
    const map = mapRef.current;
    const gmaps = window.google?.maps;
    if (!map || !gmaps) return;
    // Remove previous marker (we re-create to update position simply)
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }
    if (!userLocation) return;
    const LabelMarker = createLabelMarkerClass(gmaps);
    const navIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="#ffffff"/></svg>`;
    userMarkerRef.current = new LabelMarker(
      { lat: userLocation.lat, lng: userLocation.lng },
      map,
      userMarkerLabel || "Vous êtes ici",
      navIcon,
      false,
      undefined,
      undefined,
      undefined,
      { bg: "#C04F17", fg: "#ffffff", border: "#C04F17" },
      undefined,
    );
    // fitBounds already includes the user location together with the POIs,
    // so the marker stays visible without overriding the framing.
  }, [userLocation, ready, userMarkerLabel]);

  // Smooth pan + zoom to selected poi — speed & easing adapt to distance/zoom delta
  useEffect(() => {
    // L'overlay BookOnline impose le Master comme unique critère de centrage.
    if (centerAtBottomRatio != null) return;
    if (!mapRef.current || !selectedPoiId) return;
    const poi = pois.find((p) => p.id === selectedPoiId);
    if (!poi?.latitude || !poi?.longitude) return;

    // Wait for initial fitBounds to complete before animating
    if (!hasFittedRef.current) {
      const waitForFit = setInterval(() => {
        if (hasFittedRef.current) {
          clearInterval(waitForFit);
          // Re-trigger by forcing a state update isn't needed — just run inline
          doAnimateToPoi(poi);
        }
      }, 100);
      const timeout = setTimeout(() => clearInterval(waitForFit), 3000);
      return () => { clearInterval(waitForFit); clearTimeout(timeout); };
    }

    doAnimateToPoi(poi);
  }, [selectedPoiId, pois, centerAtBottomRatio]);

  const animateRafRef = useRef<number | null>(null);
  const doAnimateToPoi = useRef((poi: PoiMapItem) => {
    const map = mapRef.current;
    if (!map || !poi.latitude || !poi.longitude) return;
    if (animateRafRef.current) cancelAnimationFrame(animateRafRef.current);
    const target = { lat: poi.latitude, lng: poi.longitude };
    const startCenter = map.getCenter();
    if (!startCenter) { map.panTo(target); return; }

    const startLat = startCenter.lat();
    const startLng = startCenter.lng();
    const startZoom = map.getZoom() || 12;
    const dLat = target.lat - startLat;
    const dLng = target.lng - startLng;
    const distance = Math.sqrt(dLat * dLat + dLng * dLng);
    const isFar = distance >= 0.5;

    const targetZoom = Math.max(startZoom, isFar ? 13 : 14);
    const zoomDelta = Math.abs(targetZoom - startZoom);

    const baseDuration = isFar
      ? Math.min(1200 + distance * 3000, 3500)
      : distance < 0.005
        ? 500
        : Math.min(600 + distance * 8000, 1800);
    const zoomBonus = zoomDelta * 120;
    const DURATION = Math.round(Math.min(baseDuration + zoomBonus, 4000));

    const posEase = distance < 0.005
      ? (t: number) => 1 - Math.pow(1 - t, 3)
      : (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const cruiseZoom = isFar
      ? Math.min(startZoom, targetZoom) - Math.min(3 + distance * 8, 6)
      : startZoom;
    const minCruise = Math.max(cruiseZoom, 5);

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      const t = posEase(progress);
      const lat = startLat + dLat * t;
      const lng = startLng + dLng * t;
      let zoom: number;
      if (isFar) {
        const zoomDip = Math.sin(progress * Math.PI);
        const linearZoom = startZoom + (targetZoom - startZoom) * progress;
        const dipAmount = linearZoom - minCruise;
        zoom = linearZoom - dipAmount * zoomDip;
      } else {
        zoom = startZoom + (targetZoom - startZoom) * t;
      }
      map.moveCamera({ center: { lat, lng }, zoom });
      if (progress < 1) {
        animateRafRef.current = requestAnimationFrame(animate);
      }
    };
    animateRafRef.current = requestAnimationFrame(animate);
  }).current;

  const zoomIn = () => {
    const map = mapRef.current;
    if (!map) return;
    const currentZoom = map.getZoom() ?? 13;
    applyAnchoredZoomRef.current(Math.min(20, currentZoom + 1));
  };

  const zoomOut = () => {
    const map = mapRef.current;
    if (!map) return;
    const currentZoom = map.getZoom() ?? 13;
    applyAnchoredZoomRef.current(Math.max(4, currentZoom - 1));
  };

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-map-surface">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <>
      <style>{`.gm-style { background-color: hsl(var(--map-surface)) !important; } .gm-style .gm-style-iw-chr { display: none !important; } .gm-style .gm-style-iw { padding: 0 !important; background: transparent !important; box-shadow: none !important; border-radius: 10px !important; } .gm-style .gm-style-iw-d { overflow: hidden !important; background: transparent !important; } .gm-style .gm-style-iw-tc { display: none !important; } .gm-style .gm-style-iw-t::after { display: none !important; } .gm-style .gm-fullscreen-control { display: none !important; } .gm-style .gm-bundled-control button[aria-label*="location" i], .gm-style .gm-bundled-control button[aria-label*="position" i], .gm-style .gm-bundled-control button[title*="location" i], .gm-style button.gm-control-active[draggable="false"][aria-label] { display: none !important; } .gm-style .gmnoprint[role="menubar"] ~ .gmnoprint:not([role]) { display: none !important; }`}</style>
      <div ref={mapShellRef} className="relative h-full w-full overflow-hidden bg-map-surface" style={{ opacity: mapOpacity, transition: "opacity 0.25s ease-in-out" }}>
        <div ref={containerRef} className="h-full w-full bg-map-surface" />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1">
          <button
            type="button"
            onClick={zoomIn}
            className="flex items-center justify-center w-8 h-8 rounded bg-white/90 backdrop-blur-sm shadow-lg ring-1 ring-black/10 text-black/80 hover:text-black hover:bg-white transition-colors"
            aria-label="Zoomer"
            title="Zoomer"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={zoomOut}
            className="flex items-center justify-center w-8 h-8 rounded bg-white/90 backdrop-blur-sm shadow-lg ring-1 ring-black/10 text-black/80 hover:text-black hover:bg-white transition-colors"
            aria-label="Dézoomer"
            title="Dézoomer"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
        {showLayerControls && (
          <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-[1px] rounded-sm overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.3)]" style={{ fontFamily: "Roboto, Arial, sans-serif" }}>
            <button
              type="button"
              onClick={() => setTrafficOn((v) => !v)}
              className="px-3 py-[6px] text-[11px] font-medium bg-white hover:bg-gray-50 transition-colors"
              style={{ color: trafficOn ? "#1a73e8" : "#5f6368" }}
              aria-pressed={trafficOn}
              title="Trafic"
            >
              Trafic
            </button>
            <button
              type="button"
              onClick={() => setTransitOn((v) => !v)}
              className="px-3 py-[6px] text-[11px] font-medium bg-white hover:bg-gray-50 transition-colors"
              style={{ color: transitOn ? "#1a73e8" : "#5f6368" }}
              aria-pressed={transitOn}
              title="Transports en commun"
            >
              Transports
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default PoiGoogleMap;
