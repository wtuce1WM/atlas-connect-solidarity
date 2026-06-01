import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, GripVertical, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import VideoIdSearchInput from "./VideoIdSearchInput";
import VideoLightbox from "./VideoLightbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DestVideo {
  id: string;
  url: string;
  name: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  business_id: string;
  business_name: string;
  destination_id: string;
  destination_name: string;
  city: string | null;
  cities: string[];
  neighborhood: string | null;
  source: "document" | "generic";
  instagram_account?: string | null;
  tiktok_account?: string | null;
  youtube_account?: string | null;
  has_description?: boolean;
  has_timeframes?: boolean;
  has_linked?: boolean;
}

interface CityOption { name: string; sort_order: number; }

const NONE_CITY = "__none__";
const ALL = "__all__";

const SortableVideoCard = ({ video, index, onPlay }: { video: DestVideo; index: number; onPlay: (url: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={{ ...style, width: 220 }} data-video-id={video.id} className="flex flex-col rounded-lg border bg-background p-1.5 transition-[outline]">
      <div className="flex items-center gap-1 mb-1">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </div>
        <span className="text-xs text-muted-foreground font-mono">{index + 1}</span>
        <button
          type="button"
          className="ml-auto text-[10px] text-muted-foreground font-mono truncate max-w-[100px] hover:text-foreground transition-colors"
          title={`Copier l'ID : ${video.id}`}
          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(video.id); toast.success("ID copié"); }}
        >
          {video.id.slice(0, 8)}
        </button>
      </div>
      <button
        className="relative bg-black rounded overflow-hidden group flex-shrink-0 w-full"
        style={{ height: 110 }}
        onClick={() => onPlay(video.url)}
      >
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : video.url.includes("supabase.co/storage") ? (
          <video src={video.url} className="w-full h-full object-cover" muted preload="metadata" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center">
            <Play className="h-4 w-4 text-primary-foreground fill-primary-foreground ml-0.5" />
          </div>
        </div>
        {video.source === "generic" && video.has_description && <span className="absolute bottom-2 right-2 z-10 px-2 py-1 rounded text-[10px] font-bold bg-primary text-primary-foreground">TXT</span>}
        {video.source === "generic" && video.has_timeframes && <span className="absolute bottom-2 left-2 z-10 px-2 py-1 rounded text-[10px] font-bold bg-amber-500 text-white flex items-center gap-0.5"><Clock className="h-3 w-3" />TIME</span>}
        {video.source === "generic" && video.has_linked && <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white">VU</span>}
      </button>
      <div className="mt-1.5">
        <p className="text-sm font-medium leading-tight flex items-center gap-1">
          {video.business_name}
          {video.source === "generic" && (
            <span className="shrink-0 text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-muted text-muted-foreground">GEN</span>
          )}
        </p>
        {(video.cities.length > 0 || video.neighborhood) && (
          <p className="text-[11px] text-muted-foreground/70 truncate">
            {[video.cities.join(", "), video.neighborhood].filter(Boolean).join(" · ")}
          </p>
        )}
        {video.name && <p className="text-[11px] text-muted-foreground/70 truncate">{video.name}</p>}
        {video.source === "generic" && (video.instagram_account || video.tiktok_account || video.youtube_account) && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {video.instagram_account && <Badge variant="outline" className="text-[10px] px-1.5 py-0">IG: {video.instagram_account}</Badge>}
            {video.tiktok_account && <Badge variant="outline" className="text-[10px] px-1.5 py-0">TT: {video.tiktok_account}</Badge>}
            {video.youtube_account && <Badge variant="outline" className="text-[10px] px-1.5 py-0">YT: {video.youtube_account}</Badge>}
          </div>
        )}
      </div>
    </div>
  );
};

