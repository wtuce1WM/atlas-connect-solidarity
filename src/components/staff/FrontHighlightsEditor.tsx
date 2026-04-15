import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2, Save, Sparkles } from "lucide-react";
import IconPicker from "./IconPicker";
import DynamicIcon from "@/components/DynamicIcon";
import { toast } from "sonner";

interface Highlight {
  id: string;
  icon: string;
  title: string;
  description: string;
  sort_order: number;
  business_id: string | null;
  section_title: string | null;
}

interface FrontHighlightsEditorProps {
  businessId: string;
}

const FrontHighlightsEditor = ({ businessId }: FrontHighlightsEditorProps) => {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [sectionTitle, setSectionTitle] = useState("Nos Points Forts");

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("front_highlights")
      .select("*")
      .eq("business_id", businessId)
      .order("sort_order");
    
    let result = (data as Highlight[]) || [];
    
    // Extract section title from first item if exists
    if (result.length > 0 && result[0].section_title) {
      setSectionTitle(result[0].section_title);
    }
    
    // Auto-initialize 4 slots if none exist
    if (result.length === 0) {
      const defaults = [
        { business_id: businessId, icon: "Sparkles", title: "", description: "", sort_order: 0, section_title: "Nos Points Forts" },
        { business_id: businessId, icon: "Star", title: "", description: "", sort_order: 1, section_title: "Nos Points Forts" },
        { business_id: businessId, icon: "Heart", title: "", description: "", sort_order: 2, section_title: "Nos Points Forts" },
        { business_id: businessId, icon: "MapPin", title: "", description: "", sort_order: 3, section_title: "Nos Points Forts" },
      ];
      await supabase.from("front_highlights").insert(defaults);
      const { data: refetch } = await supabase
        .from("front_highlights")
        .select("*")
        .eq("business_id", businessId)
        .order("sort_order");
      result = (refetch as Highlight[]) || [];
    }
    
    setHighlights(result);
    setLoading(false);
    setLoaded(true);
  };

  useEffect(() => {
    if (!loaded && businessId) fetchData();
  }, [businessId, loaded]);

  const updateField = (index: number, field: keyof Highlight, value: string) => {
    setHighlights((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    for (const h of highlights) {
      await supabase
        .from("front_highlights")
        .update({ 
          icon: h.icon, 
          title: h.title, 
          description: h.description.slice(0, 500),
          section_title: sectionTitle
        })
        .eq("id", h.id);
    }
    setSaving(false);
    toast.success("Blocs sauvegardés");
  };

  return (
    <Card>
      <CardHeader className="cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Blocs Highlights ({loaded ? highlights.filter(h => h.title || h.description).length : "…"} remplis)
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </CardTitle>
        </div>
      </CardHeader>

      {open && (
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Titre de la section</label>
                <Input
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value.slice(0, 60))}
                  placeholder="Ex: Nos Points Forts"
                  className="h-9 text-sm max-w-md"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">{sectionTitle.length}/60 caractères</p>
              </div>

              <p className="text-sm text-muted-foreground">
                Configurez jusqu'à 4 blocs mettant en avant les points forts de cette fiche.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {highlights.map((h, i) => (
                  <div key={h.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">#{i + 1}</span>
                      <DynamicIcon name={h.icon} className="h-5 w-5 text-primary" />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Icône</label>
                      <IconPicker value={h.icon} onChange={(v) => updateField(i, "icon", v)} />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Titre</label>
                      <Input
                        value={h.title}
                        onChange={(e) => updateField(i, "title", e.target.value)}
                        placeholder="Titre du bloc"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Texte ({h.description?.length || 0}/500)
                      </label>
                      <Textarea
                        value={h.description || ""}
                        onChange={(e) => {
                          if (e.target.value.length <= 500) updateField(i, "description", e.target.value);
                        }}
                        placeholder="Description (max 500 caractères)"
                        className="text-sm min-h-[100px] resize-none"
                        maxLength={500}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Sauvegarder
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default FrontHighlightsEditor;
