import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play, Youtube } from "lucide-react";
import { InstagramIcon } from "@/components/staff/SocialMediaIcons";
import { TikTokIcon as SiTiktok } from "@/components/icons/TikTokIcon";
import BookOnlineSlidePanel from "@/components/BookOnlineSlidePanel";
import SearchPagination from "@/components/SearchPagination";
import { isAgendaLabel, formatEventDateRange, formatDaysOfWeek, formatTimeRange } from "@/lib/homeHelpers";
import { useLanguage } from "@/contexts/LanguageContext";

const ITEMS_PER_PAGE = 24;


interface EventInfo {
  name: string | null;
  start_date: string | null;
  end_date: string | null;
  days_of_week: string[] | null;
  start_time: string | null;
  end_time: string | null;
}

interface VideoItem {
  _id: string;
  _kind: "doc" | "youtube" | "generic" | "event";
  _isInternal: boolean;
  url: string;
  name: string | null;
  description: string | null;
  thumbnail_url: string | null;
  owner_business_id: string | null;
  owner_name: string | null;
  owner_logo_url: string | null;
  owner_logo_bg: string | null;
  generic_video_id: string | null;
  event_id?: string | null;
  eventInfo?: EventInfo | null;
  social: { platform: "instagram" | "tiktok" | "youtube"; account: string; url: string | null } | null;
}


interface Props {
  badgeId: string;
  badgeLabel: string;
  city?: string | null;
  onCountChange?: (count: number) => void;
  onOpenBusiness?: (business: { id: string; name: string }) => void;
}


const ytThumb = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

