import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVideoEmbed } from "@/lib/videoEmbed";
import SearchResultCard, { type SearchResultBusiness } from "@/components/SearchResultCard";
import PanelSearchBar from "@/components/PanelSearchBar";
import GenericVideoTimelineOverlay from "@/components/test/GenericVideoTimelineOverlay";
import SlidePanelHome from "@/components/SlidePanelHome";
import { Menu as MenuIcon, X, Star } from "lucide-react";
import HomepageCardsFront from "@/components/HomepageCardsFront";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface FrontEntry {
  id: string;
  name: string;
  sort_order: number;
  subcategory_ids: string[];
  service_ids: string[];
}

interface OwnerInfo {
  id: string;
  name: string;
  logo_url: string | null;
  logo_bg: string | null;
}

interface SocialInfo {
  platform: "instagram" | "tiktok" | "youtube";
  account: string;
  url: string | null;
}

interface VideoItem {
  id: string;
  url: string;
  business_name: string;
  thumbnail_url: string | null;
  business: SearchResultBusiness | null;
  /** Set only when the video's owner business differs from the display entity */
  owner: OwnerInfo | null;
  social: SocialInfo | null;
  description: string | null;
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

function extractSocial(d: any): SocialInfo | null {
  const ig = (d?.instagram_account || "").trim();
  if (ig) return { platform: "instagram", account: ig.replace(/^@+/, ""), url: d?.instagram_url || null };
  const tt = (d?.tiktok_account || "").trim();
  if (tt) return { platform: "tiktok", account: tt.replace(/^@+/, ""), url: d?.tiktok_url || null };
  const yt = (d?.youtube_account || "").trim();
  if (yt) return { platform: "youtube", account: yt.replace(/^@+/, ""), url: d?.youtube_url || null };
  return null;
}

const HOME_ID = "__home__";
const VLOGS_ID = "__vlogs__";

const Test = () => {
  const navigate = useNavigate();

  // ============================================================
  // STATE
  // ============================================================
  const [city, setCity] = useState<City>("Marrakech");
  const [entries, setEntries] = useState<FrontEntry[]>([]);
  const [subcatNames, setSubcatNames] = useState<Record<string, string>>({});
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [citySubcats, setCitySubcats] = useState<Set<string>>(new Set());
  const [cityServices, setCityServices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(HOME_ID);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [entriesWithVideos, setEntriesWithVideos] = useState<Set<string>>(new Set());
  const [subsWithVideos, setSubsWithVideos] = useState<Set<string>>(new Set());
  const [cityRowId, setCityRowId] = useState<string | null>(null);
  const [extraCityDocIds, setExtraCityDocIds] = useState<Set<string>>(new Set());
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [guideVideos, setGuideVideos] = useState<VideoItem[]>([]);
  const [loadingGuide, setLoadingGuide] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);
  const [otherViewMode, setOtherViewMode] = useState<"details" | "videos" | "guide">("videos");
  const [currentTime, setCurrentTime] = useState(0);
  const [badgeView, setBadgeView] = useState<{ badgeId: string; label: string; city: City } | null>(null);
  const [badgeBusinesses, setBadgeBusinesses] = useState<SearchResultBusiness[]>([]);
  const [loadingBadge, setLoadingBadge] = useState(false);

  // ============================================================
  // EFFECTS
  // ============================================================

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
        (entriesRes.data || [])
          .filter((e: any) => e.show_in_menu !== false)
          .map((e: any) => ({
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

  // Resolve the cities table id (for multi-city video assignments)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("cities")
        .select("id")
        .eq("name_fr", city)
        .maybeSingle();
      if (!cancelled) setCityRowId((data as any)?.id || null);
    })();
    return () => { cancelled = true; };
  }, [city]);

