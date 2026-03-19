import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, X, Image as ImageIcon, Video, Upload, Plus, Globe, GripVertical } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface WebOnlyEditorProps {
  businessId: string;
}

const BUCKET = "web-only-media";
const MAX_IMAGES = 5;
const MAX_VIDEOS = 5;
const MAX_DESC_LENGTH = 1500;

const getPublicUrl = (path: string) =>
  supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

/* ── Helpers for video thumbnails ── */
const getYouTubeId = (url: string) => {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
};

const isDirectVideo = (url: string) =>
  /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);

/* ── Sortable image item ── */
const SortableImage = ({ id, url, index, onRemove }: { id: string; url: string; index: number; onRemove: (i: number) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group w-24 h-24 rounded-lg overflow-hidden border bg-background">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 h-5 w-5 rounded bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab z-10"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <img src={url} alt="" className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

/* ── Sortable video item with preview ── */
const SortableVideo = ({ id, url, index, onRemove }: { id: string; url: string; index: number; onRemove: (i: number) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const ytId = getYouTubeId(url);
  const direct = isDirectVideo(url);

  return (
    <div ref={setNodeRef} style={style} className="flex gap-3 bg-background rounded-lg border p-2 items-start group">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-1 shrink-0 cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Preview */}
      <div className="shrink-0 w-32 h-20 rounded overflow-hidden bg-muted flex items-center justify-center">
        {ytId ? (
          <img
            src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
            alt="YouTube thumbnail"
            className="w-full h-full object-cover"
          />
        ) : direct ? (
          <video src={url} muted className="w-full h-full object-cover" preload="metadata" />
        ) : (
          <Video className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-xs truncate block">{url.length > 80 ? url.slice(0, 80) + "…" : url}</span>
        {ytId && <span className="text-[10px] text-muted-foreground">YouTube</span>}
        {direct && <span className="text-[10px] text-muted-foreground">Vidéo directe</span>}
      </div>

      <button
        type="button"
        onClick={() => onRemove(index)}
        className="h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

/* ── Main component ── */
const WebOnlyEditor = ({ businessId }: WebOnlyEditorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [recordId, setRecordId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Load existing data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("business_web_only" as any)
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle();

      if (data) {
        setRecordId((data as any).id);
        setDescription((data as any).description || "");
        setImages((data as any).images || []);
        setVideos((data as any).videos || []);
      } else {
        setRecordId(null);
        setDescription("");
        setImages([]);
        setVideos([]);
      }
      setLoading(false);
    };
    load();
  }, [businessId]);

  // Save
  const save = useCallback(async (desc: string, imgs: string[], vids: string[]) => {
    setSaving(true);
    const payload = {
      business_id: businessId,
      description: desc,
      images: imgs,
      videos: vids,
      updated_at: new Date().toISOString(),
    };

    if (recordId) {
      await supabase
        .from("business_web_only" as any)
        .update(payload as any)
        .eq("id", recordId);
    } else {
      const { data } = await supabase
        .from("business_web_only" as any)
        .insert(payload as any)
        .select("id")
        .single();
      if (data) setRecordId((data as any).id);
    }
    setSaving(false);
  }, [businessId, recordId]);

  const handleDescriptionChange = useCallback((html: string) => {
    setDescription(html);
    save(html, images, videos);
  }, [images, videos, save]);

  /* ── Image handlers ── */
  const handleImageUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (images.length >= MAX_IMAGES) {
      toast({ variant: "destructive", title: "Maximum atteint", description: `${MAX_IMAGES} images maximum.` });
      return;
    }
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Type invalide", description: "Seules les images sont acceptées." });
      return;
    }
    setUploadingImage(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${businessId}/images/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file);
    if (error) {
      toast({ variant: "destructive", title: "Erreur upload", description: error.message });
      setUploadingImage(false);
      return;
    }
    const url = getPublicUrl(path);
    const next = [...images, url];
    setImages(next);
    await save(description, next, videos);
    setUploadingImage(false);
  }, [businessId, images, description, videos, save, toast]);

  const removeImage = useCallback(async (index: number) => {
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    await save(description, next, videos);
  }, [images, description, videos, save]);

  const handleImageDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((_, i) => `img-${i}` === active.id);
    const newIndex = images.findIndex((_, i) => `img-${i}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(images, oldIndex, newIndex);
    setImages(next);
    save(description, next, videos);
  }, [images, description, videos, save]);

  /* ── Video handlers ── */
  const handleVideoUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (videos.length >= MAX_VIDEOS) {
      toast({ variant: "destructive", title: "Maximum atteint", description: `${MAX_VIDEOS} vidéos maximum.` });
      return;
    }
    const file = files[0];
    if (!file.type.startsWith("video/")) {
      toast({ variant: "destructive", title: "Type invalide", description: "Seuls les fichiers vidéo sont acceptés." });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Fichier trop volumineux", description: "100 MB maximum." });
      return;
    }
    setUploadingVideo(true);
    const ext = file.name.split(".").pop() || "mp4";
    const path = `${businessId}/videos/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file);
    if (error) {
      toast({ variant: "destructive", title: "Erreur upload", description: error.message });
      setUploadingVideo(false);
      return;
    }
    const url = getPublicUrl(path);
    const next = [...videos, url];
    setVideos(next);
    await save(description, images, next);
    setUploadingVideo(false);
  }, [businessId, videos, description, images, save, toast]);

  const addVideoUrl = useCallback(async () => {
    const url = videoUrlInput.trim();
    if (!url) return;
    if (videos.length >= MAX_VIDEOS) {
      toast({ variant: "destructive", title: "Maximum atteint", description: `${MAX_VIDEOS} vidéos maximum.` });
      return;
    }
    const next = [...videos, url];
    setVideos(next);
    setVideoUrlInput("");
    await save(description, images, next);
  }, [videoUrlInput, videos, description, images, save, toast]);

  const removeVideo = useCallback(async (index: number) => {
    const next = videos.filter((_, i) => i !== index);
    setVideos(next);
    await save(description, images, next);
  }, [videos, description, images, save]);

  const handleVideoDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = videos.findIndex((_, i) => `vid-${i}` === active.id);
    const newIndex = videos.findIndex((_, i) => `vid-${i}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(videos, oldIndex, newIndex);
    setVideos(next);
    save(description, images, next);
  }, [videos, description, images, save]);

  const plainTextLength = description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").length;

  if (loading) {
    return (
      <div className="p-4 border border-purple-300 bg-purple-50 rounded-lg flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Chargement section Web Only…</span>
      </div>
    );
  }

  return (
    <div className="p-4 border-2 border-purple-400 bg-purple-50 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xl font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5 text-purple-600" />
          Web Only
        </Label>
        {saving && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Sauvegarde…</span>}
      </div>

      {/* Rich text description */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Description Web Only</Label>
        <RichTextEditor
          content={description}
          onChange={handleDescriptionChange}
          placeholder="Décrivez l'offre web only…"
          maxHeight="200px"
        />
        <p className={`text-xs text-right ${plainTextLength > MAX_DESC_LENGTH * 0.9 ? "text-destructive" : "text-muted-foreground"}`}>
          {plainTextLength} / {MAX_DESC_LENGTH}
        </p>
      </div>

      {/* Images – sortable */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Images ({images.length}/{MAX_IMAGES}) — glisser pour réordonner</Label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
          <SortableContext items={images.map((_, i) => `img-${i}`)} strategy={horizontalListSortingStrategy}>
            <div className="flex flex-wrap gap-2">
              {images.map((url, i) => (
                <SortableImage key={`img-${i}`} id={`img-${i}`} url={url} index={i} onRemove={removeImage} />
              ))}
              {images.length < MAX_IMAGES && (
                <label className="w-24 h-24 rounded-lg border-2 border-dashed border-purple-300 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-100 transition-colors">
                  {uploadingImage ? (
                    <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5 text-purple-400" />
                      <span className="text-[10px] text-purple-500 mt-1">Ajouter</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                    disabled={uploadingImage}
                  />
                </label>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Videos – sortable with preview */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Vidéos ({videos.length}/{MAX_VIDEOS}) — glisser pour réordonner</Label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleVideoDragEnd}>
          <SortableContext items={videos.map((_, i) => `vid-${i}`)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {videos.map((url, i) => (
                <SortableVideo key={`vid-${i}`} id={`vid-${i}`} url={url} index={i} onRemove={removeVideo} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {videos.length < MAX_VIDEOS && (
          <div className="flex gap-2">
            <Input
              placeholder="https://youtube.com/watch?v=... ou URL vidéo"
              value={videoUrlInput}
              onChange={(e) => setVideoUrlInput(e.target.value)}
              className="flex-1 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVideoUrl(); } }}
            />
            <Button type="button" size="sm" variant="outline" onClick={addVideoUrl} disabled={!videoUrlInput.trim()}>
              <Plus className="h-4 w-4 mr-1" />URL
            </Button>
            <label>
              <Button type="button" size="sm" variant="outline" asChild className="cursor-pointer">
                <span>
                  {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-1" />Fichier</>}
                </span>
              </Button>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => handleVideoUpload(e.target.files)}
                disabled={uploadingVideo}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebOnlyEditor;
