import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import VideoLightbox from "./VideoLightbox";

const NOTE_ID = "919622ac-3bfe-4e3e-ab64-0dfeb3bd1696";

interface VideoDoc {
  id: string;
  url: string;
  thumbnail_url: string | null;
  city: string | null;
  badge_ids: string[];
}

const TestNoteViewer = () => {
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState<string>("none");
  const [badge, setBadge] = useState<string>("none");
  const [badges, setBadges] = useState<{ id: string; name_fr: string }[]>([]);
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [noteRes, badgesRes, videosRes, linksRes] = await Promise.all([
        supabase.from("knowledge_entries").select("title, content").eq("id", NOTE_ID).maybeSingle(),
        supabase.from("badges").select("id, name_fr"),
        supabase.from("business_documents").select("id, url, thumbnail_url, city").eq("type", "video"),
        supabase.from("business_document_badges").select("document_id, badge_id"),
      ]);
      if (noteRes.data) {
        setTitle(noteRes.data.title);
        setContent(noteRes.data.content);
      }
      if (badgesRes.data) {
        setBadges([...badgesRes.data].sort((a, b) => a.name_fr.localeCompare(b.name_fr, "fr")));
      }
      if (videosRes.data) {
        const badgeMap = new Map<string, string[]>();
        (linksRes.data || []).forEach((l: any) => {
          const arr = badgeMap.get(l.document_id) || [];
          arr.push(l.badge_id);
          badgeMap.set(l.document_id, arr);
        });
        setVideos(videosRes.data.map((v: any) => ({
          id: v.id, url: v.url, thumbnail_url: v.thumbnail_url, city: v.city,
          badge_ids: badgeMap.get(v.id) || [],
        })));
      }
      setLoading(false);
    })();
  }, []);

  const filteredVideos = useMemo(() => {
    if (city === "none" || badge === "none") return [];
    return videos.filter(v =>
      v.city?.toLowerCase() === city.toLowerCase() && v.badge_ids.includes(badge)
    );
  }, [videos, city, badge]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Ville :</span>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              <SelectItem value="marrakech">Marrakech</SelectItem>
              <SelectItem value="essaouira">Essaouira</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Badge :</span>
          <Select value={badge} onValueChange={setBadge}>
            <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              {badges.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name_fr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {city !== "none" && badge !== "none" && (
          <div className="flex items-center gap-2 flex-wrap">
            {filteredVideos.length === 0 ? (
              <span className="text-sm text-muted-foreground">Aucune vidéo</span>
            ) : (
              filteredVideos.map(v => (
                <button
                  key={v.id}
                  onClick={() => setLightboxUrl(v.url)}
                  className="relative bg-black rounded overflow-hidden group flex-shrink-0"
                  style={{ width: 80, height: 60 }}
                >
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : v.url.includes("supabase.co/storage") ? (
                    <video src={v.url} className="w-full h-full object-cover" muted preload="metadata" />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <Play className="h-4 w-4 text-white fill-white" />
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {!content ? (
        <div className="text-muted-foreground">Note introuvable.</div>
      ) : (
        <>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-li:text-foreground">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </>
      )}

      {lightboxUrl && <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
};

export default TestNoteViewer;
