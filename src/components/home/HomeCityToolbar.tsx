import { useEffect, useState, type ReactNode } from "react";
import { MapPin, MapPinOff, Loader } from "lucide-react";
import { type HomeCardTarget } from "@/components/HomepageCardsFront";
import { CITIES, type City } from "@/lib/homeHelpers";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import PanelLocationOverlay from "@/components/overlays/PanelLocationOverlay";
import { useDragScroll } from "@/hooks/useDragScroll";

interface Props {
  city: City;
  activeBadgeId?: string | null;
  activeLabel?: string | null;
  /** Optional breadcrumb rendered inside the active city pill (replaces the simple city name). */
  breadcrumb?: ReactNode | null;
  onCityChange: (city: City) => void;
  onLabelClick: (
    info: { label: string; kind: "entry" | "extra"; target: HomeCardTarget; badgeId: string | null; eventId?: string | null },
    cityForLabel: City,
  ) => void;
}

interface HashtagBadge {
  id: string;
  name_fr: string;
}

/**
 * Toolbar (city tabs + hashtags + localisation) intended to be rendered inside the Header.
 */
const HomeCityToolbar = ({ city, activeBadgeId, activeLabel, breadcrumb, onCityChange, onLabelClick }: Props) => {
  const [hashtagBadges, setHashtagBadges] = useState<HashtagBadge[]>([]);
  const [showLocationOverlay, setShowLocationOverlay] = useState(false);
  const geo = useGeolocation();
  const hashtagsScrollRef = useDragScroll<HTMLDivElement>();

  const [activeNonHashtag, setActiveNonHashtag] = useState<HashtagBadge | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("badges")
        .select("id, name_fr")
        .like("name_fr", "#%")
        .order("name_fr", { ascending: true });
      setHashtagBadges(((data as any[]) || []) as HashtagBadge[]);
    };
    load();
  }, []);

  // If the active badge isn't a #hashtag (e.g. "Rooftop Restaurant & Bars"),
  // fetch it so we can still display it highlighted in terracotta.
  useEffect(() => {
    if (!activeBadgeId) { setActiveNonHashtag(null); return; }
    if (hashtagBadges.some((b) => b.id === activeBadgeId)) { setActiveNonHashtag(null); return; }
    let cancelled = false;
    (supabase as any)
      .from("badges")
      .select("id, name_fr")
      .eq("id", activeBadgeId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!cancelled && data) setActiveNonHashtag({ id: data.id, name_fr: data.name_fr });
      });
    return () => { cancelled = true; };
  }, [activeBadgeId, hashtagBadges]);

  const renderCityPill = (target: City) => {
    const isActive = city === target;
    const baseClasses =
      "shrink-0 inline-flex items-center rounded-md px-3 h-9 text-sm font-medium transition-colors";
    if (isActive) {
      // Render as a div so we can nest interactive sub-buttons (breadcrumb segments).
      return (
        <div
          key={target}
          className={`${baseClasses} bg-background text-foreground shadow-sm`}
          role="tab"
          aria-selected="true"
        >
          {breadcrumb ? breadcrumb : target}
        </div>
      );
    }
    return (
      <button
        key={target}
        type="button"
        onClick={() => onCityChange(target)}
        className={`${baseClasses} text-muted-foreground hover:text-foreground`}
        role="tab"
        aria-selected="false"
      >
        {target}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Row 1: city pills + localisation */}
      <div className="flex items-center gap-2 w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-muted p-1"
          role="tablist"
        >
          {CITIES.map((c) => renderCityPill(c))}
        </div>

        <button
          type="button"
          onClick={() => setShowLocationOverlay(true)}
          className={`shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 h-9 text-xs font-medium shadow-lg transition-colors ${
            geo.isEnabled && (geo.detectedNeighborhood || geo.detectedCity || geo.confirmedAddress)
              ? "bg-gold/20 text-gold border border-gold/40"
              : "bg-[#C04F17] text-white hover:bg-[#C04F17]/90"
          }`}
          style={{ fontFamily: "'Josefin Sans', sans-serif" }}
        >
          {geo.isDetecting ? (
            <Loader className="h-3.5 w-3.5 animate-spin" />
          ) : geo.isEnabled ? (
            <MapPin className="h-3.5 w-3.5" />
          ) : (
            <MapPinOff className="h-3.5 w-3.5" />
          )}
          <span className="truncate max-w-[240px]">
            {geo.isDetecting
              ? "…"
              : geo.isEnabled && (geo.detectedNeighborhood || geo.detectedCity)
              ? `📍 ${[geo.detectedNeighborhood, geo.detectedCity].filter(Boolean).join(", ")}`
              : geo.isEnabled && geo.confirmedAddress
              ? `📍 ${geo.confirmedAddress}`
              : "Localisation"}
          </span>
        </button>

        {geo.isEnabled && (geo.confirmedAddress || geo.detectedCity) && (
          <div className="shrink-0 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-gold shrink-0" />
            <span className="truncate">{geo.confirmedAddress || geo.detectedCity}</span>
          </div>
        )}
      </div>

      {/* Row 2: hashtags — starts under the OW button (shifted left to align with header padding) */}
      <div ref={hashtagsScrollRef} className="flex items-center gap-2 overflow-x-auto cursor-grab select-none touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -ml-2 w-[calc(100%+0.5rem)] py-1">
        {hashtagBadges.map((b) => {
          const isActive =
            activeBadgeId === b.id ||
            (!!activeLabel && activeLabel.trim().toLowerCase() === b.name_fr.trim().toLowerCase());
          return (
            <button
              key={b.id}
              type="button"
              onClick={() =>
                onLabelClick(
                  {
                    label: b.name_fr,
                    kind: "extra",
                    target: { type: "badge", id: b.id },
                    badgeId: b.id,
                    eventId: null,
                  },
                  city,
                )
              }
              className={`shrink-0 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-[#C04F17] text-white border-[#C04F17] hover:bg-[#C04F17]/90"
                  : "border-gold/40 bg-gold/10 text-gold hover:bg-gold/20 hover:border-gold/60"
              }`}
              title={`Filtrer par ${b.name_fr}`}
            >
              {b.name_fr}
            </button>
          );
        })}
      </div>

      <PanelLocationOverlay
        open={showLocationOverlay}
        onClose={() => setShowLocationOverlay(false)}
        variant="popup"
      />
    </div>
  );
};

export default HomeCityToolbar;
