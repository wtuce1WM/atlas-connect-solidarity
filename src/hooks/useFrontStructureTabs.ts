import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FrontStructureTab {
  id: string;
  name: string;
  count: number;
  subcategoryNames: Set<string>;
}

/**
 * Fetches front_structure tabs dynamically filtered by businesses in a given city.
 * Returns only tabs that have at least one matching business.
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

    const fetch = async () => {
      // 1. Get front_structure entries + their subcategory links + subcategory names
      const [fsRes, fssRes, subsRes] = await Promise.all([
        supabase.from("front_structure").select("id, name, sort_order").order("sort_order"),
        supabase.from("front_structure_subcategories").select("front_structure_id, subcategory_id"),
        supabase.from("subcategories").select("id, name_fr, name_en, name_ar"),
      ]);

      if (cancelled) return;

      const fsEntries = fsRes.data || [];
      const fssLinks = fssRes.data || [];
      const subMap = new Map((subsRes.data || []).map((s: any) => [s.id, s]));

      // Build map: front_structure_id -> Set of subcategory names (all languages)
      const fsSubNames = new Map<string, Set<string>>();
      for (const link of fssLinks) {
        const sub = subMap.get(link.subcategory_id);
        if (!sub) continue;
        if (!fsSubNames.has(link.front_structure_id)) fsSubNames.set(link.front_structure_id, new Set());
        const s = fsSubNames.get(link.front_structure_id)!;
        if (sub.name_fr) s.add(sub.name_fr);
        if (sub.name_en) s.add(sub.name_en);
        if (sub.name_ar) s.add(sub.name_ar);
      }

      // 2. Get businesses in this city
      const { data: bizData } = await supabase
        .from("businesses")
        .select("id, main_category, categories")
        .eq("is_active", true)
        .ilike("city", city);

      if (cancelled) return;

      const businesses = bizData || [];

      // 3. For each front_structure, count matching businesses.
      // A business matches the FS if its main_category equals the FS name
      // OR any of its categories is one of the FS-linked subcategories.
      // This keeps the chip count aligned with the search results returned
      // for a bare main-category query (e.g. "Restauration").
      const result: FrontStructureTab[] = [];
      for (const fs of fsEntries) {
        const subNames = fsSubNames.get(fs.id);
        if (!subNames || subNames.size === 0) continue;

        const matchCount = businesses.filter(biz =>
          biz.main_category === fs.name ||
          biz.categories?.some((cat: string) => subNames.has(cat))
        ).length;

        if (matchCount === 0) continue;

        result.push({
          id: fs.id,
          name: fs.name,
          count: matchCount,
          subcategoryNames: subNames,
        });
      }

      if (!cancelled) {
        setTabs(result);
        setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [city]);

  return { tabs, loading };
}
