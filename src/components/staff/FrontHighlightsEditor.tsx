import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2, Sparkles, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import IconPicker from "./IconPicker";
import DynamicIcon from "@/components/DynamicIcon";
import RichTextEditor from "./RichTextEditor";

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
  metric_title: string | null;
  metric_value: string | null;
}

interface FrontHighlightsEditorProps {
  businessId: string;
}

export interface FrontHighlightsEditorHandle {
  save: () => Promise<void>;
}

const TOTAL_BLOCKS = 6;
const DEFAULT_ICONS: string[] = [];
const MAX_RICH = 1000;
const MAX_METRIC = 50;

const plainLen = (html: string) =>
  (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().length;

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
          icon: DEFAULT_ICONS[i] || "",
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
          description: h.description || "",
          section_title: sectionTitle,
          section_intro: sectionIntro,
          image_url: h.image_url,
          metric_title: (h.metric_title || "").slice(0, MAX_METRIC) || null,
          metric_value: (h.metric_value || "").slice(0, MAX_METRIC) || null,
        } as any)
        .eq("id", h.id);
    }
  };

  useImperativeHandle(ref, () => ({ save: handleSave }), [highlights, sectionTitle, sectionIntro]);

  const introLen = plainLen(sectionIntro);

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
                  Texte d'introduction
                </label>
                <RichTextEditor
                  content={sectionIntro}
                  onChange={setSectionIntro}
                  placeholder="Texte d'introduction (max 1000 caractères)"
                  maxHeight="300px"
                />
                <p className={`text-xs text-right ${introLen > MAX_RICH ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                  {introLen}/{MAX_RICH}{introLen > MAX_RICH && " ⚠ Limite dépassée"}
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                Configurez jusqu'à {TOTAL_BLOCKS} blocs mettant en avant les points forts de cette fiche.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {highlights.map((h, i) => {
                  const descLen = plainLen(h.description || "");
                  return (
                  <div key={h.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">#{i + 1}</span>
                      {h.icon && <DynamicIcon name={h.icon} className="h-5 w-5 text-primary" />}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
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
                          <div className="relative w-full rounded border overflow-hidden bg-muted" style={{ aspectRatio: "1 / 1", height: "auto" }}>
                            <img src={h.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />

                            <button
                              type="button"
                              onClick={() => updateField(i, "image_url", null)}
                              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
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
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Icône</label>
                        <IconPicker value={h.icon} onChange={(v) => updateField(i, "icon", v)} />
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

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Valeur ({(h.metric_value || "").length}/{MAX_METRIC})
                        </label>
                        <Input
                          value={h.metric_value || ""}
                          onChange={(e) => updateField(i, "metric_value", e.target.value.slice(0, MAX_METRIC))}
                          placeholder="Ex: 98%"
                          className="h-8 text-sm"
                          maxLength={MAX_METRIC}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Titre métrique ({(h.metric_title || "").length}/{MAX_METRIC})
                        </label>
                        <Input
                          value={h.metric_title || ""}
                          onChange={(e) => updateField(i, "metric_title", e.target.value.slice(0, MAX_METRIC))}
                          placeholder="Ex: Satisfaction"
                          className="h-8 text-sm"
                          maxLength={MAX_METRIC}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Texte
                      </label>
                      <RichTextEditor
                        content={h.description || ""}
                        onChange={(html) => updateField(i, "description", html)}
                        placeholder="Description (max 1000 caractères)"
                        maxHeight="280px"
                      />
                      <p className={`text-xs text-right ${descLen > MAX_RICH ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                        {descLen}/{MAX_RICH}{descLen > MAX_RICH && " ⚠ Limite dépassée"}
                      </p>
                    </div>
                  </div>
                  );
                })}
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
