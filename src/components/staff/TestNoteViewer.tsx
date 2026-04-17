import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import VideoLightbox from "./VideoLightbox";

const NOTE_ID = "919622ac-3bfe-4e3e-ab64-0dfeb3bd1696";

interface VideoDoc {
  id: string;
  url: string;
  name: string | null;
  thumbnail_url: string | null;
  city: string | null;
  neighborhood: string | null;
  business_id: string;
  business_name: string;
  badge_ids: string[];
  subcategory_name: string | null;
  service_name: string | null;
}

const TestNoteViewer = () => {
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState<string>("none");
  const [badge, setBadge] = useState<string>("none");
  const [badges, setBadges] = useState<{ id: string; name_fr: string }[]>([]);
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [toBadgeCity, setToBadgeCity] = useState<string>("all");
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const allDocs: any[] = [];
      let offset = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase
          .from("business_documents")
          .select("id, url, name, thumbnail_url, city, neighborhood, business_id, subcategory_id, service_id")
          .eq("type", "video")
          .range(offset, offset + PAGE - 1);
        if (!data || data.length === 0) break;
        allDocs.push(...data);
        if (data.length < PAGE) break;
        offset += PAGE;
      }

      const [noteRes, badgesRes, linksRes, subsRes, servicesRes] = await Promise.all([
        supabase.from("knowledge_entries").select("title, content").eq("id", NOTE_ID).maybeSingle(),
        supabase.from("badges").select("id, name_fr"),
        supabase.from("business_document_badges").select("document_id, badge_id"),
        supabase.from("subcategories").select("id, name_fr"),
        supabase.from("services").select("id, name_fr"),
      ]);

      if (noteRes.data) {
        setTitle(noteRes.data.title);
        setContent(noteRes.data.content);
      }
      if (badgesRes.data) {
        setBadges([...badgesRes.data].sort((a, b) => a.name_fr.localeCompare(b.name_fr, "fr")));
      }

      const subMap = new Map<string, string>((subsRes.data || []).map((s: any) => [s.id, s.name_fr]));
      const svcMap = new Map<string, string>((servicesRes.data || []).map((s: any) => [s.id, s.name_fr]));

      const bizIds = [...new Set(allDocs.map(d => d.business_id))];
      const bizMap = new Map<string, string>();
      for (let i = 0; i < bizIds.length; i += 200) {
        const { data } = await supabase.from("businesses").select("id, name").in("id", bizIds.slice(i, i + 200));
        if (data) data.forEach(b => bizMap.set(b.id, b.name));
      }

      const badgeMap = new Map<string, string[]>();
      (linksRes.data || []).forEach((l: any) => {
        const arr = badgeMap.get(l.document_id) || [];
        arr.push(l.badge_id);
        badgeMap.set(l.document_id, arr);
      });

      setVideos(allDocs.map(d => ({
        id: d.id,
        url: d.url,
        name: d.name,
        thumbnail_url: d.thumbnail_url,
        city: d.city,
        neighborhood: d.neighborhood,
        business_id: d.business_id,
        business_name: bizMap.get(d.business_id) || "—",
        badge_ids: badgeMap.get(d.id) || [],
        subcategory_name: d.subcategory_id ? subMap.get(d.subcategory_id) || null : null,
        service_name: d.service_id ? svcMap.get(d.service_id) || null : null,
      })));
      setLoading(false);
    })();
  }, []);

  const matchesCity = (v: VideoDoc) =>
    city === "none" ? false :
    city === "__none__" ? !v.city :
    v.city?.toLowerCase() === city.toLowerCase();

  const availableBadges = useMemo(() => {
    if (city === "none") return badges;
    const cityVideos = videos.filter(matchesCity);
    const badgeIdsWithVideos = new Set<string>();
    cityVideos.forEach(v => v.badge_ids.forEach(id => badgeIdsWithVideos.add(id)));
    return badges.filter(b => badgeIdsWithVideos.has(b.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badges, videos, city]);

  useEffect(() => {
    if (badge !== "none" && !availableBadges.some(b => b.id === badge)) {
      setBadge("none");
    }
  }, [availableBadges, badge]);

  const filteredVideos = useMemo(() => {
    if (city === "none" || badge === "none") return [];
    return videos.filter(v => matchesCity(v) && v.badge_ids.includes(badge));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, city, badge]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      <Tabs defaultValue="note" className="w-full">
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
                    <SelectItem key={b.id} value={b.id}>{b.name_fr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {city !== "none" && badge !== "none" && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">{filteredVideos.length} vidéo{filteredVideos.length !== 1 ? "s" : ""}</p>
              {filteredVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Aucune vidéo pour cette sélection.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredVideos.map(v => (
                    <div key={v.id} style={{ width: 220 }} className="flex flex-col rounded-lg border bg-background p-1.5">
                      <button
                        className="relative bg-black rounded overflow-hidden group flex-shrink-0 w-full"
                        style={{ height: 110 }}
                        onClick={() => setLightboxUrl(v.url)}
                      >
                        {v.thumbnail_url ? (
                          <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : v.url.includes("supabase.co/storage") ? (
                          <video src={v.url} className="w-full h-full object-cover" muted preload="metadata" />
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
                        <p className="text-sm font-medium leading-tight">{v.business_name}</p>
                        {(v.subcategory_name || v.service_name) && (
                          <p className="text-base font-semibold text-foreground leading-tight mt-0.5">
                            {[v.subcategory_name, v.service_name].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {(v.city || v.neighborhood) && (
                          <p className="text-[11px] text-muted-foreground/70 truncate">
                            {[v.city, v.neighborhood].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {v.name && <p className="text-[11px] text-muted-foreground/70 truncate">{v.name}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tobadge" className="mt-4 space-y-3">
          {(() => {
            const base = videos.filter(v => v.subcategory_name && (v.badge_ids.length === 0 || v.id === selectedVideoId));
            const cityOptions = Array.from(new Set(base.map(v => v.city).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "fr"));
            const hasNoCity = base.some(v => !v.city);
            const toBadge = base.filter(v =>
              toBadgeCity === "all" ? true :
              toBadgeCity === "__none__" ? !v.city :
              v.city?.toLowerCase() === toBadgeCity.toLowerCase()
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
                        <SelectItem key={c} value={c}>{c} ({base.filter(v => v.city?.toLowerCase() === c.toLowerCase()).length})</SelectItem>
                      ))}
                      {hasNoCity && (
                        <SelectItem value="__none__">Sans ville ({base.filter(v => !v.city).length})</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {toBadge.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Aucune vidéo à badger.</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">{toBadge.length} vidéo{toBadge.length !== 1 ? "s" : ""} à badger</p>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-3 grid grid-cols-4 gap-2">
                        {toBadge.map(v => {
                          const selected = selectedVideoId === v.id;
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
                                ) : v.url.includes("supabase.co/storage") ? (
                                  <video src={v.url} className="w-full h-full object-cover" muted preload="metadata" />
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
                                <p className="text-sm font-medium leading-tight">{v.business_name}</p>
                                {(v.subcategory_name || v.service_name) && (
                                  <p className="text-base font-semibold text-foreground leading-tight mt-0.5">
                                    {[v.subcategory_name, v.service_name].filter(Boolean).join(" · ")}
                                  </p>
                                )}
                                {(v.city || v.neighborhood) && (
                                  <p className="text-[11px] text-muted-foreground/70 truncate">
                                    {[v.city, v.neighborhood].filter(Boolean).join(" · ")}
                                  </p>
                                )}
                                {v.name && <p className="text-[11px] text-muted-foreground/70 truncate">{v.name}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <aside className="col-span-1 rounded-lg border bg-muted/20 p-3 max-h-[70vh] overflow-y-auto sticky top-2 self-start">
                        {!selectedVideoId ? (
                          <p className="text-xs text-muted-foreground">Sélectionnez une vidéo pour lui affecter un badge.</p>
                        ) : (() => {
                          const selectedVideo = videos.find(v => v.id === selectedVideoId);
                          const assignedIds = new Set(selectedVideo?.badge_ids || []);
                          const available = badges.filter(b => !assignedIds.has(b.id));
                          const assigned = badges.filter(b => assignedIds.has(b.id));
                          return (
                            <>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-muted-foreground">Affecter des badges :</p>
                                <button
                                  onClick={() => setSelectedVideoId(null)}
                                  className="text-xs text-primary hover:underline"
                                >
                                  Terminer
                                </button>
                              </div>
                              {assigned.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Affectés</p>
                                  <div className="flex flex-wrap gap-1">
                                    {assigned.map(b => (
                                      <button
                                        key={b.id}
                                        disabled={assigning}
                                        onClick={async () => {
                                          if (!selectedVideoId) return;
                                          setAssigning(true);
                                          const { error } = await supabase
                                            .from("business_document_badges")
                                            .delete()
                                            .eq("document_id", selectedVideoId)
                                            .eq("badge_id", b.id);
                                          setAssigning(false);
                                          if (error) { toast.error("Erreur : " + error.message); return; }
                                          setVideos(prev => prev.map(v => v.id === selectedVideoId ? { ...v, badge_ids: v.badge_ids.filter(id => id !== b.id) } : v));
                                          toast.success(`Badge « ${b.name_fr} » retiré`);
                                        }}
                                        className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-80 disabled:opacity-50"
                                        title="Cliquer pour retirer"
                                      >
                                        {b.name_fr} ×
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="flex flex-col gap-1">
                                {available.map(b => (
                                  <button
                                    key={b.id}
                                    disabled={assigning}
                                    onClick={async () => {
                                      if (!selectedVideoId) return;
                                      setAssigning(true);
                                      const { error } = await supabase
                                        .from("business_document_badges")
                                        .insert({ document_id: selectedVideoId, badge_id: b.id });
                                      setAssigning(false);
                                      if (error) { toast.error("Erreur : " + error.message); return; }
                                      setVideos(prev => prev.map(v => v.id === selectedVideoId ? { ...v, badge_ids: [...v.badge_ids, b.id] } : v));
                                      toast.success(`Badge « ${b.name_fr} » affecté`);
                                    }}
                                    className="text-left text-sm px-2 py-1.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                                  >
                                    {b.name_fr}
                                  </button>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </aside>
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

      {lightboxUrl && <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
};

export default TestNoteViewer;
