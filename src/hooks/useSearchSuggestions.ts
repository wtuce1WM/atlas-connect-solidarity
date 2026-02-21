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
        const { data } = await supabase
          .from("businesses")
          .select("id, name, city, main_category, logo_url")
          .eq("is_active", true)
          .ilike("name", `%${query.trim()}%`)
          .order("priority_score", { ascending: false })
          .limit(6);

        setSuggestions(data || []);
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
