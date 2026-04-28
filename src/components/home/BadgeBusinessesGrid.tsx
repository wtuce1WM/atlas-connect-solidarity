import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  return (
    <div className="mt-6">
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
              <div className="aspect-video bg-muted overflow-hidden">
                {(b.images && b.images[0]) ? (
                  <img src={b.images[0]} alt={b.name} className="w-full h-full object-cover" loading="lazy" />
                ) : null}
              </div>
              <div className="p-2">
                <p className="text-sm font-medium line-clamp-1">{b.name}</p>
                {b.neighborhood && <p className="text-xs text-muted-foreground line-clamp-1">{b.neighborhood}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BadgeBusinessesGrid;
