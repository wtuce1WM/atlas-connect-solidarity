import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FrontEntry {
  id: string;
  name: string;
  sort_order: number;
  subcategory_ids: string[];
  service_ids: string[];
}

const CITIES = ["Marrakech", "Essaouira"] as const;
type City = typeof CITIES[number];

const Test = () => {
  const [city, setCity] = useState<City>("Marrakech");
  const [entries, setEntries] = useState<FrontEntry[]>([]);
  const [subcatNames, setSubcatNames] = useState<Record<string, string>>({});
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [citySubcats, setCitySubcats] = useState<Set<string>>(new Set());
  const [cityServices, setCityServices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // SEO: noindex
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    const prevTitle = document.title;
    document.title = "Test";
    return () => {
      meta.remove();
      document.title = prevTitle;
    };
  }, []);

  // Load front structure (independent of city)
  useEffect(() => {
    const load = async () => {
      const [entriesRes, linksRes, svcLinksRes, subsRes, servicesRes] = await Promise.all([
        supabase.from("front_structure").select("*").order("sort_order"),
        supabase.from("front_structure_subcategories").select("*"),
        supabase.from("front_structure_services" as any).select("*"),
        supabase.from("subcategories").select("id, name_fr"),
        supabase.from("services").select("id, name_fr").eq("is_active", true),
      ]);

      const subMap: Record<string, string> = {};
      (subsRes.data || []).forEach((s: any) => { subMap[s.id] = s.name_fr; });
      setSubcatNames(subMap);

      const svcMap: Record<string, string> = {};
      (servicesRes.data || []).forEach((s: any) => { svcMap[s.id] = s.name_fr; });
      setServiceNames(svcMap);

      const linksByEntry: Record<string, string[]> = {};
      (linksRes.data || []).forEach((l: any) => {
        (linksByEntry[l.front_structure_id] ||= []).push(l.subcategory_id);
      });
      const svcLinksByEntry: Record<string, string[]> = {};
      ((svcLinksRes.data || []) as any[]).forEach((l: any) => {
        (svcLinksByEntry[l.front_structure_id] ||= []).push(l.service_id);
      });

      setEntries(
        (entriesRes.data || []).map((e: any) => ({
          id: e.id,
          name: e.name,
          sort_order: e.sort_order,
          subcategory_ids: linksByEntry[e.id] || [],
          service_ids: svcLinksByEntry[e.id] || [],
        }))
      );
    };
    load();
  }, []);

  // Load businesses in selected city to know which subcats/services exist locally
  useEffect(() => {
    setLoading(true);
    const load = async () => {
      const { data } = await supabase
        .from("businesses")
        .select("categories, services")
        .eq("is_active", true)
        .ilike("city", city);

      const subSet = new Set<string>();
      const svcSet = new Set<string>();
      (data || []).forEach((b: any) => {
        (b.categories || []).forEach((c: string) => subSet.add(c));
        (b.services || []).forEach((s: string) => svcSet.add(s));
      });
      setCitySubcats(subSet);
      setCityServices(svcSet);
      setLoading(false);
    };
    load();
  }, [city]);

  const visibleEntries = useMemo(() => {
    if (loading) return entries;
    return entries.filter((e) => {
      const hasSub = e.subcategory_ids.some((id) => citySubcats.has(subcatNames[id]));
      const hasSvc = e.service_ids.some((id) => cityServices.has(serviceNames[id]));
      return hasSub || hasSvc;
    });
  }, [entries, citySubcats, cityServices, subcatNames, serviceNames, loading]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-[53px] flex w-full min-h-[calc(100vh-53px)]">
        {/* Left column 20% */}
        <aside className="w-1/5 min-w-[220px] border-r border-border bg-background p-4 overflow-y-auto">
          <div className="mb-4">
            <Select value={city} onValueChange={(v) => setCity(v as City)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
            Structure du front
          </h2>

          {loading ? (
            <p className="text-xs text-muted-foreground">Chargement…</p>
          ) : visibleEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucune entrée pour {city}.</p>
          ) : (
            <ul className="space-y-1">
              {visibleEntries.map((e) => (
                <li
                  key={e.id}
                  className="px-3 py-2 rounded-md text-sm text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  {e.name}
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Right zone 80% */}
        <main className="flex-1 p-6 overflow-y-auto" />
      </div>
    </div>
  );
};

export default Test;
