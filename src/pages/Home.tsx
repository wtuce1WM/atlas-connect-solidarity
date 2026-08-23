import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import Header from "@/components/Header";
const HeaderMenuContent = lazy(() => import("@/components/HeaderMenuContent"));
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getVideoEmbed } from "@/lib/videoEmbed";
import type { SearchResultBusiness } from "@/components/SearchResultCard";
import PanelSearchBar from "@/components/PanelSearchBar";
import { businessUrl } from "@/lib/businessUrl";
import { buildHomeVideosCacheKey, readHomeVideosCache, writeHomeVideosCache } from "@/lib/homeVideosCache";
import { useSEO } from "@/hooks/useSEO";

import { Menu as MenuIcon, X, Star, Youtube, MapPin } from "lucide-react";
import { InstagramIcon } from "@/components/staff/SocialMediaIcons";
import { TikTokIcon as SiTiktok } from "@/components/icons/TikTokIcon";

import HomeCityTabs from "@/components/home/HomeCityTabs";
import FooterCityDestinations from "@/components/home/FooterCityDestinations";
import HomeCityToolbar from "@/components/home/HomeCityToolbar";
import BadgeBusinessesGrid from "@/components/home/BadgeBusinessesGrid";
const HomeVideoSlidePanel = lazy(
  () => import("@/components/home/HomeVideoSlidePanel"),
) as typeof import("@/components/home/HomeVideoSlidePanel").default;
import {
  CITIES,
  type City,
  HOME_ID,
  VLOGS_ID,
  type OwnerInfo,
  type SocialInfo,
  isAgendaLabel,
  formatEventDateRange,
  DAY_LABEL_FR,
  formatDaysOfWeek,
  formatTimeRange,
  extractSocial,
  getVideoBusinessCandidateIds,
  resolveVideoEstablishment,
  normalizeSocialAccount,
  isDifferentDisplayedBusinessSocial,
  copyTextSilently,
  cityMatches,
  getCityAliases,
} from "@/lib/homeHelpers";
import { fetchDocBadgesByDocId, fetchYtBadgesByVideoId, fetchBusinessesByIds, DOC_VIDEO_COLS } from "@/lib/homeFetchHelpers";
import {
  buildDocVideoItem,
  buildYoutubeVideoItem,
  getCityIdByName,
  fetchServiceNamesByIds,
} from "@/lib/homeVideoBuilders";
import { getManualCardMap } from "@/lib/manualCards";
import { resolveHomepageCity, readLastHomepageCity, writeLastHomepageCity } from "@/lib/cityHomepage";
import { useGeolocation } from "@/hooks/useGeolocation";
import { sortWtuceAndRating } from "@/lib/businessRanking";
import { optimizeSupabaseImage } from "@/lib/imageOptimization";
import { getCached, revalidate } from "@/lib/swrCache";

interface FrontEntry {
  id: string;
  name: string;
  sort_order: number;
  subcategory_ids: string[];
  service_ids: string[];
  badge_ids: string[];
}

interface VideoItem {
  id: string;
  url: string;
  business_name: string;
  /** Nom de l'établissement "racine" du document (business_documents.business_id), distinct du owner quand un linked_business_id existe */
  pageBusinessName?: string | null;
  pageBusinessId?: string | null;
  thumbnail_url: string | null;
  business: SearchResultBusiness | null;
  /** Set only when the video's owner business differs from the display entity */
  owner: OwnerInfo | null;
  social: SocialInfo | null;
  showSocialBadge?: boolean;
  description: string | null;
  manualCard: { label: string; badgeId: string | null; eventId?: string | null } | null;
  subcategory_id?: string | null;
  service_id?: string | null;
  service_name?: string | null;
  eventInfo?: {
    name: string | null;
    hook: string | null;
    start_date: string | null;
    end_date: string | null;
    days_of_week: string[] | null;
    start_time: string | null;
    end_time: string | null;
  } | null;
  price?: string | null;
  priceType?: string | null;
  videoTitle?: string | null;
  videoName?: string | null;
  badge_ids?: string[];
}

interface VideoEventFilter {
  eventId: string;            // primary event id (kept for backward-compat / single-event activation)
  label: string;
  eventIds?: string[];        // when set, the filter shows MULTIPLE events (e.g. Agenda badge)
}

