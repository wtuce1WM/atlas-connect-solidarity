import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Save, Trash2, Plus, Film } from "lucide-react";

interface Persona {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string | null;
  description: string | null;
  video_ids: string[];
  sort_order: number;
}

interface InternalVideoMeta {
  id: string;
  name: string | null;
  url: string | null;
  thumbnail_url: string | null;
}

const MAX_DESC = 2000;
const MAX_VIDEOS = 12;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string) => UUID_RE.test(v.trim());

const PersonasManagement = () => {
  const { toast } = useToast();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<Record<string, InternalVideoMeta>>({});
  const [newIdInput, setNewIdInput] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchVideoMetas = async (ids: string[]) => {
    const unique = Array.from(new Set(ids.filter(isUuid)));
    if (!unique.length) return;
    const map: Record<string, InternalVideoMeta> = {};

    // 1) generic_videos
    const { data: gen } = await supabase
      .from("generic_videos")
      .select("id, name, url, thumbnail_url")
      .in("id", unique);
    (gen || []).forEach((v: any) => (map[v.id] = v));

    // 2) business_documents (vidéos liées à des POIs / établissements)
    const missing = unique.filter((id) => !map[id]);
    if (missing.length) {
      const { data: docs } = await supabase
        .from("business_documents")
        .select("id, name, url, thumbnail_url")
        .eq("type", "video")
        .in("id", missing);
      (docs || []).forEach((v: any) => (map[v.id] = v));
    }

    setVideoMeta((prev) => ({ ...prev, ...map }));
  };

  const fetchPersonas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("personas")
      .select("id, slug, name_fr, name_en, description, video_ids, sort_order")
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Chargement impossible." });
    } else {
      const list = ((data as unknown) as Persona[]) || [];
      // Ensure video_ids is always an array
      list.forEach((p) => { if (!Array.isArray(p.video_ids)) p.video_ids = []; });
      setPersonas(list);
      const allIds = list.flatMap((p) => p.video_ids || []);
      fetchVideoMetas(allIds);
    }
    setLoading(false);
  };

  const updateField = (id: string, field: keyof Persona, value: any) => {
    setPersonas((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleSave = async (persona: Persona) => {
    setSavingId(persona.id);
    const { error } = await supabase
      .from("personas")
      .update({
        name_fr: persona.name_fr,
        description: persona.description,
        video_ids: persona.video_ids,
      })
      .eq("id", persona.id);
    setSavingId(null);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
      return;
    }
    toast({ title: "Enregistré", description: `${persona.name_fr} mis à jour.` });
    fetchVideoMetas(persona.video_ids);
  };

  const handleAddVideo = (persona: Persona) => {
    const raw = (newIdInput[persona.id] || "").trim();
    if (!raw) return;
    if (!isUuid(raw)) {
      toast({ variant: "destructive", title: "ID invalide", description: "Doit être un UUID de vidéo interne." });
      return;
    }
    if (persona.video_ids.includes(raw)) {
      toast({ variant: "destructive", title: "Doublon", description: "Cette vidéo est déjà associée." });
      return;
    }
    if (persona.video_ids.length >= MAX_VIDEOS) {
      toast({ variant: "destructive", title: "Limite atteinte", description: `Maximum ${MAX_VIDEOS} vidéos.` });
      return;
    }
    updateField(persona.id, "video_ids", [...persona.video_ids, raw]);
    setNewIdInput((prev) => ({ ...prev, [persona.id]: "" }));
    fetchVideoMetas([raw]);
  };

  const handleRemoveVideo = (persona: Persona, vid: string) => {
    updateField(persona.id, "video_ids", persona.video_ids.filter((v) => v !== vid));
  };

  const renderVideoCard = (persona: Persona, vid: string, idx: number) => {
    const meta = videoMeta[vid];
    return (
      <div key={vid} className="rounded-lg border bg-muted/20 p-2 space-y-2 relative group">
        <div className="aspect-video w-full rounded overflow-hidden bg-black flex items-center justify-center">
          {meta?.url ? (
            <video
              src={meta.url}
              poster={meta.thumbnail_url || undefined}
              controls
              preload="metadata"
              className="w-full h-full object-cover"
            />
          ) : meta?.thumbnail_url ? (
            <img src={meta.thumbnail_url} alt={meta.name || ""} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-muted-foreground">Aperçu indisponible</span>
          )}
        </div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">
              #{idx + 1} · {meta?.name || "Vidéo sans nom"}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono truncate">{vid}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => handleRemoveVideo(persona, vid)}
            title="Retirer cette vidéo"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Personas</h2>
        <p className="text-muted-foreground">
          Profils de voyageurs proposés aux membres du Club ({personas.length}). Jusqu'à {MAX_VIDEOS} vidéos internes par persona.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4">
          {personas.map((persona) => {
            const descLen = (persona.description || "").length;
            const count = persona.video_ids.length;
            return (
              <Card key={persona.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-gold" />
                    <span className="text-base font-mono text-muted-foreground">{persona.slug}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`name-${persona.id}`}>Nom (FR)</Label>
                    <Input
                      id={`name-${persona.id}`}
                      value={persona.name_fr}
                      onChange={(e) => updateField(persona.id, "name_fr", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Film className="h-4 w-4" />
                        Vidéos internes ({count} / {MAX_VIDEOS})
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newIdInput[persona.id] || ""}
                        onChange={(e) => setNewIdInput((prev) => ({ ...prev, [persona.id]: e.target.value }))}
                        placeholder="Coller un UUID de vidéo interne…"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddVideo(persona);
                          }
                        }}
                        disabled={count >= MAX_VIDEOS}
                        className="font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleAddVideo(persona)}
                        disabled={count >= MAX_VIDEOS}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter
                      </Button>
                    </div>
                    {count > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-2">
                        {persona.video_ids.map((vid, idx) => renderVideoCard(persona, vid, idx))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`desc-${persona.id}`}>Description</Label>
                      <span
                        className={`text-xs ${descLen > MAX_DESC ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {descLen} / {MAX_DESC}
                      </span>
                    </div>
                    <Textarea
                      id={`desc-${persona.id}`}
                      value={persona.description || ""}
                      onChange={(e) => updateField(persona.id, "description", e.target.value.slice(0, MAX_DESC))}
                      maxLength={MAX_DESC}
                      rows={6}
                      placeholder="Décrivez ce profil de voyageur…"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => handleSave(persona)} disabled={savingId === persona.id}>
                      {savingId === persona.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PersonasManagement;
