# Plan : enrichir DestinationBusinessesPanel

Garder `DestinationBusinessesPanel.tsx` comme **seul** fichier à modifier (pas de refacto de BookOnlineSlidePanel). On porte uniquement la **présentation** visuelle, pas la logique business.

## Ce qu'on ajoute (inspiré de BookOnlineSlidePanel)

1. **Média plein écran en fond** (image courante) au lieu du carrousel en haut
   - Image en `absolute inset-0 object-cover`
   - Dégradé sombre au bas pour lisibilité du contenu
   - Flèches précédent/suivant si plusieurs images
   - Compteur "x / N" + bouton "Voir les N photos" en bas à gauche
   - Clic ouvre `FullscreenLightbox`

2. **Bouton fullscreen / expand** (déjà présent → on garde)

3. **Header overlay transparent** : nom de la destination + région en superposition (style BookOnlineSlidePanel, fond noir translucide), au lieu du titre dans le flux

4. **Cluster de CTAs ronds en bas** (style identique à BookOnlineSlidePanel lignes 880-985, fond `bg-black/80 backdrop-blur` + label au hover) :
   - **Itinéraire** (icône `Navigation`) → ouvre Google Maps depuis lat/lng de la destination, ou `DirectionsOverlay` si tu préfères
   - **Localisation** (icône `MapPin`) → mini carte de la destination (overlay)
   - **Images** (icône `ImageIcon`) → ouvre lightbox plein écran
   - Le CTA Itinéraire est placé **au-dessus** du rang des autres boutons ronds, comme demandé

5. **Bloc Description** : conservé tel quel, dans un panneau scrollable par-dessus le média

6. **Bloc Prestataires** : conservé tel quel (grille de vignettes business existante)

## Ce qu'on **n'ajoute pas** (exclu explicitement)
- CTA Langues
- CTA Horaires
- CTA Disponibilité
- Badge ouvert / fermé
- Tous les CTAs business spécifiques (Réserver, Shop, WhatsApp, Appeler, Avis, Spotify, YouTube, KP, POI, etc.)
- Navigation prev/next entre destinations (pas demandé)

## Détails techniques

- Fichier touché : `src/components/DestinationBusinessesPanel.tsx` uniquement
- Pas de modif de `BookOnlineSlidePanel.tsx`, `DestinationsTabContent.tsx`, ni du back-end
- Réutilisation directe des composants existants : `FullscreenLightbox`, `SlidePanelHeader`, `BookmarkButton`, icônes `lucide-react`
- Pour Itinéraire : ouverture d'un lien `https://www.google.com/maps/dir/?api=1&destination=lat,lng` dans un nouvel onglet (solution minimale, sans dépendre de `DirectionsOverlay` qui attend un objet `business`)
- Layout général repris de BookOnlineSlidePanel : média plein conteneur + contenu scrollable par-dessus avec gradient

## Hors scope
- Aucune modif de schéma DB
- Aucune logique métier
- Aucun changement sur les autres onglets de Search

Une fois ce plan validé, j'implémente en une seule passe sur `DestinationBusinessesPanel.tsx`.
