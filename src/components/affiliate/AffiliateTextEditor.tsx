import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import RichTextEditor from "@/components/staff/RichTextEditor";

interface AffiliateTextEditorProps {
  businessId?: string;
  nameFr: string;
  nameEn: string;
  nameAr: string;
  hookFr: string;
  hookEn: string;
  hookAr: string;
  descriptionFr: string;
  descriptionEn: string;
  descriptionAr: string;
  onNameChange: (lang: "fr" | "en" | "ar", value: string) => void;
  onHookChange: (lang: "fr" | "en" | "ar", value: string) => void;
  onDescriptionChange: (lang: "fr" | "en" | "ar", value: string) => void;
}

const LANGS: Array<{ code: "fr" | "en" | "ar"; label: string; dir?: "rtl" | "ltr" }> = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
];

const MAX_HOOK = 120;

type FieldKey = "name" | "hook" | "description";

const FIELD_LABEL: Record<FieldKey, string> = {
  name: "Nom",
  hook: "Accroche",
  description: "Description",
};

const stripHtml = (html: string): string => {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const AffiliateTextEditor = ({
  businessId,
  nameFr, nameEn, nameAr,
  hookFr, hookEn, hookAr,
  descriptionFr, descriptionEn, descriptionAr,
  onNameChange, onHookChange, onDescriptionChange,
}: AffiliateTextEditorProps) => {
  const names = { fr: nameFr, en: nameEn, ar: nameAr };
  const hooks = { fr: hookFr, en: hookEn, ar: hookAr };
  const descriptions = { fr: descriptionFr, en: descriptionEn, ar: descriptionAr };
  const MAX_NAME = 200;
  const { toast } = useToast();
  const lastValidDesc = useRef<Record<"fr" | "en" | "ar", string>>({
    fr: descriptionFr || "",
    en: descriptionEn || "",
    ar: descriptionAr || "",
  });

  // --- Proposition de traduction automatique FR -> EN ---
  const baseline = useRef<Record<FieldKey, string>>({
    name: nameFr || "",
    hook: hookFr || "",
    description: descriptionFr || "",
  });
  const [dirty, setDirty] = useState<FieldKey[]>([]);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const dismissed = useRef<Record<FieldKey, string>>({ name: "", hook: "", description: "" });

  const currentFr: Record<FieldKey, string> = { name: nameFr || "", hook: hookFr || "", description: descriptionFr || "" };

  const markDirty = (field: FieldKey) => {
    const value = currentFr[field];
    if (value.trim() === baseline.current[field].trim()) return;
    if (value.trim() === dismissed.current[field].trim()) return;
    setDirty((prev) => (prev.includes(field) ? prev : [...prev, field]));
    setTranslateOpen(true);
  };

  // La Description n'a pas d'événement blur (éditeur riche) : on détecte après une pause de saisie.
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (descTimer.current) clearTimeout(descTimer.current);
    if ((descriptionFr || "").trim() === baseline.current.description.trim()) return;
    descTimer.current = setTimeout(() => markDirty("description"), 2000);
    return () => {
      if (descTimer.current) clearTimeout(descTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptionFr]);

  const closeAndDismiss = () => {
    for (const f of dirty) dismissed.current[f] = currentFr[f];
    setDirty([]);
    setTranslateOpen(false);
  };

  const runTranslation = async () => {
    if (!businessId || dirty.length === 0) {
      closeAndDismiss();
      return;
    }
    setTranslating(true);
    try {
      const fields: Record<string, string> = {};
      for (const f of dirty) fields[f] = currentFr[f];
      const { data, error } = await supabase.functions.invoke("translate-business-fields", {
        body: { business_id: businessId, fields },
      });
      if (error) throw error;
      const t = (data as any)?.translations as Record<string, string> | undefined;
      if ((data as any)?.error) throw new Error((data as any).error);
      if (!t || Object.keys(t).length === 0) throw new Error("Aucune traduction reçue");
      if (typeof t.name === "string") onNameChange("en", t.name.slice(0, MAX_NAME));
      if (typeof t.hook === "string") onHookChange("en", t.hook.slice(0, MAX_HOOK));
      if (typeof t.description === "string") {
        lastValidDesc.current.en = t.description;
        onDescriptionChange("en", t.description);
      }
      for (const f of dirty) {
        baseline.current[f] = currentFr[f];
        dismissed.current[f] = currentFr[f];
      }
      toast({ title: "Traduction appliquée", description: "Vérifiez l'onglet English, puis enregistrez." });
      setDirty([]);
      setTranslateOpen(false);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Traduction impossible",
        description: String(e?.message ?? e).slice(0, 200),
      });
    } finally {
      setTranslating(false);
    }
  };

  const handleDescriptionChange = (lang: "fr" | "en" | "ar", html: string) => {
    lastValidDesc.current[lang] = html;
    onDescriptionChange(lang, html);
  };

  return (
    <>
    <Tabs defaultValue="fr" className="w-full">
      <TabsList className="mb-4">
        {LANGS.map(l => (
          <TabsTrigger key={l.code} value={l.code}>{l.label}</TabsTrigger>
        ))}
      </TabsList>

      {LANGS.map(l => {
        const hookValue = hooks[l.code] || "";
        const descValue = descriptions[l.code] || "";
        const descTextLength = stripHtml(descValue).length;
        const nameValue = names[l.code] || "";
        const isRequired = l.code === "fr";
        return (
          <TabsContent key={l.code} value={l.code} className="space-y-6" dir={l.dir}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`name_${l.code}`} className="text-white">
                  Nom ({l.label})
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                  {isRequired && <span className="text-xs text-white/60 ml-1 font-normal">(champ obligatoire)</span>}
                </Label>
                <span className={`text-xs ${nameValue.length === 0 && isRequired ? "text-destructive font-medium" : "text-white/60"}`}>
                  {nameValue.length}/{MAX_NAME}
                </span>
              </div>
              <Input
                id={`name_${l.code}`}
                value={nameValue}
                onChange={(e) => onNameChange(l.code, e.target.value.slice(0, MAX_NAME))}
                onBlur={isRequired ? () => markDirty("name") : undefined}
                placeholder={`Nom de l'établissement en ${l.label.toLowerCase()}`}
                maxLength={MAX_NAME}
                className={`h-12 text-white placeholder:text-white/50 ${nameValue.length === 0 && isRequired ? "border-destructive focus-visible:ring-destructive" : ""}`}
                required={isRequired}
              />
              {isRequired && nameValue.length === 0 && (
                <p className="text-xs text-destructive">Le nom en français est obligatoire.</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`hook_${l.code}`} className="text-white">Accroche ({l.label})</Label>
                <span className="text-xs text-white/60">{hookValue.length}/{MAX_HOOK}</span>
              </div>
              <Input
                id={`hook_${l.code}`}
                value={hookValue}
                onChange={(e) => onHookChange(l.code, e.target.value.slice(0, MAX_HOOK))}
                onBlur={isRequired ? () => markDirty("hook") : undefined}
                placeholder={`Accroche courte en ${l.label.toLowerCase()} (max ${MAX_HOOK} caractères)`}
                maxLength={MAX_HOOK}
                className="!text-lg font-semibold h-12 text-white placeholder:text-white/50"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-white">Description ({l.label})</Label>
                <span className="text-xs text-white/60">{descTextLength} caractères</span>
              </div>
              <RichTextEditor
                content={descValue}
                onChange={(html) => handleDescriptionChange(l.code, html)}
                maxHeight="500px"
                bgClass="bg-zinc-900 text-white border border-white/10"
                simple
              />
            </div>
          </TabsContent>
        );
      })}
    </Tabs>

    <Dialog open={translateOpen} onOpenChange={(o) => { if (!o) closeAndDismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            Traduire en anglais ?
          </DialogTitle>
          <DialogDescription>
            Vous venez de modifier {dirty.length > 1 ? "ces champs" : "ce champ"} en français :
            {" "}
            <strong>{dirty.map((f) => FIELD_LABEL[f]).join(", ")}</strong>.
            Voulez-vous générer automatiquement la version anglaise ? Vous pourrez la relire avant d'enregistrer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={closeAndDismiss} disabled={translating}>
            Non merci
          </Button>
          <Button onClick={runTranslation} disabled={translating}>
            {translating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Languages className="h-4 w-4 mr-2" />}
            Traduire en anglais
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AffiliateTextEditor;
