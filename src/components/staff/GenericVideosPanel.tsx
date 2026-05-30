import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, Upload, Copy, Check, FileText, Instagram, X, MapPin, MapPinned, Building2, Search, GripVertical, Clock, Globe, Tag, Layers, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import VideoIdSearchInput from "./VideoIdSearchInput";
import ImportFromBusinessDocInput from "./ImportFromBusinessDocInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import VideoUploader from "./VideoUploader";
import VideoLightbox from "./VideoLightbox";
import RichTextEditor from "./RichTextEditor";
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
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import GenericVideoPreviewOverlay from "./GenericVideoPreviewOverlay";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GenericVideo {
  id: string;
  url: string;
  name: string | null;
  thumbnail_url: string | null;
  city: string | null;
  neighborhood: string | null;
  sort_order: number;
  created_at: string;
  instagram_account: string | null;
  instagram_url: string | null;
  instagram_video_url: string | null;
  tiktok_account: string | null;
  tiktok_url: string | null;
  tiktok_video_url: string | null;
  youtube_account: string | null;
  youtube_url: string | null;
  youtube_video_url: string | null;
  description: string | null;
  title: string | null;
}

/* ─── Social links editor dialog ─── */
const SocialLinksDialog = ({
  video,
  open,
  onOpenChange,
  onSaved,
}: {
  video: GenericVideo;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) => {
  const [ig, setIg] = useState({ account: video.instagram_account || "", url: video.instagram_url || "", videoUrl: video.instagram_video_url || "" });
  const [tt, setTt] = useState({ account: video.tiktok_account || "", url: video.tiktok_url || "", videoUrl: video.tiktok_video_url || "" });
  const [yt, setYt] = useState({ account: video.youtube_account || "", url: video.youtube_url || "", videoUrl: video.youtube_video_url || "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("generic_videos" as any)
      .update({
        instagram_account: ig.account || null, instagram_url: ig.url || null, instagram_video_url: ig.videoUrl || null,
        tiktok_account: tt.account || null, tiktok_url: tt.url || null, tiktok_video_url: tt.videoUrl || null,
        youtube_account: yt.account || null, youtube_url: yt.url || null, youtube_video_url: yt.videoUrl || null,
      } as any)
      .eq("id", video.id);
    if (error) toast.error(error.message);
    else { toast.success("Liens sociaux enregistrés"); onSaved(); onOpenChange(false); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Liens sociaux</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2 p-3 rounded-lg border">
            <Label className="font-semibold flex items-center gap-1.5"><Instagram className="h-4 w-4" /> Instagram</Label>
            <Input placeholder="Compte (@…)" value={ig.account} onChange={e => setIg(p => ({ ...p, account: e.target.value }))} />
            <Input placeholder="URL du profil" value={ig.url} onChange={e => setIg(p => ({ ...p, url: e.target.value }))} />
            <Input placeholder="URL de la vidéo Instagram" value={ig.videoUrl} onChange={e => setIg(p => ({ ...p, videoUrl: e.target.value }))} />
          </div>
          <div className="space-y-2 p-3 rounded-lg border">
            <Label className="font-semibold flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78c.29 0 .58.04.86.11V9a6.27 6.27 0 0 0-.86-.06A6.33 6.33 0 0 0 3.16 15.3a6.33 6.33 0 0 0 6.33 6.33c3.5 0 6.33-2.84 6.33-6.33V9.14a8.16 8.16 0 0 0 4.77 1.52V7.21a4.85 4.85 0 0 1-1-.52Z"/></svg>
              TikTok
            </Label>
            <Input placeholder="Compte (@…)" value={tt.account} onChange={e => setTt(p => ({ ...p, account: e.target.value }))} />
            <Input placeholder="URL du profil" value={tt.url} onChange={e => setTt(p => ({ ...p, url: e.target.value }))} />
            <Input placeholder="URL de la vidéo TikTok" value={tt.videoUrl} onChange={e => setTt(p => ({ ...p, videoUrl: e.target.value }))} />
          </div>
          <div className="space-y-2 p-3 rounded-lg border">
            <Label className="font-semibold flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.56A3.02 3.02 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.56 9.38.56 9.38.56s7.5 0 9.38-.56a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z"/></svg>
              YouTube
            </Label>
            <Input placeholder="Nom de la chaîne" value={yt.account} onChange={e => setYt(p => ({ ...p, account: e.target.value }))} />
            <Input placeholder="URL de la chaîne" value={yt.url} onChange={e => setYt(p => ({ ...p, url: e.target.value }))} />
            <Input placeholder="URL de la vidéo YouTube" value={yt.videoUrl} onChange={e => setYt(p => ({ ...p, videoUrl: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enregistrer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Description (RichText) dialog ─── */
const DescriptionDialog = ({ video, open, onOpenChange, onSaved }: { video: GenericVideo; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void; }) => {
  const [title, setTitle] = useState(video.title || "");
  const [desc, setDesc] = useState(video.description || "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("generic_videos" as any).update({ title: title.trim() || null, description: desc || null } as any).eq("id", video.id);
    if (error) toast.error(error.message);
    else { toast.success("Titre & description enregistrés"); onSaved(); onOpenChange(false); }
    setSaving(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Titre & description de la vidéo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="generic-video-title" className="text-xs font-semibold">Titre</Label>
            <Input
              id="generic-video-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la vidéo (optionnel)"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Description</Label>
            <RichTextEditor content={desc} onChange={setDesc} maxHeight="400px" />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enregistrer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Inline assignment panels: thin wrappers around the shared implementations ─── */
import {
  InlinePoiAssignment as SharedInlinePoiAssignment,
  InlineBusinessAssignment as SharedInlineBusinessAssignment,
  InlineDestinationCityAssignment as SharedInlineDestinationCityAssignment,
  InlineBadgeSubcatCityAssignment as SharedInlineBadgeSubcatCityAssignment,
} from "./video-assignment/VideoAssignmentPanels";

const InlinePoiAssignment = (props: { video: GenericVideo; onClose: () => void; onSaved: () => void }) =>
  <SharedInlinePoiAssignment source="generic" {...props} />;

const InlineBusinessAssignment = (props: { video: GenericVideo; onClose: () => void; onSaved: () => void }) =>
  <SharedInlineBusinessAssignment source="generic" {...props} />;

const InlineDestinationCityAssignment = (props: { video: GenericVideo; onClose: () => void; onSaved: () => void }) =>
  <SharedInlineDestinationCityAssignment source="generic" {...props} />;

const InlineBadgeSubcatCityAssignment = (props: { video: GenericVideo; onClose: () => void; onSaved: () => void }) =>
  <SharedInlineBadgeSubcatCityAssignment source="generic" {...props} />;

/* ─── Right panel: linked items with DnD + timeframes ─── */
interface LinkedItemWithTime { id: string; name: string; type: "poi" | "business" | "destination"; start_time: number | null; end_time: number | null; sort_order: number; }

const SortableTimeItem = ({ item, onChange, onRemove }: { item: LinkedItemWithTime; onChange: (id: string, field: "start_time" | "end_time", val: number | null) => void; onRemove: (item: LinkedItemWithTime) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const parseNum = (v: string) => { const n = parseFloat(v); return isNaN(n) ? null : n; };

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-center gap-2 p-2 rounded-md border bg-card", isDragging && "opacity-50 shadow-lg z-50")}>
      <span {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground shrink-0">
        <GripVertical className="h-4 w-4" />
      </span>
      <div className={cn("shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
        item.type === "poi" ? "bg-primary/10 text-primary" : item.type === "destination" ? "bg-rose-500/10 text-rose-600" : "bg-accent text-accent-foreground")}>
        {item.type === "poi" ? <MapPin className="h-3 w-3" /> : item.type === "destination" ? <Globe className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
      </div>
      <span className="text-xs font-medium truncate flex-1 min-w-0">{item.name}</span>
      <div className="flex items-center gap-1 shrink-0">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <Input
          type="number"
          step="0.1"
          min="0"
          placeholder="0"
          value={item.start_time ?? ""}
          onChange={e => onChange(item.id, "start_time", parseNum(e.target.value))}
          className="w-16 h-7 text-xs px-1.5 text-center"
        />
        <span className="text-[10px] text-muted-foreground">→</span>
        <Input
          type="number"
          step="0.1"
          min="0"
          placeholder="∞"
          value={item.end_time ?? ""}
          onChange={e => onChange(item.id, "end_time", parseNum(e.target.value))}
          className="w-16 h-7 text-xs px-1.5 text-center"
        />
        <span className="text-[10px] text-muted-foreground">s</span>
        <button
          type="button"
          onClick={() => onRemove(item)}
          title="Retirer cette liaison"
          className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

const RightDetailPanel = ({
  video,
  onClose,
  items,
  onReorder,
  onTimeChange,
  onSave,
  saving,
  isDirty,
  onEditSocial,
  onEditDescription,
  onRemoveItem,
}: {
  video: GenericVideo;
  onClose: () => void;
  items: LinkedItemWithTime[];
  onReorder: (items: LinkedItemWithTime[]) => void;
  onTimeChange: (id: string, field: "start_time" | "end_time", val: number | null) => void;
  onSave: () => void;
  saving: boolean;
  isDirty: boolean;
  onEditSocial: (v: GenericVideo) => void;
  onEditDescription: (v: GenericVideo) => void;
  onRemoveItem: (item: LinkedItemWithTime) => void;
}) => {
  const allItems = useMemo(() => [...items].sort((a, b) => a.sort_order - b.sort_order), [items]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }));
  const isStorageVideo = video.url.includes("supabase.co/storage");
  const [currentTime, setCurrentTime] = useState(0);

  const formatTime = (value: number | null | undefined) => (value == null ? "∞" : `${value.toFixed(1)}s`);

  const activeItem = useMemo(() => {
    return allItems.find(item => {
      const start = item.start_time ?? 0;
      const end = item.end_time ?? Infinity;
      return currentTime >= start && currentTime < end;
    }) || null;
  }, [allItems, currentTime]);

  useEffect(() => {
    setCurrentTime(0);
  }, [video.id]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = allItems.findIndex(i => i.id === active.id);
    const newIndex = allItems.findIndex(i => i.id === over.id);
    const reordered = arrayMove(allItems, oldIndex, newIndex).map((item, i) => ({ ...item, sort_order: i }));
    onReorder(reordered);
  };

  return (
    <div className="h-full flex flex-col border-l bg-card">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <Play className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold truncate">{video.name || "Vidéo générique"}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>

      <div className="p-3 border-b space-y-2">
        <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
          {isStorageVideo ? (
            <video
              src={video.url}
              className="w-full h-full object-contain"
              muted
              preload="metadata"
              controls
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
          ) : video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center"><Play className="h-8 w-8 text-muted-foreground" /></div>
          )}

          {isStorageVideo && (
            <div className="absolute top-2 right-2 rounded-md border border-border/80 bg-background/85 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm">
              {formatTime(currentTime)}
            </div>
          )}
        </div>

        <Button size="sm" onClick={onSave} disabled={!isDirty || saving} className="w-full">
          {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          Enregistrer
        </Button>

        {isStorageVideo && allItems.length > 0 && (
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xs font-semibold text-foreground">Lecture : {formatTime(currentTime)}</span>
              {activeItem ? (
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{activeItem.name}</span>
                  {" · "}
                  {formatTime(activeItem.start_time)} → {formatTime(activeItem.end_time)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Aucune entité active sur ce segment</span>
              )}
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground font-mono">{video.id}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={() => onEditSocial(video)} className="text-[10px] text-primary hover:underline flex items-center gap-1">
            <Instagram className="h-3 w-3" />
            {(video.instagram_account || video.tiktok_account || video.youtube_account) ? "Liens sociaux" : "+ Sociaux"}
          </button>
          <button type="button" onClick={() => onEditDescription(video)} className="text-[10px] text-primary hover:underline flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {(video.description && video.description.replace(/<[^>]*>/g, "").trim().length > 0) ? "Description" : "+ Description"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground mb-2">
          {allItems.length} entité{allItems.length > 1 ? "s" : ""} liée{allItems.length > 1 ? "s" : ""}
        </p>

        {allItems.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Aucun POI, établissement ou destination lié à cette vidéo</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={allItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {allItems.map(item => <SortableTimeItem key={item.id} item={item} onChange={onTimeChange} onRemove={onRemoveItem} />)}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="p-3 border-t text-[10px] text-muted-foreground flex items-center gap-4">
        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> POI</span>
        <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> Établissement</span>
        <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Destination</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Début → Fin (secondes)</span>
      </div>
    </div>
  );
};

/* ─── Sortable video card (simplified - no inline linked lists) ─── */
const SortableVideoCard = ({
  video,
  poiCount,
  bizCount,
  destCount,
  badgeCount,
  subcatCount,
  cityCount,
  hasTimeframes,
  isSelected,
  onSelect,
  onPreview,
  onEditSocial,
  onEditDescription,
  onEditPois,
  onEditBusinesses,
  onEditDestinations,
  onEditTags,
  onPreviewOverlay,
  onDelete,
}: {
  video: GenericVideo;
  poiCount: number;
  bizCount: number;
  destCount: number;
  badgeCount: number;
  subcatCount: number;
  cityCount: number;
  hasTimeframes: boolean;
  isSelected: boolean;
  onSelect: (v: GenericVideo) => void;
  onPreview: (url: string) => void;
  onEditSocial: (v: GenericVideo) => void;
  onEditDescription: (v: GenericVideo) => void;
  onEditPois: (v: GenericVideo) => void;
  onEditBusinesses: (v: GenericVideo) => void;
  onEditDestinations: (v: GenericVideo) => void;
  onEditTags: (v: GenericVideo) => void;
  onPreviewOverlay: (v: GenericVideo) => void;
  onDelete: (v: GenericVideo) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id });
  const [copiedId, setCopiedId] = useState(false);
  const style = { transform: CSS.Transform.toString(transform), transition };

  const copyId = (e: React.MouseEvent) => { e.stopPropagation(); navigator.clipboard.writeText(video.id); setCopiedId(true); setTimeout(() => setCopiedId(false), 1500); };
  const isStorageVideo = video.url.includes("supabase.co/storage");
  const hasSocial = video.instagram_account || video.tiktok_account || video.youtube_account;
  const hasDesc = video.description && video.description.replace(/<[^>]*>/g, "").trim().length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-video-id={video.id}
      onClick={() => onSelect(video)}
      className={cn(
        "group relative rounded-lg border bg-card overflow-hidden transition-shadow hover:shadow-md cursor-pointer transition-[outline]",
        isDragging && "opacity-50 z-50",
        isSelected && "ring-2 ring-primary border-primary"
      )}
    >
      <button className="relative w-full bg-black" style={{ aspectRatio: "16/9" }} onClick={(e) => { e.stopPropagation(); onPreview(video.url); }}>
        {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" /> :
          isStorageVideo ? <video src={video.url} className="w-full h-full object-contain" muted preload="metadata" /> :
          <div className="w-full h-full flex items-center justify-center bg-muted"><Play className="h-8 w-8 text-muted-foreground" /></div>}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center"><Play className="h-5 w-5 text-primary-foreground fill-primary-foreground ml-0.5" /></div>
        </div>
        {hasDesc && <span className="absolute bottom-2 right-2 z-10 px-2 py-1 rounded text-[10px] font-bold bg-primary text-primary-foreground">TXT</span>}
        {hasTimeframes && <span className="absolute bottom-2 left-2 z-10 px-2 py-1 rounded text-[10px] font-bold bg-amber-500 text-white flex items-center gap-0.5"><Clock className="h-3 w-3" />TIME</span>}
        {(poiCount > 0 || bizCount > 0 || destCount > 0) && (
          <button
            className="absolute top-9 right-2 z-10 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            onClick={(e) => { e.stopPropagation(); onPreviewOverlay(video); }}
          >
            VU
          </button>
        )}
        <button
          className="absolute top-2 right-2 z-10 p-1 rounded bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive transition-opacity"
          onClick={(e) => { e.stopPropagation(); onDelete(video); }}
          title="Supprimer cette vidéo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </button>

      <div className="p-2 space-y-1">
        {video.name && <p className="text-xs font-medium truncate">{video.name}</p>}
        <button onClick={copyId} className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono hover:text-foreground transition-colors">
          {copiedId ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          <span className="truncate max-w-[180px]">{video.id}</span>
        </button>
        <div className="flex flex-wrap gap-1">
          {video.city && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{video.city}</Badge>}
          {video.neighborhood && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{video.neighborhood}</Badge>}
        </div>
        {hasSocial && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {video.instagram_account && <Badge variant="outline" className="text-[10px] px-1.5 py-0">IG: {video.instagram_account}</Badge>}
            {video.tiktok_account && <Badge variant="outline" className="text-[10px] px-1.5 py-0">TT: {video.tiktok_account}</Badge>}
            {video.youtube_account && <Badge variant="outline" className="text-[10px] px-1.5 py-0">YT: {video.youtube_account}</Badge>}
          </div>
        )}
        <div className="flex flex-wrap gap-1 pt-1">
          <button type="button" onClick={(e) => { e.stopPropagation(); onEditSocial(video); }} className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors", hasSocial ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25" : "text-muted-foreground hover:text-foreground hover:underline")}>{hasSocial ? "✓ Sociaux" : "+ Sociaux"}</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEditDescription(video); }} className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors", hasDesc ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 hover:bg-purple-500/25" : "text-muted-foreground hover:text-foreground hover:underline")}>{hasDesc ? "✓ Description" : "+ Description"}</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEditPois(video); }} className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors", poiCount > 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25" : "text-muted-foreground hover:text-foreground hover:underline")}>{poiCount > 0 ? `✓ ${poiCount} POI` : "+ POI"}</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEditBusinesses(video); }} className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors", bizCount > 0 ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25" : "text-muted-foreground hover:text-foreground hover:underline")}>{bizCount > 0 ? `✓ ${bizCount} Étab.` : "+ Étab."}</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEditDestinations(video); }} className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors", destCount > 0 ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-500/25" : "text-muted-foreground hover:text-foreground hover:underline")}>{destCount > 0 ? `✓ ${destCount} Dest.` : "+ Dest."}</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEditTags(video); }} className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors", (badgeCount + subcatCount + cityCount) > 0 ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/25" : "text-muted-foreground hover:text-foreground hover:underline")}>{(badgeCount + subcatCount + cityCount) > 0 ? `✓ ${badgeCount}B/${subcatCount}SC/${cityCount}V` : "+ Tags"}</button>
        </div>
      </div>

      <div {...attributes} {...listeners} className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded bg-background/80 border border-border/50 text-[10px] text-muted-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>⠿</div>
    </div>
  );
};

