import { useEffect, useState } from "react";
import HomepageCardsFront, { type HomeCardTarget } from "@/components/HomepageCardsFront";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CITIES, type City } from "@/lib/homeHelpers";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("badges")
        .select("id, name_fr")
        .like("name_fr", "#%")
        .order("name_fr", { ascending: true });
      const filtered = ((data as any[]) || []).filter(
        (b) => (b.name_fr || "").trim().toLowerCase() !== "#agenda"
      );
      setHashtagBadges(filtered as HashtagBadge[]);
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

        {hashtagBadges.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
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
                className="inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold hover:bg-gold/20 hover:border-gold/60 transition-colors"
                title={`Filtrer par ${b.name_fr}`}
              >
                {b.name_fr}
              </button>
            ))}
          </div>
        )}
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
    </Tabs>
  );
};

export default HomeCityTabs;
