Plan : finaliser la matrice IA (club / embed / search)

## État de départ

Les 3 surfaces IA existent mais ne sont pas sur un moteur unique :

| Surface | Backend | Moteur A/B/C | Suggestions curées | Taxonomie | Transport |
|---|---|---|---|---|---|
| /club | club-ai-chat | partiel (classifier rescue) | club_ai_suggestions + club_ai_followups | oui | custom SSE |
| /embed/ask | embed-ai-chat | partiel (classifier route) | embed_ai_suggestions + embed_ai_followups | oui | AI SDK useChat |
| /search IA | ai-search-answer | non | aucune table dédiée | non | functions.invoke non-streaming |

Le moteur A/B/C (`_shared/ai-engine/router.ts`, `respond.ts`, `routes/*.ts`) est prêt mais importé par aucune fonction live. `surfaces.ts` définit déjà `search` mais il est inutilisé.

## Direction

1. Uniformiser d'abord les données et le backoffice.
2. Brancher le moteur sur la surface la plus simple : Search IA.
3. Migrer progressivement Embed et Club vers le moteur, route par route, sans casser les flux actuels.

Les 3 livrables sont indépendants : on peut s'arrêter après chaque validation.

## Livrable 1 : données + backoffice

### Schéma
- Créer `search_ai_suggestions` et `search_ai_followups` en miroir de `club_ai_suggestions` / `club_ai_followups` avec colonnes de taxonomie :
  - `category`, `city`, `badge_ids`, `subcategory_ids`, `destination_ids`, `business_ids`, `blog_post_ids`
  - `fixed_response_fr/en/ar` pour les réponses de classe A sans appel LLM
  - `mode`, `radius_km`, `enabled`, `order_index`
- Ajouter les colonnes de taxonomie manquantes à `club_ai_followups` et `embed_ai_followups` (aujourd'hui ils n'ont que `label`, `mode`, `radius_km`).
- Migration de données : copier les suggestions existantes avec `category` hérité de `club_ai_suggestions.category` quand elle est renseignée ; `embed_ai_followups` restent génériques tant qu'ils n'ont pas été re-tagués.

### Backoffice
- Dans `StaffIA.tsx`, ajouter un onglet "Search" à côté de "Club" et "Embed" avec :
  - `SearchAiSuggestionsManagement` (CRUD + filtres catégorie/ville)
  - `SearchAiFollowupsManagement` (CRUD + filtres catégorie/ville)
- Étendre `ClubAiFollowupsManagement` et `EmbedAiFollowupsManagement` pour éditer les champs de taxonomie.
- Ajouter un sélecteur de catégorie/badge/sous-catégorie/destination dans les formulaires de suggestion et de relance pour les 3 surfaces.

### Validation
- Les 3 tables de suggestions ont la même structure taxonomique.
- Les 3 tables de followups ont la même structure taxonomique.
- Le backoffice permet de gérer Search et de taguer les relances par catégorie.

## Livrable 2 : moteur A/B/C sur Search IA

### Refactor de `ai-search-answer`
- Remplacer la logique `ai_config.model` / `pro_model` et `COMPLEX_RE` par le moteur :
  - `EngineRequest.surface = "search"`
  - `curatedRoute` = code de la suggestion cliquée (classe A, zéro token)
  - sinon appel à `route()` puis `routes/*.ts` ou `generate()` classe C
- Supprimer le double mécanisme de sélection de modèle : un seul modèle (`AI_MODEL` via `surfaces.ts`), le levier de coût est la classe A/B/C.
- Conserver le rendu Markdown actuel de `AISuggestionCard` ; le résultat du moteur reste du texte.

### Routes utiles pour Search
- `discover` → recherche d'établissements (reprendre la logique existante, refactorée dans `routes/discover.ts` si absente, ou utiliser `routes/nearby.ts` avec scope national)
- `weather` → météo de la ville active
- `opening` → horaires
- `business_qa` → réponse sur un établissement précis
- `events` → événements
- `out_of_scope` / `smalltalk` → classe C avec contexte minimal

### Logging
- Insérer un tour dans `ai_conversation_turns` avec `surface: "search"`, `ai_class`, `route`, `confidence`, `fallback_reason`, `tokens`, `model`, `results_count`.
- Permettre au dashboard `AiConversationPerf` de filtrer par surface.

### Suggestions UI
- Dans `SearchPage.tsx`, remplacer l'affichage actuel (aucune puce) par les `search_ai_suggestions` filtrées par ville active et catégorie de recherche.
- Afficher les followups cliquables sous la réponse, filtrés par route/catégorie résolue.

### Validation
- Une suggestion cliquée en Search ne déclenche aucun appel LLM (classe A).
- Une requête libre passe par le classifier, puis route déterministe ou classe C.
- Les logs Search apparaissent dans `AiConversationPerf`.

## Livrable 3 : harmonisation Embed et Club

### Stratégie
Ne pas remplacer toutes les routes d'un coup. Migrer les routes déterministes les plus simples d'abord, puis les complexes.

### Ordre de migration
1. **weather** → `routes/weather.ts` existe déjà
2. **opening** → `routes/opening.ts` existe déjà
3. **events** → `routes/events.ts` existe déjà
4. **discover** → utiliser `routes/nearby.ts` avec `scope: "national"` pour Club, `scope: "host_business"` pour Embed
5. **booking** → adapter `routes/booking.ts` aux deux surfaces
6. **business_qa** / **reviews** / **compare** / **itinerary** → dernière phase

### Adaptations nécessaires
- `club-ai-chat` et `embed-ai-chat` doivent pouvoir appeler `router.ts` et interpréter le `RouteResult` tout en conservant leurs formats de réponse (SEARCH_RESULTS, MAP_FOCUS, etc.) pour le client.
- Déplacer les logiques actuelles `deterministicRoute` et `inferEmbedRoute` dans les fichiers `routes/*.ts` correspondants, ou les fusionner.
- Conserver le transport actuel de chaque surface (custom SSE pour Club, AI SDK pour Embed) : le moteur change le contenu, pas le protocole.

### Suggestions/follow-ups
- Faire consommer à Club et Embed les mêmes champs de taxonomie (catégorie, badges, sous-catégories, villes) pour le filtrage client.
- Les relances peuvent désormais imposer un `curatedRoute` (classe A) au lieu de juste un `mode`.

### Validation
- Club et Embed continuent de fonctionner avec les routes non migrées.
- Les routes migrées (weather, opening, events) passent par le moteur et loguent correctement.
- Aucune régression sur les Class A curated responses existantes.

## Points techniques

- Pas de changement de modèle : `AI_MODEL = "openai/gpt-5.6-sol"` reste le seul modèle.
- Pas de changement de schéma de `ai_conversation_turns` ; on remplit les champs déjà existants (`surface`, `ai_class`, `route`, `confidence`, etc.).
- Les tables de suggestions/followups sont gérées par RLS + GRANT comme les autres tables `public`.
- Le moteur continue de fonctionner si une table `ai_routes` est vide : `router.ts` retombe en classe C sur `discover`.

## Estimation

| Livrable | Lignes de code | Fichiers principaux | Complexité |
|---|---|---|---|
| 1 - données + backoffice | ~400 | migrations, `StaffIA.tsx`, managers | moyenne |
| 2 - moteur Search | ~300 | `ai-search-answer/index.ts`, `SearchPage.tsx`, `routes/*` | moyenne-haute |
| 3 - harmonisation Embed/Club | ~600 | `club-ai-chat/index.ts`, `embed-ai-chat/index.ts`, `routes/*` | haute |

On commence par le livrable 1 ?
