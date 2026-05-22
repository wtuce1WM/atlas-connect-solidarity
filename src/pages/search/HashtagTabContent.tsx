import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play } from "lucide-react";

interface VideoItem {
  _id: string;
  _kind: "doc" | "youtube";
  url: string;
  name: string | null;
  description: string | null;
  thumbnail_url: string | null;
  owner_business_id: string | null;
  owner_name: string | null;
}

interface Props {
  badgeId: string;
  badgeLabel: string;
  city?: string | null;
  onOpenVideo: (businessId: string, videoUrl: string, name: string | null) => void;
}

const ytThumb = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

export default function HashtagTabContent({ badgeId, badgeLabel, city, onOpenVideo }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VideoItem[]>([]);

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

      const [docBadgeRes, ytBadgeRes] = await Promise.all([
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
              .select("id, url, name, description, thumbnail_url, business_id, business_is_active, type")
              .in("id", docIds)
              .eq("business_is_active", true)
              .in("type", ["instagram_video", "tiktok_video", "youtube_video", "video"])
          : Promise.resolve({ data: [] as any[] }),
        ytIds.length
          ? supabase
              .from("business_youtube_videos")
              .select("id, video_id, title, thumbnail, custom_thumbnail_url, business_id, business_is_active, is_visible")
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
          .select("id, name")
          .in("id", bizIds);
        (bizs || []).forEach((b: any) => { bizMap[b.id] = b; });
      }

      const docItems: VideoItem[] = (docsRes.data || []).map((d: any) => ({
        _id: `doc:${d.id}`,
        _kind: "doc",
        url: d.url,
        name: d.name || null,
        description: d.description || null,
        thumbnail_url: d.thumbnail_url || null,
        owner_business_id: d.business_id || null,
        owner_name: bizMap[d.business_id]?.name || null,
      }));

      const ytItems: VideoItem[] = (ytRes.data || []).map((y: any) => ({
        _id: `yt:${y.id}`,
        _kind: "youtube",
        url: `https://www.youtube.com/watch?v=${y.video_id}`,
        name: y.title || null,
        description: null,
        thumbnail_url: y.custom_thumbnail_url || y.thumbnail || ytThumb(y.video_id),
        owner_business_id: y.business_id || null,
        owner_name: bizMap[y.business_id]?.name || null,
      }));

      if (cancelled) return;
      setItems([...docItems, ...ytItems]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [badgeId, city]);

  return (
    <div className="w-full px-4 py-6">
      <h2 className="text-lg font-semibold mb-4">
        {badgeLabel} <span className="text-muted-foreground text-sm">({items.length})</span>
      </h2>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[9/16] rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune vidéo trouvée pour {badgeLabel}.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {items.map((item) => (
            <button
              key={item._id}
              onClick={() => {
                if (!item.owner_business_id) return;
                onOpenVideo(item.owner_business_id, item.url, item.name);
              }}
              disabled={!item.owner_business_id}
              className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted group focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-left">
                {item.owner_name && (
                  <div className="text-[10px] text-white/80 truncate">{item.owner_name}</div>
                )}
                {item.name && (
                  <div className="text-xs text-white font-medium line-clamp-2">{item.name}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
