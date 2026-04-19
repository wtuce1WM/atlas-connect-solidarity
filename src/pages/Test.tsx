import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVideoEmbed } from "@/lib/videoEmbed";
import SearchResultCard, { type SearchResultBusiness } from "@/components/SearchResultCard";

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
  business: SearchResultBusiness | null;
}

const CITIES = ["Marrakech", "Essaouira"] as const;
type City = typeof CITIES[number];

function deriveThumbnail(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  const bunny = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([\w-]+)/);
  if (bunny) return `https://vz-${bunny[1]}.b-cdn.net/${bunny[2]}/thumbnail.jpg`;
  return null;
}

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

  // Compute, per selected city, the set of front_structure entries that actually
  // have matching internal videos — same logic as backoffice FrontStructureVideosPanel:
  // group video docs by subcategory_id, then check which entries' subcategory_ids
  // intersect with the city's video subcategories.
  const [entriesWithVideos, setEntriesWithVideos] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      // Fetch all internal video docs for the selected city
      let allDocs: any[] = [];
      let offset = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase
          .from("business_documents")
          .select("id, url, subcategory_id")
          .eq("type", "video")
          .eq("city", city)
          .not("subcategory_id", "is", null)
          .range(offset, offset + PAGE - 1);
        if (!data || data.length === 0) break;
        allDocs.push(...data);
        if (data.length < PAGE) break;
        offset += PAGE;
      }
      const { isInternalVideoUrl } = await import("@/lib/videoSourceFilter");
      const subIdsWithVideos = new Set<string>();
      allDocs
        .filter((d) => isInternalVideoUrl(d.url))
        .forEach((d) => subIdsWithVideos.add(d.subcategory_id));

      // Mark entries that have at least one matching subcategory
      const matchingEntryIds = new Set<string>();
      entries.forEach((e) => {
        if (e.subcategory_ids.some((id) => subIdsWithVideos.has(id))) {
          matchingEntryIds.add(e.id);
        }
      });
      setEntriesWithVideos(matchingEntryIds);
      setLoading(false);
    };
    if (entries.length > 0) load();
  }, [city, entries]);

  const HOME_ID = "__home__";

  const visibleEntries = useMemo(() => {
    const homeEntry: FrontEntry = {
      id: HOME_ID,
      name: "Home",
      sort_order: -1,
      subcategory_ids: [],
      service_ids: [],
    };
    if (loading) return [homeEntry, ...entries];
    const filtered = entries.filter((e) => entriesWithVideos.has(e.id));
    return [homeEntry, ...filtered];
  }, [entries, entriesWithVideos, loading]);

  const selectedEntry = useMemo(
    () => visibleEntries.find((e) => e.id === selectedEntryId) || null,
    [visibleEntries, selectedEntryId]
  );

  // Load videos for selected entry — same logic as backoffice FrontStructureVideosPanel:
  // match business_documents.subcategory_id ∈ entry.subcategory_ids, filter by document.city,
  // keep only internal videos, sort by sort_order, take first 15.
  useEffect(() => {
    if (!selectedEntry) {
      setVideos([]);
      return;
    }
    const load = async () => {
      setLoadingVideos(true);

      const isHome = selectedEntry.id === HOME_ID;

      let allDocs: any[] = [];

      if (isHome) {
        // Same logic as backoffice "Vidéos / Homepage" sub-tab:
        // business_documents where show_on_front = true, for businesses in this city,
        // ordered by front_sort_order ascending.
        const cityBiz = await supabase
          .from("businesses")
          .select("id")
          .eq("city", city);
        const bizIds = (cityBiz.data || []).map((b: any) => b.id);
        if (bizIds.length === 0) {
          setVideos([]);
          setLoadingVideos(false);
          return;
        }
        const batch = 300;
        for (let i = 0; i < bizIds.length; i += batch) {
          const chunk = bizIds.slice(i, i + batch);
          const { data } = await supabase
            .from("business_documents")
            .select("id, url, thumbnail_url, business_id, sort_order, front_sort_order")
            .eq("type", "video")
            .eq("show_on_front", true)
            .in("business_id", chunk)
            .order("front_sort_order", { ascending: true });
          if (data) allDocs.push(...data);
        }
        allDocs.sort((a: any, b: any) => (a.front_sort_order ?? 0) - (b.front_sort_order ?? 0));
      } else {
        const subIds = selectedEntry.subcategory_ids;
        if (subIds.length === 0) {
          setVideos([]);
          setLoadingVideos(false);
          return;
        }
        let offset = 0;
        const PAGE = 1000;
        while (true) {
          const { data } = await supabase
            .from("business_documents")
            .select("id, url, thumbnail_url, business_id, subcategory_id, city, sort_order")
            .eq("type", "video")
            .in("subcategory_id", subIds)
            .eq("city", city)
            .order("sort_order", { ascending: true })
            .range(offset, offset + PAGE - 1);
          if (!data || data.length === 0) break;
          allDocs.push(...data);
          if (data.length < PAGE) break;
          offset += PAGE;
        }
        const { isInternalVideoUrl } = await import("@/lib/videoSourceFilter");
        allDocs = allDocs
          .filter((d: any) => isInternalVideoUrl(d.url))
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      }

      const internal = allDocs;

      const bizIds = [...new Set(internal.map((d: any) => d.business_id))];
      const bizMap = new Map<string, SearchResultBusiness>();
      if (bizIds.length > 0) {
        const { data: bizs } = await supabase
          .from("businesses")
          .select("id, name, images, logo_url, rating, computed_rating, total_review_count, categories, default_service, is_open_24h, show_opening_hours, opening_hours, city, neighborhood, latitude, longitude, engagements, wtuce_status")
          .in("id", bizIds);
        (bizs || []).forEach((b: any) => bizMap.set(b.id, b as SearchResultBusiness));
      }

      setVideos(
        internal.map((d: any) => {
          const biz = bizMap.get(d.business_id) || null;
          return {
            id: d.id,
            url: d.url,
            business_name: biz?.name || "—",
            thumbnail_url: d.thumbnail_url,
            business: biz,
          };
        })
      );
      setLoadingVideos(false);
    };
    load();
  }, [selectedEntry, city]);

  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);

  // Reset active video when entry/city changes
  useEffect(() => {
    setActiveVideoId(null);
    setIsLandscape(false);
  }, [selectedEntryId, city]);

  const activeVideo = useMemo(
    () => videos.find((v) => v.id === activeVideoId) || videos[0] || null,
    [videos, activeVideoId]
  );
  const activeEmbed = useMemo(() => {
    if (!activeVideo) return null;
    const base = getVideoEmbed(activeVideo.url, window.location.origin, { autoplay: true });
    // Force loop on the embed URL
    let embedUrl = base.embedUrl;
    if (base.type === "youtube") {
      const ytId = activeVideo.url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/)?.[1];
      embedUrl = embedUrl.replace("loop=0", `loop=1&playlist=${ytId}`);
    } else if (base.type === "vimeo") {
      embedUrl = embedUrl.replace("loop=0", "loop=1");
    } else if (base.type === "bunny") {
      embedUrl = embedUrl.replace("loop=false", "loop=true");
    }
    return { ...base, embedUrl };
  }, [activeVideo]);

  // Reset orientation guess when active video changes (vertical by default for embeds = Shorts)
  useEffect(() => {
    if (!activeEmbed) return;
    // For non-file embeds, use isVertical hint from getVideoEmbed (Shorts)
    if (activeEmbed.type !== "file") {
      setIsLandscape(!activeEmbed.isVertical);
    } else {
      // For files, default to vertical until metadata loads
      setIsLandscape(false);
    }
  }, [activeVideo?.id, activeEmbed]);

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
            <div className="flex gap-6 items-start">
              {/* Active video in 720x1280 frame */}
              {activeVideo && activeEmbed && (
                <div className="flex flex-col items-start gap-2 shrink-0">
                  <div
                    className="bg-black rounded-lg overflow-hidden shadow-lg aspect-[9/16]"
                    style={{ width: 720, maxWidth: "100%", maxHeight: "calc(100vh - 120px)" }}
                  >
                    {activeEmbed.type === "file" ? (
                      <video
                        key={activeVideo.id}
                        src={activeVideo.url}
                        controls
                        autoPlay
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <iframe
                        key={activeVideo.id}
                        src={activeEmbed.embedUrl}
                        className="w-full h-full"
                        allow="autoplay; fullscreen; encrypted-media"
                        allowFullScreen
                      />
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground">{activeVideo.business_name}</p>
                </div>
              )}

              {/* Other videos as clickable thumbnails on the right */}
              {otherVideos.length > 0 && (
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Autres vidéos ({otherVideos.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {otherVideos.map((v, idx) => (
                      <div key={v.id} onClick={() => setActiveVideoId(v.id)} className="cursor-pointer">
                        {v.business ? (
                          <SearchResultCard
                            business={v.business}
                            index={idx}
                            labelLogos={[]}
                            distanceKm={null}
                            onClick={() => setActiveVideoId(v.id)}
                            onMouseEnter={() => {}}
                            onMouseLeave={() => {}}
                          />
                        ) : (
                          <div className="aspect-square bg-muted rounded-xl" />
                        )}
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
