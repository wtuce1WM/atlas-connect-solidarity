import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from "@/components/staff/RichTextEditor";

interface AffiliateTextEditorProps {
  hookFr: string;
  hookEn: string;
  hookAr: string;
  descriptionFr: string;
  descriptionEn: string;
  descriptionAr: string;
  onHookChange: (lang: "fr" | "en" | "ar", value: string) => void;
  onDescriptionChange: (lang: "fr" | "en" | "ar", value: string) => void;
}

const LANGS: Array<{ code: "fr" | "en" | "ar"; label: string; dir?: "rtl" | "ltr" }> = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

const AffiliateTextEditor = ({
  hookFr, hookEn, hookAr,
  descriptionFr, descriptionEn, descriptionAr,
  onHookChange, onDescriptionChange,
}: AffiliateTextEditorProps) => {
  const hooks = { fr: hookFr, en: hookEn, ar: hookAr };
  const descriptions = { fr: descriptionFr, en: descriptionEn, ar: descriptionAr };

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
        return (
          <TabsContent key={l.code} value={l.code} className="space-y-6" dir={l.dir}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`hook_${l.code}`}>Accroche ({l.label})</Label>
                <span className="text-xs text-muted-foreground">{hookValue.length}/120</span>
              </div>
              <Input
                id={`hook_${l.code}`}
                value={hookValue}
                onChange={(e) => onHookChange(l.code, e.target.value.slice(0, 120))}
                placeholder={`Accroche courte en ${l.label.toLowerCase()} (max 120 caractères)`}
                maxLength={120}
                className="!text-lg font-semibold h-12"
              />
            </div>

            <div className="space-y-2">
              <Label>Description ({l.label})</Label>
              <RichTextEditor
                content={descValue}
                onChange={(html) => onDescriptionChange(l.code, html)}
                maxHeight="500px"
              />
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
};

export default AffiliateTextEditor;
