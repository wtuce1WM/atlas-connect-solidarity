import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const languages = [
   { code: "en", name: "English", flag: "🇬🇧", dir: "ltr" },
   { code: "fr", name: "Français", flag: "🇫🇷", dir: "ltr" },
   { code: "ar", name: "العربية", flag: "🇲🇦", dir: "rtl" },
] as const;

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  
  const currentLanguage = languages.find((l) => l.code === language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-white/30 px-3 py-2 text-white transition-all hover:border-gold hover:text-gold focus:outline-none">
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="text-sm font-medium">{currentLanguage.code.toUpperCase()}</span>
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => {
              const from = language;
              setLanguage(lang.code);
              if (from !== lang.code) {
                import("@/lib/analytics").then(({ trackEvent }) =>
                  trackEvent("language_switch", { from, to: lang.code })
                ).catch(() => {});
              }
            }}
            className={`flex cursor-pointer items-center gap-3 ${
              language === lang.code ? "bg-accent" : ""
            }`}
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
