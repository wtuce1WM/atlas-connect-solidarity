import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, ExternalLink, MapPin, Link2, Plus, X, GripVertical, Monitor, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface FrontStructureEntry {
  id: string;
  name: string;
  subcategoryNames: string[];
  serviceNames: string[];
}

interface VideoDoc {
  id: string;
  url: string;
  name: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  business_id: string;
  business_name: string;
  business_logo: string | null;
  business_categories: string[];
  business_services: string[];
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
  onPlay,
}: {
  video: VideoDoc;
  index: number;
  onRemove: (id: string) => void;
  onNavigate: (businessId: string) => void;
  onPlay: (url: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col rounded-md border bg-background overflow-hidden text-xs">
      <button className="relative aspect-video bg-black group" onClick={() => onPlay(video.url)}>
        <div {...attributes} {...listeners} onClick={(e) => e.stopPropagation()} className="absolute top-1 left-1 z-10 cursor-grab active:cursor-grabbing text-white/80 hover:text-white bg-black/40 rounded p-0.5">
          <GripVertical className="h-3 w-3" />
        </div>
        <span className="absolute top-1 left-7 z-10 text-white/80 text-[10px] font-mono bg-black/40 rounded px-1">{index + 1}</span>
        <div onClick={(e) => { e.stopPropagation(); onRemove(video.id); }} className="absolute top-1 right-1 z-10 text-white/80 hover:text-destructive bg-black/40 rounded p-0.5 cursor-pointer">
          <X className="h-3 w-3" />
        </div>
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
      <button
        onClick={() => onNavigate(video.business_id)}
        className="px-1.5 py-1 truncate hover:text-primary transition-colors text-left text-[10px]"
      >
        {video.business_name}
      </button>
    </div>
  );
};

