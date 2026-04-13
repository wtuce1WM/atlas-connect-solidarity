import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { X, MapPin, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getVideoEmbed } from "@/lib/videoEmbed";
import { cn } from "@/lib/utils";

interface LinkedItem {
  id: string;
  name: string;
  type: "poi" | "business";
  start_time: number | null;
  end_time: number | null;
  sort_order: number;
}

interface GenericVideoPreviewOverlayProps {
  video: { id: string; url: string; name: string | null; thumbnail_url: string | null };
  onClose: () => void;
}

const GenericVideoPreviewOverlay = ({ video, onClose }: GenericVideoPreviewOverlayProps) => {
  const [items, setItems] = useState<LinkedItem[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const embed = getVideoEmbed(video.url, window.location.origin);
  const isFile = embed.type === "file";

  // Load linked items
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: poiLinks }, { data: bizLinks }] = await Promise.all([
        supabase.from("generic_video_pois" as any).select("poi_id, sort_order, start_time, end_time").eq("generic_video_id", video.id) as any,
        supabase.from("generic_video_businesses" as any).select("business_id, sort_order, start_time, end_time").eq("generic_video_id", video.id) as any,
      ]);

      const allItems: LinkedItem[] = [];

      if (poiLinks?.length) {
        const ids = poiLinks.map((l: any) => l.poi_id);
        const { data: pois } = await supabase.from("businesses").select("id, name").in("id", ids);
        const nameMap: Record<string, string> = {};
        (pois || []).forEach((p: any) => { nameMap[p.id] = p.name; });
        poiLinks.forEach((l: any) => {
          if (nameMap[l.poi_id]) allItems.push({ id: l.poi_id, name: nameMap[l.poi_id], type: "poi", start_time: l.start_time, end_time: l.end_time, sort_order: l.sort_order ?? 0 });
        });
      }

      if (bizLinks?.length) {
        const ids = bizLinks.map((l: any) => l.business_id);
        const { data: biz } = await supabase.from("businesses").select("id, name").in("id", ids);
        const nameMap: Record<string, string> = {};
        (biz || []).forEach((b: any) => { nameMap[b.id] = b.name; });
        bizLinks.forEach((l: any) => {
          if (nameMap[l.business_id]) allItems.push({ id: l.business_id, name: nameMap[l.business_id], type: "business", start_time: l.start_time, end_time: l.end_time, sort_order: l.sort_order ?? 0 });
        });
      }

      allItems.sort((a, b) => a.sort_order - b.sort_order);
      setItems(allItems);
      setLoading(false);
    };
    load();
  }, [video.id]);

  // Track time for file videos
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  }, []);

  // Current active item based on time
  const activeItem = useMemo(() => {
    if (items.length === 0) return null;
    // Find item whose timeframe contains currentTime
    const match = items.find(item => {
      const start = item.start_time ?? 0;
      const end = item.end_time ?? Infinity;
      return currentTime >= start && currentTime < end;
    });
    // If no match by time, show first item
    return match || items[0];
  }, [items, currentTime]);

  // Lazy-load BookOnlineSlidePanel to avoid circular deps
  const [SlidePanel, setSlidePanel] = useState<any>(null);
  useEffect(() => {
    import("@/components/BookOnlineSlidePanel").then(mod => setSlidePanel(() => mod.default));
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
        aria-label="Fermer"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Left: Video */}
      <div className="flex-1 flex items-center justify-center bg-black relative">
        {isFile ? (
          <video
            ref={videoRef}
            src={video.url}
            className="max-w-full max-h-full object-contain"
            autoPlay
            controls
            playsInline
            onTimeUpdate={handleTimeUpdate}
          />
        ) : (
          <iframe
            src={embed.embedUrl + (embed.embedUrl.includes("?") ? "&" : "?") + "autoplay=1"}
            className="w-full h-full"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            style={{ border: 0 }}
          />
        )}
      </div>

      {/* Right: Slide panel synced to current time */}
      <div className="w-[420px] h-full bg-background overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Chargement…</div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
            Aucun POI ou établissement lié à cette vidéo
          </div>
        ) : (
          <>
            {/* Timeline bar */}
            <div className="border-b bg-muted/30 p-2 space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Timeline — {Math.floor(currentTime)}s
              </p>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {items.map(item => {
                  const isActive = activeItem?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (videoRef.current && item.start_time != null) {
                          videoRef.current.currentTime = item.start_time;
                        }
                      }}
                      className={cn(
                        "shrink-0 px-2 py-1 rounded text-[10px] font-medium border transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:border-primary/50"
                      )}
                    >
                      <span className="flex items-center gap-1">
                        {item.type === "poi" ? <MapPin className="h-2.5 w-2.5" /> : <Building2 className="h-2.5 w-2.5" />}
                        {item.name}
                      </span>
                      <span className="text-[8px] opacity-60">
                        {item.start_time ?? 0}s → {item.end_time ?? "∞"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slide panel */}
            <div className="flex-1 overflow-hidden relative">
              {activeItem && SlidePanel ? (
                <SlidePanel
                  key={activeItem.id}
                  businessId={activeItem.id}
                  onClose={() => {}}
                  forceMuted
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Sélectionnez un segment
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GenericVideoPreviewOverlay;
