import { useNavigate } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import type { SearchResultBusiness } from "@/components/SearchResultCard";
import type { City } from "@/lib/homeHelpers";

interface Props {
  badgeView: { badgeId: string; label: string; city: City };
  businesses: SearchResultBusiness[];
  loading: boolean;
  onClose: () => void;
}

/**
 * Grid that lists businesses linked to a clicked badge from the homepage.
 * Pure presentational component extracted from Home.tsx.
 */
const BadgeBusinessesGrid = ({ badgeView, businesses, loading, onClose }: Props) => {
  const navigate = useLocalizedNavigate();

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">
          {badgeView.label} — {badgeView.city} ({businesses.length})
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Fermer ×
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : businesses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun établissement trouvé.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {businesses.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => navigate(`/fiche/${(b as any).slug || b.id}`)}
              className="text-left rounded-lg overflow-hidden bg-card border border-border hover:border-primary transition-colors"
            >
              <div className="relative aspect-video bg-muted overflow-hidden">
                {(b.images && b.images[0]) ? (
                  <img src={b.images[0]} alt={b.name} className="w-full h-full object-cover" loading="lazy" />
                ) : null}
                {/* Gradient overlay for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                {/* Centered logo */}
                {(b as any).logo_url && (
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center px-2 pointer-events-none">
                    <img
                      src={(b as any).logo_url}
                      alt={b.name}
                      className="max-w-[80px] max-h-[56px] w-auto h-auto object-contain"
                      style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5))" }}
                    />
                  </div>
                )}
                {/* Bottom name + neighborhood overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-1.5 space-y-0.5 pointer-events-none">
                  <p
                    className="text-xs font-semibold text-white line-clamp-1"
                    style={{ fontFamily: "'Montserrat', sans-serif", filter: "drop-shadow(0 1px 3px hsla(0,0%,0%,0.9))" }}
                  >
                    {b.name}
                  </p>
                  {b.neighborhood && (
                    <p
                      className="text-[10px] text-white/85 line-clamp-1"
                      style={{ filter: "drop-shadow(0 1px 2px hsla(0,0%,0%,0.9))" }}
                    >
                      {b.neighborhood}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BadgeBusinessesGrid;
