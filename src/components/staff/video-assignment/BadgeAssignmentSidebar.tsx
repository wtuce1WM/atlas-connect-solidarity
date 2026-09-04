import {
  InlineBadgeSubcatCityAssignment,
  InlineDestinationCityAssignment,
  InlinePoiAssignment,
  type AssignmentSource,
} from "./VideoAssignmentPanels";

export type SidebarMode = "tags" | "poi" | "dest";

/**
 * Panneau droit partagé (mécanisme de l'onglet Génériques) :
 * Badges & Villes, Affectation POI ou Destinations & Villes selon `mode`,
 * fermeture automatique après sauvegarde via `onSaved`.
 */
export const BadgeAssignmentSidebar = ({
  source,
  video,
  mode = "tags",
  onClose,
  onSaved,
}: {
  source: AssignmentSource;
  video: { id: string; url: string; name: string | null; thumbnail_url: string | null; city: string | null };
  mode?: SidebarMode;
  onClose: () => void;
  onSaved: () => void;
}) => (
  <div className="w-1/2 shrink-0 sticky top-24 h-[calc(100vh-7rem)] overflow-hidden border-l bg-card rounded-lg">
    {mode === "poi" ? (
      <InlinePoiAssignment source={source} video={video} onClose={onClose} onSaved={onSaved} />
    ) : mode === "dest" ? (
      <InlineDestinationCityAssignment source={source} video={video} onClose={onClose} onSaved={onSaved} />
    ) : (
      <InlineBadgeSubcatCityAssignment source={source} video={video} onClose={onClose} onSaved={onSaved} />
    )}
  </div>
);

/** Halo vert « dernière vidéo modifiée » (identique à l'onglet Badgées). */
export const justModifiedCardClass =
  "ring-[6px] ring-emerald-500 border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.35),0_0_28px_8px_rgba(16,185,129,0.55)] animate-pulse";

export const JustModifiedBanner = () => (
  <div className="absolute inset-x-0 top-0 z-30 bg-emerald-500 text-white text-[13px] font-extrabold tracking-wide text-center py-1.5 shadow-md rounded-t-lg">
    ✓ MODIFIÉE À L'INSTANT
  </div>
);
