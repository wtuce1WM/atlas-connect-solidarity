import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { optimizeSupabaseImage } from "@/lib/imageOptimization";
import { translateVignetteLabel } from "@/lib/vignetteLabels";
import { useLanguage } from "@/contexts/LanguageContext";

export interface FrontDemoCard {
  key: string;
  videoId: string;
  thumbnail: string | null;
  label: string | null;
  businessName: string | null;
  badgeId: string | null;
  businessId: string | null;
}

/** Villes sources du JSON de cartes géré dans /staff/front (onglet Homepage). */
const CARD_CITIES = ["Marrakech", "Essaouira"];

/**
 * Panneau blanc slide-in depuis la gauche (50% du viewport, desktop) affiché
 * pendant la démo `/front`. Reprend les cartes du snapshot homepage
 * (`homepage_cards_snapshots`), sans toggle de ville : les deux villes sont
 * fusionnées. Un clic relance le feed vidéo du viewer.
 */
const FrontDemoCardsPanel = ({
  open,
  onSelectCard,
  activeCardKey,
  fullWidth = false,
  onClose,
}: {
  open: boolean;
  onSelectCard: (card: FrontDemoCard) => void;
  activeCardKey?: string | null;
  /** Panneau étendu à 100% de la largeur (viewer fermé) */
  fullWidth?: boolean;
  /** Fermeture du panneau (retour à /front) */
  onClose?: () => void;
}) => {
  const { language } = useLanguage();
  const [cards, setCards] = useState<FrontDemoCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("homepage_cards_snapshots")
        .select("city, payload")
        .in("city", CARD_CITIES);
      if (cancelled) return;
      const seen = new Set<string>();
      const list: FrontDemoCard[] = [];
      for (const city of CARD_CITIES) {
        const row = ((data as any[]) || []).find((r) => r.city === city);
        const payload = (row?.payload as any[]) || [];
        payload.forEach((s: any, i: number) => {
          const d = s?.data;
          if (!d?.videoId || !(d.videoUrl || d.thumbnail)) return;
          const videoId = String(d.videoId);
          if (seen.has(videoId)) return;
          seen.add(videoId);
          list.push({
            key: `${city}:${s.key || i}`,
            videoId,
            thumbnail: d.thumbnail ?? null,
            label: d.label ?? null,
            businessName: d.businessName ?? null,
            badgeId: d.badgeId ?? (d.target?.type === "badge" ? d.target.id : null),
            businessId: d.businessId ?? null,
          });
        });
      }
      setCards(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const gridClass = fullWidth
    ? "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    : "grid grid-cols-2 gap-3 lg:grid-cols-3";

  return (
    <div
      data-front-demo-panel
      className={`absolute left-0 top-0 bottom-0 z-30 flex flex-col bg-white transition-[width] duration-500 ${
        fullWidth ? "w-full" : "hidden w-1/2 shadow-[8px_0_40px_rgba(0,0,0,0.35)] md:flex"
      }`}
      style={{ animation: "owmFrontCardsSlideIn 420ms cubic-bezier(.22,1,.36,1) both" }}
      onClick={(e) => e.stopPropagation()}
    >
      <style>{`
        @keyframes owmFrontCardsSlideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {fullWidth && onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-lg"
        >
          <X className="h-6 w-6" />
        </button>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {loading ? (
          <div className={gridClass}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-[9/16] animate-pulse rounded-lg bg-black/5" />
            ))}
          </div>
        ) : (
          <div className={gridClass}>
            {cards.map((c) => {
              const thumb = optimizeSupabaseImage(c.thumbnail, { width: 400 }) || c.thumbnail;
              const isActive = activeCardKey === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onSelectCard(c)}
                  className={`group relative aspect-[9/16] overflow-hidden rounded-lg bg-black/5 text-left transition-transform hover:scale-[1.02] ${
                    isActive ? "ring-2 ring-primary" : ""
                  }`}
                  aria-label={c.label || c.businessName || "Voir les vidéos"}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={c.businessName || c.label || ""}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Play className="h-7 w-7 text-black/30" />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/60 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent" />
                  {c.label && (
                    <span className="pointer-events-none absolute inset-x-0 top-[10%] z-[2] flex justify-center px-2">
                      <span className="rounded-md border-2 border-black bg-white px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-black shadow-lg line-clamp-2">
                        {translateVignetteLabel(c.label, language as any)}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FrontDemoCardsPanel;
