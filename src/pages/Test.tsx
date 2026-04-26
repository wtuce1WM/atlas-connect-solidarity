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
import { toast } from "sonner";

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
  manualCard: { label: string; badgeId: string | null; eventId?: string | null } | null;
}

interface VideoEventFilter {
  eventId: string;
  label: string;
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

const isAgendaLabel = (label: string) => label.trim().toLowerCase() === "agenda";

const formatEventDateRange = (start: string | null, end: string | null) => {
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  if (start && end && start !== end) return `${fmt(start)} → ${fmt(end)}`;
  if (start) return fmt(start);
  if (end) return fmt(end);
  return "Date à confirmer";
};

function extractSocial(d: any): SocialInfo | null {
  const ig = (d?.instagram_account || "").trim();
  if (ig) return { platform: "instagram", account: ig.replace(/^@+/, ""), url: d?.instagram_url || null };
  const tt = (d?.tiktok_account || "").trim();
  if (tt) return { platform: "tiktok", account: tt.replace(/^@+/, ""), url: d?.tiktok_url || null };
  const yt = (d?.youtube_account || "").trim();
  if (yt) return { platform: "youtube", account: yt.replace(/^@+/, ""), url: d?.youtube_url || null };
  return null;
}

async function getManualCardMap(city: City, docs: any[]) {
  const manualMap = new Map<string, { label: string; badgeId: string | null; eventId?: string | null }>();

  if (docs.length === 0) return manualMap;

  const { data: extraRows } = await (supabase as any)
    .from("front_structure_homepage_extra_cards")
    .select("id, business_id, badge_id, video_document_id, title, sort_order, event_id")
    .eq("city", city)
    .order("sort_order", { ascending: true });

  const cards = ((extraRows as any[]) || []) as Array<{
    id: string;
    business_id: string | null;
    badge_id: string | null;
    video_document_id: string | null;
    title: string | null;
    sort_order: number | null;
    event_id?: string | null;
  }>;

  if (cards.length === 0) return manualMap;

  const badgeIds = Array.from(new Set(cards.map((card) => card.badge_id).filter(Boolean))) as string[];

  const [{ data: badges }, { data: badgeLinks }] = await Promise.all([
    badgeIds.length > 0
      ? supabase.from("badges").select("id, name_fr").in("id", badgeIds)
      : Promise.resolve({ data: [] }),
    badgeIds.length > 0
      ? supabase.from("business_document_badges").select("badge_id, document_id").in("badge_id", badgeIds)
      : Promise.resolve({ data: [] }),
  ]);

  const badgeNameById = new Map<string, string>(((badges as any[]) || []).map((badge) => [badge.id, badge.name_fr]));
  const docIdsByBadgeId = new Map<string, Set<string>>();
  ((badgeLinks as any[]) || []).forEach((link) => {
    const current = docIdsByBadgeId.get(link.badge_id) || new Set<string>();
    current.add(link.document_id);
    docIdsByBadgeId.set(link.badge_id, current);
  });

  const pickLabel = (card: { title: string | null; badge_id: string | null }) => {
    const trimmedTitle = card.title?.trim();
    return trimmedTitle || (card.badge_id ? badgeNameById.get(card.badge_id) || null : null);
  };

  cards.forEach((card) => {
    const label = pickLabel(card);
    if (!label) return;

    if (card.video_document_id) {
      if (!manualMap.has(card.video_document_id)) {
        manualMap.set(card.video_document_id, { label, badgeId: card.badge_id, eventId: card.event_id ?? null });
      }
      return;
    }

    const matchingDocs = docs.filter((doc) => {
      const matchesBusiness = !card.business_id || [doc.business_id, doc.linked_business_id, doc.poi_id].includes(card.business_id);
      const matchesBadge = !card.badge_id || docIdsByBadgeId.get(card.badge_id)?.has(doc.id);
      const matchesEvent = !card.event_id || doc.event_id === card.event_id;
      return matchesBusiness && matchesBadge && matchesEvent;
    });

    if (matchingDocs.length === 0) return;

    const selectedDoc = [...matchingDocs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
    if (selectedDoc && !manualMap.has(selectedDoc.id)) {
      manualMap.set(selectedDoc.id, { label, badgeId: card.badge_id, eventId: card.event_id ?? null });
    }
  });

  return manualMap;
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
  const [subcatParents, setSubcatParents] = useState<Record<string, string>>({});
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
  const [videoBadgeFilter, setVideoBadgeFilter] = useState<{ badgeId: string; label: string } | null>(null);
  const [videoEventFilter, setVideoEventFilter] = useState<VideoEventFilter | null>(null);
  const [videoBadgeDocIds, setVideoBadgeDocIds] = useState<Set<string> | null>(null);

  // Load doc ids matching the active video badge filter
  useEffect(() => {
    if (!videoBadgeFilter) {
      setVideoBadgeDocIds(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("business_document_badges")
        .select("document_id")
        .eq("badge_id", videoBadgeFilter.badgeId);
      if (cancelled) return;
      setVideoBadgeDocIds(new Set(((data as any[]) || []).map((r) => r.document_id)));
    })();
    return () => { cancelled = true; };
  }, [videoBadgeFilter]);


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
        supabase.from("subcategories").select("id, name_fr, category_id"),
        supabase.from("services").select("id, name_fr").eq("is_active", true),
      ]);

