import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2, Sparkles, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import IconPicker from "./IconPicker";
import DynamicIcon from "@/components/DynamicIcon";

interface Highlight {
  id: string;
  icon: string;
  title: string;
  description: string;
  sort_order: number;
  business_id: string | null;
  section_title: string | null;
  section_intro: string | null;
  image_url: string | null;
}

interface FrontHighlightsEditorProps {
  businessId: string;
}

export interface FrontHighlightsEditorHandle {
  save: () => Promise<void>;
}

const TOTAL_BLOCKS = 6;
const DEFAULT_ICONS = ["Sparkles", "Star", "Heart", "MapPin", "Award", "Gem"];

const FrontHighlightsEditor = forwardRef<FrontHighlightsEditorHandle, FrontHighlightsEditorProps>(
  ({ businessId }, ref) => {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionIntro, setSectionIntro] = useState("");
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("front_highlights")
      .select("*")
      .eq("business_id", businessId)
      .order("sort_order");

    let result = (data as Highlight[]) || [];

    if (result.length > 0) {
      if (result[0].section_title) setSectionTitle(result[0].section_title);
      if (result[0].section_intro) setSectionIntro(result[0].section_intro);
    }

    const existingOrders = new Set(result.map((h) => h.sort_order));
    const toInsert = [];
    for (let i = 0; i < TOTAL_BLOCKS; i++) {
      if (!existingOrders.has(i)) {
        toInsert.push({
          business_id: businessId,
          icon: DEFAULT_ICONS[i] || "Star",
          title: "",
          description: "",
          sort_order: i,
          section_title: sectionTitle,
          section_intro: sectionIntro,
        });
      }
    }
    if (toInsert.length > 0) {
      await supabase.from("front_highlights").insert(toInsert);
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

  const updateField = (index: number, field: keyof Highlight, value: string | null) => {
    setHighlights((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleImageUpload = async (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Type invalide", description: "Sélectionnez une image." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Trop volumineux", description: "Max 5MB." });
      return;
    }
    setUploadingIndex(index);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `highlights/${businessId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("business-images").upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from("business-images").getPublicUrl(fileName);
      if (data?.publicUrl) {
        updateField(index, "image_url", data.publicUrl);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur upload", description: e.message });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleSave = async () => {
    for (const h of highlights) {
      await supabase
        .from("front_highlights")
        .update({
          icon: h.icon,
          title: h.title,
          description: h.description.slice(0, 500),
          section_title: sectionTitle,
          section_intro: sectionIntro.slice(0, 500),
          image_url: h.image_url,
        })
        .eq("id", h.id);
    }
  };

  useImperativeHandle(ref, () => ({ save: handleSave }), [highlights, sectionTitle, sectionIntro]);

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
                <Input
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value.slice(0, 60))}
                  placeholder="Ex: Nos Points Forts"
                  className="h-9 text-sm max-w-md"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">{sectionTitle.length}/60 caractères</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Texte d'introduction ({sectionIntro.length}/500)
                </label>
                <Textarea
                  value={sectionIntro}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) setSectionIntro(e.target.value);
                  }}
                  placeholder="Texte d'introduction (max 500 caractères)"
                  className="text-sm min-h-[80px] resize-none"
                  maxLength={500}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                Configurez jusqu'à {TOTAL_BLOCKS} blocs mettant en avant les points forts de cette fiche.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {highlights.map((h, i) => (
                  <div key={h.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">#{i + 1}</span>
                      <DynamicIcon name={h.icon} className="h-5 w-5 text-primary" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Icône</label>
                        <IconPicker value={h.icon} onChange={(v) => updateField(i, "icon", v)} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Image</label>
                        <input
                          ref={(el) => (fileInputRefs.current[i] = el)}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleImageUpload(i, f);
                            e.target.value = "";
                          }}
                        />
                        {h.image_url ? (
                          <div className="relative h-9 rounded border overflow-hidden bg-muted">
                            <img src={h.image_url} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => updateField(i, "image_url", null)}
                              className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                              aria-label="Supprimer l'image"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 w-full text-xs"
                            disabled={uploadingIndex === i}
                            onClick={() => fileInputRefs.current[i]?.click()}
                          >
                            {uploadingIndex === i ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Upload className="h-3 w-3 mr-1" /> Upload
                              </>
                            )}
                          </Button>
                        )}
                      </div>
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
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
});

FrontHighlightsEditor.displayName = "FrontHighlightsEditor";

export default FrontHighlightsEditor;
