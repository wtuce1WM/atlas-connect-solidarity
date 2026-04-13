import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, Upload, Copy, Check, FileText, Instagram, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
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
        instagram_account: ig.account || null,
        instagram_url: ig.url || null,
        instagram_video_url: ig.videoUrl || null,
        tiktok_account: tt.account || null,
        tiktok_url: tt.url || null,
        tiktok_video_url: tt.videoUrl || null,
        youtube_account: yt.account || null,
        youtube_url: yt.url || null,
        youtube_video_url: yt.videoUrl || null,
      } as any)
      .eq("id", video.id);
    if (error) toast.error(error.message);
    else { toast.success("Liens sociaux enregistrés"); onSaved(); onOpenChange(false); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Liens sociaux</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Instagram */}
          <div className="space-y-2 p-3 rounded-lg border">
            <Label className="font-semibold flex items-center gap-1.5"><Instagram className="h-4 w-4" /> Instagram</Label>
            <Input placeholder="Compte (@…)" value={ig.account} onChange={e => setIg(p => ({ ...p, account: e.target.value }))} />
            <Input placeholder="URL du profil" value={ig.url} onChange={e => setIg(p => ({ ...p, url: e.target.value }))} />
            <Input placeholder="URL de la vidéo Instagram" value={ig.videoUrl} onChange={e => setIg(p => ({ ...p, videoUrl: e.target.value }))} />
          </div>
          {/* TikTok */}
          <div className="space-y-2 p-3 rounded-lg border">
            <Label className="font-semibold flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78c.29 0 .58.04.86.11V9a6.27 6.27 0 0 0-.86-.06A6.33 6.33 0 0 0 3.16 15.3a6.33 6.33 0 0 0 6.33 6.33c3.5 0 6.33-2.84 6.33-6.33V9.14a8.16 8.16 0 0 0 4.77 1.52V7.21a4.85 4.85 0 0 1-1-.52Z"/></svg>
              TikTok
            </Label>
            <Input placeholder="Compte (@…)" value={tt.account} onChange={e => setTt(p => ({ ...p, account: e.target.value }))} />
            <Input placeholder="URL du profil" value={tt.url} onChange={e => setTt(p => ({ ...p, url: e.target.value }))} />
            <Input placeholder="URL de la vidéo TikTok" value={tt.videoUrl} onChange={e => setTt(p => ({ ...p, videoUrl: e.target.value }))} />
          </div>
          {/* YouTube */}
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
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Description (RichText) dialog ─── */
const DescriptionDialog = ({
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
  const [desc, setDesc] = useState(video.description || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("generic_videos" as any)
      .update({ description: desc || null } as any)
      .eq("id", video.id);
    if (error) toast.error(error.message);
    else { toast.success("Description enregistrée"); onSaved(); onOpenChange(false); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Description de la vidéo</DialogTitle>
        </DialogHeader>
        <RichTextEditor content={desc} onChange={setDesc} maxHeight="400px" />
        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── POI assignment dialog ─── */
interface PoiBiz { id: string; name: string; neighborhood: string | null; city: string | null; }

const PoiAssignDialog = ({
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
  const [poiBusinesses, setPoiBusinesses] = useState<PoiBiz[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [initialIds, setInitialIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: pois }, { data: links }] = await Promise.all([
        supabase.from("businesses").select("id, name, neighborhood, city").eq("is_poi", true).eq("is_active", true).order("city").order("neighborhood").order("name"),
        supabase.from("generic_video_pois" as any).select("poi_id").eq("generic_video_id", video.id),
      ]);
      setPoiBusinesses((pois as PoiBiz[]) || []);
      const ids = ((links as any[]) || []).map((l: any) => l.poi_id);
      setSelectedIds(ids);
      setInitialIds(ids);
      setLoading(false);
    };
    load();
  }, [video.id]);

  const togglePoi = (poiId: string) => {
    setSelectedIds(prev =>
      prev.includes(poiId) ? prev.filter(id => id !== poiId) : [...prev, poiId]
    );
  };

  const toggleGroup = (pois: PoiBiz[]) => {
    const ids = pois.map(p => p.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const isDirty = JSON.stringify([...selectedIds].sort()) !== JSON.stringify([...initialIds].sort());

  const save = async () => {
    setSaving(true);
    const toAdd = selectedIds.filter(id => !initialIds.includes(id));
    const toRemove = initialIds.filter(id => !selectedIds.includes(id));

    if (toRemove.length > 0) {
      await supabase.from("generic_video_pois" as any).delete().eq("generic_video_id", video.id).in("poi_id", toRemove);
    }
    if (toAdd.length > 0) {
      await supabase.from("generic_video_pois" as any).insert(
        toAdd.map(poi_id => ({ generic_video_id: video.id, poi_id })) as any
      );
    }
    
    toast.success("POI enregistrés");
    setInitialIds([...selectedIds]);
    onSaved();
    onOpenChange(false);
    setSaving(false);
  };

  // Filter by search
  const filtered = poiBusinesses.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.city || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.neighborhood || "").toLowerCase().includes(search.toLowerCase())
  );

  // Group by city then neighborhood
  const grouped = useMemo(() => {
    const cityMap: Record<string, Record<string, PoiBiz[]>> = {};
    filtered.forEach(p => {
      const city = p.city || "Sans ville";
      const nb = p.neighborhood || "Sans quartier";
      if (!cityMap[city]) cityMap[city] = {};
      if (!cityMap[city][nb]) cityMap[city][nb] = [];
      cityMap[city][nb].push(p);
    });
    return Object.entries(cityMap).map(([city, neighborhoods]) => ({
      city,
      neighborhoods: Object.entries(neighborhoods),
    }));
  }, [filtered]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Points d'intérêt
            <span className="text-xs font-normal text-muted-foreground">
              ({selectedIds.length} sélectionné{selectedIds.length > 1 ? "s" : ""})
            </span>
          </DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Rechercher un POI, ville ou quartier…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 max-h-[55vh] pr-1">
            {grouped.map(({ city, neighborhoods }) => (
              <div key={city}>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{city}</p>
                <div className="space-y-3 pl-1">
                  {neighborhoods.map(([neighborhood, pois]) => {
                    const ids = pois.map(p => p.id);
                    const allSelected = ids.every(id => selectedIds.includes(id));
                    const someSelected = !allSelected && ids.some(id => selectedIds.includes(id));

                    return (
                      <div key={neighborhood}>
                        <div className="mb-1 flex items-center gap-2">
                          <Checkbox
                            checked={allSelected ? true : someSelected ? "indeterminate" : false}
                            onCheckedChange={() => toggleGroup(pois)}
                            className="h-3.5 w-3.5 shrink-0"
                          />
                          <button
                            type="button"
                            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => toggleGroup(pois)}
                          >
                            {neighborhood}
                            <span className="text-[10px] opacity-60">({ids.length})</span>
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {pois.map(poi => {
                            const isSelected = selectedIds.includes(poi.id);
                            return (
                              <Badge
                                key={poi.id}
                                variant={isSelected ? "default" : "outline"}
                                className="cursor-pointer transition-colors"
                                onClick={() => togglePoi(poi.id)}
                              >
                                {poi.name}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {grouped.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun POI trouvé</p>
            )}
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">{selectedIds.length} sélectionné{selectedIds.length > 1 ? "s" : ""}</span>
          <Button onClick={save} disabled={saving || !isDirty}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Sortable video card ─── */
const SortableVideoCard = ({
  video,
  poiNames,
  onPreview,
  onEditSocial,
  onEditDescription,
  onEditPois,
}: {
  video: GenericVideo;
  poiNames: string[];
  onPreview: (url: string) => void;
  onEditSocial: (v: GenericVideo) => void;
  onEditDescription: (v: GenericVideo) => void;
  onEditPois: (v: GenericVideo) => void;
})  => {
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
  const hasSocial = video.instagram_account || video.tiktok_account || video.youtube_account;
  const hasDesc = video.description && video.description.replace(/<[^>]*>/g, "").trim().length > 0;

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

        {/* TXT button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEditDescription(video); }}
          className={cn(
            "absolute bottom-2 right-2 z-10 px-2 py-1 rounded text-[10px] font-bold transition-opacity",
            hasDesc
              ? "bg-primary text-primary-foreground"
              : "bg-background/80 text-muted-foreground border border-border/50 opacity-0 group-hover:opacity-100"
          )}
        >
          TXT
        </button>
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

        {/* Social badges */}
        {hasSocial && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {video.instagram_account && <Badge variant="outline" className="text-[10px] px-1.5 py-0">IG: {video.instagram_account}</Badge>}
            {video.tiktok_account && <Badge variant="outline" className="text-[10px] px-1.5 py-0">TT: {video.tiktok_account}</Badge>}
            {video.youtube_account && <Badge variant="outline" className="text-[10px] px-1.5 py-0">YT: {video.youtube_account}</Badge>}
          </div>
        )}

        {/* Edit social links button */}
        <button
          type="button"
          onClick={() => onEditSocial(video)}
          className="text-[10px] text-primary hover:underline"
        >
          {hasSocial ? "Modifier les liens sociaux" : "+ Ajouter des liens sociaux"}
        </button>

        {/* POI badges */}
        {poiNames.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {poiNames.slice(0, 3).map((name, i) => (
              <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0">
                <MapPin className="h-2.5 w-2.5 mr-0.5" />{name}
              </Badge>
            ))}
            {poiNames.length > 3 && (
              <Badge variant="outline" className="text-[9px] px-1 py-0">+{poiNames.length - 3}</Badge>
            )}
          </div>
        )}

        {/* Edit POIs button */}
        <button
          type="button"
          onClick={() => onEditPois(video)}
          className="text-[10px] text-primary hover:underline"
        >
          {poiNames.length > 0 ? `${poiNames.length} POI • Modifier` : "+ Ajouter des POI"}
        </button>
      </div>

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded bg-background/80 border border-border/50 text-[10px] text-muted-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ⠿
      </div>
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
  const [videoPoiMap, setVideoPoiMap] = useState<Record<string, string[]>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadVideos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("generic_videos" as any)
      .select("*")
      .order("sort_order", { ascending: true });
    setVideos((data as unknown as GenericVideo[]) || []);
    setLoading(false);
  }, []);

  const loadPoiMap = useCallback(async () => {
    const { data: links } = await supabase
      .from("generic_video_pois" as any)
      .select("generic_video_id, poi_id") as { data: any[] | null };
    if (!links || links.length === 0) { setVideoPoiMap({}); return; }
    const poiIds = [...new Set(links.map((l: any) => l.poi_id))];
    const { data: pois } = await supabase
      .from("points_of_interest")
      .select("id, name_fr")
      .in("id", poiIds);
    const nameMap: Record<string, string> = {};
    (pois || []).forEach((p: any) => { nameMap[p.id] = p.name_fr; });
    const map: Record<string, string[]> = {};
    links.forEach((l: any) => {
      if (!map[l.generic_video_id]) map[l.generic_video_id] = [];
      if (nameMap[l.poi_id]) map[l.generic_video_id].push(nameMap[l.poi_id]);
    });
    setVideoPoiMap(map);
  }, []);

  useEffect(() => {
    loadVideos();
    loadPoiMap();
  }, [loadVideos, loadPoiMap]);

  const handleCreate = useCallback(async () => {
    if (!uploadedUrl) return;
    setCreating(true);
    const nextOrder = videos.length > 0 ? Math.max(...videos.map(v => v.sort_order)) + 1 : 0;
    const { error } = await supabase
      .from("generic_videos" as any)
      .insert({ url: uploadedUrl, sort_order: nextOrder } as any);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Vidéo générique ajoutée");
      setUploadedUrl("");
      await loadVideos();
    }
    setCreating(false);
  }, [uploadedUrl, videos, loadVideos]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = videos.findIndex(v => v.id === active.id);
    const newIndex = videos.findIndex(v => v.id === over.id);
    const reordered = arrayMove(videos, oldIndex, newIndex);
    setVideos(reordered);

    await Promise.all(
      reordered.map((v, i) =>
        supabase.from("generic_videos" as any).update({ sort_order: i } as any).eq("id", v.id)
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
                      poiNames={videoPoiMap[video.id] || []}
                      onPreview={setLightboxUrl}
                      onEditSocial={setSocialVideo}
                      onEditDescription={setDescVideo}
                      onEditPois={setPoiVideo}
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

      {socialVideo && (
        <SocialLinksDialog
          video={socialVideo}
          open={!!socialVideo}
          onOpenChange={(o) => !o && setSocialVideo(null)}
          onSaved={loadVideos}
        />
      )}

      {descVideo && (
        <DescriptionDialog
          video={descVideo}
          open={!!descVideo}
          onOpenChange={(o) => !o && setDescVideo(null)}
          onSaved={loadVideos}
        />
      )}

      {poiVideo && (
        <PoiAssignDialog
          video={poiVideo}
          open={!!poiVideo}
          onOpenChange={(o) => !o && setPoiVideo(null)}
          onSaved={loadPoiMap}
        />
      )}
    </div>
  );
};

export default GenericVideosPanel;