      // Load category names to build subcategory → parent category map
      const { data: catsData } = await supabase.from("categories").select("id, name_fr");
      const catNameById: Record<string, string> = {};
      (catsData || []).forEach((c: any) => { catNameById[c.id] = c.name_fr; });

      const subMap: Record<string, string> = {};
      const parentMap: Record<string, string> = {};
      (subsRes.data || []).forEach((s: any) => {
        subMap[s.id] = s.name_fr;
        if (s.category_id && catNameById[s.category_id]) parentMap[s.id] = catNameById[s.category_id];
      });
      setSubcatNames(subMap);
      setSubcatParents(parentMap);

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
  // Paginate to bypass PostgREST 1000-row limit.
  useEffect(() => {
    if (!cityRowId) { setExtraCityDocIds(new Set()); return; }
    let cancelled = false;
    (async () => {
      const all: string[] = [];
      const PAGE = 1000;
      let offset = 0;
      while (true) {
        const { data } = await supabase
          .from("business_document_cities")
          .select("document_id")
          .eq("city_id", cityRowId)
          .range(offset, offset + PAGE - 1);
        const rows = (data as any[]) || [];
        all.push(...rows.map((r) => r.document_id));
        if (rows.length < PAGE) break;
        offset += PAGE;
      }
      if (!cancelled) setExtraCityDocIds(new Set(all));
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

  const topLevelEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (entry.subcategory_ids.length === 0) return true;

      return !entries.some((candidate) => {
        if (candidate.id === entry.id) return false;
        if (candidate.subcategory_ids.length <= entry.subcategory_ids.length) return false;

        return entry.subcategory_ids.every((subcategoryId) =>
          candidate.subcategory_ids.includes(subcategoryId)
        );
      });
    });
  }, [entries]);

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
    if (loading) return [homeEntry, vlogsEntry, ...topLevelEntries];
    const filtered = topLevelEntries.filter((e) => entriesWithVideos.has(e.id));
    return [homeEntry, vlogsEntry, ...filtered];
  }, [entriesWithVideos, loading, topLevelEntries]);

  const selectedEntry = useMemo(
    () => visibleEntries.find((e) => e.id === selectedEntryId) || null,
    [visibleEntries, selectedEntryId]
  );

  useEffect(() => {
    if (!selectedEntryId) return;
    if (visibleEntries.some((entry) => entry.id === selectedEntryId)) return;

    setSelectedEntryId(HOME_ID);
    setSelectedSubId(null);
  }, [selectedEntryId, visibleEntries]);

  // Load videos for selected entry — same logic as backoffice FrontStructureVideosPanel:
  // match business_documents.subcategory_id ∈ entry.subcategory_ids, filter by document.city,
  // keep only internal videos, sort by sort_order, take first 15.
  useEffect(() => {
    if (!selectedEntry && !videoBadgeFilter && !videoEventFilter) {
      setVideos([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const safeSetVideos = (v: VideoItem[]) => { if (!cancelled) setVideos(v); };
      const safeSetLoadingVideos = (b: boolean) => { if (!cancelled) setLoadingVideos(b); };
      safeSetLoadingVideos(true);
      console.log("[Test load]", { selectedEntryId: selectedEntry?.id, selectedEntryName: selectedEntry?.name, videoBadgeFilter, videoEventFilter, city });

      // Event filter (Agenda): show ONE card per event, using event.images[0] as thumbnail.
      if (videoEventFilter) {
        const { data: eventRow } = await (supabase as any)
          .from("events")
          .select("id, name, images, default_business_id")
          .eq("id", videoEventFilter.eventId)
          .maybeSingle();

        const ev = eventRow as any;
        const image = ev?.images?.[0] || null;

        let biz: SearchResultBusiness | null = null;
        if (ev?.default_business_id) {
          const { data: bizRow } = await supabase
            .from("businesses")
            .select("id, name, images, logo_url, logo_bg, rating, computed_rating, total_review_count, categories, default_service, is_open_24h, show_opening_hours, opening_hours, city, neighborhood, latitude, longitude, engagements, wtuce_status")
            .eq("id", ev.default_business_id)
            .maybeSingle();
          biz = (bizRow as any) || null;
        }

        if (!ev || !image) {
          safeSetVideos([]);
        } else {
          safeSetVideos([{
            id: `event:${ev.id}`,
            url: "",
            business_name: ev.name || videoEventFilter.label,
            thumbnail_url: image,
            business: biz,
            owner: biz ? { id: biz.id, name: biz.name, logo_url: (biz as any).logo_url ?? null, logo_bg: (biz as any).logo_bg ?? null } : null,
            social: null,
            description: null,
            manualCard: { label: ev.name || videoEventFilter.label, badgeId: null, eventId: ev.id },
          } as VideoItem]);
        }
        safeSetLoadingVideos(false);
        return;
      }

      // Badge filter takes precedence: load videos by badge for the current city
      if (videoBadgeFilter) {
        const { data: badgeDocs } = await supabase
          .from("business_document_badges")
          .select("document_id")
          .eq("badge_id", videoBadgeFilter.badgeId);
        const docIds = ((badgeDocs as any[]) || []).map((r) => r.document_id);
        const allDocs: any[] = [];
        const batch = 300;
        for (let i = 0; i < docIds.length; i += batch) {
          const chunk = docIds.slice(i, i + batch);
          const { data } = await supabase
            .from("business_documents")
            .select("id, url, thumbnail_url, business_id, sort_order, poi_id, linked_business_id, destination_id, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url, description, city")
            .eq("type", "video")
            .in("id", chunk);
          if (data) allDocs.push(...data);
        }
        // Filter by current city: keep the exact backoffice video document rows.
        const uniqueDocs = allDocs.filter((d: any) => d.city === city || extraCityDocIds.has(d.id));
        const allBizIds = [...new Set(uniqueDocs.map((d: any) => d.business_id).filter(Boolean))] as string[];
        const bizMap = new Map<string, SearchResultBusiness>();
        if (allBizIds.length > 0) {
          for (let i = 0; i < allBizIds.length; i += batch) {
            const { data: bizs } = await supabase
              .from("businesses")
              .select("id, name, images, logo_url, logo_bg, rating, computed_rating, total_review_count, categories, default_service, is_open_24h, show_opening_hours, opening_hours, city, neighborhood, latitude, longitude, engagements, wtuce_status")
              .in("id", allBizIds.slice(i, i + batch));
            (bizs || []).forEach((b: any) => bizMap.set(b.id, b as SearchResultBusiness));
          }
        }
        uniqueDocs.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        // Exception: for the manual "Suivez le guide" card (badge "Guide"),
        // show every video tagged in this city without grouping by business.
        const isGuideBadge = /^(suivez le guide|guide)$/i.test(videoBadgeFilter.label.trim());
        const isVlogsBadge = /^#?\s*vlogs?$/i.test(videoBadgeFilter.label.trim());
        // For all badge filters, also pull in generic_videos and YouTube videos
        // tagged with the same badge (not only the Guide badge).
        const includeExtraSources = true;
        // Keep only one video per business: the first one (lowest sort_order)
        const seenBizIds = new Set<string>();
        const dedupedByBiz = isGuideBadge
          ? uniqueDocs
          : uniqueDocs.filter((d: any) => {
              if (!d.business_id) return true;
              if (seenBizIds.has(d.business_id)) return false;
              seenBizIds.add(d.business_id);
              return true;
            });
        const docVideoItems: VideoItem[] = dedupedByBiz.map((d: any) => {
          const biz = bizMap.get(d.business_id) || null;
          return {
            id: d.id,
            url: d.url,
            business_name: biz?.name || "—",
            thumbnail_url: d.thumbnail_url,
            business: biz,
            owner: biz ? { id: biz.id, name: biz.name, logo_url: (biz as any).logo_url ?? null, logo_bg: (biz as any).logo_bg ?? null } : null,
            social: extractSocial(d),
            description: d.description ?? null,
            manualCard: null,
          } as VideoItem;
        });

        // For "Suivez le guide" (Guide badge): also include generic videos tagged
        // with the same badge and assigned to the current city (either via
        // generic_videos.city or via generic_video_cities multi-city links).
        let genericVideoItems: VideoItem[] = [];
        if (includeExtraSources) {
          const { data: gvBadgeLinks } = await supabase
            .from("generic_video_badges" as any)
            .select("generic_video_id")
            .eq("badge_id", videoBadgeFilter.badgeId);
          const gvIds = [...new Set(((gvBadgeLinks as any[]) || []).map((l: any) => l.generic_video_id))];
          if (gvIds.length > 0) {
            const { data: cityRow } = await supabase
              .from("cities")
              .select("id")
              .eq("name_fr", city)
              .maybeSingle();
            const cityId = (cityRow as any)?.id ?? null;

            const [{ data: extraCityLinks }, { data: gvs }] = await Promise.all([
              cityId
                ? supabase
                    .from("generic_video_cities" as any)
                    .select("generic_video_id")
                    .eq("city_id", cityId)
                    .in("generic_video_id", gvIds)
                : Promise.resolve({ data: [] as any[] } as any),
              supabase
                .from("generic_videos" as any)
                .select("id, url, name, thumbnail_url, city, sort_order, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url, description")
                .in("id", gvIds)
                .order("sort_order", { ascending: true }),
            ]);
            const extraIds = new Set(((extraCityLinks as any[]) || []).map((l: any) => l.generic_video_id));
            const gvFiltered = ((gvs as any[]) || []).filter((v: any) => v.city === city || extraIds.has(v.id));

            // Resolve first linked business (for owner display) — best effort
            const { data: gvBizLinks } = await supabase
              .from("generic_video_businesses" as any)
              .select("generic_video_id, business_id")
              .in("generic_video_id", gvFiltered.map((v: any) => v.id));
            const firstBizByGv: Record<string, string> = {};
            (((gvBizLinks as any[]) || [])).forEach((l: any) => {
              if (!firstBizByGv[l.generic_video_id]) firstBizByGv[l.generic_video_id] = l.business_id;
            });
            const gvBizIds = [...new Set(Object.values(firstBizByGv))];
            const gvBizMap = new Map<string, SearchResultBusiness>();
            if (gvBizIds.length > 0) {
              const { data: gvBizs } = await supabase
                .from("businesses")
                .select("id, name, images, logo_url, logo_bg, rating, computed_rating, total_review_count, categories, default_service, is_open_24h, show_opening_hours, opening_hours, city, neighborhood, latitude, longitude, engagements, wtuce_status")
                .in("id", gvBizIds);
              (gvBizs || []).forEach((b: any) => gvBizMap.set(b.id, b as SearchResultBusiness));
            }

            genericVideoItems = gvFiltered.map((v: any) => {
              const bizId = firstBizByGv[v.id];
              const biz = isVlogsBadge ? null : (bizId ? gvBizMap.get(bizId) || null : null);
              const acct = (v.instagram_account || v.tiktok_account || v.youtube_account || "").replace(/^@+/, "");
              return {
                id: v.id,
                url: v.url,
                business_name: isVlogsBadge
                  ? (acct ? `@${acct}` : (v.name || "—"))
                  : (v.name || (acct ? `@${acct}` : (biz?.name || "—"))),
                thumbnail_url: v.thumbnail_url || deriveThumbnail(v.url),
                business: isVlogsBadge ? null : biz,
                owner: isVlogsBadge ? null : (biz ? { id: biz.id, name: biz.name, logo_url: (biz as any).logo_url ?? null, logo_bg: (biz as any).logo_bg ?? null } : null),
                social: extractSocial(v),
                description: v.description ?? null,
                manualCard: null,
              } as VideoItem;
            });
          }
        }

        // For "Suivez le guide" (Guide badge): also include YouTube videos
        // (Shorts and standard) tagged with the same badge whose owner business
        // is located in the current city.
        let youtubeVideoItems: VideoItem[] = [];
        if (includeExtraSources) {
          const { data: ytBadgeLinks } = await supabase
            .from("business_youtube_video_badges")
            .select("youtube_video_id")
            .eq("badge_id", videoBadgeFilter.badgeId);
          const ytIds = [...new Set(((ytBadgeLinks as any[]) || []).map((l: any) => l.youtube_video_id))];
          if (ytIds.length > 0) {
            const ytRows: any[] = [];
            for (let i = 0; i < ytIds.length; i += batch) {
              const { data } = await supabase
                .from("business_youtube_videos")
                .select("id, video_id, title, thumbnail, is_short, is_visible, sort_order, business_id")
                .eq("is_visible", true)
                .in("id", ytIds.slice(i, i + batch))
                .order("sort_order", { ascending: true });
              if (data) ytRows.push(...data);
            }
            const ytBizIds = [...new Set(ytRows.map((y: any) => y.business_id).filter(Boolean))] as string[];
            const ytBizMap = new Map<string, SearchResultBusiness>();
            if (ytBizIds.length > 0) {
              for (let i = 0; i < ytBizIds.length; i += batch) {
                const { data: bizs } = await supabase
                  .from("businesses")
                  .select("id, name, images, logo_url, logo_bg, rating, computed_rating, total_review_count, categories, default_service, is_open_24h, show_opening_hours, opening_hours, city, neighborhood, latitude, longitude, engagements, wtuce_status")
                  .in("id", ytBizIds.slice(i, i + batch));
                (bizs || []).forEach((b: any) => ytBizMap.set(b.id, b as SearchResultBusiness));
              }
            }
            // Filter by current city via the owner business's city
            const ytFiltered = ytRows.filter((y: any) => {
              const biz = y.business_id ? ytBizMap.get(y.business_id) : null;
              return biz?.city === city;
            });
            youtubeVideoItems = ytFiltered.map((y: any) => {
              const biz = ytBizMap.get(y.business_id) || null;
              return {
                id: y.id,
                url: y.is_short
                  ? `https://www.youtube.com/shorts/${y.video_id}`
                  : `https://www.youtube.com/watch?v=${y.video_id}`,
                business_name: y.title || biz?.name || "—",
                thumbnail_url: y.thumbnail || `https://i.ytimg.com/vi/${y.video_id}/hqdefault.jpg`,
                business: biz,
                owner: biz ? { id: biz.id, name: biz.name, logo_url: (biz as any).logo_url ?? null, logo_bg: (biz as any).logo_bg ?? null } : null,
                social: null,
                description: null,
                manualCard: null,
              } as VideoItem;
            });
          }
        }

        safeSetVideos([...docVideoItems, ...genericVideoItems, ...youtubeVideoItems]);
        safeSetLoadingVideos(false);
        return;
      }

      if (!selectedEntry) {
        safeSetVideos([]);
        safeSetLoadingVideos(false);
        return;
      }


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
          safeSetVideos([]);
          safeSetLoadingVideos(false);
          return;
        }
        const { data: links } = await supabase
          .from("generic_video_destinations" as any)
          .select("generic_video_id")
          .eq("destination_id", destId);
        const linkedIds = new Set(((links as any[]) || []).map((l) => l.generic_video_id));
        if (linkedIds.size === 0) {
          safeSetVideos([]);
          safeSetLoadingVideos(false);
          return;
        }
        const { data: vidsData, error: vidsErr } = await supabase
          .from("generic_videos" as any)
          .select("id, url, name, thumbnail_url, instagram_account, tiktok_account, youtube_account, sort_order")
          .in("id", [...linkedIds])
          .order("sort_order", { ascending: true });
        const vids = (vidsData as any[]) || [];
        console.log("[Vlogs debug]", { city, destId, linkedIds: [...linkedIds], vidsCount: vids.length, vidsErr });
        const ordered = vids
          .map((v: any) => {
            const acct = (v.instagram_account || v.tiktok_account || v.youtube_account || "").replace(/^@+/, "");
            return {
              id: v.id,
              url: v.url,
              business_name: acct ? `@${acct}` : (v.name || "—"),
              thumbnail_url: v.thumbnail_url || deriveThumbnail(v.url),
              business: null,
              owner: null,
              social: extractSocial(v),
              description: null,
              manualCard: null,
            } as VideoItem;
          })
          .filter(Boolean) as VideoItem[];
        safeSetVideos(ordered);
        safeSetLoadingVideos(false);
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
          safeSetVideos([]);
          safeSetLoadingVideos(false);
          return;
        }
        const batch = 300;
        for (let i = 0; i < bizIds.length; i += batch) {
          const chunk = bizIds.slice(i, i + batch);
          const { data } = await supabase
            .from("business_documents")
            .select("id, url, thumbnail_url, business_id, sort_order, front_sort_order, poi_id, linked_business_id, destination_id, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url, description, event_id")
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
            .select("id, url, thumbnail_url, business_id, sort_order, front_sort_order, poi_id, linked_business_id, destination_id, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url, description, event_id")
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
          safeSetVideos([]);
          safeSetLoadingVideos(false);
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

        // Keep the exact backoffice video document rows; do not deduplicate by URL.
        const uniqueDocs = allDocs;

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


        const manualCardMap = !selectedSubId ? await getManualCardMap(city, limitedDocs) : new Map<string, { label: string; badgeId: string | null; eventId?: string | null }>();

        const docItems: VideoItem[] = limitedDocs.map((d: any) => {
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
            manualCard: manualCardMap.get(d.id) || null,
          } as VideoItem;
        });

        // Also include generic_videos linked to one of the selected subcategories
        // and matching the current city (via generic_videos.city or generic_video_cities).
        let genericSubItems: VideoItem[] = [];
        try {
          const { data: gvSubLinks } = await supabase
            .from("generic_video_subcategories" as any)
            .select("generic_video_id")
            .in("subcategory_id", subIds);
          const gvIds = [...new Set(((gvSubLinks as any[]) || []).map((l: any) => l.generic_video_id))];
          if (gvIds.length > 0) {
            const { data: cityRow } = await supabase
              .from("cities")
              .select("id")
              .eq("name_fr", city)
              .maybeSingle();
            const cityId = (cityRow as any)?.id ?? null;

            const [{ data: extraCityLinks }, { data: gvs }] = await Promise.all([
              cityId
                ? supabase
                    .from("generic_video_cities" as any)
                    .select("generic_video_id")
                    .eq("city_id", cityId)
                    .in("generic_video_id", gvIds)
                : Promise.resolve({ data: [] as any[] } as any),
              supabase
                .from("generic_videos" as any)
                .select("id, url, name, thumbnail_url, city, sort_order, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url, description")
                .in("id", gvIds)
                .order("sort_order", { ascending: true }),
            ]);
            const extraIds = new Set(((extraCityLinks as any[]) || []).map((l: any) => l.generic_video_id));
            const gvFiltered = ((gvs as any[]) || []).filter((v: any) => v.city === city || extraIds.has(v.id));

            const { data: gvBizLinks } = await supabase
              .from("generic_video_businesses" as any)
              .select("generic_video_id, business_id")
              .in("generic_video_id", gvFiltered.map((v: any) => v.id));
            const firstBizByGv: Record<string, string> = {};
            (((gvBizLinks as any[]) || [])).forEach((l: any) => {
              if (!firstBizByGv[l.generic_video_id]) firstBizByGv[l.generic_video_id] = l.business_id;
            });
            const gvBizIds = [...new Set(Object.values(firstBizByGv))];
            const gvBizMap = new Map<string, SearchResultBusiness>();
            if (gvBizIds.length > 0) {
              const { data: gvBizs } = await supabase
                .from("businesses")
                .select("id, name, images, logo_url, logo_bg, rating, computed_rating, total_review_count, categories, default_service, is_open_24h, show_opening_hours, opening_hours, city, neighborhood, latitude, longitude, engagements, wtuce_status")
                .in("id", gvBizIds);
              (gvBizs || []).forEach((b: any) => gvBizMap.set(b.id, b as SearchResultBusiness));
            }

            const seenUrlsGv = new Set<string>(docItems.map((i) => i.url).filter(Boolean) as string[]);
            genericSubItems = gvFiltered
              .filter((v: any) => v.url && !seenUrlsGv.has(v.url) && (seenUrlsGv.add(v.url), true))
              .map((v: any) => {
                const bizId = firstBizByGv[v.id];
                const isVlogsContext = selectedEntry?.id === VLOGS_ID;
                const biz = isVlogsContext ? null : (bizId ? gvBizMap.get(bizId) || null : null);
                const acct = (v.instagram_account || v.tiktok_account || v.youtube_account || "").replace(/^@+/, "");
                return {
                  id: v.id,
                  url: v.url,
                  business_name: isVlogsContext
                    ? (acct ? `@${acct}` : (v.name || "—"))
                    : (v.name || (acct ? `@${acct}` : (biz?.name || "—"))),
                  thumbnail_url: v.thumbnail_url || deriveThumbnail(v.url),
                  business: isVlogsContext ? null : biz,
                  owner: isVlogsContext ? null : (biz ? { id: biz.id, name: biz.name, logo_url: (biz as any).logo_url ?? null, logo_bg: (biz as any).logo_bg ?? null } : null),
                  social: extractSocial(v),
                  description: v.description ?? null,
                  manualCard: null,
                } as VideoItem;
              });
          }
        } catch (e) {
          console.warn("[Test sub generic_videos] failed", e);
        }

        safeSetVideos([...docItems, ...genericSubItems]);
        safeSetLoadingVideos(false);
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

      safeSetVideos(
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
            manualCard: null,
          };
        })
      );
      safeSetLoadingVideos(false);
    };
    load();
    return () => { cancelled = true; };
  }, [selectedEntry, city, selectedSubId, extraCityDocIds, videoBadgeFilter, videoEventFilter]);

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
        manualCard: null,
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

  const activateVideoBadgeFilter = async (badgeId: string, label: string, targetCity: City) => {
    setBadgeView(null);
    setLoadingBadge(false);
    setBadgeBusinesses([]);
    setActiveVideo(null);
    setPanelOpen(false);
    setCurrentTime(0);
    setSelectedSubId(null);

    if (city !== targetCity) {
      setCity(targetCity);
    }

    setVideoEventFilter(null);
    setOtherViewMode("videos");
    setVideoBadgeFilter({ badgeId, label });

    return true;
  };

  const activateVideoEventFilter = async (eventId: string, label: string, targetCity: City) => {
    setBadgeView(null);
    setLoadingBadge(false);
    setBadgeBusinesses([]);
    setActiveVideo(null);
    setPanelOpen(false);
    setCurrentTime(0);
    setSelectedSubId(null);

    if (city !== targetCity) {
      setCity(targetCity);
    }

    setVideoBadgeFilter(null);
    setOtherViewMode("videos");
    setSelectedEntryId(HOME_ID);
    setVideoEventFilter({ eventId, label });

    return true;
  };

  const handleHomeLabelClick = async (
    info: { label: string; kind: "entry" | "extra"; badgeId: string | null; eventId?: string | null },
    clickedCity: City
  ) => {

    if (info.kind === "entry") {
      const match = entries.find((e) => e.name.toLowerCase() === info.label.toLowerCase());
      if (match) {
        setBadgeView(null);
        setVideoBadgeFilter(null);
        setSelectedEntryId(match.id);
        setSelectedSubId(null);
      }
      return;
    }

    if (info.eventId) {
      await activateVideoEventFilter(info.eventId, info.label, clickedCity);
      return;
    }

    if (isAgendaLabel(info.label)) {
      const { data: agendaCard } = await (supabase as any)
        .from("front_structure_homepage_extra_cards")
        .select("event_id")
        .eq("city", clickedCity)
        .ilike("title", "Agenda")
        .not("event_id", "is", null)
        .maybeSingle();

      const eventId = (agendaCard as any)?.event_id;
      if (eventId) {
        await activateVideoEventFilter(eventId, info.label, clickedCity);
        return;
      }
    }

    if (!info.badgeId) return;

    const activated = await activateVideoBadgeFilter(info.badgeId, info.label, clickedCity);
    if (activated) return;

    setSelectedEntryId(HOME_ID);
    setBadgeView({ badgeId: info.badgeId, label: info.label, city: clickedCity });
    setLoadingBadge(true);
    setBadgeBusinesses([]);
    const [{ data: businessLinks }, { data: documentLinks }] = await Promise.all([
      supabase
        .from("business_badges")
        .select("business_id")
        .eq("badge_id", info.badgeId),
      supabase
        .from("business_document_badges")
        .select("document_id, business_documents!inner(business_id, linked_business_id, poi_id)")
        .eq("badge_id", info.badgeId),
    ]);

    const ids = Array.from(
      new Set([
        ...(((businessLinks as any[]) || []).map((link) => link.business_id)),
        ...(((documentLinks as any[]) || []).flatMap((link: any) => {
          const document = Array.isArray(link.business_documents)
            ? link.business_documents[0]
            : link.business_documents;

          return [document?.poi_id, document?.linked_business_id, document?.business_id].filter(Boolean);
        })),
      ])
    );

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
            return (
              <li key={e.id}>
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
          {selectedEntryId === HOME_ID && !videoBadgeFilter && !videoEventFilter ? (
            <>
              <Tabs defaultValue={city.toLowerCase()} value={city.toLowerCase()} onValueChange={(v) => { setCity((v.charAt(0).toUpperCase() + v.slice(1)) as City); setBadgeView(null); setVideoBadgeFilter(null); setVideoEventFilter(null); }}>
                <TabsList>
                  <TabsTrigger value="marrakech">Marrakech</TabsTrigger>
                  <TabsTrigger value="essaouira">Essaouira</TabsTrigger>
                </TabsList>
                <TabsContent value="marrakech">
                  <div>
                    <HomepageCardsFront
                      city="Marrakech"
                      onLabelClick={(info) => handleHomeLabelClick(info, "Marrakech")}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="essaouira">
                  <div>
                    <HomepageCardsFront
                      city="Essaouira"
                      onLabelClick={(info) => handleHomeLabelClick(info, "Essaouira")}
                    />
                  </div>
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
          ) : !selectedEntry && !videoBadgeFilter ? (
            <p className="text-sm text-muted-foreground">
              Sélectionne une entrée dans la colonne de gauche.
            </p>
          ) : loadingVideos ? (
            <p className="text-sm text-muted-foreground">Chargement des vidéos…</p>
          ) : videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune vidéo trouvée{videoEventFilter ? ` pour « ${videoEventFilter.label} »` : videoBadgeFilter ? ` pour « ${videoBadgeFilter.label} »` : selectedEntry ? ` pour « ${selectedEntry.name} »` : ""} à {city}.
            </p>
          ) : (() => {
            const isGuide = otherViewMode === "guide";
            const baseList = isGuide ? guideVideos : otherVideos;
            const displayList = baseList;
            const isThumbMode = otherViewMode === "videos" || isGuide;
            const isParentEntry =
              !!selectedEntry &&
              selectedEntry.id !== HOME_ID &&
              selectedEntry.id !== VLOGS_ID &&
              !selectedSubId;
            const childItems = isParentEntry
              ? selectedEntry.subcategory_ids
                  .filter((id) => subsWithVideos.has(id))
                  .map((id) => ({ id, name: subcatNames[id] }))
                  .filter((c) => c.name)
                  .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }))
              : [];
            const showChildrenTile =
              isParentEntry && !isGuide && otherViewMode === "videos" && childItems.length >= 2;
            const childrenTileIndex = 2; // position 3
            return (
            <div className="flex gap-6 items-start">
              {(displayList.length > 0 || isGuide) && (
                <div className="w-full min-w-0">
                  <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                      {isGuide ? (
                        <span>Suivez le guide ({displayList.length})</span>
                      ) : videoBadgeFilter ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setVideoBadgeFilter(null);
                              setSelectedEntryId(HOME_ID);
                              setSelectedSubId(null);
                            }}
                            className="text-muted-foreground font-normal hover:text-foreground hover:underline transition-colors"
                          >
                            Page d'accueil
                          </button>
                          <span className="text-muted-foreground font-normal">›</span>
                          <span>{videoBadgeFilter.label}</span>
                          <span className="text-muted-foreground font-normal">({displayList.length})</span>
                        </>
                      ) : selectedSubId && subcatNames[selectedSubId] ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEntryId(HOME_ID);
                              setSelectedSubId(null);
                            }}
                            className="text-muted-foreground font-normal hover:text-foreground hover:underline transition-colors"
                          >
                            Page d'accueil
                          </button>
                          <span className="text-muted-foreground font-normal">›</span>
                          {subcatParents[selectedSubId] && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedSubId(null)}
                                className="text-muted-foreground font-normal hover:text-foreground hover:underline transition-colors"
                              >
                                {subcatParents[selectedSubId]}
                              </button>
                              <span className="text-muted-foreground font-normal">›</span>
                            </>
                          )}
                          <span>{subcatNames[selectedSubId]}</span>
                          <span className="text-muted-foreground font-normal">({displayList.length})</span>
                        </>
                      ) : isParentEntry ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEntryId(HOME_ID);
                              setSelectedSubId(null);
                            }}
                            className="text-muted-foreground font-normal hover:text-foreground hover:underline transition-colors"
                          >
                            Page d'accueil
                          </button>
                          <span className="text-muted-foreground font-normal">›</span>
                          <span>{selectedEntry.name}</span>
                          <span className="text-muted-foreground font-normal">({displayList.length})</span>
                        </>
                      ) : (
                        <span>{selectedEntry.name} ({displayList.length})</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
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
                    {(() => {
                      const items: Array<{ kind: "video"; v: VideoItem; idx: number } | { kind: "children" }> =
                        displayList.map((v, idx) => ({ kind: "video" as const, v, idx }));
                      if (showChildrenTile) {
                        const insertAt = Math.min(childrenTileIndex, items.length);
                        items.splice(insertAt, 0, { kind: "children" });
                      }
                      return items.map((entry, i) => {
                        if (entry.kind === "children") {
                          return (
                            <div
                              key="children-tile"
                              className="aspect-[9/16] rounded-lg overflow-hidden bg-card border border-border p-2 flex flex-col"
                            >
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
                                Sous-catégories
                              </p>
                              <div className="flex-1 overflow-y-auto flex flex-col gap-1">
                                {childItems.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedSubId(c.id);
                                    }}
                                    className="text-left text-xs px-2 py-1.5 rounded bg-muted hover:bg-primary hover:text-primary-foreground transition-colors line-clamp-2"
                                  >
                                    {c.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        const v = entry.v;
                        const idx = entry.idx;
                        const handlePick = () => {
                          setActiveVideo(v);
                          setActiveVideoId(v.id);
                          setPanelOpen(true);
                        };
                        if (isThumbMode) {
                          const isVlogThumb = selectedEntry?.id === VLOGS_ID;
                          const thumb = v.thumbnail_url || deriveThumbnail(v.url);
                          const isFile = /\.(mp4|webm|mov)(\?|$)/i.test(v.url);
                          return (
                      <div
                        key={v.id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement | null;
                          const clickedManualBadge = target?.closest("[data-manual-badge='true']");

                          if (clickedManualBadge && v.manualCard?.badgeId) {
                            void activateVideoBadgeFilter(v.manualCard.badgeId, v.manualCard.label, city);
                            return;
                          }

                          handlePick();
                        }}
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigator.clipboard.writeText(v.id);
                            toast.success(`ID copié : ${v.id.slice(0, 8)}…`);
                          }}
                          title={`Copier l'ID : ${v.id}`}
                          className="absolute top-1.5 right-1.5 z-30 px-1.5 py-0.5 rounded bg-black/70 hover:bg-black/90 text-white font-mono text-[9px] leading-none transition-colors"
                        >
                          {v.id.slice(0, 8)}
                        </button>
                        {v.manualCard?.label && (
                          <div className="absolute inset-x-0 top-[10%] z-20 flex items-center justify-center px-2 pointer-events-none">
                            <button
                              type="button"
                              data-manual-badge="true"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (v.manualCard?.badgeId) {
                                  void activateVideoBadgeFilter(v.manualCard.badgeId, v.manualCard.label, city);
                                }
                              }}
                              className="pointer-events-auto px-2.5 py-1 rounded-md bg-gold text-black text-xs font-bold uppercase tracking-wide text-center line-clamp-2 shadow-lg border-2 border-black cursor-pointer hover:bg-gold/90 transition-colors"
                            >
                              {v.manualCard.label}
                            </button>
                          </div>
                        )}
                        {selectedEntry?.id !== HOME_ID && v.business?.engagements?.includes("Logistique:Commandez en ligne et recevez votre colis chez vous") && (
                          <div className="absolute inset-x-0 top-[10%] z-20 flex items-center justify-center px-2 pointer-events-none">
                            <span
                              className="px-2.5 py-1 rounded-md text-white text-xs font-bold uppercase tracking-wide text-center line-clamp-2 shadow-lg border-2 border-black"
                              style={{ backgroundColor: "#C04F17" }}
                            >
                              Commandez en ligne
                            </span>
                          </div>
                        )}
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
                        {!isVlogThumb && v.owner?.logo_url && (
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
                        {((isVlogThumb ? v.business_name : v.owner?.name || v.business_name)) && (
                          <div className="absolute bottom-0 left-0 right-0 p-1.5">
                            <p className="text-[10px] font-medium text-white line-clamp-1">{isVlogThumb ? v.business_name : v.owner?.name || v.business_name}</p>
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
                      });
                    })()}
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
