import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Save, ArrowLeft, X, Link, GripVertical, MapPinned, Search, Star, Copy, Check, Video as VideoIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import RichTextEditor from "./RichTextEditor";
import ImageUploader from "./ImageUploader";
import VideoUploader from "./VideoUploader";
import LogoUploader from "./LogoUploader";
import TimeSelect from "./TimeSelect";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DAYS_OF_WEEK = [
  { value: "monday", label: "Lundi" },
  { value: "tuesday", label: "Mardi" },
  { value: "wednesday", label: "Mercredi" },
  { value: "thursday", label: "Jeudi" },
  { value: "friday", label: "Vendredi" },
  { value: "saturday", label: "Samedi" },
  { value: "sunday", label: "Dimanche" },
];

const EMPTY_FORM = {
  name: "",
  hook: "",
  description: "",
  start_date: "",
  end_date: "",
  images: [] as string[],
  videos: [] as string[],
  kp_regroupement: [] as string[],
  logo_url: "",
  type: "",
  city_id: "",
  neighborhood_id: "",
  recurrence: "",
  days_of_week: [] as string[],
  start_time: "",
  end_time: "",
  google_maps_url: "",
  latitude: "" as string | number,
  longitude: "" as string | number,
  url: "",
  url_cta: "",
  url_force_external: false,
  default_business_id: "",
};

type EventVideoDoc = {
  id: string;
  url: string;
  event_id: string | null;
  thumbnail_url: string | null;
  thumbnail_locked: boolean | null;
};

const generateVideoThumbnail = (videoUrl: string): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";
    video.playsInline = true;
    video.src = videoUrl;

    const timeout = window.setTimeout(() => {
      video.remove();
      resolve(null);
    }, 12000);

    const finish = (blob: Blob | null) => {
      window.clearTimeout(timeout);
      video.remove();
      resolve(blob);
    };

    const capture = () => {
      try {
        const thumbW = 1280;
        const thumbH = 720;
        const naturalW = video.videoWidth || thumbW;
        const naturalH = video.videoHeight || thumbH;
        const scale = Math.min(thumbW / naturalW, thumbH / naturalH, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(naturalW * scale);
        canvas.height = Math.round(naturalH * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => finish(blob), "image/jpeg", 0.75);
      } catch {
        finish(null);
      }
    };

    video.addEventListener("loadeddata", () => {
      const targetTime = Number.isFinite(video.duration) ? Math.min(3, Math.max(0, video.duration * 0.2)) : 0;
      if (targetTime > 0) video.currentTime = targetTime;
      else capture();
    }, { once: true });
    video.addEventListener("seeked", capture, { once: true });
    video.addEventListener("error", () => finish(null), { once: true });
  });
};

