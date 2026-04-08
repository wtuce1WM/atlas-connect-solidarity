import { useState } from "react";
import { Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import MobileSearchOverlay from "@/components/MobileSearchOverlay";

const FloatingSearchBar = () => {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const { language } = useLanguage();

  const placeholderText = language === "fr"
    ? "Rechercher un établissement..."
    : language === "ar"
      ? "ابحث عن مؤسسة..."
      : "Search for a business...";

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[210] py-3 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => setOverlayOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-white/90 backdrop-blur-sm border border-gold/50 rounded-xl shadow-lg text-left"
          >
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">{placeholderText}</span>
          </button>
        </div>
      </div>

      {/* Fullscreen search overlay */}
      <MobileSearchOverlay open={overlayOpen} onClose={() => setOverlayOpen(false)} />
    </>
  );
};

export default FloatingSearchBar;
