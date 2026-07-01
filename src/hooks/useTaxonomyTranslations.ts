// Shared, cached translation maps for services + subcategories (FR → EN/AR).
// Loaded once per session, reused across all cards/components.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Maps = {
  services: Record<string, { fr: string; en: string; ar: string }>;
  subcategories: Record<string, { fr: string; en: string; ar: string }>;
};

let cached: Maps | null = null;
let inflight: Promise<Maps> | null = null;

async function load(): Promise<Maps> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    const [svc, sub] = await Promise.all([
      supabase.from("services").select("name_fr,name_en,name_ar"),
      supabase.from("subcategories").select("name_fr,name_en,name_ar"),
    ]);
    const services: Maps["services"] = {};
    (svc.data || []).forEach((r: any) => {
      if (!r?.name_fr) return;
      services[r.name_fr.toLowerCase()] = {
        fr: r.name_fr, en: r.name_en || r.name_fr, ar: r.name_ar || r.name_fr,
      };
    });
    const subcategories: Maps["subcategories"] = {};
    (sub.data || []).forEach((r: any) => {
      if (!r?.name_fr) return;
      subcategories[r.name_fr.toLowerCase()] = {
        fr: r.name_fr, en: r.name_en || r.name_fr, ar: r.name_ar || r.name_fr,
      };
    });
    cached = { services, subcategories };
    return cached;
  })();
  return inflight;
}

export function useTaxonomyTranslations() {
  const [maps, setMaps] = useState<Maps | null>(cached);
  useEffect(() => {
    if (cached) { setMaps(cached); return; }
    let alive = true;
    load().then((m) => { if (alive) setMaps(m); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const translateService = (name: string | null | undefined, lang: string): string => {
    if (!name) return "";
    const row = maps?.services[name.toLowerCase()];
    if (!row) return name;
    return (lang === "en" ? row.en : lang === "ar" ? row.ar : row.fr) || name;
  };
  const translateSubcategory = (name: string | null | undefined, lang: string): string => {
    if (!name) return "";
    const row = maps?.subcategories[name.toLowerCase()];
    if (!row) return name;
    return (lang === "en" ? row.en : lang === "ar" ? row.ar : row.fr) || name;
  };

  return { translateService, translateSubcategory, ready: !!maps };
}
