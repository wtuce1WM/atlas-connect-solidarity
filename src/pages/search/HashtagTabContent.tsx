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
  onOpenVideo: (businessId: string, videoUrl: string, name: string | null) => void;
}

const ytThumb = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

export default function HashtagTabContent({ badgeId, badgeLabel, onOpenVideo }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VideoItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [docBadgeRes, ytBadgeRes] = await Promise.all([
        supabase.from("business_document_badges").select("document_id").eq("badge_id", badgeId),
        supabase.from("business_youtube_video_badges").select("youtube_video_id").eq("badge_id", badgeId),
      ]);
      const docIds = (docBadgeRes.data || []).map((r: any) => r.document_id);
      const ytIds = (ytBadgeRes.data || []).map((r: any) => r.youtube_video_id);

      const [docsRes, ytRes] = await Promise.all([
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
      ]);

      const bizIds = Array.from(
        new Set([
          ...((docsRes.data || []).map((r: any) => r.business_id).filter(Boolean)),
          ...((ytRes.data || []).map((r: any) => r.business_id).filter(Boolean)),
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
  }, [badgeId]);

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
