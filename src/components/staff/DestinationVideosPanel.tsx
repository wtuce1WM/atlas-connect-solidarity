import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, ExternalLink, MapPin, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface VideoDoc {
  id: string;
  url: string;
  name: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  business_id: string;
  business_name: string;
  business_logo: string | null;
  poi_name: string | null;
  linked_business_name: string | null;
}

interface DestinationVideosPanelProps {
  cityName: string;
}

const DestinationVideosPanel = ({ cityName }: DestinationVideosPanelProps) => {
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("business_documents")
        .select(`
          id, url, name, thumbnail_url, sort_order, business_id,
          businesses!business_documents_business_id_fkey(name, logo_url),
          poi:businesses!business_documents_poi_id_fkey(name),
          linked:businesses!business_documents_linked_business_id_fkey(name)
        `)
        .eq("type", "video")
        .eq("city", cityName)
        .order("sort_order");

      if (!error && data) {
        const mapped: VideoDoc[] = data.map((d: any) => ({
          id: d.id,
          url: d.url,
          name: d.name,
          thumbnail_url: d.thumbnail_url,
          sort_order: d.sort_order,
          business_id: d.business_id,
          business_name: d.businesses?.name || "—",
          business_logo: d.businesses?.logo_url || null,
          poi_name: d.poi?.name || null,
          linked_business_name: d.linked?.name || null,
        }));
        setVideos(mapped);
      }
      setLoading(false);
    };
    if (cityName) load();
  }, [cityName]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">
        Aucune vidéo liée à cette ville.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">{videos.length} vidéo{videos.length > 1 ? "s" : ""}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((v) => (
          <div key={v.id} className="rounded-lg border bg-background overflow-hidden">
            <div className="relative aspect-video bg-black">
              {playingId === v.id ? (
                <video src={v.url} controls autoPlay className="w-full h-full object-contain" />
              ) : (
                <button
                  className="w-full h-full flex items-center justify-center group"
                  onClick={() => setPlayingId(v.id)}
                >
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-muted/50" />
                  )}
                  <div className="relative z-10 w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center group-hover:bg-primary transition-colors">
                    <Play className="h-5 w-5 text-primary-foreground fill-primary-foreground ml-0.5" />
                  </div>
                </button>
              )}
            </div>

            <div className="p-3 space-y-1.5">
              {v.name && (
                <p className="text-xs text-muted-foreground line-clamp-2">{v.name}</p>
              )}
              <button
                onClick={() => navigate(`/staff/catalogue?edit=${v.business_id}&section=section-videos`)}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors text-left"
              >
                {v.business_logo && (
                  <img src={v.business_logo} alt="" className="h-5 w-5 rounded object-contain flex-shrink-0" />
                )}
                <span className="line-clamp-1">{v.business_name}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
              </button>

              {(v.poi_name || v.linked_business_name) && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {v.poi_name && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 font-normal">
                      <MapPin className="h-3 w-3" />
                      {v.poi_name}
                    </Badge>
                  )}
                  {v.linked_business_name && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 font-normal">
                      <Link2 className="h-3 w-3" />
                      {v.linked_business_name}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DestinationVideosPanel;
