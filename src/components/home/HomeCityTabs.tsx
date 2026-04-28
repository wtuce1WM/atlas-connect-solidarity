import HomepageCardsFront, { type HomeCardTarget } from "@/components/HomepageCardsFront";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CITIES, type City } from "@/lib/homeHelpers";

interface Props {
  city: City;
  onCityChange: (city: City) => void;
  onLabelClick: (
    info: { label: string; kind: "entry" | "extra"; target: HomeCardTarget; badgeId: string | null; eventId?: string | null },
    cityForLabel: City,
  ) => void;
}

/**
 * Marrakech / Essaouira tabs that mount HomepageCardsFront for each city.
 * Pure presentational component extracted from Home.tsx.
 */
const HomeCityTabs = ({ city, onCityChange, onLabelClick }: Props) => {
  return (
    <Tabs
      defaultValue={city.toLowerCase()}
      value={city.toLowerCase()}
      onValueChange={(v) => {
        const next = (v.charAt(0).toUpperCase() + v.slice(1)) as City;
        if (CITIES.includes(next)) onCityChange(next);
      }}
    >
      <TabsList>
        <TabsTrigger value="marrakech">Marrakech</TabsTrigger>
        <TabsTrigger value="essaouira">Essaouira</TabsTrigger>
      </TabsList>
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
