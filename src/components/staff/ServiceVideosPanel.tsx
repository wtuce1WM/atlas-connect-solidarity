import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, GripVertical } from "lucide-react";
import VideoIdSearchInput from "./VideoIdSearchInput";
import VideoLightbox from "./VideoLightbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface ServiceVideo {
  id: string;
  url: string;
  name: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  business_id: string;
  business_name: string;
  service_id: string;
  service_name: string;
  subcategory_id: string | null;
  subcategory_name: string | null;
  category_id: string | null;
  category_name: string | null;
  city: string | null;
  cities: string[];
  neighborhood: string | null;
}

interface CityOption {
  name: string;
  sort_order: number;
}

const ALL_VALUE = "__all__";

const SortableVideoCard = ({
  video,
  index,
  onPlay,
}: {
  video: ServiceVideo;
  index: number;
  onPlay: (url: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={{ ...style, width: 220 }} data-video-id={video.id} className="flex flex-col rounded-lg border bg-background p-1.5 transition-[outline]">
      <div className="flex items-center gap-1 mb-1">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </div>
        <span className="text-xs text-muted-foreground font-mono">{index + 1}</span>
        <button
          type="button"
          className="ml-auto text-[10px] text-muted-foreground font-mono truncate max-w-[100px] hover:text-foreground transition-colors"
          title={`Copier l'ID : ${video.id}`}
          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(video.id); toast.success("ID copié"); }}
        >
          {video.id.slice(0, 8)}
        </button>
      </div>
      <button
        className="relative bg-black rounded overflow-hidden group flex-shrink-0 w-full"
        style={{ height: 110 }}
        onClick={() => onPlay(video.url)}
      >
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
      <div className="mt-1.5">
        <p className="text-sm font-medium leading-tight">{video.business_name}</p>
        <p className="text-xs text-muted-foreground truncate">{video.service_name}</p>
        {(video.cities.length > 0 || video.neighborhood) && (
          <p className="text-[11px] text-muted-foreground/70 truncate">
            {[video.cities.join(", "), video.neighborhood].filter(Boolean).join(" · ")}
          </p>
        )}
        {video.name && <p className="text-[11px] text-muted-foreground/70 truncate">{video.name}</p>}
      </div>
    </div>
  );
};

