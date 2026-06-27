/// <reference types="@types/google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import { X, MapPin, Loader2 } from "lucide-react";

export interface MapPanelBusiness {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  main_category?: string | null;
  categories?: string[] | null;
  latitude: number | null;
  longitude: number | null;
  wtuce_status?: string | null;
  logo_url?: string | null;
  images?: string[] | null;
  hook_fr?: string | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  tripadvisor_rating?: number | null;
  tripadvisor_review_count?: number | null;
  engagements?: string[] | null;
}

interface MapSlidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  businesses: MapPanelBusiness[];
  isMobile?: boolean;
}

const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  marrakech: { lat: 31.6295, lng: -7.9811 },
  essaouira: { lat: 31.5085, lng: -9.7595 },
  agafay: { lat: 31.4500, lng: -8.1500 },
  casablanca: { lat: 33.5731, lng: -7.5898 },
  rabat: { lat: 34.0209, lng: -6.8416 },
  fes: { lat: 34.0181, lng: -5.0078 },
  fès: { lat: 34.0181, lng: -5.0078 },
  tanger: { lat: 35.7595, lng: -5.8340 },
  agadir: { lat: 30.4278, lng: -9.5981 },
  ouarzazate: { lat: 30.9189, lng: -6.8934 },
  chefchaouen: { lat: 35.1689, lng: -5.2636 },
};

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/* Beige map theme (matches /search POI map) */
const BEIGE_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels.text", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", elementType: "labels.icon", stylers: [{ visibility: "on" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#e8f0e3" }] },
  { featureType: "poi.park", elementType: "labels.text", stylers: [{ visibility: "on" }, { color: "#7a8a6e" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
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

/* Google Maps loader (shares the same key endpoint as BusinessMap/PoiGoogleMap) */
let gmapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (gmapsPromise) return gmapsPromise;
  if ((window as any).google?.maps) {
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
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(({ key }) => {
        if (!key) throw new Error("No key returned");
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,marker`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => { gmapsPromise = null; reject(new Error("Failed to load Google Maps")); };
        document.head.appendChild(script);
      })
      .catch((err) => { gmapsPromise = null; reject(err); });
  });
  return gmapsPromise;
}

const MapSlidePanel = ({ open, onClose, title, businesses, isMobile }: MapSlidePanelProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<google.maps.OverlayView[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [ready, setReady] = useState(false);
  const [gmapsError, setGmapsError] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const mapBusinesses = useMemo(() => businesses
    .filter((b) => b.latitude != null && b.longitude != null)
    .filter((b) => {
      const engs: string[] = b.engagements || [];
      return !engs.some((e: string) => {
        const n = e.toLowerCase().trim();
        return n === "web only" || n === "logistique:web only" || n.endsWith(":web only");
      });
    }), [businesses]);

  const cityCenter = useMemo(() => {
    if (!mapBusinesses.length) return null;
    const counts = new Map<string, number>();
    for (const b of mapBusinesses) {
      if (!b.city) continue;
      counts.set(normalize(b.city), (counts.get(normalize(b.city)) || 0) + 1);
    }
    if (!counts.size) return null;
    const [dominant] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    return CITY_CENTERS[dominant] || null;
  }, [mapBusinesses]);

  // Load Google Maps when panel opens
  useEffect(() => {
    if (!open) return;
    loadGoogleMaps().then(() => setReady(true)).catch(() => setGmapsError(true));
  }, [open]);

  // Init / teardown map
  useEffect(() => {
    if (!open || !ready || !containerRef.current || mapRef.current) return;
    const gmaps = (window as any).google.maps as typeof google.maps;
    const map = new gmaps.Map(containerRef.current, {
      center: cityCenter || { lat: 31.63, lng: -7.98 },
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      rotateControl: false,
      scaleControl: false,
      clickableIcons: false,
      gestureHandling: "greedy",
      disableDefaultUI: true,
      styles: BEIGE_MAP_STYLES,
    });
    mapRef.current = map;
    infoWindowRef.current = new gmaps.InfoWindow();
    map.addListener("click", () => infoWindowRef.current?.close());
  }, [open, ready, cityCenter]);

  // Cleanup when panel closes
  useEffect(() => {
    if (open) return;
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];
    infoWindowRef.current?.close();
    infoWindowRef.current = null;
    mapRef.current = null;
    setReady(false);
  }, [open]);

  // Build/refresh markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const gmaps = (window as any).google.maps as typeof google.maps;

    // Clear existing overlays
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    if (mapBusinesses.length === 0) return;

    class ThumbMarker extends gmaps.OverlayView {
      private div: HTMLDivElement | null = null;
      private pos: google.maps.LatLng;
      private biz: MapPanelBusiness;
      constructor(biz: MapPanelBusiness) {
        super();
        this.biz = biz;
        this.pos = new gmaps.LatLng(biz.latitude!, biz.longitude!);
        this.setMap(map);
      }
      onAdd() {
        const b = this.biz;
        const thumb = b.images?.[0] || b.logo_url || "";
        const verified = b.wtuce_status === "verified";
        const short = b.name.length > 22 ? b.name.slice(0, 20) + "…" : b.name;
        const div = document.createElement("div");
        div.style.cssText = "position:absolute;transform:translate(-50%,-100%);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;z-index:1;transition:transform .15s ease;";
        div.innerHTML = `
          <div style="
            position:relative;width:46px;height:46px;border-radius:50%;
            background:${thumb ? `url('${thumb}') center/cover` : "#C04F17"};
            border:3px solid ${verified ? "#D4AF37" : "#ffffff"};
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
            overflow:hidden;
          ">
            ${!thumb ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;">${b.name.charAt(0).toUpperCase()}</div>` : ""}
            ${verified ? `<div style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:#D4AF37;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:1.5px solid #fff;">✓</div>` : ""}
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid #fff;margin-top:-1px;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.25));"></div>
          <div style="
            background:#ffffff;color:#1a1a1a;
            border:1px solid #d1d5db;border-radius:6px;
            padding:2px 6px;font-size:10.5px;font-weight:600;
            white-space:nowrap;line-height:1.2;max-width:140px;overflow:hidden;text-overflow:ellipsis;
            box-shadow:0 1px 3px rgba(0,0,0,0.15);
            font-family:system-ui,-apple-system,sans-serif;
          ">${short}</div>
        `;
        div.addEventListener("mouseenter", () => { div.style.transform = "translate(-50%,-100%) scale(1.08)"; div.style.zIndex = "1000"; });
        div.addEventListener("mouseleave", () => { div.style.transform = "translate(-50%,-100%)"; div.style.zIndex = "1"; });
        div.addEventListener("click", (e) => {
          e.stopPropagation();
          const rating = b.google_rating ?? b.tripadvisor_rating;
          const reviews = b.google_review_count ?? b.tripadvisor_review_count;
          const subcat = b.categories?.[0] || b.main_category || "";
          const html = `
            <div style="min-width:220px;max-width:280px;font-family:system-ui,sans-serif;">
              ${thumb ? `<div style="width:100%;height:120px;overflow:hidden;border-radius:8px;margin-bottom:8px;"><img src="${thumb}" style="width:100%;height:100%;object-fit:cover;"/></div>` : ""}
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                <span style="font-weight:700;font-size:13px;color:#1a1a1a;flex:1;">${b.name}</span>
                ${verified ? `<span style="padding:1px 6px;border-radius:9999px;background:#D4AF37;color:#fff;font-size:9px;font-weight:600;">✓</span>` : ""}
              </div>
              ${subcat ? `<div style="font-size:11px;color:#C04F17;font-weight:500;margin-bottom:2px;">${subcat}</div>` : ""}
              ${rating ? `<div style="font-size:11px;color:#D4AF37;margin-bottom:4px;font-weight:600;">★ ${Number(rating).toFixed(1)}${reviews ? `<span style="color:#888;font-weight:400;margin-left:4px;">(${reviews} avis)</span>` : ""}</div>` : ""}
              <div style="font-size:10px;color:#888;margin-bottom:8px;">📍 ${b.city || ""}${b.neighborhood ? ` · ${b.neighborhood}` : ""}</div>
              <div style="display:flex;gap:6px;">
                <button data-fiche="${b.id}" style="flex:1;padding:6px 0;border-radius:6px;background:#C04F17;color:#fff;font-size:11px;font-weight:600;border:none;cursor:pointer;">Voir la fiche →</button>
                <button data-dir="${b.id}" style="flex:1;padding:6px 0;border-radius:6px;background:#f3f4f6;color:#333;font-size:11px;font-weight:500;border:none;cursor:pointer;">Itinéraire →</button>
              </div>
            </div>`;
          infoWindowRef.current?.setContent(html);
          infoWindowRef.current?.setPosition(this.pos);
          infoWindowRef.current?.open(map);
          gmaps.event.addListenerOnce(infoWindowRef.current!, "domready", () => {
            document.querySelector(`button[data-fiche="${b.id}"]`)?.addEventListener("click", () => {
              window.open(`/b/${b.slug}`, "_blank", "noopener,noreferrer");
            });
            document.querySelector(`button[data-dir="${b.id}"]`)?.addEventListener("click", () => {
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}`, "_blank");
            });
          });
        });
        this.div = div;
        this.getPanes()?.overlayMouseTarget.appendChild(div);
      }
      draw() {
        if (!this.div) return;
        const proj = this.getProjection();
        if (!proj) return;
        const pt = proj.fromLatLngToDivPixel(this.pos);
        if (!pt) return;
        this.div.style.left = `${pt.x}px`;
        this.div.style.top = `${pt.y}px`;
      }
      onRemove() {
        if (this.div?.parentNode) { this.div.parentNode.removeChild(this.div); this.div = null; }
      }
    }

    const bounds = new gmaps.LatLngBounds();
    mapBusinesses.forEach((b) => {
      overlaysRef.current.push(new ThumbMarker(b));
      bounds.extend({ lat: b.latitude!, lng: b.longitude! });
    });

    if (mapBusinesses.length === 1) {
      map.setCenter({ lat: mapBusinesses[0].latitude!, lng: mapBusinesses[0].longitude! });
      map.setZoom(15);
    } else {
      map.fitBounds(bounds, 60);
      const listener = gmaps.event.addListener(map, "idle", () => {
        if ((map.getZoom() || 0) > 15) map.setZoom(15);
        gmaps.event.removeListener(listener);
      });
    }
  }, [ready, mapBusinesses]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[80]" onClick={onClose} />
      <div
        className={`fixed z-[81] bg-[#ECD6B8] shadow-2xl overflow-hidden
          ${isMobile ? "inset-0" : "top-0 right-0 h-full w-full max-w-[640px] rounded-l-2xl"}`}
      >
        {/* Map fills entire panel */}
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

        {/* Floating close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/95 text-[#C04F17] shadow-lg hover:bg-white transition-colors"
          title="Fermer"
          aria-label="Fermer la carte"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Floating title pill */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-full pl-3 pr-4 py-2 shadow-lg max-w-[calc(100%-80px)]">
          <MapPin className="h-4 w-4 text-[#C04F17] shrink-0" />
          <div className="text-xs font-semibold text-[#C04F17] truncate">
            {title || `${mapBusinesses.length} lieux sur la carte`}
          </div>
        </div>

        {gmapsError && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[#C04F17] bg-[#ECD6B8]">
            Impossible de charger Google Maps
          </div>
        )}
        {!ready && !gmapsError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#ECD6B8]">
            <Loader2 className="h-8 w-8 animate-spin text-[#C04F17]" />
          </div>
        )}
        {ready && mapBusinesses.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[#C04F17]/80 p-6 text-center bg-[#ECD6B8]/80">
            Aucune coordonnée disponible pour ces établissements.
          </div>
        )}
      </div>
    </>
  );
};

export default MapSlidePanel;
