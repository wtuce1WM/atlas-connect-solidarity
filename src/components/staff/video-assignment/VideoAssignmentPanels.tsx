/**
 * Shared video assignment panels (POI / Businesses / Destinations & Cities / Badges+Cities).
 *
 * Used by both the generic videos backoffice panel and the YouTube backoffice panel.
 * The "source" prop controls which junction tables are read from / written to.
 *
 *  - source="generic" → generic_video_*  with FK column "generic_video_id"
 *  - source="youtube" → business_youtube_video_*  with FK column "youtube_video_id"
 */

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Play, X, MapPin, MapPinned, Building2, Search, Globe, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ─── Source-aware table mapping ─── */
export type AssignmentSource = "generic" | "youtube" | "document";

interface TableMap {
  poi: string;
  business: string;
  destination: string;
  city: string;
  badge: string;
  /** FK column on the junction tables that points to the video */
  fk: string;
}

const TABLES: Record<AssignmentSource, TableMap> = {
  generic: {
    poi: "generic_video_pois",
    business: "generic_video_businesses",
    destination: "generic_video_destinations",
    city: "generic_video_cities",
    badge: "generic_video_badges",
    fk: "generic_video_id",
  },
  youtube: {
    poi: "business_youtube_video_pois",
    business: "business_youtube_video_businesses",
    destination: "business_youtube_video_destinations",
    city: "business_youtube_video_cities",
    badge: "business_youtube_video_badges",
    fk: "youtube_video_id",
  },
  // Vidéos de fiche (business_documents) : seules les tables Badges & Villes existent.
  document: {
    poi: "",
    business: "",
    destination: "",
    city: "business_document_cities",
    badge: "business_document_badges",
    fk: "document_id",
  },
};


/** Minimal video shape needed by the panels. */
export interface AssignableVideo {
  id: string;
  /** URL of the video (or its embed). Used to decide preview rendering. */
  url: string;
  /** Display name (optional). */
  name?: string | null;
  /** Thumbnail to fallback to when video is not directly playable. */
  thumbnail_url?: string | null;
  /** Optional city (display only — POI panel). */
  city?: string | null;
}

/* ──────────────────────────────────────────────────────────── */
/*  Preview header (video / thumbnail) shared across all panels */
/* ──────────────────────────────────────────────────────────── */
const extractYouTubeId = (url: string): string | null => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
};

