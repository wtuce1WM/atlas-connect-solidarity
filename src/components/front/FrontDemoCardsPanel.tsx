import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { optimizeSupabaseImage } from "@/lib/imageOptimization";
import { translateVignetteLabel } from "@/lib/vignetteLabels";
import { useLanguage } from "@/contexts/LanguageContext";
import { countDiscoveryVideosForCard } from "@/lib/badgeVideoFeed";

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
  /** Nombre réel de vidéos du feed de chaque carte (clé = card.key). */
  const [videoCounts, setVideoCounts] = useState<Record<string, number>>({});

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
      // Comptage réel des vidéos par carte (même périmètre que le feed lancé au clic).
      const counts = await Promise.all(
        list.map(async (c) => [c.key, await countDiscoveryVideosForCard(c)] as const),
      );
      if (cancelled) return;
      setVideoCounts(Object.fromEntries(counts));
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  // Mêmes paramètres responsive que la grille de résultats de /search.
  const gridClass = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div
      data-front-demo-panel
      className={`absolute left-0 top-0 bottom-0 z-30 flex flex-col bg-black transition-[width] duration-500 ${
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
          className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-lg md:h-11 md:w-11 md:left-auto md:right-4"
        >
          <X className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6 scrollbar-hide"
        style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}>
        {loading ? (
          <div className={gridClass}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-white/10" />
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
                  className={`group relative aspect-square overflow-hidden rounded-lg bg-white/10 text-left transition-transform hover:scale-[1.02] ${
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
                      <Play className="h-7 w-7 text-white/40" />
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
                  {(videoCounts[c.key] ?? 0) > 0 && (
                    <span className="pointer-events-none absolute inset-x-0 bottom-2 z-[2] flex justify-center px-2">
                      <span className="rounded-full bg-black/70 px-2.5 py-1 text-center text-[10px] font-semibold text-white shadow">
                        {language === "en"
                          ? `Browse ${videoCounts[c.key]} video${videoCounts[c.key] > 1 ? "s" : ""}`
                          : `Naviguez parmi ${videoCounts[c.key]} vidéo${videoCounts[c.key] > 1 ? "s" : ""}`}
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
