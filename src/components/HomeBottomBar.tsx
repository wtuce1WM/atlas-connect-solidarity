import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, MapPin, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import MobileSearchOverlay from "@/components/MobileSearchOverlay";

/**
 * Liquid-glass bottom CTA bar for the Homepage.
 * 4 actions: Search, IA, Lieu, Profil — opening the same overlays/routes
 * used on /search when the Google map is closed.
 */
const HomeBottomBar = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [searchOpen, setSearchOpen] = useState(false);

  const labels = {
    fr: { search: "Search", ai: "IA", poi: "Lieu", profile: "Profil" },
    en: { search: "Search", ai: "AI", poi: "Place", profile: "Profile" },
    ar: { search: "بحث", ai: "ذكاء", poi: "مكان", profile: "حساب" },
  } as const;
  const t = labels[(language as keyof typeof labels)] ?? labels.fr;

  const items = [
    { key: "search", icon: Search, label: t.search, onClick: () => setSearchOpen(true) },
    { key: "ai", icon: Sparkles, label: t.ai, onClick: () => navigate("/search?tab=ai") },
    { key: "poi", icon: MapPin, label: t.poi, onClick: () => navigate("/search?tab=poi") },
    { key: "profile", icon: User, label: t.profile, onClick: () => navigate("/club") },
  ];

  return (
    <>
      <div className="fixed bottom-3 left-0 right-0 z-[200] px-4 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div
            className="flex items-stretch justify-around gap-1 rounded-2xl border border-white/25 bg-white/10 backdrop-blur-xl px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
            style={{ WebkitBackdropFilter: "blur(20px) saturate(160%)", backdropFilter: "blur(20px) saturate(160%)" }}
          >
            {items.map(({ key, icon: Icon, label, onClick }) => (
              <button
                key={key}
                type="button"
                onClick={onClick}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl text-white hover:bg-white/15 transition-colors"
                aria-label={label}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[11px] font-medium leading-none">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <MobileSearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default HomeBottomBar;