/* ─── Main panel ─── */
const GenericVideosPanel = () => {
  const [videos, setVideos] = useState<GenericVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [socialVideo, setSocialVideo] = useState<GenericVideo | null>(null);
  const [descVideo, setDescVideo] = useState<GenericVideo | null>(null);
  const [poiVideo, setPoiVideo] = useState<GenericVideo | null>(null);
  const [businessVideo, setBusinessVideo] = useState<GenericVideo | null>(null);
  const [destinationVideo, setDestinationVideo] = useState<GenericVideo | null>(null);
  const [tagsVideo, setTagsVideo] = useState<GenericVideo | null>(null);
  const [previewOverlayVideo, setPreviewOverlayVideo] = useState<GenericVideo | null>(null);
  const [deleteConfirmVideo, setDeleteConfirmVideo] = useState<GenericVideo | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filtres "Nom Social" — un par réseau
  const ALL_SOCIAL = "__all__";
  const [filterIg, setFilterIg] = useState<string>(ALL_SOCIAL);
  const [filterTt, setFilterTt] = useState<string>(ALL_SOCIAL);
  const [filterYt, setFilterYt] = useState<string>(ALL_SOCIAL);

  // Selected video for right panel
  const [selectedVideo, setSelectedVideo] = useState<GenericVideo | null>(null);
  // Linked items with times for the right panel
  const [panelItems, setPanelItems] = useState<LinkedItemWithTime[]>([]);
  const [panelItemsInitial, setPanelItemsInitial] = useState<string>(""); // JSON snapshot for dirty check
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelSaving, setPanelSaving] = useState(false);

  // POI/business/destination counts for badges
  const [videoPoiCounts, setVideoPoiCounts] = useState<Record<string, number>>({});
  const [videoBizCounts, setVideoBizCounts] = useState<Record<string, number>>({});
  const [videoDestCounts, setVideoDestCounts] = useState<Record<string, number>>({});
  const [videoBadgeCounts, setVideoBadgeCounts] = useState<Record<string, number>>({});
  const [videoSubcatCounts, setVideoSubcatCounts] = useState<Record<string, number>>({});
  const [videoCityCounts, setVideoCityCounts] = useState<Record<string, number>>({});
  const [videoHasTimeframes, setVideoHasTimeframes] = useState<Record<string, boolean>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadVideos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("generic_videos" as any).select("*").order("sort_order", { ascending: true });
    setVideos((data as unknown as GenericVideo[]) || []);
    setLoading(false);
  }, []);

  const loadCounts = useCallback(async () => {
    const [{ data: poiLinks }, { data: bizLinks }, { data: destLinks }, { data: badgeLinks }, { data: subcatLinks }, { data: cityLinks }] = await Promise.all([
      supabase.from("generic_video_pois" as any).select("generic_video_id, start_time, end_time") as any,
      supabase.from("generic_video_businesses" as any).select("generic_video_id, start_time, end_time") as any,
      supabase.from("generic_video_destinations" as any).select("generic_video_id, start_time, end_time") as any,
      supabase.from("generic_video_badges" as any).select("generic_video_id") as any,
      supabase.from("generic_video_subcategories" as any).select("generic_video_id") as any,
      supabase.from("generic_video_cities" as any).select("generic_video_id") as any,
    ]);
    const pc: Record<string, number> = {};
    const tf: Record<string, boolean> = {};
    ((poiLinks as any[]) || []).forEach((l: any) => { pc[l.generic_video_id] = (pc[l.generic_video_id] || 0) + 1; if (l.start_time != null || l.end_time != null) tf[l.generic_video_id] = true; });
    setVideoPoiCounts(pc);
    const bc: Record<string, number> = {};
    ((bizLinks as any[]) || []).forEach((l: any) => { bc[l.generic_video_id] = (bc[l.generic_video_id] || 0) + 1; if (l.start_time != null || l.end_time != null) tf[l.generic_video_id] = true; });
    setVideoBizCounts(bc);
    const dc: Record<string, number> = {};
    ((destLinks as any[]) || []).forEach((l: any) => { dc[l.generic_video_id] = (dc[l.generic_video_id] || 0) + 1; if (l.start_time != null || l.end_time != null) tf[l.generic_video_id] = true; });
    setVideoDestCounts(dc);
    const bad: Record<string, number> = {};
    ((badgeLinks as any[]) || []).forEach((l: any) => { bad[l.generic_video_id] = (bad[l.generic_video_id] || 0) + 1; });
    setVideoBadgeCounts(bad);
    const sc: Record<string, number> = {};
    ((subcatLinks as any[]) || []).forEach((l: any) => { sc[l.generic_video_id] = (sc[l.generic_video_id] || 0) + 1; });
    setVideoSubcatCounts(sc);
    const cc: Record<string, number> = {};
    ((cityLinks as any[]) || []).forEach((l: any) => { cc[l.generic_video_id] = (cc[l.generic_video_id] || 0) + 1; });
    setVideoCityCounts(cc);
    setVideoHasTimeframes(tf);
  }, []);

  const loadPanelItems = useCallback(async (videoId: string) => {
    setPanelLoading(true);
    const [{ data: poiLinks }, { data: bizLinks }, { data: destLinks }] = await Promise.all([
      supabase.from("generic_video_pois" as any).select("poi_id, sort_order, start_time, end_time").eq("generic_video_id", videoId) as unknown as { data: any[] | null },
      supabase.from("generic_video_businesses" as any).select("business_id, sort_order, start_time, end_time").eq("generic_video_id", videoId) as unknown as { data: any[] | null },
      supabase.from("generic_video_destinations" as any).select("destination_id, sort_order, start_time, end_time").eq("generic_video_id", videoId) as unknown as { data: any[] | null },
    ]);

    const items: LinkedItemWithTime[] = [];

    if (poiLinks && poiLinks.length > 0) {
      const poiIds = poiLinks.map((l: any) => l.poi_id);
      const { data: pois } = await supabase.from("businesses").select("id, name").in("id", poiIds);
      const nameMap: Record<string, string> = {};
      (pois || []).forEach((p: any) => { nameMap[p.id] = p.name; });
      poiLinks.forEach((l: any) => {
        if (nameMap[l.poi_id]) items.push({ id: l.poi_id, name: nameMap[l.poi_id], type: "poi", start_time: l.start_time, end_time: l.end_time, sort_order: l.sort_order ?? 0 });
      });
    }

    if (bizLinks && bizLinks.length > 0) {
      const bizIds = bizLinks.map((l: any) => l.business_id);
      const { data: biz } = await supabase.from("businesses").select("id, name").in("id", bizIds);
      const nameMap: Record<string, string> = {};
      (biz || []).forEach((b: any) => { nameMap[b.id] = b.name; });
      bizLinks.forEach((l: any) => {
        if (nameMap[l.business_id]) items.push({ id: l.business_id, name: nameMap[l.business_id], type: "business", start_time: l.start_time, end_time: l.end_time, sort_order: l.sort_order ?? 0 });
      });
    }

    if (destLinks && destLinks.length > 0) {
      const destIds = destLinks.map((l: any) => l.destination_id);
      const { data: dests } = await supabase.from("destinations").select("id, name_fr").in("id", destIds);
      const nameMap: Record<string, string> = {};
      (dests || []).forEach((d: any) => { nameMap[d.id] = d.name_fr; });
      destLinks.forEach((l: any) => {
        if (nameMap[l.destination_id]) items.push({ id: l.destination_id, name: nameMap[l.destination_id], type: "destination", start_time: l.start_time, end_time: l.end_time, sort_order: l.sort_order ?? 0 });
      });
    }

    items.sort((a, b) => a.sort_order - b.sort_order);
    setPanelItems(items);
    setPanelItemsInitial(JSON.stringify(items));
    setPanelLoading(false);
  }, []);

  useEffect(() => {
    loadVideos();
    loadCounts();
  }, [loadVideos, loadCounts]);

  useEffect(() => {
    if (selectedVideo) loadPanelItems(selectedVideo.id);
  }, [selectedVideo, loadPanelItems]);

  const handleSelectVideo = useCallback((v: GenericVideo) => {
    setSelectedVideo(prev => prev?.id === v.id ? null : v);
    setPoiVideo(null); setBusinessVideo(null); setDestinationVideo(null);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!uploadedUrl) return;
    setCreating(true);
    const nextOrder = videos.length > 0 ? Math.max(...videos.map(v => v.sort_order)) + 1 : 0;

    // Auto-generate thumbnail (YouTube/Vimeo/hosted) — never blocking the insert.
    let thumbnailUrl: string | null = null;
    try {
      const { resolveVideoThumbnailUrl } = await import("@/lib/videoThumbnail");
      thumbnailUrl = await resolveVideoThumbnailUrl(uploadedUrl, "generic");
    } catch (e) {
      console.warn("[generic-video] thumbnail generation failed:", e);
    }

    const { error } = await supabase
      .from("generic_videos" as any)
      .insert({ url: uploadedUrl, sort_order: nextOrder, thumbnail_url: thumbnailUrl } as any);
    if (error) toast.error(error.message);
    else { toast.success(thumbnailUrl ? "Vidéo générique ajoutée + vignette générée" : "Vidéo générique ajoutée (vignette à générer manuellement)"); setUploadedUrl(""); await loadVideos(); }
    setCreating(false);
  }, [uploadedUrl, videos, loadVideos]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = videos.findIndex(v => v.id === active.id);
    const newIndex = videos.findIndex(v => v.id === over.id);
    const reordered = arrayMove(videos, oldIndex, newIndex);
    setVideos(reordered);
    await Promise.all(reordered.map((v, i) => supabase.from("generic_videos" as any).update({ sort_order: i } as any).eq("id", v.id)));
  }, [videos]);

  const handlePanelReorder = useCallback((items: LinkedItemWithTime[]) => {
    setPanelItems(items);
  }, []);

  const handlePanelTimeChange = useCallback((id: string, field: "start_time" | "end_time", val: number | null) => {
    setPanelItems(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
  }, []);

  const handlePanelRemoveItem = useCallback(async (item: LinkedItemWithTime) => {
    if (!selectedVideo) return;
    if (!confirm(`Retirer « ${item.name} » de cette vidéo ? L'entité ne sera pas supprimée.`)) return;
    const table = item.type === "poi" ? "generic_video_pois" : item.type === "business" ? "generic_video_businesses" : "generic_video_destinations";
    const col = item.type === "poi" ? "poi_id" : item.type === "business" ? "business_id" : "destination_id";
    const { error } = await (supabase as any).from(table).delete().eq("generic_video_id", selectedVideo.id).eq(col, item.id);
    if (error) { toast.error(error.message); return; }
    setPanelItems(prev => {
      const next = prev.filter(i => !(i.id === item.id && i.type === item.type));
      setPanelItemsInitial(JSON.stringify(next));
      return next;
    });
    loadCounts();
    toast.success("Liaison retirée");
  }, [selectedVideo, loadCounts]);

  const panelIsDirty = JSON.stringify(panelItems) !== panelItemsInitial;

  const handlePanelSave = useCallback(async () => {
    if (!selectedVideo) return;
    setPanelSaving(true);

    const poiItems = panelItems.filter(i => i.type === "poi");
    const bizItems = panelItems.filter(i => i.type === "business");
    const destItems = panelItems.filter(i => i.type === "destination");

    await Promise.all([
      ...poiItems.map((item, i) =>
        supabase.from("generic_video_pois" as any).update({ sort_order: panelItems.indexOf(item), start_time: item.start_time, end_time: item.end_time } as any).eq("generic_video_id", selectedVideo.id).eq("poi_id", item.id)
      ),
      ...bizItems.map((item, i) =>
        supabase.from("generic_video_businesses" as any).update({ sort_order: panelItems.indexOf(item), start_time: item.start_time, end_time: item.end_time } as any).eq("generic_video_id", selectedVideo.id).eq("business_id", item.id)
      ),
      ...destItems.map((item, i) =>
        supabase.from("generic_video_destinations" as any).update({ sort_order: panelItems.indexOf(item), start_time: item.start_time, end_time: item.end_time } as any).eq("generic_video_id", selectedVideo.id).eq("destination_id", item.id)
      ),
    ]);

    toast.success("Ordre et time frames enregistrés");
    setPanelItemsInitial(JSON.stringify(panelItems));
    setPanelSaving(false);
  }, [selectedVideo, panelItems]);

  const hasRightPanel = !!(selectedVideo || poiVideo || businessVideo || destinationVideo || tagsVideo);

  const closeAllPanels = useCallback(() => {
    setSelectedVideo(null);
    setPoiVideo(null);
    setBusinessVideo(null);
    setDestinationVideo(null);
    setTagsVideo(null);
  }, []);

  return (
    <div className="flex" style={{ height: "100vh" }}>
      {/* Left: video grid */}
      <div
        className={cn("flex-1 space-y-6 pt-4 pr-4 overflow-y-auto", hasRightPanel && "w-1/2")}
        onClickCapture={(e) => {
          if (!hasRightPanel) return;
          closeAllPanels();
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Upload zone */}
        <div className="max-w-2xl space-y-3">
          <VideoUploader videoUrl={uploadedUrl} onChange={setUploadedUrl} businessId="generic" />
          {uploadedUrl && (
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Upload className="h-4 w-4 mr-2" />Ajouter comme vidéo générique
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : videos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucune vidéo générique</p>
        ) : (() => {
          const igAccounts = Array.from(new Set(videos.map(v => v.instagram_account).filter((s): s is string => !!s && !!s.trim()))).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
          const ttAccounts = Array.from(new Set(videos.map(v => v.tiktok_account).filter((s): s is string => !!s && !!s.trim()))).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
          const ytAccounts = Array.from(new Set(videos.map(v => v.youtube_account).filter((s): s is string => !!s && !!s.trim()))).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
          const filteredVideos = videos.filter(v =>
            (filterIg === ALL_SOCIAL || v.instagram_account === filterIg) &&
            (filterTt === ALL_SOCIAL || v.tiktok_account === filterTt) &&
            (filterYt === ALL_SOCIAL || v.youtube_account === filterYt)
          );
          return (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">{filteredVideos.length}/{videos.length} vidéo{videos.length > 1 ? "s" : ""} • Cliquez pour voir les entités liées</p>
              <VideoIdSearchInput videoIds={filteredVideos.map(v => v.id)} />
              <ImportFromBusinessDocInput
                onImported={loadVideos}
                getNextSortOrder={() => (videos.length > 0 ? Math.max(...videos.map(v => v.sort_order)) + 1 : 0)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">Nom social :</span>
              <Select value={filterIg} onValueChange={setFilterIg}>
                <SelectTrigger className="h-7 text-xs w-[180px]"><SelectValue placeholder="Instagram" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SOCIAL}>Instagram — Tous</SelectItem>
                  {igAccounts.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterTt} onValueChange={setFilterTt}>
                <SelectTrigger className="h-7 text-xs w-[180px]"><SelectValue placeholder="TikTok" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SOCIAL}>TikTok — Tous</SelectItem>
                  {ttAccounts.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterYt} onValueChange={setFilterYt}>
                <SelectTrigger className="h-7 text-xs w-[180px]"><SelectValue placeholder="YouTube" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SOCIAL}>YouTube — Tous</SelectItem>
                  {ytAccounts.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              {(filterIg !== ALL_SOCIAL || filterTt !== ALL_SOCIAL || filterYt !== ALL_SOCIAL) && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setFilterIg(ALL_SOCIAL); setFilterTt(ALL_SOCIAL); setFilterYt(ALL_SOCIAL); }}>
                  Réinitialiser
                </Button>
              )}
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredVideos.map(v => v.id)} strategy={rectSortingStrategy}>
                <div className="flex flex-wrap gap-4">
                  {filteredVideos.map(video => (
                    <div key={video.id} style={{ width: 260 }}>
                      <SortableVideoCard
                        video={video}
                        poiCount={videoPoiCounts[video.id] || 0}
                        bizCount={videoBizCounts[video.id] || 0}
                        destCount={videoDestCounts[video.id] || 0}
                        badgeCount={videoBadgeCounts[video.id] || 0}
                        subcatCount={videoSubcatCounts[video.id] || 0}
                        cityCount={videoCityCounts[video.id] || 0}
                        hasTimeframes={!!videoHasTimeframes[video.id]}
                        isSelected={selectedVideo?.id === video.id}
                        onSelect={handleSelectVideo}
                        onPreview={setLightboxUrl}
                        onEditSocial={setSocialVideo}
                        onEditDescription={setDescVideo}
                        onEditPois={(v) => { setSelectedVideo(null); setBusinessVideo(null); setDestinationVideo(null); setTagsVideo(null); setPoiVideo(v); }}
                        onEditBusinesses={(v) => { setSelectedVideo(null); setPoiVideo(null); setDestinationVideo(null); setTagsVideo(null); setBusinessVideo(v); }}
                        onEditDestinations={(v) => { setSelectedVideo(null); setPoiVideo(null); setBusinessVideo(null); setTagsVideo(null); setDestinationVideo(v); }}
                        onEditTags={(v) => { setSelectedVideo(null); setPoiVideo(null); setBusinessVideo(null); setDestinationVideo(null); setTagsVideo(v); }}
                        onPreviewOverlay={setPreviewOverlayVideo}
                        onDelete={setDeleteConfirmVideo}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
          );
        })()}
      </div>

      {/* Right: detail panel (only one at a time) */}
      {selectedVideo && (
        <div className="w-1/2 sticky top-0 h-full overflow-hidden border-l bg-card">
          {panelLoading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <RightDetailPanel
              video={selectedVideo}
              onClose={() => setSelectedVideo(null)}
              items={panelItems}
              onReorder={handlePanelReorder}
              onTimeChange={handlePanelTimeChange}
              onSave={handlePanelSave}
              saving={panelSaving}
              isDirty={panelIsDirty}
              onEditSocial={setSocialVideo}
              onEditDescription={setDescVideo}
              onRemoveItem={handlePanelRemoveItem}
            />
          )}
        </div>
      )}
      {poiVideo && (
        <div className="w-1/2 sticky top-0 h-full overflow-hidden border-l bg-card">
          <InlinePoiAssignment video={poiVideo} onClose={() => setPoiVideo(null)} onSaved={() => { loadCounts(); }} />
        </div>
      )}
      {businessVideo && (
        <div className="w-1/2 sticky top-0 h-full overflow-hidden border-l bg-card">
          <InlineBusinessAssignment video={businessVideo} onClose={() => setBusinessVideo(null)} onSaved={() => { loadCounts(); }} />
        </div>
      )}
      {destinationVideo && (
        <div className="w-1/2 sticky top-0 h-full overflow-hidden border-l bg-card">
          <InlineDestinationCityAssignment video={destinationVideo} onClose={() => setDestinationVideo(null)} onSaved={() => { loadCounts(); }} />
        </div>
      )}
      {tagsVideo && (
        <div className="w-1/2 sticky top-0 h-full overflow-hidden border-l bg-card">
          <InlineBadgeSubcatCityAssignment video={tagsVideo} onClose={() => setTagsVideo(null)} onSaved={() => { loadCounts(); }} />
        </div>
      )}

      {lightboxUrl && <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      {socialVideo && <SocialLinksDialog video={socialVideo} open={!!socialVideo} onOpenChange={(o) => !o && setSocialVideo(null)} onSaved={loadVideos} />}
      {descVideo && <DescriptionDialog video={descVideo} open={!!descVideo} onOpenChange={(o) => !o && setDescVideo(null)} onSaved={loadVideos} />}
      {previewOverlayVideo && <GenericVideoPreviewOverlay video={previewOverlayVideo} onClose={() => setPreviewOverlayVideo(null)} />}

      <AlertDialog open={!!deleteConfirmVideo} onOpenChange={(o) => !o && !deleting && setDeleteConfirmVideo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette vidéo générique ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmVideo?.name || deleteConfirmVideo?.title || "Vidéo sans nom"}
              <br />
              Cette action est <strong>définitive</strong> et supprimera également tous les liens associés (POIs, établissements, destinations, badges, sous-catégories, villes).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!deleteConfirmVideo) return;
                setDeleting(true);
                const { error } = await supabase.from("generic_videos" as any).delete().eq("id", deleteConfirmVideo.id);
                setDeleting(false);
                if (error) {
                  toast.error(error.message);
                } else {
                  toast.success("Vidéo supprimée");
                  if (selectedVideo?.id === deleteConfirmVideo.id) setSelectedVideo(null);
                  setDeleteConfirmVideo(null);
                  await loadVideos();
                  await loadCounts();
                }
              }}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GenericVideosPanel;