const createVideoSnapshot = async (docId: string, videoUrl: string) => {
  const blob = await generateVideoThumbnail(videoUrl);
  if (!blob) return null;

  const thumbName = `thumbs/event-business_documents-${docId}-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("business-images")
    .upload(thumbName, blob, { cacheControl: "31536000", upsert: true, contentType: "image/jpeg" });
  if (uploadError) return null;

  const { data: urlData } = supabase.storage.from("business-images").getPublicUrl(thumbName);
  const publicUrl = urlData?.publicUrl || null;
  if (!publicUrl) return null;

  await supabase
    .from("business_documents")
    .update({ thumbnail_url: publicUrl })
    .eq("id", docId)
    .eq("thumbnail_locked", false);

  return publicUrl;
};

const ensureEventVideoDocument = async ({
  url,
  eventId,
  ownerBusinessId,
  eventName,
}: {
  url: string;
  eventId: string;
  ownerBusinessId: string | null;
  eventName: string;
}) => {
  const { data: existingDocs } = await supabase
    .from("business_documents")
    .select("id, url, event_id, thumbnail_url, thumbnail_locked")
    .eq("url", url)
    .eq("type", "video");

  const rows = ((existingDocs as EventVideoDoc[] | null) || []);
  let doc = rows.find(row => row.event_id === eventId) || rows[0] || null;

  if (doc) {
    const updatePayload: Record<string, any> = { event_id: eventId, name: eventName.trim() || null };
    // Only overwrite business_id when we actually have one — keep existing link otherwise.
    if (ownerBusinessId) updatePayload.business_id = ownerBusinessId;
    const { data: updated } = await supabase
      .from("business_documents")
      .update(updatePayload)
      .eq("id", doc.id)
      .select("id, url, event_id, thumbnail_url, thumbnail_locked")
      .single();
    doc = (updated as EventVideoDoc | null) || doc;
  } else {
    const { data: inserted } = await supabase
      .from("business_documents")
      .insert({
        business_id: ownerBusinessId, // nullable: standalone event videos are allowed
        type: "video",
        url,
        name: eventName.trim() || null,
        event_id: eventId,
        show_on_front: false,
      })
      .select("id, url, event_id, thumbnail_url, thumbnail_locked")
      .single();
    doc = inserted as EventVideoDoc | null;
  }

  if (doc && !doc.thumbnail_url && !doc.thumbnail_locked) {
    const thumbnailUrl = await createVideoSnapshot(doc.id, url);
    if (thumbnailUrl) doc = { ...doc, thumbnail_url: thumbnailUrl };
  }

  return doc;
};

/* ── Sortable video item ── */
const SortableVideoItem = ({ id, url, index, setForm, toast, eventId, ownerBusinessId, eventName }: { id: string; url: string; index: number; setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>; toast: any; eventId: string | null; ownerBusinessId: string | null; eventName: string }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const [videoDocId, setVideoDocId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setVideoDocId(null);
      return;
    }
    (async () => {
      if (eventId) {
        const doc = await ensureEventVideoDocument({
          url,
          eventId,
          ownerBusinessId, // may be null — events can be standalone
          eventName,
        });
        if (!cancelled && doc?.id) {
          setVideoDocId(doc.id);
          return;
        }
      }

      // Fallback : look up an existing business_documents row by URL.
      // Useful when the event has no linked business yet (no ownerBusinessId),
      // so we can still show whatever ID is already attached to that video URL.
      const { data } = await supabase
        .from("business_documents")
        .select("id, event_id")
        .eq("url", url)
        .eq("type", "video");
      if (cancelled) return;
      const rows = (data as any[]) || [];
      const preferred = rows.find(r => r.event_id === eventId) || rows[0];
      setVideoDocId(preferred?.id || null);
    })();
    return () => { cancelled = true; };
  }, [url, eventId, ownerBusinessId, eventName]);

  const handleCopy = async () => {
    if (!videoDocId) return;
    try {
      await navigator.clipboard.writeText(videoDocId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast({ title: "ID copié ✓", description: videoDocId });
    } catch {
      toast({ variant: "destructive", title: "Copie impossible" });
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-1 w-64 shrink-0">
      <div className="flex items-center gap-2">
        <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <VideoUploader
            compact
            videoUrl={url}
            onChange={newUrl => setForm(p => ({ ...p, videos: p.videos.map((v, vi) => vi === index ? newUrl : v) }))}
          />
        </div>
        <Button type="button" size="icon" variant="ghost" onClick={() => setForm(p => ({ ...p, videos: p.videos.filter((_, vi) => vi !== index) }))}>
          <X className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      {url && (
        <div className="flex items-center gap-1 ml-8 group">
          <span className="text-[10px] text-muted-foreground shrink-0">ID :</span>
          {videoDocId ? (
            <>
              <code className="text-[10px] font-mono text-muted-foreground truncate flex-1" title={videoDocId}>{videoDocId}</code>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-5 w-5 shrink-0"
                onClick={handleCopy}
                title="Copier l'ID"
              >
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </>
          ) : (
            <span className="text-[10px] italic text-muted-foreground/70 truncate flex-1" title="Enregistrez l'événement pour générer l'ID">
              non généré — enregistrez l'événement
            </span>
          )}
        </div>
      )}
      {!url && (
        <div className="flex items-center gap-1 ml-8">
          <Link className="h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Coller l'ID vidéo (business_documents)"
            className="h-6 text-xs font-mono"
            onPaste={async (e) => {
              const pastedId = e.clipboardData.getData("text").trim();
              if (!pastedId || pastedId.length < 30) return;
              e.preventDefault();
              const { data } = await supabase.from("business_documents").select("url").eq("id", pastedId).eq("type", "video").maybeSingle();
              if ((data as any)?.url) {
                setForm(p => ({ ...p, videos: p.videos.map((v, vi) => vi === index ? (data as any).url : v) }));
                toast({ title: "Vidéo liée ✓", description: `URL récupérée depuis l'ID ${pastedId.substring(0, 8)}…` });
              } else {
                toast({ variant: "destructive", title: "ID introuvable", description: "Aucune vidéo trouvée avec cet identifiant." });
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

/* ── Add a video by pasting a business_documents video ID ── */
const AddVideoByIdInput = ({ form, setForm, toast }: { form: typeof EMPTY_FORM; setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>; toast: any }) => {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const resolveAndAdd = async (rawId: string) => {
    const id = rawId.trim();
    if (!id || id.length < 30) {
      toast({ variant: "destructive", title: "ID invalide", description: "Collez un ID de vidéo (UUID)." });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("business_documents")
        .select("url, type")
        .eq("id", id)
        .maybeSingle();
      if (error || !data || (data as any).type !== "video" || !(data as any).url) {
        toast({ variant: "destructive", title: "ID introuvable", description: "Aucune vidéo trouvée avec cet identifiant." });
        return;
      }
      const url = (data as any).url as string;
      if (form.videos.includes(url)) {
        toast({ variant: "destructive", title: "Déjà ajoutée", description: "Cette vidéo est déjà liée à l'événement." });
        return;
      }
      setForm(p => ({ ...p, videos: [...p.videos, url] }));
      setValue("");
      toast({ title: "Vidéo ajoutée ✓", description: `Liée via l'ID ${id.substring(0, 8)}…` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Link className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        placeholder="Ajouter une vidéo via son ID (business_documents)"
        value={value}
        onChange={e => setValue(e.target.value)}
        onPaste={e => {
          const pasted = e.clipboardData.getData("text").trim();
          if (pasted.length >= 30) {
            e.preventDefault();
            setValue(pasted);
            resolveAndAdd(pasted);
          }
        }}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault();
            resolveAndAdd(value);
          }
        }}
        className="h-8 text-xs font-mono"
        disabled={loading}
      />
      <Button type="button" size="sm" variant="outline" disabled={loading || !value.trim()} onClick={() => resolveAndAdd(value)}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Lier"}
      </Button>
    </div>
  );
};

/* ── Videos DnD list ── */
const VideosDndList = ({ form, setForm, toast, eventId, ownerBusinessId, eventName }: { form: typeof EMPTY_FORM; setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>; toast: any; eventId: string | null; ownerBusinessId: string | null; eventName: string }) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const videoIds = form.videos.map((_, i) => `evt-vid-${i}`);
  const [uploading, setUploading] = useState(false);
  const maxVideos = 10;
  const maxSizeMB = 100;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = videoIds.indexOf(active.id as string);
    const newIndex = videoIds.indexOf(over.id as string);
    setForm(p => ({ ...p, videos: arrayMove(p.videos, oldIndex, newIndex) }));
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = maxVideos - form.videos.length;
    const list = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of list) {
        if (!file.type.startsWith("video/")) {
          toast({ variant: "destructive", title: "Type invalide", description: `${file.name} n'est pas une vidéo.` });
          continue;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
          toast({ variant: "destructive", title: "Fichier trop volumineux", description: `${file.name} dépasse ${maxSizeMB}MB.` });
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
        const fileName = `${ownerBusinessId || "event"}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const filePath = `businesses/${fileName}`;
        const { error } = await supabase.storage.from("business-videos").upload(filePath, file, { cacheControl: "3600", upsert: false });
        if (error) {
          toast({ variant: "destructive", title: "Erreur upload", description: error.message });
          continue;
        }
        const { data: pub } = supabase.storage.from("business-videos").getPublicUrl(filePath);
        if (pub?.publicUrl) newUrls.push(pub.publicUrl);
      }
      if (newUrls.length > 0) {
        setForm(p => ({ ...p, videos: [...p.videos, ...newUrls] }));
        toast({ title: "Vidéo(s) ajoutée(s) ✓", description: `${newUrls.length} vidéo(s) uploadée(s).` });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    uploadFiles(e.dataTransfer.files);
  };

  const inputId = `event-video-upload-${eventId || "new"}`;

  return (
    <div className="space-y-3">
      {form.videos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={videoIds} strategy={verticalListSortingStrategy}>
              {form.videos.map((url, i) => (
                <SortableVideoItem key={videoIds[i]} id={videoIds[i]} url={url} index={i} setForm={setForm} toast={toast} eventId={eventId} ownerBusinessId={ownerBusinessId} eventName={eventName} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {form.videos.length < maxVideos && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer hover:border-primary/50",
            uploading && "pointer-events-none opacity-50"
          )}
        >
          <input
            type="file"
            id={inputId}
            multiple
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(e) => uploadFiles(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
          <label htmlFor={inputId} className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              {uploading ? (
                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              ) : (
                <div className="p-3 bg-primary/10 rounded-full">
                  <VideoIcon className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <p className="font-medium">
                  {uploading ? "Upload en cours..." : "Cliquez ou glissez-déposez"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {form.videos.length}/{maxVideos} vidéos • Max {maxSizeMB}MB par vidéo
                </p>
              </div>
            </div>
          </label>
        </div>
      )}

      {form.videos.length >= maxVideos && (
        <p className="text-sm text-muted-foreground text-center">
          Nombre maximum de vidéos atteint ({maxVideos})
        </p>
      )}

      {form.videos.length < maxVideos && (
        <AddVideoByIdInput form={form} setForm={setForm} toast={toast} />
      )}
    </div>
  );
};

interface EventRow {
  id: string;
  name: string;
  hook: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  images: string[];
  videos: string[];
  kp_regroupement: string[];
  logo_url: string | null;
  type: string | null;
  recurrence: string | null;
  google_maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  url: string | null;
  url_cta: string | null;
  url_force_external: boolean;
  city_id: string | null;
  created_at: string;
  updated_at: string;
  sort_order: number;
}

// Sortable row for the events list (drag & drop reordering)
const SortableEventListRow = ({
  ev,
  cities,
  eventBizNames,
  openEdit,
  handleDelete,
}: {
  ev: EventRow;
  cities: Array<{ id: string; name_fr: string }>;
  eventBizNames: Record<string, string[]>;
  openEdit: (ev: EventRow) => void;
  handleDelete: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ev.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
          title="Glisser pour réordonner"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell>
        <Button size="icon" variant="ghost" onClick={() => openEdit(ev)}>
          <Edit className="h-4 w-4" />
        </Button>
      </TableCell>
      <TableCell className="font-medium">{ev.name}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{ev.type || "—"}</TableCell>
      <TableCell className="text-sm">{ev.city_id ? (cities.find(c => c.id === ev.city_id)?.name_fr || "—") : "—"}</TableCell>
      <TableCell className="text-sm whitespace-normal">{eventBizNames[ev.id]?.join(", ") || "—"}</TableCell>
      <TableCell className="text-sm">{ev.recurrence || "—"}</TableCell>
      <TableCell className="text-sm">{ev.start_date || "—"}</TableCell>
      <TableCell className="text-sm">{ev.end_date || "—"}</TableCell>
      <TableCell>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
              <AlertDialogDescription>
                L'événement « {ev.name} » sera supprimé définitivement. Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDelete(ev.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
};

const EventManagement = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [kpInput, setKpInput] = useState("");
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [cities, setCities] = useState<{ id: string; name_fr: string }[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<{ id: string; name: string; city_id: string }[]>([]);
  const [filterCityId, setFilterCityId] = useState<string>("all");
  const [newTypeInput, setNewTypeInput] = useState("");
  const [showNewType, setShowNewType] = useState(false);

  // Drag & drop reordering of the events list
  const listSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleListDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const visible = filterCityId === "all" ? events : events.filter(ev => ev.city_id === filterCityId);
    const oldIndex = visible.findIndex(e => e.id === active.id);
    const newIndex = visible.findIndex(e => e.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reorderedVisible = arrayMove(visible, oldIndex, newIndex);
    // Renumber visible rows 10,20,30... while keeping others in place
    const updates = reorderedVisible.map((ev, i) => ({ id: ev.id, sort_order: (i + 1) * 10 }));
    const updateMap = new Map(updates.map(u => [u.id, u.sort_order]));
    setEvents(prev => {
      const next = prev.map(ev => updateMap.has(ev.id) ? { ...ev, sort_order: updateMap.get(ev.id)! } : ev);
      return [...next].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    });
    const results = await Promise.all(
      updates.map(u => supabase.from("events").update({ sort_order: u.sort_order }).eq("id", u.id))
    );
    if (results.some(r => r.error)) {
      toast({ variant: "destructive", title: "Erreur", description: "Le nouvel ordre n'a pas pu être enregistré." });
      fetchEvents();
    }
  };

  // Linked businesses
  const [linkedBusinessIds, setLinkedBusinessIds] = useState<string[]>([]);
  const [linkedBusinesses, setLinkedBusinesses] = useState<{ id: string; name: string; city: string | null }[]>([]);
  const [bizSearchQuery, setBizSearchQuery] = useState("");
  const [bizSearchResults, setBizSearchResults] = useState<{ id: string; name: string; city: string | null }[]>([]);
  const [bizSearching, setBizSearching] = useState(false);

  // List view: event businesses names map
  const [eventBizNames, setEventBizNames] = useState<Record<string, string[]>>({});

  // Badges
  const [allBadges, setAllBadges] = useState<{ id: string; name_fr: string; color_hex: string | null; text_color_hex: string | null }[]>([]);
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<string[]>([]);

  const fetchBadges = async () => {
    const { data } = await supabase
      .from("badges")
      .select("id, name_fr, color_hex, text_color_hex")
      .order("name_fr", { ascending: true });
    if (data) setAllBadges(data as any);
  };

  const fetchEventBadges = async (eventId: string) => {
    const { data } = await supabase
      .from("event_badges" as any)
      .select("badge_id")
      .eq("event_id", eventId);
    setSelectedBadgeIds((data as any[] || []).map(r => r.badge_id));
  };

  const toggleBadge = (badgeId: string) => {
    setSelectedBadgeIds(prev =>
      prev.includes(badgeId) ? prev.filter(id => id !== badgeId) : [...prev, badgeId]
    );
  };

  const fetchEventTypes = async () => {
    const { data } = await supabase.from("event_types").select("name").order("name");
    if (data) setEventTypes(data.map(d => (d as any).name));
  };

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: false });
    if (!error && data) {
      setEvents(data as unknown as EventRow[]);
      // fetch biz names for list
      const ids = (data as any[]).map(e => e.id);
      if (ids.length > 0) {
        const { data: ebData } = await supabase
          .from("event_businesses" as any)
          .select("event_id, business_id")
          .in("event_id", ids);
        if (ebData && ebData.length > 0) {
          const bizIds = [...new Set((ebData as any[]).map(r => r.business_id))];
          const { data: bizData } = await supabase
            .from("businesses")
            .select("id, name")
            .in("id", bizIds);
          const bizMap: Record<string, string> = {};
          (bizData || []).forEach((b: any) => { bizMap[b.id] = b.name; });
          const names: Record<string, string[]> = {};
          (ebData as any[]).forEach((r: any) => {
            if (!names[r.event_id]) names[r.event_id] = [];
            if (bizMap[r.business_id]) names[r.event_id].push(bizMap[r.business_id]);
          });
          setEventBizNames(names);
        }
      }
    }
    setLoading(false);
  };

  const fetchCities = async () => {
    const { data } = await supabase.from("cities").select("id, name_fr").order("name_fr");
    if (data) setCities(data);
  };

  const fetchNeighborhoods = async () => {
    const { data } = await supabase.from("neighborhoods").select("id, name, city_id").order("name");
    if (data) setNeighborhoods(data as any[]);
  };

  useEffect(() => { fetchEvents(); fetchEventTypes(); fetchCities(); fetchNeighborhoods(); fetchBadges(); }, []);

  const fetchLinkedBusinesses = async (eventId: string) => {
    const { data } = await supabase
      .from("event_businesses" as any)
      .select("business_id")
      .eq("event_id", eventId);
    if (!data || data.length === 0) {
      setLinkedBusinessIds([]);
      setLinkedBusinesses([]);
      return;
    }
    const ids = (data as any[]).map(d => d.business_id);
    setLinkedBusinessIds(ids);
    const { data: bizData } = await supabase
      .from("businesses")
      .select("id, name, city")
      .in("id", ids)
      .order("name");
    setLinkedBusinesses(bizData || []);
  };

  const searchBusinesses = async (query: string) => {
    if (query.trim().length < 2) { setBizSearchResults([]); return; }
    setBizSearching(true);
    const { data } = await supabase
      .from("businesses")
      .select("id, name, city")
      .ilike("name", `%${query.trim()}%`)
      .eq("is_active", true)
      .order("name")
      .limit(15);
    setBizSearchResults((data || []).filter(b => !linkedBusinessIds.includes(b.id)));
    setBizSearching(false);
  };

  const addLinkedBusiness = async (biz: { id: string; name: string; city: string | null }) => {
    if (linkedBusinessIds.includes(biz.id)) return;
    setLinkedBusinessIds(prev => [...prev, biz.id]);
    setLinkedBusinesses(prev => [...prev, biz].sort((a, b) => a.name.localeCompare(b.name, "fr")));
    setBizSearchQuery("");
    setBizSearchResults([]);
  };

  const removeLinkedBusiness = (bizId: string) => {
    setLinkedBusinessIds(prev => prev.filter(id => id !== bizId));
    setLinkedBusinesses(prev => prev.filter(b => b.id !== bizId));
    if (form.default_business_id === bizId) {
      setForm(p => ({ ...p, default_business_id: "" }));
    }
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setKpInput("");
    setLinkedBusinessIds([]);
    setLinkedBusinesses([]);
    const agendaBadge = allBadges.find(b => b.name_fr.toLowerCase() === "agenda");
    setSelectedBadgeIds(agendaBadge ? [agendaBadge.id] : []);
    setBizSearchQuery("");
    setBizSearchResults([]);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const openEdit = (ev: EventRow) => {
    setEditingId(ev.id);
    setForm({
      name: ev.name,
      hook: ev.hook || "",
      description: ev.description || "",
      start_date: ev.start_date || "",
      end_date: ev.end_date || "",
      images: ev.images || [],
      videos: ev.videos || [],
      kp_regroupement: ev.kp_regroupement || [],
      logo_url: ev.logo_url || "",
      type: ev.type || "",
      city_id: (ev as any).city_id || "",
      neighborhood_id: (ev as any).neighborhood_id || "",
      recurrence: (ev as any).recurrence || "",
      days_of_week: (ev as any).days_of_week || [],
      start_time: (ev as any).start_time || "",
      end_time: (ev as any).end_time || "",
      google_maps_url: ev.google_maps_url || "",
      latitude: ev.latitude ?? "",
      longitude: ev.longitude ?? "",
      url: (ev as any).url || "",
      url_cta: (ev as any).url_cta || "",
      url_force_external: (ev as any).url_force_external ?? false,
      default_business_id: (ev as any).default_business_id || "",
    });
    setKpInput("");
    setShowNewType(false);
    setNewTypeInput("");
    setBizSearchQuery("");
    setBizSearchResults([]);
    fetchLinkedBusinesses(ev.id);
    fetchEventBadges(ev.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Le nom est requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      hook: form.hook.trim() || null,
      description: form.description || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      images: form.images,
      videos: form.videos,
      kp_regroupement: form.kp_regroupement,
      logo_url: form.logo_url || null,
      type: form.type || null,
      city_id: form.city_id || null,
      neighborhood_id: form.neighborhood_id || null,
      recurrence: form.recurrence || null,
      days_of_week: form.days_of_week,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      google_maps_url: form.google_maps_url || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      url: form.url || null,
      url_cta: form.url_cta || null,
      url_force_external: form.url_force_external,
      default_business_id: form.default_business_id || null,
    };

    let error;
    let savedId = editingId;
    if (editingId) {
      ({ error } = await supabase.from("events").update(payload).eq("id", editingId));
    } else {
      const res = await supabase.from("events").insert(payload).select("id").single();
      error = res.error;
      if (res.data) savedId = (res.data as any).id;
    }

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Save linked businesses
    if (savedId) {
      await supabase.from("event_businesses" as any).delete().eq("event_id", savedId);
      if (linkedBusinessIds.length > 0) {
        const rows = linkedBusinessIds.map(bizId => ({ event_id: savedId, business_id: bizId }));
        await supabase.from("event_businesses" as any).insert(rows);
      }
    }

    // Save badges
    if (savedId) {
      await supabase.from("event_badges" as any).delete().eq("event_id", savedId);
      if (selectedBadgeIds.length > 0) {
        const badgeRows = selectedBadgeIds.map(badgeId => ({ event_id: savedId, badge_id: badgeId }));
        await supabase.from("event_badges" as any).insert(badgeRows);
      }
    }

    // Keep business_documents in sync with the exact videos attached to this event.
    if (savedId) {
      const urls = form.videos.filter(Boolean);
      if (urls.length > 0) {
        await supabase
          .from("business_documents")
          .update({ event_id: null })
          .eq("event_id", savedId)
          .not("url", "in", `(${urls.map(url => `"${url.replace(/"/g, '\"')}"`).join(",")})`);
      } else {
        await supabase
          .from("business_documents")
          .update({ event_id: null })
          .eq("event_id", savedId);
      }

      if (urls.length > 0) {
        const ownerBusinessId = form.default_business_id || linkedBusinessIds[0] || null;
        if (ownerBusinessId) {
          for (const url of urls) {
            await ensureEventVideoDocument({
              url,
              eventId: savedId,
              ownerBusinessId,
              eventName: form.name,
            });
          }
        } else {
          toast({
            title: "Vidéos sans ID",
            description: "Associez au moins un établissement à l'événement pour créer les entrées vidéo.",
          });
        }
      }
    }

    toast({ title: editingId ? "Événement mis à jour" : "Événement créé" });
    setShowForm(false);
    setEditingId(null);
    fetchEvents();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Événement supprimé" });
      fetchEvents();
    }
  };

  const addKp = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (form.kp_regroupement.length >= 20) {
      toast({ title: "Maximum 20 éléments", variant: "destructive" });
      return;
    }
    setForm(prev => ({ ...prev, kp_regroupement: [...prev.kp_regroupement, trimmed] }));
    setKpInput("");
  };

  const removeKp = (idx: number) => {
    setForm(prev => ({ ...prev, kp_regroupement: prev.kp_regroupement.filter((_, i) => i !== idx) }));
  };

  const addNewType = async () => {
    const trimmed = newTypeInput.trim();
    if (!trimmed) return;
    const { error } = await supabase.from("event_types").insert({ name: trimmed } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      await fetchEventTypes();
      setForm(p => ({ ...p, type: trimmed }));
      setNewTypeInput("");
      setShowNewType(false);
    }
  };

  // ── FORM VIEW ──
  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleCancel} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
          <h2 className="text-xl font-semibold">
            {editingId ? "Modifier l'événement" : "Nouvel événement"}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
          {/* Left column: Nom, Type, Hook */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Nom *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label>Type</Label>
                {showNewType ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nouveau type..."
                      value={newTypeInput}
                      onChange={e => setNewTypeInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addNewType(); } }}
                    />
                    <Button size="sm" onClick={addNewType} className="shrink-0">OK</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowNewType(false); setNewTypeInput(""); }} className="shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v === "__none__" ? "" : v }))}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Aucun" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Aucun</SelectItem>
                        {eventTypes.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="outline" onClick={() => setShowNewType(true)} title="Ajouter un type">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label>Ville</Label>
                <Select value={form.city_id || "__none__"} onValueChange={v => setForm(p => ({ ...p, city_id: v === "__none__" ? "" : v, neighborhood_id: "" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune</SelectItem>
                    {cities.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quartier</Label>
                <Select
                  value={form.neighborhood_id || "__none__"}
                  onValueChange={v => setForm(p => ({ ...p, neighborhood_id: v === "__none__" ? "" : v }))}
                  disabled={!form.city_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {neighborhoods
                      .filter(n => n.city_id === form.city_id)
                      .map(n => (
                        <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Récurrence</Label>
                <Select value={form.recurrence || "__none__"} onValueChange={v => setForm(p => ({ ...p, recurrence: v === "__none__" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune</SelectItem>
                    <SelectItem value="yearly">Tous les ans</SelectItem>
                    <SelectItem value="weekly">Une fois par semaine</SelectItem>
                    <SelectItem value="monthly">Une fois par mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jours de la semaine</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {DAYS_OF_WEEK.map(d => {
                    const selected = form.days_of_week.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-input hover:bg-muted"}`}
                        onClick={() => setForm(p => ({
                          ...p,
                          days_of_week: selected
                            ? p.days_of_week.filter(v => v !== d.value)
                            : [...p.days_of_week, d.value],
                        }))}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Heure de début</Label>
                  <TimeSelect value={form.start_time} onChange={v => setForm(p => ({ ...p, start_time: v }))} />
                </div>
                <div>
                  <Label>Heure de fin</Label>
                  <TimeSelect value={form.end_time} onChange={v => setForm(p => ({ ...p, end_time: v }))} />
                </div>
              </div>
            </div>
            <div>
              <Label>Hook</Label>
              <Input value={form.hook} onChange={e => setForm(p => ({ ...p, hook: e.target.value }))} />
            </div>
          </div>

          {/* Right column: Logo */}
          <div className="space-y-2 w-48">
            <Label className="text-base font-semibold">Logo</Label>
            <LogoUploader
              logoUrl={form.logo_url}
              onChange={url => setForm(p => ({ ...p, logo_url: url }))}
            />
          </div>
        </div>

        {/* Full-width: Dates + KP */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Date de début</Label>
            <Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
          </div>
          <div>
            <Label>Date de fin</Label>
            <Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
          </div>
          <div>
            <Label>KP Regroupement ({form.kp_regroupement.length}/20)</Label>
            <Input
              placeholder="Code KP puis Entrée"
              value={kpInput}
              onChange={e => setKpInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKp(kpInput); } }}
            />
          </div>
        </div>
        {form.kp_regroupement.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {form.kp_regroupement.map((kp, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-sm">
                {kp}
                <button type="button" onClick={() => removeKp(i)} className="text-muted-foreground hover:text-destructive">×</button>
              </span>
            ))}
          </div>
        )}

        {/* Badges */}
        <div className="space-y-2">
          <Label>Badges ({selectedBadgeIds.length} sélectionné{selectedBadgeIds.length > 1 ? "s" : ""})</Label>
          {allBadges.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun badge disponible.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allBadges.map(badge => {
                const isSelected = selectedBadgeIds.includes(badge.id);
                return (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => toggleBadge(badge.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      isSelected
                        ? "border-transparent shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground opacity-60"
                    }`}
                    style={isSelected ? {
                      backgroundColor: badge.color_hex || "hsl(var(--primary))",
                      color: badge.text_color_hex || "hsl(var(--primary-foreground))",
                    } : undefined}
                  >
                    {badge.name_fr}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Full-width: Google Maps, Description, Images, Videos */}
        <div className="space-y-6">
          {/* Google Maps row */}
          <div className="flex gap-4 items-end">
            <div className="space-y-2 flex-1 min-w-0">
              <Label className="flex items-center gap-2">
                <MapPinned className="h-4 w-4 text-[#4285F4]" />
                {form.google_maps_url ? (
                  <a href={form.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                    Google Maps ↗
                  </a>
                ) : (
                  "Google Maps"
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={form.google_maps_url}
                  onChange={e => setForm(p => ({ ...p, google_maps_url: e.target.value }))}
                  onBlur={async (e) => {
                    const val = e.target.value?.trim();
                    if (!val || !val.includes("google") || (form.latitude && form.longitude)) return;
                    try {
                      const { data, error } = await supabase.functions.invoke("resolve-maps-url", { body: { url: val } });
                      if (error) throw error;
                      if (data?.lat && data?.lng) {
                        setForm(p => ({
                          ...p,
                          latitude: data.lat,
                          longitude: data.lng,
                          google_maps_url: data.resolvedUrl || p.google_maps_url,
                        }));
                        toast({ title: "GPS auto-détecté", description: `Lat: ${data.lat}, Lng: ${data.lng}` });
                      }
                    } catch { /* silent */ }
                  }}
                  placeholder="https://maps.google.com/..."
                  className="flex-1"
                />
                {form.google_maps_url && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setForm(p => ({ ...p, google_maps_url: "" }))} className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex gap-2 items-end shrink-0">
              <div className="space-y-1" style={{ width: '120px' }}>
                <Label className="text-xs">Lat</Label>
                <Input type="number" step="any" value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))} placeholder="31.6295" className="text-xs h-8" />
              </div>
              <div className="space-y-1" style={{ width: '120px' }}>
                <Label className="text-xs">Lng</Label>
                <Input type="number" step="any" value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))} placeholder="-7.9811" className="text-xs h-8" />
              </div>
              {form.google_maps_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs h-8 shrink-0"
                  onClick={async () => {
                    try {
                      toast({ title: "Résolution de l'URL...", description: "Extraction via Google Places API." });
                      const { data, error } = await supabase.functions.invoke("resolve-maps-url", { body: { url: form.google_maps_url } });
                      if (error) throw error;
                      if (data?.lat && data?.lng) {
                        setForm(p => ({
                          ...p,
                          latitude: data.lat,
                          longitude: data.lng,
                          google_maps_url: data.resolvedUrl || p.google_maps_url,
                        }));
                        toast({ title: "GPS récupéré", description: `Lat: ${data.lat}, Lng: ${data.lng}` });
                      } else {
                        toast({ variant: "destructive", title: "Impossible d'extraire les coordonnées" });
                      }
                    } catch (err: any) {
                      toast({ variant: "destructive", title: "Erreur", description: err.message || "Impossible de résoudre l'URL." });
                    }
                  }}
                >
                  <MapPinned className="h-3.5 w-3.5" />
                  GPS
                </Button>
              )}
            </div>
          </div>

          {/* URL + CTA + Toggle */}
          <div className="space-y-1">
            <Label>
              {form.url ? (
                <a href={form.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">URL ↗</a>
              ) : "URL"}
            </Label>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.url_force_external}
                onCheckedChange={checked => setForm(p => ({ ...p, url_force_external: checked }))}
                title="Ouvrir en lien externe"
                className="shrink-0"
              />
              <Input
                value={form.url}
                onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                placeholder="https://..."
                className="flex-1 min-w-0"
              />
              {form.url && (
                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0 px-2" onClick={() => setForm(p => ({ ...p, url: "" }))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Select value={form.url_cta || "__none__"} onValueChange={v => setForm(p => ({ ...p, url_cta: v === "__none__" ? "" : v }))}>
                <SelectTrigger className="w-64 shrink-0">
                  <SelectValue placeholder="🎯 CTA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucun</SelectItem>
                  {[
                    "Acheter en ligne", "Achetez", "Accréditations", "App Store", "Application",
                    "Billetterie", "Boissons", "Carte des soins", "Carte des vins",
                    "Cocktails", "Consulter notre offre", "Contactez-moi", "Contactez nous",
                    "Day Pass", "En savoir +", "Forfaits", "Google Play", "Hammam", "Hotel",
                    "La carte", "Les boissons", "Menu", "Nos services", "Notre offre",
                    "Plus d'informations", "Programme", "Réserver en ligne", "Réserver une chambre", "Réserver une table", "Réservez",
                    "Restaurant", "Riad", "Séances", "Site web", "Spa", "WhatsApp",
                  ].map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.url_force_external && <span className="text-xs text-orange-600">⚡ Lien externe activé</span>}
          </div>

          <div>
            <Label>Description</Label>
            <RichTextEditor
              content={form.description}
              onChange={html => setForm(p => ({ ...p, description: html }))}
              maxHeight="600px"
            />
          </div>

          <div>
            <Label className="text-base font-semibold">Images ({form.images.length}/10)</Label>
            <ImageUploader
              images={form.images}
              onChange={images => setForm(p => ({ ...p, images }))}
              maxImages={10}
            />
          </div>

          <div>
            <Label className="text-base font-semibold">Vidéos ({form.videos.length}/10)</Label>
            <VideosDndList form={form} setForm={setForm} toast={toast} eventId={editingId} ownerBusinessId={form.default_business_id || linkedBusinessIds[0] || null} eventName={form.name} />
          </div>

          {/* Linked businesses */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">🏢 Établissements associés ({linkedBusinesses.length})</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un établissement par nom…"
                value={bizSearchQuery}
                onChange={e => { setBizSearchQuery(e.target.value); searchBusinesses(e.target.value); }}
                className="pl-9"
              />
            </div>
            {bizSearchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
                {bizSearchResults.map(biz => (
                  <button
                    key={biz.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between text-sm"
                    onClick={() => addLinkedBusiness(biz)}
                  >
                    <span className="font-medium">{biz.name}</span>
                    <span className="text-muted-foreground text-xs">{biz.city || "—"}</span>
                  </button>
                ))}
              </div>
            )}
            {linkedBusinesses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {linkedBusinesses.map(biz => (
                  <span key={biz.id} className="inline-flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-md text-sm">
                    <button
                      type="button"
                      title={form.default_business_id === biz.id ? "Établissement par défaut" : "Définir par défaut"}
                      onClick={() => setForm(p => ({ ...p, default_business_id: p.default_business_id === biz.id ? "" : biz.id }))}
                      className={form.default_business_id === biz.id ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}
                    >
                      <Star className={`h-3.5 w-3.5 ${form.default_business_id === biz.id ? "fill-current" : ""}`} />
                    </button>
                    {biz.name}
                    {biz.city && <span className="text-muted-foreground text-xs">({biz.city})</span>}
                    <button type="button" onClick={() => removeLinkedBusiness(biz.id)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {linkedBusinesses.length === 0 && <p className="text-xs text-muted-foreground">Aucun établissement associé.</p>}
          </div>
        </div>

        {/* Save bar */}
        <div className="flex justify-start gap-2 border-t pt-4">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
          <Button variant="outline" onClick={handleCancel}>Annuler</Button>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Events</h2>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Nouvel événement
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">Filtrer par ville :</Label>
        <Select value={filterCityId} onValueChange={setFilterCityId}>
          <SelectTrigger className="w-[240px] h-9">
            <SelectValue placeholder="Toutes les villes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {cities.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(() => {
        const filteredEvents = filterCityId === "all" ? events : events.filter(ev => ev.city_id === filterCityId);
        return loading ? (
        <p className="text-muted-foreground text-sm">Chargement...</p>
      ) : filteredEvents.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">Aucun événement.</p>
      ) : (
        <DndContext sensors={listSensors} collisionDetection={closestCenter} onDragEnd={handleListDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Établissements</TableHead>
                <TableHead>Récurrence</TableHead>
                <TableHead>Début</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext items={filteredEvents.map(e => e.id)} strategy={verticalListSortingStrategy}>
                {filteredEvents.map(ev => (
                  <SortableEventListRow
                    key={ev.id}
                    ev={ev}
                    cities={cities}
                    eventBizNames={eventBizNames}
                    openEdit={openEdit}
                    handleDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
      );
      })()}
    </div>
  );
};

export default EventManagement;
