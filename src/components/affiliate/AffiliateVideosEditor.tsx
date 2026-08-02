import { useEffect, useState, forwardRef, useImperativeHandle, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Loader2,
  GripVertical,
  Video as VideoIcon,
  Save,
  X,
  Upload,
  Plus,
  Trash2,
} from "lucide-react";
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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  businessId: string;
}

export interface AffiliateVideosEditorHandle {
  save: () => Promise<void>;
}

interface VideoEntry {
  _uid: string; // stable local id
  id: string | null; // db id if existing
  url: string;
  name: string;
  description: string;
  popup: boolean;
  thumbnail_url: string | null;
}

const MAX_VIDEOS = 12;
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_DESC = 2000;

const uid = () => Math.random().toString(36).slice(2, 10);

const renderPreview = (url: string) => {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  if (yt)
    return (
      <iframe
        src={`https://www.youtube.com/embed/${yt[1]}`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm)
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vm[1]}`}
        className="w-full h-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  return <video src={url} controls className="w-full h-full object-contain" playsInline />;
};

interface SortableVideoProps {
  entry: VideoEntry;
  index: number;
  onChange: (patch: Partial<VideoEntry>) => void;
  onDelete: () => void;
  onPopupToggle: () => void;
  onUploadVideo: (file: File) => void;
  uploading: boolean;
}

const SortableVideo = ({
  entry,
  index,
  onChange,
  onDelete,
  onPopupToggle,
  onUploadVideo,
  uploading,
}: SortableVideoProps) => {
  const [showTxt, setShowTxt] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry._uid,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "space-y-1 p-1.5 border rounded-md bg-background relative",
        entry.popup && "ring-2 ring-primary"
      )}
    >
      {/* Header: drag + index + TXT + popup + delete */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Réorganiser"
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <span className="text-[9px] text-muted-foreground shrink-0">{index + 1}</span>
        <Button
          type="button"
          variant={entry.description ? "default" : "outline"}
          size="sm"
          className="h-5 px-1.5 text-[9px] shrink-0"
          title="Description popup"
          onClick={() => setShowTxt((v) => !v)}
        >
          TXT
        </Button>
        <label className="flex items-center gap-1 shrink-0 cursor-pointer" title="Ouvrir en popup">
          <Checkbox
            checked={entry.popup}
            onCheckedChange={onPopupToggle}
            className="h-3.5 w-3.5"
          />
          <span className="text-[9px] text-muted-foreground">popup</span>
        </label>
        <div className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 text-destructive hover:text-destructive shrink-0"
          title="Supprimer"
          onClick={onDelete}
        >
          <Trash2 className="h-2.5 w-2.5" />
        </Button>
      </div>

      {/* Title */}
      <Input
        value={entry.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Titre"
        className="h-6 text-[10px]"
      />

      {/* TXT description */}
      {showTxt && (
        <div className="space-y-0.5">
          <Textarea
            value={entry.description}
            onChange={(e) => onChange({ description: e.target.value.slice(0, MAX_DESC) })}
            placeholder="Description popup (max 2000)"
            rows={4}
            maxLength={MAX_DESC}
            className="text-[10px] min-h-[80px] resize-y"
          />
          <p className="text-[9px] text-muted-foreground text-right">
            {entry.description.length}/{MAX_DESC}
          </p>
        </div>
      )}

      {/* Preview or URL/upload */}
      {entry.url ? (
        <div className="relative aspect-square w-full rounded overflow-hidden border bg-black">
          {renderPreview(entry.url)}
          <button
            type="button"
            onClick={() => onChange({ url: "", thumbnail_url: null })}
            className="absolute top-0.5 right-0.5 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-80 hover:opacity-100 transition-opacity"
            title="Retirer la vidéo"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          <Input
            value={entry.url}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="URL vidéo (YouTube, Vimeo, MP4…)"
            className="h-5 text-[10px]"
          />
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            id={`aff-vid-${entry._uid}`}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadVideo(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 text-[10px] gap-1 w-full"
            disabled={uploading}
            onClick={() => document.getElementById(`aff-vid-${entry._uid}`)?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Upload className="h-3 w-3" /> Uploader (max 100MB)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

const AffiliateVideosEditor = forwardRef<AffiliateVideosEditorHandle, Props>(
  ({ businessId }, ref) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingUid, setUploadingUid] = useState<string | null>(null);
    const [videos, setVideos] = useState<VideoEntry[]>([]);
    const [initialIds, setInitialIds] = useState<string[]>([]);
    const [dirty, setDirty] = useState(false);

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
      const load = async () => {
        setLoading(true);
        const { data } = await supabase
          .from("business_documents")
          .select("id, url, name, description, popup, thumbnail_url, sort_order")
          .eq("business_id", businessId)
          .eq("type", "video")
          .order("sort_order");
        const entries: VideoEntry[] = ((data as any[]) || []).map((d) => ({
          _uid: uid(),
          id: d.id,
          url: d.url || "",
          name: d.name || "",
          description: d.description || "",
          popup: !!d.popup,
          thumbnail_url: d.thumbnail_url || null,
        }));
        setVideos(entries);
        setInitialIds(entries.map((e) => e.id!).filter(Boolean));
        setDirty(false);
        setLoading(false);
      };
      load();
    }, [businessId]);

    const markDirty = () => setDirty(true);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setVideos((prev) => {
        const oldI = prev.findIndex((v) => v._uid === active.id);
        const newI = prev.findIndex((v) => v._uid === over.id);
        if (oldI < 0 || newI < 0) return prev;
        return arrayMove(prev, oldI, newI);
      });
      markDirty();
    }, []);

    const patchVideo = (uidVal: string, patch: Partial<VideoEntry>) => {
      setVideos((prev) => prev.map((v) => (v._uid === uidVal ? { ...v, ...patch } : v)));
      markDirty();
    };

    const togglePopup = (uidVal: string) => {
      setVideos((prev) =>
        prev.map((v) => ({ ...v, popup: v._uid === uidVal ? !v.popup : false }))
      );
      markDirty();
    };

    const deleteVideo = (uidVal: string) => {
      setVideos((prev) => prev.filter((v) => v._uid !== uidVal));
      markDirty();
    };

    const addVideo = () => {
      if (videos.length >= MAX_VIDEOS) {
        toast({ variant: "destructive", title: `Maximum ${MAX_VIDEOS} vidéos.` });
        return;
      }
      setVideos((prev) => [
        ...prev,
        {
          _uid: uid(),
          id: null,
          url: "",
          name: "",
          description: "",
          popup: false,
          thumbnail_url: null,
        },
      ]);
      markDirty();
    };

    const uploadVideo = async (uidVal: string, file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        toast({ variant: "destructive", title: "Trop volumineux", description: "Max 100MB." });
        return;
      }
      setUploadingUid(uidVal);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
        const fileName = `${businessId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const path = `businesses/${fileName}`;
        const { error } = await supabase.storage
          .from("business-videos")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) {
          toast({ variant: "destructive", title: "Erreur upload", description: error.message });
          return;
        }
        const { data: urlData } = supabase.storage.from("business-videos").getPublicUrl(path);
        if (urlData?.publicUrl) {
          patchVideo(uidVal, { url: urlData.publicUrl });
          toast({ title: "Vidéo uploadée ✓" });
        }
      } finally {
        setUploadingUid(null);
      }
    };

    const handleFilesDrop = useCallback(
      async (files: FileList | null) => {
        if (!files || !files.length) return;
        const remaining = MAX_VIDEOS - videos.length;
        if (remaining <= 0) {
          toast({ variant: "destructive", title: `Maximum ${MAX_VIDEOS} vidéos.` });
          return;
        }
        const filesToUpload = Array.from(files).slice(0, remaining);
        for (const file of filesToUpload) {
          if (!file.type.startsWith("video/")) {
            toast({ variant: "destructive", title: "Type invalide", description: file.name });
            continue;
          }
          if (file.size > MAX_FILE_SIZE) {
            toast({ variant: "destructive", title: "Trop volumineux", description: `${file.name} > 100MB` });
            continue;
          }
          const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
          const fileName = `${businessId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const path = `businesses/${fileName}`;
          const { error } = await supabase.storage
            .from("business-videos")
            .upload(path, file, { cacheControl: "3600", upsert: false });
          if (error) {
            toast({ variant: "destructive", title: "Erreur upload", description: error.message });
            continue;
          }
          const { data: urlData } = supabase.storage.from("business-videos").getPublicUrl(path);
          if (urlData?.publicUrl) {
            setVideos((prev) => [
              ...prev,
              {
                _uid: uid(),
                id: null,
                url: urlData.publicUrl,
                name: "",
                description: "",
                popup: false,
                thumbnail_url: null,
              },
            ]);
            markDirty();
          }
        }
      },
      [videos.length, businessId, toast]
    );

    const handleDrop = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        handleFilesDrop(e.dataTransfer.files);
      },
      [handleFilesDrop]
    );

    const handleSave = async () => {
      // Never save before the initial load finished: it would delete every
      // existing video document (empty local list vs. DB rows).
      if (loading) {
        toast({
          variant: "destructive",
          title: "Chargement en cours",
          description: "Les vidéos ne sont pas encore chargées. Patientez avant d'enregistrer.",
        });
        return;
      }
      setSaving(true);
      try {
        // Delete removed
        const currentIds = new Set(videos.map((v) => v.id).filter(Boolean) as string[]);
        const toDelete = initialIds.filter((id) => !currentIds.has(id));
        if (toDelete.length > 0) {
          const { error } = await supabase
            .from("business_documents")
            .delete()
            .in("id", toDelete);
          if (error) throw error;
        }

        // Update existing + insert new
        for (let i = 0; i < videos.length; i++) {
          const v = videos[i];
          const payload: any = {
            business_id: businessId,
            type: "video",
            url: v.url,
            name: v.name || null,
            description: v.description || null,
            popup: v.popup,
            thumbnail_url: v.thumbnail_url,
            sort_order: i,
          };
          if (v.id) {
            const { error } = await supabase
              .from("business_documents")
              .update(payload)
              .eq("id", v.id);
            if (error) throw error;
          } else {
            const { data, error } = await supabase
              .from("business_documents")
              .insert(payload)
              .select("id")
              .maybeSingle();
            if (error) throw error;
            if (data?.id) v.id = data.id;
          }
        }

        setInitialIds(videos.map((v) => v.id!).filter(Boolean));
        setDirty(false);
        toast({ title: "Vidéos enregistrées ✓" });
      } catch (e: any) {
        toast({ variant: "destructive", title: "Erreur", description: e.message });
      } finally {
        setSaving(false);
      }
    };

    useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave]);

    const items = useMemo(() => videos.map((v) => v._uid), [videos]);

    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">
            {videos.length} vidéo{videos.length > 1 ? "s" : ""} · Glissez pour réordonner.
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={addVideo} disabled={videos.length >= MAX_VIDEOS}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
            <Button size="sm" disabled={!dirty || saving} onClick={handleSave}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Enregistrer les vidéos
            </Button>
          </div>
        </div>

        {videos.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {videos.map((v, i) => (
                  <SortableVideo
                    key={v._uid}
                    entry={v}
                    index={i}
                    uploading={uploadingUid === v._uid}
                    onChange={(patch) => patchVideo(v._uid, patch)}
                    onDelete={() => deleteVideo(v._uid)}
                    onPopupToggle={() => togglePopup(v._uid)}
                    onUploadVideo={(file) => uploadVideo(v._uid, file)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Upload zone */}
        {videos.length < MAX_VIDEOS ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer hover:border-primary/50"
            )}
          >
            <input
              type="file"
              id={`affiliate-video-upload-${businessId}`}
              multiple
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => {
                handleFilesDrop(e.target.files);
                e.target.value = "";
              }}
              className="hidden"
            />
            <label htmlFor={`affiliate-video-upload-${businessId}`} className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-primary/10 rounded-full">
                  <VideoIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Cliquez ou glissez-déposez</p>
                  <p className="text-sm text-muted-foreground">
                    {videos.length}/{MAX_VIDEOS} vidéos • Max 100MB par vidéo (MP4, WebM, MOV)
                  </p>
                </div>
              </div>
            </label>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            Nombre maximum de vidéos atteint ({MAX_VIDEOS})
          </p>
        )}
      </div>
    );
  }
);

AffiliateVideosEditor.displayName = "AffiliateVideosEditor";

export default AffiliateVideosEditor;
