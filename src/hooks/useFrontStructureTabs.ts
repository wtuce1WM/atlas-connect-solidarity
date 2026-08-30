import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCached, setCached } from "@/lib/swrCache";

type Taxonomy = { fs: any[]; fss: any[]; subs: any[] };
const TAXO_KEY = "front_structure:taxonomy:v1";
let taxoMem: Taxonomy | null = null;
let taxoInflight: Promise<Taxonomy> | null = null;

/** Taxonomie Structure du Front — mémoire + localStorage (stale-while-revalidate). */
async function loadTaxonomy(): Promise<Taxonomy> {
  if (taxoMem) return taxoMem;
  if (taxoInflight) return taxoInflight;
  taxoInflight = (async () => {
    const [fsRes, fssRes, subsRes] = await Promise.all([
      supabase.from("front_structure").select("id, name, sort_order").order("sort_order"),
      supabase.from("front_structure_subcategories").select("front_structure_id, subcategory_id"),
      supabase.from("subcategories").select("id, name_fr, name_en, name_ar"),
    ]);
    const t: Taxonomy = { fs: fsRes.data || [], fss: fssRes.data || [], subs: subsRes.data || [] };
    taxoMem = t;
    setCached(TAXO_KEY, t);
    return t;
  })();
  return taxoInflight;
}

/** Lance le chargement léger de la taxonomie avant le montage du panneau Map. */
export function preloadFrontStructureTaxonomy(): void {
  const cached = taxoMem || getCached<Taxonomy>(TAXO_KEY);
  if (cached) {
    taxoMem = cached;
    return;
  }
  void loadTaxonomy();
}


export interface FrontStructureSubTab {
  id: string;
  name: string;
  count: number;
  names: Set<string>; // FR/EN/AR variants for this single subcategory
}

export interface FrontStructureTab {
  id: string;
  name: string;
  count: number;
  subcategoryNames: Set<string>;
  subcategories: FrontStructureSubTab[];
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
export function useFrontStructureTabs(city: string | null, includeEmpty = false) {
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
      // Taxonomie servie depuis le cache (mémoire/localStorage) quand disponible :
      // les entrées du Pill Catégories n'attendent plus un aller-retour réseau.
      const cachedTaxo = taxoMem || getCached<Taxonomy>(TAXO_KEY);
      const [taxo, bizRes] = await Promise.all([
        cachedTaxo ? Promise.resolve(cachedTaxo) : loadTaxonomy(),
        includeEmpty
          ? Promise.resolve({ data: [] })
          : supabase
              .from("businesses")
              .select("main_category, categories")
              .eq("is_active", true)
              .ilike("city", city),
      ]);
      if (cachedTaxo) void loadTaxonomy();

      if (cancelled) return;
      const fsEntries = taxo.fs || [];
      const fssLinks = taxo.fss || [];
      const subMap = new Map((taxo.subs || []).map((s: any) => [s.id, s]));
      const businesses = bizRes.data || [];

      const fsSubNames = new Map<string, Set<string>>();
      const fsSubs = new Map<string, { id: string; name: string; names: Set<string> }[]>();
      for (const link of fssLinks as any[]) {
        const sub: any = subMap.get(link.subcategory_id);
        if (!sub) continue;
        if (!fsSubNames.has(link.front_structure_id)) {
          fsSubNames.set(link.front_structure_id, new Set());
          fsSubs.set(link.front_structure_id, []);
        }
        const s = fsSubNames.get(link.front_structure_id)!;
        const names = new Set<string>();
        if (sub.name_fr) { s.add(sub.name_fr); names.add(sub.name_fr); }
        if (sub.name_en) { s.add(sub.name_en); names.add(sub.name_en); }
        if (sub.name_ar) { s.add(sub.name_ar); names.add(sub.name_ar); }
        fsSubs.get(link.front_structure_id)!.push({ id: sub.id, name: sub.name_fr || sub.name_en || sub.name_ar || "—", names });
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
        if (!includeEmpty && count === 0) continue;
        const subDetails = (fsSubs.get(fs.id) || []).map((sd) => {
          let c = 0;
          for (const b of businesses as any[]) {
            const inMain = b.main_category && sd.names.has(b.main_category);
            const inCats = Array.isArray(b.categories) && b.categories.some((cat: string) => sd.names.has(cat));
            if (inMain || inCats) c++;
          }
          return { id: sd.id, name: sd.name, names: sd.names, count: c };
        }).filter((sd) => includeEmpty || sd.count > 0).sort((a, b) => b.count - a.count);
        result.push({ id: fs.id, name: fs.name, count, subcategoryNames: subNames, subcategories: subDetails });
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
  }, [city, includeEmpty]);

  return { tabs, loading };
}
