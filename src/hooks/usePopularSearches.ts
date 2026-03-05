import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PopularSearch {
  id: string;
  query: string;
}

/**
 * Returns popular search suggestions matching the user's input (prefix match).
 * Used for text-only autocomplete (no business results).
 */
export const usePopularSearches = (input: string, enabled = true) => {
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
        const { data, error } = await supabase
          .from("popular_searches")
          .select("id, query")
          .ilike("query", `%${normalizedInput}%`)
          .order("sort_order", { ascending: true })
          .limit(8);

        if (error) throw error;
        setSuggestions(data || []);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, enabled]);

  return { suggestions, isLoading };
};
