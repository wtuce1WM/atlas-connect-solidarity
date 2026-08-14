# Briefing : Scénario manuel 180s dans `staff/backoffice/videos`

## Où on en est

Dans **Backoffice > Vidéos > Promo business (assets de la fiche)**, l'utilisateur peut déjà :

- Choisir un établissement actif (autocomplete sur nom / slug / URL 1WM).
- Sélectionner des blocs et leurs durées :
  - **Hook** (titre + ville + logo)
  - **Vidéo** (asset vidéo de la fiche)
  - **Photos** (jusqu'à 4 images de la fiche)
  - **Outro** (logo + tagline/ville)
- Rédiger un **Texte enrichi (Rich Text, 500 caractères max)** qui s'affiche en surimpression continue sur les plans Vidéo et Photos.
- Choisir un format :
  - `portrait` (1080×1920)
  - `landscape` (1920×1080)
  - `mockup` (téléphone centré sur fond uni)
- Choisir une variante `fullscreen` ou `mockup`.
- Activer un **fond feed animé** (capture `/search` passée en `bgFeedManifest`).

Le rendu est assuré par `remotion/scripts/render-job.mjs` exécuté via GitHub Actions, avec purge du dossier `public/feed` entre chaque job pour éviter les médias résiduels.

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/components/staff/VideoPromoPanel.tsx` | UI du backoffice Promo business |
| `remotion/src/BusinessPromo.tsx` | Composition Remotion principale |
| `remotion/src/promo/PromoLogo.tsx` | Animation du logo transparent |
| `remotion/src/promo/FeedBackdrop.tsx` | Fond feed animé |
| `remotion/scripts/render-job.mjs` | Orchestration du rendu GitHub Actions |

## Ce qu'on prévoit de coder maintenant

Permettre à l'utilisateur de **construire manuellement un scénario long (jusqu'à ~180s)** dans Promo business, en s'inspirant du scénario Claude « Chaabi Payment 180s ».

### Objectif

Passer d'un montage automatique à 4 blocs fixes à un montage **séquencé manuellement** avec des sections typées, tout en restant dans le pipeline `BusinessPromo` existant.

### Sections envisagées

1. **Intro / Hook** — logo + accroche + ville (existe déjà).
2. **Vidéo plein écran** — asset vidéo de la fiche (existe déjà).
3. **Photos plein écran** — 1 à N photos (existe déjà).
4. **Texte surimpression** — Rich Text continu sur Vidéo + Photos (existe déjà, 500 caractères).
5. **Compteur / chiffre clé** — animation d'un chiffre (ex. "+30%", "12 expériences").
6. **Carte / localisation** — révélation géographique (Marrakech → établissement).
7. **Split-screen** — média + texte côte à côte.
8. **Logo-merge / signature** — transition vers le logo final.
9. **Outro** — logo + tagline (existe déjà).

### Contraintes techniques

- **Résolution max : 1080p**.
  - Paysage : 1920×1080 (grand côté = 1920 px).
  - Portrait : 1080×1920.
- Pendant le développement, on testera probablement en **résolution réduite** (960×540 ou 1280×720) pour itérer vite.
- **Pas de 4K** sans ré-évaluation explicite du coût/rendu.
- **Plafond de clips** à définir pour éviter un backoffice ingérable et un rendu GitHub Actions trop long.
- Réutiliser la grammaire motion existante (PromoLogo, FeedBackdrop, polices Montserrat/Avenir).
- Les effets Remotion optionnels (`@remotion/paths`, `@remotion/noise`, `@remotion/motion-blur`, etc.) doivent rester **des toggles dans le manifeste**, jamais hard-codés.

## Questions à arbitrer avec Claude / ChatGPT

1. **Structure de données** : est-ce qu'on étend `video_scenario_steps` (déjà utilisé par Studio Vidéo) ou on crée une table dédiée `promo_scenario_steps` ?
2. **UI backoffice** : timeline verticale type "storyboard" avec drag-and-drop, ou formulaire section par section ?
3. **Limites** : nombre max de sections ? durée max par section ? durée totale max ?
4. **Médias** : autoriser l'upload de médias additionnels (autres que les assets de la fiche) ou se limiter strictement aux assets 1WM ?
5. **Voix-off / synthèse** : un scénario de 180s nécessite-t-il de la synthèse vocale (ElevenLabs) pour rester engageant ? Si oui, comment la gérer dans le manifeste ?
6. **Template vs scénario auteur** : le scénario Claude ressemble plus à un film "auteur" qu'à un template paramétrique. Faut-il vraiment le faire rentrer dans "Promo business", ou créer un nouveau template "Corporate Long" à côté ?

## Prochaine étape immédiate

Ne pas coder tout de suite. D'abord soumettre ce briefing à Claude et ChatGPT pour valider l'architecture avant d'implémenter.
