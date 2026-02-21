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

        // 1) Search businesses by name, hook_fr, hook_en, or services array
        const { data: bizData } = await supabase
          .from("businesses")
          .select("id, name, city, main_category, logo_url")
          .eq("is_active", true)
          .or(`name.ilike.${pattern},hook_fr.ilike.${pattern},hook_en.ilike.${pattern},services.cs.{"${q}"}`)
          .order("priority_score", { ascending: false })
          .limit(6);

        // 2) Search services by name or keywords for additional matches
        const { data: svcData } = await supabase
          .from("services")
          .select("name_fr, keywords")
          .or(`name_fr.ilike.${pattern},name_en.ilike.${pattern}`);

        // Also check service keywords
        const { data: svcByKw } = await supabase
          .from("services")
          .select("name_fr, keywords")
          .not("keywords", "eq", "{}");

        const qLower = q.toLowerCase();
        const matchedServiceNames = new Set<string>();

        // Services matched by name
        (svcData || []).forEach(s => matchedServiceNames.add(s.name_fr));

        // Services matched by keyword
        (svcByKw || []).forEach(s => {
          const kws = (s.keywords || []) as string[];
          if (kws.some(k => k.toLowerCase().includes(qLower))) {
            matchedServiceNames.add(s.name_fr);
          }
        });

        // If we found matching services, fetch businesses that have those services
        let svcBizData: typeof bizData = [];
        if (matchedServiceNames.size > 0) {
          const serviceNames = Array.from(matchedServiceNames);
          // Build OR conditions for services array containment
          const orConditions = serviceNames.map(s => `services.cs.{"${s}"}`).join(",");
          const { data } = await supabase
            .from("businesses")
            .select("id, name, city, main_category, logo_url")
            .eq("is_active", true)
            .or(orConditions)
            .order("priority_score", { ascending: false })
            .limit(6);
          svcBizData = data || [];
        }

        // Merge & deduplicate, prioritizing direct matches
        const seen = new Set<string>();
        const merged: SearchSuggestion[] = [];
        for (const b of [...(bizData || []), ...svcBizData]) {
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