const DestinationVideosPanel = ({ cityName }: DestinationVideosPanelProps) => {
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [frontVideos, setFrontVideos] = useState<VideoDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [frontStructures, setFrontStructures] = useState<FrontStructureEntry[]>([]);
  const [selectedStructure, setSelectedStructure] = useState<string>("all");
  const navigate = useNavigate();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Load front_structure entries with their matching category ids
  useEffect(() => {
    const loadStructures = async () => {
      const [{ data: structures }, { data: scLinks }, { data: subcats }, { data: svcLinks }, { data: services }] = await Promise.all([
        supabase.from("front_structure").select("id, name, sort_order").order("sort_order"),
        supabase.from("front_structure_subcategories").select("front_structure_id, subcategory_id"),
        supabase.from("subcategories").select("id, name_fr"),
        supabase.from("front_structure_services" as any).select("front_structure_id, service_id"),
        supabase.from("services").select("id, name_fr"),
      ]);
      if (structures && scLinks && subcats) {
        const scNameMap = new Map((subcats as any[]).map((sc) => [sc.id, sc.name_fr]));
        const svcNameMap = new Map(((services || []) as any[]).map((s) => [s.id, s.name_fr]));
        const scByEntry: Record<string, string[]> = {};
        (scLinks as any[]).forEach((l) => {
          const name = scNameMap.get(l.subcategory_id);
          if (name) {
            if (!scByEntry[l.front_structure_id]) scByEntry[l.front_structure_id] = [];
            scByEntry[l.front_structure_id].push(name);
          }
        });
        const svcByEntry: Record<string, string[]> = {};
        ((svcLinks || []) as any[]).forEach((l) => {
          const name = svcNameMap.get(l.service_id);
          if (name) {
            if (!svcByEntry[l.front_structure_id]) svcByEntry[l.front_structure_id] = [];
            svcByEntry[l.front_structure_id].push(name);
          }
        });
        setFrontStructures(
          (structures as any[]).map((s) => ({
            id: s.id,
            name: s.name,
            subcategoryNames: scByEntry[s.id] || [],
            serviceNames: svcByEntry[s.id] || [],
          }))
        );
      }
    };
    loadStructures();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    // Helper: paginated fetch
    const fetchAll = async (query: any) => {
      const all: any[] = [];
      let offset = 0;
      const batch = 1000;
      while (true) {
        const { data, error } = await query.range(offset, offset + batch - 1);
        if (error || !data || data.length === 0) break;
        all.push(...data);
        if (data.length < batch) break;
        offset += batch;
      }
      return all;
    };

    // 1. Get all business ids in this city
    const cityBusinesses = await fetchAll(
      supabase.from("businesses").select("id").eq("city", cityName)
    );

    if (cityBusinesses.length === 0) {
      setVideos([]);
      setFrontVideos([]);
      setLoading(false);
      return;
    }

    const cityBusinessIds = cityBusinesses.map((b: any) => b.id);

    // 2. Fetch all videos owned by those businesses (paginated, batched in() calls)
    const docs: any[] = [];
    const inBatch = 300; // Supabase in() limit safe batch
    for (let i = 0; i < cityBusinessIds.length; i += inBatch) {
      const chunk = cityBusinessIds.slice(i, i + inBatch);
      const chunkDocs = await fetchAll(
        supabase
          .from("business_documents")
          .select("id, url, name, thumbnail_url, sort_order, business_id, poi_id, linked_business_id, show_on_front, front_sort_order, subcategory_id")
          .eq("type", "video")
          .in("business_id", chunk)
          .order("sort_order", { ascending: true })
      );
      docs.push(...chunkDocs);
    }

    if (docs.length > 0) {
      const allIds = new Set<string>();
      docs.forEach((d: any) => {
        allIds.add(d.business_id);
        if (d.poi_id) allIds.add(d.poi_id);
        if (d.linked_business_id) allIds.add(d.linked_business_id);
      });

      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name, logo_url, slug, categories, services")
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
          business_categories: owner?.categories || [],
          business_services: owner?.services || [],
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

  // Filter videos by selected front structure, then sort alphabetically by business name
  const filteredVideos = (selectedStructure === "all"
    ? videos
    : (() => {
        const entry = frontStructures.find((s) => s.id === selectedStructure);
        if (!entry || (entry.subcategoryNames.length === 0 && entry.serviceNames.length === 0)) return [];
        const scSet = new Set(entry.subcategoryNames);
        const svcSet = new Set(entry.serviceNames);
        return videos.filter((v) =>
          v.business_categories.some((c) => scSet.has(c)) ||
          v.business_services.some((s) => svcSet.has(s))
        );
      })()
  ).slice().sort((a, b) => a.business_name.localeCompare(b.business_name, 'fr'));

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
      const frontIdSet = new Set(frontVideos.map((v) => v.id));
      // Reset non-front videos in batches of 200
      const idsToReset = videos.map((v) => v.id).filter((id) => !frontIdSet.has(id));
      const batchSize = 200;
      for (let i = 0; i < idsToReset.length; i += batchSize) {
        const chunk = idsToReset.slice(i, i + batchSize);
        await supabase
          .from("business_documents")
          .update({ show_on_front: false, front_sort_order: 0 } as any)
          .in("id", chunk);
      }
      // Set selected ones sequentially to avoid overwhelming
      for (let i = 0; i < frontVideos.length; i++) {
        await supabase
          .from("business_documents")
          .update({ show_on_front: true, front_sort_order: i } as any)
          .eq("id", frontVideos[i].id);
      }
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
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={selectedStructure} onValueChange={setSelectedStructure}>
              <SelectTrigger className="h-7 w-52 text-xs">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {frontStructures.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            {filteredVideos.length} vidéo{filteredVideos.length > 1 ? "s" : ""}
            {selectedStructure !== "all" && ` / ${videos.length} au total`}
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredVideos.map((v) => {
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

          <div className="p-2 max-h-[calc(100vh-6rem)] overflow-y-auto">
            {frontVideos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Cliquez sur <Plus className="inline h-3 w-3" /> sur une vidéo pour l'ajouter ici
              </p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={frontVideos.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                  <div className="grid grid-cols-2 gap-1.5">
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
