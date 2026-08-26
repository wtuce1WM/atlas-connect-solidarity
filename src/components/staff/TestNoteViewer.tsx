import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import VideoLightbox from "./VideoLightbox";
import { isInternalVideoUrl } from "@/lib/videoSourceFilter";

const NOTE_ID = "919622ac-3bfe-4e3e-ab64-0dfeb3bd1696";

/**
 * Récupère toutes les lignes d'une requête paginée (PostgREST plafonne à 1000 lignes),
 * en lançant plusieurs pages en parallèle pour éviter les longues chaînes séquentielles.
 */
const fetchAllPaged = async (
  build: (from: number, to: number) => any,
  page = 1000,
  parallel = 5,
): Promise<any[]> => {
  const out: any[] = [];
  let offset = 0;
  for (;;) {
    const results = await Promise.all(
      Array.from({ length: parallel }, (_, i) =>
        build(offset + i * page, offset + (i + 1) * page - 1),
      ),
    );
    let done = false;
    for (const r of results) {
      if (r.error) throw r.error;
      const rows = (r.data || []) as any[];
      out.push(...rows);
      if (rows.length < page) done = true;
    }
    if (done) break;
    offset += parallel * page;
  }
  return out;
};

interface VideoDoc {
  id: string;
  url: string;
  name: string | null;
  thumbnail_url: string | null;
  city: string | null;
  cities: string[];
  neighborhood: string | null;
  business_id: string | null;
  business_name: string;
  badge_ids: string[];
  subcategory_name: string | null;
  service_name: string | null;
  source: "business" | "generic";
  file_size?: number;
}

/**
 * Un même fichier vidéo peut être rattaché à plusieurs fiches (donc plusieurs
 * video_id distincts en base). On regroupe par URL de fichier : une carte =
 * un fichier, et un badge s'applique à TOUS les video_id du groupe.
 */
interface VideoGroup {
  key: string;
  primary: VideoDoc;
  members: VideoDoc[];
  badge_ids: string[];
  file_size?: number;
}

const parseStoragePath = (url: string): string | null => {
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  return match ? match[2] : null;
};

const groupByUrl = (list: VideoDoc[]): VideoGroup[] => {
  const map = new Map<string, VideoDoc[]>();
  for (const v of list) {
    const arr = map.get(v.url) || [];
    arr.push(v);
    map.set(v.url, arr);
  }
  return [...map.entries()].map(([key, members]) => ({
    key,
    primary: members[0],
    members,
    badge_ids: Array.from(new Set(members.flatMap(m => m.badge_ids))),
    file_size: members[0].file_size,
  }));
};

