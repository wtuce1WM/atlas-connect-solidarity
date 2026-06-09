import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITIES, type City } from "@/lib/homeHelpers";
import { TabScrollRail, TabVideoCard } from "@/components/BottomTabsCarousel";
import { n as getVideoInfo } from "@/lib/overlayConstants";
import FullscreenVideoOverlay from "@/components/overlays/FullscreenVideoOverlay";

interface Props {
  city: City;
  cityRowId: string | null;
  onCityChange: (city: City) => void;
}

interface DestinationOpt {
  id: string;
  name: string;
}

interface DestVideo {
  url: string;
  name: string | null;
  ownerName: string;
  thumbnailUrl: string | null;
}

const FooterCityDestinations = ({ city, cityRowId, onCityChange }: Props) => {
  const [destinations, setDestinations] = useState<DestinationOpt[]>([]);
  const [selectedDestId, setSelectedDestId] = useState<string>("");
  const [destVideos, setDestVideos] = useState<DestVideo[]>([]);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);

  useEffect(() => {
    if (!cityRowId) { setDestinations([]); setSelectedDestId(""); return; }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase
        .from("destinations" as any)
        .select("id, name_fr, city_ids, is_searchable")
        .contains("city_ids", [cityRowId])
        .eq("is_searchable", true) as any);
      if (cancelled) return;
      const list = ((data || []) as any[])
        .map((d) => ({ id: d.id as string, name: (d.name_fr as string) || "" }))
        .filter((d) => d.name)
        .sort((a, b) => a.name.localeCompare(b.name, "fr"));
      setDestinations(list);
      setSelectedDestId("");
      setDestVideos([]);
    })();
    return () => { cancelled = true; };
  }, [cityRowId]);

  useEffect(() => {
    if (!selectedDestId) { setDestVideos([]); return; }
    let cancelled = false;
    (async () => {
      const [docsRes, gvLinksRes] = await Promise.all([
        supabase
          .from("business_documents")
          .select("url, name, thumbnail_url, business_id, sort_order")
          .eq("type", "video")
          .eq("business_is_active", true)
          .eq("destination_id", selectedDestId),
        supabase
          .from("generic_video_destinations" as any)
          .select("generic_video_id, sort_order")
          .eq("destination_id", selectedDestId) as any,
      ]);
      if (cancelled) return;

      const docs = (docsRes.data || []) as any[];
      const gvLinks = ((gvLinksRes.data || []) as any[]) as { generic_video_id: string; sort_order: number | null }[];
      const ownerIds = [...new Set(docs.map((d) => d.business_id))];
      const gvIds = [...new Set(gvLinks.map((l) => l.generic_video_id))];

      const [ownersRes, gvsRes] = await Promise.all([
        ownerIds.length
          ? supabase.from("businesses").select("id, name").in("id", ownerIds)
          : Promise.resolve({ data: [] as any[] } as any),
        gvIds.length
          ? (supabase.from("generic_videos" as any).select("id, url, name, thumbnail_url").in("id", gvIds) as any)
          : Promise.resolve({ data: [] as any[] } as any),
      ]);
      if (cancelled) return;

      const ownerMap = new Map(((ownersRes.data as any[]) || []).map((o: any) => [o.id, o]));
      const gvMap = new Map(((gvsRes.data as any[]) || []).map((g: any) => [g.id, g]));

      const docItems = docs.map((d: any) => ({
        url: d.url as string,
        name: (d.name as string | null) ?? null,
        ownerName: (ownerMap.get(d.business_id) as any)?.name || "",
        thumbnailUrl: (d.thumbnail_url as string | null) ?? null,
        sortOrder: (d.sort_order as number | null) ?? 0,
      }));

      const gvItems = gvLinks
        .map((l) => {
          const gv = gvMap.get(l.generic_video_id) as any;
          if (!gv?.url) return null;
          return {
            url: gv.url as string,
            name: (gv.name as string | null) ?? null,
            ownerName: "",
            thumbnailUrl: (gv.thumbnail_url as string | null) ?? null,
            sortOrder: l.sort_order ?? 0,
          };
        })
        .filter(Boolean) as typeof docItems;

      const merged = [...docItems, ...gvItems].sort((a, b) => a.sortOrder - b.sortOrder);
      setDestVideos(merged.map(({ sortOrder, ...rest }) => rest));
    })();
    return () => { cancelled = true; };
  }, [selectedDestId]);

  return (
    <div className="w-full border-t border-border/40 mt-8 py-8 px-4">
      <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Ville
          </label>
          <Select value={city} onValueChange={(v) => onCityChange(v as City)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Choisir une ville" />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Destinations
          </label>
          <Select
            value={selectedDestId}
            onValueChange={(id) => setSelectedDestId(id)}
            disabled={destinations.length === 0}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={destinations.length === 0 ? "Aucune destination" : "Choisir une destination"} />
            </SelectTrigger>
            <SelectContent>
              {destinations.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedDestId && destVideos.length > 0 && (
        <div className="max-w-5xl mx-auto mt-6">
          <TabScrollRail>
            {destVideos.map((cv, index) => {
              const info = getVideoInfo(cv.url);
              return (
                <TabVideoCard
                  key={index}
                  thumbnailUrl={cv.thumbnailUrl}
                  platformThumbnailUrl={info.thumbnail}
                  label={cv.name || cv.ownerName || `Vidéo ${index + 1}`}
                  onClick={() => setFullscreenVideo(cv.url)}
                />
              );
            })}
          </TabScrollRail>
        </div>
      )}

      {selectedDestId && destVideos.length === 0 && (
        <div className="max-w-3xl mx-auto mt-6 text-center text-sm text-muted-foreground">
          Aucune vidéo pour cette destination.
        </div>
      )}

      {fullscreenVideo && (
        <FullscreenVideoOverlay videoUrl={fullscreenVideo} onClose={() => setFullscreenVideo(null)} />
      )}
    </div>
  );
};

export default FooterCityDestinations;