const ServiceVideosPanel = () => {
  const [videos, setVideos] = useState<ServiceVideo[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_VALUE);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(ALL_VALUE);
  const [selectedService, setSelectedService] = useState<string>(ALL_VALUE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(async () => {
    setLoading(true);

    const { data: citiesData } = await supabase
      .from("cities")
      .select("name_fr, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (citiesData) {
      setCities(citiesData.map(c => ({ name: c.name_fr, sort_order: c.sort_order ?? 0 })));
    }

    // Fetch all videos with a subcategory_id (same base as subcategory panel)
    const allDocs: any[] = [];
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data } = await supabase
        .from("business_documents")
        .select("id, url, name, thumbnail_url, sort_order, front_sort_order, business_id, service_id, subcategory_id, city, neighborhood")
        .eq("type", "video")
        .not("subcategory_id", "is", null)
        .order("front_sort_order", { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (!data || data.length === 0) break;
      allDocs.push(...data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    const { isInternalVideoUrl } = await import("@/lib/videoSourceFilter");
    const allDocsFiltered = allDocs.filter(d => isInternalVideoUrl(d.url));
    allDocs.length = 0;
    allDocs.push(...allDocsFiltered);

    if (allDocs.length === 0) {
      setVideos([]);
      setLoading(false);
      return;
    }

    // Fetch businesses (with main_category)
    const bizIds = [...new Set(allDocs.map(d => d.business_id))];
    const bizMap = new Map<string, { name: string; main_category: string | null }>();
    for (let i = 0; i < bizIds.length; i += 200) {
      const batch = bizIds.slice(i, i + 200);
      const { data } = await supabase.from("businesses").select("id, name, main_category").in("id", batch);
      if (data) data.forEach(b => bizMap.set(b.id, { name: b.name, main_category: b.main_category }));
    }

    // Fetch services
    const svcIds = [...new Set(allDocs.map(d => d.service_id).filter(Boolean))] as string[];
    const svcMap = new Map<string, string>();
    for (let i = 0; i < svcIds.length; i += 200) {
      const batch = svcIds.slice(i, i + 200);
      const { data } = await supabase.from("services").select("id, name_fr").in("id", batch);
      if (data) data.forEach(s => svcMap.set(s.id, s.name_fr));
    }

    // Fetch subcategories
    const subIds = [...new Set(allDocs.map(d => d.subcategory_id).filter(Boolean))] as string[];
    const subMap = new Map<string, { name: string; category_id: string | null }>();
    for (let i = 0; i < subIds.length; i += 200) {
      const batch = subIds.slice(i, i + 200);
      const { data } = await supabase.from("subcategories").select("id, name_fr, category_id").in("id", batch);
      if (data) data.forEach(s => subMap.set(s.id, { name: s.name_fr, category_id: s.category_id }));
    }

    // Fetch categories
    const catIds = [...new Set([...subMap.values()].map(s => s.category_id).filter(Boolean))] as string[];
    const catMap = new Map<string, string>();
    for (let i = 0; i < catIds.length; i += 200) {
      const batch = catIds.slice(i, i + 200);
      const { data } = await supabase.from("categories").select("id, name_fr").in("id", batch);
      if (data) data.forEach(c => catMap.set(c.id, c.name_fr));
    }

    const { fetchVideoCities } = await import("@/lib/fetchVideoCities");
    const { businessDocCities } = await fetchVideoCities({
      businessDocumentIds: allDocs.map(d => d.id),
    });

    setVideos(allDocs.map(d => {
      const sub = d.subcategory_id ? subMap.get(d.subcategory_id) : null;
      const catId = sub?.category_id || null;
      const multi = businessDocCities.get(d.id) || [];
      return {
        id: d.id,
        url: d.url,
        name: d.name,
        thumbnail_url: d.thumbnail_url,
        sort_order: d.sort_order,
        business_id: d.business_id,
        business_name: bizMap.get(d.business_id)?.name || "—",
        service_id: d.service_id,
        service_name: svcMap.get(d.service_id) || "—",
        subcategory_id: d.subcategory_id || null,
        subcategory_name: sub?.name || null,
        category_id: catId,
        category_name: catId ? catMap.get(catId) || null : null,
        city: d.city || null,
        cities: multi.length > 0 ? multi : (d.city ? [d.city] : []),
        neighborhood: d.neighborhood || null,
      };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const videoCities = useMemo(() => {
    const citySet = new Set<string>();
    videos.forEach(v => v.cities.forEach(c => citySet.add(c)));
    const cityOrder = new Map(cities.map(c => [c.name, c.sort_order]));
    return [...citySet].sort((a, b) => (cityOrder.get(a) ?? 9999) - (cityOrder.get(b) ?? 9999));
  }, [videos, cities]);

  // Helper: videos filtered by city only
  const cityFilteredVideos = useMemo(() => {
    if (!selectedCity) return [];
    if (selectedCity === "__none__") return videos.filter(v => v.cities.length === 0);
    return videos.filter(v => v.cities.includes(selectedCity));
  }, [videos, selectedCity]);

  // Categories present in city-filtered videos
  const videoCategories = useMemo(() => {
    const catSet = new Map<string, string>();
    cityFilteredVideos.forEach(v => {
      if (v.category_id && v.category_name && !catSet.has(v.category_id)) {
        catSet.set(v.category_id, v.category_name);
      }
    });
    return [...catSet.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cityFilteredVideos]);

  // Subcategories filtered by selected category
  const videoSubcategories = useMemo(() => {
    let base = cityFilteredVideos;
    if (selectedCategory !== ALL_VALUE) {
      base = base.filter(v => v.category_id === selectedCategory);
    }
    const subSet = new Map<string, string>();
    base.forEach(v => {
      if (v.subcategory_id && v.subcategory_name && !subSet.has(v.subcategory_id)) {
        subSet.set(v.subcategory_id, v.subcategory_name);
      }
    });
    return [...subSet.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cityFilteredVideos, selectedCategory]);

  // Services filtered by selected category + subcategory
  const videoServices = useMemo(() => {
    let base = cityFilteredVideos;
    if (selectedCategory !== ALL_VALUE) {
      base = base.filter(v => v.category_id === selectedCategory);
    }
    if (selectedSubcategory !== ALL_VALUE) {
      base = base.filter(v => v.subcategory_id === selectedSubcategory);
    }
    const svcSet = new Map<string, string>();
    base.forEach(v => {
      if (!svcSet.has(v.service_id)) svcSet.set(v.service_id, v.service_name);
    });
    return [...svcSet.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cityFilteredVideos, selectedCategory, selectedSubcategory]);

  // Reset cascading filters
  useEffect(() => {
    setSelectedCategory(ALL_VALUE);
    setSelectedSubcategory(ALL_VALUE);
    setSelectedService(ALL_VALUE);
  }, [selectedCity]);

  useEffect(() => {
    setSelectedSubcategory(ALL_VALUE);
    setSelectedService(ALL_VALUE);
  }, [selectedCategory]);

  useEffect(() => {
    setSelectedService(ALL_VALUE);
  }, [selectedSubcategory]);

  const filteredVideos = useMemo(() => {
    let result = cityFilteredVideos;
    if (selectedCategory !== ALL_VALUE) {
      result = result.filter(v => v.category_id === selectedCategory);
    }
    if (selectedSubcategory !== ALL_VALUE) {
      result = result.filter(v => v.subcategory_id === selectedSubcategory);
    }
    if (selectedService !== ALL_VALUE) {
      result = result.filter(v => v.service_id === selectedService);
    }
    return result;
  }, [cityFilteredVideos, selectedCategory, selectedSubcategory, selectedService]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const filteredIds = new Set(filteredVideos.map(v => v.id));
    const oldIdxFiltered = filteredVideos.findIndex(v => v.id === active.id);
    const newIdxFiltered = filteredVideos.findIndex(v => v.id === over.id);
    if (oldIdxFiltered === -1 || newIdxFiltered === -1) return;
    const reorderedFiltered = arrayMove(filteredVideos, oldIdxFiltered, newIdxFiltered);
    // Rebuild videos: keep non-filtered videos in place, replace filtered slots in order
    setVideos(prev => {
      const result: ServiceVideo[] = [];
      let cursor = 0;
      for (const v of prev) {
        if (filteredIds.has(v.id)) {
          result.push(reorderedFiltered[cursor++]);
        } else {
          result.push(v);
        }
      }
      return result;
    });
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const results = await Promise.all(
        filteredVideos.map((v, i) =>
          supabase
            .from("business_documents")
            .update({ sort_order: i } as any)
            .eq("id", v.id)
        )
      );
      const failed = results.filter(r => r.error);
      if (failed.length > 0) {
        toast.error(`Erreur sur ${failed.length} vidéo(s)`);
      } else {
        toast.success(`Ordre sauvegardé (${filteredVideos.length} vidéos)`);
        await load();
      }
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Vidéos avec service ({videos.length})</h3>
        <Button size="sm" onClick={saveOrder} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Sauvegarder l'ordre
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <VideoIdSearchInput videoIds={filteredVideos.map(v => v.id)} />
        {/* Ville */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Ville :</span>
          <Select value={selectedCity || ""} onValueChange={v => setSelectedCity(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Sélectionner une ville" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Aucune</SelectItem>
              {videoCities.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Catégorie */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Catégorie :</span>
          <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={!selectedCity}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder={!selectedCity ? "Choisir une ville" : "Toutes"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Toutes</SelectItem>
              {videoCategories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sous-catégorie */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Sous-catégorie :</span>
          <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory} disabled={!selectedCity}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder={!selectedCity ? "Choisir une ville" : "Toutes"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Toutes</SelectItem>
              {videoSubcategories.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Service */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Service :</span>
          <Select value={selectedService} onValueChange={setSelectedService} disabled={!selectedCity}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder={!selectedCity ? "Choisir une ville" : "Tous"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tous</SelectItem>
              {videoServices.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedCity && (
        <>
          <p className="text-sm text-muted-foreground">{filteredVideos.length} vidéo{filteredVideos.length !== 1 ? "s" : ""}</p>
          {filteredVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucune vidéo pour cette sélection.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredVideos.map(v => v.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-wrap gap-2">
                  {filteredVideos.map((v, i) => (
                    <SortableVideoCard key={v.id} video={v} index={i} onPlay={setLightboxUrl} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}

      {lightboxUrl && <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
};

export default ServiceVideosPanel;
