import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import VideoDocumentOverlay from "@/components/overlays/VideoDocumentOverlay";
import type { VideoDoc } from "@/hooks/useBookOnlineData";
import { Play } from "lucide-react";

interface VideoItem extends VideoDoc {
  _id: string;
  _kind: "doc" | "youtube";
}

interface Props {
  badgeId: string;
  badgeLabel: string;
}

const ytThumb = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

export default function HashtagTabContent({ badgeId, badgeLabel }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VideoItem[]>([]);
  const [active, setActive] = useState<VideoItem | null>(null);
  const [closing, setClosing] = useState(false);

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
              .select("id, url, name, description, thumbnail_url, city, price, price_type, business_id, business_is_active, type")
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
          .select("id, name, logo_url, instagram_url")
          .in("id", bizIds);
        (bizs || []).forEach((b: any) => { bizMap[b.id] = b; });
      }

      const docItems: VideoItem[] = (docsRes.data || []).map((d: any) => ({
        _id: `doc:${d.id}`,
        _kind: "doc",
        url: d.url,
        name: d.name || null,
        city: d.city || null,
        price: d.price || null,
        price_type: d.price_type || null,
        description: d.description || null,
        thumbnail_url: d.thumbnail_url || null,
        owner_business_id: d.business_id || null,
        owner_name: bizMap[d.business_id]?.name || null,
        owner_logo: bizMap[d.business_id]?.logo_url || null,
        owner_instagram: bizMap[d.business_id]?.instagram_url || null,
      }));

      const ytItems: VideoItem[] = (ytRes.data || []).map((y: any) => ({
        _id: `yt:${y.id}`,
        _kind: "youtube",
        url: `https://www.youtube.com/watch?v=${y.video_id}`,
        name: y.title || null,
        city: null,
        price: null,
        price_type: null,
        description: null,
        thumbnail_url: y.custom_thumbnail_url || y.thumbnail || ytThumb(y.video_id),
        owner_business_id: y.business_id || null,
        owner_name: bizMap[y.business_id]?.name || null,
        owner_logo: bizMap[y.business_id]?.logo_url || null,
        owner_instagram: bizMap[y.business_id]?.instagram_url || null,
      }));

      if (cancelled) return;
      setItems([...docItems, ...ytItems]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [badgeId]);

  const handleClose = useCallback(() => setClosing(true), []);

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
              onClick={() => { setActive(item); setClosing(false); }}
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

      {active && (
        <VideoDocumentOverlay
          activeVideo={{ url: active.url, name: active.name, description: active.description }}
          videoDocs={items}
          closing={closing}
          businessId={active.owner_business_id || undefined}
          businessName={active.owner_name || undefined}
          onClose={handleClose}
          onNavigate={(v) => {
            const next = items.find((it) => it.url === v.url);
            if (next) setActive(next);
          }}
          onAnimationEnd={() => {
            if (closing) {
              setActive(null);
              setClosing(false);
            }
          }}
        />
      )}
    </div>
  );
}
