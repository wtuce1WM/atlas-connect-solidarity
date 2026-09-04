import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Copy, Search, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import VideoLightbox from "./VideoLightbox";
import {
  InlineBadgeSubcatCityAssignment,
  InlinePoiAssignment,
  InlineDestinationCityAssignment,
  type AssignmentSource,
} from "./video-assignment/VideoAssignmentPanels";
import type { SidebarMode } from "./video-assignment/BadgeAssignmentSidebar";
import { VideoRelationChips, useVideoRelationCounts } from "./video-assignment/VideoRelationChips";

interface VideoRow {
  id: string;
  url: string;
  name: string | null;
  city: string | null;
  cities: string[];
  neighborhood: string | null;
  thumbnail_url: string | null;
  front_sort_order: number;
  show_on_front: boolean;
  business_name: string;
  source: "business" | "generic";
}

/**
 * Un même fichier vidéo peut être rattaché à plusieurs fiches : on regroupe par
 * URL, comme dans l'onglet « Badgées », pour qu'un badge s'applique à tous les
 * video_id du groupe.
 */
interface VideoGroup {
  key: string;
  primary: VideoRow;
  members: VideoRow[];
}

const groupByUrl = (list: VideoRow[]): VideoGroup[] => {
  const map = new Map<string, VideoRow[]>();
  for (const v of list) {
    const arr = map.get(v.url) || [];
    arr.push(v);
    map.set(v.url, arr);
  }
  return [...map.entries()].map(([key, members]) => ({ key, primary: members[0], members }));
};


