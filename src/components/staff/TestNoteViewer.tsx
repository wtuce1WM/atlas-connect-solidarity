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
  name: string | null;
  thumbnail_url: string | null;
  city: string | null;
  neighborhood: string | null;
  business_id: string;
  business_name: string;
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
      // Load all video docs (paginated) + badges + links
      const allDocs: any[] = [];
      let offset = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase
          .from("business_documents")
          .select("id, url, name, thumbnail_url, city, neighborhood, business_id")
          .eq("type", "video")
          .range(offset, offset + PAGE - 1);
        if (!data || data.length === 0) break;
        allDocs.push(...data);
        if (data.length < PAGE) break;
        offset += PAGE;
      }

      const [noteRes, badgesRes, linksRes] = await Promise.all([
        supabase.from("knowledge_entries").select("title, content").eq("id", NOTE_ID).maybeSingle(),
        supabase.from("badges").select("id, name_fr"),
        supabase.from("business_document_badges").select("document_id, badge_id"),
      ]);

      if (noteRes.data) {
        setTitle(noteRes.data.title);
        setContent(noteRes.data.content);
      }
      if (badgesRes.data) {
        setBadges([...badgesRes.data].sort((a, b) => a.name_fr.localeCompare(b.name_fr, "fr")));
      }

      // Fetch business names
      const bizIds = [...new Set(allDocs.map(d => d.business_id))];
      const bizMap = new Map<string, string>();
      for (let i = 0; i < bizIds.length; i += 200) {
        const { data } = await supabase.from("businesses").select("id, name").in("id", bizIds.slice(i, i + 200));
        if (data) data.forEach(b => bizMap.set(b.id, b.name));
      }

      const badgeMap = new Map<string, string[]>();
      (linksRes.data || []).forEach((l: any) => {
        const arr = badgeMap.get(l.document_id) || [];
        arr.push(l.badge_id);
        badgeMap.set(l.document_id, arr);
      });

      setVideos(allDocs.map(d => ({
        id: d.id,
        url: d.url,
        name: d.name,
        thumbnail_url: d.thumbnail_url,
        city: d.city,
        neighborhood: d.neighborhood,
        business_id: d.business_id,
        business_name: bizMap.get(d.business_id) || "—",
        badge_ids: badgeMap.get(d.id) || [],
      })));
      setLoading(false);
    })();
  }, []);

  const matchesCity = (v: VideoDoc) =>
    city === "none" ? false :
    city === "__none__" ? !v.city :
    v.city?.toLowerCase() === city.toLowerCase() || !v.city;

  // Badges available for selected city (incl. videos without city)
  const availableBadges = useMemo(() => {
    if (city === "none") return badges;
    const cityVideos = videos.filter(matchesCity);
    const badgeIdsWithVideos = new Set<string>();
    cityVideos.forEach(v => v.badge_ids.forEach(id => badgeIdsWithVideos.add(id)));
    return badges.filter(b => badgeIdsWithVideos.has(b.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badges, videos, city]);

  // Reset badge if no longer available
  useEffect(() => {
    if (badge !== "none" && !availableBadges.some(b => b.id === badge)) {
      setBadge("none");
    }
  }, [availableBadges, badge]);

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
          <Select value={badge} onValueChange={setBadge} disabled={city === "none"}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder={city === "none" ? "Choisir une ville" : "Aucun"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              {availableBadges.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name_fr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {city !== "none" && badge !== "none" && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">{filteredVideos.length} vidéo{filteredVideos.length !== 1 ? "s" : ""}</p>
          {filteredVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Aucune vidéo pour cette sélection.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredVideos.map(v => (
                <div key={v.id} style={{ width: 220 }} className="flex flex-col rounded-lg border bg-background p-1.5">
                  <button
                    className="relative bg-black rounded overflow-hidden group flex-shrink-0 w-full"
                    style={{ height: 110 }}
                    onClick={() => setLightboxUrl(v.url)}
                  >
                    {v.thumbnail_url ? (
                      <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : v.url.includes("supabase.co/storage") ? (
                      <video src={v.url} className="w-full h-full object-cover" muted preload="metadata" />
                    ) : (
                      <div className="w-full h-full bg-muted" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center">
                        <Play className="h-4 w-4 text-primary-foreground fill-primary-foreground ml-0.5" />
                      </div>
                    </div>
                  </button>
                  <div className="mt-1.5">
                    <p className="text-sm font-medium leading-tight">{v.business_name}</p>
                    {(v.city || v.neighborhood) && (
                      <p className="text-[11px] text-muted-foreground/70 truncate">
                        {[v.city, v.neighborhood].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {v.name && <p className="text-[11px] text-muted-foreground/70 truncate">{v.name}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
