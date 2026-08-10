# Unification suggestions / relances IA (3 surfaces → 1 modèle)

Objectif : supprimer la duplication de logique entre `/club`, `/embed/ask` et l'onglet IA de `/search`. Une seule structure de données, un seul écran de gestion, un seul chargeur côté serveur.

## 1. Données : deux tables au lieu de six

Nouvelles tables `ai_suggestions` et `ai_followups`, avec une colonne `surface` (`club` | `embed` | `search`).

Le schéma est le **superset** de ce qui existe aujourd'hui :

- Libellés : `label_fr/en/ar`
- Réponse figée : `fixed_response_fr/en/ar`
- Prompt : `prompt_fr/en/ar`
- Ciblage : `category`, `main_categories`, `city`, `subcategory_ids`, `badge_ids`, `business_ids`, `destination_ids`, `blog_post_ids`, `commodity_filters`
- Proximité (embed) : `proximity_a_*`, `proximity_b_*`, `radius_km`
- Comportement : `mode`, `followups`, `disabled_followup_ids`, `sort_order`, `is_active`
- Recherche sémantique (club) : `label_embedding`, `label_embedded_source`, `label_embedded_at`

Les 76 lignes actuelles (30 club + 29 embed + 4 search + 13 relances embed) sont recopiées avec leur `surface`, ids conservés. Les 6 anciennes tables sont supprimées à la fin de la même migration.

Accès : lecture/écriture réservée au staff, lecture publique pour les suggestions actives (les widgets embed sont servis sur des sites tiers sans session).

## 2. Interface : un seul composant paramétré

- `AiSuggestionsManagement({ surface })` et `AiFollowupsManagement({ surface })`, construits à partir de la version Embed actuelle (la plus avancée : commodités, catégories ciblées, tout/aucune, ordre des articles).
- Dans Backoffice → IA, les onglets Club / Embed / Search deviennent trois instances du même composant. Les champs sans objet pour une surface sont masqués (ex. proximité A/B uniquement en embed, hôte-relatif).
- Suppression de `ClubAiSuggestionsManagement`, `ClubAiFollowupsManagement`, `EmbedAiSuggestionsManagement`, `EmbedAiFollowupsManagement`, `SearchAiSuggestionsManagement`, `SearchAiFollowupsManagement`.

Conséquence directe : une nouveauté (type « Livraison Glovo ») se paramètre immédiatement sur les 3 surfaces, sans réadapter trois écrans.

## 3. Serveur : un seul chargeur

- `_shared/ai-engine/suggestions.ts` : `loadSuggestions(surface)` et `loadFollowups(surface)`.
- `club-ai-chat`, `embed-ai-chat` / `embed-ai-chat-v2` et `ai-search-answer` appellent ce chargeur au lieu de requêter leur propre table.
- Le résolveur curaté (`routes/curated.ts`) lit désormais un seul jeu de champs, donc le ciblage déterministe (articles, commodités, badges) se comporte à l'identique sur les 3 surfaces.

## 4. Ordre d'exécution (point de vigilance)

Les widgets embed sont appelés en direct depuis des sites hôtes tiers. La migration et le redéploiement des fonctions doivent donc se faire **dans la même itération**, pas étalés : sinon un widget lirait pendant quelques secondes une table qui n'existe plus.

Séquence : migration (création + copie + suppression) → mise à jour des fonctions serveur → mise à jour du back-office.

## 5. Vérification

- Compte de lignes par surface avant/après migration (30 / 29 / 4 et 0 / 13 / 0).
- Test réel sur `riad-dar-najat` et `madada-mogador` : suggestions affichées, « Magasins avec livraison internationale » (commodité) et « Activités pour les enfants » (article de blog) doivent rendre exactement les mêmes résultats qu'aujourd'hui.
- Test `/club` et onglet IA de `/search` : suggestions présentes, relances filtrées par contexte.

## Détails techniques

- Colonnes tableaux en `uuid[]` / `text[]` avec `DEFAULT '{}'`, jamais nulles, pour éviter les branches `?? []` côté code.
- `surface` en type texte contraint (`club`, `embed`, `search`), indexé avec `is_active` et `sort_order`.
- `label_embedding` reste `vector` : seules les lignes club l'utilisent aujourd'hui, la colonne devient disponible aux trois surfaces sans coût.
- Copie faite en SQL pur dans la migration (`INSERT ... SELECT`), donc atomique avec la suppression des anciennes tables.

## Hors périmètre

- Aucune modification du moteur A/B/C lui-même (classifieur, routes, seuils).
- Aucun changement des contenus de suggestions existants.
- Pas de fusion des tables `ai_conversation_turns` / `ai_routes`.
