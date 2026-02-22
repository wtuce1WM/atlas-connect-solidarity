import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SearchSuggestion {
  id: string;
  name: string;
  city: string | null;
  main_category: string | null;
  logo_url: string | null;
}

export const useSearchSuggestions = (query: string, enabled = true) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!enabled || !query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("business-search", {
          body: {
            query: query.trim(),
            limit: 6,
            mode: "autocomplete",
          },
        });

        if (error) throw error;
        setSuggestions(data?.businesses || []);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, enabled]);

  return { suggestions, isLoading };
};