const DestinationVideosPanelTab = () => {
  const [videos, setVideos] = useState<DestVideo[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedDest, setSelectedDest] = useState<string>(ALL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(async () => {
    setLoading(true);

    const { data: citiesData } = await supabase
      .from("cities")
      .select("name_fr, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (citiesData) {
      setCities(citiesData.map(c => ({ name: c.name_fr, sort_order: c.sort_order ?? 0 })));
    }

    // Fetch all business_documents videos with a destination_id
    const allDocs: any[] = [];
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data } = await supabase
        .from("business_documents")
        .select("id, url, name, thumbnail_url, sort_order, business_id, destination_id, city, neighborhood")
        .eq("type", "video")
        .not("destination_id", "is", null)
        .order("sort_order", { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (!data || data.length === 0) break;
      allDocs.push(...data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    const { isInternalVideoUrl } = await import("@/lib/videoSourceFilter");
    const allDocsFiltered = allDocs.filter(d => isInternalVideoUrl(d.url));
    allDocs.length = 0;
    allDocs.push(...allDocsFiltered);

    // Fetch generic videos linked to destinations
    const { data: gvdLinks } = await supabase
      .from("generic_video_destinations" as any)
      .select("generic_video_id, destination_id, sort_order") as any;

    const genericVideoIds = [...new Set((gvdLinks || []).map((l: any) => l.generic_video_id))] as string[];
    const genericVideosMap = new Map<string, any>();
    for (let i = 0; i < genericVideoIds.length; i += 200) {
      const batch = genericVideoIds.slice(i, i + 200);
      const { data } = await supabase.from("generic_videos" as any).select("id, url, name, thumbnail_url, city, neighborhood, instagram_account, tiktok_account, youtube_account, description").in("id", batch) as any;
      if (data) data.forEach((g: any) => genericVideosMap.set(g.id, g));
    }

    // Build generic video rows (one per destination link)
    const genericDocs: any[] = [];
    (gvdLinks || []).forEach((link: any) => {
      const gv = genericVideosMap.get(link.generic_video_id);
      if (!gv) return;
      genericDocs.push({
        id: `gv-${link.generic_video_id}-${link.destination_id}`,
        url: gv.url,
        name: gv.name,
        thumbnail_url: gv.thumbnail_url,
        sort_order: link.sort_order ?? 0,
        business_id: link.generic_video_id,
        destination_id: link.destination_id,
        city: gv.city || null,
        neighborhood: gv.neighborhood || null,
        _source: "generic" as const,
        instagram_account: gv.instagram_account || null,
        tiktok_account: gv.tiktok_account || null,
        youtube_account: gv.youtube_account || null,
        has_description: !!(gv.description && gv.description.replace(/<[^>]*>/g, "").trim()),
      });
    });

    // Deduplicate by id (generic videos can appear multiple times via different link rows)
    const combinedRaw = [...allDocs.map(d => ({ ...d, _source: "document" as const })), ...genericDocs];
    const seenIds = new Set<string>();
    const combined = combinedRaw.filter(d => {
      if (seenIds.has(d.id)) return false;
      seenIds.add(d.id);
      return true;
    });

    if (combined.length === 0) {
      setVideos([]);
      setLoading(false);
      return;
    }

    // Fetch business names (for business_documents only)
    const bizIds = [...new Set(allDocs.map(d => d.business_id))];
    const bizMap = new Map<string, string>();
    for (let i = 0; i < bizIds.length; i += 200) {
      const batch = bizIds.slice(i, i + 200);
      const { data } = await supabase.from("businesses").select("id, name").in("id", batch);
      if (data) data.forEach(b => bizMap.set(b.id, b.name));
    }

    // Fetch destination names
    const destIds = [...new Set(combined.map(d => d.destination_id).filter(Boolean))] as string[];
    const destMap = new Map<string, string>();
    for (let i = 0; i < destIds.length; i += 200) {
      const batch = destIds.slice(i, i + 200);
      const { data } = await supabase.from("destinations").select("id, name_fr").in("id", batch);
      if (data) data.forEach(d => destMap.set(d.id, d.name_fr));
    }

    // Fetch timeframe + linked counts for generic videos
    const gvRealIds = [...new Set(genericVideoIds)] as string[];
    const gvTimeSet = new Set<string>();
    const gvLinkedSet = new Set<string>();
    if (gvRealIds.length > 0) {
      const [tfRes, poiRes, bizRes, destRes2] = await Promise.all([
        supabase.from("generic_video_timeframes" as any).select("generic_video_id").in("generic_video_id", gvRealIds) as any,
        supabase.from("generic_video_pois" as any).select("generic_video_id").in("generic_video_id", gvRealIds) as any,
        supabase.from("generic_video_businesses" as any).select("generic_video_id").in("generic_video_id", gvRealIds) as any,
        supabase.from("generic_video_destinations" as any).select("generic_video_id").in("generic_video_id", gvRealIds) as any,
      ]);
      ((tfRes.data || []) as any[]).forEach((r: any) => gvTimeSet.add(r.generic_video_id));
      [...((poiRes.data || []) as any[]), ...((bizRes.data || []) as any[]), ...((destRes2.data || []) as any[])].forEach((r: any) => gvLinkedSet.add(r.generic_video_id));
    }

    // Fetch multi-city associations for both sources
    const { fetchVideoCities } = await import("@/lib/fetchVideoCities");
    const { businessDocCities, genericVideoCities } = await fetchVideoCities({
      businessDocumentIds: allDocs.map(d => d.id),
      genericVideoIds: gvRealIds,
    });

    setVideos(combined.map(d => {
      const rawGvId = d._source === "generic" ? d.business_id : null;
      const fallbackCity = d.city || null;
      const multi = d._source === "generic"
        ? (rawGvId ? genericVideoCities.get(rawGvId) || [] : [])
        : (businessDocCities.get(d.id) || []);
      return {
        id: d.id,
        url: d.url,
        name: d.name,
        thumbnail_url: d.thumbnail_url,
        sort_order: d.sort_order,
        business_id: d.business_id,
        business_name: d._source === "generic" ? "Générique" : (bizMap.get(d.business_id) || "—"),
        destination_id: d.destination_id,
        destination_name: destMap.get(d.destination_id) || "—",
        city: fallbackCity,
        cities: multi.length > 0 ? multi : (fallbackCity ? [fallbackCity] : []),
        neighborhood: d.neighborhood || null,
        source: d._source,
        instagram_account: d.instagram_account || null,
        tiktok_account: d.tiktok_account || null,
        youtube_account: d.youtube_account || null,
        has_description: !!d.has_description,
        has_timeframes: rawGvId ? gvTimeSet.has(rawGvId) : false,
        has_linked: rawGvId ? gvLinkedSet.has(rawGvId) : false,
      };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const videoCities = useMemo(() => {
    const citySet = new Set<string>();
    videos.forEach(v => v.cities.forEach(c => citySet.add(c)));
    const cityOrder = new Map(cities.map(c => [c.name, c.sort_order]));
    return [...citySet].sort((a, b) => (cityOrder.get(a) ?? 9999) - (cityOrder.get(b) ?? 9999));
  }, [videos, cities]);

  const cityFilteredVideos = useMemo(() => {
    if (!selectedCity) return [];
    if (selectedCity === NONE_CITY) return videos.filter(v => v.cities.length === 0);
    return videos.filter(v => v.cities.includes(selectedCity));
  }, [videos, selectedCity]);

  const videoDests = useMemo(() => {
    const destSet = new Map<string, string>();
    cityFilteredVideos.forEach(v => {
      if (v.destination_id && !destSet.has(v.destination_id)) destSet.set(v.destination_id, v.destination_name);
    });
    return [...destSet.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cityFilteredVideos]);

  useEffect(() => { setSelectedDest(ALL); }, [selectedCity]);

  const filteredVideos = useMemo(() => {
    let result = cityFilteredVideos;
    if (selectedDest !== ALL) {
      result = result.filter(v => v.destination_id === selectedDest);
    }
    return result;
  }, [cityFilteredVideos, selectedDest]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setVideos(prev => {
      const oldIndex = prev.findIndex(v => v.id === active.id);
      const newIndex = prev.findIndex(v => v.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const saveOrder = async () => {
    if (selectedDest === ALL) {
      toast.error("Sélectionne une destination pour sauvegarder l'ordre");
      return;
    }
    setSaving(true);
    try {
      await Promise.all(filteredVideos.map((v, i) => {
        if (v.source === "generic") {
          return supabase
            .from("generic_video_destinations" as any)
            .update({ sort_order: i } as any)
            .eq("generic_video_id", v.business_id)
            .eq("destination_id", v.destination_id);
        }
        return supabase
          .from("business_documents")
          .update({ sort_order: i } as any)
          .eq("id", v.id);
      }));
      toast.success("Ordre sauvegardé");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Vidéos avec Destination ({videos.length})</h3>
        <Button size="sm" onClick={saveOrder} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Sauvegarder l'ordre
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <VideoIdSearchInput videoIds={filteredVideos.map(v => v.id)} />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Ville :</span>
          <Select value={selectedCity || ""} onValueChange={v => setSelectedCity(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Sélectionner une ville" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_CITY}>Aucune</SelectItem>
              {videoCities.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Destination :</span>
          <Select value={selectedDest} onValueChange={setSelectedDest} disabled={!selectedCity}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder={!selectedCity ? "Choisir une ville" : "Toutes"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes</SelectItem>
              {videoDests.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedCity && (
        <>
          <p className="text-sm text-muted-foreground">{filteredVideos.length} vidéo{filteredVideos.length !== 1 ? "s" : ""}</p>
          {filteredVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucune vidéo pour cette sélection.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredVideos.map(v => v.id)} strategy={rectSortingStrategy}>
                <div className="flex flex-wrap gap-2">
                  {filteredVideos.map((v, i) => (
                    <SortableVideoCard key={v.id} video={v} index={i} onPlay={setLightboxUrl} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}

      {lightboxUrl && <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
};

export default DestinationVideosPanelTab;
