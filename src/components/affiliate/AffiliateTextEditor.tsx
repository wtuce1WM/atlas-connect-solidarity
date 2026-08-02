import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from "@/components/staff/RichTextEditor";

interface AffiliateTextEditorProps {
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
  { code: "ar", label: "العربية", dir: "rtl" },
];

const MAX_HOOK = 120;

const stripHtml = (html: string): string => {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const AffiliateTextEditor = ({
  nameFr, nameEn, nameAr,
  hookFr, hookEn, hookAr,
  descriptionFr, descriptionEn, descriptionAr,
  onNameChange, onHookChange, onDescriptionChange,
}: AffiliateTextEditorProps) => {
  const names = { fr: nameFr, en: nameEn, ar: nameAr };
  const hooks = { fr: hookFr, en: hookEn, ar: hookAr };
  const descriptions = { fr: descriptionFr, en: descriptionEn, ar: descriptionAr };
  const MAX_NAME = 200;
  const lastValidDesc = useRef<Record<"fr" | "en" | "ar", string>>({
    fr: descriptionFr || "",
    en: descriptionEn || "",
    ar: descriptionAr || "",
  });

  const handleDescriptionChange = (lang: "fr" | "en" | "ar", html: string) => {
    lastValidDesc.current[lang] = html;
    onDescriptionChange(lang, html);
  };

  return (
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
  );
};

export default AffiliateTextEditor;
