## Objectif

Sur l'onglet IA de `/search`, le carousel `SearchAIVideosCarousel` ne doit apparaître **qu'après que l'utilisateur a affiné** sa demande avec une sous‑catégorie précise (ex : « Villas »), pas dès l'arrivée sur « Marrakech Hébergement » (qui charge les 6 sous‑catégories de l'entrée).

## Changement

Fichier : `src/pages/SearchPage.tsx` (bloc lignes ~3570‑3580)

Condition actuelle :
```ts
if (!effCity || subcategoryNamesFromUrl.length === 0) return null;
```

Nouvelle condition : exiger **exactement une** sous‑catégorie dans l'URL (état affiné), ce qui correspond au comportement attendu : `subcats=Villas` après clic, mais rien quand `subcats=Appartement|Hôtel|Riad|Campings…|Villas|Écolodge` (état initial entrée Hébergement).

```ts
if (!effCity || subcategoryNamesFromUrl.length !== 1) return null;
```

Aucun autre fichier impacté. `SearchAIVideosCarousel` lui‑même reste inchangé.
