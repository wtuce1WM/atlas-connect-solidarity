import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, GripVertical, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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

interface CountryVideo {
  id: string;
  url: string;
  name: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  business_id: string;
  business_name: string;
  subcategory_id: string | null;
  subcategory_name: string;
  category_id: string | null;
  city: string | null;
  cities: string[];
  neighborhood: string | null;
  service_name: string | null;
  poi_name: string | null;
  linked_business_name: string | null;
}

interface CityOption {
  name: string;
  sort_order: number;
}

interface CategoryOption {
  id: string;
  name: string;
  sort_order: number;
}

interface SubcategoryOption {
  id: string;
  name: string;
  category_id: string;
}

const NONE_CITY = "__none__";
const ALL_VALUE = "__all__";

const SortableVideoCard = ({
  video,
  index,
  onPlay,
}: {
  video: CountryVideo;
  index: number;
  onPlay: (url: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const tags = [
    video.service_name && `Service: ${video.service_name}`,
    video.poi_name && `POI: ${video.poi_name}`,
    video.linked_business_name && `Établissement: ${video.linked_business_name}`,
  ].filter(Boolean);

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
        <p className="text-xs text-muted-foreground truncate">{video.subcategory_name}</p>
        {(video.cities.length > 0 || video.neighborhood) && (
          <p className="text-[11px] text-muted-foreground/70 truncate">
            {[video.cities.join(", "), video.neighborhood].filter(Boolean).join(" · ")}
          </p>
        )}
        {tags.length > 0 && (
          <p className="text-[11px] text-muted-foreground/70 truncate">
            {tags.join(" · ")}
          </p>
        )}
        {video.name && <p className="text-[11px] text-muted-foreground/70 truncate">{video.name}</p>}
      </div>
    </div>
  );
};

const CountryVideosPanel = ({ withSubcategory = true }: { withSubcategory?: boolean }) => {
  const [videos, setVideos] = useState<CountryVideo[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subcategoriesMap, setSubcategoriesMap] = useState<Map<string, SubcategoryOption>>(new Map());
  const [allSubcategories, setAllSubcategories] = useState<{ id: string; name: string; category_name: string }[]>([]);
  const [allBadges, setAllBadges] = useState<{ id: string; name_fr: string }[]>([]);
  const [videoBadges, setVideoBadges] = useState<Map<string, string[]>>(new Map());
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [draftSubcategoryId, setDraftSubcategoryId] = useState<string>("");
  const [draftBadgeIds, setDraftBadgeIds] = useState<string[]>([]);
  const [subcategorySearch, setSubcategorySearch] = useState("");
  const [savingAssign, setSavingAssign] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_VALUE);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(ALL_VALUE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(async () => {
    setLoading(true);

    // Fetch cities sorted
    const { data: citiesData } = await supabase
      .from("cities")
      .select("name_fr, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (citiesData) {
      setCities(citiesData.map(c => ({ name: c.name_fr, sort_order: c.sort_order ?? 0 })));
    }

    // Paginate to fetch all videos (Supabase limits to 1000 per request)
    const allDocs: any[] = [];
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      let q = supabase
        .from("business_documents")
        .select("id, url, name, thumbnail_url, sort_order, front_sort_order, business_id, subcategory_id, service_id, poi_id, linked_business_id, city, neighborhood")
        .eq("type", "video");
      if (withSubcategory) {
        q = q.not("subcategory_id", "is", null);
      } else {
        q = q.is("subcategory_id", null);
      }
      const { data } = await q.order("front_sort_order", { ascending: true }).range(offset, offset + PAGE - 1);
      if (!data || data.length === 0) break;
      allDocs.push(...data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    const { isInternalVideoUrl } = await import("@/lib/videoSourceFilter");
    const docs = allDocs.filter(d => isInternalVideoUrl(d.url));

    if (!docs || docs.length === 0) {
      setVideos([]);
      setLoading(false);
      return;
    }

    const allBizIds = new Set<string>();
    docs.forEach(d => {
      allBizIds.add(d.business_id);
      if (d.poi_id) allBizIds.add(d.poi_id);
      if (d.linked_business_id) allBizIds.add(d.linked_business_id);
    });
    const bizIds = [...allBizIds];
    const bizMap = new Map<string, { name: string; city: string | null; neighborhood: string | null }>();
    for (let i = 0; i < bizIds.length; i += 200) {
      const batch = bizIds.slice(i, i + 200);
      const { data } = await supabase.from("businesses").select("id, name, city, neighborhood").in("id", batch);
      if (data) data.forEach(b => bizMap.set(b.id, { name: b.name, city: b.city, neighborhood: b.neighborhood }));
    }

    // Fetch subcategories with their category_id
    const scIds = [...new Set(docs.map(d => d.subcategory_id).filter(Boolean))] as string[];
    const scMap = new Map<string, { name: string; category_id: string | null }>();
    if (scIds.length > 0) {
      for (let i = 0; i < scIds.length; i += 200) {
        const batch = scIds.slice(i, i + 200);
        const { data } = await supabase.from("subcategories").select("id, name_fr, category_id").in("id", batch);
        if (data) data.forEach(sc => scMap.set(sc.id, { name: sc.name_fr, category_id: sc.category_id }));
      }
    }

    // Fetch categories
    const catIds = [...new Set([...scMap.values()].map(sc => sc.category_id).filter(Boolean))] as string[];
    const catMap = new Map<string, { name: string; sort_order: number }>();
    if (catIds.length > 0) {
      for (let i = 0; i < catIds.length; i += 200) {
        const batch = catIds.slice(i, i + 200);
        const { data } = await supabase.from("categories").select("id, name_fr, sort_order").in("id", batch);
        if (data) data.forEach(c => catMap.set(c.id, { name: c.name_fr, sort_order: c.sort_order ?? 0 }));
      }
    }
    setCategories(
      [...catMap.entries()]
        .map(([id, c]) => ({ id, name: c.name, sort_order: c.sort_order }))
        .sort((a, b) => a.sort_order - b.sort_order)
    );

    // Build subcategories lookup
    const scLookup = new Map<string, SubcategoryOption>();
    scMap.forEach((val, id) => {
      scLookup.set(id, { id, name: val.name, category_id: val.category_id || "" });
    });
    setSubcategoriesMap(scLookup);

    const svcIds = [...new Set(docs.map(d => d.service_id).filter(Boolean))] as string[];
    const svcMap = new Map<string, string>();
    if (svcIds.length > 0) {
      for (let i = 0; i < svcIds.length; i += 200) {
        const batch = svcIds.slice(i, i + 200);
        const { data } = await supabase.from("services").select("id, name_fr").in("id", batch);
        if (data) data.forEach(s => svcMap.set(s.id, s.name_fr));
      }
    }

    const seenIds = new Set<string>();
    const dedupedDocs = docs.filter(d => {
      if (seenIds.has(d.id)) return false;
      seenIds.add(d.id);
      return true;
    });

    // Fetch multi-city associations
    const { fetchVideoCities } = await import("@/lib/fetchVideoCities");
    const { businessDocCities } = await fetchVideoCities({
      businessDocumentIds: dedupedDocs.map(d => d.id),
    });

    setVideos(dedupedDocs.map(d => {
      const biz = bizMap.get(d.business_id);
      const sc = d.subcategory_id ? scMap.get(d.subcategory_id) : null;
      const multi = businessDocCities.get(d.id) || [];
      return {
        id: d.id,
        url: d.url,
        name: d.name,
        thumbnail_url: d.thumbnail_url,
        sort_order: d.sort_order,
        business_id: d.business_id,
        business_name: biz?.name || "—",
        subcategory_id: d.subcategory_id || null,
        subcategory_name: sc?.name || "—",
        category_id: sc?.category_id || null,
        city: d.city || null,
        cities: multi.length > 0 ? multi : (d.city ? [d.city] : []),
        neighborhood: d.neighborhood || null,
        service_name: d.service_id ? (svcMap.get(d.service_id) || "—") : null,
        poi_name: d.poi_id ? (bizMap.get(d.poi_id)?.name || "—") : null,
        linked_business_name: d.linked_business_id ? (bizMap.get(d.linked_business_id)?.name || "—") : null,
      };
    }));
    setLoading(false);
  }, [withSubcategory]);

  useEffect(() => { load(); }, [load]);

  // Load badges, all subcategories (with categories), and existing video-badge links — only for "Sans sous-catégorie"
  useEffect(() => {
    if (withSubcategory) return;
    (async () => {
      const [badgesRes, subsRes, catsRes, linksRes] = await Promise.all([
        supabase.from("badges").select("id, name_fr").order("name_fr"),
        supabase.from("subcategories").select("id, name_fr, category_id"),
        supabase.from("categories").select("id, name_fr"),
        supabase.from("business_document_badges").select("document_id, badge_id"),
      ]);
      if (badgesRes.data) setAllBadges(badgesRes.data);
      const catNameMap = new Map<string, string>((catsRes.data || []).map((c: any) => [c.id, c.name_fr]));
      const list = (subsRes.data || [])
        .map((s: any) => ({ id: s.id, name: s.name_fr, category_name: catNameMap.get(s.category_id) || "" }))
        .sort((a, b) => a.category_name.localeCompare(b.category_name, "fr") || a.name.localeCompare(b.name, "fr"));
      setAllSubcategories(list);
      const map = new Map<string, string[]>();
      (linksRes.data || []).forEach((l: any) => {
        const arr = map.get(l.document_id) || [];
        arr.push(l.badge_id);
        map.set(l.document_id, arr);
      });
      setVideoBadges(map);
    })();
  }, [withSubcategory]);

  // Sync drafts when selecting a video
  useEffect(() => {
    if (!selectedVideoId) {
      setDraftSubcategoryId("");
      setDraftBadgeIds([]);
      return;
    }
    setDraftSubcategoryId("");
    setDraftBadgeIds(videoBadges.get(selectedVideoId) || []);
  }, [selectedVideoId, videoBadges]);

  // Build city options from videos themselves, sorted by cities table order
  const videoCities = useMemo(() => {
    const citySet = new Set<string>();
    videos.forEach(v => v.cities.forEach(c => citySet.add(c)));
    const cityOrder = new Map(cities.map(c => [c.name, c.sort_order]));
    return [...citySet].sort((a, b) => (cityOrder.get(a) ?? 9999) - (cityOrder.get(b) ?? 9999));
  }, [videos, cities]);

  // Categories present in current videos
  const videoCategories = useMemo(() => {
    if (!withSubcategory) return [];
    const catIds = new Set<string>();
    videos.forEach(v => { if (v.category_id) catIds.add(v.category_id); });
    return categories.filter(c => catIds.has(c.id));
  }, [videos, categories, withSubcategory]);

  // Subcategories for selected category, present in videos
  const videoSubcategories = useMemo(() => {
    if (!withSubcategory || selectedCategory === ALL_VALUE) return [];
    const scSet = new Map<string, string>();
    videos.forEach(v => {
      if (v.subcategory_id && v.category_id === selectedCategory) {
        const sc = subcategoriesMap.get(v.subcategory_id);
        if (sc) scSet.set(sc.id, sc.name);
      }
    });
    return [...scSet.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [videos, selectedCategory, subcategoriesMap, withSubcategory]);

  // Reset subcategory when category changes
  useEffect(() => {
    setSelectedSubcategory(ALL_VALUE);
  }, [selectedCategory]);

  const filteredVideos = useMemo(() => {
    if (!selectedCity) return [];
    let result = videos;

    // City filter (multi-city aware)
    if (selectedCity === NONE_CITY) {
      result = result.filter(v => v.cities.length === 0);
    } else {
      result = result.filter(v => v.cities.includes(selectedCity));
    }

    // Category filter
    if (withSubcategory && selectedCategory !== ALL_VALUE) {
      result = result.filter(v => v.category_id === selectedCategory);
    }

    // Subcategory filter
    if (withSubcategory && selectedSubcategory !== ALL_VALUE) {
      result = result.filter(v => v.subcategory_id === selectedSubcategory);
    }

    return result;
  }, [videos, selectedCity, selectedCategory, selectedSubcategory, withSubcategory]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setVideos(prev => {
      const oldIndex = prev.findIndex(v => v.id === active.id);
      const newIndex = prev.findIndex(v => v.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < filteredVideos.length; i++) {
        await supabase
          .from("business_documents")
          .update({ front_sort_order: i } as any)
          .eq("id", filteredVideos[i].id);
      }
      toast.success("Ordre sauvegardé");
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
        <h3 className="text-base font-semibold">{withSubcategory ? "Vidéos avec sous-catégorie" : "Vidéos sans sous-catégorie"} ({videos.length})</h3>
        <Button size="sm" onClick={saveOrder} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Sauvegarder l'ordre
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <VideoIdSearchInput videoIds={filteredVideos.map(v => v.id)} />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Ville :</span>
          <Select value={selectedCity || ""} onValueChange={v => setSelectedCity(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Sélectionner une ville" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_CITY}>Aucune</SelectItem>
              {videoCities.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {withSubcategory && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Catégorie :</span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Toutes</SelectItem>
                  {videoCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Sous-catégorie :</span>
              <Select
                value={selectedSubcategory}
                onValueChange={setSelectedSubcategory}
                disabled={selectedCategory === ALL_VALUE}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder={selectedCategory === ALL_VALUE ? "Choisir une catégorie" : "Toutes"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Toutes</SelectItem>
                  {videoSubcategories.map(sc => (
                    <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      {selectedCity && (
        <>
          <p className="text-sm text-muted-foreground">{filteredVideos.length} vidéo{filteredVideos.length !== 1 ? "s" : ""}</p>
          {filteredVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucune vidéo pour cette sélection.</p>
          ) : withSubcategory ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredVideos.map(v => v.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-wrap gap-2">
                  {filteredVideos.map((v, i) => (
                    <SortableVideoCard key={v.id} video={v} index={i} onPlay={setLightboxUrl} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div
              className="grid w-full gap-3 items-start"
              style={{ gridTemplateColumns: "minmax(0, 60%) minmax(0, 40%)" }}
            >
              <div className="grid min-w-0 grid-cols-4 gap-2">
                {filteredVideos.map(v => {
                  const selected = selectedVideoId === v.id;
                  const currentBadges = videoBadges.get(v.id) || [];
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVideoId(v.id)}
                      className={`flex flex-col rounded-lg border bg-background p-1.5 cursor-pointer transition-colors ${selected ? "border-primary ring-2 ring-primary" : "hover:border-muted-foreground/30"}`}
                    >
                      <button
                        className="relative bg-black rounded overflow-hidden group flex-shrink-0 w-full"
                        style={{ height: 110 }}
                        onClick={(e) => { e.stopPropagation(); setLightboxUrl(v.url); }}
                      >
                        {v.thumbnail_url ? (
                          <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted" />
                        )}
                        <span
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(v.id); toast.success("ID copié"); }}
                          className="absolute top-1 right-1 z-10 text-white/90 hover:text-white text-[10px] font-mono bg-black/60 rounded px-1.5 py-0.5 cursor-pointer"
                          title={`Copier l'ID : ${v.id}`}
                        >
                          {v.id.slice(0, 8)}
                        </span>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center">
                            <Play className="h-4 w-4 text-primary-foreground fill-primary-foreground ml-0.5" />
                          </div>
                        </div>
                      </button>
                      <div className="mt-1.5">
                        <p className="text-sm font-medium leading-tight">{v.business_name}</p>
                        {(v.city || v.neighborhood) && (
                          <p className="text-[11px] text-muted-foreground/70 truncate">
                            {[v.city, v.neighborhood].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {currentBadges.length > 0 && (
                          <p className="text-[11px] text-primary mt-0.5">{currentBadges.length} badge{currentBadges.length > 1 ? "s" : ""}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <aside className="min-w-0 rounded-lg border bg-muted/20 p-3 h-[78vh] overflow-y-auto sticky top-2">
                {!selectedVideoId ? (
                  <p className="text-xs text-muted-foreground">Sélectionnez une vidéo pour lui affecter une sous-catégorie et des badges.</p>
                ) : (() => {
                  const original = new Set(videoBadges.get(selectedVideoId) || []);
                  const draft = new Set(draftBadgeIds);
                  const badgesDirty = original.size !== draft.size || [...draft].some(id => !original.has(id));
                  const dirty = badgesDirty || !!draftSubcategoryId;
                  const filteredSubs = subcategorySearch.trim()
                    ? allSubcategories.filter(s =>
                        s.name.toLowerCase().includes(subcategorySearch.toLowerCase()) ||
                        s.category_name.toLowerCase().includes(subcategorySearch.toLowerCase())
                      )
                    : allSubcategories;
                  return (
                    <>
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <p className="text-xs font-medium text-foreground">Affectation</p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedVideoId(null)}
                            className="text-xs px-2 py-1 rounded hover:bg-accent text-muted-foreground"
                          >
                            Fermer
                          </button>
                          <button
                            disabled={!dirty || savingAssign}
                            onClick={async () => {
                              if (!selectedVideoId) return;
                              setSavingAssign(true);
                              let err: any = null;
                              if (draftSubcategoryId) {
                                const r = await supabase
                                  .from("business_documents")
                                  .update({ subcategory_id: draftSubcategoryId })
                                  .eq("id", selectedVideoId)
                                  .select("id, subcategory_id");
                                console.log("[CountryVideosPanel] subcategory update", { selectedVideoId, draftSubcategoryId, data: r.data, error: r.error });
                                if (r.error) {
                                  err = r.error;
                                } else if (!r.data || r.data.length === 0) {
                                  err = new Error("Aucune ligne mise à jour (RLS ?)");
                                }
                              }
                              const toAdd = [...draft].filter(id => !original.has(id));
                              const toRemove = [...original].filter(id => !draft.has(id));
                              console.log("[CountryVideosPanel] badge diff", { selectedVideoId, original: [...original], draft: [...draft], toAdd, toRemove });
                              if (!err && toRemove.length > 0) {
                                const r = await supabase.from("business_document_badges").delete().eq("document_id", selectedVideoId).in("badge_id", toRemove).select();
                                console.log("[CountryVideosPanel] badge delete", { data: r.data, error: r.error });
                                if (r.error) err = r.error;
                              }
                              if (!err && toAdd.length > 0) {
                                const r = await supabase.from("business_document_badges").insert(toAdd.map(badge_id => ({ document_id: selectedVideoId, badge_id }))).select();
                                console.log("[CountryVideosPanel] badge insert", { data: r.data, error: r.error });
                                if (r.error) err = r.error;
                              }
                              setSavingAssign(false);
                              if (err) { toast.error("Erreur : " + err.message); return; }
                              setVideoBadges(prev => {
                                const next = new Map(prev);
                                next.set(selectedVideoId, [...draft]);
                                return next;
                              });
                              if (draftSubcategoryId) {
                                // Remove the video from the list (it now has a subcategory)
                                setVideos(prev => prev.filter(v => v.id !== selectedVideoId));
                                setSelectedVideoId(null);
                              }
                              toast.success("Enregistré");
                            }}
                            className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
                          >
                            {savingAssign ? "..." : "Enregistrer"}
                          </button>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-[11px] font-semibold text-foreground mb-1.5">Sous-catégorie</p>
                        <div className="relative mb-1.5">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input
                            value={subcategorySearch}
                            onChange={(e) => setSubcategorySearch(e.target.value)}
                            placeholder="Rechercher…"
                            className="h-7 pl-7 text-xs"
                          />
                        </div>
                        <div className="max-h-[28vh] overflow-y-auto rounded border bg-background">
                          {filteredSubs.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground p-2">Aucun résultat.</p>
                          ) : filteredSubs.map(s => {
                            const isSel = draftSubcategoryId === s.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setDraftSubcategoryId(isSel ? "" : s.id)}
                                className={`w-full text-left text-xs px-2 py-1 border-b last:border-b-0 transition-colors ${isSel ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"}`}
                              >
                                <span className="text-muted-foreground">{s.category_name} · </span>{s.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-foreground mb-1.5">Badges</p>
                        <div className="flex flex-wrap gap-1">
                          {allBadges.map(b => {
                            const isSelected = draft.has(b.id);
                            return (
                              <button
                                key={b.id}
                                type="button"
                                className={`text-xs px-2 py-1 rounded-full border transition-colors ${isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50"}`}
                                onClick={() => setDraftBadgeIds(prev => isSelected ? prev.filter(id => id !== b.id) : [...prev, b.id])}
                              >
                                {b.name_fr}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </aside>
            </div>
          )}
        </>
      )}

      {lightboxUrl && <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
};

export default CountryVideosPanel;
