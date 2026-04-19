import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Save, Trash2, Youtube, Film } from "lucide-react";

interface Persona {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string | null;
  description: string | null;
  video_id: string | null;
  sort_order: number;
}

interface InternalVideoMeta {
  id: string;
  name: string | null;
  url: string | null;
  thumbnail_url: string | null;
}

const MAX_DESC = 2000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (v: string) => UUID_RE.test(v.trim());

const PersonasManagement = () => {
  const { toast } = useToast();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [internalVideos, setInternalVideos] = useState<Record<string, InternalVideoMeta>>({});

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("personas")
      .select("id, slug, name_fr, name_en, description, video_id, sort_order")
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Chargement impossible." });
    } else {
      const list = (data as Persona[]) || [];
      setPersonas(list);
      // Fetch internal video metadata for any UUID video_ids
      const uuids = list.map((p) => p.video_id).filter((v): v is string => !!v && isUuid(v));
      if (uuids.length) {
        const { data: vids } = await supabase
          .from("generic_videos")
          .select("id, name, url, thumbnail_url")
          .in("id", uuids);
        if (vids) {
          const map: Record<string, InternalVideoMeta> = {};
          vids.forEach((v: any) => (map[v.id] = v));
          setInternalVideos(map);
        }
      }
    }
    setLoading(false);
  };

  const updateField = (id: string, field: keyof Persona, value: string | null) => {
    setPersonas((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleSave = async (persona: Persona) => {
    setSavingId(persona.id);
    const { error } = await supabase
      .from("personas")
      .update({
        name_fr: persona.name_fr,
        description: persona.description,
        video_id: persona.video_id?.trim() || null,
      })
      .eq("id", persona.id);
    setSavingId(null);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
      return;
    }
    toast({ title: "Enregistré", description: `${persona.name_fr} mis à jour.` });
    // Refresh internal video metadata if needed
    const vid = persona.video_id?.trim();
    if (vid && isUuid(vid) && !internalVideos[vid]) {
      const { data } = await supabase
        .from("generic_videos")
        .select("id, name, url, thumbnail_url")
        .eq("id", vid)
        .maybeSingle();
      if (data) setInternalVideos((prev) => ({ ...prev, [vid]: data as InternalVideoMeta }));
    }
  };

  const handleRemoveVideo = async (persona: Persona) => {
    setSavingId(persona.id);
    const { error } = await supabase
      .from("personas")
      .update({ video_id: null })
      .eq("id", persona.id);
    setSavingId(null);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
      return;
    }
    updateField(persona.id, "video_id", null);
    toast({ title: "Vidéo supprimée", description: `${persona.name_fr} : vidéo retirée.` });
  };

  const renderVideoPreview = (persona: Persona) => {
    const vid = persona.video_id?.trim();
    if (!vid) return null;

    if (isUuid(vid)) {
      const meta = internalVideos[vid];
      return (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Film className="h-3.5 w-3.5" />
            Vidéo interne
          </div>
          <div className="flex gap-3 items-start">
            {meta?.thumbnail_url ? (
              <img
                src={meta.thumbnail_url}
                alt={meta.name || "Vidéo"}
                className="h-20 w-32 object-cover rounded"
              />
            ) : meta?.url ? (
              <video src={meta.url} className="h-20 w-32 object-cover rounded bg-black" muted />
            ) : (
              <div className="h-20 w-32 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                Aperçu indisponible
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{meta?.name || "Vidéo sans nom"}</p>
              <p className="text-xs text-muted-foreground font-mono truncate">{vid}</p>
            </div>
          </div>
        </div>
      );
    }

    // Treat as YouTube ID
    return (
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Youtube className="h-3.5 w-3.5" />
          Vidéo YouTube
        </div>
        <div className="aspect-video w-full max-w-md rounded overflow-hidden bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${vid}`}
            title={`YouTube ${vid}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
        <p className="text-xs text-muted-foreground font-mono">{vid}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Personas</h2>
        <p className="text-muted-foreground">
          Profils de voyageurs proposés aux membres du Club ({personas.length})
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
            const hasVideo = !!persona.video_id?.trim();
            return (
              <Card key={persona.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-gold" />
                    <span className="text-base font-mono text-muted-foreground">{persona.slug}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${persona.id}`}>Nom (FR)</Label>
                      <Input
                        id={`name-${persona.id}`}
                        value={persona.name_fr}
                        onChange={(e) => updateField(persona.id, "name_fr", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`video-${persona.id}`}>ID Vidéo (YouTube ou interne)</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`video-${persona.id}`}
                          value={persona.video_id || ""}
                          onChange={(e) => updateField(persona.id, "video_id", e.target.value)}
                          placeholder="ID YouTube (dQw4w9WgXcQ) ou UUID interne"
                        />
                        {hasVideo && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleRemoveVideo(persona)}
                            disabled={savingId === persona.id}
                            title="Supprimer la vidéo"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Collez l'ID YouTube ou l'UUID d'une vidéo interne stockée dans la bibliothèque.
                      </p>
                    </div>
                  </div>

                  {hasVideo && renderVideoPreview(persona)}

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
