import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FrontStructureTab {
  id: string;
  name: string;
  count: number;
  subcategoryNames: Set<string>;
}

/**
 * Builds the map filter chips from the "Structure du front" configuration:
 *   - one chip per `front_structure` entry that has at least one matching
 *     active business in the given city,
 *   - the chip's filter set is the union of all subcategory names (FR/EN/AR)
 *     linked to that front_structure entry via `front_structure_subcategories`,
 *   - the chip's count is the number of active businesses in the city whose
 *     `main_category` or `categories[]` intersect with that subcategory set.
 *
 * Tabs are ordered by `front_structure.sort_order`.
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
      const [fsRes, fssRes, subsRes, bizRes] = await Promise.all([
        supabase.from("front_structure").select("id, name, sort_order").order("sort_order"),
        supabase.from("front_structure_subcategories").select("front_structure_id, subcategory_id"),
        supabase.from("subcategories").select("id, name_fr, name_en, name_ar"),
        supabase
          .from("businesses")
          .select("main_category, categories")
          .eq("is_active", true)
          .ilike("city", city),
      ]);

      if (cancelled) return;

      const fsEntries = fsRes.data || [];
      const fssLinks = fssRes.data || [];
      const subMap = new Map((subsRes.data || []).map((s: any) => [s.id, s]));
      const businesses = bizRes.data || [];

      // Build subcategory-name set per front_structure entry
      const fsSubNames = new Map<string, Set<string>>();
      for (const link of fssLinks as any[]) {
        const sub: any = subMap.get(link.subcategory_id);
        if (!sub) continue;
        if (!fsSubNames.has(link.front_structure_id)) {
          fsSubNames.set(link.front_structure_id, new Set());
        }
        const s = fsSubNames.get(link.front_structure_id)!;
        if (sub.name_fr) s.add(sub.name_fr);
        if (sub.name_en) s.add(sub.name_en);
        if (sub.name_ar) s.add(sub.name_ar);
      }

      const result: FrontStructureTab[] = [];
      for (const fs of fsEntries as any[]) {
        const subNames = fsSubNames.get(fs.id);
        if (!subNames || subNames.size === 0) continue;
        let count = 0;
        for (const b of businesses as any[]) {
          const inMain = b.main_category && subNames.has(b.main_category);
          const inCats = Array.isArray(b.categories) && b.categories.some((c: string) => subNames.has(c));
          if (inMain || inCats) count++;
        }
        if (count === 0) continue;
        result.push({
          id: fs.id,
          name: fs.name,
          count,
          subcategoryNames: subNames,
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
