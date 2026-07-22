import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { MapPin, MapPinOff, Loader } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CITIES, type City } from "@/lib/homeHelpers";
import { readLastHomepageCity, writeLastHomepageCity } from "@/lib/cityHomepage";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import PanelLocationOverlay from "@/components/overlays/PanelLocationOverlay";
import { useDragScroll } from "@/hooks/useDragScroll";

interface HashtagBadge {
  id: string;
  name_fr: string;
}

/**
 * Global toolbar shown in the Header across all pages.
 * - City toggle: switches city and navigates to home with selected city.
 * - Hashtags: navigate to home filtered by the badge.
 * - Localisation button: opens PanelLocationOverlay.
 */
const GlobalHeaderToolbar = () => {
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const [hashtagBadges, setHashtagBadges] = useState<HashtagBadge[]>([]);
  const [showLocationOverlay, setShowLocationOverlay] = useState(false);
  const [city, setCity] = useState<City>(() => readLastHomepageCity() || "Marrakech");
  const [activeBadgeId, setActiveBadgeId] = useState<string | null>(null);
  const [activeBadgeLabel, setActiveBadgeLabel] = useState<string | null>(null);
  const geo = useGeolocation();
  const scrollRef = useDragScroll<HTMLDivElement>();

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const cityParam = sp.get("city") as City | null;
    if (cityParam && CITIES.includes(cityParam)) setCity(cityParam);
    setActiveBadgeId(sp.get("badgeId") || sp.get("eventId") || null);
    setActiveBadgeLabel(sp.get("badgeLabel") || sp.get("eventLabel") || null);
  }, [location.search]);

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

  const goCity = (next: City) => {
    setCity(next);
    writeLastHomepageCity(next);
    // If on the search page (or any page using ?city=), update the param in place
    // so the toggle stays active across results pages.
    if (location.pathname === "/search") {
      const sp = new URLSearchParams(location.search);
      sp.set("city", next);
      navigate(`/search?${sp.toString()}`);
      return;
    }
    navigate(`/?city=${next}&entry=__home__`);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  };

  const goBadge = (badge: HashtagBadge) => {
    if (location.pathname === "/search") {
      const sp = new URLSearchParams(location.search);
      sp.set("city", city);
      sp.set("badgeId", badge.id);
      sp.set("badgeLabel", badge.name_fr);
      navigate(`/search?${sp.toString()}`);
      return;
    }
    const params = new URLSearchParams({
      city,
      entry: "__home__",
      badgeId: badge.id,
      badgeLabel: badge.name_fr,
    });
    navigate(`/?${params.toString()}`);
  };

  return (
    <div ref={scrollRef} className="flex items-center gap-2 w-full overflow-x-auto cursor-grab select-none touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Tabs
        value={city.toLowerCase()}
        onValueChange={(v) => {
          const next = (v.charAt(0).toUpperCase() + v.slice(1)) as City;
          if (CITIES.includes(next)) goCity(next);
        }}
        className="shrink-0"
      >
        <TabsList>
          <TabsTrigger value="marrakech">Marrakech</TabsTrigger>
          <TabsTrigger value="essaouira">Essaouira</TabsTrigger>
        </TabsList>
      </Tabs>

      <button
        type="button"
        onClick={() => setShowLocationOverlay(true)}
        className={`shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 h-9 text-xs font-medium shadow-lg transition-colors ${
          geo.isEnabled && (geo.detectedNeighborhood || geo.detectedCity || geo.confirmedAddress)
            ? "bg-gold/20 text-gold border border-gold/40"
            : "bg-[#C04F17] text-white hover:bg-[#C04F17]/90"
        }`}
        style={{ fontFamily: "'Montserrat', sans-serif" }}
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

      {hashtagBadges.map((b) => {
        const isActive = activeBadgeId === b.id || (!!activeBadgeLabel && activeBadgeLabel.toLowerCase() === b.name_fr.toLowerCase());
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => goBadge(b)}
            className={`shrink-0 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                : "border-gold/40 bg-gold/10 text-gold hover:bg-gold/20 hover:border-gold/60"
            }`}
            title={`Filtrer par ${b.name_fr}`}
          >
            {b.name_fr}
          </button>
        );
      })}

      {geo.isEnabled && (geo.confirmedAddress || geo.detectedCity) && (
        <div className="shrink-0 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-gold shrink-0" />
          <span className="truncate">{geo.confirmedAddress || geo.detectedCity}</span>
        </div>
      )}

      <PanelLocationOverlay
        open={showLocationOverlay}
        onClose={() => setShowLocationOverlay(false)}
        variant="popup"
      />
    </div>
  );
};

export default GlobalHeaderToolbar;
