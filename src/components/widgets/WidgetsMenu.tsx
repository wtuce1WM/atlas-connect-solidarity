import { useState } from "react";
import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { useLanguage } from "@/contexts/LanguageContext";

/** Entrées du menu /widgets : 1 entrée = 1 page widget. */
export const WIDGET_ENTRIES: { id: string; n: string; fr: string; en: string }[] = [
  { id: "assistant-ia", n: "01", fr: "Assistant IA & Vocal", en: "Voice & AI Assistant" },
  { id: "carte", n: "02", fr: "Map & App — à proximité", en: "Map & App — nearby" },
  { id: "avis-clients", n: "03", fr: "Avis clients", en: "Customer reviews" },
  { id: "laisser-un-avis", n: "04", fr: "Laisser un avis", en: "Leave a review" },
  { id: "id-numerique", n: "05", fr: "ID numérique", en: "Digital ID" },
  { id: "meteo", n: "06", fr: "Météo", en: "Weather" },
  { id: "marees", n: "07", fr: "Marées, Vents & Météo", en: "Tides, Wind & Weather" },
  { id: "compatibilite", n: "", fr: "Compatibilité des plateformes", en: "Platform compatibility" },
];

const WidgetsMenu = () => {
  const [open, setOpen] = useState(false);
  const navigate = useLocalizedNavigate();
  const { language } = useLanguage();
  const en = language === "en";
  const { pathname } = useLocation();
  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };
  const item = (path: string, label: string, n?: string) => {
    const active = pathname.replace(/^\/en/, "") === path;
    return (
      <button
        key={path}
        type="button"
        onClick={() => go(path)}
        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-roboto text-[14px] transition-colors hover:bg-white/10 ${active ? "bg-white/10 text-[#E4C877]" : "text-white/90"}`}
      >
        {n !== undefined && (
          <span className="w-7 text-[11px] font-semibold tracking-[0.2em] text-[#C6A046]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            {n}
          </span>
        )}
        {label}
      </button>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={en ? "Widgets menu" : "Menu des widgets"}
          className="fixed right-4 top-20 z-50 inline-flex items-center gap-2 rounded-full border border-[#C6A046]/60 bg-black/55 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#E4C877] backdrop-blur-md md:top-24"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <Menu className="h-4 w-4" /> Widgets
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="z-[100] w-[300px] border-white/10 bg-[hsl(0_0%_6%)] p-4 text-white">
        <SheetHeader>
          <SheetTitle className="text-left text-[#F4ECDF]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Widgets
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-4 space-y-1">
          {item("/widgets", en ? "Overview" : "Présentation")}
          {WIDGET_ENTRIES.map((w) => item(`/widgets/${w.id}`, en ? w.en : w.fr, w.n))}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default WidgetsMenu;
