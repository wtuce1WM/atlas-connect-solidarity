# Fusion `SlidePanelHome` → `BookOnlineSlidePanel`

Scénario **B** validé : on supprime `SlidePanelHome` (~1064 lignes + son wrapper `HomeVideoSlidePanel`). On garde `DestinationSlidePanel` (table `destinations` distincte, déjà importée par Book).

## Constat clé (avant de planifier les étapes)

Les deux panels n'ont **pas la même clé d'entrée** :

| | `BookOnlineSlidePanel` | `SlidePanelHome` |
|---|---|---|
| Clé d'entrée | `businessId` (obligatoire) | `videoUrl` + `videoId` + `owner?` |
| Cas couverts | 1 fiche business | vidéo business, vidéo "sociale" (pas de business), événement (`eventId`), agenda ville, document/POI (`pageBusinessId`) |

Donc « fusion » = élargir Book pour accepter une **entrée vidéo** quand il n'y a pas (encore) de `businessId`, sans alourdir le composant. C'est plus qu'un simple renommage de props.

## Approche

Pour rester **minimal et direct** :

1. Étendre l'API de `BookOnlineSlidePanel` avec un bloc de props vidéo optionnel (ré-export des champs vidéo de SlidePanelHome) :
   - `videoUrl?`, `videoId?`, `isGeneric?`, `owner?`, `social?`, `showSocialBadge?`, `description?`, `videoName?`, `eventId?`, `agendaCity?`, `pageBusinessName?`, `pageBusinessId?`, `compactBusinessHeader?`, `returnContext?`.
   - Renommer (alias) les props de nav existantes Book pour matcher Home : ajouter `onPrev/onNext/hasPrev/hasNext` comme alias de `onPrevBusiness/...` (les deux acceptés le temps de migrer).
   - Rendre `businessId` optionnel : si absent → résoudre via `owner?.id` ou `pageBusinessId`, sinon mode "vidéo seule" (pas de carte booking).

2. Réintégrer dans Book les **sous-blocs propres à Home** non présents dans Book :
   - rendu Agenda (`agendaCity`)
   - rendu Event (`eventId` → fiche événement)
   - badge social / owner quand pas de business résolu
   - header compact (déjà présent dans `BusinessHeader` via `compact`)
   - `returnContext` (sérialisation/restauration du contexte Test/Home)

   Extraire ces sous-blocs depuis `SlidePanelHome` vers de petits composants `slidepanel/` (`AgendaCard`, `EventCard`, `SocialBadgeCard`, etc.) plutôt que de copier-coller dans Book. Book les conditionne sur la présence des props.

3. Migrer les 5 appelants vers `BookOnlineSlidePanel`, un par un :
   - `src/components/home/HomeVideoSlidePanel.tsx` (wrapper Home)
   - `src/components/HomepageCardsFront.tsx`
   - `src/components/SearchAIVideosCarousel.tsx`
   - `src/pages/search/YouTubeChannelsTabContent.tsx`
   - `src/pages/search/HashtagTabContent.tsx`

   Chaque migration = renommage d'import + passage des mêmes props (l'API étant un sur-ensemble).

4. Supprimer `src/components/SlidePanelHome.tsx`. Garder ou supprimer `HomeVideoSlidePanel` selon usage final (la logique prev/next y est utile, elle reste).

5. Vérifications :
   - Recherche `rg "SlidePanelHome"` doit ne renvoyer que des commentaires.
   - Build TS clean.
   - Test manuel ciblé : Home (lecture vidéo + prev/next + retour depuis fiche), Test/AI carousel, YouTube tab, Hashtag tab, HomepageCardsFront ("En savoir +").

## Détails techniques

- **Pas de mode-switch (`mode="home"|"booking"`)** : on garde une API unique pilotée par la présence/absence de props. C'est ce qui évite la prolifération de `if (mode === ...)` dans un fichier déjà à 2815 lignes.
- **Taille cible Book** après fusion : ~3200-3500 lignes (vs 2815 + 1064 aujourd'hui répartis). Le gain réel vient des sous-composants extraits + suppression des duplications (header, media background, URL cosmétique, swipe, flèches desktop, hooks vidéo).
- **URL cosmétique** : déjà OK côté Book (`/fiche/:slug`). Pour les vidéos sans business (`owner` social pur), pas de rewrite — comportement Home actuel.
- **`returnContext`** : Book n'en a pas besoin aujourd'hui mais doit le propager au CTA "En savoir +" comme le fait SlidePanelHome (sessionStorage `returnTo`).
- **Risques** :
  - Régression sur la lecture vidéo "sociale" (pas de business) si la résolution `businessId` n'est pas bien court-circuitée.
  - Tabs YouTube/Hashtag utilisent `compactBusinessHeader` → vérifier que Book le branche bien sur `BusinessHeader compact`.
  - Le `useBookOnlineData` hook ne doit pas être appelé si `businessId` est absent.

## Découpage en commits suggérés

```text
1. Étendre l'API BookOnlineSlidePanel (props vidéo + alias nav)
2. Extraire AgendaCard / EventCard / SocialBadgeCard depuis SlidePanelHome
3. Brancher ces sous-composants + mode "vidéo seule" dans Book
4. Migrer HomeVideoSlidePanel → Book
5. Migrer HomepageCardsFront → Book
6. Migrer SearchAIVideosCarousel → Book
7. Migrer YouTubeChannelsTabContent + HashtagTabContent → Book
8. Supprimer SlidePanelHome.tsx, nettoyer imports/commentaires
```

Chaque commit est testable indépendamment. Stop possible après n'importe quelle étape sans casser le build.