const TestNoteViewer = () => {
  const [activeTab, setActiveTab] = useState<string>("note");
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [noteLoading, setNoteLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosLoaded, setVideosLoaded] = useState(false);
  const [city, setCity] = useState<string>("none");
  const [badge, setBadge] = useState<string>("none");
  const [badges, setBadges] = useState<{ id: string; name_fr: string }[]>([]);
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [toBadgeCity, setToBadgeCity] = useState<string>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [draftBadgeIds, setDraftBadgeIds] = useState<string[]>([]);

  // Sync draft when selecting a video group (union des badges de tous les IDs)
  useEffect(() => {
    if (!selectedKey) { setDraftBadgeIds([]); return; }
    const members = videos.filter(v => v.url === selectedKey);
    setDraftBadgeIds(Array.from(new Set(members.flatMap(m => m.badge_ids))));
  }, [selectedKey, videos]);


  const saveBadges = async (video: VideoDoc, draft: Set<string>, original: Set<string>) => {
    const toAdd = [...draft].filter(id => !original.has(id));
    const toRemove = [...original].filter(id => !draft.has(id));
    const isGeneric = video.source === "generic";
    const table = isGeneric ? "generic_video_badges" : "business_document_badges";
    const fkCol = isGeneric ? "generic_video_id" : "document_id";
    let err: any = null;
    if (toRemove.length > 0) {
      const r = await supabase.from(table as any).delete().eq(fkCol, video.id).in("badge_id", toRemove);
      if (r.error) err = r.error;
    }
    if (!err && toAdd.length > 0) {
      const unique = Array.from(new Set(toAdd));
      const r = await supabase
        .from(table as any)
        .upsert(unique.map(badge_id => ({ [fkCol]: video.id, badge_id })) as any, {
          onConflict: `${fkCol},badge_id`,
          ignoreDuplicates: true,
        });
      if (r.error) err = r.error;
    }
    return err;
  };

  /** Applique le même jeu de badges à tous les video_id d'un même fichier. */
  const saveBadgesGroup = async (members: VideoDoc[], draft: Set<string>) => {
    for (const m of members) {
      const err = await saveBadges(m, draft, new Set(m.badge_ids));
      if (err) return err;
    }
    return null;
  };

  const GroupCard = ({ g }: { g: VideoGroup }) => {
    const v = g.primary;
    const selected = selectedKey === g.key;
    const names = Array.from(new Set(g.members.map(m => m.business_name)));
    const allCities = Array.from(new Set(g.members.flatMap(m => m.cities)));
    return (
      <div
        onClick={() => setSelectedKey(g.key)}
        className={`flex flex-col rounded-lg border bg-background p-1.5 cursor-pointer transition-colors ${selected ? "border-primary ring-2 ring-primary" : "hover:border-muted-foreground/30"}`}
      >
        <button
          className="relative bg-black rounded overflow-hidden group flex-shrink-0 w-full"
          style={{ height: 110 }}
          onClick={(e) => { e.stopPropagation(); setLightboxUrl(v.url); }}
        >
          {v.thumbnail_url ? (
            <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : v.url.includes("supabase.co/storage") ? (
            <video src={v.url} className="w-full h-full object-cover" muted preload="metadata" />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
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
          {(v.subcategory_name || v.service_name) && (
            <p className="text-base font-semibold text-foreground leading-tight mt-0.5">
              {[v.subcategory_name, v.service_name].filter(Boolean).join(" · ")}
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
        </div>
      </div>
    );
  };

  const BadgePanel = ({ members, deselectAfterSave }: { members: VideoDoc[]; deselectAfterSave?: boolean }) => {
    const original = new Set(members.flatMap(m => m.badge_ids));
    const draft = new Set(draftBadgeIds);
    const dirty = original.size !== draft.size || [...draft].some(id => !original.has(id));

    const handleSave = async () => {
      setAssigning(true);
      const err = await saveBadgesGroup(members, draft);
      setAssigning(false);
      if (err) { toast.error("Erreur : " + err.message); return; }
      const ids = new Set(members.map(m => m.id));
      setVideos(prev => prev.map(v => ids.has(v.id) ? { ...v, badge_ids: [...draft] } : v));
      if (deselectAfterSave) setSelectedKey(null);
      toast.success(members.length > 1 ? `Badges enregistrés sur ${members.length} IDs` : "Badges enregistrés");
    };

    const SaveButton = ({ className = "" }: { className?: string }) => (
      <button
        disabled={!dirty || assigning || members.length === 0}
        onClick={handleSave}
        className={`text-xs px-3 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 ${className}`}
      >
        {assigning ? "..." : "Enregistrer"}
      </button>
    );

    return (
      <div className="flex flex-col h-full -m-3 p-3">
        <div className="shrink-0 flex items-center justify-between pb-2 gap-2 sticky top-0 z-10 bg-muted/20">
          <p className="text-xs font-medium text-foreground">
            Badges {members.length > 1 && <span className="text-primary">({members.length} IDs)</span>}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedKey(null)}
              className="text-xs px-2 py-1 rounded hover:bg-accent text-muted-foreground"
            >
              Fermer
            </button>
            <SaveButton />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 py-2">
          <div className="flex flex-wrap gap-1">
            {badges.map(b => {
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

        <div className="shrink-0 flex items-center justify-between gap-2 sticky bottom-0 z-10 bg-muted/20 pt-2">
          <button
            type="button"
            disabled={draft.size === 0}
            onClick={() => setDraftBadgeIds([])}
            className="text-xs px-3 py-1 rounded border border-border bg-background hover:border-primary/50 disabled:opacity-40 text-muted-foreground"
          >
            Tout désélectionner
          </button>
          <SaveButton />
        </div>
      </div>
    );
  };



  // Light fetch: only the note (cheap) on mount
  useEffect(() => {
    (async () => {
      const noteRes = await supabase.from("knowledge_entries").select("title, content").eq("id", NOTE_ID).maybeSingle();
      if (noteRes.data) {
        setTitle(noteRes.data.title);
        setContent(noteRes.data.content);
      }
      setNoteLoading(false);
    })();
  }, []);

  // Refresh badge links when switching to a video sub-tab
  useEffect(() => {
    if (!videosLoaded) return;
    if (activeTab !== "badgees" && activeTab !== "tobadge") return;
    (async () => {
      try {
        const [bizLinks, genLinks] = await Promise.all([
          fetchAllPaged((f, t) =>
            supabase.from("business_document_badges").select("document_id, badge_id").order("document_id").range(f, t)),
          fetchAllPaged((f, t) =>
            (supabase.from("generic_video_badges" as any) as any).select("generic_video_id, badge_id").order("generic_video_id").range(f, t)),
        ]);
        const badgeMap = new Map<string, string[]>();
        bizLinks.forEach((l: any) => {
          const arr = badgeMap.get(l.document_id) || [];
          arr.push(l.badge_id);
          badgeMap.set(l.document_id, arr);
        });
        genLinks.forEach((l: any) => {
          const arr = badgeMap.get(l.generic_video_id) || [];
          arr.push(l.badge_id);
          badgeMap.set(l.generic_video_id, arr);
        });
        setVideos(prev => prev.map(v => ({ ...v, badge_ids: badgeMap.get(v.id) || [] })));
      } catch (e: any) {
        toast.error("Erreur de rafraîchissement des badges : " + (e?.message || e));
      }
    })();
  }, [activeTab, videosLoaded]);

  // Heavy fetch: only when entering a sub-tab that needs videos
  useEffect(() => {
    if (videosLoaded || videosLoading) return;
    if (activeTab === "badgees" && city === "none") return;
    if (activeTab !== "badgees" && activeTab !== "tobadge") return;

    (async () => {
      setVideosLoading(true);
      try {
        const [
          rawDocs,
          genericRows,
          badgesRes,
          subsRes,
          servicesRes,
          citiesRes,
          docCityRows,
          genCityRows,
          bizLinkRows,
          genLinkRows,
          businessRows,
        ] = await Promise.all([
          fetchAllPaged((f, t) =>
            supabase
              .from("business_documents")
              .select("id, url, name, thumbnail_url, city, neighborhood, business_id, subcategory_id, service_id")
              .eq("type", "video")
              .order("id")
              .range(f, t)),
          fetchAllPaged((f, t) =>
            (supabase.from("generic_videos" as any) as any)
              .select("id, url, name, thumbnail_url, city, neighborhood, instagram_account, tiktok_account, youtube_account")
              .order("id")
              .range(f, t)),
          supabase.from("badges").select("id, name_fr"),
          supabase.from("subcategories").select("id, name_fr"),
          supabase.from("services").select("id, name_fr"),
          supabase.from("cities").select("id, name_fr"),
          fetchAllPaged((f, t) =>
            supabase.from("business_document_cities").select("document_id, city_id").order("document_id").range(f, t)),
          fetchAllPaged((f, t) =>
            (supabase.from("generic_video_cities" as any) as any).select("generic_video_id, city_id").order("generic_video_id").range(f, t)),
          fetchAllPaged((f, t) =>
            supabase.from("business_document_badges").select("document_id, badge_id").order("document_id").range(f, t)),
          fetchAllPaged((f, t) =>
            (supabase.from("generic_video_badges" as any) as any).select("generic_video_id, badge_id").order("generic_video_id").range(f, t)),
          fetchAllPaged((f, t) => supabase.from("businesses").select("id, name").order("id").range(f, t)),
        ]);

        const allDocs = rawDocs.filter((d: any) => isInternalVideoUrl(d.url));
        const genericDocs = genericRows.filter((g: any) => isInternalVideoUrl(g.url));

        const cityNameMap = new Map<string, string>(((citiesRes.data as any[]) || []).map(c => [c.id, c.name_fr]));

        const docCityMap = new Map<string, string[]>();
        docCityRows.forEach((row: any) => {
          const name = cityNameMap.get(row.city_id);
          if (!name) return;
          const arr = docCityMap.get(row.document_id) || [];
          if (!arr.includes(name)) arr.push(name);
          docCityMap.set(row.document_id, arr);
        });

        const genericCityMap = new Map<string, string[]>();
        genCityRows.forEach((row: any) => {
          const name = cityNameMap.get(row.city_id);
          if (!name) return;
          const arr = genericCityMap.get(row.generic_video_id) || [];
          if (!arr.includes(name)) arr.push(name);
          genericCityMap.set(row.generic_video_id, arr);
        });

        if (badgesRes.data) {
          setBadges([...badgesRes.data].sort((a, b) => a.name_fr.localeCompare(b.name_fr, "fr")));
        }

        const subMap = new Map<string, string>((subsRes.data || []).map((s: any) => [s.id, s.name_fr]));
        const svcMap = new Map<string, string>((servicesRes.data || []).map((s: any) => [s.id, s.name_fr]));
        const bizMap = new Map<string, string>(businessRows.map((b: any) => [b.id, b.name]));

        const badgeMap = new Map<string, string[]>();
        bizLinkRows.forEach((l: any) => {
          const arr = badgeMap.get(l.document_id) || [];
          arr.push(l.badge_id);
          badgeMap.set(l.document_id, arr);
        });
        genLinkRows.forEach((l: any) => {
          const arr = badgeMap.get(l.generic_video_id) || [];
          arr.push(l.badge_id);
          badgeMap.set(l.generic_video_id, arr);
        });

        const businessVideos: VideoDoc[] = allDocs.map((d: any) => {
          const multi = docCityMap.get(d.id) || [];
          const cities = multi.length > 0 ? multi : (d.city ? [d.city] : []);
          return {
            id: d.id,
            url: d.url,
            name: d.name,
            thumbnail_url: d.thumbnail_url,
            city: d.city,
            cities,
            neighborhood: d.neighborhood,
            business_id: d.business_id,
            business_name: bizMap.get(d.business_id) || "—",
            badge_ids: badgeMap.get(d.id) || [],
            subcategory_name: d.subcategory_id ? subMap.get(d.subcategory_id) || null : null,
            service_name: d.service_id ? svcMap.get(d.service_id) || null : null,
            source: "business",
          };
        });

        const genericVideos: VideoDoc[] = genericDocs.map((g: any) => {
          const multi = genericCityMap.get(g.id) || [];
          const cities = multi.length > 0 ? multi : (g.city ? [g.city] : []);
          return {
            id: g.id,
            url: g.url,
            name: g.name,
            thumbnail_url: g.thumbnail_url,
            city: g.city,
            cities,
            neighborhood: g.neighborhood,
            business_id: null,
            business_name: g.instagram_account || g.tiktok_account || g.youtube_account || "— Générique —",
            badge_ids: badgeMap.get(g.id) || [],
            subcategory_name: null,
            service_name: null,
            source: "generic",
          };
        });

        setVideos([...businessVideos, ...genericVideos]);
        setVideosLoaded(true);

        // Récupération asynchrone des tailles de fichiers pour tri par poids
        (async () => {
          try {
            const { data: sizes, error: sizesErr } = await (supabase.rpc as any)("get_all_storage_sizes", {
              bucket_name: "business-videos",
            });
            if (sizesErr) {
              console.warn("Impossible de charger les tailles de fichiers :", sizesErr);
              return;
            }
            const sizeMap = new Map<string, number>();
            ((sizes as any[]) || []).forEach((row: any) => {
              if (row.path && row.size_bytes != null) {
                sizeMap.set(row.path, Number(row.size_bytes));
              }
            });
            setVideos(prev => prev.map(v => {
              const path = parseStoragePath(v.url);
              return path && sizeMap.has(path) ? { ...v, file_size: sizeMap.get(path) } : v;
            }));
          } catch (e) {
            console.warn("Erreur récupération tailles :", e);
          }
        })();
      } catch (e: any) {
        toast.error("Erreur de chargement des vidéos : " + (e?.message || e));
      } finally {
        setVideosLoading(false);
      }
    })();
  }, [activeTab, city, videosLoaded, videosLoading]);

  const matchesCity = (v: VideoDoc) =>
    city === "none" ? false :
    city === "__none__" ? v.cities.length === 0 :
    v.cities.some(c => c.toLowerCase() === city.toLowerCase());

  const availableBadges = useMemo(() => {
    if (city === "none") return badges;
    const cityVideos = videos.filter(matchesCity);
    const badgeIdsWithVideos = new Set<string>();
    cityVideos.forEach(v => v.badge_ids.forEach(id => badgeIdsWithVideos.add(id)));
    return badges.filter(b => badgeIdsWithVideos.has(b.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badges, videos, city]);

  const badgeCounts = useMemo(() => {
    if (city === "none") return new Map<string, number>();
    const counts = new Map<string, number>();
    videos.filter(matchesCity).forEach(v => {
      v.badge_ids.forEach(id => {
        counts.set(id, (counts.get(id) || 0) + 1);
      });
    });
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, city]);

  useEffect(() => {
    if (badge !== "none" && !availableBadges.some(b => b.id === badge)) {
      setBadge("none");
    }
  }, [availableBadges, badge]);

  const filteredGroups = useMemo(() => {
    if (city === "none" || badge === "none") return [];
    return groupByUrl(videos.filter(v => matchesCity(v) && v.badge_ids.includes(badge)))
      .sort((a, b) => (a.file_size ?? Infinity) - (b.file_size ?? Infinity));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, city, badge]);


  if (noteLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="note">Note</TabsTrigger>
          <TabsTrigger value="badgees">Badgées</TabsTrigger>
          <TabsTrigger value="tobadge">À badger</TabsTrigger>
        </TabsList>

        <TabsContent value="note" className="mt-4">
          {!content ? (
            <div className="text-muted-foreground">Note introuvable.</div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-li:text-foreground">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="badgees" className="mt-4 space-y-4">
          {videosLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement des vidéos…
            </div>
          )}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Ville :</span>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  <SelectItem value="marrakech">Marrakech</SelectItem>
                  <SelectItem value="essaouira">Essaouira</SelectItem>
                  <SelectItem value="__none__">Sans ville</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Badge :</span>
              <Select value={badge} onValueChange={setBadge} disabled={city === "none"}>
                <SelectTrigger className="w-[260px]"><SelectValue placeholder={city === "none" ? "Choisir une ville" : "Aucun"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {availableBadges.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name_fr} ({badgeCounts.get(b.id) || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {city !== "none" && badge !== "none" && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {filteredGroups.length} vidéo{filteredGroups.length !== 1 ? "s" : ""} (fichiers distincts)
                {" · "}
                {filteredGroups.reduce((n, g) => n + g.members.length, 0)} ID{filteredGroups.reduce((n, g) => n + g.members.length, 0) !== 1 ? "s" : ""}
              </p>
              {filteredGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Aucune vidéo pour cette sélection.</p>
              ) : (
                <div
                  className="grid w-full gap-3 items-start"
                  style={{ gridTemplateColumns: "minmax(0, 60%) minmax(0, 40%)" }}
                >
                  <div className="grid min-w-0 grid-cols-4 gap-2">
                    {filteredGroups.map(g => <GroupCard key={g.key} g={g} />)}
                  </div>
                  <aside className="min-w-0 rounded-lg border bg-muted/20 p-3 h-[calc(100vh-7rem)] overflow-hidden sticky top-24">
                    {!selectedKey ? (
                      <p className="text-xs text-muted-foreground">Sélectionnez une vidéo pour modifier ses badges.</p>
                    ) : (
                      <BadgePanel members={videos.filter(v => v.url === selectedKey)} />
                    )}
                  </aside>
                </div>
              )}
            </div>

          )}
        </TabsContent>

        <TabsContent value="tobadge" className="mt-4 space-y-3">
          {videosLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement des vidéos…
            </div>
          )}
          {(() => {
            const base = videos.filter(v => v.badge_ids.length === 0);
            const cityOptions = Array.from(new Set(base.flatMap(v => v.cities))).sort((a, b) => a.localeCompare(b, "fr"));
            const hasNoCity = base.some(v => v.cities.length === 0);
            const toBadge = base.filter(v =>
              toBadgeCity === "all" ? true :
              toBadgeCity === "__none__" ? v.cities.length === 0 :
              v.cities.some(c => c.toLowerCase() === toBadgeCity.toLowerCase())
            );
            return (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Ville :</span>
                  <Select value={toBadgeCity} onValueChange={setToBadgeCity}>
                    <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes ({base.length})</SelectItem>
                      {cityOptions.map(c => (
                        <SelectItem key={c} value={c}>{c} ({base.filter(v => v.cities.some(x => x.toLowerCase() === c.toLowerCase())).length})</SelectItem>
                      ))}
                      {hasNoCity && (
                        <SelectItem value="__none__">Sans ville ({base.filter(v => v.cities.length === 0).length})</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {toBadge.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Aucune vidéo à badger.</p>
                ) : (
                  <>
                    {(() => {
                      const toBadgeGroups = groupByUrl(toBadge);
                      return (
                        <>
                          <p className="text-sm text-muted-foreground">
                            {toBadgeGroups.length} vidéo{toBadgeGroups.length !== 1 ? "s" : ""} à badger (fichiers distincts) · {toBadge.length} ID{toBadge.length !== 1 ? "s" : ""}
                          </p>
                          <div
                            className="grid w-full gap-3 items-start"
                            style={{ gridTemplateColumns: "minmax(0, 60%) minmax(0, 40%)" }}
                          >
                            <div className="grid min-w-0 grid-cols-4 gap-2">
                              {toBadgeGroups.map(g => <GroupCard key={g.key} g={g} />)}
                            </div>
                            <aside className="min-w-0 rounded-lg border bg-muted/20 p-3 h-[calc(100vh-7rem)] overflow-hidden sticky top-24">
                              {!selectedKey ? (
                                <p className="text-xs text-muted-foreground">Sélectionnez une vidéo pour lui affecter des badges.</p>
                              ) : (
                                <BadgePanel members={videos.filter(v => v.url === selectedKey)} deselectAfterSave />
                              )}
                            </aside>
                          </div>
                        </>
                      );
                    })()}

                  </>
                )}
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

      {lightboxUrl && <VideoLightbox url={lightboxUrl} restoreScrollY={lightboxUrl ? window.scrollY : undefined} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
};

export default TestNoteViewer;
