import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import IconPicker from "@/components/staff/IconPicker";
import DynamicIcon from "@/components/DynamicIcon";
import RichTextEditor from "@/components/staff/RichTextEditor";

type Lang = "fr" | "en" | "ar";

interface Highlight {
  id: string;
  icon: string;
  sort_order: number;
  business_id: string | null;
  image_url: string | null;
  /** FR = colonnes historiques partagées avec le backoffice et le front public */
  title: string | null;
  title_en: string | null;
  title_ar: string | null;
  description: string | null;
  description_en: string | null;
  description_ar: string | null;
  section_title: string | null;
  section_title_en: string | null;
  section_title_ar: string | null;
  section_intro: string | null;
  section_intro_en: string | null;
  section_intro_ar: string | null;
  metric_title: string | null;
  metric_title_en: string | null;
  metric_title_ar: string | null;
  metric_value: string | null;
  metric_value_en: string | null;
  metric_value_ar: string | null;
}

export interface AffiliateHighlightsEditorHandle {
  save: () => Promise<void>;
  hasChanges: () => boolean;
}

interface Props {
  businessId: string;
  onDirtyChange?: (dirty: boolean) => void;
}

const TOTAL_BLOCKS = 6;
const MAX_RICH = 1000;
const MAX_METRIC = 50;
const MAX_SECTION_TITLE = 60;

/** FR écrit dans les colonnes historiques (title, description…), EN/AR dans les suffixées. */
const sfx = (l: Lang) => (l === "fr" ? "" : `_${l}`);

