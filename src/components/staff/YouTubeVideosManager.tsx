import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, Play, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  thumbnail: string;
  published_at: string | null;
  is_short: boolean;
  duration_seconds: number;
  is_visible: boolean;
  sort_order: number;
}

interface YouTubeVideosManagerProps {
  businessId: string;
  youtubeUrl: string | null;
}

const YouTubeVideosManager = ({ businessId, youtubeUrl }: YouTubeVideosManagerProps) => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("business_youtube_videos")
      .select("*")
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true });
    if (!error && data) setVideos(data);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const handleSync = async () => {
    if (!youtubeUrl) {
      toast.error("Aucune URL YouTube configurée");
      return;
    }
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("fetch-youtube-channel", {
        body: { channelUrl: youtubeUrl, maxResults: 50, businessId, syncToDb: true },
      });
      if (error) throw error;
      await fetchVideos();
      toast.success("Vidéos YouTube synchronisées");
    } catch (err: any) {
      toast.error(err.message || "Erreur de synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  const toggleVisibility = async (video: YouTubeVideo) => {
    const newVal = !video.is_visible;
    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, is_visible: newVal } : v));
    const { error } = await supabase
      .from("business_youtube_videos")
      .update({ is_visible: newVal })
      .eq("id", video.id);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, is_visible: !newVal } : v));
    }
  };

  const toggleAll = async (visible: boolean) => {
    const ids = videos.map(v => v.id);
    setVideos(prev => prev.map(v => ({ ...v, is_visible: visible })));
    const { error } = await supabase
      .from("business_youtube_videos")
      .update({ is_visible: visible })
      .in("id", ids);
    if (error) {
      toast.error("Erreur");
      fetchVideos();
    }
  };

  const visibleCount = videos.filter(v => v.is_visible).length;
  const shortsCount = videos.filter(v => v.is_short).length;
  const regularCount = videos.filter(v => !v.is_short).length;

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Play className="h-4 w-4 text-red-600" />
          Vidéos YouTube ({videos.length})
          {videos.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              {visibleCount} visible{visibleCount > 1 ? "s" : ""} · {shortsCount} short{shortsCount > 1 ? "s" : ""} · {regularCount} vidéo{regularCount > 1 ? "s" : ""}
            </span>
          )}
        </h4>
        <div className="flex items-center gap-2">
          {videos.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => toggleAll(true)} className="text-xs h-7">
                <Eye className="h-3 w-3 mr-1" /> Tout afficher
              </Button>
              <Button variant="outline" size="sm" onClick={() => toggleAll(false)} className="text-xs h-7">
                <EyeOff className="h-3 w-3 mr-1" /> Tout masquer
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing || !youtubeUrl} className="text-xs h-7">
            {syncing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            Synchroniser
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : videos.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Aucune vidéo synchronisée. Cliquez sur "Synchroniser" pour récupérer les vidéos de la chaîne.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {videos.map(video => (
            <div
              key={video.id}
              className={`relative rounded-lg overflow-hidden border transition-opacity ${!video.is_visible ? "opacity-40" : ""}`}
            >
              <div className="aspect-video relative">
                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                {video.is_short && (
                  <span className="absolute top-1 left-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    SHORT
                  </span>
                )}
              </div>
              <div className="p-1.5 flex items-start gap-1.5">
                <Switch
                  checked={video.is_visible}
                  onCheckedChange={() => toggleVisibility(video)}
                  className="mt-0.5 scale-75"
                />
                <p className="text-[10px] leading-tight line-clamp-2 flex-1">{video.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default YouTubeVideosManager;
