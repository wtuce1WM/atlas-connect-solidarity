import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink, Play, Plus, X, GripVertical, Monitor, Filter } from "lucide-react";
import VideoLightbox from "./VideoLightbox";
import VideoThumbnail from "@/components/VideoThumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FrontStructureEntry {
  id: string;
  name: string;
  subcategoryNames: string[];
  serviceNames: string[];
}

interface BusinessItem {
  id: string;
  name: string;
  logo_url: string | null;
  city: string | null;
  categories: string[];
  services: string[];
  video_1_url: string | null;
  thumbnail_url: string | null;
}

interface BusinessVideoItem {
  id: string;
  business_id: string;
  business_name: string;
  city: string | null;
  categories: string[];
  services: string[];
  video_url: string;
  thumbnail_url: string | null;
  sort_order: number;
}

interface HomepageBusinessesPanelProps {
  cityName: string;
}

/* ── Sortable card for the right panel ── */
const SortableCard = ({
  biz, index, onRemove, onNavigate, onPlay,
}: {
  biz: BusinessItem; index: number;
  onRemove: (id: string) => void; onNavigate: (id: string) => void; onPlay: (url: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: biz.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const videoUrl = biz.video_1_url;

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col rounded-md border bg-background overflow-hidden text-xs">
      <button className="relative aspect-video bg-muted group" onClick={() => videoUrl && onPlay(videoUrl)}>
        <div {...attributes} {...listeners} onClick={(e) => e.stopPropagation()} className="absolute top-1 left-1 z-10 cursor-grab active:cursor-grabbing text-white/80 hover:text-white bg-black/40 rounded p-0.5">
          <GripVertical className="h-3 w-3" />
        </div>
        <span className="absolute top-1 left-7 z-10 text-white/80 text-[10px] font-mono bg-black/40 rounded px-1">{index + 1}</span>
        <div onClick={(e) => { e.stopPropagation(); onRemove(biz.id); }} className="absolute top-1 right-1 z-10 text-white/80 hover:text-destructive bg-black/40 rounded p-0.5 cursor-pointer">
          <X className="h-3 w-3" />
        </div>
        {biz.thumbnail_url ? (
          <img src={biz.thumbnail_url} alt={biz.name} className="w-full h-full object-cover" />
        ) : videoUrl ? (
          <VideoThumbnail src={videoUrl} alt={biz.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        {videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center">
              <Play className="h-4 w-4 text-primary-foreground fill-primary-foreground ml-0.5" />
            </div>
          </div>
        )}
      </button>
      <button
        onClick={() => onNavigate(biz.id)}
        className="px-1.5 py-1 truncate hover:text-primary transition-colors text-left text-[10px]"
      >
        {biz.name}
      </button>
    </div>
  );
};

const HomepageBusinessesPanel = ({ cityName }: HomepageBusinessesPanelProps) => {
  const [allVideos, setAllVideos] = useState<BusinessVideoItem[]>([]);
  const [frontStructures, setFrontStructures] = useState<FrontStructureEntry[]>([]);
  const [selectedStructure, setSelectedStructure] = useState<string>("none");
  const [selected, setSelected] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const mapSelectedBusinessWithVideo = useCallback(
    (b: any, videoMap: Map<string, { thumbnail_url: string | null; video_url: string }>): BusinessItem | null => {
      const vd = videoMap.get(b.id);
      const videoUrl = vd?.video_url || null;
      if (!videoUrl) return null;

      return {
        id: b.id,
        name: b.name,
        logo_url: b.logo_url,
        city: b.city,
        categories: b.categories || [],
        services: b.services || [],
        video_1_url: videoUrl,
        thumbnail_url: vd?.thumbnail_url || null,
      };
    },
    []
  );

  // Paginated fetch helper
  const fetchAll = useCallback(async (query: any) => {
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
  }, []);

  // Load front structures
  useEffect(() => {
    const load = async () => {
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
          if (name) { scByEntry[l.front_structure_id] = scByEntry[l.front_structure_id] || []; scByEntry[l.front_structure_id].push(name); }
        });
        const svcByEntry: Record<string, string[]> = {};
        ((svcLinks || []) as any[]).forEach((l) => {
          const name = svcNameMap.get(l.service_id);
          if (name) { svcByEntry[l.front_structure_id] = svcByEntry[l.front_structure_id] || []; svcByEntry[l.front_structure_id].push(name); }
        });
        setFrontStructures(
          (structures as any[]).map((s) => ({
            id: s.id, name: s.name,
            subcategoryNames: scByEntry[s.id] || [],
            serviceNames: svcByEntry[s.id] || [],
          }))
        );
      }
    };
    load();
  }, []);

  // Helper: fetch first video thumbnail + url per business
  const fetchVideoData = useCallback(async (businessIds: string[]): Promise<Map<string, { thumbnail_url: string | null; video_url: string }>> => {
    const map = new Map<string, { thumbnail_url: string | null; video_url: string }>();
    const batch = 300;
    for (let i = 0; i < businessIds.length; i += batch) {
      const chunk = businessIds.slice(i, i + batch);
      const { data } = await supabase
        .from("business_documents")
        .select("business_id, thumbnail_url, url")
        .eq("type", "video")
        .in("business_id", chunk)
        .order("sort_order", { ascending: true });
      if (data) {
        (data as any[]).forEach((d) => {
          if (!map.has(d.business_id)) map.set(d.business_id, { thumbnail_url: d.thumbnail_url || null, video_url: d.url });
        });
      }
    }
    return map;
  }, []);

  // Helper: fetch all video documents for all businesses
  const fetchAllVideoDocs = useCallback(async (businessIds: string[]) => {
    const docs: any[] = [];
    const batch = 300;
    for (let i = 0; i < businessIds.length; i += batch) {
      const chunk = businessIds.slice(i, i + batch);
      const chunkDocs = await fetchAll(
        supabase
          .from("business_documents")
          .select("id, business_id, thumbnail_url, url, sort_order")
          .eq("type", "video")
          .in("business_id", chunk)
          .order("sort_order", { ascending: true })
      );
      docs.push(...chunkDocs);
    }
    return docs;
  }, [fetchAll]);

  // Load all city videos (on demand)
  const loadAllBusinesses = useCallback(async () => {
    if (allLoaded) return;
    setLoading(true);
    const cityBusinesses = await fetchAll(
      supabase
        .from("businesses")
        .select("id, name, city, categories, services")
        .eq("city", cityName)
        .eq("is_active", true)
        .order("name")
    );

    if (cityBusinesses.length === 0) {
      setAllVideos([]);
      setAllLoaded(true);
      setLoading(false);
      return;
    }

    const businessMap = new Map((cityBusinesses as any[]).map((b) => [b.id, b]));
    const docs = await fetchAllVideoDocs(cityBusinesses.map((b) => b.id));
    const mapped = docs
      .map((d: any) => {
        const b = businessMap.get(d.business_id);
        if (!b) return null;
        return {
          id: d.id,
          business_id: b.id,
          business_name: b.name,
          city: b.city,
          categories: b.categories || [],
          services: b.services || [],
          video_url: d.url,
          thumbnail_url: d.thumbnail_url || null,
          sort_order: d.sort_order ?? 0,
        };
      })
      .filter((v): v is BusinessVideoItem => Boolean(v))
      .sort((a, b) => a.business_name.localeCompare(b.business_name, "fr") || a.sort_order - b.sort_order);

    setAllVideos(mapped);
    setAllLoaded(true);
    setLoading(false);
  }, [cityName, fetchAll, fetchAllVideoDocs, allLoaded]);

  // When structure changes, load businesses + saved selection
  const handleStructureChange = async (val: string) => {
    setSelectedStructure(val);
    if (val === "none") { setSelected([]); return; }
    if (!allLoaded) await loadAllBusinesses();
    // Load saved selection for this structure + city
    const { data: savedRows } = await supabase
      .from("homepage_selections" as any)
      .select("business_id, sort_order")
      .eq("front_structure_id", val)
      .eq("city", cityName)
      .order("sort_order");
    if (savedRows && savedRows.length > 0) {
      const ids = (savedRows as any[]).map((r) => r.business_id);
      const [{ data: bizData }, videoMap] = await Promise.all([
        supabase.from("businesses").select("id, name, logo_url, city, categories, services").in("id", ids),
        fetchVideoData(ids),
      ]);
      const bizMap = new Map((bizData || []).map((b: any) => [b.id, b]));
      const ordered = (savedRows as any[])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((r) => bizMap.get(r.business_id))
        .filter(Boolean)
        .map((b: any) => mapSelectedBusinessWithVideo(b, videoMap))
        .filter((b): b is BusinessItem => Boolean(b));
      setSelected(ordered);
    } else {
      setSelected([]);
    }
  };

  // Filter businesses by selected structure
  const filteredBusinesses = (() => {
    if (selectedStructure === "none" || !allLoaded) return [];
    const entry = frontStructures.find((s) => s.id === selectedStructure);
    if (!entry || (entry.subcategoryNames.length === 0 && entry.serviceNames.length === 0)) return [];
    const scSet = new Set(entry.subcategoryNames);
    const svcSet = new Set(entry.serviceNames);
    return allVideos
      .filter((b) => b.categories.some((c) => scSet.has(c)) || b.services.some((s) => svcSet.has(s)))
      .sort((a, b) => a.business_name.localeCompare(b.business_name, "fr") || a.sort_order - b.sort_order);
  })();

  const selectedIds = new Set(selected.map((b) => b.id));

  const addToSelection = (video: BusinessVideoItem) => {
    if (selectedIds.has(video.business_id)) return;
    if (selected.length >= 20) { toast.error("Maximum 20 vidéos"); return; }
    setSelected((prev) => [...prev, {
      id: video.business_id,
      name: video.business_name,
      logo_url: null,
      city: video.city,
      categories: video.categories,
      services: video.services,
      video_1_url: video.video_url,
      thumbnail_url: video.thumbnail_url,
    }]);
  };

  const removeFromSelection = (id: string) => {
    setSelected((prev) => prev.filter((b) => b.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSelected((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const saveSelection = async () => {
    if (selectedStructure === "none") return;
    setSaving(true);
    try {
      // Delete existing for this structure + city
      await (supabase.from("homepage_selections" as any) as any).delete()
        .eq("front_structure_id", selectedStructure)
        .eq("city", cityName);
      // Insert new
      if (selected.length > 0) {
        const rows = selected.map((b, i) => ({
          front_structure_id: selectedStructure,
          business_id: b.id,
          city: cityName,
          sort_order: i,
        }));
        await (supabase.from("homepage_selections" as any) as any).insert(rows);
      }
      toast.success("Sélection sauvegardée");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  };

  const goToEdit = (businessId: string) => navigate(`/staff/catalogue?edit=${businessId}`);

  return (
    <div className="flex gap-4">
      {/* ── Left: businesses grid ── */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={selectedStructure} onValueChange={handleStructureChange}>
              <SelectTrigger className="h-7 w-52 text-xs">
                <SelectValue placeholder="Choisir une catégorie…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>Choisir une catégorie…</SelectItem>
                {frontStructures.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {allLoaded && selectedStructure !== "none" && (
            <p className="text-xs text-muted-foreground">
              {filteredBusinesses.length} vidéo{filteredBusinesses.length > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {selectedStructure === "none" ? (
          <div className="flex items-center justify-center py-16 rounded-lg border bg-background">
            <p className="text-sm text-muted-foreground">Sélectionnez une catégorie pour afficher les vidéos</p>
          </div>
        ) : allLoaded ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredBusinesses.map((v) => {
              const isSelected = selectedIds.has(v.business_id);
              const videoUrl = v.video_url;
              return (
                <div key={v.id} className={`rounded-lg border overflow-hidden transition-colors ${isSelected ? "border-primary/50 bg-primary/5" : "bg-background"}`}>
                  <div className="relative aspect-video bg-muted">
                    <button className="relative w-full h-full flex items-center justify-center group" onClick={() => videoUrl && setLightboxUrl(videoUrl)}>
                      {v.thumbnail_url ? (
                        <img src={v.thumbnail_url} alt={v.business_name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : videoUrl ? (
                        <VideoThumbnail src={videoUrl} alt={v.business_name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-muted/50" />
                      )}
                      {videoUrl && (
                        <div className="relative z-10 w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center group-hover:bg-primary transition-colors">
                          <Play className="h-5 w-5 text-primary-foreground fill-primary-foreground ml-0.5" />
                        </div>
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); isSelected ? removeFromSelection(v.business_id) : addToSelection(v); }}
                      className={`absolute top-1.5 right-1.5 z-20 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-black/60 text-white hover:bg-primary hover:text-primary-foreground"
                      }`}
                      title={isSelected ? "Retirer" : "Ajouter"}
                    >
                      {isSelected ? <Monitor className="h-3 w-3" /> : <Plus className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => goToEdit(v.business_id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors text-left"
                    >
                      <span className="line-clamp-1">{v.business_name}</span>
                      <ExternalLink className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* ── Right: selection panel (sticky) ── */}
      <div className="w-72 flex-shrink-0">
        <div className="sticky top-4 rounded-lg border bg-background">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Sélection</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {selected.length}/20
              </Badge>
            </div>
            <Button
              size="sm" variant="default" className="h-7 text-xs"
              onClick={saveSelection}
              disabled={saving || selectedStructure === "none"}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sauvegarder"}
            </Button>
          </div>

          <div className="p-2 max-h-[calc(100vh-6rem)] overflow-y-auto">
            {selected.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Cliquez sur <Plus className="inline h-3 w-3" /> pour ajouter une vidéo
              </p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={selected.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="grid grid-cols-2 gap-1.5">
                    {selected.map((b, i) => (
                      <SortableCard key={b.id} biz={b} index={i} onRemove={removeFromSelection} onNavigate={goToEdit} onPlay={setLightboxUrl} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>
      {lightboxUrl && (
        <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
};

export default HomepageBusinessesPanel;
