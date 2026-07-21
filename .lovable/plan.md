# Sélection média par scène (Studio Vidéo IA)

## Objectif
Permettre d'assigner une liste ordonnée d'images/vidéos à chaque scène du scénario (aperçu IA), et pousser cette sélection jusqu'au rendu Remotion.

## Portée fonctionnelle
- Scènes concernées par la sélection : **Hook, Nom & identité, Médias, Offre, Outro**. Les scènes Avis, Horaires, Map, ID numérique, CTA restent gérées par le template (pas de slot média).
- Pour chaque scène éligible : liste ordonnée d'assets (image ou vidéo), avec drag & drop, ajout depuis les grilles Images/Vidéos de l'établissement, retrait, réordonnancement.
- La sélection globale actuelle (checkboxes sur les grilles) reste utilisable comme fallback : si aucune scène ne définit son propre média, on retombe sur la sélection globale (comportement actuel préservé).

## Impact rendu
- Nouveau champ `template_props.scene_media` : `Array<{ scene_id: string; kind: 'hook'|'name'|'media'|'offer'|'outro'; urls: string[] }>`.
- `video-scenario-generate` : accepte `scene_media` dans le body, valide que chaque URL appartient bien aux médias autorisés de l'établissement, l'écrit dans `template_props`. En mode `preview_only`, renvoyé tel quel dans la réponse.
- `remotion/src/BusinessShowcase.tsx` : si `scene_media` présent, remplace la logique globale scène par scène (Hook utilise `hook.urls`, Offre utilise `offer.urls` en fond, etc.). Sinon, comportement actuel.
- Templates dédiés (Comptoir Darna, Riad Dar Najat, etc.) : hors scope pour cette itération. `scene_media` s'applique uniquement à `business-showcase` et `corporate-vertical`.

## UI
- Dans `StudioVideoScenarioPanel`, chaque carte de scène éligible affiche :
  - une bande horizontale des médias assignés (thumbnails + badge kind + croix retrait) ;
  - un bouton "+ Ajouter média" ouvrant un popover avec la grille des images + vidéos disponibles (celles déjà chargées côté StudioVideo) ;
  - drag & drop réordonne (dnd-kit, déjà présent).
- État `sceneMedia: Record<sceneId, string[]>` géré dans `StudioVideo.tsx`, propagé au panneau via props.
- Quand l'IA renvoie un `scene_media` en `preview_only`, on l'hydrate dans cet état pour permettre l'édition avant génération.
- Les grilles Images/Vidéos existantes montrent maintenant un badge "Assigné à N scène(s)" quand l'asset est utilisé quelque part.

## Fichiers touchés
1. `src/components/StudioVideoScenarioPanel.tsx` — nouveau slot média par scène, popover picker, dnd, callbacks.
2. `src/pages/StudioVideo.tsx` — état `sceneMedia`, propagation, ajout à la payload de `previewScenario` et `submit`, hydratation depuis la réponse IA.
3. `supabase/functions/video-scenario-generate/index.ts` — validation + passthrough de `scene_media` dans `template_props`.
4. `remotion/src/BusinessShowcase.tsx` — consommation de `template_props.scene_media` scène par scène, fallback sur logique actuelle.

## Hors scope
- Templates Remotion dédiés (établissements pinnés) — ils ont déjà leur propre structure figée.
- Découpage temporel intra-scène (durée par asset) — la scène garde sa durée totale, les assets se répartissent uniformément.
- Persistance en base d'un "plan de montage" réutilisable — la sélection vit dans le job seulement.
