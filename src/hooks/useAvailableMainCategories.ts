import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAvailableMainCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("main_category")
          .eq("is_active", true)
          .not("main_category", "is", null)
          .order("main_category");

        if (error) {
          console.error("Error fetching main categories:", error);
          return;
        }

        const unique = Array.from(
          new Set(
            (data ?? [])
              .map((r) => (r.main_category ?? "").trim())
              .filter(Boolean),
          ),
        );

        const { data: catRows } = await supabase
          .from("categories")
          .select("name_fr, sort_order")
          .not("name_fr", "is", null);

        const orderMap: Record<string, number> = {};
        (catRows ?? []).forEach((c) => {
          orderMap[c.name_fr] = c.sort_order ?? 999;
        });

        const ordered = unique.sort((a, b) => {
          const oa = orderMap[a] ?? 999;
          const ob = orderMap[b] ?? 999;
          if (oa !== ob) return oa - ob;
          return a.localeCompare(b, "fr");
        });

        if (!cancelled) setCategories(ordered);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, isLoading };
}
