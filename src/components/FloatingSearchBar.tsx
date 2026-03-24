import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileSearchOverlay from "@/components/MobileSearchOverlay";

const FloatingSearchBar = () => {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [desktopQuery, setDesktopQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Desktop: ≥ 1024px → inline input that navigates to /search
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  const placeholderText = language === "fr"
    ? "Rechercher un établissement..."
    : language === "ar"
      ? "ابحث عن مؤسسة..."
      : "Search for a business...";

  const handleDesktopSubmit = useCallback(() => {
    if (!desktopQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(desktopQuery.trim())}&_t=${Date.now()}`);
    setDesktopQuery("");
  }, [desktopQuery, navigate]);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[210] bg-black/90 backdrop-blur-md border-t border-gold/20 py-3 px-4">
        <div className="max-w-2xl mx-auto">
          {isDesktop ? (
            /* Desktop: inline text input → navigates to /search */
            <form
              onSubmit={(e) => { e.preventDefault(); handleDesktopSubmit(); }}
              className="w-full flex items-center gap-2"
            >
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={desktopQuery}
                  onChange={(e) => setDesktopQuery(e.target.value)}
                  placeholder={placeholderText}
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3.5 text-sm bg-white/90 backdrop-blur-sm border border-gold/50 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground"
                />
              </div>
            </form>
          ) : (
            /* Mobile/Tablet: button that opens fullscreen overlay */
            <button
              type="button"
              onClick={() => setOverlayOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-white/90 backdrop-blur-sm border border-gold/50 rounded-xl shadow-lg text-left"
            >
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">{placeholderText}</span>
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen search overlay — mobile/tablet only */}
      {!isDesktop && (
        <MobileSearchOverlay open={overlayOpen} onClose={() => setOverlayOpen(false)} />
      )}
    </>
  );
};

export default FloatingSearchBar;
