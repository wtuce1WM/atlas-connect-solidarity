import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, Trash2, Upload, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import VideoUploader from "./VideoUploader";
import VideoLightbox from "./VideoLightbox";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface GenericVideo {
  id: string;
  url: string;
  name: string | null;
  thumbnail_url: string | null;
  city: string | null;
  neighborhood: string | null;
  sort_order: number;
  created_at: string;
}

const SortableVideoCard = ({
  video,
  onDelete,
  onPreview,
}: {
  video: GenericVideo;
  onDelete: (id: string) => void;
  onPreview: (url: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: video.id });
  const [copiedId, setCopiedId] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const copyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(video.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  const isStorageVideo = video.url.includes("supabase.co/storage");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border bg-card overflow-hidden transition-shadow hover:shadow-md",
        isDragging && "opacity-50 z-50"
      )}
    >
      {/* Video preview */}
      <button
        className="relative w-full bg-black cursor-pointer"
        style={{ aspectRatio: "16/9" }}
        onClick={() => onPreview(video.url)}
      >
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : isStorageVideo ? (
          <video
            src={video.url}
            className="w-full h-full object-contain"
            muted
            preload="metadata"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Play className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center">
            <Play className="h-5 w-5 text-primary-foreground fill-primary-foreground ml-0.5" />
          </div>
        </div>
      </button>

      {/* Info */}
      <div className="p-2 space-y-1">
        {video.name && (
          <p className="text-xs font-medium truncate">{video.name}</p>
        )}

        {/* ID copiable */}
        <button
          onClick={copyId}
          className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono hover:text-foreground transition-colors"
        >
          {copiedId ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          <span className="truncate max-w-[180px]">{video.id}</span>
        </button>

        <div className="flex flex-wrap gap-1">
          {video.city && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{video.city}</Badge>}
          {video.neighborhood && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{video.neighborhood}</Badge>}
        </div>
      </div>

      {/* Drag handle (whole card) */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded bg-background/80 border border-border/50 text-[10px] text-muted-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ⠿
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(video.id);
        }}
        className="absolute top-2 right-2 z-10 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const GenericVideosPanel = () => {
  const [videos, setVideos] = useState<GenericVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadVideos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("generic_videos")
      .select("*")
      .order("sort_order", { ascending: true });
    setVideos((data as GenericVideo[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleCreate = useCallback(async () => {
    if (!uploadedUrl) return;
    setCreating(true);
    const nextOrder = videos.length > 0 ? Math.max(...videos.map(v => v.sort_order)) + 1 : 0;
    const { error } = await supabase
      .from("generic_videos")
      .insert({ url: uploadedUrl, sort_order: nextOrder });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Vidéo générique ajoutée");
      setUploadedUrl("");
      await loadVideos();
    }
    setCreating(false);
  }, [uploadedUrl, videos, loadVideos]);

  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from("generic_videos").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      setVideos(prev => prev.filter(v => v.id !== id));
      toast.success("Vidéo supprimée");
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = videos.findIndex(v => v.id === active.id);
    const newIndex = videos.findIndex(v => v.id === over.id);
    const reordered = arrayMove(videos, oldIndex, newIndex);
    setVideos(reordered);

    // Persist new order
    await Promise.all(
      reordered.map((v, i) =>
        supabase.from("generic_videos").update({ sort_order: i }).eq("id", v.id)
      )
    );
  }, [videos]);

  return (
    <div className="space-y-6 pt-4">
      {/* Upload zone */}
      <div className="max-w-2xl space-y-3">
        <VideoUploader
          videoUrl={uploadedUrl}
          onChange={setUploadedUrl}
          businessId="generic"
        />
        {uploadedUrl && (
          <Button onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <Upload className="h-4 w-4 mr-2" />
            Ajouter comme vidéo générique
          </Button>
        )}
      </div>

      {/* Videos grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : videos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucune vidéo générique</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {videos.length} vidéo{videos.length > 1 ? "s" : ""} • Glissez-déposez pour réorganiser
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={videos.map(v => v.id)} strategy={rectSortingStrategy}>
              <div className="flex flex-wrap gap-4">
                {videos.map(video => (
                  <div key={video.id} style={{ width: 280 }}>
                    <SortableVideoCard
                      video={video}
                      onDelete={handleDelete}
                      onPreview={setLightboxUrl}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {lightboxUrl && (
        <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
};

export default GenericVideosPanel;
