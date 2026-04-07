import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, ExternalLink, MapPin, Link2, Plus, X, GripVertical, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
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
  show_on_front: boolean;
  front_sort_order: number;
}

interface DestinationVideosPanelProps {
  cityName: string;
}

/* ── Tiny sortable card for the right panel ── */
const SortableFrontCard = ({
  video,
  index,
  onRemove,
  onNavigate,
}: {
  video: VideoDoc;
  index: number;
  onRemove: (id: string) => void;
  onNavigate: (businessId: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-md border bg-background p-1.5 text-xs">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="text-muted-foreground w-5 text-center flex-shrink-0 font-mono">{index + 1}</span>
      {video.thumbnail_url ? (
        <img src={video.thumbnail_url} alt="" className="h-8 w-14 rounded object-cover flex-shrink-0" />
      ) : (
        <div className="h-8 w-14 rounded bg-muted flex-shrink-0" />
      )}
      <button
        onClick={() => onNavigate(video.business_id)}
        className="flex items-center gap-1.5 min-w-0 flex-1 hover:text-primary transition-colors text-left"
      >
        {video.business_logo && (
          <img src={video.business_logo} alt="" className="h-4 w-4 rounded object-contain flex-shrink-0" />
        )}
        <span className="truncate">{video.business_name}</span>
      </button>
      <button onClick={() => onRemove(video.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const DestinationVideosPanel = ({ cityName }: DestinationVideosPanelProps) => {
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [frontVideos, setFrontVideos] = useState<VideoDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(async () => {
    setLoading(true);
    const { data: docs, error } = await supabase
      .from("business_documents")
      .select("id, url, name, thumbnail_url, sort_order, business_id, poi_id, linked_business_id, show_on_front, front_sort_order")
      .eq("type", "video")
      .eq("city", cityName)
      .order("sort_order", { ascending: true });

    if (!error && docs && docs.length > 0) {
      const allIds = new Set<string>();
      docs.forEach((d: any) => {
        allIds.add(d.business_id);
        if (d.poi_id) allIds.add(d.poi_id);
        if (d.linked_business_id) allIds.add(d.linked_business_id);
      });
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name, logo_url, slug")
        .in("id", [...allIds]);
      const bMap = new Map((businesses || []).map((b: any) => [b.id, b]));

      const mapped: VideoDoc[] = docs.map((d: any) => {
        const owner = bMap.get(d.business_id);
        const poi = d.poi_id ? bMap.get(d.poi_id) : null;
        const linked = d.linked_business_id ? bMap.get(d.linked_business_id) : null;
        return {
          id: d.id,
          url: d.url,
          name: d.name,
          thumbnail_url: d.thumbnail_url,
          sort_order: d.sort_order,
          business_id: d.business_id,
          business_name: owner?.name || "—",
          business_logo: owner?.logo_url || null,
          poi_name: poi?.name || null,
          linked_business_name: linked?.name || null,
          show_on_front: d.show_on_front ?? false,
          front_sort_order: d.front_sort_order ?? 0,
        };
      });
      setVideos(mapped);
      setFrontVideos(
        mapped
          .filter((v) => v.show_on_front)
          .sort((a, b) => a.front_sort_order - b.front_sort_order)
      );
    } else {
      setVideos([]);
      setFrontVideos([]);
    }
    setLoading(false);
  }, [cityName]);

  useEffect(() => {
    if (cityName) load();
  }, [cityName, load]);

  const frontIds = new Set(frontVideos.map((v) => v.id));

  const addToFront = (video: VideoDoc) => {
    if (frontIds.has(video.id)) return;
    if (frontVideos.length >= 20) {
      toast.error("Maximum 20 vidéos pour le front");
      return;
    }
    setFrontVideos((prev) => [...prev, { ...video, show_on_front: true }]);
  };

  const removeFromFront = (id: string) => {
    setFrontVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFrontVideos((prev) => {
      const oldIndex = prev.findIndex((v) => v.id === active.id);
      const newIndex = prev.findIndex((v) => v.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const saveFrontSelection = async () => {
    setSaving(true);
    try {
      // Reset all videos for this city to show_on_front=false
      const allVideoIds = videos.map((v) => v.id);
      // Batch reset
      const resetPromises = allVideoIds
        .filter((id) => !frontIds.has(id))
        .map((id) =>
          supabase
            .from("business_documents")
            .update({ show_on_front: false, front_sort_order: 0 } as any)
            .eq("id", id)
        );
      // Set selected ones
      const setPromises = frontVideos.map((v, i) =>
        supabase
          .from("business_documents")
          .update({ show_on_front: true, front_sort_order: i } as any)
          .eq("id", v.id)
      );
      await Promise.all([...resetPromises, ...setPromises]);
      toast.success("Sélection sauvegardée");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  };

  const goToEdit = (businessId: string) => navigate(`/staff/catalogue?edit=${businessId}&section=section-videos`);

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
    <div className="flex gap-4">
      {/* ── Left: all videos grid ── */}
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-xs text-muted-foreground mb-3">
          {videos.length} vidéo{videos.length > 1 ? "s" : ""} — cliquez sur <Plus className="inline h-3 w-3" /> pour ajouter au front
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {videos.map((v) => {
            const isOnFront = frontIds.has(v.id);
            return (
              <div key={v.id} className={`rounded-lg border overflow-hidden transition-colors ${isOnFront ? "border-primary/50 bg-primary/5" : "bg-background"}`}>
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
                  {/* Add / already added indicator */}
                  <button
                    onClick={(e) => { e.stopPropagation(); isOnFront ? removeFromFront(v.id) : addToFront(v); }}
                    className={`absolute top-1.5 right-1.5 z-20 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                      isOnFront
                        ? "bg-primary text-primary-foreground"
                        : "bg-black/60 text-white hover:bg-primary hover:text-primary-foreground"
                    }`}
                    title={isOnFront ? "Retirer du front" : "Ajouter au front"}
                  >
                    {isOnFront ? <Monitor className="h-3 w-3" /> : <Plus className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="p-2 space-y-1">
                  {v.name && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{v.name}</p>
                  )}
                  <button
                    onClick={() => goToEdit(v.business_id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors text-left"
                  >
                    {v.business_logo && (
                      <img src={v.business_logo} alt="" className="h-4 w-4 rounded object-contain flex-shrink-0" />
                    )}
                    <span className="line-clamp-1">{v.business_name}</span>
                    <ExternalLink className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground" />
                  </button>

                  {(v.poi_name || v.linked_business_name) && (
                    <div className="flex flex-wrap gap-1">
                      {v.poi_name && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5 font-normal">
                          <MapPin className="h-2.5 w-2.5" />
                          {v.poi_name}
                        </Badge>
                      )}
                      {v.linked_business_name && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5 font-normal">
                          <Link2 className="h-2.5 w-2.5" />
                          {v.linked_business_name}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: front selection panel (sticky) ── */}
      <div className="w-72 flex-shrink-0">
        <div className="sticky top-4 rounded-lg border bg-background">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Front</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {frontVideos.length}/20
              </Badge>
            </div>
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs"
              onClick={saveFrontSelection}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sauvegarder"}
            </Button>
          </div>

          <div className="p-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
            {frontVideos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Cliquez sur <Plus className="inline h-3 w-3" /> sur une vidéo pour l'ajouter ici
              </p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={frontVideos.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {frontVideos.map((v, i) => (
                      <SortableFrontCard
                        key={v.id}
                        video={v}
                        index={i}
                        onRemove={removeFromFront}
                        onNavigate={goToEdit}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationVideosPanel;
