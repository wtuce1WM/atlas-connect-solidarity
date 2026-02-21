import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SearchSuggestion {
  id: string;
  name: string;
  city: string | null;
  main_category: string | null;
  logo_url: string | null;
  matchSource?: string; // what matched: name, hook, service, service_keyword
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
        const q = query.trim();
        const pattern = `%${q}%`;
        // Split into meaningful words (>= 2 chars), for multi-word queries
        const words = q.split(/\s+/).filter(w => w.length >= 2);

        // 1) Search businesses by name, hook_fr, hook_en, or services array
        // Build OR conditions: full pattern + per-word patterns
        const bizOrParts: string[] = [
          `name.ilike.${pattern}`,
          `hook_fr.ilike.${pattern}`,
          `hook_en.ilike.${pattern}`,
        ];
        // Add per-word conditions for multi-word queries
        if (words.length > 1) {
          for (const w of words) {
            const wp = `%${w}%`;
            bizOrParts.push(`name.ilike.${wp}`, `hook_fr.ilike.${wp}`, `hook_en.ilike.${wp}`);
          }
        }
        const { data: bizData } = await supabase
          .from("businesses")
          .select("id, name, city, main_category, logo_url")
          .eq("is_active", true)
          .or(bizOrParts.join(","))
          .order("priority_score", { ascending: false })
          .limit(10);

        // If multi-word, filter client-side to prioritize results matching more words
        let filteredBiz = bizData || [];
        if (words.length > 1 && filteredBiz.length > 0) {
          const wordsLower = words.map(w => w.toLowerCase());
          // Score by how many words match (name + city)
          filteredBiz = filteredBiz
            .map(b => {
              const hay = `${b.name} ${b.city || ""} ${b.main_category || ""}`.toLowerCase();
              const score = wordsLower.filter(w => hay.includes(w)).length;
              return { ...b, _score: score };
            })
            .filter(b => b._score > 0)
            .sort((a, b) => b._score - a._score)
            .map(({ _score, ...rest }) => rest);
        }

        // 2) Search services by name or keywords for additional matches
        const svcOrParts = words.length > 1
          ? words.flatMap(w => [`name_fr.ilike.%${w}%`, `name_en.ilike.%${w}%`])
          : [`name_fr.ilike.${pattern}`, `name_en.ilike.${pattern}`];

        const { data: svcData } = await supabase
          .from("services")
          .select("name_fr, keywords")
          .or(svcOrParts.join(","));

        // Also check service keywords
        const { data: svcByKw } = await supabase
          .from("services")
          .select("name_fr, keywords")
          .not("keywords", "eq", "{}");

        const matchedServiceNames = new Set<string>();

        // Services matched by name
        (svcData || []).forEach(s => matchedServiceNames.add(s.name_fr));

        // Services matched by keyword (check each word)
        const wordsLower = words.map(w => w.toLowerCase());
        (svcByKw || []).forEach(s => {
          const kws = (s.keywords || []) as string[];
          if (kws.some(k => wordsLower.some(w => k.toLowerCase().includes(w)))) {
            matchedServiceNames.add(s.name_fr);
          }
        });

        // If we found matching services, fetch businesses that have those services
        let svcBizData: typeof bizData = [];
        if (matchedServiceNames.size > 0) {
          const serviceNames = Array.from(matchedServiceNames);
          const orConditions = serviceNames.map(s => `services.cs.{"${s}"}`).join(",");
          let svcQuery = supabase
            .from("businesses")
            .select("id, name, city, main_category, logo_url")
            .eq("is_active", true)
            .or(orConditions);

          // If there's a city-like word, also filter by city
          const cityWord = words.find(w => w.length >= 3 && !/couscous|pain|chocolat|restaurant/i.test(w));
          if (words.length > 1 && cityWord) {
            svcQuery = svcQuery.ilike("city", `%${cityWord}%`);
          }

          const { data } = await svcQuery
            .order("priority_score", { ascending: false })
            .limit(6);
          svcBizData = data || [];
        }

        // Merge & deduplicate, prioritizing direct matches
        const seen = new Set<string>();
        const merged: SearchSuggestion[] = [];
        for (const b of [...filteredBiz, ...svcBizData]) {
          if (!seen.has(b.id) && merged.length < 6) {
            seen.add(b.id);
            merged.push(b);
          }
        }

        setSuggestions(merged);
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
