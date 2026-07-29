## Diagnostic — cause racine

Les 5 options sont bien envoyées par le client `StudioVideo.tsx` et parfois traduites en props par `video-scenario-generate/index.ts`, mais **la template Remotion `BusinessShowcase.tsx` ne connaît pas ces scènes**. Résultat : le serveur pose `showPopup`, `highlights`, `showGoogleReviews`, etc. dans `template_props`, mais Remotion les ignore silencieusement au rendu.

Détail par point :

| Défaillance | Où ça casse |
|---|---|
| Média de fond « Ouverture logo » | `ALLOWED_KINDS` (edge fn L.476) exclut `"logo"` → `scene_media.logo` filtré côté serveur. `SceneLogo` (Remotion L.972) ne prend même pas de prop `background`. |
| Découper le texte en X étapes | Client envoie `text_splits`. Serveur ne lit jamais cette clé. Aucun prop `splitCount` côté Remotion. |
| Popup ignoré | Serveur pose `showPopup` + `popupImageUrl` mais aucune `SceneKind = "popup"` dans Remotion. |
| Blocs highlights ignorés | Serveur pose `template_props.highlights` mais aucune scène côté Remotion. |
| Avis Google / TripAdvisor / Témoignage client ignorés | Serveur pose `showGoogleReviews`, `showTripAdvisor`, `showCustomerReview` et leurs payloads, mais aucune scène dédiée dans Remotion (seule la scène `reviews` générique existe). |

## Plan d'implémentation

### 1. `remotion/src/BusinessShowcase.tsx` — ajouter les scènes manquantes
- Étendre `SceneKind` avec : `popup`, `highlight`, `google_reviews`, `tripadvisor`, `restaurant_guru`, `customer_review`, `whatsapp`.
- Ajouter les props correspondantes (`showPopup`, `popupImageUrl`, `highlights[]`, `googleReview`, `tripAdvisor`, `restaurantGuru`, `customerReview`, `showWhatsapp`, `whatsappNumber`).
- Créer les composants scènes :
  - `ScenePopup` : image popup plein cadre + overlay titre/texte.
  - `SceneHighlight` : une scène par bloc (title, description, image_url, metric).
  - `SceneGoogleReviews` / `SceneTripAdvisor` / `SceneRestaurantGuru` : logo plateforme + note + nombre d'avis.
  - `SceneCustomerReview` : témoignage encadré (auteur, note, texte highlight).
  - `SceneWhatsapp` : logo #25D366 + numéro cliquable animé.
- Étendre `isSceneActive`, `defaultSceneFrames`, `DEFAULT_SCENE_ORDER` et `buildScenePlan` pour émettre une entrée par highlight (comme les offres multiples).
- **Média de fond logo** : `SceneLogo` accepte un `background?: { url; kind }` optionnel tiré de `scene_media.logo?.[0]`.
- **Découpage texte** : ajouter prop `splitCount` — la scène `media` (montage vidéos/images) découpe la description du hook / tagline en `splitCount` cartons synchronisés avec le nombre de clips.

### 2. `supabase/functions/video-scenario-generate/index.ts` — brancher les options
- Ajouter `"logo"` à `ALLOWED_KINDS` (L.476) pour laisser passer `scene_media.logo`.
- Lire `options.text_splits` (entier 1–10) → `template_props.splitCount`.
- Ajouter aux `ALLOWED_SCENE_KINDS` (L.551) : `popup`, `highlight`, `google_reviews`, `tripadvisor`, `restaurant_guru`, `customer_review`.
- Auto-injection dans `scene_order` par défaut quand :
  - `showPopup` → insérer `popup` après `logo`
  - `highlights.length > 0` → insérer autant d'entrées `highlight` après `media`
  - `showGoogleReviews` / `showTripAdvisor` / `showRestaurantGuru` / `showCustomerReview` → insérer avant `hours`
  - `showWhatsapp` → insérer avant `cta`
- Ne pas casser un `scene_order` explicite envoyé par le client (l'utilisateur peut ré-ordonner dans l'aperçu).

### 3. `src/pages/StudioVideo.tsx` + `StudioVideoScenarioPanel.tsx` — refléter dans l'aperçu
- Injecter les nouvelles scènes dans la prévisualisation client (le tableau `scenes` construit avant `Prévisualiser le scénario`).
- Ajouter les icônes/labels correspondants.
- S'assurer que la signature de staleness inclut `optPopup`, `selectedHighlightIds`, `optGoogleReviews`, etc. (probablement déjà OK, à vérifier).

### 4. Vérification
- Rendre un job avec toutes les options cochées sur Riad Dar Najat (popup + 2 highlights + Google + TripAdvisor + témoignage + logo transparent avec vidéo de fond + `text_splits=3`).
- Contrôler dans `template_props` (via `video_jobs`) que tous les champs remontent.
- Vérifier le rendu final MP4 : logo avec fond vidéo, popup, 2 scènes highlights, 3 scènes plateformes d'avis, témoignage.

## Points techniques

- **Ordre par défaut proposé** : `logo → popup → hook → name → media → highlight×N → offer×N → reviews → google_reviews → tripadvisor → restaurant_guru → customer_review → hours → map → digital → whatsapp → cta → outro`.
- **Durées par défaut** : `popup` = 120f, `highlight` = 140f, plateformes d'avis = 120f, `customer_review` = 180f, `whatsapp` = 120f.
- **Découpage texte** : si `splitCount=N` et la scène `media` a M clips, on répartit le hook/description en N segments et on affiche 1 segment par tranche de `duration/N` frames, indépendamment du nombre de clips.
- **Fallback logo background** : si `scene_media.logo[0]` est une vidéo → `<Video>` en fond avec overlay ; sinon image ; sinon fond de marque actuel.
- Aucun changement de schéma DB.

Ampleur estimée : ~600 lignes de code Remotion (nouvelles scènes), ~40 lignes serveur, ~80 lignes client. Pas de dépendance externe.

Je pars là-dessus ?