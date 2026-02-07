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
        ).sort((a, b) => a.localeCompare(b, "fr"));

        if (!cancelled) setCategories(unique);
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
