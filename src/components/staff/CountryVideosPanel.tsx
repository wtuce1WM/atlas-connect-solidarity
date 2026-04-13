import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, GripVertical } from "lucide-react";
import VideoLightbox from "./VideoLightbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CountryVideo {
  id: string;
  url: string;
  name: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  business_id: string;
  business_name: string;
  subcategory_name: string;
  city: string | null;
  neighborhood: string | null;
  service_name: string | null;
  poi_name: string | null;
  linked_business_name: string | null;
}

interface CityOption {
  name: string;
  sort_order: number;
}

const NONE_CITY = "__none__";

const SortableVideoCard = ({
  video,
  index,
  onPlay,
}: {
  video: CountryVideo;
  index: number;
  onPlay: (url: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const tags = [
    video.service_name && `Service: ${video.service_name}`,
    video.poi_name && `POI: ${video.poi_name}`,
    video.linked_business_name && `Établissement: ${video.linked_business_name}`,
  ].filter(Boolean);

  return (
    <div ref={setNodeRef} style={{ ...style, width: 220 }} className="flex flex-col rounded-lg border bg-background p-1.5">
      <div className="flex items-center gap-1 mb-1">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </div>
        <span className="text-xs text-muted-foreground font-mono">{index + 1}</span>
      </div>
      <button
        className="relative bg-black rounded overflow-hidden group flex-shrink-0 w-full"
        style={{ height: 110 }}
        onClick={() => onPlay(video.url)}
      >
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
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
        <p className="text-sm font-medium leading-tight">{video.business_name}</p>
        <p className="text-xs text-muted-foreground truncate">{video.subcategory_name}</p>
        {(video.city || video.neighborhood) && (
          <p className="text-[11px] text-muted-foreground/70 truncate">
            {[video.city, video.neighborhood].filter(Boolean).join(" · ")}
          </p>
        )}
        {tags.length > 0 && (
          <p className="text-[11px] text-muted-foreground/70 truncate">
            {tags.join(" · ")}
          </p>
        )}
        {video.name && <p className="text-[11px] text-muted-foreground/70 truncate">{video.name}</p>}
      </div>
    </div>
  );
};

const CountryVideosPanel = ({ withSubcategory = true }: { withSubcategory?: boolean }) => {
  const [videos, setVideos] = useState<CountryVideo[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(async () => {
    setLoading(true);

    // Fetch cities sorted
    const { data: citiesData } = await supabase
      .from("cities")
      .select("name_fr, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (citiesData) {
      setCities(citiesData.map(c => ({ name: c.name_fr, sort_order: c.sort_order ?? 0 })));
    }

    // Paginate to fetch all videos (Supabase limits to 1000 per request)
    const allDocs: any[] = [];
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      let q = supabase
        .from("business_documents")
        .select("id, url, name, thumbnail_url, sort_order, business_id, subcategory_id, service_id, poi_id, linked_business_id, city, neighborhood")
        .eq("type", "video");
      if (withSubcategory) {
        q = q.not("subcategory_id", "is", null);
      } else {
        q = q.is("subcategory_id", null);
      }
      const { data } = await q.order("sort_order", { ascending: true }).range(offset, offset + PAGE - 1);
      if (!data || data.length === 0) break;
      allDocs.push(...data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    const docs = allDocs;

    if (!docs || docs.length === 0) {
      setVideos([]);
      setLoading(false);
      return;
    }

    const allBizIds = new Set<string>();
    docs.forEach(d => {
      allBizIds.add(d.business_id);
      if (d.poi_id) allBizIds.add(d.poi_id);
      if (d.linked_business_id) allBizIds.add(d.linked_business_id);
    });
    const bizIds = [...allBizIds];
    const bizMap = new Map<string, { name: string; city: string | null; neighborhood: string | null }>();
    for (let i = 0; i < bizIds.length; i += 200) {
      const batch = bizIds.slice(i, i + 200);
      const { data } = await supabase.from("businesses").select("id, name, city, neighborhood").in("id", batch);
      if (data) data.forEach(b => bizMap.set(b.id, { name: b.name, city: b.city, neighborhood: b.neighborhood }));
    }

    const scIds = [...new Set(docs.map(d => d.subcategory_id).filter(Boolean))] as string[];
    const scMap = new Map<string, string>();
    if (scIds.length > 0) {
      for (let i = 0; i < scIds.length; i += 200) {
        const batch = scIds.slice(i, i + 200);
        const { data } = await supabase.from("subcategories").select("id, name_fr").in("id", batch);
        if (data) data.forEach(sc => scMap.set(sc.id, sc.name_fr));
      }
    }

    const svcIds = [...new Set(docs.map(d => d.service_id).filter(Boolean))] as string[];
    const svcMap = new Map<string, string>();
    if (svcIds.length > 0) {
      for (let i = 0; i < svcIds.length; i += 200) {
        const batch = svcIds.slice(i, i + 200);
        const { data } = await supabase.from("services").select("id, name_fr").in("id", batch);
        if (data) data.forEach(s => svcMap.set(s.id, s.name_fr));
      }
    }

    setVideos(docs.map(d => {
      const biz = bizMap.get(d.business_id);
      return {
        id: d.id,
        url: d.url,
        name: d.name,
        thumbnail_url: d.thumbnail_url,
        sort_order: d.sort_order,
        business_id: d.business_id,
        business_name: biz?.name || "—",
        subcategory_name: scMap.get(d.subcategory_id!) || "—",
        city: d.city || null,
        neighborhood: d.neighborhood || null,
        service_name: d.service_id ? (svcMap.get(d.service_id) || "—") : null,
        poi_name: d.poi_id ? (bizMap.get(d.poi_id)?.name || "—") : null,
        linked_business_name: d.linked_business_id ? (bizMap.get(d.linked_business_id)?.name || "—") : null,
      };
    }));
    setLoading(false);
  }, [withSubcategory]);

  useEffect(() => { load(); }, [load]);

  // Build city options from videos themselves, sorted by cities table order
  const videoCities = useMemo(() => {
    const citySet = new Set<string>();
    videos.forEach(v => { if (v.city) citySet.add(v.city); });
    const cityOrder = new Map(cities.map(c => [c.name, c.sort_order]));
    return [...citySet].sort((a, b) => (cityOrder.get(a) ?? 9999) - (cityOrder.get(b) ?? 9999));
  }, [videos, cities]);

  const filteredVideos = useMemo(() => {
    if (!selectedCity) return [];
    if (selectedCity === NONE_CITY) {
      return videos.filter(v => !v.city);
    }
    return videos.filter(v => v.city === selectedCity);
  }, [videos, selectedCity]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setVideos(prev => {
      const oldIndex = prev.findIndex(v => v.id === active.id);
      const newIndex = prev.findIndex(v => v.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < videos.length; i++) {
        await supabase
          .from("business_documents")
          .update({ sort_order: i } as any)
          .eq("id", videos[i].id);
      }
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
        <h3 className="text-base font-semibold">{withSubcategory ? "Vidéos avec sous-catégorie" : "Vidéos sans sous-catégorie"} ({videos.length})</h3>
        <Button size="sm" onClick={saveOrder} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Sauvegarder l'ordre
        </Button>
      </div>

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

      {selectedCity && (
        <>
          <p className="text-sm text-muted-foreground">{filteredVideos.length} vidéo{filteredVideos.length !== 1 ? "s" : ""}</p>
          {filteredVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucune vidéo pour cette sélection.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredVideos.map(v => v.id)} strategy={verticalListSortingStrategy}>
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

export default CountryVideosPanel;
