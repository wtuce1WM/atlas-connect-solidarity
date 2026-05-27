import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FrontStructureTab {
  id: string;
  name: string;
  count: number;
  subcategoryNames: Set<string>;
}

/**
 * Builds the Map filter chips from businesses' `main_category` directly,
 * bypassing front_structure. This keeps the chip count and filter behaviour
 * strictly aligned with the fulltext business-search (option 1):
 *   one chip per main_category present in the city,
 *   count = number of businesses with that main_category in the city,
 *   filter = b.main_category === name (also matches b.categories includes name
 *   downstream, which mirrors the edge function's
 *   `main_category.eq OR categories.cs` clause).
 */
export function useFrontStructureTabs(city: string | null) {
  const [tabs, setTabs] = useState<FrontStructureTab[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!city) {
      setTabs([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchTabs = async () => {
      const [catsRes, bizRes] = await Promise.all([
        supabase.from("categories").select("id, name_fr, sort_order").order("sort_order"),
        supabase
          .from("businesses")
          .select("main_category")
          .eq("is_active", true)
          .ilike("city", city),
      ]);

      if (cancelled) return;

      const cats = catsRes.data || [];
      const businesses = bizRes.data || [];

      const counts = new Map<string, number>();
      for (const b of businesses) {
        const mc = b.main_category;
        if (!mc) continue;
        counts.set(mc, (counts.get(mc) || 0) + 1);
      }

      // Order by categories.sort_order; unknown main_categories appended at the end alphabetically.
      const known = new Set(cats.map((c: any) => c.name_fr));
      const result: FrontStructureTab[] = [];

      for (const c of cats) {
        const count = counts.get(c.name_fr) || 0;
        if (count === 0) continue;
        result.push({
          id: c.id,
          name: c.name_fr,
          count,
          subcategoryNames: new Set([c.name_fr]),
        });
      }

      const extras = [...counts.entries()]
        .filter(([name]) => !known.has(name))
        .sort(([a], [b]) => a.localeCompare(b, "fr"));
      for (const [name, count] of extras) {
        result.push({
          id: `mc:${name}`,
          name,
          count,
          subcategoryNames: new Set([name]),
        });
      }

      if (!cancelled) {
        setTabs(result);
        setLoading(false);
      }
    };

    fetchTabs();
    return () => {
      cancelled = true;
    };
  }, [city]);

  return { tabs, loading };
}
