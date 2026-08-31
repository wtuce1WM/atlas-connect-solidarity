/**
 * Réglages de mise en page de la barre "Liquid Glass" du viewer vidéo.
 *
 * Source de vérité UNIQUE partagée par les deux parcours qui montent
 * `PanelSearchBar` en bas du viewer :
 *  - `VideoSlidePanel`      (feed vidéo / HomeVideoSlidePanel)
 *  - `BookOnlineSlidePanel` (fiche business / réservation)
 *
 * Toute divergence visuelle de cette barre doit être corrigée ICI, jamais
 * dans un seul des deux appelants (cf. régression `dockMobileCluster`).
 */
export const VIEWER_BAR_LAYOUT = {
  /** Regroupe les CTAs par blocs (desktop). */
  dockGroups: true,
  /** Mobile : CTAs rapprochés et centrés au lieu d'être collés aux bords. */
  dockMobileCluster: true,
  /** Icônes noires sur le fond clair translucide. */
  iconVariant: "black",
} as const;
