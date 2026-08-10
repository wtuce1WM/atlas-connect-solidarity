/// <reference types="@types/google.maps" />
import { useEffect, useMemo, useState } from "react";
import { X, Share2, Bookmark, BookmarkCheck, Navigation } from "lucide-react";
import PoiGoogleMap, { type PoiMapItem } from "@/components/PoiGoogleMap";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useLanguage } from "@/contexts/LanguageContext";
import { haversineKm } from "@/lib/haversine";
import { mapLabel } from "@/lib/mapLabels";
import { useDarkBrowserChrome } from "@/hooks/useDarkBrowserChrome";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const MT = {
  fr: { places: "lieux", close: "Fermer", bookmark: "Bookmark", removeBookmark: "Retirer le bookmark", addBookmark: "Bookmarker", share: "Partager", top20: "Top 20", all: "Tous", nearby: "À proximité", allDistances: "Toutes distances", d500: "Moins de 500 m", d1: "Moins de 1 km", d5: "Moins de 5 km", d10: "Moins de 10 km" },
  en: { places: "places", close: "Close", bookmark: "Bookmark", removeBookmark: "Remove bookmark", addBookmark: "Bookmark", share: "Share", top20: "Top 20", all: "All", nearby: "Nearby", allDistances: "All distances", d500: "Under 500 m", d1: "Under 1 km", d5: "Under 5 km", d10: "Under 10 km" },
  ar: { places: "أماكن", close: "إغلاق", bookmark: "إشارة مرجعية", removeBookmark: "إزالة الإشارة", addBookmark: "إضافة إشارة", share: "مشاركة", top20: "أفضل 20", all: "الكل", nearby: "قريب", allDistances: "كل المسافات", d500: "أقل من 500 م", d1: "أقل من 1 كم", d5: "أقل من 5 كم", d10: "أقل من 10 كم" },
} as const;


export interface MapPanelBusiness {
  id: string;
  name: string;
  slug?: string;
  city?: string | null;
  neighborhood?: string | null;
  latitude: number | null;
  longitude: number | null;
  images?: string[] | null;
  main_category?: string | null;
  categories?: string[] | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  tripadvisor_rating?: number | null;
  tripadvisor_review_count?: number | null;
  computed_rating?: number | null;
  total_review_count?: number | null;
  engagements?: string[] | null;
}

interface MapSlidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  businesses: MapPanelBusiness[];
  isMobile?: boolean;
  onShare?: () => void;
  onBookmark?: () => void;
  isBookmarked?: boolean;
  disableUserLocation?: boolean;
  /** Displays a terracotta marker at these coordinates instead of the user's geolocation. */
  hostLocation?: { lat: number; lng: number } | null;
  hostLabel?: string;
  /** Optional theme for the underlying Google Map tiles ("light" | "dark"). */
  mapTheme?: "light" | "dark" | "default-light" | "default-dark";
  /** When true, exposes native Plan/Satellite/Relief selector + Traffic/Transit toggles. */
  showLayerControls?: boolean;
  /** Forces a 100%-viewport-width panel on every device, with a slide-in from the right. */
  fullWidth?: boolean;
  /** Background color of the panel shell (widget light/dark color). */
  panelBg?: string;
}


