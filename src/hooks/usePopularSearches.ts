import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

export interface PopularSearch {
  id: string;
  query: string;
}

/**
 * Returns popular search suggestions matching the user's input (prefix match).
 * Used for text-only autocomplete (no business results).
 * Selects the localized `query_en` / `query_ar` column based on active language,
 * with fallback to the French source.
 */
export const usePopularSearches = (input: string, enabled = true) => {
  const { i18n } = useTranslation();
  const lang = (i18n.language || "fr").slice(0, 2);
  const [suggestions, setSuggestions] = useState<PopularSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!enabled || !input || input.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const normalizedInput = input.trim().toLowerCase();
        const col = lang === "en" ? "query_en" : lang === "ar" ? "query_ar" : "query";
        const selectCols = `id, query, query_en, query_ar`;
        const { data, error } = await supabase
          .from("popular_searches")
          .select(selectCols)
          .ilike(col, `%${normalizedInput}%`)
          .order("sort_order", { ascending: true })
          .limit(8);

        if (error) throw error;
        const rows = (data || []).map((r: any) => ({
          id: r.id,
          query: (lang === "en" ? r.query_en : lang === "ar" ? r.query_ar : r.query) || r.query,
        }));
        setSuggestions(rows);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, enabled, lang]);

  return { suggestions, isLoading };
};
