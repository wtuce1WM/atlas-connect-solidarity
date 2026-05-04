import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { CITIES, type City, HOME_ID } from "@/lib/homeHelpers";
import { readLastHomepageCity, writeLastHomepageCity } from "@/lib/cityHomepage";
import HeaderMenuContent from "@/components/HeaderMenuContent";

interface FrontEntry {
  id: string;
  name: string;
  sort_order: number;
  subcategory_ids: string[];
}

interface Props {
  onNavigate?: () => void;
}

/**
 * Global "OW" menu drawer content used outside the Home page.
 * Mirrors the structure menu of Home: city tabs (Marrakech / Essaouira)
 * + front_structure entries that navigate to Home with `?city=...&entry=...`.
 * Falls back to HeaderMenuContent footer (links, social, etc.).
 */
const StructureMenuContent = ({ onNavigate }: Props) => {
  const navigate = useNavigate();
  const [city, setCity] = useState<City>(() => readLastHomepageCity() || "Marrakech");
  const [entries, setEntries] = useState<FrontEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [entriesRes, linksRes] = await Promise.all([
        supabase.from("front_structure").select("*").order("sort_order"),
        supabase.from("front_structure_subcategories").select("*"),
      ]);
      const linksByEntry: Record<string, string[]> = {};
      (linksRes.data || []).forEach((l: any) => {
        (linksByEntry[l.front_structure_id] ||= []).push(l.subcategory_id);
      });
      setEntries(
        (entriesRes.data || [])
          .filter((e: any) => e.show_in_menu !== false)
          .map((e: any) => ({
            id: e.id,
            name: e.name,
            sort_order: e.sort_order,
            subcategory_ids: linksByEntry[e.id] || [],
          })),
      );
      setLoading(false);
    };
    load();
  }, []);

  // Top-level entries (same logic as Home): exclude entries fully contained in another.
  const topLevel = useMemo(() => {
    return entries.filter((entry) => {
      if (entry.subcategory_ids.length === 0) return true;
      return !entries.some((cand) => {
        if (cand.id === entry.id) return false;
        if (cand.subcategory_ids.length <= entry.subcategory_ids.length) return false;
        return entry.subcategory_ids.every((id) => cand.subcategory_ids.includes(id));
      });
    });
  }, [entries]);

  const goCity = (next: City) => {
    setCity(next);
    writeLastHomepageCity(next);
    navigate(`/?city=${next}&entry=${HOME_ID}`);
    onNavigate?.();
  };

  const goEntry = (entryId: string) => {
    writeLastHomepageCity(city);
    navigate(`/?city=${city}&entry=${entryId}`);
    onNavigate?.();
  };

  return (
    <>
      <div className="mb-4">
        <Tabs
          value={city.toLowerCase()}
          onValueChange={(v) => {
            const next = (v.charAt(0).toUpperCase() + v.slice(1)) as City;
            if (CITIES.includes(next)) goCity(next);
          }}
        >
          <TabsList>
            {CITIES.map((c) => (
              <TabsTrigger key={c} value={c.toLowerCase()}>{c}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Chargement…</p>
      ) : (
        <ul className="space-y-1">
          <li>
            <div
              onClick={() => goEntry(HOME_ID)}
              className="px-3 py-2 rounded-md text-sm cursor-pointer transition-colors text-foreground hover:bg-muted"
            >
              Home
            </div>
          </li>
          {topLevel.map((e) => (
            <li key={e.id}>
              <div
                onClick={() => goEntry(e.id)}
                className="px-3 py-2 rounded-md text-sm cursor-pointer transition-colors text-foreground hover:bg-muted"
              >
                {e.name}
              </div>
            </li>
          ))}
        </ul>
      )}

      <HeaderMenuContent onNavigate={onNavigate} />
    </>
  );
};

export default StructureMenuContent;
