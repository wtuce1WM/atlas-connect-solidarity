import { useEffect, useState } from "react";
import { X, Hash } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { readLastHomepageCity } from "@/lib/cityHomepage";

interface HashtagBadge {
  id: string;
  name_fr: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const PanelHashtagsOverlay = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [badges, setBadges] = useState<HashtagBadge[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("badges")
        .select("id, name_fr")
        .like("name_fr", "#%")
        .order("name_fr", { ascending: true });
      setBadges(((data as any[]) || []) as HashtagBadge[]);
    })();
  }, [open]);

  if (!open) return null;

  const goBadge = (badge: HashtagBadge) => {
    const city = readLastHomepageCity() || "Marrakech";
    const sp = new URLSearchParams(location.pathname === "/search" ? location.search : "");
    if (!sp.get("city")) sp.set("city", city);
    sp.set("badgeId", badge.id);
    sp.set("badgeLabel", badge.name_fr);
    sp.delete("openBusiness");
    // Close any previously opened slide panel so it doesn't reappear over the hashtag results.
    try { window.dispatchEvent(new CustomEvent("close-compact-panel")); } catch {}
    navigate(`/search?${sp.toString()}`);
    onClose();
  };



  return (
    <div
      className="absolute inset-0 bg-background flex flex-col bg-no-repeat bg-cover bg-center animate-slide-up-from-bottom"
      style={{ backgroundImage: "url('/hero_magical_realism_v3.jpg')" }}
    >
      


      <div className="relative z-10 shrink-0 grid grid-cols-[auto_1fr_auto] items-center gap-2 px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-9 h-9 rounded-full bg-black hover:bg-black/90 flex items-center justify-center text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center justify-center gap-2">
          <Hash className="h-4 w-4 text-black" />
          <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
            Hashtags
          </h2>
        </div>
        <div className="w-9 h-9" aria-hidden />
      </div>
      <div className="relative z-10 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center gap-4">
          {badges.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => goBadge(b)}
              className="relative inline-flex items-center rounded-full border-2 border-black bg-white/20 text-black hover:bg-white/30 px-4 py-2 text-sm md:px-6 md:py-3 md:text-lg font-semibold transition-all overflow-hidden backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),inset_0_-1px_2px_0_rgba(255,255,255,0.25),0_4px_16px_-4px_rgba(0,0,0,0.3)] before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-br before:from-white/50 before:via-white/10 before:to-white/30 before:pointer-events-none [&>*]:relative [&>*]:z-10"
              title={`Filtrer par ${b.name_fr}`}
            >
              <span>{b.name_fr}</span>
            </button>
          ))}
          {badges.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucun hashtag.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PanelHashtagsOverlay;
