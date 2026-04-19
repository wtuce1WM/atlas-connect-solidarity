import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVideoEmbed } from "@/lib/videoEmbed";

interface FrontEntry {
  id: string;
  name: string;
  sort_order: number;
  subcategory_ids: string[];
  service_ids: string[];
}

interface VideoItem {
  id: string;
  url: string;
  business_name: string;
  thumbnail_url: string | null;
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
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

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

  const selectedEntry = useMemo(
    () => visibleEntries.find((e) => e.id === selectedEntryId) || null,
    [visibleEntries, selectedEntryId]
  );

  // Load videos for selected entry filtered by city
  useEffect(() => {
    if (!selectedEntry) {
      setVideos([]);
      return;
    }
    const load = async () => {
      setLoadingVideos(true);
      // Get business ids in this city matching subcats or services of the entry
      const subNames = selectedEntry.subcategory_ids.map((id) => subcatNames[id]).filter(Boolean);
      const svcNames = selectedEntry.service_ids.map((id) => serviceNames[id]).filter(Boolean);

      let bizQuery = supabase
        .from("businesses")
        .select("id, name, categories, services")
        .eq("is_active", true)
        .ilike("city", city);

      const { data: bizs } = await bizQuery;
      const matchedBiz = (bizs || []).filter((b: any) => {
        const cats = b.categories || [];
        const svcs = b.services || [];
        return subNames.some((n) => cats.includes(n)) || svcNames.some((n) => svcs.includes(n));
      });
      const bizIds = matchedBiz.map((b: any) => b.id);
      const bizNameMap = new Map<string, string>(matchedBiz.map((b: any) => [b.id, b.name]));

      if (bizIds.length === 0) {
        setVideos([]);
        setLoadingVideos(false);
        return;
      }

      const { data: docs } = await supabase
        .from("business_documents")
        .select("id, url, business_id, thumbnail_url, sort_order, front_sort_order")
        .eq("type", "video")
        .in("business_id", bizIds)
        .order("front_sort_order", { ascending: true })
        .order("sort_order", { ascending: true })
        .limit(15);

      const { isInternalVideoUrl } = await import("@/lib/videoSourceFilter");
      const filtered = (docs || []).filter((d: any) => isInternalVideoUrl(d.url));

      setVideos(
        filtered.slice(0, 15).map((d: any) => ({
          id: d.id,
          url: d.url,
          business_name: bizNameMap.get(d.business_id) || "—",
          thumbnail_url: d.thumbnail_url,
        }))
      );
      setLoadingVideos(false);
    };
    load();
  }, [selectedEntry, city, subcatNames, serviceNames]);

  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  // Reset active video when entry/city changes
  useEffect(() => {
    setActiveVideoId(null);
  }, [selectedEntryId, city]);

  const activeVideo = useMemo(
    () => videos.find((v) => v.id === activeVideoId) || videos[0] || null,
    [videos, activeVideoId]
  );
  const activeEmbed = useMemo(
    () => (activeVideo ? getVideoEmbed(activeVideo.url, window.location.origin, { autoplay: true }) : null),
    [activeVideo]
  );
  const otherVideos = useMemo(
    () => (activeVideo ? videos.filter((v) => v.id !== activeVideo.id) : videos.slice(1)),
    [videos, activeVideo]
  );

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
              {visibleEntries.map((e) => {
                const isActive = e.id === selectedEntryId;
                return (
                  <li
                    key={e.id}
                    onClick={() => setSelectedEntryId(e.id)}
                    className={`px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {e.name}
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Right zone 80% */}
        <main className="flex-1 p-6 overflow-y-auto">
          {!selectedEntry ? (
            <p className="text-sm text-muted-foreground">
              Sélectionne une entrée dans la colonne de gauche.
            </p>
          ) : loadingVideos ? (
            <p className="text-sm text-muted-foreground">Chargement des vidéos…</p>
          ) : videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune vidéo trouvée pour « {selectedEntry.name} » à {city}.
            </p>
          ) : (
            <div className="space-y-6">
              {/* First video in 720x1280 frame */}
              {firstVideo && firstEmbed && (
                <div className="flex flex-col items-start gap-2">
                  <div
                    className="bg-black rounded-lg overflow-hidden shadow-lg"
                    style={{ width: 720, height: 1280, maxWidth: "100%" }}
                  >
                    {firstEmbed.type === "file" ? (
                      <video
                        src={firstVideo.url}
                        controls
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <iframe
                        src={firstEmbed.embedUrl}
                        className="w-full h-full"
                        allow="autoplay; fullscreen; encrypted-media"
                        allowFullScreen
                      />
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground">{firstVideo.business_name}</p>
                </div>
              )}

              {/* Remaining videos as thumbnails */}
              {videos.length > 1 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Autres vidéos ({videos.length - 1})
                  </h3>
                  <div className="grid grid-cols-5 gap-3">
                    {videos.slice(1).map((v) => (
                      <div
                        key={v.id}
                        className="rounded-md overflow-hidden border border-border bg-card"
                      >
                        <div className="aspect-video bg-black">
                          {v.thumbnail_url ? (
                            <img
                              src={v.thumbnail_url}
                              alt={v.business_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted" />
                          )}
                        </div>
                        <p className="text-xs px-2 py-1 truncate">{v.business_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Test;