/** Panneau droit : Badges & Villes, POI ou Destinations selon le mode. */
const AssignmentPanelByMode = ({
  mode,
  source,
  video,
  siblings,
  onClose,
  onSaved,
}: {
  mode: SidebarMode;
  source: AssignmentSource;
  video: { id: string; url: string; name: string | null; thumbnail_url: string | null; city: string | null };
  siblings?: { id: string; source: AssignmentSource }[];
  onClose: () => void;
  onSaved: () => void;
}) => {
  if (mode === "poi") return <InlinePoiAssignment source={source} video={video} onClose={onClose} onSaved={onSaved} />;
  if (mode === "dest") return <InlineDestinationCityAssignment source={source} video={video} onClose={onClose} onSaved={onSaved} />;
  return (
    <InlineBadgeSubcatCityAssignment
      source={source}
      video={video}
      siblings={siblings}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
};

const VideoDbStructurePanel = () => {
  const [rows, setRows] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "business" | "generic">("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [lastModifiedKey, setLastModifiedKey] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("tags");

  const load = useCallback(async () => {
    setLoading(true);

    // Fetch all business videos with pagination (no 1000 limit)
    const allDocs: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data } = await supabase
        .from("business_documents" as any)
        .select("id, url, name, city, neighborhood, thumbnail_url, front_sort_order, show_on_front, business_id")
        .eq("type", "video")
        .order("business_id")
        .range(offset, offset + batchSize - 1);
      if (data && data.length > 0) {
        allDocs.push(...data);
        offset += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }
    const { isInternalVideoUrl } = await import("@/lib/videoSourceFilter");
    const docs = allDocs.filter(d => isInternalVideoUrl(d.url));

    const bizIds = [...new Set((docs as any[] || []).map(d => d.business_id))];
    // Fetch business names in chunks to avoid 1000-row limit and overly long URLs
    const allBusinesses: { id: string; name: string }[] = [];
    const chunkSize = 200;
    for (let i = 0; i < bizIds.length; i += chunkSize) {
      const chunk = bizIds.slice(i, i + chunkSize);
      const { data } = await supabase.from("businesses").select("id, name").in("id", chunk);
      if (data) allBusinesses.push(...(data as any));
    }
    const nameMap = new Map(allBusinesses.map(b => [b.id, b.name]));

    const bizRows: VideoRow[] = (docs as any[] || []).map(d => ({
      id: d.id,
      url: d.url,
      name: d.name,
      city: d.city,
      cities: [],
      neighborhood: d.neighborhood,
      thumbnail_url: d.thumbnail_url,
      front_sort_order: d.front_sort_order,
      show_on_front: d.show_on_front,
      business_name: nameMap.get(d.business_id) || "?",
      source: "business" as const,
    }));

    // Fetch generic videos
    const { data: generics } = await supabase
      .from("generic_videos" as any)
      .select("id, url, name, city, neighborhood, thumbnail_url, sort_order, instagram_account, tiktok_account, youtube_account")
      .order("sort_order")
      .limit(1000);

    const genRows: VideoRow[] = (generics as any[] || []).map(d => ({
      id: d.id,
      url: d.url,
      name: d.name,
      city: d.city,
      cities: [],
      neighborhood: d.neighborhood,
      thumbnail_url: d.thumbnail_url,
      front_sort_order: d.sort_order ?? 0,
      show_on_front: false,
      business_name: d.instagram_account || d.tiktok_account || d.youtube_account || "— Générique —",
      source: "generic" as const,
    }));

    // Multi-city associations for both sources
    const { fetchVideoCities } = await import("@/lib/fetchVideoCities");
    const { businessDocCities, genericVideoCities } = await fetchVideoCities({
      businessDocumentIds: bizRows.map(r => r.id),
      genericVideoIds: genRows.map(r => r.id),
    });
    bizRows.forEach(r => {
      const m = businessDocCities.get(r.id) || [];
      r.cities = m.length > 0 ? m : (r.city ? [r.city] : []);
    });
    genRows.forEach(r => {
      const m = genericVideoCities.get(r.id) || [];
      r.cities = m.length > 0 ? m : (r.city ? [r.city] : []);
    });

    setRows([...bizRows, ...genRows]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    if (typeFilter === "business" && r.source !== "business") return false;
    if (typeFilter === "generic" && r.source !== "generic") return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return r.business_name.toLowerCase().includes(s) ||
      r.id.includes(s) ||
      r.cities.some(c => c.toLowerCase().includes(s)) ||
      (r.name || "").toLowerCase().includes(s);
  });

  const groups = useMemo(() => groupByUrl(filtered), [filtered]);

  const badgeSource = (v: VideoRow): AssignmentSource => (v.source === "generic" ? "generic" : "document");

  const relationItems = useMemo(
    () => groups.map(g => ({ id: g.primary.id, source: badgeSource(g.primary) })),
    [groups],
  );
  const { counts: relationCounts, refreshCounts } = useVideoRelationCounts(relationItems);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const bizCount = rows.filter(r => r.source === "business").length;
  const genCount = rows.filter(r => r.source === "generic").length;

  const selectedMembers = selectedKey ? filtered.filter(v => v.url === selectedKey) : [];

  const GroupCard = ({ g }: { g: VideoGroup }) => {
    const v = g.primary;
    const selected = selectedKey === g.key;
    const names = Array.from(new Set(g.members.map(m => m.business_name)));
    const allCities = Array.from(new Set(g.members.flatMap(m => m.cities)));
    const justModified = lastModifiedKey === g.key;
    return (
      <div
        data-video-key={g.key}
        onClick={() => { setSidebarMode("tags"); setSelectedKey(g.key); }}
        className={`relative flex flex-col rounded-lg border bg-background p-1.5 cursor-pointer transition-colors ${selected ? "border-primary ring-2 ring-primary" : "hover:border-muted-foreground/30"} ${justModified ? "ring-[6px] ring-emerald-500 border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.35),0_0_28px_8px_rgba(16,185,129,0.55)] animate-pulse" : ""}`}
      >
        {justModified && (
          <div className="absolute inset-x-0 top-0 z-30 bg-emerald-500 text-white text-[13px] font-extrabold tracking-wide text-center py-1.5 shadow-md rounded-t-lg">
            ✓ MODIFIÉE À L'INSTANT
          </div>
        )}

        <button
          className="relative bg-black rounded overflow-hidden group flex-shrink-0 w-full"
          style={{ height: 110 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            (e.currentTarget as HTMLButtonElement).blur();
            setLightboxUrl(v.url);
          }}
        >
          {v.thumbnail_url ? (
            <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : v.url.includes("supabase.co/storage") ? (
            <video src={v.url} className="w-full h-full object-cover" muted preload="metadata" />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
          <span className={`absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded font-bold ${v.source === "generic" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
            {v.source === "generic" ? "GEN" : "BIZ"}
          </span>
          {g.members.length > 1 && (
            <span className="absolute top-1 right-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              ×{g.members.length}
            </span>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center">
              <Play className="h-4 w-4 text-primary-foreground fill-primary-foreground ml-0.5" />
            </div>
          </div>
        </button>
        <div className="mt-1.5">
          <p className="text-sm font-medium leading-tight">{names.slice(0, 2).join(", ")}{names.length > 2 ? ` +${names.length - 2}` : ""}</p>
          {g.members.length > 1 && (
            <p className="text-[11px] font-semibold text-primary leading-tight">
              Même fichier sur {g.members.length} fiches — badge appliqué à toutes
            </p>
          )}
          {(allCities.length > 0 || v.neighborhood) && (
            <p className="text-[11px] text-muted-foreground/70 truncate">
              {[allCities.join(", "), v.neighborhood].filter(Boolean).join(" · ")}
            </p>
          )}
          {v.name && <p className="text-[11px] text-muted-foreground/70 truncate">{v.name}</p>}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const ids = g.members.map(m => m.id).join("\n");
              navigator.clipboard.writeText(ids);
              toast.success(g.members.length > 1 ? `${g.members.length} IDs copiés` : `ID copié : ${v.id.slice(0, 8)}…`);
            }}
            className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground/60 hover:text-primary transition-colors text-left"
            title="Copier tous les IDs du fichier"
          >
            <Copy className="h-3 w-3 flex-shrink-0" />
            {v.id}{g.members.length > 1 ? ` +${g.members.length - 1}` : ""}
          </button>
          <VideoRelationChips
            counts={relationCounts.get(v.id)}
            onOpenPoi={() => { setSidebarMode("poi"); setSelectedKey(g.key); }}
            onOpenDest={() => { setSidebarMode("dest"); setSelectedKey(g.key); }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-base font-semibold">Toutes les vidéos ({rows.length})</h3>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as any); setSelectedKey(null); }}>
          <SelectTrigger className="h-8 text-xs w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes ({rows.length})</SelectItem>
            <SelectItem value="business">Entreprise ({bizCount})</SelectItem>
            <SelectItem value="generic">Générique ({genCount})</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer par établissement, ville, ID…"
            className="h-8 text-xs pl-7"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {groups.length} fichier{groups.length > 1 ? "s" : ""} · {filtered.length} vidéo{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex gap-4 items-start">
        <div
          className={`grid gap-3 ${selectedKey ? "w-1/2 grid-cols-2 xl:grid-cols-3" : "w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"}`}
        >
          {groups.map(g => <GroupCard key={g.key} g={g} />)}
        </div>

        {selectedKey && selectedMembers.length > 0 && (
          <div className="w-1/2 shrink-0 sticky top-24 h-[calc(100vh-7rem)] overflow-hidden border-l bg-card rounded-lg">
            <AssignmentPanelByMode
              mode={sidebarMode}
              source={badgeSource(selectedMembers[0])}
              video={{
                id: selectedMembers[0].id,
                url: selectedMembers[0].url,
                name: selectedMembers[0].name,
                thumbnail_url: selectedMembers[0].thumbnail_url,
                city: selectedMembers[0].city,
              }}
              siblings={selectedMembers.slice(1).map(m => ({ id: m.id, source: badgeSource(m) }))}
              onClose={() => setSelectedKey(null)}
              onSaved={() => {
                setLastModifiedKey(selectedKey);
                refreshCounts();
                setSelectedKey(null);
              }}
            />
          </div>
        )}
      </div>

      {lightboxUrl && <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
};

export default VideoDbStructurePanel;
