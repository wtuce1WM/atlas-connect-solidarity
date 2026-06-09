import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITIES, type City } from "@/lib/homeHelpers";
import BottomTabsCarousel, { TabScrollRail, TabVideoCard, TabCard, type BottomTabConfig } from "@/components/BottomTabsCarousel";
import { getVideoInfo } from "@/lib/overlayConstants";
import FullscreenVideoOverlay from "@/components/overlays/FullscreenVideoOverlay";
import { businessUrl } from "@/lib/businessUrl";

interface Props {
  city: City;
  cityRowId: string | null;
  onCityChange: (city: City) => void;
}

interface DestinationOpt { id: string; name: string; cityIds: string[] }

interface DestVideo {
  url: string;
  name: string | null;
  ownerName: string;
  thumbnailUrl: string | null;
}

interface BizCard {
  id: string;
  name: string;
  slug: string | null;
  images: string[] | null;
  computed_rating: number | null;
  rating: number | null;
  total_review_count: number | null;
}

interface FrontTab { id: string; name: string; businesses: BizCard[] }

const FooterCityDestinations = ({ city, cityRowId, onCityChange }: Props) => {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState<DestinationOpt[]>([]);
  const [selectedDestId, setSelectedDestId] = useState<string>("");
  const [selectedDest, setSelectedDest] = useState<DestinationOpt | null>(null);
  const [destVideos, setDestVideos] = useState<DestVideo[]>([]);
  const [frontTabs, setFrontTabs] = useState<FrontTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);

  useEffect(() => {
    if (!cityRowId) { setDestinations([]); setSelectedDestId(""); return; }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase
        .from("destinations" as any)
        .select("id, name_fr, city_ids")
        .contains("city_ids", [cityRowId]) as any);
      if (cancelled) return;
      const list = ((data || []) as any[])
        .map((d) => ({ id: d.id as string, name: (d.name_fr as string) || "", cityIds: (d.city_ids as string[]) || [] }))
        .filter((d) => d.name)
        .sort((a, b) => a.name.localeCompare(b.name, "fr"));
      setDestinations(list);
      setSelectedDestId("");
      setSelectedDest(null);
      setDestVideos([]);
      setFrontTabs([]);
    })();
    return () => { cancelled = true; };
  }, [cityRowId]);

  // Fetch videos for the selected destination
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

  // Fetch front_structure tabs (same logic as DestinationSlidePanel)
  useEffect(() => {
    if (!selectedDest) { setFrontTabs([]); return; }
    let cancelled = false;
    (async () => {
      const { data: links } = await (supabase
        .from("business_destinations" as any)
        .select("business_id")
        .eq("destination_id", selectedDest.id) as any);
      if (cancelled) return;
      if (!links || links.length === 0) { setFrontTabs([]); return; }

      const bizIds = (links as any[]).map((l: any) => l.business_id as string);

      const [fsRes, fssRes, subsRes] = await Promise.all([
        supabase.from("front_structure").select("id, name, sort_order").order("sort_order"),
        supabase.from("front_structure_subcategories").select("front_structure_id, subcategory_id"),
        supabase.from("subcategories").select("id, name_fr, name_en, name_ar"),
      ]);
      if (cancelled) return;
      const fsEntries = fsRes.data || [];
      const fssLinks = fssRes.data || [];
      const subMap = new Map((subsRes.data || []).map((s: any) => [s.id, s]));

      const fsSubNames = new Map<string, Set<string>>();
      for (const link of fssLinks) {
        const sub = subMap.get(link.subcategory_id);
        if (!sub) continue;
        if (!fsSubNames.has(link.front_structure_id)) fsSubNames.set(link.front_structure_id, new Set());
        const s = fsSubNames.get(link.front_structure_id)!;
        if (sub.name_fr) s.add(sub.name_fr);
        if (sub.name_en) s.add(sub.name_en);
        if (sub.name_ar) s.add(sub.name_ar);
      }

      let destCityNames = new Set<string>();
      if (selectedDest.cityIds && selectedDest.cityIds.length > 0) {
        const { data: cityRows } = await supabase
          .from("cities")
          .select("name_fr")
          .in("id", selectedDest.cityIds);
        if (cityRows) cityRows.forEach((c: any) => { if (c.name_fr) destCityNames.add(c.name_fr); });
      }

      const all: any[] = [];
      for (let i = 0; i < bizIds.length; i += 500) {
        const chunk = bizIds.slice(i, i + 500);
        const { data } = await supabase
          .from("businesses")
          .select("id, name, slug, city, images, computed_rating, rating, total_review_count, categories, wtuce_status")
          .eq("is_active", true)
          .in("id", chunk);
        if (data) all.push(...data);
      }
      if (cancelled) return;

      const filtered = destCityNames.size > 0
        ? all.filter((biz) => biz.city && destCityNames.has(biz.city))
        : all;

      const tabs: FrontTab[] = [];
      for (const fs of fsEntries) {
        const subNames = fsSubNames.get(fs.id);
        if (!subNames || subNames.size === 0) continue;
        const matching = filtered.filter((biz) =>
          biz.categories?.some((cat: string) => subNames.has(cat))
        );
        if (matching.length === 0) continue;
        matching.sort((a: any, b: any) => {
          const aV = a.wtuce_status === "verified" ? 1 : 0;
          const bV = b.wtuce_status === "verified" ? 1 : 0;
          if (bV !== aV) return bV - aV;
          const aCount = a.total_review_count ?? 0;
          const bCount = b.total_review_count ?? 0;
          const aRating = aCount >= 10 ? (a.computed_rating ?? a.rating ?? 0) : -1;
          const bRating = bCount >= 10 ? (b.computed_rating ?? b.rating ?? 0) : -1;
          return bRating - aRating;
        });
        tabs.push({ id: fs.id, name: fs.name, businesses: matching });
      }
      setFrontTabs(tabs);
    })();
    return () => { cancelled = true; };
  }, [selectedDest]);

  // Build BottomTabsCarousel tabs
  const tabs: BottomTabConfig[] = [];
  if (destVideos.length > 0) {
    tabs.push({
      id: "videos",
      label: "Vidéos",
      renderContent: (animate, animCls) => (
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
                animate={animate}
                animationClass={animCls}
                animationDelay={index * 120}
              />
            );
          })}
        </TabScrollRail>
      ),
    });
  }
  for (const ft of frontTabs) {
    tabs.push({
      id: `fs-${ft.id}`,
      label: ft.name,
      renderContent: (animate, animCls) => (
        <TabScrollRail>
          {ft.businesses.map((biz, index) => {
            const bizImg = biz.images && biz.images.length > 0 ? biz.images[0] : null;
            const ratingValue = biz.computed_rating ?? biz.rating ?? null;
            const ratingBadge = ratingValue ? (
              <span className="absolute top-1.5 right-1.5 bg-gold text-black text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-md leading-tight flex items-center gap-0.5">
                <Star className="h-2.5 w-2.5" style={{ color: "#C04F17" }} />
                {(Math.round(Number(ratingValue) * 10) / 10).toFixed(1)}
              </span>
            ) : null;
            return (
              <TabCard
                key={biz.id}
                imageUrl={bizImg}
                label={biz.name}
                onClick={() => navigate(businessUrl(biz))}
                animate={animate}
                animationClass={animCls}
                animationDelay={index * 120}
                imageOverlay={ratingBadge}
              />
            );
          })}
        </TabScrollRail>
      ),
    });
  }

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
            onValueChange={(id) => {
              setSelectedDestId(id);
              setSelectedDest(destinations.find((d) => d.id === id) || null);
              setActiveTabId("");
            }}
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

      {selectedDestId && tabs.length > 0 && (
        <div className="w-full mt-6 -mx-4">
          <BottomTabsCarousel
            tabs={tabs}
            activeTab={activeTabId || tabs[0]?.id}
            onTabChange={setActiveTabId}
          />
        </div>
      )}

      {selectedDestId && tabs.length === 0 && (
        <div className="max-w-3xl mx-auto mt-6 text-center text-sm text-muted-foreground">
          Aucun contenu pour cette destination.
        </div>
      )}

      {fullscreenVideo && (
        <FullscreenVideoOverlay videoUrl={fullscreenVideo} onClose={() => setFullscreenVideo(null)} />
      )}
    </div>
  );
};

export default FooterCityDestinations;
