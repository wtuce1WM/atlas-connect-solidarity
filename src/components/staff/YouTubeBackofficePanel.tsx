import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Play,
  ChevronDown,
  ChevronUp,
  MapPin,
  Building2,
  Search,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface Business {
  id: string;
  name: string;
  city: string | null;
  youtube_url: string | null;
}

interface YouTubeVideo {
  id: string;
  business_id: string;
  video_id: string;
  title: string;
  thumbnail: string;
  is_short: boolean;
  is_visible: boolean;
  destination_id: string | null;
}

interface Destination {
  id: string;
  name_fr: string;
}

interface POI {
  id: string;
  name_fr: string;
  city_id: string;
  latitude: number | null;
  longitude: number | null;
}

interface City {
  id: string;
  name: string;
}

interface Neighborhood {
  id: string;
  name: string;
  city_id: string;
  latitude: number | null;
  longitude: number | null;
}

const YouTubeBackofficePanel = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [videosByBusiness, setVideosByBusiness] = useState<Record<string, YouTubeVideo[]>>({});
  const [poisByVideo, setPoisByVideo] = useState<Record<string, string[]>>({});
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [cityByVideo, setCityByVideo] = useState<Record<string, string>>({});
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [bizRes, videosRes, destRes, poiRes, vpoiRes, citiesRes, nbRes] = await Promise.all([
      supabase
        .from("businesses")
        .select("id, name, city, youtube_url")
        .eq("show_youtube_tab", true)
        .order("name"),
      supabase
        .from("business_youtube_videos")
        .select("id, business_id, video_id, title, thumbnail, is_short, is_visible, destination_id")
        .order("sort_order"),
      supabase.from("destinations").select("id, name_fr").order("name_fr"),
      supabase.from("points_of_interest").select("id, name_fr, city_id, latitude, longitude").order("name_fr"),
      supabase.from("business_youtube_video_pois").select("youtube_video_id, point_of_interest_id"),
      supabase.from("cities").select("id, name_fr").order("name_fr"),
      supabase.from("neighborhoods").select("id, name, city_id, latitude, longitude").order("sort_order"),
    ]);

    if (bizRes.data) setBusinesses(bizRes.data as Business[]);
    if (destRes.data) setDestinations(destRes.data as Destination[]);
    const poisData = (poiRes.data || []) as POI[];
    setPois(poisData);
    if (citiesRes.data) setCities((citiesRes.data as any[]).map((c) => ({ id: c.id, name: c.name_fr })));
    if (nbRes.data) setNeighborhoods(nbRes.data as Neighborhood[]);

    const grouped: Record<string, YouTubeVideo[]> = {};
    (videosRes.data || []).forEach((v: any) => {
      if (!grouped[v.business_id]) grouped[v.business_id] = [];
      grouped[v.business_id].push(v);
    });
    setVideosByBusiness(grouped);

    const poiMap: Record<string, string[]> = {};
    (vpoiRes.data || []).forEach((row: any) => {
      if (!poiMap[row.youtube_video_id]) poiMap[row.youtube_video_id] = [];
      poiMap[row.youtube_video_id].push(row.point_of_interest_id);
    });
    setPoisByVideo(poiMap);

    const cityMap: Record<string, string> = {};
    Object.entries(poiMap).forEach(([videoId, poiIds]) => {
      const firstPoi = poisData.find((p) => p.id === poiIds[0]);
      if (firstPoi) cityMap[videoId] = firstPoi.city_id;
    });
    setCityByVideo(cityMap);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleVisibility = async (video: YouTubeVideo) => {
    const newVal = !video.is_visible;
    setVideosByBusiness((prev) => ({
      ...prev,
      [video.business_id]: prev[video.business_id].map((v) =>
        v.id === video.id ? { ...v, is_visible: newVal } : v
      ),
    }));
    const { error } = await supabase
      .from("business_youtube_videos")
      .update({ is_visible: newVal })
      .eq("id", video.id);
    if (error) toast.error("Erreur de mise à jour");
  };

  const updateDestination = async (video: YouTubeVideo, destId: string | null) => {
    setVideosByBusiness((prev) => ({
      ...prev,
      [video.business_id]: prev[video.business_id].map((v) =>
        v.id === video.id ? { ...v, destination_id: destId } : v
      ),
    }));
    const { error } = await supabase
      .from("business_youtube_videos")
      .update({ destination_id: destId })
      .eq("id", video.id);
    if (error) toast.error("Erreur de mise à jour destination");
    else toast.success("Destination mise à jour");
  };

  const togglePoi = async (videoId: string, poiId: string) => {
    const current = poisByVideo[videoId] || [];
    const isSelected = current.includes(poiId);

    if (isSelected) {
      setPoisByVideo((prev) => ({
        ...prev,
        [videoId]: current.filter((id) => id !== poiId),
      }));
      const { error } = await supabase
        .from("business_youtube_video_pois")
        .delete()
        .eq("youtube_video_id", videoId)
        .eq("point_of_interest_id", poiId);
      if (error) toast.error("Erreur");
    } else {
      setPoisByVideo((prev) => ({
        ...prev,
        [videoId]: [...current, poiId],
      }));
      const { error } = await supabase
        .from("business_youtube_video_pois")
        .insert({ youtube_video_id: videoId, point_of_interest_id: poiId });
      if (error) toast.error("Erreur");
    }
  };

  const togglePoiGroup = async (videoId: string, poiIds: string[], allSelected: boolean) => {
    const current = poisByVideo[videoId] || [];
    if (allSelected) {
      const next = current.filter((id) => !poiIds.includes(id));
      setPoisByVideo((prev) => ({ ...prev, [videoId]: next }));
      await supabase
        .from("business_youtube_video_pois")
        .delete()
        .eq("youtube_video_id", videoId)
        .in("point_of_interest_id", poiIds);
    } else {
      const toAdd = poiIds.filter((id) => !current.includes(id));
      if (toAdd.length === 0) return;
      setPoisByVideo((prev) => ({ ...prev, [videoId]: [...current, ...toAdd] }));
      await supabase
        .from("business_youtube_video_pois")
        .insert(toAdd.map((id) => ({ youtube_video_id: videoId, point_of_interest_id: id })));
    }
  };

  const filtered = businesses.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.city || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} entreprise{filtered.length > 1 ? "s" : ""} avec onglet YouTube activé
        </p>
      </div>

      <div className="space-y-2">
        {filtered.map((business) => {
          const videos = videosByBusiness[business.id] || [];
          const isOpen = openIds.has(business.id);
          const visibleCount = videos.filter((v) => v.is_visible).length;
          const shortsCount = videos.filter((v) => v.is_short).length;

          return (
            <Collapsible
              key={business.id}
              open={isOpen}
              onOpenChange={() => toggleOpen(business.id)}
              className="border rounded-lg bg-card"
            >
              <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 text-left">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{business.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {business.city || "—"} · {videos.length} vidéo{videos.length > 1 ? "s" : ""}
                      {videos.length > 0 && (
                        <>
                          {" · "}
                          {visibleCount} visible{visibleCount > 1 ? "s" : ""}
                          {" · "}
                          {shortsCount} short{shortsCount > 1 ? "s" : ""}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </CollapsibleTrigger>

              <CollapsibleContent className="px-3 pb-3">
                {videos.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Aucune vidéo synchronisée pour cette entreprise.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {videos.map((video) => {
                      const selectedPois = poisByVideo[video.id] || [];
                      return (
                        <div
                          key={video.id}
                          className={`border rounded-lg overflow-hidden bg-background transition-opacity ${
                            !video.is_visible ? "opacity-50" : ""
                          }`}
                        >
                          <div className="aspect-video relative bg-muted">
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                            {video.is_short && (
                              <Badge className="absolute top-2 left-2 bg-red-600 hover:bg-red-600 text-white text-[10px]">
                                SHORT
                              </Badge>
                            )}
                          </div>
                          <div className="p-2 space-y-2">
                            <div className="flex items-start gap-2">
                              <Switch
                                checked={video.is_visible}
                                onCheckedChange={() => toggleVisibility(video)}
                                className="mt-0.5 scale-75"
                              />
                              <p className="text-xs leading-tight line-clamp-2 flex-1 font-medium">
                                {video.title}
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> Destination
                              </label>
                              <Select
                                value={video.destination_id || "none"}
                                onValueChange={(val) =>
                                  updateDestination(video, val === "none" ? null : val)
                                }
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="Aucune" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">— Aucune —</SelectItem>
                                  {destinations.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>
                                      {d.name_fr}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                                Ville
                              </label>
                              <Select
                                value={cityByVideo[video.id] || "none"}
                                onValueChange={(val) =>
                                  setCityByVideo((prev) => ({
                                    ...prev,
                                    [video.id]: val === "none" ? "" : val,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="Aucune" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">— Aucune —</SelectItem>
                                  {cities.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                                POIs ({selectedPois.length})
                              </label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!cityByVideo[video.id]}
                                    className="h-7 w-full justify-start text-xs font-normal"
                                  >
                                    {!cityByVideo[video.id]
                                      ? "Sélectionnez d'abord une ville"
                                      : selectedPois.length === 0
                                      ? "Aucun POI sélectionné"
                                      : `${selectedPois.length} POI${selectedPois.length > 1 ? "s" : ""} sélectionné${selectedPois.length > 1 ? "s" : ""}`}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-0" align="start">
                                  <div className="max-h-64 overflow-y-auto p-1 space-y-2">
                                    {(() => {
                                      const cityId = cityByVideo[video.id];
                                      const cityPois = pois.filter((p) => p.city_id === cityId);
                                      if (cityPois.length === 0) {
                                        return (
                                          <p className="text-xs text-muted-foreground text-center py-3">
                                            Aucun POI dans cette ville.
                                          </p>
                                        );
                                      }
                                      const cityNbs = neighborhoods.filter((n) => n.city_id === cityId);
                                      const groups: Record<string, POI[]> = {};
                                      cityPois.forEach((p) => {
                                        let key = "Autre";
                                        if (p.latitude != null && p.longitude != null && cityNbs.length > 0) {
                                          let best: { name: string; d: number } | null = null;
                                          cityNbs.forEach((n) => {
                                            if (n.latitude == null || n.longitude == null) return;
                                            const dx = (n.latitude - p.latitude!);
                                            const dy = (n.longitude - p.longitude!);
                                            const d = dx * dx + dy * dy;
                                            if (!best || d < best.d) best = { name: n.name, d };
                                          });
                                          if (best) key = best.name;
                                        }
                                        if (!groups[key]) groups[key] = [];
                                        groups[key].push(p);
                                      });
                                      const sortedKeys = Object.keys(groups).sort((a, b) =>
                                        a === "Autre" ? 1 : b === "Autre" ? -1 : a.localeCompare(b)
                                      );
                                      return sortedKeys.map((nbName) => (
                                        <div key={nbName}>
                                          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold sticky top-0 bg-popover">
                                            {nbName}{" "}
                                            <span className="opacity-60 normal-case">
                                              ({groups[nbName].length})
                                            </span>
                                          </div>
                                          {groups[nbName].map((poi) => {
                                            const checked = selectedPois.includes(poi.id);
                                            return (
                                              <button
                                                key={poi.id}
                                                onClick={() => togglePoi(video.id, poi.id)}
                                                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded text-left"
                                              >
                                                <div className="w-4 h-4 border rounded flex items-center justify-center shrink-0">
                                                  {checked && <Check className="h-3 w-3 text-primary" />}
                                                </div>
                                                <span className="flex-1">{poi.name_fr}</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </PopoverContent>
                              </Popover>
                              {selectedPois.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {selectedPois.map((pid) => {
                                    const poi = pois.find((p) => p.id === pid);
                                    if (!poi) return null;
                                    return (
                                      <Badge
                                        key={pid}
                                        variant="secondary"
                                        className="text-[10px] gap-1 pr-1"
                                      >
                                        {poi.name_fr}
                                        <button
                                          onClick={() => togglePoi(video.id, pid)}
                                          className="hover:bg-background rounded"
                                        >
                                          <X className="h-2.5 w-2.5" />
                                        </button>
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucune entreprise trouvée.
          </p>
        )}
      </div>
    </div>
  );
};

export default YouTubeBackofficePanel;
