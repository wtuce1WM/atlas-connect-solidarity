import HomepageCardsFront, { type HomeCardTarget } from "@/components/HomepageCardsFront";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
 * Renders the city-specific homepage cards. The city toggle/hashtags/localisation
 * toolbar lives in HomeCityToolbar (rendered in the Header).
 */
const HomeCityTabs = ({ city, onLabelClick }: Props) => {
  return (
    <Tabs value={city.toLowerCase()}>
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