const Home = () => {
  const navigate = useLocalizedNavigate();

  // ============================================================
  // STATE
  // ============================================================
  // Initialize from last viewed city (localStorage) to avoid first-paint flash.
  // Will be overridden by URL param (?city=…) or by geolocation detection below.
  const [city, setCity] = useState<City>(() => readLastHomepageCity() || "Marrakech");
  const geo = useGeolocation();
  // True until either: URL specified a city, user manually picked one, or geo detection completed.
  const [resolvingCity, setResolvingCity] = useState(true);
  const cityResolvedRef = useRef(false);
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
  // Infinite scroll: render only first N cards initially, load more on scroll (LCP optimization)
  const INITIAL_VISIBLE = 6;
  const VISIBLE_INCREMENT = 12;
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_VISIBLE);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  // Preload first video thumbnail to accelerate LCP (works for Supabase URLs AND YouTube i.ytimg.com posters)
  useEffect(() => {
    const raw = videos[0]?.thumbnail_url;
    if (!raw) return;
    const isYoutube = /(?:i\.ytimg\.com|img\.youtube\.com)/.test(raw);
    const href = isYoutube ? raw : (optimizeSupabaseImage(raw, { width: 400 }) || raw);
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    (link as any).fetchPriority = "high";
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch {} };
  }, [videos]);

  // Reset visible count when videos list changes (new entry/sub/badge/city)
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [videos]);


  // Infinite scroll observer: load more cards when sentinel approaches viewport
  useEffect(() => {
    const el = loadMoreSentinelRef.current;
    if (!el) return;
    if (visibleCount >= videos.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + VISIBLE_INCREMENT, videos.length));
        }
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visibleCount, videos.length]);
  const [entriesWithVideos, setEntriesWithVideos] = useState<Set<string>>(new Set());
  const [subsWithVideos, setSubsWithVideos] = useState<Set<string>>(new Set());
  const [cityRowId, setCityRowId] = useState<string | null>(null);
  const [extraCityDocIds, setExtraCityDocIds] = useState<Set<string>>(new Set());
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [homeSearchOverlayOpen, setHomeSearchOverlayOpen] = useState(false);
  const [homeSearchCloseTrigger, setHomeSearchCloseTrigger] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenedRef = useRef<string | null>(null);
  const pendingOpenVideoRef = useRef<string | null>(null);
  const restoredOpenContextRef = useRef<string | null>(null);
  const initialUrlRestoredRef = useRef(false);

  // One-time restore from URL on mount (shareable links: city/entry/sub/badge/event/badgeView/view)
  // Read directly from window.location.search to avoid any timing issue with useSearchParams.
  useEffect(() => {
    if (initialUrlRestoredRef.current) return;
    initialUrlRestoredRef.current = true;

    const sp = new URLSearchParams(window.location.search);
    if (sp.get("openVideo")) return; // handled by the openVideo effect below

    const cityParam = sp.get("city") as City | null;
    if (cityParam && CITIES.includes(cityParam)) {
      setCity(cityParam);
      cityResolvedRef.current = true;
      setResolvingCity(false);
    }

    const entryParam = sp.get("entry");
    const subParam = sp.get("sub");
    const badgeId = sp.get("badgeId");
    const badgeLabel = sp.get("badgeLabel");
    const eventId = sp.get("eventId");
    const eventLabel = sp.get("eventLabel");
    const eventIds = sp.get("eventIds");
    const badgeViewParam = sp.get("badgeView");
    const badgeViewLabelParam = sp.get("badgeViewLabel");
    const viewParam = sp.get("view");

    if (eventId && eventLabel) {
      setVideoEventFilter({ eventId, label: eventLabel, eventIds: eventIds ? eventIds.split(",").filter(Boolean) : undefined });
    } else if (badgeId && badgeLabel) {
      setVideoBadgeFilter({ badgeId, label: badgeLabel });
    } else if (badgeViewParam && badgeViewLabelParam && cityParam && CITIES.includes(cityParam)) {
      setBadgeView({ badgeId: badgeViewParam, label: badgeViewLabelParam, city: cityParam });
    } else {
      if (entryParam) setSelectedEntryId(entryParam);
      if (subParam) setSelectedSubId(subParam);
    }
    if (subParam && (eventId || badgeId)) setSelectedSubId(subParam);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to URL changes after mount (e.g. clicking a hashtag in the global header
  // toolbar while already on the home page must update the active filter).
  useEffect(() => {
    if (!initialUrlRestoredRef.current) return;
    const sp = new URLSearchParams(window.location.search);
    const badgeId = sp.get("badgeId");
    const badgeLabel = sp.get("badgeLabel");
    const eventId = sp.get("eventId");
    const eventLabel = sp.get("eventLabel");
    const eventIds = sp.get("eventIds");
    const cityParam = sp.get("city") as City | null;

    if (cityParam && CITIES.includes(cityParam) && cityParam !== city) {
      setCity(cityParam);
    }

    if (eventId && eventLabel) {
      setVideoEventFilter({ eventId, label: eventLabel, eventIds: eventIds ? eventIds.split(",").filter(Boolean) : undefined });
      setVideoBadgeFilter(null);
    } else if (badgeId && badgeLabel) {
      setVideoBadgeFilter({ badgeId, label: badgeLabel });
      setVideoEventFilter(null);
    } else {
      setVideoBadgeFilter(null);
      setVideoEventFilter(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Geo-based homepage city resolution.
  // - Respects URL ?city= override (handled above) and any user manual change.
  // - If geo is enabled & coords arrive: pick the nearest configured homepage.
  // - If geo is disabled / denied: fall back to last viewed city (already initialized) or Marrakech.
  // - Persists the resolved city for next visit (no flash).
  useEffect(() => {
    if (cityResolvedRef.current) return;

    // Geo disabled or user declined: resolve immediately with fallback.
    if (!geo.isEnabled) {
      cityResolvedRef.current = true;
      setResolvingCity(false);
      return;
    }

    // Still detecting position: keep loader on.
    if (geo.isDetecting) return;

    if (!geo.coords) {
      if (geo.detectedCity && CITIES.includes(geo.detectedCity as City)) {
        setCity(geo.detectedCity as City);
        cityResolvedRef.current = true;
        setResolvingCity(false);
      }
      return;
    }

    const resolved = resolveHomepageCity(geo.coords);
    setCity(resolved);
    cityResolvedRef.current = true;
    setResolvingCity(false);
  }, [geo.isEnabled, geo.isDetecting, geo.coords, geo.detectedCity]);

  // Persist last viewed homepage city (manual switches or auto-resolution).
  useEffect(() => {
    if (!cityResolvedRef.current) return;
    writeLastHomepageCity(city);
  }, [city]);

  // Auto-reopen the SlidePanelHome on the original video when returning from a business panel
  useEffect(() => {
    const wantedId = searchParams.get("openVideo");
    if (!wantedId || autoOpenedRef.current === wantedId) return;
    pendingOpenVideoRef.current = wantedId;

    const shouldRestoreContext = restoredOpenContextRef.current !== wantedId;
    if (shouldRestoreContext) restoredOpenContextRef.current = wantedId;

    const cityParam = searchParams.get("city") as City | null;
    if (shouldRestoreContext && cityParam && CITIES.includes(cityParam) && city !== cityParam) setCity(cityParam);

    const entryParam = searchParams.get("entry");
    const subParam = searchParams.get("sub");
    const badgeId = searchParams.get("badgeId");
    const badgeLabel = searchParams.get("badgeLabel");
    const eventId = searchParams.get("eventId");
    const eventLabel = searchParams.get("eventLabel");
    const eventIds = searchParams.get("eventIds");

    
    if (shouldRestoreContext && eventId && eventLabel) {
      setVideoBadgeFilter(null);
      setSelectedEntryId(HOME_ID);
      setSelectedSubId(null);
      setVideoEventFilter({ eventId, label: eventLabel, eventIds: eventIds ? eventIds.split(",").filter(Boolean) : undefined });
    } else if (shouldRestoreContext && badgeId && badgeLabel) {
      setVideoEventFilter(null);
      setSelectedEntryId(HOME_ID);
      setSelectedSubId(null);
      setVideoBadgeFilter({ badgeId, label: badgeLabel });
    } else if (shouldRestoreContext) {
      setVideoBadgeFilter(null);
      setVideoEventFilter(null);
      setSelectedEntryId(entryParam || HOME_ID);
      setSelectedSubId(subParam || null);
    }

    const openVideo = (video: VideoItem) => {
      autoOpenedRef.current = wantedId;
      pendingOpenVideoRef.current = null;
      setActiveVideo(video);
      setActiveVideoId(video.id);
      setPanelOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("openVideo");
      setSearchParams(next, { replace: true });
    };

    const found = videos.find((v) => v.id === wantedId);
    if (found) {
      openVideo(found);
      return;
    }

    if (loadingVideos) return;
    let cancelled = false;
    (async () => {
      const { data: doc } = await supabase
        .from("business_documents")
        .select("id, url, thumbnail_url, business_id, linked_business_id, poi_id, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url, description, event_id, name")
        .eq("id", wantedId)
        .eq("business_is_active", true)
        .maybeSingle();
      if (cancelled || !doc?.url) return;
      const displayIds = getVideoBusinessCandidateIds(doc as any);
      const bizMap = await fetchBusinessesByIds(displayIds, "is_poi");
      const biz = resolveVideoEstablishment(doc as any, bizMap);
      if (cancelled) return;
      const video: VideoItem = {
        id: doc.id,
        url: doc.url,
        business_name: (biz as any)?.name || "—",
        pageBusinessName: bizMap.get((doc as any).business_id)?.name ?? null,
        pageBusinessId: (doc as any).business_id ?? null,
        thumbnail_url: doc.thumbnail_url,
        business: (biz as SearchResultBusiness) || null,
        owner: biz ? { id: (biz as any).id, name: (biz as any).name, logo_url: (biz as any).logo_url ?? null, logo_bg: (biz as any).logo_bg ?? null } : null,
        social: extractSocial(doc),
        showSocialBadge: isDifferentDisplayedBusinessSocial(extractSocial(doc), (biz as SearchResultBusiness) || null),
        description: (doc as any).description ?? null,
        manualCard: (doc as any).event_id ? { label: "Agenda", badgeId: null, eventId: (doc as any).event_id } : null,
      };
      openVideo(video);
    })();
    return () => { cancelled = true; };
  }, [videos, loadingVideos, searchParams, setSearchParams, city]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [badgeView, setBadgeView] = useState<{ badgeId: string; label: string; city: City } | null>(null);
  const [badgeBusinesses, setBadgeBusinesses] = useState<SearchResultBusiness[]>([]);
  const [loadingBadge, setLoadingBadge] = useState(false);
  const [videoBadgeFilter, setVideoBadgeFilter] = useState<{ badgeId: string; label: string } | null>(null);
  const [videoEventFilter, setVideoEventFilter] = useState<VideoEventFilter | null>(null);
  const [videoPopularSearchFilter, setVideoPopularSearchFilter] = useState<{ popularSearchId: string; label: string; businessIds: string[]; resolved?: boolean } | null>(null);

  // Stale-While-Revalidate cache for the videos list (LCP optimization on repeat visits).
  // Hydrates videos[] instantly from localStorage; the regular fetch effect refreshes silently after.
  const videosCacheKey = useMemo(
    () =>
      buildHomeVideosCacheKey({
        city,
        entryId: selectedEntryId,
        subId: selectedSubId,
        badgeId: videoBadgeFilter?.badgeId ?? null,
        eventId: videoEventFilter?.eventId ?? null,
        popularId: videoPopularSearchFilter?.popularSearchId ?? null,
      }),
    [city, selectedEntryId, selectedSubId, videoBadgeFilter, videoEventFilter, videoPopularSearchFilter]
  );
  const hydratedKeysRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (hydratedKeysRef.current.has(videosCacheKey)) return;
    hydratedKeysRef.current.add(videosCacheKey);
    const cached = readHomeVideosCache<VideoItem>(videosCacheKey);
    if (cached && cached.length > 0) setVideos(cached);
  }, [videosCacheKey]);
  useEffect(() => {
    if (loadingVideos) return;
    if (!videos || videos.length === 0) return;
    writeHomeVideosCache(videosCacheKey, videos);
  }, [videos, videosCacheKey, loadingVideos]);
  // Set when the user opens a homepage card linked to a specific business.
  // That business will be pinned at the top of the next filtered list (badge view, video filter, etc.).
  const [pinnedBusinessId, setPinnedBusinessId] = useState<string | null>(null);
  const [videoBadgeDocIds, setVideoBadgeDocIds] = useState<Set<string> | null>(null);
  const [badgeNamesById, setBadgeNamesById] = useState<Record<string, string>>({});

  // Badge names + front structure + generic video ids are now loaded together
  // via the home-bootstrap edge function (single round-trip). See useEffect below.

  const hashtagBadges = useMemo(
    () => Object.entries(badgeNamesById)
      .map(([id, name]) => ({ id, name }))
      .filter((b) => b.name.trim().startsWith("#"))
      .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" })),
    [badgeNamesById]
  );

  // Clear pinned business when no filtered view is active anymore.
  useEffect(() => {
    if (!videoBadgeFilter && !videoEventFilter && !videoPopularSearchFilter && !badgeView) {
      setPinnedBusinessId(null);
    }
  }, [videoBadgeFilter, videoEventFilter, videoPopularSearchFilter, badgeView]);

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

  // SEO: homepage metadata (indexable)
  useSEO({
    title: "ONE WORLD MOROCCO – Hôtels, restaurants & activités au Maroc",
    description: "Découvrez les meilleures adresses au Maroc : hôtels, restaurants, activités et services sélectionnés par ONE WORLD MOROCCO.",
    canonical: "/",
    ogUrl: "/",
    ogType: "website",
  });

  // Lock body scroll while the front-structure Menu panel is open (avoids double scroll on mobile/tablet).
  // Compensate the scrollbar width to prevent the underlying grid from shifting horizontally.
  useEffect(() => {
    if (!menuOpen) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [menuOpen]);

  // Bootstrap: front structure + badges + generic videos in 1 round-trip (edge function)
  // Stale-while-revalidate from localStorage for instant repeat-visit display.
  useEffect(() => {
    type BootstrapPayload = {
      frontStructure: {
        entries: FrontEntry[];
        subcatNames: Record<string, string>;
        serviceNames: Record<string, string>;
      };
      badgeNames: Record<string, string>;
      genericVideoIds: string[];
    };

    const apply = (p: BootstrapPayload) => {
      setSubcatNames(p.frontStructure.subcatNames);
      setServiceNames(p.frontStructure.serviceNames);
      setEntries(p.frontStructure.entries);
      setBadgeNamesById(p.badgeNames);
      setGenericVideoIds(new Set(p.genericVideoIds));
    };

    const cached = getCached<BootstrapPayload>("home:bootstrap");
    if (cached) apply(cached);

    let cancelled = false;
    revalidate<BootstrapPayload>(
      "home:bootstrap",
      async () => {
        const { data, error } = await supabase.functions.invoke("home-bootstrap");
        if (error || !data) throw error || new Error("home-bootstrap failed");
        return data as BootstrapPayload;
      },
      (fresh) => { if (!cancelled) apply(fresh); }
    );
    return () => { cancelled = true; };
  }, []);

  // Resolve the cities table id (for multi-city video assignments)
  useEffect(() => {
    const key = `home:cityRowId:${city}`;
    const cached = getCached<string | null>(key);
    if (cached) setCityRowId(cached);
    let cancelled = false;
    revalidate<string | null>(
      key,
      async () => (await getCityIdByName(city)) ?? null,
      (fresh) => { if (!cancelled) setCityRowId(fresh); }
    );
    return () => { cancelled = true; };
  }, [city]);

  // Document ids assigned to this city via business_document_cities (multi-city).
  // Includes city aliases (e.g. Marrakech also pulls Agafay's docs).
  // Paginate to bypass PostgREST 1000-row limit. SWR-cached per city.
  useEffect(() => {
    if (!cityRowId) { setExtraCityDocIds(new Set()); return; }
    const key = `home:extraCityDocIds:${city}`;
    const cached = getCached<string[]>(key);
    if (cached) setExtraCityDocIds(new Set(cached));
    let cancelled = false;
    revalidate<string[]>(
      key,
      async () => {
        // Resolve all alias city ids (e.g. Marrakech + Agafay)
        const aliases = getCityAliases(city);
        const { data: cityRows } = await supabase
          .from("cities")
          .select("id")
          .in("name_fr", aliases);
        const aliasIds = ((cityRows as any[]) || []).map((r) => r.id);
        const ids = aliasIds.length > 0 ? aliasIds : [cityRowId];

        const all: string[] = [];
        const PAGE = 1000;
        let offset = 0;
        while (true) {
          const { data } = await supabase
            .from("business_document_cities")
            .select("document_id")
            .in("city_id", ids)
            .order("document_id", { ascending: true })
            .range(offset, offset + PAGE - 1);
          const rows = (data as any[]) || [];
          all.push(...rows.map((r) => r.document_id));
          if (rows.length < PAGE) break;
          offset += PAGE;
        }
        return all;
      },
      (fresh) => { if (!cancelled) setExtraCityDocIds(new Set(fresh)); }
    );
    return () => { cancelled = true; };
  }, [cityRowId, city]);


  useEffect(() => {
    setLoading(true);
    const load = async () => {
      // Source of truth: business_document_cities (resolved into extraCityDocIds).
      // Fetch all video docs explicitly linked to this city via the multi-city table.
      const allDocs: any[] = [];
      const ids = [...extraCityDocIds];
      for (let i = 0; i < ids.length; i += 300) {
        const chunk = ids.slice(i, i + 300);
        const { data } = await supabase
          .from("business_documents")
          .select("id, url, subcategory_id")
          .eq("type", "video")
          .eq("business_is_active", true)
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
      badge_ids: [],
    };
    const vlogsEntry: FrontEntry = {
      id: VLOGS_ID,
      name: "#Vlogs",
      sort_order: -0.5,
      subcategory_ids: [],
      service_ids: [],
      badge_ids: [],
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
    // Wait until entries are loaded — otherwise an entry coming from the URL (?entry=…)
    // gets reset to HOME before visibleEntries is populated.
    if (loading) return;
    if (visibleEntries.length === 0) return;
    if (visibleEntries.some((entry) => entry.id === selectedEntryId)) return;

    setSelectedEntryId(HOME_ID);
    setSelectedSubId(null);
  }, [selectedEntryId, visibleEntries, loading]);

  // Load videos for selected entry — same logic as backoffice FrontStructureVideosPanel:
  // match business_documents.subcategory_id ∈ entry.subcategory_ids, filter by document.city,
  // keep only internal videos, sort by sort_order, take first 15.
  useEffect(() => {
    if (!selectedEntry && !videoBadgeFilter && !videoEventFilter && !videoPopularSearchFilter) {
      setVideos([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const safeSetVideos = (v: VideoItem[]) => { if (!cancelled) setVideos(v); };
      // Pin: when the active filter was opened from a homepage card linked to a business,
      // move that business's first video to the top of the list (preserving order otherwise).
      const applyPin = (items: VideoItem[]): VideoItem[] => {
        if (!pinnedBusinessId) return items;
        const idx = items.findIndex((it) => (it.business as any)?.id === pinnedBusinessId);
        if (idx <= 0) return items;
        const next = items.slice();
        const [pinned] = next.splice(idx, 1);
        next.unshift(pinned);
        return next;
      };
      const safeSetLoadingVideos = (b: boolean) => { if (!cancelled) setLoadingVideos(b); };
      safeSetLoadingVideos(true);
      

      // Event filter (Agenda): show ONE card per event, using event.images[0] as thumbnail.
      if (videoEventFilter) {
        const ids = videoEventFilter.eventIds && videoEventFilter.eventIds.length > 0
          ? videoEventFilter.eventIds
          : [videoEventFilter.eventId];

        const { data: eventRows } = await (supabase as any)
          .from("events")
          .select("id, name, type, hook, images, videos, default_business_id, start_date, end_date, days_of_week, start_time, end_time")
          .in("id", ids)
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("start_date", { ascending: true });

        // Keep events that have either an image OR a video (used as media for the card)
        const events = ((eventRows as any[]) || []).filter((ev) => ev?.images?.[0] || ev?.videos?.[0]);

        const bizIds = events.map((ev) => ev.default_business_id).filter(Boolean) as string[];
        const bizMap = await fetchBusinessesByIds(bizIds);

        if (events.length === 0) {
          safeSetVideos([]);
        } else {
          // Look up thumbnails from business_documents matching the first video URL of each event
          const firstVideoUrls = events.map((ev) => (ev.videos || []).filter(Boolean)[0]).filter(Boolean) as string[];
          const thumbByUrl = new Map<string, string>();
          if (firstVideoUrls.length > 0) {
            const { data: docs } = await supabase
              .from("business_documents")
              .select("url, thumbnail_url")
              .eq("business_is_active", true)
              .in("url", firstVideoUrls);
            ((docs as any[]) || []).forEach((d) => {
              if (d.url && d.thumbnail_url) thumbByUrl.set(d.url, d.thumbnail_url);
            });
          }

          safeSetVideos(events.map((ev) => {
            const biz = ev.default_business_id ? bizMap.get(ev.default_business_id) || null : null;
            const firstVideo: string | null = (ev.videos?.filter(Boolean)[0]) ?? null;
            const firstImage: string | null = (ev.images?.filter(Boolean)[0]) ?? null;
            const thumb = firstImage || (firstVideo ? thumbByUrl.get(firstVideo) || firstVideo : "");
            return {
              id: `event:${ev.id}`,
              url: firstVideo || "",
              business_name: ev.name || videoEventFilter.label,
              thumbnail_url: thumb,
              business: biz,
              owner: biz ? { id: biz.id, name: biz.name, logo_url: biz.logo_url ?? null, logo_bg: biz.logo_bg ?? null } : null,
              social: null,
              description: null,
              manualCard: { label: (ev.type && String(ev.type).trim()) || ev.name || videoEventFilter.label, badgeId: null, eventId: ev.id },
              eventInfo: {
                name: ev.name ?? null,
                hook: ev.hook ?? null,
                start_date: ev.start_date ?? null,
                end_date: ev.end_date ?? null,
                days_of_week: ev.days_of_week ?? null,
                start_time: ev.start_time ?? null,
                end_time: ev.end_time ?? null,
              },
            } as VideoItem;
          }));
        }
        safeSetLoadingVideos(false);
        return;
      }

      // Popular search filter: load videos belonging to the businesses returned by the search
      if (videoPopularSearchFilter) {
        const bizIds = videoPopularSearchFilter.businessIds;
        if (bizIds.length === 0) {
          safeSetVideos([]);
          // If the search has resolved (no business matched), exit the loading state.
          // Otherwise keep loading=true to avoid flashing "Aucune vidéo trouvée".
          if (videoPopularSearchFilter.resolved) {
            safeSetLoadingVideos(false);
          }
          return;
        }
        const batch = 300;
        const allDocs: any[] = [];
        for (let i = 0; i < bizIds.length; i += batch) {
          const chunk = bizIds.slice(i, i + batch);
          const { data } = await supabase
            .from("business_documents")
            .select(`${DOC_VIDEO_COLS}, front_sort_order`)
            .eq("type", "video")
            .eq("business_is_active", true)
            .in("business_id", chunk)
            .order("front_sort_order", { ascending: true });
          if (data) allDocs.push(...data);
        }
        const bizMap = (await fetchBusinessesByIds(bizIds)) as Map<string, SearchResultBusiness>;
        // Keep one video per business (the first), preserving the search ranking order
        const seen = new Set<string>();
        const docByBiz = new Map<string, any>();
        for (const d of allDocs) {
          if (!d.business_id || seen.has(d.business_id)) continue;
          seen.add(d.business_id);
          docByBiz.set(d.business_id, d);
        }
        const popDocIds = [...new Set(allDocs.map((d: any) => d.id).filter(Boolean))] as string[];
        const popDocBadgesByDocId = await fetchDocBadgesByDocId(popDocIds);
        const docVideoItems: VideoItem[] = bizIds
          .map((bid) => {
            const d = docByBiz.get(bid);
            const biz = bizMap.get(bid) || null;
            if (!d || !biz) return null;
            // Popular branch: business_name is forced to biz.name (not biz?.name || "—")
            // and manualCard is always null. Override after build.
            const item = buildDocVideoItem({
              doc: d,
              bizMap,
              docBadgesByDocId: popDocBadgesByDocId,
            }) as VideoItem;
            item.business_name = biz.name;
            return item;
          })
          .filter(Boolean) as VideoItem[];

        // For businesses without a business_document video, fall back to their first visible YouTube video
        const missingBizIds = bizIds.filter((bid) => !docByBiz.has(bid));
        let ytVideoItems: VideoItem[] = [];
        if (missingBizIds.length > 0) {
          const ytRows: any[] = [];
          for (let i = 0; i < missingBizIds.length; i += batch) {
            const { data } = await supabase
              .from("business_youtube_videos")
              .select("id, video_id, title, thumbnail, custom_thumbnail_url, thumbnail_locked, is_short, is_visible, sort_order, business_id")
              .eq("is_visible", true)
              .eq("business_is_active", true)
              .in("business_id", missingBizIds.slice(i, i + batch))
              .order("sort_order", { ascending: true });
            if (data) ytRows.push(...data);
          }
          const ytByBiz = new Map<string, any>();
          for (const y of ytRows) {
            if (!y.business_id || ytByBiz.has(y.business_id)) continue;
            ytByBiz.set(y.business_id, y);
          }
          const popYtIds = ytRows.map((y: any) => y.id).filter(Boolean);
          const popYtBadgesByVideo = await fetchYtBadgesByVideoId(popYtIds);
          ytVideoItems = missingBizIds
            .map((bid) => {
              const y = ytByBiz.get(bid);
              const biz = bizMap.get(bid) || null;
              if (!y || !biz) return null;
              // Popular branch: business_name forced to biz.name (not biz.name||title)
              // and social/showSocialBadge intentionally null.
              const item = buildYoutubeVideoItem({
                yt: y,
                business: biz,
                ytBadgesByVideo: popYtBadgesByVideo,
              }) as VideoItem | null;
              if (!item) return null;
              item.business_name = biz.name;
              item.social = null;
              delete (item as any).showSocialBadge;
              return item;
            })
            .filter(Boolean) as VideoItem[];
        }

        // Preserve search ranking: interleave by bizIds order
        const finalById = new Map<string, VideoItem>();
        for (const it of [...docVideoItems, ...ytVideoItems]) finalById.set((it.business as any)?.id, it);
        const ordered = bizIds.map((bid) => finalById.get(bid)).filter(Boolean) as VideoItem[];

        safeSetVideos(applyPin(ordered));
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
            .select(DOC_VIDEO_COLS)
            .eq("type", "video")
            .eq("business_is_active", true)
            .in("id", chunk);
          if (data) allDocs.push(...data);
        }
        // Filter by current city via the multi-city source of truth (business_document_cities).
        const uniqueDocs = allDocs.filter((d: any) => extraCityDocIds.has(d.id));
        const allBizIds = [...new Set(
          uniqueDocs.flatMap((d: any) => getVideoBusinessCandidateIds(d)).filter(Boolean)
        )] as string[];
        const bizMap = (await fetchBusinessesByIds(allBizIds, "is_poi, front_video_count")) as Map<string, SearchResultBusiness>;
        uniqueDocs.sort((a: any, b: any) => {
          const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
          if (so !== 0) return so;
          return String(a.id).localeCompare(String(b.id));
        });
        // Per-business cap: limit each business to its `front_video_count`
        // (default 1, max 9). Same rule as subcategory level.
        const docsByBizBadge = new Map<string, any[]>();
        for (const d of uniqueDocs) {
          const biz = resolveVideoEstablishment(d, bizMap);
          const groupId = biz?.id || d.poi_id || d.business_id || d.id;
          const arr = docsByBizBadge.get(groupId) || [];
          arr.push(d);
          docsByBizBadge.set(groupId, arr);
        }
        const limitedBadgeDocs: any[] = [];
        for (const [groupId, docs] of docsByBizBadge.entries()) {
          const sorted = [...docs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          const groupBiz = bizMap.get(groupId) as any;
          const limit = Math.max(1, Math.min(9, groupBiz?.front_video_count ?? 1));
          limitedBadgeDocs.push(...sorted.slice(0, limit));
        }
        // Preserve global sort_order ordering across groups.
        limitedBadgeDocs.sort((a: any, b: any) => {
          const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
          if (so !== 0) return so;
          return String(a.id).localeCompare(String(b.id));
        });
        // Fetch service names for any service_id present on these docs
        const badgeServiceNameById = await fetchServiceNamesByIds(
          limitedBadgeDocs.map((d: any) => d.service_id).filter(Boolean) as string[],
        );
        // Fetch all badges associated with each document (for hashtag aggregation)
        const docBadgesByDocId = await fetchDocBadgesByDocId(limitedBadgeDocs.map((d: any) => d.id).filter(Boolean));
        const isVlogsBadge = /^#?\s*vlogs?$/i.test(videoBadgeFilter.label.trim());
        // For all badge filters, also pull in generic_videos and YouTube videos
        // tagged with the same badge.
        const includeExtraSources = true;
        const docVideoItems: VideoItem[] = limitedBadgeDocs.map((d: any) =>
          buildDocVideoItem({
            doc: d,
            bizMap,
            docBadgesByDocId,
            serviceNameById: badgeServiceNameById,
            withPageBusiness: true,
          }) as VideoItem,
        );

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
            const cityId = await getCityIdByName(city);

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
                .select("id, url, name, title, thumbnail_url, city, sort_order, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url, description")
                .in("id", gvIds)
                .order("sort_order", { ascending: true }),
            ]);
            const extraIds = new Set(((extraCityLinks as any[]) || []).map((l: any) => l.generic_video_id));
            const gvFiltered = ((gvs as any[]) || []).filter((v: any) => cityMatches(v.city, city) || extraIds.has(v.id));

            // Resolve first linked business (for owner display) — best effort
            const [{ data: gvBizLinks }, { data: gvPoiLinks }] = await Promise.all([
              supabase
                .from("generic_video_businesses" as any)
                .select("generic_video_id, business_id")
                .in("generic_video_id", gvFiltered.map((v: any) => v.id)),
              supabase
                .from("generic_video_pois" as any)
                .select("generic_video_id, poi_id")
                .in("generic_video_id", gvFiltered.map((v: any) => v.id)),
            ]);
            const firstBizByGv: Record<string, string> = {};
            const linkedTargetsByGv: Record<string, Set<string>> = {};
            (((gvBizLinks as any[]) || [])).forEach((l: any) => {
              if (!firstBizByGv[l.generic_video_id]) firstBizByGv[l.generic_video_id] = l.business_id;
              (linkedTargetsByGv[l.generic_video_id] ||= new Set()).add(l.business_id);
            });
            (((gvPoiLinks as any[]) || [])).forEach((l: any) => {
              (linkedTargetsByGv[l.generic_video_id] ||= new Set()).add(l.poi_id);
            });
            const gvBizIds = [...new Set(Object.values(firstBizByGv))];
            const gvBizMap = (await fetchBusinessesByIds(gvBizIds)) as Map<string, SearchResultBusiness>;

            // Fetch all badges for these generic videos
            const gvBadgesByVideo: Record<string, string[]> = {};
            const gvFilteredIds = gvFiltered.map((v: any) => v.id);
            if (gvFilteredIds.length > 0) {
              const { data: allGvBadges } = await supabase
                .from("generic_video_badges" as any)
                .select("generic_video_id, badge_id")
                .in("generic_video_id", gvFilteredIds);
              ((allGvBadges as any[]) || []).forEach((r: any) => {
                (gvBadgesByVideo[r.generic_video_id] ||= []).push(r.badge_id);
              });
            }

            genericVideoItems = gvFiltered.map((v: any) => {
              const bizId = firstBizByGv[v.id];
              const biz = isVlogsBadge ? null : (bizId ? gvBizMap.get(bizId) || null : null);
              const acct = (v.instagram_account || v.tiktok_account || v.youtube_account || "").replace(/^@+/, "");
              const social = extractSocial(v);
              return {
                id: v.id,
                url: v.url,
                business_name: isVlogsBadge
                  ? (acct ? `@${acct}` : (v.name || "—"))
                  : (v.name || (acct ? `@${acct}` : (biz?.name || "—"))),
                thumbnail_url: v.thumbnail_url || null,
                business: isVlogsBadge ? null : biz,
                // Generic videos are multi-POI: never show a single POI owner logo/badge
                // in the vignette or in SlidePanelHome. Show the social account instead.
                owner: null,
                social,
                showSocialBadge: !!social,
                description: v.description ?? null,
                manualCard: null,
                videoName: v.title || v.name || (isVlogsBadge ? null : (biz as any)?.hook_fr) || null,
                badge_ids: gvBadgesByVideo[v.id] || [],
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
                .select("id, video_id, title, thumbnail, custom_thumbnail_url, thumbnail_locked, is_short, is_visible, sort_order, business_id")
                .eq("is_visible", true)
                .eq("business_is_active", true)
                .in("id", ytIds.slice(i, i + batch))
                .order("sort_order", { ascending: true });
              if (data) ytRows.push(...data);
            }
            const ytBizIds = [...new Set(ytRows.map((y: any) => y.business_id).filter(Boolean))] as string[];
            const ytBizMap = (await fetchBusinessesByIds(ytBizIds)) as Map<string, SearchResultBusiness>;
            // City filter (strictly aligned with business_documents logic):
            // Source of truth = business_youtube_video_cities. A YouTube video appears
            // on a city's homepage ONLY if it is explicitly linked to that city.
            // No fallback on the owner business's city.
            const allYtIds = ytRows.map((y: any) => y.id);
            const cityLinksByVideo: Record<string, Set<string>> = {};
            if (allYtIds.length > 0) {
              for (let i = 0; i < allYtIds.length; i += batch) {
                const { data: ytCityLinks } = await supabase
                  .from("business_youtube_video_cities" as any)
                  .select("youtube_video_id, city_id")
                  .in("youtube_video_id", allYtIds.slice(i, i + batch));
                ((ytCityLinks as any[]) || []).forEach((r: any) => {
                  (cityLinksByVideo[r.youtube_video_id] ||= new Set()).add(r.city_id);
                });
              }
            }
            // Resolve current city's UUID (and its aliases, e.g. Agafay under Marrakech)
            const aliasNames = (city === "Marrakech" ? ["Marrakech", "Agafay"] : [city]);
            const { data: cityRows } = await supabase
              .from("cities")
              .select("id, name_fr")
              .in("name_fr", aliasNames);
            const currentCityIds = new Set(((cityRows as any[]) || []).map((c) => c.id));
            const ytFiltered = ytRows.filter((y: any) => {
              const explicit = cityLinksByVideo[y.id];
              if (!explicit || explicit.size === 0) return false;
              for (const cid of currentCityIds) if (explicit.has(cid)) return true;
              return false;
            });
            // Fetch all badges for these YouTube videos
            const ytBadgesByVideo = await fetchYtBadgesByVideoId(ytFiltered.map((y: any) => y.id).filter(Boolean));
            youtubeVideoItems = ytFiltered.map((y: any) => {
              const biz = ytBizMap.get(y.business_id) || null;
              // External YouTube videos: align with generic-video display.
              // Hide POI branding (owner=null) and surface the YouTube channel as social attribution.
              const ytUrl: string | null = (biz as any)?.youtube_url || null;
              const ytAccount = normalizeSocialAccount(ytUrl) || (biz?.name ? biz.name : "");
              const social = ytAccount
                ? { platform: "youtube" as const, account: ytAccount, url: ytUrl }
                : null;
              return {
                id: y.id,
                url: y.is_short
                  ? `https://www.youtube.com/shorts/${y.video_id}`
                  : `https://www.youtube.com/watch?v=${y.video_id}`,
                business_name: y.title || biz?.name || "—",
                thumbnail_url: y.custom_thumbnail_url || y.thumbnail || `https://i.ytimg.com/vi/${y.video_id}/hqdefault.jpg`,
                business: biz,
                owner: null,
                social,
                showSocialBadge: !!social,
                description: null,
                manualCard: null,
                badge_ids: ytBadgesByVideo[y.id] || [],
                // External YouTube videos: show the YouTube title (not the business hook).
                videoTitle: y.title ?? null,
              } as VideoItem;
            });
          }
        }

        safeSetVideos(applyPin([...docVideoItems, ...youtubeVideoItems, ...genericVideoItems]));
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
          .select("id, url, name, title, thumbnail_url, instagram_account, tiktok_account, youtube_account, sort_order")
          .in("id", [...linkedIds])
          .order("sort_order", { ascending: true });
        const vids = (vidsData as any[]) || [];
        

        // Fetch badges for these generic videos
        const vlogBadgesByVideo: Record<string, string[]> = {};
        if (vids.length > 0) {
          const { data: gvBadges } = await supabase
            .from("generic_video_badges" as any)
            .select("generic_video_id, badge_id")
            .in("generic_video_id", vids.map((v: any) => v.id));
          ((gvBadges as any[]) || []).forEach((r: any) => {
            (vlogBadgesByVideo[r.generic_video_id] ||= []).push(r.badge_id);
          });
        }

        const ordered = vids
          .map((v: any) => {
            const acct = (v.instagram_account || v.tiktok_account || v.youtube_account || "").replace(/^@+/, "");
            return {
              id: v.id,
              url: v.url,
              business_name: acct ? `@${acct}` : (v.name || "—"),
              thumbnail_url: v.thumbnail_url || null,
              business: null,
              owner: null,
              social: extractSocial(v),
              description: null,
              manualCard: null,
              videoName: v.title || v.name || null,
              badge_ids: vlogBadgesByVideo[v.id] || [],
            } as VideoItem;
          })
          .filter(Boolean) as VideoItem[];
        safeSetVideos(applyPin(ordered));
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
          .in("city", getCityAliases(city));
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
            .select(`${DOC_VIDEO_COLS}, front_sort_order, event_id`)
            .eq("type", "video")
            .eq("show_on_front", true)
            .eq("business_is_active", true)
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
            .select(`${DOC_VIDEO_COLS}, front_sort_order, event_id`)
            .eq("type", "video")
            .eq("show_on_front", true)
            .eq("business_is_active", true)
            .in("id", chunk);
          if (data) allDocs.push(...data);
        }
        // Dedup by id
        const seen = new Set<string>();
        allDocs = allDocs.filter((d: any) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
        allDocs.sort((a: any, b: any) => (a.front_sort_order ?? 0) - (b.front_sort_order ?? 0));
      } else {
        const subIds = selectedSubId ? [selectedSubId] : selectedEntry.subcategory_ids;
        // When no specific subcategory is selected, also include videos whose
        // service_id belongs to the services associated with this front_structure entry,
        // and videos owned by businesses that carry the badges associated with this entry.
        const svcIds = selectedSubId ? [] : (selectedEntry.service_ids || []);
        const badgeIds = selectedSubId ? [] : (selectedEntry.badge_ids || []);

        // Resolve businesses owning any of the associated badges
        let badgeBizIds: string[] = [];
        if (badgeIds.length > 0) {
          const { data: bbData } = await supabase
            .from("business_badges")
            .select("business_id")
            .in("badge_id", badgeIds);
          badgeBizIds = [...new Set((bbData || []).map((r: any) => r.business_id).filter(Boolean))];
        }

        if (subIds.length === 0 && svcIds.length === 0 && badgeBizIds.length === 0) {
          safeSetVideos([]);
          safeSetLoadingVideos(false);
          return;
        }
        // Build OR filter: subcategory_id IN (...) OR service_id IN (...) OR business_id IN (...badgeBizIds)
        const orParts: string[] = [];
        if (subIds.length > 0) orParts.push(`subcategory_id.in.(${subIds.join(",")})`);
        if (svcIds.length > 0) orParts.push(`service_id.in.(${svcIds.join(",")})`);
        if (badgeBizIds.length > 0) orParts.push(`business_id.in.(${badgeBizIds.join(",")})`);
        const orFilter = orParts.join(",");

        // Source of truth: business_document_cities (resolved into extraCityDocIds).
        // Fetch only docs explicitly linked to this city, filtered by subcategory/service/badge.
        const cityDocIds = [...extraCityDocIds];
        if (cityDocIds.length === 0) {
          allDocs = [];
        } else {
          const CHUNK = 300;
          for (let i = 0; i < cityDocIds.length; i += CHUNK) {
            const chunk = cityDocIds.slice(i, i + CHUNK);
            const { data } = await supabase
              .from("business_documents")
              .select(`${DOC_VIDEO_COLS}, price, price_type`)
              .eq("type", "video")
              .eq("business_is_active", true)
              .or(orFilter)
              .in("id", chunk)
              .order("sort_order", { ascending: true });
            if (data) allDocs.push(...data);
          }
        }

        const seenIds = new Set<string>();
        allDocs = allDocs.filter((d: any) => (seenIds.has(d.id) ? false : (seenIds.add(d.id), true)));

        // Same logic as SlidePanelHome: group by resolved establishment, dedupe by URL.
        // Single difference here: apply front_video_count per business.
        // Strict mode in subcategory view: ignore linked_business_id so a video stays attributed
        // to its real owner (and therefore to its real categories), not to a referenced business.
        const strictResolve = !!selectedEntry && selectedEntry.id !== HOME_ID;
        const allBizIds = [...new Set(
          allDocs.flatMap((d: any) => getVideoBusinessCandidateIds(d, { strict: strictResolve })).filter(Boolean)
        )] as string[];
        const bizMap = (await fetchBusinessesByIds(allBizIds, "google_rating, priority_score, front_video_count, is_poi")) as Map<string, SearchResultBusiness>;

        // Keep the exact backoffice video document rows; do not deduplicate by URL.
        const uniqueDocs = allDocs;

        // Group by resolved establishment. When the doc points to a POI, group by POI
        // so all videos referencing that POI are bucketed together (and shown without
        // the per-business limit below).
        // Group by the actually displayed establishment (resolveVideoEstablishment skips POIs).
        // This ensures videos showing the same business name stack into a single group,
        // even if some are POI-tagged. Fallback to POI/business_id only if no real biz resolved.
        const docsByBiz = new Map<string, any[]>();
        for (const d of uniqueDocs) {
          const biz = resolveVideoEstablishment(d, bizMap, { strict: strictResolve });
          const groupId = biz?.id || d.poi_id || d.business_id || d.id;
          const arr = docsByBiz.get(groupId) || [];
          arr.push(d);
          docsByBiz.set(groupId, arr);
        }

        // Apply front_video_count per displayed group (POI or business).
        // - Subcategory level: use the group's front_video_count (1..9, default 1).
        // - Category (front_structure entry) level: cap at 1 per group, EXCEPT for POIs
        //   which use their own front_video_count so a POI can showcase several clips.
        const applyFrontVideoCountLimit = !!selectedSubId;
        const limitedDocs: any[] = [];
        for (const [groupId, docs] of docsByBiz.entries()) {
          const sorted = [...docs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          const groupBiz = bizMap.get(groupId) as any;
          const isPoi = groupBiz?.is_poi === true;
          if (applyFrontVideoCountLimit || isPoi) {
            const limit = Math.max(1, Math.min(9, groupBiz?.front_video_count ?? 1));
            limitedDocs.push(...sorted.slice(0, limit));
          } else {
            limitedDocs.push(...sorted.slice(0, 1));
          }
        }

        // Global ordering: Home is JSON-driven (order already defined upstream),
        // so no extra sort here. Other entries (Restauration, Hébergement, etc.)
        // follow the same ranking as SearchPage: WTUCE > priority_score > rating (≥10 reviews).
        if (!isHome) {
          limitedDocs.sort((a: any, b: any) => {
            const bizA = resolveVideoEstablishment(a, bizMap, { strict: strictResolve });
            const bizB = resolveVideoEstablishment(b, bizMap, { strict: strictResolve });
            return sortWtuceAndRating(bizA || {}, bizB || {});
          });

          // Note: pinning the homepage-card business at the top was removed —
          // visually redundant with the homepage card itself. Standard ranking applies.
        }


        const manualCardMap = !selectedSubId ? await getManualCardMap(city, limitedDocs) : new Map<string, { label: string; badgeId: string | null; eventId?: string | null }>();
        const docBadgesByDocId = await fetchDocBadgesByDocId(limitedDocs.map((d: any) => d.id).filter(Boolean));
        const serviceNameById = await fetchServiceNamesByIds(
          limitedDocs.map((d: any) => d.service_id).filter(Boolean) as string[],
        );

        const docItems: VideoItem[] = limitedDocs.map((d: any) =>
          buildDocVideoItem({
            doc: d,
            bizMap,
            strict: strictResolve,
            manualCardMap,
            docBadgesByDocId,
            serviceNameById,
            withPrice: true,
          }) as VideoItem,
        );

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
            const cityId = await getCityIdByName(city);

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
                .select("id, url, name, title, thumbnail_url, city, sort_order, instagram_account, instagram_url, tiktok_account, tiktok_url, youtube_account, youtube_url, description")
                .in("id", gvIds)
                .order("sort_order", { ascending: true }),
            ]);
            const extraIds = new Set(((extraCityLinks as any[]) || []).map((l: any) => l.generic_video_id));
            const gvFiltered = ((gvs as any[]) || []).filter((v: any) => cityMatches(v.city, city) || extraIds.has(v.id));

            const { data: gvBizLinks } = await supabase
              .from("generic_video_businesses" as any)
              .select("generic_video_id, business_id")
              .in("generic_video_id", gvFiltered.map((v: any) => v.id));
            const firstBizByGv: Record<string, string> = {};
            (((gvBizLinks as any[]) || [])).forEach((l: any) => {
              if (!firstBizByGv[l.generic_video_id]) firstBizByGv[l.generic_video_id] = l.business_id;
            });
            const gvBizIds = [...new Set(Object.values(firstBizByGv))];
            const gvBizMap = (await fetchBusinessesByIds(gvBizIds)) as Map<string, SearchResultBusiness>;

            const seenUrlsGv = new Set<string>(docItems.map((i) => i.url).filter(Boolean) as string[]);
            const gvBadgesByVideo: Record<string, string[]> = {};
            const gvFilteredIds = gvFiltered.map((v: any) => v.id).filter(Boolean);
            if (gvFilteredIds.length > 0) {
              const { data: rows } = await supabase
                .from("generic_video_badges" as any)
                .select("generic_video_id, badge_id")
                .in("generic_video_id", gvFilteredIds);
              ((rows as any[]) || []).forEach((r: any) => {
                (gvBadgesByVideo[r.generic_video_id] ||= []).push(r.badge_id);
              });
            }
            genericSubItems = gvFiltered
              .filter((v: any) => v.url && !seenUrlsGv.has(v.url) && (seenUrlsGv.add(v.url), true))
              .map((v: any) => {
                const bizId = firstBizByGv[v.id];
                const isVlogsContext = selectedEntry?.id === VLOGS_ID;
                const biz = isVlogsContext ? null : (bizId ? gvBizMap.get(bizId) || null : null);
                const acct = (v.instagram_account || v.tiktok_account || v.youtube_account || "").replace(/^@+/, "");
                const social = extractSocial(v);
                return {
                  id: v.id,
                  url: v.url,
                  business_name: isVlogsContext
                    ? (acct ? `@${acct}` : (v.name || "—"))
                    : (v.name || (acct ? `@${acct}` : (biz?.name || "—"))),
                  thumbnail_url: v.thumbnail_url || null,
                  business: isVlogsContext ? null : biz,
                  // Generic videos are multi-POI: never show a single POI owner logo/badge
                  // in the vignette or in SlidePanelHome. Show the social account instead.
                  owner: null,
                  social,
                  showSocialBadge: !!social,
                  description: v.description ?? null,
                  manualCard: null,
                  badge_ids: gvBadgesByVideo[v.id] || [],
                  videoName: v.title || v.name || (isVlogsContext ? null : (biz as any)?.hook_fr) || null,
                } as VideoItem;
              });
          }
        } catch (e) {
          console.warn("[Test sub generic_videos] failed", e);
        }

        // Also include business_youtube_videos linked to one of the selected subcategories
        // via business_youtube_video_subcategories AND linked to the current city
        // via business_youtube_video_cities (strict, aligned with multi-city policy).
        let youtubeSubItems: VideoItem[] = [];
        try {
          const { data: ytSubLinks } = await supabase
            .from("business_youtube_video_subcategories" as any)
            .select("youtube_video_id")
            .in("subcategory_id", subIds);
          const ytIds = [...new Set(((ytSubLinks as any[]) || []).map((l: any) => l.youtube_video_id))];
          // Resolve current city's UUID (and its aliases, e.g. Agafay under Marrakech)
          const aliasNames = city === "Marrakech" ? ["Marrakech", "Agafay"] : [city];
          const { data: cityRows } = await supabase
            .from("cities")
            .select("id, name_fr")
            .in("name_fr", aliasNames);
          const currentCityIds = new Set<string>(((cityRows as any[]) || []).map((c) => c.id));
          if (ytIds.length > 0 && currentCityIds.size > 0) {
            // Filter to videos explicitly linked to the current city
            const cityLinksByVideo: Record<string, Set<string>> = {};
            const CHUNK = 300;
            for (let i = 0; i < ytIds.length; i += CHUNK) {
              const { data: ytCityLinks } = await supabase
                .from("business_youtube_video_cities" as any)
                .select("youtube_video_id, city_id")
                .in("youtube_video_id", ytIds.slice(i, i + CHUNK));
              ((ytCityLinks as any[]) || []).forEach((r: any) => {
                (cityLinksByVideo[r.youtube_video_id] ||= new Set()).add(r.city_id);
              });
            }
            const ytFilteredIds = ytIds.filter((id) => {
              const set = cityLinksByVideo[id];
              if (!set) return false;
              for (const cid of currentCityIds) if (set.has(cid)) return true;
              return false;
            });

            if (ytFilteredIds.length > 0) {
              const ytRows: any[] = [];
              for (let i = 0; i < ytFilteredIds.length; i += CHUNK) {
                const { data } = await supabase
                  .from("business_youtube_videos")
                  .select("id, video_id, title, thumbnail, custom_thumbnail_url, thumbnail_locked, is_short, is_visible, sort_order, business_id")
                  .eq("is_visible", true)
                  .eq("business_is_active", true)
                  .in("id", ytFilteredIds.slice(i, i + CHUNK))
                  .order("sort_order", { ascending: true });
                if (data) ytRows.push(...data);
              }
              const ytBizIds = [...new Set(ytRows.map((y) => y.business_id).filter(Boolean))] as string[];
              const ytBizMap = (await fetchBusinessesByIds(ytBizIds)) as Map<string, SearchResultBusiness>;
              const ytBadgesByVideo = await fetchYtBadgesByVideoId(ytRows.map((y: any) => y.id).filter(Boolean));
              const seenUrlsYt = new Set<string>([...docItems, ...genericSubItems].map((i) => i.url).filter(Boolean) as string[]);
              youtubeSubItems = ytRows
                .map((y: any) => {
                  const biz = ytBizMap.get(y.business_id) || null;
                  const item = buildYoutubeVideoItem({
                    yt: y,
                    business: biz,
                    ytBadgesByVideo,
                  }) as VideoItem | null;
                  if (!item) return null;
                  if (seenUrlsYt.has(item.url)) return null;
                  seenUrlsYt.add(item.url);
                  return item;
                })
                .filter(Boolean) as VideoItem[];
            }
          }
        } catch (e) {
          console.warn("[Test sub business_youtube_videos] failed", e);
        }

        safeSetVideos([...docItems, ...genericSubItems, ...youtubeSubItems]);
        safeSetLoadingVideos(false);
        return;
      }

      // Home path: display the resolved linked establishment when present.
      const allBizIds = [...new Set(allDocs.flatMap((d: any) => getVideoBusinessCandidateIds(d)))];
      const bizMap = (await fetchBusinessesByIds(allBizIds, "is_poi")) as Map<string, SearchResultBusiness>;
      const homeDocBadgesByDocId = await fetchDocBadgesByDocId(allDocs.map((d: any) => d.id).filter(Boolean));

      safeSetVideos(
        allDocs.map((d: any) =>
          buildDocVideoItem({
            doc: d,
            bizMap,
            docBadgesByDocId: homeDocBadgesByDocId,
          }) as VideoItem,
        ),
      );
      safeSetLoadingVideos(false);
    };
    load();
    return () => { cancelled = true; };
  }, [selectedEntry, city, selectedSubId, extraCityDocIds, videoBadgeFilter, videoEventFilter, videoPopularSearchFilter, pinnedBusinessId]);

  // Reset active video when entry/city changes
  useEffect(() => {
    if (pendingOpenVideoRef.current) return;
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
  const activeList = videos;

  const returnContext = useMemo(() => {
    const params = new URLSearchParams();
    params.set("city", city);
    if (videoEventFilter) {
      params.set("eventId", videoEventFilter.eventId);
      params.set("eventLabel", videoEventFilter.label);
      if (videoEventFilter.eventIds?.length) params.set("eventIds", videoEventFilter.eventIds.join(","));
    } else if (videoBadgeFilter) {
      params.set("badgeId", videoBadgeFilter.badgeId);
      params.set("badgeLabel", videoBadgeFilter.label);
    } else if (videoPopularSearchFilter) {
      params.set("popularSearchId", videoPopularSearchFilter.popularSearchId);
      params.set("popularSearchLabel", videoPopularSearchFilter.label);
      if (videoPopularSearchFilter.businessIds.length) params.set("popularSearchBusinessIds", videoPopularSearchFilter.businessIds.join(","));
    } else if (badgeView) {
      params.set("badgeView", badgeView.badgeId);
      params.set("badgeViewLabel", badgeView.label);
    } else {
      if (selectedEntryId) params.set("entry", selectedEntryId);
      if (selectedSubId) params.set("sub", selectedSubId);
    }
    // Always include sub-category when set (even alongside badge/event filters)
    if (selectedSubId && !params.has("sub")) params.set("sub", selectedSubId);
    return params.toString();
  }, [city, selectedEntryId, selectedSubId, videoBadgeFilter, videoEventFilter, videoPopularSearchFilter, badgeView]);

  // Reflect current navigation state in the URL so it's shareable (WhatsApp, etc.)
  useEffect(() => {
    if (panelOpen) return; // don't overwrite while a video panel rewrites the URL
    const current = window.location.search.replace(/^\?/, "");
    if (current !== returnContext) {
      const newUrl = `${window.location.pathname}${returnContext ? `?${returnContext}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, [returnContext, panelOpen]);


  // Reset currentTime when active video changes
  useEffect(() => {
    setCurrentTime(0);
  }, [activeVideo?.id]);

  // Generic video ids are loaded by the home-bootstrap edge function (see useEffect above).
  const [genericVideoIds, setGenericVideoIds] = useState<Set<string>>(new Set());

  const isActiveGeneric = useMemo(
    () => !!activeVideo && (selectedEntryId === VLOGS_ID || genericVideoIds.has(activeVideo.id)),
    [activeVideo, selectedEntryId, genericVideoIds]
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
    setVideoPopularSearchFilter(null);
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
    setVideoPopularSearchFilter(null);
    setSelectedEntryId(HOME_ID);
    setVideoEventFilter({ eventId, label });

    return true;
  };

  const runPopularSearch = async (popularSearchId: string, label: string, clickedCity: City) => {
    const { data: ps } = await (supabase as any)
      .from("popular_searches")
      .select("query")
      .eq("id", popularSearchId)
      .maybeSingle();
    const query = (ps as any)?.query as string | undefined;
    if (!query) return;

    // Reset other filters / views
    setBadgeView(null);
    setBadgeBusinesses([]);
    setVideoBadgeFilter(null);
    setVideoEventFilter(null);
    setActiveVideo(null);
    setPanelOpen(false);
    setCurrentTime(0);
    setSelectedSubId(null);
    setSelectedEntryId(HOME_ID);

    if (city !== clickedCity) {
      setCity(clickedCity);
    }

    // Pre-set the filter with empty businessIds so the videos area renders the loading state
    setLoadingVideos(true);
    setVideoPopularSearchFilter({ popularSearchId, label, businessIds: [], resolved: false });

    try {
      const { data, error } = await supabase.functions.invoke("business-search", {
        body: { query, city: clickedCity, language: "fr", compact: "ids" },
      });
      if (!error) {
        const list = ((data as any)?.businesses || []) as SearchResultBusiness[];
        const ids = list.map((b: any) => b.id).filter(Boolean);
        setVideoPopularSearchFilter({ popularSearchId, label, businessIds: ids, resolved: true });
      } else {
        setVideoPopularSearchFilter({ popularSearchId, label, businessIds: [], resolved: true });
      }
    } catch (e) {
      console.error("[runPopularSearch] failed", e);
      setVideoPopularSearchFilter({ popularSearchId, label, businessIds: [], resolved: true });
    }
  };

  const handleHomeLabelClick = async (
    info: { label: string; kind: "entry" | "extra"; target?: { type: "badge" | "event" | "popular_search"; id: string } | null; badgeId: string | null; eventId?: string | null; popularSearchId?: string | null; pinnedBusinessId?: string | null },
    clickedCity: City
  ) => {
    // Pin the linked business (manual extra card OR entry whose video was forced via overrides)
    // so it appears first on the next page (entry video list, badge view, video filter, etc.).
    setPinnedBusinessId(info.pinnedBusinessId ?? null);

    if (info.kind === "entry") {
      const match = entries.find((e) => e.name.toLowerCase() === info.label.toLowerCase());
      if (match) {
        setBadgeView(null);
        setVideoBadgeFilter(null);
        setVideoEventFilter(null);
        setVideoPopularSearchFilter(null);
        setSelectedEntryId(match.id);
        setSelectedSubId(null);
      }
      return;
    }

    // Special-case: any card titled "Agenda" → show ALL events tagged with the "Agenda" badge
    // for the current city, ignoring whatever badge/business links the card may have.
    if (isAgendaLabel(info.label)) {
      // 1. Find the "Agenda" badge id
      const { data: agendaBadge } = await (supabase as any)
        .from("badges")
        .select("id")
        .or("name_fr.ilike.Agenda,name_fr.ilike.#Agenda")
        .maybeSingle();
      const agendaBadgeId = (agendaBadge as any)?.id as string | null;

      let eventIds: string[] = [];
      if (agendaBadgeId) {
        // 2. Find all events tagged with that badge
        const { data: links } = await (supabase as any)
          .from("event_badges")
          .select("event_id")
          .eq("badge_id", agendaBadgeId);
        const candidateIds = ((links as any[]) || []).map((l) => l.event_id).filter(Boolean);

        if (candidateIds.length > 0) {
          // 3. Restrict to events of the clicked city that are not finished
          const today = new Date().toISOString().slice(0, 10);
          const { data: events } = await (supabase as any)
            .from("events")
            .select("id, city_id, end_date, cities!inner(name_fr)")
            .in("id", candidateIds)
            .or(`end_date.gte.${today},end_date.is.null`);
          eventIds = ((events as any[]) || [])
            .filter((ev) => {
              const evCity = ev.cities?.name_fr || "";
              return evCity.toLowerCase() === clickedCity.toLowerCase();
            })
            .map((ev) => ev.id);
        }
      }

      if (eventIds.length > 0) {
        // Activate multi-event filter
        setBadgeView(null);
        setLoadingBadge(false);
        setBadgeBusinesses([]);
        setActiveVideo(null);
        setPanelOpen(false);
        setCurrentTime(0);
        setSelectedSubId(null);
        if (city !== clickedCity) setCity(clickedCity);
        setVideoBadgeFilter(null);
        setVideoPopularSearchFilter(null);
        setSelectedEntryId(HOME_ID);
        setVideoEventFilter({ eventId: eventIds[0], eventIds, label: info.label });
        return;
      }
      // No agenda events found → silently no-op
      return;
    }

    // Resolve target with priority: explicit target > legacy fields
    const target = info.target ??
      (info.eventId ? { type: "event" as const, id: info.eventId } :
       info.popularSearchId ? { type: "popular_search" as const, id: info.popularSearchId } :
       info.badgeId ? { type: "badge" as const, id: info.badgeId } : null);

    if (!target) return;

    switch (target.type) {
      case "event":
        await activateVideoEventFilter(target.id, info.label, clickedCity);
        return;
      case "popular_search":
        await runPopularSearch(target.id, info.label, clickedCity);
        return;
      case "badge": {
        const activated = await activateVideoBadgeFilter(target.id, info.label, clickedCity);
        if (activated) return;

        setSelectedEntryId(HOME_ID);
        setBadgeView({ badgeId: target.id, label: info.label, city: clickedCity });
        setLoadingBadge(true);
        setBadgeBusinesses([]);
        const [{ data: businessLinks }, { data: documentLinks }] = await Promise.all([
          supabase
            .from("business_badges")
            .select("business_id")
            .eq("badge_id", target.id),
          supabase
            .from("business_document_badges")
            .select("document_id, business_documents!inner(business_id, linked_business_id, poi_id)")
            .eq("badge_id", target.id),
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
      .select("id, name, slug, images, logo_url, logo_bg, rating, computed_rating, total_review_count, categories, default_service, is_open_24h, show_opening_hours, opening_hours, city, neighborhood, latitude, longitude, engagements, wtuce_status, priority_score")
      .in("id", ids)
      .in("city", getCityAliases(clickedCity))
      .eq("is_active", true);
    // Same ranking as SearchPage: WTUCE verified first (priority_score desc),
    // then non-verified by priority_score, then by effective rating ignoring <10 reviews.
    const getEffectiveRating = (b: any): number | null =>
      b?.computed_rating ?? (b?.rating ? Number(b.rating) : null);
    const sortWtuceAndRating = (a: any, b: any) => {
      const aVerified = a.wtuce_status === "verified" ? 0 : 1;
      const bVerified = b.wtuce_status === "verified" ? 0 : 1;
      if (aVerified !== bVerified) return aVerified - bVerified;
      if (aVerified === 0) {
        return (b.priority_score || 0) - (a.priority_score || 0);
      }
      const aPrio = a.priority_score || 0;
      const bPrio = b.priority_score || 0;
      if (aPrio !== bPrio) return bPrio - aPrio;
      const aCount = a.total_review_count ?? 0;
      const bCount = b.total_review_count ?? 0;
      const aRating = aCount >= 10 ? (getEffectiveRating(a) ?? -1) : -1;
      const bRating = bCount >= 10 ? (getEffectiveRating(b) ?? -1) : -1;
      return bRating - aRating;
    };
    const sortedBizs = ((bizs as any[]) || []).slice().sort(sortWtuceAndRating);
    // Pin: if the originating homepage card is linked to a business, ensure it appears first.
    const pinId = info.pinnedBusinessId ?? null;
    if (pinId) {
      const idx = sortedBizs.findIndex((b: any) => b.id === pinId);
      if (idx > 0) {
        const [pinned] = sortedBizs.splice(idx, 1);
        sortedBizs.unshift(pinned);
      }
    }
    setBadgeBusinesses(sortedBizs as SearchResultBusiness[]);
    setLoadingBadge(false);
        return;
      }
    }
  };

  const structureList = (
    <div className="pt-[60px]">
      <Suspense fallback={null}>
        <HeaderMenuContent onNavigate={() => setMenuOpen(false)} />
      </Suspense>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {resolvingCity && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-background">
          <div className="h-8 w-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
        </div>
      )}
      <Header
        leftContent={
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-foreground/40 bg-white hover:border-foreground transition-colors overflow-hidden"
            aria-label="Menu Structure"
            aria-expanded={menuOpen}
          >
            <img src="/logo-gold.webp" alt="Logo" className="h-7 w-7 object-contain" />
          </button>
        }
        rightContent={
          <div onClickCapture={() => { if (menuOpen) setMenuOpen(false); }}>
          <HomeCityToolbar
            city={city}
            activeBadgeId={videoBadgeFilter?.badgeId ?? null}
            activeLabel={videoEventFilter?.label ?? videoBadgeFilter?.label ?? null}
            breadcrumb={(() => {
              // Show breadcrumb inside city pill only when results grid is active.
              const inResultsContext =
                selectedEntryId !== HOME_ID || !!videoBadgeFilter || !!videoEventFilter || !!videoPopularSearchFilter;
              if (!inResultsContext) return null;
              const count = otherVideos.length;
              const sep = <span className="text-muted-foreground font-normal mx-1">›</span>;
              const cityBtn = (
                <button
                  type="button"
                  onClick={() => {
                    setVideoEventFilter(null);
                    setVideoBadgeFilter(null);
                    setVideoPopularSearchFilter(null);
                    setSelectedEntryId(HOME_ID);
                    setSelectedSubId(null);
                  }}
                  className="text-muted-foreground font-normal hover:text-foreground hover:underline transition-colors"
                >
                  {city}
                </button>
              );
              const countNode = <span className="text-muted-foreground font-normal ml-1">({count})</span>;
              const wrapper = (children: React.ReactNode) => (
                <span
                  className="inline-flex items-center flex-wrap text-sm font-semibold text-foreground"
                  style={{ fontFamily: "'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif", letterSpacing: 0, textTransform: "none" }}
                >
                  {children}
                </span>
              );
              if (videoEventFilter) {
                return wrapper(<>{cityBtn}{sep}<span>{videoEventFilter.label}</span>{countNode}</>);
              }
              if (videoBadgeFilter) {
                return wrapper(<>{cityBtn}{sep}<span>{videoBadgeFilter.label}</span>{countNode}</>);
              }
              if (videoPopularSearchFilter) {
                return wrapper(<>{cityBtn}{sep}<span>{videoPopularSearchFilter.label}</span>{countNode}</>);
              }
              if (selectedSubId && subcatNames[selectedSubId]) {
                return wrapper(
                  <>
                    {cityBtn}
                    {sep}
                    {selectedEntry && selectedEntry.id !== HOME_ID && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedSubId(null)}
                          className="text-muted-foreground font-normal hover:text-foreground hover:underline transition-colors"
                        >
                          {selectedEntry.name}
                        </button>
                        {sep}
                      </>
                    )}
                    <span>{subcatNames[selectedSubId]}</span>
                    {countNode}
                  </>
                );
              }
              if (selectedEntry && selectedEntry.id !== HOME_ID) {
                return wrapper(<>{cityBtn}{sep}<span>{selectedEntry.name}</span>{countNode}</>);
              }
              return null;
            })()}
            onCityChange={(next) => {
              setCity(next);
              setBadgeView(null);
              setVideoBadgeFilter(null);
              setVideoEventFilter(null);
              setVideoPopularSearchFilter(null);
              setSelectedEntryId(HOME_ID);
              setSelectedSubId(null);
              requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
            }}
            onLabelClick={(info, cityForLabel) => handleHomeLabelClick(info, cityForLabel)}
          />
          </div>
        }
      />

      {menuOpen && (
        <div
          className="fixed inset-0 top-[53px] z-[28]"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-full lg:w-1/2 h-full bg-background border-r border-border shadow-xl animate-in slide-in-from-top-4 fade-in duration-300 overflow-y-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {structureList}
          </div>
        </div>
      )}

      <div className="pt-[92px] flex w-full min-h-[calc(100vh-92px)]">
        {/* Right zone 80% */}
        <main className={`px-6 pt-2 pb-24 overflow-y-auto transition-all duration-300 ${panelOpen ? "w-1/2" : "flex-1"}`}>
          {selectedEntryId === HOME_ID && !videoBadgeFilter && !videoEventFilter && !videoPopularSearchFilter ? (
            <>
              <HomeCityTabs
                city={city}
                onCityChange={(next) => {
                  setCity(next);
                  setBadgeView(null);
                  setVideoBadgeFilter(null);
                  setVideoEventFilter(null);
                  setVideoPopularSearchFilter(null);
                }}
                onLabelClick={(info, cityForLabel) => handleHomeLabelClick(info, cityForLabel)}
              />
              {badgeView && (
                <BadgeBusinessesGrid
                  badgeView={badgeView}
                  businesses={badgeBusinesses}
                  loading={loadingBadge}
                  onClose={() => setBadgeView(null)}
                />
              )}
            </>
          ) : !selectedEntry && !videoBadgeFilter && !videoPopularSearchFilter ? (
            <p className="text-sm text-muted-foreground">
              Sélectionne une entrée dans la colonne de gauche.
            </p>
          ) : loadingVideos ? (
            <div className="mt-2">
              <div className={`grid gap-4 ${panelOpen ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-3 lg:grid-cols-6"}`}>
                <div className="aspect-[9/16] rounded-lg bg-muted animate-pulse" />
              </div>
            </div>
          ) : videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune vidéo trouvée{videoEventFilter ? ` pour « ${videoEventFilter.label} »` : videoPopularSearchFilter ? ` pour « ${videoPopularSearchFilter.label} »` : videoBadgeFilter ? ` pour « ${videoBadgeFilter.label} »` : selectedEntry ? ` pour « ${selectedEntry.name} »` : ""} à {city}.
            </p>
          ) : (() => {
            const isVlogsContext2 = !!selectedEntry && selectedEntry.id === VLOGS_ID;
            const isBadgeContext = !!videoBadgeFilter;
            // Hashtags are now shown across all video contexts (entries, sub-categories, events, popular searches, badge filters, vlogs).
            const showHashtagsTile = true;

            const hashtagItems = hashtagBadges;
            const displayList = otherVideos.slice(0, visibleCount);
            const hasMore = visibleCount < otherVideos.length;

            const isParentEntry =
              !!selectedEntry &&
              selectedEntry.id !== HOME_ID &&
              selectedEntry.id !== VLOGS_ID &&
              !selectedSubId &&
              !videoBadgeFilter &&
              !videoEventFilter &&
              !videoPopularSearchFilter;
            const childItems = isParentEntry
              ? selectedEntry.subcategory_ids
                  .filter((id) => subsWithVideos.has(id))
                  .map((id) => ({ id, name: subcatNames[id] }))
                  .filter((c) => c.name)
                  .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }))
              : [];
            const showChildrenTile =
              isParentEntry && childItems.length >= 2;
            const showHashtagsTileFinal = showHashtagsTile;
            const childrenTileIndex = 2; // position 3
            return (
            <div className="flex gap-6 items-start mt-2">
              {displayList.length > 0 && (
                <div className="w-full min-w-0">
                  <div className={`grid gap-4 ${panelOpen ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-3 lg:grid-cols-6"}`}>
                    {(() => {
                      const items: Array<
                        | { kind: "video"; v: VideoItem; idx: number }
                        | { kind: "children" }
                      > = displayList.map((v, idx) => ({ kind: "video" as const, v, idx }));
                      if (showChildrenTile) {
                        const insertAt = Math.min(childrenTileIndex, items.length);
                        items.splice(insertAt, 0, { kind: "children" });
                      }
                      return items.map((entry, i) => {
                        if (entry.kind === "children") {
                          return (
                            <div
                              key="children-tile"
                              className="md:aspect-[9/16] rounded-lg overflow-hidden bg-card border border-border p-2 flex flex-col"
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
                        const isVlogThumb = selectedEntry?.id === VLOGS_ID;
                        const showSubcategoryOverlay = selectedEntryId !== HOME_ID || !!v.manualCard?.label || !!videoBadgeFilter || !!videoEventFilter || !!videoPopularSearchFilter;
                        const thumb = v.thumbnail_url || null;
                        const optimizedThumb = optimizeSupabaseImage(thumb, { width: 400 });
                        return (
                      <div
                        key={v.id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement | null;
                          const clickedManualBadge = target?.closest("[data-manual-badge='true']");
                          const isHome = selectedEntry?.id === HOME_ID;

                          // Only the manual label badge triggers the filter.
                          // Clicking the thumbnail itself opens SlidePanelHome like everywhere else.
                          if (clickedManualBadge && v.manualCard?.eventId) {
                            void activateVideoEventFilter(v.manualCard.eventId, v.manualCard.label, city);
                            return;
                          }
                          if (clickedManualBadge && v.manualCard?.badgeId) {
                            const label = v.manualCard.label || "";
                            const isHashtag = label.trim().startsWith("#");
                            const badgeId = v.manualCard.badgeId;
                            const cleanLabel = label.replace(/^#+/, "").trim() || label;
                            const sp = new URLSearchParams();
                            if (city) sp.set("city", city);

                            if (isHashtag) {
                              // Hashtag tab: filters videos by badge (already video-based)
                              sp.set("badgeId", badgeId);
                              sp.set("badgeLabel", cleanLabel);
                              navigate(`/search?${sp.toString()}`);
                            } else {
                              // Résultats tab: même source de vérité que le back-office Vidéos.
                              (async () => {
                                const { getBusinessIdsFromBadgeAndCity } = await import("@/lib/getVideoPinIds");
                                const ordered = await getBusinessIdsFromBadgeAndCity(badgeId, city);
                                if (ordered.length > 0) sp.set("pinIds", ordered.join(","));
                                sp.set("label", cleanLabel);
                                sp.set("pinBadge", badgeId);
                                navigate(`/search?${sp.toString()}`);
                              })();
                            }
                            return;
                          }

                          handlePick();
                        }}
                        className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted cursor-pointer"
                      >
                        {optimizedThumb ? (
                          <img
                            src={optimizedThumb}
                            alt={v.business_name}
                            className="w-full h-full object-cover"
                            loading={i < 6 ? "eager" : "lazy"}
                            fetchPriority={i < 6 ? "high" : "auto"}
                            decoding={i === 0 ? "sync" : "async"}
                          />
                        ) : (
                          <div className="w-full h-full bg-muted" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
                        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
                        {v.eventInfo ? (
                          (() => {
                            const ei = v.eventInfo;
                            const dateStr = formatEventDateRange(ei.start_date, ei.end_date);
                            const daysStr = formatDaysOfWeek(ei.days_of_week);
                            const timeStr = formatTimeRange(ei.start_time, ei.end_time);
                            const textShadow = "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5)) drop-shadow(0 4px 20px hsla(0,0%,0%,0.3))";
                            return (
                              <>
                                {/* Upper half: Gold badge (event type) + Hook */}
                                <div className="absolute inset-x-0 top-[6%] z-20 flex flex-col items-center gap-2 px-3 pointer-events-none text-center">
                                  {/* Gold badge label hidden in category/subcategory results grid */}
                                  {ei.name && (
                                    <p
                                      className="text-sm font-bold text-white mt-3"
                                      style={{
                                        fontFamily: "'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif",
                                        letterSpacing: "0.02em",
                                        filter: "drop-shadow(0 0 2px hsla(0,0%,0%,1)) drop-shadow(0 0 5px hsla(0,0%,0%,0.95)) drop-shadow(0 0 10px hsla(0,0%,0%,0.85)) drop-shadow(0 2px 6px hsla(0,0%,0%,0.8)) drop-shadow(0 4px 16px hsla(0,0%,0%,0.7)) drop-shadow(0 6px 28px hsla(0,0%,0%,0.5))",
                                      }}
                                    >
                                      {ei.name}
                                    </p>
                                  )}
                                </div>
                                {/* Lower half: dates / days / hours */}
                                {(dateStr || daysStr || timeStr) && (
                                  <div
                                    className="absolute inset-x-0 bottom-[8%] z-20 flex flex-col items-center gap-1 px-3 pointer-events-none text-center text-white"
                                    style={{ filter: textShadow }}
                                  >
                                    {dateStr && <p className="text-xs font-semibold">{dateStr}</p>}
                                    {daysStr && <p className="text-xs font-semibold">{daysStr}</p>}
                                    {timeStr && <p className="text-xs font-semibold">{timeStr}</p>}
                                  </div>
                                )}
                              </>
                            );
                          })()
                         ) : (() => {
                            const isGeneric = genericVideoIds.has(v.id);
                            const internalFallbackHook = !isGeneric && !v.videoTitle && showSubcategoryOverlay
                              ? ((v.business as any)?.hook_fr || null)
                              : null;
                            const topText = isGeneric ? v.videoName : (v.videoTitle || internalFallbackHook);
                            const hasOrderBadge = showSubcategoryOverlay && v.business?.engagements?.includes("Logistique:Vente en ligne");
                           return topText ? (
                             <div className={`absolute inset-x-0 ${hasOrderBadge ? "top-[20%]" : "top-[12%]"} z-[10] flex flex-col items-center gap-2 px-3 pointer-events-none text-center`}>
                               <p
                                 className="text-sm font-bold text-white"
                                 style={{
                                   fontFamily: "'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif",
                                   letterSpacing: "0.02em",
                                   filter: "drop-shadow(0 0 2px hsla(0,0%,0%,1)) drop-shadow(0 0 5px hsla(0,0%,0%,0.95)) drop-shadow(0 0 10px hsla(0,0%,0%,0.85)) drop-shadow(0 2px 6px hsla(0,0%,0%,0.8)) drop-shadow(0 4px 16px hsla(0,0%,0%,0.7)) drop-shadow(0 6px 28px hsla(0,0%,0%,0.5))",
                                 }}
                               >
                                 {topText}
                               </p>
                             </div>
                          ) : null;
                          })()}
                         {showSubcategoryOverlay && v.business?.engagements?.includes("Logistique:Vente en ligne") && (
                          <div className="absolute inset-x-0 top-[10%] z-20 flex items-center justify-center px-2 pointer-events-none">
                            <span
                              className="px-2.5 py-1 rounded-md text-white text-xs font-bold uppercase tracking-wide text-center line-clamp-2 shadow-lg border-2 border-black"
                              style={{ backgroundColor: "#C04F17" }}
                            >
                              Vente en ligne
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                            <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[9px] border-l-white ml-0.5" />
                          </div>
                        </div>
                        {(() => {
                          const targets = ["immobilier", "villas"];
                          const entryName = selectedEntry?.name?.trim().toLowerCase() ?? "";
                          const subName = selectedSubId ? (subcatNames[selectedSubId] || "").trim().toLowerCase() : "";
                          return targets.includes(entryName) || targets.includes(subName);
                        })() && v.priceType && (
                          <div className="absolute inset-x-0 top-[32%] z-[20] flex flex-col items-center gap-2 px-3 pointer-events-none text-center">
                            <span className="px-2.5 py-1 rounded-md bg-gold text-black text-xs font-bold uppercase tracking-wide text-center line-clamp-2 shadow-lg border-2 border-black">
                              {v.priceType.toLowerCase() === "location" ? "Location" : v.priceType.toLowerCase() === "vente" ? "Vente" : v.priceType}
                            </span>
                          </div>
                        )}
                        {!isVlogThumb && v.owner?.logo_url && (
                          <div className="absolute inset-x-0 bottom-[15%] z-[6] flex flex-col items-center justify-center px-2 pointer-events-none">
                            <div className="animate-logo-big-full-reveal max-w-[100px] max-h-[72px]">
                              <img
                                key={`logo-${v.id}`}
                                src={v.owner.logo_url}
                                alt={v.owner.name}
                                className="w-full h-auto max-w-full max-h-[72px] object-contain"
                                style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5)) drop-shadow(0 4px 20px hsla(0,0%,0%,0.3))" }}
                              />
                            </div>
                            {(() => {
                              const targets = ["immobilier", "villas"];
                              const entryName = selectedEntry?.name?.trim().toLowerCase() ?? "";
                              const subName = selectedSubId ? (subcatNames[selectedSubId] || "").trim().toLowerCase() : "";
                              return targets.includes(entryName) || targets.includes(subName);
                            })() && v.price && (
                              <p
                                className="text-base font-semibold text-white text-center"
                                style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5)) drop-shadow(0 4px 20px hsla(0,0%,0%,0.3))" }}
                              >
                                Prix : {v.price}
                              </p>
                            )}
                          </div>
                        )}
                        {v.showSocialBadge && v.social && !v.owner?.logo_url && (
                          <div className="absolute inset-x-0 bottom-[15%] z-[6] flex flex-col items-center justify-center gap-2 px-2 pointer-events-none text-white">
                            <div
                              className="flex items-center justify-center"
                              style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5))" }}
                            >
                              {v.social.platform === "instagram" && <InstagramIcon className="h-10 w-10" />}
                              {v.social.platform === "youtube" && <Youtube className="h-10 w-10" />}
                              {v.social.platform === "tiktok" && <SiTiktok className="h-9 w-9" />}
                            </div>
                            {v.social.account && (
                              <div className="flex items-center gap-1 rounded-full bg-black/80 border border-white/15 px-2 py-0.5">
                                <span className="text-[10px] font-medium text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                                  Follow @{v.social.account}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                          {((isVlogThumb ? v.business_name : v.owner?.name || v.business_name)) && showSubcategoryOverlay && v.social?.platform !== "youtube" && (
                            <div className="absolute top-0 left-0 right-0 p-1.5 space-y-0.5 z-[5]">
                               {!v.eventInfo?.name && !genericVideoIds.has(v.id) && (() => {
                                 const displayName = v.business_name || v.owner?.name || "";
                                 return (
                                   <button
                                     type="button"
                                     onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                     onClick={(e) => {
                                       e.preventDefault();
                                       e.stopPropagation();
                                       if (!v.id) return;
                                       void copyTextSilently(v.id).catch(() => {});
                                     }}
                                     className="block w-full text-left text-[10px] font-medium text-white line-clamp-1 cursor-pointer hover:underline"
                                     style={{ filter: "drop-shadow(0 1px 2px hsla(0,0%,0%,0.9))" }}
                                   >
                                     {displayName}
                                   </button>
                                 );
                               })()}
                               {(() => {
                                 const label = v.service_name
                                   || (v.service_id && serviceNames[v.service_id])
                                   || (v.subcategory_id && subcatNames[v.subcategory_id])
                                   || null;
                                 return label ? (
                                   <p className="text-[10px] font-bold uppercase tracking-wide text-gold line-clamp-1" style={{ filter: "drop-shadow(0 1px 2px hsla(0,0%,0%,0.9))" }}>
                                     {label}
                                   </p>
                                 ) : null;
                               })()}
                            </div>
                          )}
                          {v.business && (v.business.computed_rating ?? v.business.rating) != null && showSubcategoryOverlay && (
                            <div className="absolute bottom-1.5 left-1.5 z-[5] inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm">
                              <Star className="h-2.5 w-2.5 text-gold fill-gold" />
                              <span className="font-medium text-white">{v.business.computed_rating ?? v.business.rating}/20</span>
                              {(v.business.total_review_count ?? 0) > 0 && (
                                <span className="text-white/80">· {v.business.total_review_count} avis</span>
                              )}
                            </div>
                          )}
                      </div>
                        );
                      });
                    })()}
                  </div>
                  {hasMore && (
                    <div ref={loadMoreSentinelRef} className="h-10 w-full" aria-hidden="true" />
                  )}
                </div>
              )}
            </div>
            );
          })()}

          <FooterCityDestinations
            city={city}
            cityRowId={cityRowId}
            onCityChange={(c) => {
              setCity(c);
              cityResolvedRef.current = true;
              const sp = new URLSearchParams(searchParams);
              sp.set("city", c);
              setSearchParams(sp, { replace: true });
            }}
          />
        </main>
      </div>

      {!panelOpen && (
        <>
          {homeSearchOverlayOpen && (
            <div
              className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
              onClick={() => setHomeSearchCloseTrigger((n) => n + 1)}
            />
          )}
          <div
            className={`fixed pointer-events-none ${
              homeSearchOverlayOpen
                ? "inset-y-0 left-1/2 -translate-x-1/2 w-full lg:w-1/2 z-[201]"
                : "bottom-0 left-1/2 -translate-x-1/2 w-[90%] lg:w-1/2 z-[85]"
            }`}
          >
            <div className="relative w-full h-full pointer-events-auto">
              <PanelSearchBar
                onSearch={(params) => {
                  const sp = new URLSearchParams(params);
                  // If the query text explicitly mentions a known city, prefer it over the geo-detected city.
                  const q = (sp.get("q") || "").toLowerCase();
                  const mentionedCity = CITIES.find((c) => new RegExp(`\\b${c.toLowerCase()}\\b`).test(q));
                  if (mentionedCity) {
                    sp.set("city", mentionedCity);
                  } else if (geo.isEnabled && !sp.has("city")) {
                    sp.set("city", geo.detectedCity || city);
                  }
                  navigate(`/search?${sp.toString()}`);
                }}
                onBusinessSelect={(bizId) => navigate(`/search?openBusiness=${bizId}`)}
                onOverlayChange={setHomeSearchOverlayOpen}
                closeTrigger={homeSearchCloseTrigger}
                noToolbarOffset
                iconVariant="black"
              />
            </div>
          </div>
        </>
      )}

      {panelOpen && (
        <Suspense fallback={null}>
          <HomeVideoSlidePanel
            open={panelOpen}
            onClose={() => setPanelOpen(false)}
            activeVideo={activeVideo}
            activeList={activeList}
            onActiveVideoChange={(v) => {
              setActiveVideo(v);
              setActiveVideoId(v.id);
            }}
            isActiveGeneric={isActiveGeneric}
            currentTime={currentTime}
            onTimeUpdate={setCurrentTime}
            returnContext={returnContext}
            selectedBadgeId={videoBadgeFilter?.badgeId ?? null}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Home;
