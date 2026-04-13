import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, Play, MapPin, Upload, Video, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import VideoLightbox from "./VideoLightbox";
import VideoUploader from "./VideoUploader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VideoDoc {
  id: string;
  url: string;
  name: string | null;
  thumbnail_url: string | null;
  business_id: string;
  business_name: string;
  city: string | null;
}

interface PoiBusiness {
  id: string;
  name: string;
  neighborhood: string | null;
}

const VideoPoiAssignmentPanel = () => {
  const [searchId, setSearchId] = useState("");
  const [video, setVideo] = useState<VideoDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [poiBusinesses, setPoiBusinesses] = useState<PoiBusiness[]>([]);
  const [selectedPoiIds, setSelectedPoiIds] = useState<string[]>([]);
  const [initialPoiIds, setInitialPoiIds] = useState<string[]>([]);
  const [defaultPoiId, setDefaultPoiId] = useState<string | null>(null);
  const [initialDefaultPoiId, setInitialDefaultPoiId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Multi-POI videos list
  interface MultiPoiVideo {
    id: string;
    url: string;
    name: string | null;
    thumbnail_url: string | null;
    business_name: string;
    city: string | null;
    poi_count: number;
    poi_names: string[];
  }
  const [multiPoiVideos, setMultiPoiVideos] = useState<MultiPoiVideo[]>([]);
  const [loadingMulti, setLoadingMulti] = useState(true);

  // Upload section state
  const [uploadBusinessQuery, setUploadBusinessQuery] = useState("");
  const [uploadBusinessResults, setUploadBusinessResults] = useState<{ id: string; name: string; city: string | null }[]>([]);
  const [selectedUploadBusiness, setSelectedUploadBusiness] = useState<{ id: string; name: string; city: string | null } | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState("");
  const [searchingBusiness, setSearchingBusiness] = useState(false);
  const [creatingDoc, setCreatingDoc] = useState(false);

  const searchBusinessForUpload = useCallback(async () => {
    const q = uploadBusinessQuery.trim();
    if (!q) return;
    setSearchingBusiness(true);
    const { data } = await supabase
      .from("businesses")
      .select("id, name, city")
      .ilike("name", `%${q}%`)
      .eq("is_active", true)
      .order("name")
      .limit(20);
    setUploadBusinessResults(data || []);
    setSearchingBusiness(false);
  }, [uploadBusinessQuery]);

  const handleCreateVideoDoc = useCallback(async () => {
    if (!selectedUploadBusiness || !uploadedVideoUrl) return;
    setCreatingDoc(true);
    try {
      const { data: newDoc, error: insertErr } = await supabase
        .from("business_documents")
        .insert({
          business_id: selectedUploadBusiness.id,
          url: uploadedVideoUrl,
          type: "video",
          city: selectedUploadBusiness.city,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      toast.success("Vidéo ajoutée ! Recherchez-la par son ID pour affecter des POIs.");
      // Auto-search the newly created doc
      if (newDoc) {
        setSearchId(newDoc.id);
        setUploadedVideoUrl("");
        setSelectedUploadBusiness(null);
        setUploadBusinessQuery("");
        setUploadBusinessResults([]);
        // Trigger search after state update
        setTimeout(() => {
          setSearchId(newDoc.id);
        }, 100);
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    } finally {
      setCreatingDoc(false);
    }
  }, [selectedUploadBusiness, uploadedVideoUrl]);

  // Auto-search when searchId is set programmatically
  useEffect(() => {
    if (searchId && searchId.length === 36 && !video) {
      searchVideo();
    }
  }, [searchId]);

  const searchVideo = useCallback(async () => {
    const id = searchId.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    setVideo(null);
    setPoiBusinesses([]);
    setSelectedPoiIds([]);
    setInitialPoiIds([]);

    // Fetch the video document
    const { data: doc, error: docErr } = await supabase
      .from("business_documents")
      .select("id, url, name, thumbnail_url, business_id, city, poi_id")
      .eq("id", id)
      .eq("type", "video")
      .maybeSingle();

    if (docErr || !doc) {
      setError("Aucune vidéo trouvée avec cet ID.");
      setLoading(false);
      return;
    }

    // Fetch business name
    const { data: biz } = await supabase
      .from("businesses")
      .select("name, city")
      .eq("id", doc.business_id)
      .maybeSingle();

    const city = doc.city || biz?.city || null;
    const videoDoc: VideoDoc = {
      ...doc,
      business_name: biz?.name || "Inconnu",
      city,
    };
    setVideo(videoDoc);

    // Fetch POI businesses in the same city
    if (city) {
      const { data: pois } = await supabase
        .from("businesses")
        .select("id, name, neighborhood")
        .eq("city", city)
        .eq("is_poi", true)
        .eq("is_active", true)
        .order("neighborhood")
        .order("name");
      setPoiBusinesses(pois || []);
    }

    // Fetch existing POI links for this video
    const { data: links } = await supabase
      .from("business_documents")
      .select("poi_id")
      .eq("id", id);
    
    // The poi_id is a single field on the document. But we need a different approach:
    // Actually business_documents has a single poi_id field. To assign multiple POIs,
    // we might need to check if there are multiple documents with same URL or use a different approach.
    // Looking at the schema, poi_id is a single UUID on business_documents.
    // So we need to look at business_points_of_interest table for multi-POI assignment.
    
    // Let me re-think: The user wants to assign multiple POIs to a video.
    // business_documents.poi_id is a single field.
    // We should use the business_points_of_interest table? No, that links businesses to POIs.
    // 
    // Actually, re-reading the request: "Pouvoir affecter plusieurs POI de la ville à la vidéo"
    // This means we should create document entries or use a junction approach.
    // But looking at the existing pattern in PoiVideosPanel, videos are linked via poi_id on business_documents.
    // 
    // The simplest approach: we update the single poi_id on the document.
    // But "plusieurs POI" means multiple. Let me check if there's a many-to-many table.
    // There isn't one for documents<->POIs.
    // 
    // Best approach: duplicate the document row for each POI, or just set the poi_id.
    // Actually the user likely wants checkboxes to assign POIs, updating the poi_id field.
    // Since it's a single field, let's handle it as a single assignment for now,
    // but the user said "plusieurs". We could duplicate rows.
    //
    // Let me just use the poi_id field and handle multi by creating copies of the document.
    // Actually - looking again, the user said "affecter plusieurs POI à la vidéo".
    // The cleanest approach: for each selected POI, if no document exists with that poi_id and same url, create one.
    // For deselected POIs, remove the poi_id (set to null) or delete the duplicate row.
    //
    // Simpler: find all business_documents with same url and business_id that have a poi_id set.
    
    const { data: allDocsForVideo } = await supabase
      .from("business_documents")
      .select("id, poi_id")
      .eq("business_id", doc.business_id)
      .eq("url", doc.url)
      .eq("type", "video")
      .not("poi_id", "is", null);

    const existingPoiIds = (allDocsForVideo || []).map(d => d.poi_id!).filter(Boolean);
    // Also include the current doc's poi_id if set
    if (doc.poi_id && !existingPoiIds.includes(doc.poi_id)) {
      existingPoiIds.push(doc.poi_id);
    }
    setSelectedPoiIds(existingPoiIds);
    setInitialPoiIds(existingPoiIds);
    // The main doc's poi_id is the default
    setDefaultPoiId(doc.poi_id || (existingPoiIds.length > 0 ? existingPoiIds[0] : null));
    setInitialDefaultPoiId(doc.poi_id || (existingPoiIds.length > 0 ? existingPoiIds[0] : null));

    setLoading(false);
  }, [searchId]);

  const grouped = useMemo(() => {
    const map: Record<string, PoiBusiness[]> = {};
    poiBusinesses.forEach(p => {
      const key = p.neighborhood || "Autre";
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return Object.entries(map).sort(([a], [b]) => a === "Autre" ? 1 : b === "Autre" ? -1 : a.localeCompare(b));
  }, [poiBusinesses]);

  const togglePoi = (poiId: string) => {
    setSelectedPoiIds(prev => {
      const removing = prev.includes(poiId);
      if (removing) {
        if (defaultPoiId === poiId) setDefaultPoiId(null);
        return prev.filter(id => id !== poiId);
      }
      return [...prev, poiId];
    });
  };

  const toggleNeighborhood = (pois: PoiBusiness[]) => {
    const ids = pois.map(p => p.id);
    const allSelected = ids.every(id => selectedPoiIds.includes(id));
    if (allSelected) {
      setSelectedPoiIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedPoiIds(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const isDirty = useMemo(() => {
    if (defaultPoiId !== initialDefaultPoiId) return true;
    if (selectedPoiIds.length !== initialPoiIds.length) return true;
    const sorted1 = [...selectedPoiIds].sort();
    const sorted2 = [...initialPoiIds].sort();
    return sorted1.some((v, i) => v !== sorted2[i]);
  }, [selectedPoiIds, initialPoiIds, defaultPoiId, initialDefaultPoiId]);

  const save = useCallback(async () => {
    if (!video) return;
    setSaving(true);

    try {
      // Get all existing document rows for this video URL + business
      const { data: existingDocs } = await supabase
        .from("business_documents")
        .select("id, poi_id")
        .eq("business_id", video.business_id)
        .eq("url", video.url)
        .eq("type", "video");

      const existing = existingDocs || [];
      const mainDoc = existing.find(d => d.id === video.id);
      const poiDocs = existing.filter(d => d.poi_id && d.id !== video.id);

      // Determine which POI goes on the main doc (the default)
      const mainPoiId = defaultPoiId && selectedPoiIds.includes(defaultPoiId) 
        ? defaultPoiId 
        : (selectedPoiIds.length > 0 ? selectedPoiIds[0] : null);

      const toAdd = selectedPoiIds.filter(id => id !== mainPoiId && !poiDocs.some(d => d.poi_id === id) && (mainDoc?.poi_id !== id));
      const toRemoveIds = poiDocs.filter(d => d.poi_id && !selectedPoiIds.includes(d.poi_id)).map(d => d.id);
      // Also remove duplicates that had the old main poi_id if it changed
      if (mainDoc?.poi_id && mainDoc.poi_id !== mainPoiId) {
        // The old main poi_id might now need a duplicate, or might need removal
        const oldMainInSelected = selectedPoiIds.includes(mainDoc.poi_id);
        if (oldMainInSelected && !poiDocs.some(d => d.poi_id === mainDoc.poi_id)) {
          // Old main poi needs a duplicate row now
          toAdd.push(mainDoc.poi_id);
        }
      }

      // Update main doc poi_id
      await supabase.from("business_documents").update({ poi_id: mainPoiId }).eq("id", video.id);

      // Remove the duplicate that had the new mainPoiId (if any), since it's now on main doc
      const dupWithMainPoi = poiDocs.find(d => d.poi_id === mainPoiId);
      if (dupWithMainPoi && !toRemoveIds.includes(dupWithMainPoi.id)) {
        await supabase.from("business_documents").delete().eq("id", dupWithMainPoi.id);
      }

      // Delete removed POI duplicate docs
      for (const id of toRemoveIds) {
        await supabase.from("business_documents").delete().eq("id", id);
      }

      // Create new POI duplicate docs for remaining toAdd
      // We need full doc data to duplicate
      if (toAdd.length > 0) {
        const { data: sourceDoc } = await supabase
          .from("business_documents")
          .select("url, name, thumbnail_url, sort_order, business_id, city, neighborhood, type, show_on_front, front_sort_order, force_external, subcategory_id, service_id, destination_id, linked_business_id, description, icon, language, popup, price, price_type, start_date, end_date")
          .eq("id", video.id)
          .single();

        if (sourceDoc) {
          for (const poiId of toAdd) {
            await supabase.from("business_documents").insert({
              ...sourceDoc,
              poi_id: poiId,
            });
          }
        }
      }

      setInitialPoiIds([...selectedPoiIds]);
      setInitialDefaultPoiId(defaultPoiId);
      toast.success(`${selectedPoiIds.length} POI(s) affecté(s) à la vidéo`);
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }, [video, selectedPoiIds]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") searchVideo();
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center gap-3 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ID de la vidéo…"
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 font-mono text-sm"
          />
        </div>
        <Button onClick={searchVideo} disabled={loading || !searchId.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rechercher"}
        </Button>
      </div>

      {/* Upload section */}
      {!video && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Ou uploader une nouvelle vidéo
            </h3>

            {/* Business search */}
            <div className="space-y-2 max-w-lg">
              <label className="text-xs font-medium text-muted-foreground">Établissement</label>
              {selectedUploadBusiness ? (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-sm py-1 px-3">
                    {selectedUploadBusiness.name}
                    {selectedUploadBusiness.city && ` — ${selectedUploadBusiness.city}`}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedUploadBusiness(null); setUploadedVideoUrl(""); }}>
                    Changer
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Rechercher un établissement…"
                      value={uploadBusinessQuery}
                      onChange={e => setUploadBusinessQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && searchBusinessForUpload()}
                      className="text-sm"
                    />
                    <Button size="sm" onClick={searchBusinessForUpload} disabled={searchingBusiness || !uploadBusinessQuery.trim()}>
                      {searchingBusiness ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  {uploadBusinessResults.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                      {uploadBusinessResults.map(biz => (
                        <Badge
                          key={biz.id}
                          variant="outline"
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => { setSelectedUploadBusiness(biz); setUploadBusinessResults([]); }}
                        >
                          {biz.name} {biz.city && `(${biz.city})`}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Video upload */}
            {selectedUploadBusiness && (
              <div className="space-y-3 max-w-2xl">
                <VideoUploader
                  videoUrl={uploadedVideoUrl}
                  onChange={setUploadedVideoUrl}
                  businessId={selectedUploadBusiness.id}
                />
                {uploadedVideoUrl && (
                  <Button onClick={handleCreateVideoDoc} disabled={creatingDoc}>
                    {creatingDoc ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Video className="h-4 w-4 mr-2" />}
                    Créer le document vidéo
                  </Button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {video && (
        <div className="space-y-6">
          {/* Video preview */}
          <div className="flex gap-6 items-start">
            <button
              className="relative bg-black rounded-lg overflow-hidden group shrink-0"
              style={{ width: 320, aspectRatio: "16/9" }}
              onClick={() => setLightboxUrl(video.url)}
            >
              {video.thumbnail_url ? (
                <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Play className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-primary/80 flex items-center justify-center">
                  <Play className="h-6 w-6 text-primary-foreground fill-primary-foreground ml-0.5" />
                </div>
              </div>
            </button>
            <div className="space-y-1">
              <p className="text-sm font-semibold">{video.business_name}</p>
              {video.name && <p className="text-sm text-muted-foreground">{video.name}</p>}
              <p className="text-xs text-muted-foreground font-mono">{video.id}</p>
              {video.city && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {video.city}
                </p>
              )}
            </div>
          </div>

          {/* POI assignment */}
          {poiBusinesses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun POI trouvé dans la ville « {video.city} ».</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Points d'intérêt — {video.city}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({selectedPoiIds.length} sélectionné{selectedPoiIds.length > 1 ? "s" : ""})
                  </span>
                </h3>
                {isDirty && (
                  <Button size="sm" onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Enregistrer
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {grouped.map(([neighborhood, pois]) => {
                  const ids = pois.map(p => p.id);
                  const allSelected = ids.every(id => selectedPoiIds.includes(id));
                  const someSelected = !allSelected && ids.some(id => selectedPoiIds.includes(id));

                  return (
                    <div key={neighborhood}>
                      <div className="mb-1 flex items-center gap-2">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
                          onCheckedChange={() => toggleNeighborhood(pois)}
                          className="h-3.5 w-3.5 shrink-0"
                        />
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => toggleNeighborhood(pois)}
                        >
                          {neighborhood}
                          <span className="text-[10px] opacity-60">({ids.length})</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pois.map(poi => {
                          const isSelected = selectedPoiIds.includes(poi.id);
                          const isDefault = defaultPoiId === poi.id;
                          return (
                            <div key={poi.id} className="flex items-center gap-0.5">
                              <Badge
                                variant={isSelected ? "default" : "outline"}
                                className="cursor-pointer transition-colors"
                                onClick={() => togglePoi(poi.id)}
                              >
                                {poi.name}
                              </Badge>
                              {isSelected && (
                                <button
                                  type="button"
                                  title={isDefault ? "POI par défaut" : "Définir comme POI par défaut"}
                                  onClick={() => setDefaultPoiId(poi.id)}
                                  className="p-0.5 transition-colors"
                                >
                                  <Star className={cn("h-3.5 w-3.5", isDefault ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground hover:text-yellow-500")} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {lightboxUrl && <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
};

export default VideoPoiAssignmentPanel;
