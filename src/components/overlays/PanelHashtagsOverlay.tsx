import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { readLastHomepageCity } from "@/lib/cityHomepage";
import { useLanguage } from "@/contexts/LanguageContext";
import { withLangPrefix } from "@/lib/localizedPath";
import koutoubiaVerticalBgAsset from "@/assets/hero-bg-koutoubia-zellige-vertical-tinted-v3-1080x1920.webp.asset.json";

const T = {
  empty: { fr: "Aucun hashtag.", en: "No hashtags.", ar: "لا توجد وسوم." },
  filterBy: { fr: "Filtrer par", en: "Filter by", ar: "تصفية حسب" },
  close: { fr: "Fermer", en: "Close", ar: "إغلاق" },
} as const;

interface HashtagBadge {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const PanelHashtagsOverlay = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const tr = (k: keyof typeof T) => T[k][language as "fr" | "en" | "ar"] || T[k].fr;
  const [badges, setBadges] = useState<HashtagBadge[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("badges")
        .select("id, name_fr, name_en, name_ar")
        .like("name_fr", "#%")
        .order("name_fr", { ascending: true });
      setBadges(((data as any[]) || []) as HashtagBadge[]);
    })();
  }, [open]);

  const localizedName = (b: HashtagBadge) => {
    if (language === "en") return b.name_en || b.name_fr;
    if (language === "ar") return b.name_ar || b.name_fr;
    return b.name_fr;
  };

  if (!open) return null;

  const goBadge = (badge: HashtagBadge) => {
    // Build a clean, shareable URL: only city + badge params. We intentionally
    // drop subcats/label/category/q/_t/openBusiness so the resulting URL is
    // a pure "hashtag view" that can be copied and shared as-is.
    const currentCity = location.pathname === "/search"
      ? new URLSearchParams(location.search).get("city")
      : null;
    const city = currentCity || readLastHomepageCity() || "Marrakech";
    const sp = new URLSearchParams();
    sp.set("city", city);
    sp.set("badgeId", badge.id);
    sp.set("badgeLabel", badge.name_fr);
    // Close any previously opened slide panel so it doesn't reappear over the hashtag results.
    try { window.dispatchEvent(new CustomEvent("close-compact-panel")); } catch {}
    navigate(`${withLangPrefix("/search", language as any)}?${sp.toString()}`);
    onClose();
  };



  return (
    <div
      className="absolute inset-0 h-full min-h-0 bg-background bg-no-repeat bg-cover bg-center animate-slide-up-from-bottom"
      style={{ backgroundImage: `url('${koutoubiaVerticalBgAsset.url}')` }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={tr("close")}
        className="absolute top-3 left-3 z-30 w-9 h-9 rounded-full bg-black hover:bg-black/90 flex items-center justify-center text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="absolute inset-0 overflow-y-scroll overscroll-contain touch-pan-y px-4 pt-14 pb-4">
        <div className="flex flex-col items-center gap-4 pt-3">
          {badges.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => goBadge(b)}
              className="relative inline-flex items-center rounded-full border-2 border-black bg-white/20 text-black hover:bg-white/30 px-4 py-2 text-sm md:px-6 md:py-3 md:text-lg font-semibold transition-all overflow-hidden backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),inset_0_-1px_2px_0_rgba(255,255,255,0.25),0_4px_16px_-4px_rgba(0,0,0,0.3)] before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-br before:from-white/50 before:via-white/10 before:to-white/30 before:pointer-events-none [&>*]:relative [&>*]:z-10"
              title={`${tr("filterBy")} ${b.name_fr}`}
            >
              <span>{b.name_fr}</span>
            </button>
          ))}
          {badges.length === 0 && (
            <p className="text-xs text-muted-foreground">{tr("empty")}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PanelHashtagsOverlay;
