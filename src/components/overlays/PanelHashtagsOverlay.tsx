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
    navigate(`/search?${sp.toString()}`);
    onClose();
  };


  return (
    <div
      className="fixed inset-y-0 right-0 w-full lg:w-1/2 z-[230] lg:bg-background flex flex-col bg-no-repeat bg-cover bg-center lg:bg-none"
      style={{ backgroundImage: "url('/hero_magical_realism_v3.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/40 lg:hidden pointer-events-none" />


      <div className="relative z-10 shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-gold" />
          <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
            Hashtags
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative z-10 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center gap-2">
          {badges.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => goBadge(b)}
              className="inline-flex items-center rounded-full border border-white bg-white text-black hover:bg-white/90 px-3 py-1.5 text-xs font-medium transition-colors"
              title={`Filtrer par ${b.name_fr}`}
            >
              {b.name_fr}
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
