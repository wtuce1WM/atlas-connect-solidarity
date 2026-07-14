import { useLanguage } from "@/contexts/LanguageContext";

const LABELS = {
  en: "Not yet translated — showing French version",
  ar: "غير مترجمة بعد — عرض النسخة الفرنسية",
  fr: "",
} as const;

/**
 * Small discreet badge shown when a page in EN/AR is serving French content
 * because no translation exists yet. Hidden on FR.
 */
export default function TranslationFallbackBadge() {
  const { language } = useLanguage();
  if (language === "fr") return null;
  return (
    <div
      className="mx-auto my-2 inline-flex max-w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary"
      role="note"
      aria-label={LABELS[language]}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
      {LABELS[language]}
    </div>
  );
}