const plainLen = (html: string) =>
  (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().length;

const SELECT_COLS = "id,icon,sort_order,business_id,image_url,section_columns,title,title_en,title_ar,description,description_en,description_ar,section_title,section_title_en,section_title_ar,section_intro,section_intro_en,section_intro_ar,metric_title,metric_title_en,metric_title_ar,metric_value,metric_value_en,metric_value_ar";


const AffiliateHighlightsEditor = forwardRef<AffiliateHighlightsEditorHandle, Props>(
  ({ businessId, onDirtyChange }, ref) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [sectionTitle, setSectionTitle] = useState<Record<Lang, string>>({ fr: "", en: "", ar: "" });
    const [sectionIntro, setSectionIntro] = useState<Record<Lang, string>>({ fr: "", en: "", ar: "" });
    const [sectionColumns, setSectionColumns] = useState<number>(2);
    const [lang, setLang] = useState<Lang>("fr");
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
    const [dirty, setDirty] = useState(false);
    const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
    const { toast } = useToast();

    const markDirty = () => {
      setDirty(true);
      onDirtyChange?.(true);
    };

    useEffect(() => {
      const fetchData = async () => {
        setLoading(true);
        const { data } = await supabase
          .from("front_highlights")
          .select(SELECT_COLS)
          .eq("business_id", businessId)
          .order("sort_order");

        let result = ((data as unknown) as Highlight[]) || [];

        if (result.length > 0) {
          const first = result[0];
          setSectionTitle({
            fr: first.section_title || "",
            en: first.section_title_en || "",
            ar: first.section_title_ar || "",
          });
          setSectionIntro({
            fr: first.section_intro || "",
            en: first.section_intro_en || "",
            ar: first.section_intro_ar || "",
          });
          setSectionColumns(Number((first as any).section_columns) || 2);
        }

        const existingOrders = new Set(result.map((h) => h.sort_order));
        const toInsert: any[] = [];
        for (let i = 0; i < TOTAL_BLOCKS; i++) {
          if (!existingOrders.has(i)) {
            toInsert.push({
              business_id: businessId,
              icon: "",
              title: "",
              description: "",
              sort_order: i,
            });
          }
        }
        if (toInsert.length > 0) {
          await supabase.from("front_highlights").insert(toInsert);
          const { data: refetch } = await supabase
            .from("front_highlights")
            .select(SELECT_COLS)
            .eq("business_id", businessId)
            .order("sort_order");
          result = ((refetch as unknown) as Highlight[]) || [];
        }

        setHighlights(result);
        setLoading(false);
      };
      fetchData();
    }, [businessId]);

    const updateField = (index: number, field: keyof Highlight, value: string | null) => {
      setHighlights((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
      markDirty();
    };

    const handleImageUpload = async (index: number, rawFile: File) => {
      if (!rawFile.type.startsWith("image/")) {
        toast({ variant: "destructive", title: "Type invalide", description: "Sélectionnez une image." });
        return;
      }
      if (rawFile.size > 25 * 1024 * 1024) {
        toast({ variant: "destructive", title: "Trop volumineux", description: "Max 25 Mo." });
        return;
      }
      setUploadingIndex(index);
      try {
        const { file } = await compressImage(rawFile);
        const ext = (file.name.split(".").pop() || "webp").toLowerCase();
        const fileName = `highlights/${businessId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from("business-images")
          .upload(fileName, file, { contentType: file.type, cacheControl: "31536000" });
        if (error) throw error;
        const { data } = supabase.storage.from("business-images").getPublicUrl(fileName);
        if (data?.publicUrl) updateField(index, "image_url", data.publicUrl);
      } catch (e: any) {
        toast({ variant: "destructive", title: "Erreur upload", description: e.message });
      } finally {
        setUploadingIndex(null);
      }
    };

    const handleSave = async () => {
      setSaving(true);
      try {
        for (const h of highlights) {
          const { error } = await supabase
            .from("front_highlights")
            .update({
              icon: h.icon || "",
              image_url: h.image_url || null,
              section_columns: sectionColumns,
              // FR : colonnes historiques (lues par le front et le backoffice) + miroir _fr
              title: h.title || "",
              title_fr: h.title || "",
              title_en: h.title_en,
              title_ar: h.title_ar,
              description: h.description || "",
              description_fr: h.description || "",
              description_en: h.description_en,
              description_ar: h.description_ar,
              section_title: sectionTitle.fr,
              section_title_fr: sectionTitle.fr,
              section_title_en: sectionTitle.en,
              section_title_ar: sectionTitle.ar,
              section_intro: sectionIntro.fr,
              section_intro_fr: sectionIntro.fr,
              section_intro_en: sectionIntro.en,
              section_intro_ar: sectionIntro.ar,
              metric_title: (h.metric_title || "").slice(0, MAX_METRIC) || null,
              metric_title_fr: (h.metric_title || "").slice(0, MAX_METRIC) || null,
              metric_title_en: (h.metric_title_en || "").slice(0, MAX_METRIC) || null,
              metric_title_ar: (h.metric_title_ar || "").slice(0, MAX_METRIC) || null,
              metric_value: (h.metric_value || "").slice(0, MAX_METRIC) || null,
              metric_value_fr: (h.metric_value || "").slice(0, MAX_METRIC) || null,
              metric_value_en: (h.metric_value_en || "").slice(0, MAX_METRIC) || null,
              metric_value_ar: (h.metric_value_ar || "").slice(0, MAX_METRIC) || null,
            } as any)
            .eq("id", h.id);
          if (error) throw error;
        }
        setDirty(false);
        onDirtyChange?.(false);
        toast({ title: "Blocs enregistrés ✓" });
      } catch (e: any) {
        toast({ variant: "destructive", title: "Erreur d'enregistrement", description: e.message });
        throw e;
      } finally {
        setSaving(false);
      }
    };

    useImperativeHandle(
      ref,
      () => ({ save: handleSave, hasChanges: () => dirty }),
      [highlights, sectionTitle, sectionIntro, sectionColumns, dirty]
    );

    const titleField = `title${sfx(lang)}` as keyof Highlight;
    const descField = `description${sfx(lang)}` as keyof Highlight;
    const metricTitleField = `metric_title${sfx(lang)}` as keyof Highlight;
    const metricValueField = `metric_value${sfx(lang)}` as keyof Highlight;
    const rtl = lang === "ar";
    const introLen = plainLen(sectionIntro[lang]);

    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Tabs value={lang} onValueChange={(v) => setLang(v as Lang)}>
          <TabsList>
            <TabsTrigger value="fr">🇫🇷 Français</TabsTrigger>
            <TabsTrigger value="en">🇬🇧 English</TabsTrigger>
            <TabsTrigger value="ar">🇲🇦 العربية</TabsTrigger>
          </TabsList>

          {(["fr", "en", "ar"] as Lang[]).map((l) => (
            <TabsContent key={l} value={l} className="space-y-4 mt-4" dir={l === "ar" ? "rtl" : "ltr"}>
              {l === lang && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Titre de la section</label>
                    <Input
                      value={sectionTitle[lang]}
                      onChange={(e) => {
                        setSectionTitle((s) => ({ ...s, [lang]: e.target.value.slice(0, MAX_SECTION_TITLE) }));
                        markDirty();
                      }}
                      placeholder="Ex: Nos Points Forts"
                      className="h-9 text-sm max-w-md"
                      maxLength={MAX_SECTION_TITLE}
                      dir={rtl ? "rtl" : "ltr"}
                    />
                    <p className="text-xs text-muted-foreground">{sectionTitle[lang].length}/{MAX_SECTION_TITLE}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Texte d'introduction</label>
                    <RichTextEditor
                      simple
                      content={sectionIntro[lang]}
                      onChange={(html) => {
                        setSectionIntro((s) => ({ ...s, [lang]: html }));
                        markDirty();
                      }}
                      placeholder={`Introduction (max ${MAX_RICH} caractères)`}
                      maxHeight="200px"
                      bgClass="bg-zinc-900 text-white border border-white/10"
                    />
                    <p className={`text-xs text-right ${introLen > MAX_RICH ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                      {introLen}/{MAX_RICH}{introLen > MAX_RICH && " ⚠"}
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Configurez jusqu'à {TOTAL_BLOCKS} blocs mettant en avant les points forts de cet établissement.
                    L'icône et l'image sont communes aux 3 langues.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {highlights.map((h, i) => {
                      const descVal = (h[descField] as string) || "";
                      const titleVal = (h[titleField] as string) || "";
                      const metricTitleVal = (h[metricTitleField] as string) || "";
                      const metricValueVal = (h[metricValueField] as string) || "";
                      const descLen = plainLen(descVal);
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
                                    <><Upload className="h-3 w-3 mr-1" /> Upload</>
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
                              value={titleVal}
                              onChange={(e) => updateField(i, titleField, e.target.value)}
                              placeholder="Titre du bloc"
                              className="h-8 text-sm"
                              dir={rtl ? "rtl" : "ltr"}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                Titre métrique ({metricTitleVal.length}/{MAX_METRIC})
                              </label>
                              <Input
                                value={metricTitleVal}
                                onChange={(e) => updateField(i, metricTitleField, e.target.value.slice(0, MAX_METRIC))}
                                placeholder="Ex: Satisfaction"
                                className="h-8 text-sm"
                                maxLength={MAX_METRIC}
                                dir={rtl ? "rtl" : "ltr"}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                Valeur ({metricValueVal.length}/{MAX_METRIC})
                              </label>
                              <Input
                                value={metricValueVal}
                                onChange={(e) => updateField(i, metricValueField, e.target.value.slice(0, MAX_METRIC))}
                                placeholder="Ex: 98%"
                                className="h-8 text-sm"
                                maxLength={MAX_METRIC}
                                dir={rtl ? "rtl" : "ltr"}
                              />
                            </div>
                          </div>


                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Texte</label>
                            <RichTextEditor
                              simple
                              content={descVal}
                              onChange={(html) => updateField(i, descField, html)}
                              placeholder={`Description (max ${MAX_RICH} caractères)`}
                              maxHeight="240px"
                              bgClass="bg-zinc-900 text-white border border-white/10"
                            />
                            <p className={`text-xs text-right ${descLen > MAX_RICH ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                              {descLen}/{MAX_RICH}{descLen > MAX_RICH && " ⚠"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button size="sm" disabled={!dirty} onClick={handleSave}>
                      Enregistrer les blocs
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }
);

AffiliateHighlightsEditor.displayName = "AffiliateHighlightsEditor";

export default AffiliateHighlightsEditor;
