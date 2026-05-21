# Refonte homepage façon Mindtrip + déplacement vers /videos

## Objectif
- Remplacer la homepage actuelle (page "Home" = mur de vidéos) par une page d'accueil éditoriale inspirée de https://mindtrip.ai/home, adaptée à ONE WORLD MOROCCO.
- Conserver intégralement la homepage actuelle, accessible à `/videos`.

## Routage
- `/` → nouvelle page `HomeMindtrip.tsx`
- `/videos` → page actuelle (composant `Home.tsx`, déjà utilisé via `Test`)
- `/test` reste tel quel (alias dev), pour éviter de casser des liens internes
- Mettre à jour `GlobalFloatingSearchBar` et `FloatingButtonsGuard` dans `App.tsx` pour traiter `/videos` comme l'actuel `/test` (cacher la search bar flottante, cacher le bouton Club)

## Nouvelle page d'accueil (`src/pages/HomeMindtrip.tsx`)
Structure inspirée de Mindtrip, adaptée Maroc/ONE WORLD MOROCCO :

1. **Hero plein écran**
   - Visuel hero (on réutilise `hero_v3_riad_logo.jpg` déjà validé ou une variante — à confirmer)
   - Titre éditorial type "Voyagez autrement au Maroc."
   - Sous-titre court
   - 2 CTA : "Explorer les vidéos" (→ `/videos`) et "Découvrir nos adresses" (→ `/search`)
   - Flèche "Découvrir" qui scroll vers la section suivante

2. **Section "Comment ça marche"** (4 blocs alternés image/texte, façon Mindtrip)
   - Inspiration par les vidéos
   - Adresses vérifiées
   - Itinéraires personnalisés
   - Réservation simplifiée

3. **Section "Nouveautés"** (3-4 cartes : Événements, Hôtels, Restaurants, Expériences) avec lien "Découvrir"

4. **Section "Tout ce qu'il faut pour votre prochain voyage"** (grille de modules : Hôtels, Restaurants, Activités, Tours, Vols)

5. **Section "Inspirez-vous"** — destinations populaires (Marrakech, Essaouira, etc.), cartes cliquables vers `/destination/...`

6. **Section "Devenez ambassadeur"** (lien `/devenir-affilie`)

7. **Footer** existant (`<Footer variant="verified" />`)

Charte visuelle : tokens existants (Josefin Sans / Roboto, Terracotta, fond crème), pas de couleurs en dur. Animations légères au scroll (fade/translate) via Tailwind/Motion.

## Détails techniques
- Nouveau fichier `src/pages/HomeMindtrip.tsx` + sous-composants `src/components/homeMindtrip/` (Hero, HowItWorks, NewSection, Toolkit, Inspiration, AmbassadorCTA)
- `src/App.tsx` :
  - Importer `HomeMindtrip` en lazy
  - `path="/"` → `HomeMindtrip`
  - Ajouter `path="/videos"` → `Test` (= `Home`)
  - Étendre `hiddenPaths` et la logique `FloatingButtonsGuard` pour inclure `/videos`
- SEO via `useSEO` : titre + meta dédiés à la nouvelle home
- Liens internes : remplacer les éventuels `to="/"` qui pointaient vers le mur de vidéos par `to="/videos"` (à auditer ; sinon laisser et utiliser le bouton Hero)
- Aucune modif backend, aucune migration, aucune touche à la logique métier `Home.tsx`

## Hors scope
- Pas de refonte des sections internes du mur de vidéos
- Pas de nouvelles intégrations (AI chat, etc.) — on reste sur des CTA qui pointent vers les pages existantes
- Pas de redirection 301 serveur : `/` affiche désormais la nouvelle home, l'ancienne reste vivante à `/videos`

## Question rapide avant de coder
Le hero : on part sur `hero_v3_riad_logo.jpg` (validé), ou tu veux qu'on génère un nouveau visuel hero pensé spécifiquement pour cette home (composition plus large, plus de respiration à gauche pour le texte) ?
