/**
 * YouTube Backoffice Panel — refonte ergonomique.
 *
 * Vue principale : 1 ligne par établissement (tri alpha) ayant `show_youtube_tab=true`.
 *   • bouton "Synchroniser" par ligne (et un global)
 *   • compteur de vidéos importées
 *   • clic sur la ligne → liste des vidéos YouTube importées (titre + miniature + lecture)
 *
 * Clic sur l'un des 4 boutons (POI / Établissements / Destinations / Tags) d'une vidéo →
 * ouvre un panneau d'affectation à droite (50% largeur), réutilisé depuis
 * `video-assignment/VideoAssignmentPanels.tsx` avec `source="youtube"`.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Loader2, Search, RefreshCw, ChevronRight, ChevronDown, Play,
  MapPin, Building2, Globe, Tag, Image as ImageIcon, Youtube as YoutubeIcon, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  InlinePoiAssignment,
  InlineBusinessAssignment,
  InlineDestinationCityAssignment,
  InlineBadgeSubcatCityAssignment,
  type AssignableVideo,
} from "./video-assignment/VideoAssignmentPanels";
import InlineThumbnailAssignment from "./video-assignment/InlineThumbnailAssignment";
import VideoLightbox from "./VideoLightbox";

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
  thumbnail: string | null;
  custom_thumbnail_url: string | null;
  thumbnail_locked: boolean;
  is_short: boolean;
  is_visible: boolean;
}

type PanelKind = "poi" | "business" | "destination" | "tags" | "thumbnail";

const YouTubeBackofficePanel = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [videosByBusiness, setVideosByBusiness] = useState<Record<string, YouTubeVideo[]>>({});
  const [counts, setCounts] = useState<Record<string, { poi: number; business: number; destination: number; tags: number }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [themes, setThemes] = useState<{ id: string; name_fr: string }[]>([]);
  const [themesByBusiness, setThemesByBusiness] = useState<Record<string, Set<string>>>({});

  /** Currently opened right-side assignment panel. */
  const [activePanel, setActivePanel] = useState<{ kind: PanelKind; video: AssignableVideo } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [bizRes, videosAll, poiAll, bizLinkAll, destAll, badgeAll, subcatAll, cityAll, themesRes, bizThemesRes] = await Promise.all([
      supabase
        .from("businesses")
        .select("id, name, city, youtube_url")
        .eq("show_youtube_tab", true)
        .not("youtube_url", "is", null)
        .order("name"),
      fetchAllRows<any>(
        "business_youtube_videos",
        "id, business_id, video_id, title, thumbnail, custom_thumbnail_url, thumbnail_locked, is_short, is_visible",
        "sort_order",
      ),
      fetchAllRows<any>("business_youtube_video_pois", "youtube_video_id", "youtube_video_id"),
      fetchAllRows<any>("business_youtube_video_businesses", "youtube_video_id", "youtube_video_id"),
      fetchAllRows<any>("business_youtube_video_destinations", "youtube_video_id", "youtube_video_id"),
      fetchAllRows<any>("business_youtube_video_badges", "youtube_video_id", "youtube_video_id"),
      fetchAllRows<any>("business_youtube_video_subcategories", "youtube_video_id", "youtube_video_id"),
      fetchAllRows<any>("business_youtube_video_cities", "youtube_video_id", "youtube_video_id"),
      (supabase.from("youtube_themes" as any).select("id, name_fr").order("sort_order") as any),
      (supabase.from("business_youtube_themes" as any).select("business_id, theme_id") as any),
    ]);

    if (bizRes.data) setBusinesses(bizRes.data as Business[]);
    if (themesRes?.data) setThemes(themesRes.data as any);
    const tMap: Record<string, Set<string>> = {};
    (bizThemesRes?.data || []).forEach((r: any) => {
      if (!tMap[r.business_id]) tMap[r.business_id] = new Set();
      tMap[r.business_id].add(r.theme_id);
    });
    setThemesByBusiness(tMap);
    const grouped: Record<string, YouTubeVideo[]> = {};
    (videosAll || []).forEach((v: any) => {
      if (!grouped[v.business_id]) grouped[v.business_id] = [];
      grouped[v.business_id].push(v);
    });
    setVideosByBusiness(grouped);

    const c: Record<string, { poi: number; business: number; destination: number; tags: number }> = {};
    const bump = (id: string, key: "poi" | "business" | "destination" | "tags") => {
      if (!c[id]) c[id] = { poi: 0, business: 0, destination: 0, tags: 0 };
      c[id][key]++;
    };
    (poiAll || []).forEach((r: any) => bump(r.youtube_video_id, "poi"));
    (bizLinkAll || []).forEach((r: any) => bump(r.youtube_video_id, "business"));
    (destAll || []).forEach((r: any) => bump(r.youtube_video_id, "destination"));
    (badgeAll || []).forEach((r: any) => bump(r.youtube_video_id, "tags"));
    (subcatAll || []).forEach((r: any) => bump(r.youtube_video_id, "tags"));
    (cityAll || []).forEach((r: any) => bump(r.youtube_video_id, "tags"));
    setCounts(c);

    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /** Light refresh: only re-fetch the link tables to update CTA counts. */
  const reloadCounts = useCallback(async () => {
    const [poiAll, bizLinkAll, destAll, badgeAll, subcatAll, cityAll] = await Promise.all([
      fetchAllRows<any>("business_youtube_video_pois", "youtube_video_id", "youtube_video_id"),
      fetchAllRows<any>("business_youtube_video_businesses", "youtube_video_id", "youtube_video_id"),
      fetchAllRows<any>("business_youtube_video_destinations", "youtube_video_id", "youtube_video_id"),
      fetchAllRows<any>("business_youtube_video_badges", "youtube_video_id", "youtube_video_id"),
      fetchAllRows<any>("business_youtube_video_subcategories", "youtube_video_id", "youtube_video_id"),
      fetchAllRows<any>("business_youtube_video_cities", "youtube_video_id", "youtube_video_id"),
    ]);
    const c: Record<string, { poi: number; business: number; destination: number; tags: number }> = {};
    const bump = (id: string, key: "poi" | "business" | "destination" | "tags") => {
      if (!c[id]) c[id] = { poi: 0, business: 0, destination: 0, tags: 0 };
      c[id][key]++;
    };
    (poiAll || []).forEach((r: any) => bump(r.youtube_video_id, "poi"));
    (bizLinkAll || []).forEach((r: any) => bump(r.youtube_video_id, "business"));
    (destAll || []).forEach((r: any) => bump(r.youtube_video_id, "destination"));
    (badgeAll || []).forEach((r: any) => bump(r.youtube_video_id, "tags"));
    (subcatAll || []).forEach((r: any) => bump(r.youtube_video_id, "tags"));
    (cityAll || []).forEach((r: any) => bump(r.youtube_video_id, "tags"));
    setCounts(c);
  }, []);

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSync = async (business: Business, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!business.youtube_url) {
      toast.error("Aucune URL YouTube configurée");
      return;
    }
    setSyncingId(business.id);
    try {
      const { error } = await supabase.functions.invoke("fetch-youtube-channel", {
        body: { channelUrl: business.youtube_url, maxResults: 50, businessId: business.id, syncToDb: true },
      });
      if (error) throw error;
      toast.success(`Vidéos synchronisées : ${business.name}`);
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Erreur de synchronisation");
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    if (!confirm(`Lancer la synchronisation de ${filtered.length} établissement(s) ?`)) return;
    setSyncingAll(true);
    let ok = 0, ko = 0;
    for (const b of filtered) {
      if (!b.youtube_url) continue;
      try {
        await supabase.functions.invoke("fetch-youtube-channel", {
          body: { channelUrl: b.youtube_url, maxResults: 50, businessId: b.id, syncToDb: true },
        });
        ok++;
      } catch { ko++; }
    }
    setSyncingAll(false);
    await loadAll();
    toast.success(`Synchronisation terminée — ${ok} OK${ko ? `, ${ko} en erreur` : ""}`);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return businesses;
    const q = search.toLowerCase();
    return businesses.filter(b =>
      b.name.toLowerCase().includes(q) || (b.city || "").toLowerCase().includes(q)
    );
  }, [businesses, search]);

  /** Convert a YouTube DB row into the minimal shape the shared panels need. */
  const toAssignable = (v: YouTubeVideo): AssignableVideo => ({
    id: v.id,
    url: `https://www.youtube.com/watch?v=${v.video_id}`,
    name: v.title,
    thumbnail_url: v.custom_thumbnail_url || v.thumbnail,
    city: null,
  });

  const openPanel = (kind: PanelKind, v: YouTubeVideo) =>
    setActivePanel({ kind, video: toAssignable(v) });
  const closePanel = () => setActivePanel(null);

  const hasRightPanel = !!activePanel;

  return (
    <div className="flex h-full">
      <div className={cn("flex-1 space-y-4 pt-4 pr-4 overflow-y-auto", hasRightPanel && "w-1/2")}>
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <YoutubeIcon className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold">Vidéos YouTube</h2>
          </div>
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un établissement…"
              className="pl-9 h-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAll}
            disabled={syncingAll || loading || filtered.length === 0}
          >
            {syncingAll
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <RefreshCw className="h-4 w-4 mr-2" />}
            Tout synchroniser ({filtered.length})
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Aucun établissement avec une URL YouTube configurée.
          </p>
        ) : (
          <div className="border rounded-lg divide-y">
            {filtered.map((biz) => {
              const videos = videosByBusiness[biz.id] || [];
              const isOpen = openIds.has(biz.id);
              const isSyncing = syncingId === biz.id;
              return (
                <div key={biz.id}>
                  <div
                    className="flex items-center gap-3 p-3 hover:bg-muted/40 cursor-pointer"
                    onClick={() => toggleOpen(biz.id)}
                  >
                    {isOpen
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{biz.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {biz.city || "—"}
                        {biz.youtube_url && (
                          <>
                            {" · "}
                            <a
                              href={biz.youtube_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="underline hover:text-foreground"
                            >
                              chaîne YouTube
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {videos.length} vidéo{videos.length > 1 ? "s" : ""}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleSync(biz, e)}
                      disabled={isSyncing || syncingAll}
                    >
                      {isSyncing
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                      Synchroniser
                    </Button>
                  </div>

                  {/* Expanded videos list */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 bg-muted/20 space-y-2">
                      {videos.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3">
                          Aucune vidéo importée. Cliquez sur Synchroniser.
                        </p>
                      ) : (
                        videos.map((v) => (
                          <div
                            key={v.id}
                            className="flex items-start gap-3 p-2 bg-card border rounded-md"
                          >
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(`https://www.youtube.com/watch?v=${v.video_id}`)}
                              className="relative shrink-0 w-32 aspect-video bg-black rounded overflow-hidden group"
                              title="Lire la vidéo"
                            >
                              {(v.custom_thumbnail_url || v.thumbnail) ? (
                                <>
                                  <img src={v.custom_thumbnail_url || v.thumbnail!} alt={v.title} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
                                    <Play className="h-6 w-6 text-white" />
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Play className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              {v.is_short && (
                                <Badge className="absolute top-1 left-1 text-[9px] px-1 py-0">SHORT</Badge>
                              )}
                              {v.thumbnail_locked && (
                                <Badge className="absolute bottom-1 right-1 text-[9px] px-1 py-0 bg-amber-600">🔒</Badge>
                              )}
                            </button>

                            <div className="flex-1 min-w-0 space-y-1.5">
                              <p className="text-xs font-medium line-clamp-2">{v.title}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{v.video_id}</p>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {(() => {
                                  const c = counts[v.id] || { poi: 0, business: 0, destination: 0, tags: 0 };
                                  const CountBadge = ({ n }: { n: number }) =>
                                    n > 0 ? (
                                      <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded bg-primary text-primary-foreground text-[10px] font-semibold">
                                        {n}
                                      </span>
                                    ) : null;
                                  return (
                                    <>
                                      <Button size="sm" variant="outline" className="h-7 text-xs"
                                        onClick={() => openPanel("poi", v)}>
                                        <MapPin className="h-3 w-3 mr-1" />POI<CountBadge n={c.poi} />
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-7 text-xs"
                                        onClick={() => openPanel("business", v)}>
                                        <Building2 className="h-3 w-3 mr-1" />Établissements<CountBadge n={c.business} />
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-7 text-xs"
                                        onClick={() => openPanel("destination", v)}>
                                        <Globe className="h-3 w-3 mr-1" />Destinations<CountBadge n={c.destination} />
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-7 text-xs"
                                        onClick={() => openPanel("tags", v)}>
                                        <Tag className="h-3 w-3 mr-1" />Tags<CountBadge n={c.tags} />
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-7 text-xs"
                                        onClick={() => openPanel("thumbnail", v)}>
                                        <ImageIcon className="h-3 w-3 mr-1" />Vignette
                                      </Button>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right assignment panel */}
      {activePanel && (
        <div className="w-1/2 sticky top-0 h-screen overflow-hidden border-l bg-card">
          {activePanel.kind === "poi" && (
            <InlinePoiAssignment
              source="youtube"
              video={activePanel.video}
              onClose={closePanel}
              onSaved={reloadCounts}
            />
          )}
          {activePanel.kind === "business" && (
            <InlineBusinessAssignment
              source="youtube"
              video={activePanel.video}
              onClose={closePanel}
              onSaved={reloadCounts}
            />
          )}
          {activePanel.kind === "destination" && (
            <InlineDestinationCityAssignment
              source="youtube"
              video={activePanel.video}
              onClose={closePanel}
              onSaved={reloadCounts}
            />
          )}
          {activePanel.kind === "tags" && (
            <InlineBadgeSubcatCityAssignment
              source="youtube"
              video={activePanel.video}
              onClose={closePanel}
              onSaved={reloadCounts}
            />
          )}
          {activePanel.kind === "thumbnail" && (
            <InlineThumbnailAssignment
              source="business_youtube_videos"
              videoId={activePanel.video.id}
              videoUrl={activePanel.video.url}
              videoName={activePanel.video.name}
              onClose={closePanel}
              onSaved={loadAll}
            />
          )}
        </div>
      )}

      {lightboxUrl && (
        <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
};

export default YouTubeBackofficePanel;
