import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, GripVertical } from "lucide-react";
import VideoLightbox from "./VideoLightbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
}

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

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-lg border bg-background p-2">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </div>
      <span className="text-xs text-muted-foreground font-mono w-5 text-right">{index + 1}</span>
      <button
        className="relative bg-black rounded overflow-hidden group flex-shrink-0"
        style={{ width: 160, height: 90 }}
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
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{video.business_name}</p>
        <p className="text-xs text-muted-foreground truncate">{video.subcategory_name}</p>
        {(video.city || video.neighborhood) && (
          <p className="text-[11px] text-muted-foreground/70 truncate">
            {[video.city, video.neighborhood].filter(Boolean).join(" · ")}
          </p>
        )}
        {video.name && <p className="text-[11px] text-muted-foreground/70 truncate">{video.name}</p>}
      </div>
    </div>
  );
};

const CountryVideosPanel = () => {
  const [videos, setVideos] = useState<CountryVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(async () => {
    setLoading(true);

    // Fetch videos with subcategory but no city
    const { data: docs } = await supabase
      .from("business_documents")
      .select("id, url, name, thumbnail_url, sort_order, business_id, subcategory_id")
      .eq("type", "video")
      .not("subcategory_id", "is", null)
      .or("city.is.null,city.eq.")
      .order("sort_order", { ascending: true });

    if (!docs || docs.length === 0) {
      setVideos([]);
      setLoading(false);
      return;
    }

    // Fetch business names
    const bizIds = [...new Set(docs.map(d => d.business_id))];
    const bizMap = new Map<string, { name: string; city: string | null; neighborhood: string | null }>();
    for (let i = 0; i < bizIds.length; i += 200) {
      const batch = bizIds.slice(i, i + 200);
      const { data } = await supabase.from("businesses").select("id, name, city, neighborhood").in("id", batch);
      if (data) data.forEach(b => bizMap.set(b.id, { name: b.name, city: b.city, neighborhood: b.neighborhood }));
    }

    // Fetch subcategory names
    const scIds = [...new Set(docs.map(d => d.subcategory_id).filter(Boolean))] as string[];
    const scMap = new Map<string, string>();
    if (scIds.length > 0) {
      for (let i = 0; i < scIds.length; i += 200) {
        const batch = scIds.slice(i, i + 200);
        const { data } = await supabase.from("subcategories").select("id, name_fr").in("id", batch);
        if (data) data.forEach(sc => scMap.set(sc.id, sc.name_fr));
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
        city: biz?.city || null,
        neighborhood: biz?.neighborhood || null,
      };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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
        <h3 className="text-base font-semibold">Pays — Vidéos liées à une sous-catégorie ({videos.length})</h3>
        <Button size="sm" onClick={saveOrder} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Sauvegarder l'ordre
        </Button>
      </div>

      {videos.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Aucune vidéo liée à une sous-catégorie sans ville.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={videos.map(v => v.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {videos.map((v, i) => (
                <SortableVideoCard key={v.id} video={v} index={i} onPlay={setLightboxUrl} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {lightboxUrl && <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
};

export default CountryVideosPanel;
