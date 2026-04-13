import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import VideoLightbox from "./VideoLightbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface VideoItem {
  id: string;
  url: string;
  name: string | null;
  thumbnail_url: string | null;
  business_name: string;
  subcategory_name: string;
  city: string | null;
  neighborhood: string | null;
  sort_order: number;
}

interface FsEntry {
  id: string;
  name: string;
  sort_order: number;
  subcategoryIds: Set<string>;
}

const ALL_VALUE = "__all__";

const SortableVideoCard = ({
  video,
  index,
  onPlay,
}: {
  video: VideoItem;
  index: number;
  onPlay: (url: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={{ ...style, width: 200 }} className="flex flex-col rounded-lg border bg-background overflow-hidden">
      <div className="flex items-center gap-1 px-1.5 pt-1">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
          <GripVertical className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{index + 1}</span>
      </div>
      <button
        className="relative bg-black group flex-shrink-0 w-full"
        style={{ height: 100 }}
        onClick={() => onPlay(video.url)}
      >
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-7 h-7 rounded-full bg-primary/80 flex items-center justify-center">
            <Play className="h-3.5 w-3.5 text-primary-foreground fill-primary-foreground ml-0.5" />
          </div>
        </div>
      </button>
      <div className="px-2 py-1.5">
        <p className="text-xs font-medium leading-tight truncate">{video.business_name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{video.subcategory_name}</p>
        {(video.city || video.neighborhood) && (
          <p className="text-[10px] text-muted-foreground/70 truncate">
            {[video.city, video.neighborhood].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
};

const FrontStructureVideosPanel = () => {
  const [loading, setLoading] = useState(true);
  const [fsEntries, setFsEntries] = useState<FsEntry[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [videoSubcategoryMap, setVideoSubcategoryMap] = useState<Map<string, string>>(new Map());
  const [cities, setCities] = useState<{ name: string; sort_order: number }[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>(ALL_VALUE);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(async () => {
    setLoading(true);

    const [fsRes, fssRes, citiesRes] = await Promise.all([
      supabase.from("front_structure").select("id, name, sort_order").order("sort_order"),
      supabase.from("front_structure_subcategories").select("front_structure_id, subcategory_id"),
      supabase.from("cities").select("name_fr, sort_order").eq("is_active", true).order("sort_order"),
    ]);

    const fsData = fsRes.data || [];
    const fssData = fssRes.data || [];
    setCities((citiesRes.data || []).map(c => ({ name: c.name_fr, sort_order: c.sort_order ?? 0 })));

    const fsSubMap = new Map<string, Set<string>>();
    for (const link of fssData) {
      if (!fsSubMap.has(link.front_structure_id)) fsSubMap.set(link.front_structure_id, new Set());
      fsSubMap.get(link.front_structure_id)!.add(link.subcategory_id);
    }

    const entries: FsEntry[] = fsData.map(fs => ({
      id: fs.id,
      name: fs.name,
      sort_order: fs.sort_order ?? 0,
      subcategoryIds: fsSubMap.get(fs.id) || new Set(),
    }));
    setFsEntries(entries);

    const allDocs: any[] = [];
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data } = await supabase
        .from("business_documents")
        .select("id, url, name, thumbnail_url, business_id, subcategory_id, city, neighborhood, sort_order")
        .eq("type", "video")
        .not("subcategory_id", "is", null)
        .order("sort_order", { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (!data || data.length === 0) break;
      allDocs.push(...data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }

    const subMap = new Map<string, string>();
    allDocs.forEach(d => { if (d.subcategory_id) subMap.set(d.id, d.subcategory_id); });
    setVideoSubcategoryMap(subMap);

    const bizIds = [...new Set(allDocs.map(d => d.business_id))];
    const bizMap = new Map<string, string>();
    for (let i = 0; i < bizIds.length; i += 200) {
      const batch = bizIds.slice(i, i + 200);
      const { data } = await supabase.from("businesses").select("id, name").in("id", batch);
      if (data) data.forEach(b => bizMap.set(b.id, b.name));
    }

    const scIds = [...new Set(allDocs.map(d => d.subcategory_id).filter(Boolean))] as string[];
    const scNameMap = new Map<string, string>();
    for (let i = 0; i < scIds.length; i += 200) {
      const batch = scIds.slice(i, i + 200);
      const { data } = await supabase.from("subcategories").select("id, name_fr").in("id", batch);
      if (data) data.forEach(sc => scNameMap.set(sc.id, sc.name_fr));
    }

    setVideos(allDocs.map(d => ({
      id: d.id,
      url: d.url,
      name: d.name,
      thumbnail_url: d.thumbnail_url,
      business_name: bizMap.get(d.business_id) || "—",
      subcategory_name: d.subcategory_id ? (scNameMap.get(d.subcategory_id) || "—") : "—",
      city: d.city || null,
      neighborhood: d.neighborhood || null,
      sort_order: d.sort_order ?? 0,
    })));

    setDirty(false);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredVideos = useMemo(() => {
    if (selectedCity === ALL_VALUE) return videos;
    return videos.filter(v => v.city === selectedCity);
  }, [videos, selectedCity]);

  const groupedVideos = useMemo(() => {
    const result = new Map<string, VideoItem[]>();
    for (const fs of fsEntries) {
      const matching = filteredVideos
        .filter(v => {
          const subId = videoSubcategoryMap.get(v.id);
          return subId && fs.subcategoryIds.has(subId);
        })
        .sort((a, b) => a.sort_order - b.sort_order);
      if (matching.length > 0) {
        result.set(fs.id, matching);
      }
    }
    return result;
  }, [filteredVideos, fsEntries, videoSubcategoryMap]);

  const videoCities = useMemo(() => {
    const citySet = new Set<string>();
    videos.forEach(v => { if (v.city) citySet.add(v.city); });
    const cityOrder = new Map(cities.map(c => [c.name, c.sort_order]));
    return [...citySet].sort((a, b) => (cityOrder.get(a) ?? 9999) - (cityOrder.get(b) ?? 9999));
  }, [videos, cities]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenSections(new Set(fsEntries.map(f => f.id)));
  const collapseAll = () => setOpenSections(new Set());

  const handleDragEnd = (fsId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sectionVideos = groupedVideos.get(fsId);
    if (!sectionVideos) return;

    const oldIndex = sectionVideos.findIndex(v => v.id === active.id);
    const newIndex = sectionVideos.findIndex(v => v.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sectionVideos, oldIndex, newIndex);

    // Update sort_order in local state
    setVideos(prev => {
      const updated = [...prev];
      reordered.forEach((v, i) => {
        const idx = updated.findIndex(u => u.id === v.id);
        if (idx !== -1) updated[idx] = { ...updated[idx], sort_order: i };
      });
      return updated;
    });
    setDirty(true);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      // Save per section
      for (const fs of fsEntries) {
        const sectionVids = groupedVideos.get(fs.id);
        if (!sectionVids) continue;
        for (let i = 0; i < sectionVids.length; i++) {
          await supabase
            .from("business_documents")
            .update({ sort_order: i } as any)
            .eq("id", sectionVids[i].id);
        }
      }
      toast.success("Ordre sauvegardé");
      setDirty(false);
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Ville :</span>
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Toutes les villes</SelectItem>
              {videoCities.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={expandAll} className="text-xs text-primary hover:underline">Tout ouvrir</button>
          <span className="text-muted-foreground">·</span>
          <button onClick={collapseAll} className="text-xs text-primary hover:underline">Tout fermer</button>
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={saveOrder} disabled={saving || !dirty}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Sauvegarder l'ordre
          </Button>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-muted-foreground">
        {groupedVideos.size} section{groupedVideos.size > 1 ? "s" : ""} ·{" "}
        {filteredVideos.length} vidéo{filteredVideos.length > 1 ? "s" : ""}
      </p>

      {/* Grouped sections */}
      {fsEntries.filter(fs => groupedVideos.has(fs.id)).map(fs => {
        const vids = groupedVideos.get(fs.id)!;
        const isOpen = openSections.has(fs.id);
        return (
          <Collapsible key={fs.id} open={isOpen} onOpenChange={() => toggleSection(fs.id)}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <span className="font-semibold text-sm">{fs.name}</span>
              <Badge variant="secondary" className="ml-2">{vids.length}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pb-1">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(fs.id)}>
                <SortableContext items={vids.map(v => v.id)} strategy={rectSortingStrategy}>
                  <div className="flex flex-wrap gap-3">
                    {vids.map((v, i) => (
                      <SortableVideoCard key={v.id} video={v} index={i} onPlay={setLightboxUrl} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {groupedVideos.size === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">Aucune vidéo trouvée pour cette sélection.</p>
      )}

      {lightboxUrl && <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
};

export default FrontStructureVideosPanel;