export default function HashtagTabContent({ badgeId, badgeLabel, city, onCountChange, onOpenBusiness }: Props) {
  const { language } = useLanguage();
  const LABELS = {
    fr: {
      videosFound: (n: number) => `${n} ${n > 1 ? "vidéos trouvées" : "vidéo trouvée"}`,
      noVideos: (label: string) => `Aucune vidéo trouvée pour ${label}.`,
    },
    en: {
      videosFound: (n: number) => `${n} video${n > 1 ? "s" : ""} found`,
      noVideos: (label: string) => `No videos found for ${label}.`,
    },
    ar: {
      videosFound: (n: number) => `${n > 1 ? "مقاطع فيديو" : "مقطع فيديو"} (${n}) موجود`,
      noVideos: (label: string) => `لم يتم العثور على مقاطع فيديو لـ ${label}.`,
    },
  };
  const L = LABELS[language as keyof typeof LABELS] ?? LABELS.fr;
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VideoItem[]>([]);
  const [activeItem, setActiveItem] = useState<VideoItem | null>(null);
  useEffect(() => { setActiveItem(null); }, [badgeId]);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    setCurrentPage(1);
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { window.scrollTo(0, 0); }
  }, [badgeId, city]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // Resolve city → city_id when a city is provided
      let cityId: string | null = null;
      const effectiveCity = (city || "").trim();
      const filterByCity = effectiveCity && effectiveCity.toLowerCase() !== "all";
      if (filterByCity) {
        const { data: cityRow } = await supabase
          .from("cities")
          .select("id")
          .or(`name_fr.ilike.${effectiveCity},name_en.ilike.${effectiveCity},name_ar.ilike.${effectiveCity}`)
          .limit(1)
          .maybeSingle();
        cityId = (cityRow as any)?.id || null;
      }

      // Special case: #Agenda → 1 vignette par événement (comme /videos)
      if (isAgendaLabel(badgeLabel)) {
        const today = new Date().toISOString().slice(0, 10);
        const { data: links } = await (supabase as any)
          .from("event_badges")
          .select("event_id")
          .eq("badge_id", badgeId);
        const candidateIds = ((links as any[]) || []).map((l) => l.event_id).filter(Boolean);
        let eventRows: any[] = [];
        if (candidateIds.length > 0) {
          const query = (supabase as any)
            .from("events")
            .select("id, name, images, videos, default_business_id, city_id, start_date, end_date, days_of_week, start_time, end_time")
            .in("id", candidateIds)
            .or(`end_date.gte.${today},end_date.is.null`)
            .order("sort_order", { ascending: true, nullsFirst: false })
            .order("start_date", { ascending: true });
          const { data } = filterByCity && cityId ? await query.eq("city_id", cityId) : await query;
          eventRows = ((data as any[]) || []).filter((ev) => ev?.images?.[0] || ev?.videos?.[0]);
        }

        const evBizIds = Array.from(new Set(eventRows.map((ev) => ev.default_business_id).filter(Boolean)));
        const evBizMap: Record<string, any> = {};
        if (evBizIds.length) {
          const { data: bizs } = await supabase
            .from("businesses")
            .select("id, name, logo_url, logo_bg")
            .in("id", evBizIds);
          (bizs || []).forEach((b: any) => { evBizMap[b.id] = b; });
        }
        // Resolve thumbnails from business_documents matching the first video URL
        const firstVideoUrls = eventRows.map((ev) => (ev.videos || []).filter(Boolean)[0]).filter(Boolean) as string[];
        const thumbByUrl = new Map<string, string>();
        if (firstVideoUrls.length > 0) {
          const { data: docs } = await supabase
            .from("business_documents")
            .select("url, thumbnail_url")
            .eq("business_is_active", true)
            .in("url", firstVideoUrls);
          ((docs as any[]) || []).forEach((d: any) => {
            if (d.url && d.thumbnail_url) thumbByUrl.set(d.url, d.thumbnail_url);
          });
        }
        const eventItems: VideoItem[] = eventRows.map((ev: any) => {
          const firstVideo = (ev.videos || []).filter(Boolean)[0] || "";
          const firstImage = (ev.images || []).filter(Boolean)[0] || null;
          const biz = ev.default_business_id ? evBizMap[ev.default_business_id] : null;
          return {
            _id: `event:${ev.id}`,
            _kind: "event",
            _isInternal: false,

            url: firstVideo,
            name: ev.name || null,
            description: null,
            thumbnail_url: firstImage || (firstVideo ? thumbByUrl.get(firstVideo) || null : null),
            owner_business_id: biz?.id || null,
            owner_name: biz?.name || null,
            owner_logo_url: biz?.logo_url || null,
            owner_logo_bg: biz?.logo_bg || null,
            generic_video_id: null,
            event_id: ev.id,
            eventInfo: {
              name: ev.name ?? null,
              start_date: ev.start_date ?? null,
              end_date: ev.end_date ?? null,
              days_of_week: ev.days_of_week ?? null,
              start_time: ev.start_time ?? null,
              end_time: ev.end_time ?? null,
            },
            social: null,
          };
        });

        if (cancelled) return;
        setItems(eventItems);
        onCountChange?.(eventItems.length);
        setLoading(false);
        return;
      }

      const [docBadgeRes, ytBadgeRes, genericBadgeRes] = await Promise.all([
        supabase.from("business_document_badges").select("document_id").eq("badge_id", badgeId),
        supabase.from("business_youtube_video_badges").select("youtube_video_id").eq("badge_id", badgeId),
        supabase.from("generic_video_badges" as any).select("generic_video_id").eq("badge_id", badgeId),
      ]);
      let docIds = (docBadgeRes.data || []).map((r: any) => r.document_id);
      let ytIds = (ytBadgeRes.data || []).map((r: any) => r.youtube_video_id);
      let genericIds = ((genericBadgeRes.data as any[]) || []).map((r: any) => r.generic_video_id);

      // Restrict to docs/yt linked to the requested city
      if (filterByCity && cityId) {
        const [docCityRes, ytCityRes, genericCityRes, genericLegacyCityRes] = await Promise.all([
          docIds.length
            ? supabase.from("business_document_cities").select("document_id").eq("city_id", cityId).in("document_id", docIds)
            : Promise.resolve({ data: [] as any[] }),
          ytIds.length
            ? supabase.from("business_youtube_video_cities").select("youtube_video_id").eq("city_id", cityId).in("youtube_video_id", ytIds)
            : Promise.resolve({ data: [] as any[] }),
          genericIds.length
            ? supabase.from("generic_video_cities" as any).select("generic_video_id").eq("city_id", cityId).in("generic_video_id", genericIds)
            : Promise.resolve({ data: [] as any[] }),
          genericIds.length
            ? supabase.from("generic_videos" as any).select("id").in("id", genericIds).ilike("city", effectiveCity)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        docIds = (docCityRes.data || []).map((r: any) => r.document_id);
        ytIds = (ytCityRes.data || []).map((r: any) => r.youtube_video_id);
        genericIds = Array.from(new Set([
          ...(((genericCityRes.data as any[]) || []).map((r: any) => r.generic_video_id)),
          ...(((genericLegacyCityRes.data as any[]) || []).map((r: any) => r.id)),
        ]));
      } else if (filterByCity && !cityId) {
        docIds = [];
        ytIds = [];
        genericIds = [];
      }

      const [docsRes, ytRes, genericRes] = await Promise.all([
        docIds.length
          ? supabase
              .from("business_documents")
              .select("id, url, name, description, thumbnail_url, business_id, business_is_active, type, sort_order")
              .in("id", docIds)
              .eq("business_is_active", true)
              .in("type", ["instagram_video", "tiktok_video", "youtube_video", "video"])
          : Promise.resolve({ data: [] as any[] }),
        ytIds.length
          ? supabase
              .from("business_youtube_videos")
              .select("id, video_id, title, thumbnail, custom_thumbnail_url, business_id, business_is_active, is_visible, sort_order")
              .in("id", ytIds)
              .eq("business_is_active", true)
              .eq("is_visible", true)
          : Promise.resolve({ data: [] as any[] }),
        genericIds.length
          ? supabase
              .from("generic_videos" as any)
              .select("id, url, name, title, description, thumbnail_url, instagram_account, tiktok_account, youtube_account, sort_order")
              .in("id", genericIds)
              .order("sort_order", { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const genericVideoIds = ((genericRes.data as any[]) || []).map((g: any) => g.id).filter(Boolean);
      const [genericBizLinksRes, genericPoiLinksRes] = await Promise.all([
        genericVideoIds.length
          ? supabase.from("generic_video_businesses" as any).select("generic_video_id, business_id, sort_order").in("generic_video_id", genericVideoIds).order("sort_order", { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
        genericVideoIds.length
          ? supabase.from("generic_video_pois" as any).select("generic_video_id, poi_id, sort_order").in("generic_video_id", genericVideoIds).order("sort_order", { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const firstOwnerByGenericId: Record<string, string> = {};
      (((genericBizLinksRes.data as any[]) || [])).forEach((l: any) => {
        if (!firstOwnerByGenericId[l.generic_video_id]) firstOwnerByGenericId[l.generic_video_id] = l.business_id;
      });
      (((genericPoiLinksRes.data as any[]) || [])).forEach((l: any) => {
        if (!firstOwnerByGenericId[l.generic_video_id]) firstOwnerByGenericId[l.generic_video_id] = l.poi_id;
      });

      const bizIds = Array.from(
        new Set([
          ...((docsRes.data || []).map((r: any) => r.business_id).filter(Boolean)),
          ...((ytRes.data || []).map((r: any) => r.business_id).filter(Boolean)),
          ...Object.values(firstOwnerByGenericId).filter(Boolean),
        ])
      );
      const bizMap: Record<string, any> = {};
      if (bizIds.length) {
        const { data: bizs } = await supabase
          .from("businesses")
          .select("id, name, logo_url, logo_bg, hook_fr, front_video_count")
          .in("id", bizIds);
        (bizs || []).forEach((b: any) => { bizMap[b.id] = b; });
      }

      const docItems: VideoItem[] = (docsRes.data || []).map((d: any) => ({
        _id: `doc:${d.id}`,
        _kind: "doc",
        _isInternal: d.type === "video",
        url: d.url,

        name: d.name || bizMap[d.business_id]?.hook_fr || null,
        description: d.description || null,
        thumbnail_url: d.thumbnail_url || null,
        owner_business_id: d.business_id || null,
        owner_name: bizMap[d.business_id]?.name || null,
        owner_logo_url: bizMap[d.business_id]?.logo_url || null,
        owner_logo_bg: bizMap[d.business_id]?.logo_bg || null,
        generic_video_id: null,
        social: null,
      }));

      const ytItems: VideoItem[] = (ytRes.data || []).map((y: any) => ({
        _id: `yt:${y.id}`,
        _kind: "youtube",
        _isInternal: false,

        url: `https://www.youtube.com/watch?v=${y.video_id}`,
        name: y.title || bizMap[y.business_id]?.hook_fr || null,
        description: null,
        thumbnail_url: y.custom_thumbnail_url || y.thumbnail || ytThumb(y.video_id),
        owner_business_id: y.business_id || null,
        owner_name: bizMap[y.business_id]?.name || null,
        owner_logo_url: bizMap[y.business_id]?.logo_url || null,
        owner_logo_bg: bizMap[y.business_id]?.logo_bg || null,
        generic_video_id: null,
        social: null,
      }));

      const genericItems: VideoItem[] = ((genericRes.data as any[]) || []).map((g: any) => {
        const ownerId = firstOwnerByGenericId[g.id] || null;
        const igAcc = (g.instagram_account || "").replace(/^@+/, "");
        const ttAcc = (g.tiktok_account || "").replace(/^@+/, "");
        const ytAcc = (g.youtube_account || "").replace(/^@+/, "");
        const account = igAcc || ttAcc || ytAcc;
        const social = igAcc
          ? { platform: "instagram" as const, account: igAcc, url: `https://www.instagram.com/${igAcc}` }
          : ttAcc
            ? { platform: "tiktok" as const, account: ttAcc, url: `https://www.tiktok.com/@${ttAcc}` }
            : ytAcc
              ? { platform: "youtube" as const, account: ytAcc, url: `https://www.youtube.com/@${ytAcc}` }
              : null;
        return {
          _id: `generic:${g.id}`,
          _kind: "generic" as const,
          _isInternal: false,

          url: g.url,
          name: g.title || g.name || (account ? `@${account}` : null),
          description: g.description || null,
          thumbnail_url: g.thumbnail_url || null,
          owner_business_id: ownerId,
          owner_name: account ? `@${account}` : (ownerId ? bizMap[ownerId]?.name || null : null),
          owner_logo_url: ownerId ? bizMap[ownerId]?.logo_url || null : null,
          owner_logo_bg: ownerId ? bizMap[ownerId]?.logo_bg || null : null,
          generic_video_id: g.id,
          social,
        };
      });

      if (cancelled) return;

      // Per-business cap on internal documents only (business_documents): keep
      // the first `front_video_count` (default 1, max 9) per establishment,
      // ordered by the establishment's internal sort_order.
      // YouTube channel videos and generic videos are NOT limited.
      const groupedByBiz = new Map<string, { _id: string; sort_order: number }[]>();
      const pushToGroup = (bizId: string | null, _id: string, sort_order: any) => {
        if (!bizId) return;
        const arr = groupedByBiz.get(bizId) || [];
        arr.push({ _id, sort_order: typeof sort_order === "number" ? sort_order : Number.MAX_SAFE_INTEGER });
        groupedByBiz.set(bizId, arr);
      };
      (docsRes.data || []).forEach((d: any) => pushToGroup(d.business_id || null, `doc:${d.id}`, d.sort_order));
      const allowedDocIds = new Set<string>();
      for (const [bizId, arr] of groupedByBiz.entries()) {
        const limit = Math.max(1, Math.min(9, bizMap[bizId]?.front_video_count ?? 1));
        arr.sort((a, b) => a.sort_order - b.sort_order);
        arr.slice(0, limit).forEach((x) => allowedDocIds.add(x._id));
      }
      const limitedDocItems = docItems.filter((it) => allowedDocIds.has(it._id));

      const all = [...limitedDocItems, ...ytItems, ...genericItems];
      setItems(all);
      onCountChange?.(all.length);
      setLoading(false);

      // For generic YouTube videos without a title/name, fetch the title from
      // YouTube oEmbed (no API key, CORS-enabled) and patch the item name.
      const ytToFetch = ((genericRes.data as any[]) || []).filter((g: any) => {
        if (g.title || g.name) return false;
        return typeof g.url === "string" && /youtu\.?be/i.test(g.url);
      });
      if (ytToFetch.length > 0) {
        const updates = await Promise.all(
          ytToFetch.map(async (g: any) => {
            try {
              const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(g.url)}&format=json`);
              if (!res.ok) return null;
              const j = await res.json();
              return j?.title ? { id: g.id, title: j.title as string } : null;
            } catch { return null; }
          }),
        );
        if (cancelled) return;
        const titleById = new Map<string, string>();
        updates.forEach((u) => { if (u) titleById.set(u.id, u.title); });
        if (titleById.size > 0) {
          setItems((prev) => prev.map((it) => {
            if (it._kind !== "generic" || !it.generic_video_id) return it;
            const t = titleById.get(it.generic_video_id);
            if (!t) return it;
            // Only patch if current name was a fallback (hook or @account), not a real title.
            return { ...it, name: t };
          }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [badgeId, badgeLabel, city, onCountChange]);

  const isGenericActive = activeItem?._kind === "generic";
  const activeOwner = activeItem && activeItem.owner_business_id
    ? {
        id: activeItem.owner_business_id,
        name: activeItem.owner_name || "",
        logo_url: activeItem.owner_logo_url,
        logo_bg: activeItem.owner_logo_bg,
      }
    : null;

  return (
    <div className="w-full px-4 py-6">
      <h2 className="text-lg font-semibold mb-4">
        {badgeLabel} <span className="text-muted-foreground text-sm font-normal">— {L.videosFound(items.length)}</span>
      </h2>
      {loading ? (
        <div data-results-grid="true" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[9/16] rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{L.noVideos(badgeLabel)}</p>
      ) : (
        <>
        <div data-results-grid="true" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">

          {items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item) => (
            <button
              key={item._id}
              onClick={() => {
                if (item._isInternal && item.owner_business_id && onOpenBusiness) {
                  onOpenBusiness({ id: item.owner_business_id, name: item.owner_name || "" });
                  return;
                }
                setCurrentTime(0);
                setActiveItem(item);
              }}

              className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted group focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt={item.name || ""}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <Play className="h-8 w-8" />
                </div>
              )}
              {item.eventInfo ? (() => {
                const ei = item.eventInfo;
                const dateStr = formatEventDateRange(ei.start_date, ei.end_date);
                const daysStr = formatDaysOfWeek(ei.days_of_week);
                const timeStr = formatTimeRange(ei.start_time, ei.end_time);
                const textShadow = "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5)) drop-shadow(0 4px 20px hsla(0,0%,0%,0.3))";
                return (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
                    <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 top-[6%] z-20 flex flex-col items-center gap-2 px-3 pointer-events-none text-center">
                      {ei.name && (
                        <p
                          className="text-sm md:text-base font-bold text-white mt-3 normal-case line-clamp-3"
                          style={{
                            fontFamily: "'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif",
                            textTransform: "none",
                            letterSpacing: "0.02em",
                            filter: "drop-shadow(0 0 2px hsla(0,0%,0%,1)) drop-shadow(0 0 5px hsla(0,0%,0%,0.95)) drop-shadow(0 0 10px hsla(0,0%,0%,0.85)) drop-shadow(0 2px 6px hsla(0,0%,0%,0.8)) drop-shadow(0 4px 16px hsla(0,0%,0%,0.7)) drop-shadow(0 6px 28px hsla(0,0%,0%,0.5))",
                          }}
                        >
                          {ei.name}
                        </p>
                      )}
                    </div>
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
              })() : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
                  <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
                  {item.name && !(item._kind === "generic" && item.social?.account && item.name === `@${item.social.account}`) && (
                    <div className="absolute inset-x-0 top-[12%] z-[10] flex flex-col items-center gap-2 px-3 pointer-events-none text-center">
                      <p
                        className="text-sm md:text-base font-bold text-white normal-case line-clamp-3"
                        style={{
                          fontFamily: "'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif",
                          textTransform: "none",
                          letterSpacing: "0.02em",
                          filter: "drop-shadow(0 0 2px hsla(0,0%,0%,1)) drop-shadow(0 0 5px hsla(0,0%,0%,0.95)) drop-shadow(0 0 10px hsla(0,0%,0%,0.85)) drop-shadow(0 2px 6px hsla(0,0%,0%,0.8)) drop-shadow(0 4px 16px hsla(0,0%,0%,0.7)) drop-shadow(0 6px 28px hsla(0,0%,0%,0.5))",
                        }}
                      >
                        {item.name}
                      </p>
                    </div>
                  )}
                  {item._kind !== "generic" && item.owner_logo_url ? (
                    <div className="absolute inset-x-0 bottom-[15%] z-[6] flex items-center justify-center px-2 pointer-events-none">
                      <img
                        src={item.owner_logo_url}
                        alt={item.owner_name || ""}
                        className="w-auto h-auto max-w-[100px] max-h-[72px] object-contain"
                        style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5)) drop-shadow(0 4px 20px hsla(0,0%,0%,0.3))" }}
                      />
                    </div>
                  ) : item.social ? (
                    <div className="absolute inset-x-0 bottom-[15%] z-[6] flex flex-col items-center justify-center gap-2 px-2 pointer-events-none text-white">
                      <div
                        className="flex items-center justify-center"
                        style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5))" }}
                      >
                        {item.social.platform === "instagram" && <InstagramIcon className="h-10 w-10" />}
                        {item.social.platform === "youtube" && <Youtube className="h-10 w-10" />}
                        {item.social.platform === "tiktok" && <SiTiktok className="h-9 w-9" />}
                      </div>
                      {item.social.account && (
                        <div className="flex items-center gap-1 rounded-full bg-black/80 border border-white/15 px-2 py-0.5">
                          <span className="text-[10px] font-medium text-white normal-case" style={{ fontFamily: "'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif", letterSpacing: "0.01em" }}>
                            Follow @{item.social.account}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : null}
                  {item._kind !== "generic" && item.owner_name && (
                    <div className="absolute inset-x-0 bottom-2 z-[7] flex items-center justify-center px-2 pointer-events-none">
                      <span
                        className="text-base font-bold text-white text-center line-clamp-2"
                        style={{
                          fontFamily: "'Montserrat', sans-serif",
                          textTransform: "none",
                          letterSpacing: "0.02em",
                          filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5))",
                        }}
                      >
                        {item.owner_name}
                      </span>
                    </div>
                  )}
                </>
              )}


            </button>
          ))}
        </div>
        <SearchPagination
          currentPage={currentPage}
          totalPages={Math.ceil(items.length / ITEMS_PER_PAGE)}
          totalCount={items.length}
          pageSize={ITEMS_PER_PAGE}
          onPageChange={(p) => {
            setCurrentPage(p);
          }}
        />
        </>
      )}



      <BookOnlineSlidePanel
        open={!!activeItem}
        onClose={() => setActiveItem(null)}
        videoUrl={activeItem?.url || null}
        videoId={isGenericActive ? activeItem?.generic_video_id || null : null}
        businessName={activeItem?.owner_name || ""}
        pageBusinessId={!isGenericActive ? activeItem?.owner_business_id || null : null}
        isGeneric={isGenericActive}
        owner={activeOwner}
        social={activeItem?.social || null}
        showSocialBadge={!!activeItem?.social}
        description={activeItem?.description || null}
        videoName={activeItem?.name || null}
        eventId={activeItem?.event_id || null}
        currentTime={currentTime}
        onTimeUpdate={setCurrentTime}
        returnContext={null}
      />
    </div>
  );
}
