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
    sp.set("city", city);
    sp.delete("q");
    sp.delete("spoken");
    sp.set("badgeId", badge.id);
    sp.set("badgeLabel", badge.name_fr);
    sp.delete("openBusiness");
    sp.set("_t", String(Date.now()));
    navigate(`/search?${sp.toString()}`);
    onClose();
  };


  return (
    <div className="absolute inset-0 z-[90] bg-background flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
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
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => goBadge(b)}
              className="inline-flex items-center rounded-full border border-gold/40 bg-gold/10 text-gold hover:bg-gold/20 hover:border-gold/60 px-3 py-1.5 text-xs font-medium transition-colors"
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