const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  marrakech: { lat: 31.6295, lng: -7.9811 },
  essaouira: { lat: 31.5085, lng: -9.7595 },
  agafay: { lat: 31.45, lng: -8.15 },
  casablanca: { lat: 33.5731, lng: -7.5898 },
  rabat: { lat: 34.0209, lng: -6.8416 },
  fes: { lat: 34.0181, lng: -5.0078 },
  fès: { lat: 34.0181, lng: -5.0078 },
  tanger: { lat: 35.7595, lng: -5.834 },
  agadir: { lat: 30.4278, lng: -9.5981 },
  ouarzazate: { lat: 30.9189, lng: -6.8934 },
  chefchaouen: { lat: 35.1689, lng: -5.2636 },
};
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const MapSlidePanel = ({ open, onClose, title, businesses, isMobile, onShare, onBookmark, isBookmarked, disableUserLocation, hostLocation, hostLabel, mapTheme, showLayerControls, fullWidth, panelBg }: MapSlidePanelProps) => {
  const { language } = useLanguage();
  const mt = MT[language as keyof typeof MT] || MT.fr;
  // Plein cadre mobile : chrome navigateur noir + suppression des paddings safe-area
  useDarkBrowserChrome(open);


  const geo = useGeolocation();
  const [browserPos, setBrowserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [proximityKm, setProximityKm] = useState<number | null>(null);
  // Animation d'entrée (slide-in depuis la droite) pour la variante pleine largeur
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!open) { setEntered(false); return; }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open]);



  // Analytics: overlay_open lorsque la carte s'ouvre
  useEffect(() => {
    if (!open) return;
    import("@/lib/analytics").then(({ trackEvent }) =>
      trackEvent("overlay_open", { overlay: "map", context: "club", count: businesses?.length ?? 0 })
    );
  }, [open, businesses?.length]);

  // Priorité : coordonnées définies dans le popup de géolocalisation, sinon fallback navigator
  const userPos = disableUserLocation ? null : ((geo.isEnabled && geo.coords) ? geo.coords : browserPos);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || userPos || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setBrowserPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 600000 },
    );
  }, [open, userPos]);

  const mapBusinesses = useMemo(
    () =>
      businesses
        .filter((b) => b.latitude != null && b.longitude != null)
        .filter((b) => {
          const engs: string[] = b.engagements || [];
          return !engs.some((e) => {
            const n = e.toLowerCase().trim();
            return n === "web only" || n === "logistique:web only" || n.endsWith(":web only");
          });
        }),
    [businesses],
  );

  const pois: PoiMapItem[] = useMemo(
    () =>
      mapBusinesses.map((b) => {
        const rating =
          b.computed_rating ??
          b.google_rating ??
          b.tripadvisor_rating ??
          null;
        const totalReviews =
          b.total_review_count ??
          (b.google_review_count || 0) + (b.tripadvisor_review_count || 0);
        return {
          id: b.id,
          name: b.name,
          latitude: b.latitude,
          longitude: b.longitude,
          images: b.images,
          city: b.city,
          neighborhood: b.neighborhood,
          rating,
          avgOn20: rating != null ? Math.round(rating * 4 * 10) / 10 : null,
          totalReviews,
          subcategory: b.main_category,
          subcategories: b.categories,
        };
      }),
    [mapBusinesses],
  );

  const cityCenter = useMemo(() => {
    if (!mapBusinesses.length) return undefined;
    const counts = new Map<string, number>();
    for (const b of mapBusinesses) {
      if (!b.city) continue;
      counts.set(normalize(b.city), (counts.get(normalize(b.city)) || 0) + 1);
    }
    if (!counts.size) return undefined;
    const [dominant] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    return CITY_CENTERS[dominant];
  }, [mapBusinesses]);

  // Top 20 sorted by rating, then "Tous" toggle
  const rankedPois = useMemo(() => {
    return [...pois].sort((a, b) => {
      const ra = a.rating ?? 0;
      const rb = b.rating ?? 0;
      if (rb !== ra) return rb - ra;
      return (b.totalReviews ?? 0) - (a.totalReviews ?? 0);
    });
  }, [pois]);

  const proximityCountsByKm = useMemo(() => {
    const out: Record<number, number> = { 0.5: 0, 1: 0, 5: 0, 10: 0 };
    if (!userPos) return out;
    for (const p of pois) {
      if (p.latitude == null || p.longitude == null) continue;
      const d = haversineKm(userPos.lat, userPos.lng, p.latitude, p.longitude);
      for (const km of [0.5, 1, 5, 10]) if (d <= km) out[km]++;
    }
    return out;
  }, [pois, userPos]);

  const displayedPois = useMemo(() => {
    let list = showAll ? rankedPois : rankedPois.slice(0, 20);
    if (userPos && proximityKm != null) {
      list = list.filter((p) => {
        if (p.latitude == null || p.longitude == null) return false;
        return haversineKm(userPos.lat, userPos.lng, p.latitude, p.longitude) <= proximityKm;
      });
    }
    return list;
  }, [showAll, rankedPois, userPos, proximityKm]);

  const total = pois.length;
  const showToggle = total > 20;
  const proximityActive = proximityKm != null;
  const proximityCount = proximityKm != null ? (proximityCountsByKm[proximityKm] ?? 0) : 0;

  if (!open) return null;


  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[80]" onClick={onClose} />
      <div
        className={`fixed z-[81] shadow-2xl overflow-hidden flex flex-col ${panelBg ? "" : "bg-[#ECD6B8]"}
          ${fullWidth ? "inset-0 w-full" : isMobile ? "inset-0" : "top-0 right-0 h-full w-1/2 rounded-l-2xl"}`}
        style={{
          ...(panelBg ? { background: panelBg } : null),
          ...(fullWidth
            ? {
                transform: entered ? "translateX(0)" : "translateX(100%)",
                transition: "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)",
                willChange: "transform",
              }
            : null),
        }}

      >
        {/* Map fills the panel; toolbar floats on top */}
        <div className="relative flex-1">
          <PoiGoogleMap
            key={`map-${mapTheme || "light"}`}
            pois={displayedPois}
            selectedPoiId={selectedId}
            onPoiClick={(id) => setSelectedId(id)}
            center={hostLocation || cityCenter || userPos || undefined}
            fitToMarkers
            userLocation={hostLocation || userPos}
            userMarkerLabel={hostLocation ? (hostLabel || "") : mapLabel("youAreHere", language)}
            mapTheme={mapTheme}
            showLayerControls={showLayerControls}
          />


          {/* Floating toolbar — same layout as /search */}
          <div className="absolute top-0 left-0 right-0 z-[80] flex flex-col pointer-events-none">
            <div className="relative h-[52px] w-full flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 left-3 z-[15] h-9 w-9 flex items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-white/90 transition-opacity pointer-events-auto"
                aria-label={mt.close}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute top-3 left-14 right-24 z-[10] flex justify-center w-[calc(100%-152px)]">
                <div
                  className="px-3 py-1.5 rounded-full bg-white/30 backdrop-blur-md text-black text-sm font-semibold truncate shadow-sm pointer-events-auto"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {title || `${mapBusinesses.length} ${mt.places}`}
                </div>
              </div>

              <div className="absolute top-3 right-3 z-[15] flex items-center gap-2 pointer-events-auto">
                {onBookmark && (
                  <button
                    type="button"
                    onClick={onBookmark}
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-white shadow-lg hover:bg-white/90"
                    aria-label={mt.bookmark}
                    title={isBookmarked ? mt.removeBookmark : mt.addBookmark}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4 text-[#6050DC]" fill="currentColor" strokeWidth={2.5} />
                    ) : (
                      <Bookmark className="h-4 w-4 text-[#6050DC]" strokeWidth={2.5} />
                    )}
                  </button>
                )}
                {onShare && (
                  <button
                    type="button"
                    onClick={onShare}
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-white/90"
                    aria-label={mt.share}
                    title={mt.share}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Toggle Top 20 / Tous + À proximité */}
            <div className="pointer-events-auto w-full flex items-center justify-center gap-2 px-3 pt-3 pb-2">
              {showToggle && (
                <div
                  className="inline-flex rounded-full bg-black/50 backdrop-blur-sm p-0.5 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  <button
                    type="button"
                    onClick={() => setShowAll(false)}
                    className={`px-3 py-1 rounded-full transition-colors ${!showAll ? "bg-[#C04F17] text-white" : "text-white/80 hover:text-white"}`}
                  >
                    {mt.top20}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className={`px-3 py-1 rounded-full transition-colors ${showAll ? "bg-[#3B3B3B] text-white" : "text-white/80 hover:text-white"}`}
                  >
                    {mt.all} <span className="ml-0.5 opacity-70">{total}</span>
                  </button>
                </div>
              )}
              {userPos && (() => {
                const opts: { km: number; label: string }[] = [
                  { km: 0.5, label: mt.d500 },
                  { km: 1, label: mt.d1 },
                  { km: 5, label: mt.d5 },
                  { km: 10, label: mt.d10 },
                ];
                const active = opts.find((o) => o.km === proximityKm);
                return (
                  <div
                    className="inline-flex rounded-full bg-black/50 backdrop-blur-sm p-0.5 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${proximityActive ? "bg-[#3B3B3B] text-white" : "text-white/80 hover:text-white"}`}
                        >
                          <Navigation className="h-3.5 w-3.5" />
                          {active ? active.label : mt.nearby}
                          {proximityActive && (
                            <span className="ml-0.5 opacity-70">{proximityCount}</span>
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[95]">
                        {proximityKm != null && (
                          <DropdownMenuItem onSelect={() => setProximityKm(null)}>
                            {mt.allDistances}
                          </DropdownMenuItem>
                        )}
                        {opts.map((o) => {
                          const count = proximityCountsByKm[o.km] ?? 0;
                          const disabled = count === 0;
                          return (
                            <DropdownMenuItem
                              key={o.km}
                              disabled={disabled}
                              onSelect={(e) => {
                                if (disabled) { e.preventDefault(); return; }
                                setProximityKm(o.km);
                              }}
                            >
                              {o.label} <span className="ml-1 opacity-60">({count})</span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>

                    </DropdownMenu>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MapSlidePanel;