  // Document ids assigned to this city via business_document_cities (multi-city)
  useEffect(() => {
    if (!cityRowId) { setExtraCityDocIds(new Set()); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("business_document_cities")
        .select("document_id")
        .eq("city_id", cityRowId);
      if (!cancelled) setExtraCityDocIds(new Set(((data as any[]) || []).map((r) => r.document_id)));
    })();
    return () => { cancelled = true; };
  }, [cityRowId]);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      // Fetch all internal video docs for the selected city (own city + multi-city assigned)
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
      // Add multi-city assigned docs
      const extraIds = [...extraCityDocIds];
      for (let i = 0; i < extraIds.length; i += 300) {
        const chunk = extraIds.slice(i, i + 300);
        const { data } = await supabase
          .from("business_documents")
          .select("id, url, subcategory_id")
          .eq("type", "video")
          .not("subcategory_id", "is", null)
          .in("id", chunk);
        if (data) allDocs.push(...data);
      }
      const subIdsWithVideos = new Set<string>();
      allDocs.forEach((d) => subIdsWithVideos.add(d.subcategory_id));

      // Mark entries that have at least one matching subcategory
      const matchingEntryIds = new Set<string>();
      entries.forEach((e) => {
        if (e.subcategory_ids.some((id) => subIdsWithVideos.has(id))) {
          matchingEntryIds.add(e.id);
        }
      });
      setEntriesWithVideos(matchingEntryIds);
      setSubsWithVideos(subIdsWithVideos);
      setLoading(false);
    };
    if (entries.length > 0) load();
  }, [city, entries, extraCityDocIds]);

  const visibleEntries = useMemo(() => {
    const homeEntry: FrontEntry = {
      id: HOME_ID,
      name: "Home",
      sort_order: -1,
      subcategory_ids: [],
      service_ids: [],
    };
    const vlogsEntry: FrontEntry = {
      id: VLOGS_ID,
      name: "#Vlogs",
      sort_order: -0.5,
      subcategory_ids: [],
      service_ids: [],
    };
    if (loading) return [homeEntry, vlogsEntry, ...entries];
    const filtered = entries.filter((e) => entriesWithVideos.has(e.id));
    return [homeEntry, vlogsEntry, ...filtered];
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
    let cancelled = false;
    const load = async () => {
      setLoadingVideos(true);

      const isHome = selectedEntry.id === HOME_ID;
      const isVlogs = selectedEntry.id === VLOGS_ID;

      let allDocs: any[] = [];

      if (isVlogs) {
        const { data: dest } = await supabase
          .from("destinations" as any)
          .select("id")
          .eq("name_fr", city)
          .maybeSingle();
        const destId = (dest as any)?.id;
        if (!destId) {
          setVideos([]);
          setLoadingVideos(false);
          return;
        }
        const { data: links } = await supabase
          .from("generic_video_destinations" as any)
          .select("generic_video_id")
          .eq("destination_id", destId);
        const linkedIds = new Set(((links as any[]) || []).map((l) => l.generic_video_id));
        if (linkedIds.size === 0) {
          setVideos([]);
          setLoadingVideos(false);
          return;
        }
        const [vidsRes, bizLinksRes] = await Promise.all([
          supabase
            .from("generic_videos" as any)
            .select("id, url, name, thumbnail_url, instagram_account, tiktok_account, youtube_account, sort_order")
            .in("id", [...linkedIds])
            .order("sort_order", { ascending: true }),
          supabase
            .from("generic_video_businesses" as any)
            .select("generic_video_id, business_id")
            .in("generic_video_id", [...linkedIds]),
        ]);
        const firstBizByVid: Record<string, string> = {};
        (((bizLinksRes as any).data as any[]) || []).forEach((l: any) => {
          if (!firstBizByVid[l.generic_video_id]) firstBizByVid[l.generic_video_id] = l.business_id;
        });
        const bizIds = [...new Set(Object.values(firstBizByVid))];
        const bizMap = new Map<string, SearchResultBusiness>();
        if (bizIds.length > 0) {
          const { data: bizs } = await supabase
            .from("businesses")
            .select("id, name, images, logo_url, logo_bg, rating, computed_rating, total_review_count, categories, default_service, is_open_24h, show_opening_hours, opening_hours, city, neighborhood, latitude, longitude, engagements, wtuce_status")
            .in("id", bizIds);
          (bizs || []).forEach((b: any) => bizMap.set(b.id, b as SearchResultBusiness));
        }
        const vids = ((vidsRes as any).data as any[]) || [];
        const vidIds = vids.map((v: any) => v.id);
        const ordered = vidIds
          .map((vid) => {
            const v = vids.find((x: any) => x.id === vid);
            if (!v) return null;
            const bizId = firstBizByVid[vid];
            const biz = bizId ? bizMap.get(bizId) || null : null;
            const acct = (v.instagram_account || v.tiktok_account || v.youtube_account || "").replace(/^@+/, "");
            return {
              id: v.id,
              url: v.url,
              business_name: v.name || (acct ? `@${acct}` : (biz?.name || "—")),
              thumbnail_url: v.thumbnail_url || deriveThumbnail(v.url),
              business: biz,
              owner: null,
              social: extractSocial(v),
              description: null,
            } as VideoItem;
          })
          .filter(Boolean) as VideoItem[];
        setVideos(ordered);
        setLoadingVideos(false);
        return;
      }

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
            .select("id, url, thumbnail_url, business_id, sort_order, front_sort_order, poi_id, linked_business_id, destination_id, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url, description")
            .eq("type", "video")
            .eq("show_on_front", true)
            .in("business_id", chunk)
            .order("front_sort_order", { ascending: true });
          if (data) allDocs.push(...data);
        }
        // Include videos assigned to this city via business_document_cities (multi-city)
        const extraIds = [...extraCityDocIds].filter((id) => !allDocs.some((d) => d.id === id));
        for (let i = 0; i < extraIds.length; i += batch) {
          const chunk = extraIds.slice(i, i + batch);
          const { data } = await supabase
            .from("business_documents")
            .select("id, url, thumbnail_url, business_id, sort_order, front_sort_order, poi_id, linked_business_id, destination_id, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url, description")
            .eq("type", "video")
            .eq("show_on_front", true)
            .in("id", chunk);
          if (data) allDocs.push(...data);
        }
        // Dedup by id
        const seen = new Set<string>();
        allDocs = allDocs.filter((d: any) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
        allDocs.sort((a: any, b: any) => (a.front_sort_order ?? 0) - (b.front_sort_order ?? 0));
      } else {
        const subIds = selectedSubId ? [selectedSubId] : selectedEntry.subcategory_ids;
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
            .select("id, url, thumbnail_url, business_id, subcategory_id, city, sort_order, poi_id, linked_business_id, destination_id, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url, description")
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
        const extraIds = [...extraCityDocIds].filter((id) => !allDocs.some((d) => d.id === id));
        for (let i = 0; i < extraIds.length; i += 300) {
          const chunk = extraIds.slice(i, i + 300);
          const { data } = await supabase
            .from("business_documents")
            .select("id, url, thumbnail_url, business_id, subcategory_id, city, sort_order, poi_id, linked_business_id, destination_id, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url, description")
            .eq("type", "video")
            .in("subcategory_id", subIds)
            .in("id", chunk);
          if (data) allDocs.push(...data);
        }

        const seenIds = new Set<string>();
        allDocs = allDocs.filter((d: any) => (seenIds.has(d.id) ? false : (seenIds.add(d.id), true)));

        // Same logic as SlidePanelHome: group by business_id (real owner), dedupe by URL.
        // Single difference here: apply front_video_count per business.
        const allBizIds = [...new Set(allDocs.map((d: any) => d.business_id).filter(Boolean))] as string[];
        const bizMap = new Map<string, SearchResultBusiness>();
        if (allBizIds.length > 0) {
          const batch = 300;
          for (let i = 0; i < allBizIds.length; i += batch) {
            const { data: bizs } = await supabase
              .from("businesses")
              .select("id, name, images, logo_url, logo_bg, rating, computed_rating, total_review_count, categories, default_service, is_open_24h, show_opening_hours, opening_hours, city, neighborhood, latitude, longitude, engagements, wtuce_status, google_rating, priority_score, front_video_count, is_poi")
              .in("id", allBizIds.slice(i, i + batch));
            (bizs || []).forEach((b: any) => bizMap.set(b.id, b as SearchResultBusiness));
          }
        }

        // Dedup by URL (a same video can appear multiple times via different POI links)
        const seenUrls = new Set<string>();
        const uniqueDocs = allDocs.filter((d: any) => {
          if (!d.url || seenUrls.has(d.url)) return false;
          seenUrls.add(d.url);
          return true;
        });

        // Group by business_id (the real owner), then keep first N per business (front_video_count)
        const docsByBiz = new Map<string, any[]>();
        for (const d of uniqueDocs) {
          const arr = docsByBiz.get(d.business_id) || [];
          arr.push(d);
          docsByBiz.set(d.business_id, arr);
        }

        const limitedDocs: any[] = [];
        for (const [bizId, docs] of docsByBiz.entries()) {
          const biz = bizMap.get(bizId) as any;
          const limit = Math.max(1, Math.min(9, biz?.front_video_count ?? 1));
          const sorted = [...docs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          limitedDocs.push(...sorted.slice(0, limit));
        }

        // Global ordering by sort_order
        limitedDocs.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));


        setVideos(
          limitedDocs.map((d: any) => {
            const biz = bizMap.get(d.business_id) || null;
            return {
              id: d.id,
              url: d.url,
              business_name: biz?.name || "—",
              thumbnail_url: d.thumbnail_url,
              business: biz,
              owner: biz
                ? { id: biz.id, name: biz.name, logo_url: (biz as any).logo_url ?? null, logo_bg: (biz as any).logo_bg ?? null }
                : null,
              social: extractSocial(d),
              description: d.description ?? null,
            };
          })
        );
        setLoadingVideos(false);
        return;
      }

      // Home path: display business prefers poi_id > linked_business_id > business_id
      const getDisplayId = (d: any) => d.poi_id || d.linked_business_id || d.business_id;
      const displayBizIds = [...new Set(allDocs.map(getDisplayId))];
      const ownerBizIds = [...new Set(allDocs.map((d: any) => d.business_id).filter((id: string) => !displayBizIds.includes(id)))];
      const allBizIds = [...new Set([...displayBizIds, ...ownerBizIds])];
      const bizMap = new Map<string, SearchResultBusiness>();
      if (allBizIds.length > 0) {
        const batch = 300;
        for (let i = 0; i < allBizIds.length; i += batch) {
          const { data: bizs } = await supabase
            .from("businesses")
            .select("id, name, images, logo_url, logo_bg, rating, computed_rating, total_review_count, categories, default_service, is_open_24h, show_opening_hours, opening_hours, city, neighborhood, latitude, longitude, engagements, wtuce_status")
            .in("id", allBizIds.slice(i, i + batch));
          (bizs || []).forEach((b: any) => bizMap.set(b.id, b as SearchResultBusiness));
        }
      }

      setVideos(
        allDocs.map((d: any) => {
          const displayId = getDisplayId(d);
          const biz = bizMap.get(displayId) || null;
          const ownerBiz =
            d.business_id !== displayId
              ? bizMap.get(d.business_id) || biz
              : biz;
          return {
            id: d.id,
            url: d.url,
            business_name: biz?.name || "—",
            thumbnail_url: d.thumbnail_url,
            business: biz,
            owner: ownerBiz ? { id: ownerBiz.id, name: ownerBiz.name, logo_url: (ownerBiz as any).logo_url ?? null, logo_bg: (ownerBiz as any).logo_bg ?? null } : null,
            social: extractSocial(d),
            description: d.description ?? null,
          };
        })
      );
      setLoadingVideos(false);
    };
    load();
    return () => { cancelled = true; };
  }, [selectedEntry, city, selectedSubId, extraCityDocIds]);

  // Reset active video when entry/city changes
  useEffect(() => {
    setActiveVideoId(null);
    setActiveVideo(null);
    setPanelOpen(false);
  }, [selectedEntryId, city]);
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

  const otherVideos = useMemo(
    () => (panelOpen && activeVideo ? videos.filter((v) => v.id !== activeVideo.id) : videos),
    [videos, activeVideo, panelOpen]
  );

  // Active list (used by panel navigation)
  const activeList = useMemo(
    () => (otherViewMode === "guide" ? guideVideos : videos),
    [otherViewMode, guideVideos, videos]
  );


  // Load Tarik Belasri's visible YouTube shorts when "guide" mode is selected
  useEffect(() => {
    if (otherViewMode !== "guide") return;
    let cancelled = false;
    (async () => {
      setLoadingGuide(true);
      const { data: biz } = await supabase
        .from("businesses")
        .select("id, name, images, logo_url, rating, computed_rating, total_review_count, categories, default_service, is_open_24h, show_opening_hours, opening_hours, city, neighborhood, latitude, longitude, engagements, wtuce_status")
        .ilike("name", "Tarik Belasri")
        .maybeSingle();
      if (!biz) { if (!cancelled) { setGuideVideos([]); setLoadingGuide(false); } return; }
      const { data: yvs } = await supabase
        .from("business_youtube_videos")
        .select("id, video_id, title, thumbnail, is_visible, is_short, sort_order, published_at")
        .eq("business_id", biz.id)
        .eq("is_short", true)
        .eq("is_visible", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      const items: VideoItem[] = (yvs || []).map((y: any) => ({
        id: y.id,
        url: `https://www.youtube.com/shorts/${y.video_id}`,
        business_name: y.title || biz.name,
        thumbnail_url: y.thumbnail || `https://i.ytimg.com/vi/${y.video_id}/hqdefault.jpg`,
        business: biz as SearchResultBusiness,
        owner: null,
        social: null,
        description: null,
      }));
      setGuideVideos(items);
      setLoadingGuide(false);
    })();
    return () => { cancelled = true; };
  }, [otherViewMode]);


  // Reset currentTime when active video changes
  useEffect(() => {
    setCurrentTime(0);
  }, [activeVideo?.id]);

  const isActiveGeneric = useMemo(
    () => !!activeVideo && selectedEntryId === VLOGS_ID,
    [activeVideo, selectedEntryId]
  );

  const handleHomeLabelClick = async (
    info: { label: string; kind: "entry" | "extra"; badgeId: string | null },
    clickedCity: City
  ) => {
    if (info.kind === "entry") {
      const match = entries.find((e) => e.name.toLowerCase() === info.label.toLowerCase());
      if (match) {
        setBadgeView(null);
        setSelectedEntryId(match.id);
        setSelectedSubId(null);
      }
      return;
    }
    // Extra (manual) card → list businesses in this city using the badge
    if (!info.badgeId) return;
    setSelectedEntryId(HOME_ID);
    setBadgeView({ badgeId: info.badgeId, label: info.label, city: clickedCity });
    setLoadingBadge(true);
    setBadgeBusinesses([]);
    const { data: links } = await supabase
      .from("business_badges")
      .select("business_id")
      .eq("badge_id", info.badgeId);
    const ids = ((links as any[]) || []).map((l) => l.business_id);
    if (ids.length === 0) {
      setLoadingBadge(false);
      return;
    }
    const { data: bizs } = await supabase
      .from("businesses")
      .select("id, name, slug, images, logo_url, logo_bg, rating, computed_rating, total_review_count, categories, default_service, is_open_24h, show_opening_hours, opening_hours, city, neighborhood, latitude, longitude, engagements, wtuce_status")
      .in("id", ids)
      .eq("city", clickedCity)
      .eq("is_active", true);
    setBadgeBusinesses(((bizs as any[]) || []) as SearchResultBusiness[]);
    setLoadingBadge(false);
  };

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
            const isHovered = e.id === hoveredEntryId;
            const showChildren = isActive || isHovered;
            const children = showChildren
              ? [
                  ...e.subcategory_ids
                    .filter((id) => subsWithVideos.has(id))
                    .map((id) => ({ id, name: subcatNames[id], type: "sub" as const }))
                    .filter((c) => c.name),
                  ...e.service_ids
                    .map((id) => ({ id, name: serviceNames[id], type: "svc" as const }))
                    .filter((c) => c.name),
                ]
              : [];
            return (
              <li
                key={e.id}
                onMouseEnter={() => setHoveredEntryId(e.id)}
                onMouseLeave={() => setHoveredEntryId((prev) => (prev === e.id ? null : prev))}
              >
                <div
                  onClick={() => {
                    setSelectedEntryId(e.id);
                    setSelectedSubId(null);
                    setMenuOpen(false);
                  }}
                  className={`px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                    isActive && !selectedSubId
                      ? "bg-primary text-primary-foreground"
                      : isActive
                      ? "bg-muted text-foreground"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {e.name}
                </div>
                {children.length > 0 && (
                  <ul className="mt-1 ml-3 border-l border-border pl-3 space-y-0.5">
                    {children.map((c) => {
                      const isSubActive = c.type === "sub" && selectedSubId === c.id;
                      return (
                        <li
                          key={`${c.type}-${c.id}`}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            if (c.type === "sub") {
                              setSelectedEntryId(e.id);
                              setSelectedSubId(c.id);
                              setMenuOpen(false);
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            isSubActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                          }`}
                        >
                          {c.type === "svc" ? "🔧 " : ""}{c.name}
                        </li>
                      );
                    })}
                  </ul>
                )}
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
        <main className={`p-6 overflow-y-auto transition-all duration-300 ${panelOpen ? "w-1/2" : "flex-1"}`}>
          {selectedEntryId === HOME_ID ? (
            <>
              <Tabs defaultValue={city.toLowerCase()} value={city.toLowerCase()} onValueChange={(v) => { setCity((v.charAt(0).toUpperCase() + v.slice(1)) as City); setBadgeView(null); }}>
                <TabsList>
                  <TabsTrigger value="marrakech">Marrakech</TabsTrigger>
                  <TabsTrigger value="essaouira">Essaouira</TabsTrigger>
                </TabsList>
                <TabsContent value="marrakech">
                  <HomepageCardsFront
                    city="Marrakech"
                    onLabelClick={(info) => handleHomeLabelClick(info, "Marrakech")}
                  />
                </TabsContent>
                <TabsContent value="essaouira">
                  <HomepageCardsFront
                    city="Essaouira"
                    onLabelClick={(info) => handleHomeLabelClick(info, "Essaouira")}
                  />
                </TabsContent>
              </Tabs>
              {badgeView && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">
                      {badgeView.label} — {badgeView.city} ({badgeBusinesses.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setBadgeView(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Fermer ×
                    </button>
                  </div>
                  {loadingBadge ? (
                    <p className="text-sm text-muted-foreground">Chargement…</p>
                  ) : badgeBusinesses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun établissement trouvé.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {badgeBusinesses.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => navigate(`/fiche/${(b as any).slug || b.id}`)}
                          className="text-left rounded-lg overflow-hidden bg-card border border-border hover:border-primary transition-colors"
                        >
                          <div className="aspect-video bg-muted overflow-hidden">
                            {(b.images && b.images[0]) ? (
                              <img src={b.images[0]} alt={b.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : null}
                          </div>
                          <div className="p-2">
                            <p className="text-sm font-medium line-clamp-1">{b.name}</p>
                            {b.neighborhood && <p className="text-xs text-muted-foreground line-clamp-1">{b.neighborhood}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : !selectedEntry ? (
            <p className="text-sm text-muted-foreground">
              Sélectionne une entrée dans la colonne de gauche.
            </p>
          ) : loadingVideos ? (
            <p className="text-sm text-muted-foreground">Chargement des vidéos…</p>
          ) : videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune vidéo trouvée pour « {selectedEntry.name} » à {city}.
            </p>
          ) : (() => {
            const isGuide = otherViewMode === "guide";
            const displayList = isGuide ? guideVideos : otherVideos;
            const isThumbMode = otherViewMode === "videos" || isGuide;
            return (
            <div className="flex gap-6 items-start">
              {(displayList.length > 0 || isGuide) && (
                <div className="w-full min-w-0">
                  <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">
                      {isGuide ? "Suivez le guide" : ((selectedSubId && subcatNames[selectedSubId]) || selectedEntry.name)} ({displayList.length})
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
                        {CITIES.map((c, idx) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCity(c)}
                            className={`px-3 py-1.5 transition-colors ${idx > 0 ? "border-l border-border" : ""} ${
                              city === c
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-foreground hover:bg-muted"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
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
                        <button
                          type="button"
                          onClick={() => setOtherViewMode("guide")}
                          className={`px-3 py-1.5 transition-colors border-l border-border ${
                            otherViewMode === "guide"
                              ? "bg-primary text-primary-foreground"
                              : "bg-background text-foreground hover:bg-muted"
                          }`}
                        >
                          Suivez le guide
                        </button>
                      </div>
                    </div>
                  </div>
                  {isGuide && loadingGuide ? (
                    <p className="text-sm text-muted-foreground">Chargement…</p>
                  ) : isGuide && displayList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune vidéo disponible.</p>
                  ) : (
                  <div className={`grid gap-4 ${isThumbMode ? (panelOpen ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-3" : "grid-cols-2 md:grid-cols-4 lg:grid-cols-6") : (panelOpen ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6")}`}>
                    {displayList.map((v, idx) => {
                      const handlePick = () => {
                        setActiveVideo(v);
                        setActiveVideoId(v.id);
                        setPanelOpen(true);
                      };
                      if (isThumbMode) {
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
                        {v.business && (v.business.computed_rating ?? v.business.rating) != null && (
                          <div className="absolute top-1.5 left-1.5 right-1.5 z-[5] flex items-center gap-1 text-[10px]">
                            <Star className="h-2.5 w-2.5 text-gold fill-gold" />
                            <span className="font-medium text-white">{v.business.computed_rating ?? v.business.rating}/20</span>
                            {(v.business.total_review_count ?? 0) > 0 && (
                              <span className="text-white/70">· {v.business.total_review_count} avis</span>
                            )}
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                            <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[9px] border-l-white ml-0.5" />
                          </div>
                        </div>
                        {v.owner?.logo_url && (
                          <div className="absolute inset-x-0 bottom-[15%] z-[6] flex items-center justify-center px-2 pointer-events-none">
                            <div className="animate-logo-big-full-reveal max-w-[100px] max-h-[72px]">
                              <img
                                key={`logo-${v.id}`}
                                src={v.owner.logo_url}
                                alt={v.owner.name}
                                className="w-full h-auto max-w-full max-h-[72px] object-contain"
                                style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5)) drop-shadow(0 4px 20px hsla(0,0%,0%,0.3))" }}
                              />
                            </div>
                          </div>
                        )}
                        {(v.owner?.name || v.business_name) && (
                          <div className="absolute bottom-0 left-0 right-0 p-1.5">
                            <p className="text-[10px] font-medium text-white line-clamp-1">{v.owner?.name || v.business_name}</p>
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
                  )}
                </div>
              )}
            </div>
            );
          })()}
        </main>
      </div>

      <SlidePanelHome
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        videoUrl={activeVideo?.url || null}
        videoId={activeVideo?.id || null}
        businessName={activeVideo?.business_name || ""}
        isGeneric={isActiveGeneric}
        owner={activeVideo?.owner || null}
        social={activeVideo?.social || null}
        description={activeVideo?.description || null}
        currentTime={currentTime}
        onTimeUpdate={setCurrentTime}
        onPrev={() => {
          const i = activeList.findIndex((v) => v.id === activeVideo?.id);
          if (i > 0) {
            setActiveVideo(activeList[i - 1]);
            setActiveVideoId(activeList[i - 1].id);
          }
        }}
        onNext={() => {
          const i = activeList.findIndex((v) => v.id === activeVideo?.id);
          if (i >= 0 && i < activeList.length - 1) {
            setActiveVideo(activeList[i + 1]);
            setActiveVideoId(activeList[i + 1].id);
          }
        }}
        hasPrev={activeList.findIndex((v) => v.id === activeVideo?.id) > 0}
        hasNext={(() => {
          const i = activeList.findIndex((v) => v.id === activeVideo?.id);
          return i >= 0 && i < activeList.length - 1;
        })()}
      />
    </div>
  );
};

export default Test;
