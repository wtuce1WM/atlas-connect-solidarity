---
name: Template vidéo « feed in-app »
description: Pipeline réutilisable capture Playwright + manifest + composition Remotion pour générer une vidéo de feed /search en 720x1280 ou 1280x720
type: feature
---

Template de montage des vidéos internes de feed (issu du calibrage « Riads à Marrakech » v4). Aucun calibrage ne doit être refait à la main.

**Chaîne :**
1. `remotion/capture/capture_feed.py --url <URL /search> --slug <slug> --steps 6`
   Capture Playwright en viewport 720x1280 : popup fermé, labels du rail de CTA masqués (icônes gardées), UI détourée en alpha par 2 passes (fond noir + fond blanc), frames des MP4 internes extraites par ffmpeg, overlay Full Description stitché depuis des bandes scrollées réelles. Les positions des sections d'arrêt (Avis clients, Vidéos, Assistant IA, À proximité) sont **mesurées dans le DOM**, jamais en pixels codés.
2. Sortie : `remotion/public/feed/<slug>/` + `manifest.json` (viewport, fps, étapes + frameCount, headerHeight/viewHeight/contentHeight de l'overlay, sections, bloc `timing`).
3. Rendu : `FEED_MANIFEST=feed/<slug>/manifest.json FEED_FORMAT=portrait|landscape OUT=... node remotion/scripts/render-feed-template.mjs`

**Composition :** `remotion/src/FeedTemplate.tsx`, compositions `feed-template` (portrait natif) et `feed-template-landscape` (1280x720 : stage portrait mis à l'échelle et centré sur un fond = frame vidéo courante floutée). Durée et dimensions calculées par `calculateMetadata` depuis le manifest.

**Rythme** : réglable via `timing` du manifest (temps par étape, pause hook, move/pause par section) sans toucher au code.

`FeedSwipe.tsx` (v1-v4) est conservé comme référence historique mais gelé : toute nouvelle vidéo passe par le template.

**Déclenchement back-office :** `/staff/backoffice/videos` → onglet **Générer** (`VideoGeneratePanel.tsx`) : URL /search + titre/slug + format + nb de fiches + temps par fiche + durée fiche détaillée + pauses (hook, section) + sections d'arrêt. Insertion dans `video_jobs` avec `template_id = feed-template | feed-template-landscape` et `template_props.kind = "feed"`, puis `trigger-render-workflow`. `remotion/scripts/render-job.mjs` lance `capture/capture_feed.py` (avant le bundling), patche `manifest.timing` avec les valeurs du back-office, puis rend la composition correspondante.

**Corporate :** le mode « Explicative (affiliés) » a été fusionné dans le mode **Corporate** (étapes migrées en base). Édition : onglet Scénario, mode Corporate. Génération : Studio Vidéo IA en mode corporate.
