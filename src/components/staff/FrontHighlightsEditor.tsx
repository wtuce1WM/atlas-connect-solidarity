import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2, Save } from "lucide-react";
import IconPicker from "./IconPicker";
import DynamicIcon from "@/components/DynamicIcon";
import { toast } from "sonner";

interface Highlight {
  id: string;
  icon: string;
  title: string;
  description: string;
  sort_order: number;
}

const FrontHighlightsEditor = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("front_highlights")
      .select("*")
      .order("sort_order");
    setHighlights((data as any[]) || []);
    setLoading(false);
    setLoaded(true);
  };

  useEffect(() => {
    if (open && !loaded) fetchData();
  }, [open]);

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
        .update({ icon: h.icon, title: h.title, description: h.description.slice(0, 500) })
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
            🔲 Blocs Highlights ({loaded ? highlights.length : "…"})
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
                        Texte ({h.description.length}/500)
                      </label>
                      <Textarea
                        value={h.description}
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