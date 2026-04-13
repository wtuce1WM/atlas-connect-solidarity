import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { X, MapPin, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getVideoEmbed } from "@/lib/videoEmbed";
import { cn } from "@/lib/utils";
import BusinessInfoPanel from "./BusinessInfoPanel";

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

  const embed = getVideoEmbed(video.url, window.location.origin);
  const isFile = embed.type === "file";
  const formatTime = (value: number | null | undefined) => (value == null ? "∞" : `${value.toFixed(1)}s`);

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

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  }, []);

  const activeItem = useMemo(() => {
    if (items.length === 0) return null;
    return items.find(item => {
      const start = item.start_time ?? 0;
      const end = item.end_time ?? Infinity;
      return currentTime >= start && currentTime < end;
    }) || null;
  }, [items, currentTime]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex">
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
        aria-label="Fermer"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="w-1/2 h-full flex items-center justify-center bg-black relative">
        {isFile ? (
          <video
            ref={videoRef}
            src={video.url}
            className="max-w-full max-h-full object-contain"
            autoPlay
            controls
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleTimeUpdate}
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

        {isFile && (
          <div className="absolute top-4 right-4 z-10 rounded-md border border-border/80 bg-background/85 px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm backdrop-blur-sm">
            {formatTime(currentTime)}
          </div>
        )}

        {isFile && activeItem && (
          <div className="absolute inset-x-4 bottom-4 z-10 rounded-lg border border-border/80 bg-background/85 px-3 py-2 shadow-sm backdrop-blur-sm">
            <p className="text-sm font-semibold text-foreground">{activeItem.name}</p>
            <p className="text-xs text-muted-foreground">
              {activeItem.type === "poi" ? "POI" : "Établissement"} · {formatTime(activeItem.start_time)} → {formatTime(activeItem.end_time)}
            </p>
          </div>
        )}
      </div>

      <div className="w-1/2 h-full bg-background overflow-hidden flex flex-col relative">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Chargement…</div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
            Aucun POI ou établissement lié à cette vidéo
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b bg-muted/30 p-3 space-y-2 z-10">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Timeline
                </p>
                <p className="text-sm font-semibold text-foreground">{formatTime(currentTime)}</p>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
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
                        "shrink-0 px-2.5 py-1.5 rounded text-[10px] font-medium border transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:border-primary/50"
                      )}
                    >
                      <span className="flex items-center gap-1">
                        {item.type === "poi" ? <MapPin className="h-2.5 w-2.5" /> : <Building2 className="h-2.5 w-2.5" />}
                        {item.name}
                      </span>
                      <span className="text-[10px] opacity-70">
                        {formatTime(item.start_time)} → {formatTime(item.end_time)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {activeItem ? (
                <BusinessInfoPanel key={activeItem.id} businessId={activeItem.id} />
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
