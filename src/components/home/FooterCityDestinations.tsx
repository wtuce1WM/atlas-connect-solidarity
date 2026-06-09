import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITIES, type City } from "@/lib/homeHelpers";

interface Props {
  city: City;
  cityRowId: string | null;
  onCityChange: (city: City) => void;
}

interface DestinationOpt {
  id: string;
  name: string;
}

const FooterCityDestinations = ({ city, cityRowId, onCityChange }: Props) => {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState<DestinationOpt[]>([]);

  useEffect(() => {
    if (!cityRowId) { setDestinations([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase
        .from("destinations" as any)
        .select("id, name_fr, city_ids, is_searchable")
        .contains("city_ids", [cityRowId])
        .eq("is_searchable", true) as any);
      if (cancelled) return;
      const list = ((data || []) as any[])
        .map((d) => ({ id: d.id as string, name: (d.name_fr as string) || "" }))
        .filter((d) => d.name)
        .sort((a, b) => a.name.localeCompare(b.name, "fr"));
      setDestinations(list);
    })();
    return () => { cancelled = true; };
  }, [cityRowId]);

  return (
    <div className="w-full border-t border-border/40 mt-8 py-8 px-4">
      <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Ville
          </label>
          <Select value={city} onValueChange={(v) => onCityChange(v as City)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Choisir une ville" />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Destinations
          </label>
          <Select
            value=""
            onValueChange={(id) => {
              if (!id) return;
              navigate(`/search?openDestination=${id}&city=${encodeURIComponent(city)}`);
            }}
            disabled={destinations.length === 0}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={destinations.length === 0 ? "Aucune destination" : "Choisir une destination"} />
            </SelectTrigger>
            <SelectContent>
              {destinations.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default FooterCityDestinations;