const VideoPreview = ({ video }: { video: AssignableVideo }) => {
  const isStorageVideo = video.url.includes("supabase.co/storage");
  const ytId = !isStorageVideo ? extractYouTubeId(video.url) : null;
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
      {isStorageVideo ? (
        <video src={video.url} className="w-full h-full object-contain" muted preload="metadata" controls />
      ) : ytId && playing ? (
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
          className="w-full h-full"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      ) : video.thumbnail_url ? (
        <>
          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
          {ytId && (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition"
              aria-label="Lire la vidéo"
            >
              <Play className="h-12 w-12 text-white drop-shadow-lg" />
            </button>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          {ytId ? (
            <button type="button" onClick={() => setPlaying(true)} aria-label="Lire la vidéo">
              <Play className="h-10 w-10 text-muted-foreground" />
            </button>
          ) : (
            <Play className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  );
};

/* ─────────────────── POI Assignment ─────────────────── */
interface PoiBiz { id: string; name: string; neighborhood: string | null; city: string | null; }

export const InlinePoiAssignment = ({
  source, video, onClose, onSaved,
}: {
  source: AssignmentSource;
  video: AssignableVideo;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const T = TABLES[source];
  const [poiBusinesses, setPoiBusinesses] = useState<PoiBiz[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [initialIds, setInitialIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cityFilter, setCityFilter] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: pois }, { data: links }] = await Promise.all([
        supabase.from("businesses")
          .select("id, name, neighborhood, city")
          .eq("is_poi", true).eq("is_active", true)
          .order("city").order("neighborhood").order("name"),
        supabase.from(T.poi as any).select("poi_id" + (source === "youtube" ? ":point_of_interest_id" : ""))
          .eq(T.fk, video.id) as any,
      ]);
      setPoiBusinesses((pois as PoiBiz[]) || []);
      const ids = ((links as any[]) || []).map((l: any) =>
        source === "youtube" ? l.point_of_interest_id : l.poi_id
      );
      setSelectedIds(ids); setInitialIds(ids); setLoading(false);
    };
    load();
  }, [video.id, source]);

  const togglePoi = (poiId: string) =>
    setSelectedIds(prev => prev.includes(poiId) ? prev.filter(id => id !== poiId) : [...prev, poiId]);

  const toggleGroup = (pois: PoiBiz[]) => {
    const ids = pois.map(p => p.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    setSelectedIds(prev => allSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  };
  const isDirty = JSON.stringify([...selectedIds].sort()) !== JSON.stringify([...initialIds].sort());

  /** YouTube uses column "point_of_interest_id"; generic uses "poi_id". */
  const poiColumn = source === "youtube" ? "point_of_interest_id" : "poi_id";

  const save = async () => {
    setSaving(true);
    const toAdd = selectedIds.filter(id => !initialIds.includes(id));
    const toRemove = initialIds.filter(id => !selectedIds.includes(id));
    if (toRemove.length > 0) {
      await supabase.from(T.poi as any).delete().eq(T.fk, video.id).in(poiColumn, toRemove);
    }
    if (toAdd.length > 0) {
      await supabase.from(T.poi as any).insert(
        toAdd.map(id => ({ [T.fk]: video.id, [poiColumn]: id })) as any
      );
    }
    toast.success(`${selectedIds.length} POI(s) affecté(s)`);
    setInitialIds([...selectedIds]); onSaved(); setSaving(false);
  };

  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    poiBusinesses.forEach(p => { if (p.city) cities.add(p.city); });
    return Array.from(cities).sort();
  }, [poiBusinesses]);

  const filteredPois = useMemo(() => {
    if (!cityFilter) return poiBusinesses;
    return poiBusinesses.filter(p => p.city === cityFilter);
  }, [poiBusinesses, cityFilter]);

  const grouped = useMemo(() => {
    const cityMap: Record<string, Record<string, PoiBiz[]>> = {};
    filteredPois.forEach(p => {
      const city = p.city || "Sans ville";
      const nb = p.neighborhood || "Sans quartier";
      if (!cityMap[city]) cityMap[city] = {};
      if (!cityMap[city][nb]) cityMap[city][nb] = [];
      cityMap[city][nb].push(p);
    });
    return Object.entries(cityMap).map(([city, neighborhoods]) => ({
      city, neighborhoods: Object.entries(neighborhoods),
    }));
  }, [filteredPois]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4" />Affectation POI
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <VideoPreview video={video} />
        <Button size="sm" onClick={save} disabled={!isDirty || saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Enregistrer
        </Button>
        <div className="space-y-1">
          {video.name && <p className="text-sm font-semibold">{video.name}</p>}
          <p className="text-xs text-muted-foreground font-mono">{video.id}</p>
          {video.city && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {video.city}</p>}
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground shrink-0">
                Points d'intérêt ({selectedIds.length} sélectionné{selectedIds.length > 1 ? "s" : ""})
              </span>
              <select
                className="text-xs border border-input rounded-md px-2 py-1.5 bg-background text-foreground min-w-[140px]"
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
              >
                <option value="">Toutes les villes</option>
                {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-3 pr-1">
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
                            <button type="button"
                              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => toggleGroup(pois)}>
                              {neighborhood} <span className="text-[10px] opacity-60">({ids.length})</span>
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {pois.map(poi => (
                              <Badge key={poi.id}
                                variant={selectedIds.includes(poi.id) ? "default" : "outline"}
                                className="cursor-pointer transition-colors"
                                onClick={() => togglePoi(poi.id)}>
                                {poi.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────── Business Assignment ─────────────────── */
interface BizResult { id: string; name: string; city: string | null; main_category: string | null; }

export const InlineBusinessAssignment = ({
  source, video, onClose, onSaved,
}: {
  source: AssignmentSource;
  video: AssignableVideo;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const T = TABLES[source];
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<BizResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [initialIds, setInitialIds] = useState<string[]>([]);
  const [selectedBiz, setSelectedBiz] = useState<BizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: links } = await supabase.from(T.business as any)
        .select("business_id").eq(T.fk, video.id) as { data: any[] | null };
      const ids = (links || []).map((l: any) => l.business_id);
      setSelectedIds(ids); setInitialIds(ids);
      if (ids.length > 0) {
        const { data: biz } = await supabase.from("businesses")
          .select("id, name, city, main_category").in("id", ids).order("name");
        setSelectedBiz((biz as BizResult[]) || []);
      } else {
        setSelectedBiz([]);
      }
      setLoading(false);
    };
    load();
  }, [video.id, source]);

  useEffect(() => {
    if (searchTerm.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase.from("businesses")
        .select("id, name, city, main_category")
        .ilike("name", `%${searchTerm.trim()}%`)
        .eq("is_active", true).order("name").limit(30);
      setResults((data as BizResult[]) || []); setShowDropdown(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const toggleBiz = (biz: BizResult) => {
    if (selectedIds.includes(biz.id)) {
      setSelectedIds(prev => prev.filter(id => id !== biz.id));
      setSelectedBiz(prev => prev.filter(b => b.id !== biz.id));
    } else {
      setSelectedIds(prev => [...prev, biz.id]);
      setSelectedBiz(prev => [...prev, biz]);
    }
  };
  const removeBiz = (id: string) => {
    setSelectedIds(prev => prev.filter(i => i !== id));
    setSelectedBiz(prev => prev.filter(b => b.id !== id));
  };
  const isDirty = JSON.stringify([...selectedIds].sort()) !== JSON.stringify([...initialIds].sort());

  const save = async () => {
    setSaving(true);
    const toAdd = selectedIds.filter(id => !initialIds.includes(id));
    const toRemove = initialIds.filter(id => !selectedIds.includes(id));
    if (toRemove.length > 0) {
      await supabase.from(T.business as any).delete().eq(T.fk, video.id).in("business_id", toRemove);
    }
    if (toAdd.length > 0) {
      await supabase.from(T.business as any).insert(
        toAdd.map(business_id => ({ [T.fk]: video.id, business_id })) as any
      );
    }
    toast.success(`${selectedIds.length} établissement(s) affecté(s)`);
    setInitialIds([...selectedIds]); onSaved(); setSaving(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4" />Affectation Établissements
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <VideoPreview video={video} />
        <Button onClick={save} disabled={!isDirty || saving} size="sm" className="w-full">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Enregistrer ({selectedIds.length} établissement{selectedIds.length > 1 ? "s" : ""})
        </Button>
        <div className="space-y-1">
          {video.name && <p className="text-sm font-semibold">{video.name}</p>}
          <p className="text-xs text-muted-foreground font-mono">{video.id}</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            {selectedBiz.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {selectedBiz.length} établissement(s) sélectionné(s)
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedBiz.map(b => (
                    <Badge key={b.id} variant="default" className="text-xs gap-1">
                      {b.name}{b.city && <span className="text-primary-foreground/60">({b.city})</span>}
                      <button onClick={() => removeBiz(b.id)} className="ml-0.5 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="relative max-w-xl">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                onFocus={() => results.length > 0 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Rechercher un établissement par nom…"
                className="pl-9"
              />
              {showDropdown && results.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 border rounded-lg bg-popover shadow-lg max-h-60 overflow-y-auto divide-y">
                  {results.map(biz => {
                    const isSelected = selectedIds.includes(biz.id);
                    return (
                      <button key={biz.id}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => toggleBiz(biz)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted/50 transition-colors",
                          isSelected && "bg-primary/10"
                        )}>
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        <span className="font-medium">{biz.name}</span>
                        {biz.city && <span className="text-xs text-muted-foreground">— {biz.city}</span>}
                        {biz.main_category && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 ml-auto">
                            {biz.main_category}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────── Destination + City Assignment ─────────────────── */
interface DestItem { id: string; name_fr: string; city_ids: string[] | null; }

export const InlineDestinationCityAssignment = ({
  source, video, onClose, onSaved,
}: {
  source: AssignmentSource;
  video: AssignableVideo;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const T = TABLES[source];
  const [allDests, setAllDests] = useState<DestItem[]>([]);
  const [selectedDestIds, setSelectedDestIds] = useState<string[]>([]);
  const [initialDestIds, setInitialDestIds] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState("");
  const [cityNames, setCityNames] = useState<Record<string, string>>({});
  const [allCities, setAllCities] = useState<{ id: string; name_fr: string }[]>([]);
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([]);
  const [initialCityIds, setInitialCityIds] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: dests }, { data: destLinks }, { data: cities }, { data: cityLinks }] = await Promise.all([
        supabase.from("destinations").select("id, name_fr, city_ids").order("name_fr"),
        supabase.from(T.destination as any).select("destination_id").eq(T.fk, video.id) as unknown as { data: any[] | null },
        supabase.from("cities").select("id, name_fr").order("name_fr"),
        supabase.from(T.city as any).select("city_id").eq(T.fk, video.id) as unknown as { data: any[] | null },
      ]);
      setAllDests((dests as DestItem[]) || []);
      const dIds = ((destLinks as any[]) || []).map((l: any) => l.destination_id);
      setSelectedDestIds(dIds); setInitialDestIds(dIds);
      const cMap: Record<string, string> = {};
      ((cities as any[]) || []).forEach((c: any) => { cMap[c.id] = c.name_fr; });
      setCityNames(cMap);
      setAllCities((cities as any[]) || []);
      const cIds = ((cityLinks as any[]) || []).map((l: any) => l.city_id);
      setSelectedCityIds(cIds); setInitialCityIds(cIds);
      setLoading(false);
    };
    load();
  }, [video.id, source]);

  const toggleDest = (destId: string) =>
    setSelectedDestIds(prev => prev.includes(destId) ? prev.filter(id => id !== destId) : [...prev, destId]);
  const toggleCity = (cityId: string) =>
    setSelectedCityIds(prev => prev.includes(cityId) ? prev.filter(id => id !== cityId) : [...prev, cityId]);
  const isDestDirty = JSON.stringify([...selectedDestIds].sort()) !== JSON.stringify([...initialDestIds].sort());
  const isCityDirty = JSON.stringify([...selectedCityIds].sort()) !== JSON.stringify([...initialCityIds].sort());
  const isDirty = isDestDirty || isCityDirty;

  const save = async () => {
    setSaving(true);
    if (isDestDirty) {
      const toAdd = selectedDestIds.filter(id => !initialDestIds.includes(id));
      const toRemove = initialDestIds.filter(id => !selectedDestIds.includes(id));
      if (toRemove.length > 0) await supabase.from(T.destination as any).delete().eq(T.fk, video.id).in("destination_id", toRemove);
      if (toAdd.length > 0) await supabase.from(T.destination as any).insert(
        toAdd.map(destination_id => ({ [T.fk]: video.id, destination_id })) as any
      );
    }
    if (isCityDirty) {
      const toAdd = selectedCityIds.filter(id => !initialCityIds.includes(id));
      const toRemove = initialCityIds.filter(id => !selectedCityIds.includes(id));
      if (toRemove.length > 0) await supabase.from(T.city as any).delete().eq(T.fk, video.id).in("city_id", toRemove);
      if (toAdd.length > 0) await supabase.from(T.city as any).insert(
        toAdd.map(city_id => ({ [T.fk]: video.id, city_id })) as any
      );
    }
    toast.success("Affectations sauvegardées");
    setInitialDestIds([...selectedDestIds]);
    setInitialCityIds([...selectedCityIds]);
    onSaved(); setSaving(false);
  };

  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    allDests.forEach(d => { (d.city_ids || []).forEach(cid => { if (cityNames[cid]) citySet.add(cid); }); });
    return Array.from(citySet).sort((a, b) => (cityNames[a] || "").localeCompare(cityNames[b] || ""));
  }, [allDests, cityNames]);

  const filteredDests = useMemo(() => {
    if (!cityFilter) return allDests;
    return allDests.filter(d => (d.city_ids || []).includes(cityFilter));
  }, [allDests, cityFilter]);

  const filteredCities = useMemo(() => {
    if (!citySearch) return allCities;
    const q = citySearch.toLowerCase();
    return allCities.filter(c => c.name_fr.toLowerCase().includes(q));
  }, [allCities, citySearch]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4" />Affectation Destinations & Villes
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <VideoPreview video={video} />
        <Button size="sm" onClick={save} disabled={!isDirty || saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Enregistrer
        </Button>
        <div className="space-y-1">
          {video.name && <p className="text-sm font-semibold">{video.name}</p>}
          <p className="text-xs text-muted-foreground font-mono">{video.id}</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted-foreground shrink-0">
                  Destinations ({selectedDestIds.length})
                </span>
                <select
                  className="text-xs border border-input rounded-md px-2 py-1.5 bg-background text-foreground min-w-[140px]"
                  value={cityFilter}
                  onChange={e => setCityFilter(e.target.value)}>
                  <option value="">Toutes les villes</option>
                  {availableCities.map(cid => <option key={cid} value={cid}>{cityNames[cid]}</option>)}
                </select>
              </div>
              <div className="pr-1">
                {filteredDests.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucune destination trouvée</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {filteredDests.map(dest => (
                      <Badge key={dest.id}
                        variant={selectedDestIds.includes(dest.id) ? "default" : "outline"}
                        className="cursor-pointer transition-colors"
                        onClick={() => toggleDest(dest.id)}>
                        {dest.name_fr}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted-foreground shrink-0 flex items-center gap-1.5">
                  <MapPinned className="h-3.5 w-3.5" />Villes ({selectedCityIds.length})
                </span>
                <Input placeholder="Rechercher…" value={citySearch} onChange={e => setCitySearch(e.target.value)}
                  className="h-7 text-xs max-w-[180px]" />
              </div>
              <div className="pr-1">
                {filteredCities.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucune ville trouvée</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {filteredCities.map(city => (
                      <Badge key={city.id}
                        variant={selectedCityIds.includes(city.id) ? "default" : "outline"}
                        className="cursor-pointer transition-colors"
                        onClick={() => toggleCity(city.id)}>
                        {city.name_fr}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────── Badges + Cities ─────────────────── */
interface BadgeItem { id: string; name_fr: string; color_hex: string | null; }
interface CityItem { id: string; name_fr: string; }

export const InlineBadgeSubcatCityAssignment = ({
  source, video, onClose, onSaved,
}: {
  source: AssignmentSource;
  video: AssignableVideo;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const T = TABLES[source];
  const [allBadges, setAllBadges] = useState<BadgeItem[]>([]);
  const [allCities, setAllCities] = useState<CityItem[]>([]);
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<string[]>([]);
  const [initialBadgeIds, setInitialBadgeIds] = useState<string[]>([]);
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([]);
  const [initialCityIds, setInitialCityIds] = useState<string[]>([]);

  const [citySearch, setCitySearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [
        { data: badges }, { data: cities },
        { data: badgeLinks }, { data: cityLinks },
      ] = await Promise.all([
        supabase.from("badges").select("id, name_fr, color_hex").order("name_fr"),
        supabase.from("cities").select("id, name_fr").order("name_fr"),
        supabase.from(T.badge as any).select("badge_id").eq(T.fk, video.id) as unknown as { data: any[] | null },
        supabase.from(T.city as any).select("city_id").eq(T.fk, video.id) as unknown as { data: any[] | null },
      ]);
      setAllBadges((badges as BadgeItem[]) || []);
      setAllCities((cities as CityItem[]) || []);
      const bIds = (badgeLinks || []).map((l: any) => l.badge_id);
      const ciIds = (cityLinks || []).map((l: any) => l.city_id);
      setSelectedBadgeIds(bIds); setInitialBadgeIds(bIds);
      setSelectedCityIds(ciIds); setInitialCityIds(ciIds);
      setLoading(false);
    };
    load();
  }, [video.id, source]);

  const toggleBadge = (id: string) => setSelectedBadgeIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleCity = (id: string) => setSelectedCityIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const sortedKey = (a: string[]) => JSON.stringify([...a].sort());
  const isBadgeDirty = sortedKey(selectedBadgeIds) !== sortedKey(initialBadgeIds);
  const isCityDirty = sortedKey(selectedCityIds) !== sortedKey(initialCityIds);
  const isDirty = isBadgeDirty || isCityDirty;

  const save = async () => {
    setSaving(true);
    if (isBadgeDirty) {
      const toAdd = selectedBadgeIds.filter(id => !initialBadgeIds.includes(id));
      const toRemove = initialBadgeIds.filter(id => !selectedBadgeIds.includes(id));
      if (toRemove.length > 0) await supabase.from(T.badge as any).delete().eq(T.fk, video.id).in("badge_id", toRemove);
      if (toAdd.length > 0) await supabase.from(T.badge as any).insert(
        toAdd.map(badge_id => ({ [T.fk]: video.id, badge_id })) as any
      );
    }
    if (isCityDirty) {
      const toAdd = selectedCityIds.filter(id => !initialCityIds.includes(id));
      const toRemove = initialCityIds.filter(id => !selectedCityIds.includes(id));
      if (toRemove.length > 0) await supabase.from(T.city as any).delete().eq(T.fk, video.id).in("city_id", toRemove);
      if (toAdd.length > 0) await supabase.from(T.city as any).insert(
        toAdd.map(city_id => ({ [T.fk]: video.id, city_id })) as any
      );
    }
    toast.success("Affectations enregistrées");
    setInitialBadgeIds([...selectedBadgeIds]);
    setInitialCityIds([...selectedCityIds]);
    onSaved(); setSaving(false);
  };


  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return allCities;
    const q = citySearch.toLowerCase();
    return allCities.filter(c => c.name_fr.toLowerCase().includes(q));
  }, [allCities, citySearch]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Tag className="h-4 w-4" />Badges & Villes
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <VideoPreview video={video} />
        <Button size="sm" onClick={save} disabled={!isDirty || saving} className="w-full">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Enregistrer
        </Button>
        <div className="space-y-1">
          {video.name && <p className="text-sm font-semibold">{video.name}</p>}
          <p className="text-xs text-muted-foreground font-mono">{video.id}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            {/* Badges */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Badges ({selectedBadgeIds.length})</span>
              </div>
              {allBadges.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun badge disponible</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allBadges.map(b => (
                    <Badge key={b.id}
                      variant={selectedBadgeIds.includes(b.id) ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() => toggleBadge(b.id)}>
                      {b.name_fr}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Cities */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPinned className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Villes ({selectedCityIds.length})</span>
                </div>
                <Input placeholder="Rechercher…" value={citySearch} onChange={e => setCitySearch(e.target.value)}
                  className="h-7 text-xs max-w-[180px]" />
              </div>
              {filteredCities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Aucune ville trouvée</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredCities.map(c => (
                    <Badge key={c.id}
                      variant={selectedCityIds.includes(c.id) ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() => toggleCity(c.id)}>
                      {c.name_fr}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button size="sm" onClick={save} disabled={!isDirty || saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
