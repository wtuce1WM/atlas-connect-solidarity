import { useEffect, useState } from "react";
import { MapPin, MapPinOff, Loader } from "lucide-react";
import HomepageCardsFront, { type HomeCardTarget } from "@/components/HomepageCardsFront";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CITIES, type City } from "@/lib/homeHelpers";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import PanelLocationOverlay from "@/components/overlays/PanelLocationOverlay";
import { useDragScroll } from "@/hooks/useDragScroll";

interface Props {
  city: City;
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
 * Marrakech / Essaouira tabs that mount HomepageCardsFront for each city.
 * Also displays hashtag badges (those starting with "#") next to the toggle.
 */
const HomeCityTabs = ({ city, onCityChange, onLabelClick }: Props) => {
  const [hashtagBadges, setHashtagBadges] = useState<HashtagBadge[]>([]);
  const [showLocationOverlay, setShowLocationOverlay] = useState(false);
  const geo = useGeolocation();
  const hashtagsScrollRef = useDragScroll<HTMLDivElement>();

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

  return (
    <Tabs
      defaultValue={city.toLowerCase()}
      value={city.toLowerCase()}
      onValueChange={(v) => {
        const next = (v.charAt(0).toUpperCase() + v.slice(1)) as City;
        if (CITIES.includes(next)) onCityChange(next);
      }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <TabsList>
          <TabsTrigger value="marrakech">Marrakech</TabsTrigger>
          <TabsTrigger value="essaouira">Essaouira</TabsTrigger>
        </TabsList>

        <div ref={hashtagsScrollRef} className="flex items-center gap-2 overflow-x-auto lg:flex-wrap lg:overflow-visible -mx-2 px-2 lg:mx-0 lg:px-0 cursor-grab select-none touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

          {hashtagBadges.map((b) => (
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
              className="shrink-0 inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold hover:bg-gold/20 hover:border-gold/60 transition-colors"
              title={`Filtrer par ${b.name_fr}`}
            >
              {b.name_fr}
            </button>
          ))}
        </div>
      </div>

      {CITIES.map((c) => (
        <TabsContent key={c} value={c.toLowerCase()}>
          <div>
            <HomepageCardsFront
              city={c}
              onLabelClick={(info) => onLabelClick(info, c)}
              labelTakesPriority
            />
          </div>
        </TabsContent>
      ))}

      <PanelLocationOverlay
        open={showLocationOverlay}
        onClose={() => setShowLocationOverlay(false)}
        variant="popup"
      />
    </Tabs>
  );
};

export default HomeCityTabs;
