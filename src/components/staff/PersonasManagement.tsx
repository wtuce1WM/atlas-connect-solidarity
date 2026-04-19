import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Save } from "lucide-react";

interface Persona {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string | null;
  description: string | null;
  video_id: string | null;
  sort_order: number;
}

const MAX_DESC = 2000;

const PersonasManagement = () => {
  const { toast } = useToast();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

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
      setPersonas((data as Persona[]) || []);
    }
    setLoading(false);
  };

  const updateField = (id: string, field: keyof Persona, value: string) => {
    setPersonas((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleSave = async (persona: Persona) => {
    setSavingId(persona.id);
    const { error } = await supabase
      .from("personas")
      .update({
        name_fr: persona.name_fr,
        description: persona.description,
        video_id: persona.video_id,
      })
      .eq("id", persona.id);
    setSavingId(null);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Enregistré", description: `${persona.name_fr} mis à jour.` });
    }
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
                      <Label htmlFor={`video-${persona.id}`}>ID Vidéo (YouTube)</Label>
                      <Input
                        id={`video-${persona.id}`}
                        value={persona.video_id || ""}
                        onChange={(e) => updateField(persona.id, "video_id", e.target.value)}
                        placeholder="ex: dQw4w9WgXcQ"
                      />
                    </div>
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
