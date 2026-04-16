# Glossaire projet

Termes spécifiques au projet One World Morocco. À utiliser tels quels — ne pas réinterpréter.

## Acronymes

- **KB** — Onglet **Connaissances** du back-office (cette page). Pas "Knowledge Base" générique.
- **BO** — Back-office (`/staff/backoffice`, `/staff/master`).
- **KP** — Regroupement de fiches (Key Partner). Champ `kp_regroupement` sur `businesses`.
- **POI** — Point of Interest. Fiche de type `is_poi = true`.
- **CTA** — Call to action (bouton d'action principal d'une fiche).
- **WTUCE** — Statut de vérification d'une fiche (`wtuce_status`).

## Composants front

- **Slidepanel** — Panneau plein-écran d'une fiche (`BookOnlineSlidePanel.tsx`). Affiche média de fond + cartes flip + overlays.
- **Overlay** — Couche superposée à l'intérieur d'un slidepanel (réservation, vidéo plein écran, document, AI, location, mosaïque…).
- **MediaBackground** — Couche de fond du slidepanel (image / vidéo / matterport). **Doit être isolée.**
- **Toolbar portals** — Boutons (WhatsApp, partage, retour) injectés via `createPortal` dans la toolbar du slidepanel.
- **Flip card** — Cartes interactives au-dessus du média de fond (contact, social, menu, etc.).

## Données

- **min_price / manual_price_range** — Seuls champs autorisés pour le prix de réservation. `gamme_id` est uniquement qualitatif (standing).
- **standing** — Notion qualitative (gamme), distincte du prix réel.
