import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVideoEmbed } from "@/lib/videoEmbed";
import SearchResultCard, { type SearchResultBusiness } from "@/components/SearchResultCard";
import PanelSearchBar from "@/components/PanelSearchBar";
import GenericVideoTimelineOverlay from "@/components/test/GenericVideoTimelineOverlay";
import { Menu as MenuIcon, X } from "lucide-react";

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

const MARRAKECH_GENERIC_VIDEO_IDS = [
  "70c850b6-3efe-4753-9698-cafcee272f3a",
  "1e1df289-bf96-4806-bc00-2902f3f8d85a",
  "7d197236-cb2a-432f-82ff-93bef906a216",
  "86d76e55-6462-4b8d-bd06-59242e57128e",
  "2856a9c6-a39f-4d56-8191-3d820208a7e8",
  "57f63bf0-046a-420f-bbc7-e75e34171f7c",
];

function deriveThumbnail(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  const bunny = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([\w-]+)/);
  if (bunny) return `https://vz-${bunny[1]}.b-cdn.net/${bunny[2]}/thumbnail.jpg`;
  return null;
}

const Test = () => {
  const navigate = useNavigate();
  const [city, setCity] = useState<City>("Marrakech");
  const [entries, setEntries] = useState<FrontEntry[]>([]);
  const [subcatNames, setSubcatNames] = useState<Record<string, string>>({});
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [citySubcats, setCitySubcats] = useState<Set<string>>(new Set());
  const [cityServices, setCityServices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>("__home__");
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
            .select("id, url, thumbnail_url, business_id, sort_order, front_sort_order, poi_id, linked_business_id")
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
            .select("id, url, thumbnail_url, business_id, subcategory_id, city, sort_order, poi_id, linked_business_id")
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

      // Resolve display business: prefer linked_business_id, then poi_id, then business_id (parent)
      const displayBizIds = [
        ...new Set(
          internal.map((d: any) => d.linked_business_id || d.poi_id || d.business_id)
        ),
      ];
      const bizMap = new Map<string, SearchResultBusiness>();
      if (displayBizIds.length > 0) {
        const batch = 300;
        for (let i = 0; i < displayBizIds.length; i += batch) {
          const { data: bizs } = await supabase
            .from("businesses")
            .select("id, name, images, logo_url, rating, computed_rating, total_review_count, categories, default_service, is_open_24h, show_opening_hours, opening_hours, city, neighborhood, latitude, longitude, engagements, wtuce_status")
            .in("id", displayBizIds.slice(i, i + batch));
          (bizs || []).forEach((b: any) => bizMap.set(b.id, b as SearchResultBusiness));
        }
      }

      setVideos(
        internal.map((d: any) => {
          const displayId = d.linked_business_id || d.poi_id || d.business_id;
          const biz = bizMap.get(displayId) || null;
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

  // Generic videos shown under the active video (Marrakech only)
  const [genericVideos, setGenericVideos] = useState<
    { id: string; url: string; account: string | null; business: SearchResultBusiness | null }[]
  >([]);

  useEffect(() => {
    if (city !== "Marrakech") {
      setGenericVideos([]);
      return;
    }
    const load = async () => {
      const [vidsRes, linksRes] = await Promise.all([
        supabase
          .from("generic_videos" as any)
          .select("id, url, instagram_account, tiktok_account, youtube_account")
          .in("id", MARRAKECH_GENERIC_VIDEO_IDS),
        supabase
          .from("generic_video_businesses" as any)
          .select("generic_video_id, business_id")
          .in("generic_video_id", MARRAKECH_GENERIC_VIDEO_IDS),
      ]);
      const vids = (vidsRes.data || []) as any[];
      const links = (linksRes.data || []) as any[];
      const firstBizByVid: Record<string, string> = {};
      links.forEach((l: any) => {
        if (!firstBizByVid[l.generic_video_id]) {
          firstBizByVid[l.generic_video_id] = l.business_id;
        }
      });
      const bizIds = [...new Set(Object.values(firstBizByVid))];
      const bizMap = new Map<string, SearchResultBusiness>();
      if (bizIds.length > 0) {
        const { data: bizs } = await supabase
          .from("businesses")
          .select("id, name, images, logo_url, rating, computed_rating, total_review_count, categories, default_service, is_open_24h, show_opening_hours, opening_hours, city, neighborhood, latitude, longitude, engagements, wtuce_status")
          .in("id", bizIds);
        (bizs || []).forEach((b: any) => bizMap.set(b.id, b as SearchResultBusiness));
      }
      const ordered = MARRAKECH_GENERIC_VIDEO_IDS
        .map((vid) => {
          const v = vids.find((x: any) => x.id === vid);
          if (!v) return null;
          const bizId = firstBizByVid[vid];
          const rawAccount = v.instagram_account || v.tiktok_account || v.youtube_account || null;
          const account = rawAccount ? rawAccount.replace(/^@+/, "") : null;
          return {
            id: v.id,
            url: v.url,
            account,
            business: bizId ? bizMap.get(bizId) || null : null,
          };
        })
        .filter(Boolean) as { id: string; url: string; account: string | null; business: SearchResultBusiness | null }[];
      setGenericVideos(ordered);
    };
    load();
  }, [city]);

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

  const [menuOpen, setMenuOpen] = useState(false);
  const [otherViewMode, setOtherViewMode] = useState<"details" | "videos">("videos");
  const [currentTime, setCurrentTime] = useState(0);

  // Reset currentTime when active video changes
  useEffect(() => {
    setCurrentTime(0);
  }, [activeVideo?.id]);

  const isActiveGeneric = useMemo(
    () => !!activeVideo && genericVideos.some((g) => g.id === activeVideo.id),
    [activeVideo, genericVideos]
  );

  const structureList = (
    <>
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
                onClick={() => {
                  setSelectedEntryId(e.id);
                  setMenuOpen(false);
                }}
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
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header
        rightContent={
          <div className="flex items-center justify-end pr-2">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-gold transition-colors"
              aria-label="Menu Structure"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
              Menu
            </button>
          </div>
        }
      />

      {menuOpen && (
        <div
          className="fixed inset-0 top-[53px] z-[28]"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-1/5 min-w-[260px] h-full bg-background border-r border-border shadow-xl animate-in slide-in-from-left-2 fade-in duration-200 overflow-y-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {structureList}
          </div>
        </div>
      )}

      <div className="pt-[53px] flex w-full min-h-[calc(100vh-53px)]">
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
            <div className={isLandscape ? "flex flex-col gap-6" : "flex gap-6 items-start"}>
              {/* Other videos — left side (50%) when vertical, below when landscape */}
              {otherVideos.length > 0 && (
                <div className={isLandscape ? "w-full order-2" : "w-1/2 min-w-0"}>
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Autres vidéos ({otherVideos.length})
                    </h3>
                    <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => setOtherViewMode("details")}
                        className={`px-3 py-1.5 transition-colors ${
                          otherViewMode === "details"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        Détails
                      </button>
                      <button
                        type="button"
                        onClick={() => setOtherViewMode("videos")}
                        className={`px-3 py-1.5 transition-colors border-l border-border ${
                          otherViewMode === "videos"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        Vidéos
                      </button>
                    </div>
                  </div>
                  <div className={`grid gap-4 ${isLandscape ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : otherViewMode === "videos" ? "grid-cols-3 md:grid-cols-4" : "grid-cols-1 md:grid-cols-2"}`}>
                    {otherVideos.map((v, idx) => {
                      const handlePick = () => {
                        setActiveVideoId(v.id);
                        window.scrollTo({ top: 0, behavior: "auto" });
                        document.documentElement.scrollTo({ top: 0, behavior: "auto" });
                        document.querySelector("main")?.scrollTo({ top: 0, behavior: "auto" });
                      };
                      if (otherViewMode === "videos") {
                        const thumb = v.thumbnail_url || deriveThumbnail(v.url);
                        const isFile = /\.(mp4|webm|mov)(\?|$)/i.test(v.url);
                        return (
                          <div
                            key={v.id}
                            onClick={handlePick}
                            className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted cursor-pointer"
                          >
                            {thumb ? (
                              <img src={thumb} alt={v.business_name} className="w-full h-full object-cover" loading="lazy" />
                            ) : isFile ? (
                              <video src={`${v.url}#t=0.5`} className="w-full h-full object-cover" preload="metadata" muted playsInline />
                            ) : (
                              <div className="w-full h-full bg-muted" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                                <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[9px] border-l-white ml-0.5" />
                              </div>
                            </div>
                            {v.business_name && (
                              <div className="absolute bottom-0 left-0 right-0 p-1.5">
                                <p className="text-[10px] font-medium text-white line-clamp-1">{v.business_name}</p>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div key={v.id} onClick={handlePick} className="cursor-pointer">
                          {v.business ? (
                            <SearchResultCard
                              business={v.business}
                              index={idx}
                              labelLogos={[]}
                              distanceKm={null}
                              onClick={handlePick}
                              onMouseEnter={() => {}}
                              onMouseLeave={() => {}}
                            />
                          ) : (
                            <div className="aspect-square bg-muted rounded-xl" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active video — right side (50%) */}
              {activeVideo && activeEmbed && (
                <div className={`relative flex flex-col items-center gap-2 pb-24 ${isLandscape ? "w-full order-1" : "w-1/2 shrink-0"}`}>
                  <div
                    className={`relative bg-black rounded-lg overflow-hidden shadow-lg w-full ${isLandscape ? "aspect-video" : "aspect-[9/16]"}`}
                    style={{
                      maxWidth: isLandscape ? 1280 : 720,
                      maxHeight: "calc(100vh - 120px)",
                    }}
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
                        onLoadedMetadata={(e) => {
                          const v = e.currentTarget;
                          setIsLandscape(v.videoWidth > v.videoHeight);
                        }}
                        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
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
                    {isActiveGeneric && (
                      <GenericVideoTimelineOverlay
                        genericVideoId={activeVideo.id}
                        currentTime={currentTime}
                      />
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground">{activeVideo.business_name}</p>

                  {city === "Marrakech" && genericVideos.length > 0 && (
                    <div className="w-full mt-6">
                      <h3 className="text-sm font-semibold text-foreground mb-3">
                        Vidéos génériques ({genericVideos.length})
                      </h3>
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {genericVideos.map((gv) => {
                          const thumb = deriveThumbnail(gv.url);
                          const label = gv.account ? `@${gv.account}` : (gv.business?.name || "");
                          const handlePick = () => {
                            const genericItem: VideoItem = {
                              id: gv.id,
                              url: gv.url,
                              business_name: label || "—",
                              thumbnail_url: thumb,
                              business: gv.business,
                            };
                            setVideos((prev) => {
                              if (prev.some((v) => v.id === gv.id)) return prev;
                              return [genericItem, ...prev];
                            });
                            setActiveVideoId(gv.id);
                            window.scrollTo({ top: 0, behavior: "auto" });
                            document.documentElement.scrollTo({ top: 0, behavior: "auto" });
                            document.querySelector("main")?.scrollTo({ top: 0, behavior: "auto" });
                          };
                          return (
                            <div
                              key={gv.id}
                              onClick={handlePick}
                              className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted group cursor-pointer"
                            >
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt={label || "Vidéo générique"}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <video
                                  src={`${gv.url}#t=0.5`}
                                  className="w-full h-full object-cover"
                                  preload="metadata"
                                  muted
                                  playsInline
                                />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                                  <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[9px] border-l-white ml-0.5" />
                                </div>
                              </div>
                              {label && (
                                <div className="absolute bottom-0 left-0 right-0 p-1.5">
                                  <p className="text-[10px] font-medium text-white line-clamp-1">
                                    {label}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <PanelSearchBar
                    iconVariant="black"
                    onSearch={(params) => {
                      const sp = new URLSearchParams(params);
                      navigate(`/search?${sp.toString()}`);
                    }}
                    onBusinessSelect={(bizId) => navigate(`/search?openBusiness=${bizId}`)}
                  />
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
