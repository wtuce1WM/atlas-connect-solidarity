import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, ChevronDown, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import VideoLightbox from "./VideoLightbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface VideoItem {
  id: string;
  url: string;
  name: string | null;
  thumbnail_url: string | null;
  business_name: string;
  subcategory_name: string;
  city: string | null;
  neighborhood: string | null;
}

interface FsEntry {
  id: string;
  name: string;
  sort_order: number;
  subcategoryIds: Set<string>;
}

const ALL_VALUE = "__all__";

const FrontStructureVideosPanel = () => {
  const [loading, setLoading] = useState(true);
  const [fsEntries, setFsEntries] = useState<FsEntry[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [videoSubcategoryMap, setVideoSubcategoryMap] = useState<Map<string, string>>(new Map());
  const [cities, setCities] = useState<{ name: string; sort_order: number }[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>(ALL_VALUE);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);

    // Fetch all data in parallel
    const [fsRes, fssRes, citiesRes] = await Promise.all([
      supabase.from("front_structure").select("id, name, sort_order").order("sort_order"),
      supabase.from("front_structure_subcategories").select("front_structure_id, subcategory_id"),
      supabase.from("cities").select("name_fr, sort_order").eq("is_active", true).order("sort_order"),
    ]);

    const fsData = fsRes.data || [];
    const fssData = fssRes.data || [];
    setCities((citiesRes.data || []).map(c => ({ name: c.name_fr, sort_order: c.sort_order ?? 0 })));

    // Build front_structure -> subcategory_ids map
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

    // Fetch all videos with subcategory (paginated)
    const allDocs: any[] = [];
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data } = await supabase
        .from("business_documents")
        .select("id, url, name, thumbnail_url, business_id, subcategory_id, city, neighborhood")
        .eq("type", "video")
        .not("subcategory_id", "is", null)
        .order("sort_order", { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (!data || data.length === 0) break;
      allDocs.push(...data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }

    // Build subcategory map for videos
    const subMap = new Map<string, string>();
    allDocs.forEach(d => { if (d.subcategory_id) subMap.set(d.id, d.subcategory_id); });
    setVideoSubcategoryMap(subMap);

    // Fetch business names
    const bizIds = [...new Set(allDocs.map(d => d.business_id))];
    const bizMap = new Map<string, string>();
    for (let i = 0; i < bizIds.length; i += 200) {
      const batch = bizIds.slice(i, i + 200);
      const { data } = await supabase.from("businesses").select("id, name").in("id", batch);
      if (data) data.forEach(b => bizMap.set(b.id, b.name));
    }

    // Fetch subcategory names
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
    })));

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter videos by city
  const filteredVideos = useMemo(() => {
    if (selectedCity === ALL_VALUE) return videos;
    return videos.filter(v => v.city === selectedCity);
  }, [videos, selectedCity]);

  // Group filtered videos by front_structure entry
  const groupedVideos = useMemo(() => {
    const result = new Map<string, VideoItem[]>();
    for (const fs of fsEntries) {
      const matching = filteredVideos.filter(v => {
        const subId = videoSubcategoryMap.get(v.id);
        return subId && fs.subcategoryIds.has(subId);
      });
      if (matching.length > 0) {
        result.set(fs.id, matching);
      }
    }
    return result;
  }, [filteredVideos, fsEntries, videoSubcategoryMap]);

  // City options from videos
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
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={expandAll} className="text-xs text-primary hover:underline">Tout ouvrir</button>
          <span className="text-muted-foreground">·</span>
          <button onClick={collapseAll} className="text-xs text-primary hover:underline">Tout fermer</button>
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
              <div className="flex flex-wrap gap-3">
                {vids.map(v => (
                  <div key={v.id} className="flex flex-col rounded-lg border bg-background overflow-hidden" style={{ width: 200 }}>
                    <button
                      className="relative bg-black group flex-shrink-0 w-full"
                      style={{ height: 100 }}
                      onClick={() => setLightboxUrl(v.url)}
                    >
                      {v.thumbnail_url ? (
                        <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
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
                      <p className="text-xs font-medium leading-tight truncate">{v.business_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{v.subcategory_name}</p>
                      {(v.city || v.neighborhood) && (
                        <p className="text-[10px] text-muted-foreground/70 truncate">
                          {[v.city, v.neighborhood].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
