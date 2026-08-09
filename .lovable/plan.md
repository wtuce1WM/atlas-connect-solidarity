# Matrice IA — Plan de mise en œuvre

Objectif : unifier le moteur conversationnel des 3 surfaces IA (Club `/club`, Embed `/embed/ask`, Search IA `/search`) autour de la matrice A/B/C déjà formalisée, avec gestion centralisée des suggestions et relances en back-office.

## Phase 1 — Données et back-office (cette itération)

1. Créer `search_ai_suggestions` et `search_ai_followups`
   - Mêmes champs que `club_ai_suggestions` / `club_ai_followups` : `label_fr/en/ar`, `sort_order`, `is_active`, `mode`, `category`, `city`, `subcategory_ids`, `badge_ids`, `business_ids`, `destination_ids`, `blog_post_ids`, `followups`, `disabled_followup_ids`, `fixed_response_fr/en/ar`, `prompt_fr/en/ar`.
   - `surface` = `'search'` par défaut pour permettre un éventuel réusage cross-surface plus tard.

2. Ajouter les colonnes de taxonomie manquantes aux relances existantes
   - `club_ai_followups` : `category`, `city`, `subcategory_ids`, `badge_ids`.
   - `embed_ai_followups` : `category`, `city`, `subcategory_ids`, `badge_ids`.
   - Ces champs permettent au classifieur B de filtrer les relances affichées selon le contexte de la conversation.

3. RLS & GRANT
   - Tables staff-only via `public.is_staff(auth.uid())`.
   - GRANT `SELECT/INSERT/UPDATE/DELETE` à `authenticated` + `ALL` à `service_role`.

4. Back-office `StaffIA.tsx`
   - Transformer l'onglet actuel `club-ai-suggestions` en `ai-suggestions`.
   - Sous-onglets : `Search`, `Club`, `Embed`, `Relances Club`, `Relances Embed`, `Prompt follow-ups`.
   - Créer `SearchAiSuggestionsManagement.tsx` et `SearchAiFollowupsManagement.tsx` calqués sur les managers Club/Embed existants.

## Phase 2 — Intégration du moteur unifié sur Search IA (priority)

1. Auditer `ai-search-answer` edge function
   - Identifier les routes `COMPLEX_RE` et la logique `ai_config` qui divergent du moteur A/B/C.
   - Conserver les outils métier existants (search, ranking, etc.) mais les appeler via `router.ts`.

2. Câbler `router.ts` pour la surface `search`
   - Ajouter la surface `search` dans `_shared/ai-engine/surfaces.ts` (déjà présente mais inactive).
   - Mapper les suggestions `search_ai_suggestions` : si l'utilisateur clique une suggestion, exécuter la route associée en Class A.
   - Si input libre, passer par le classifieur B (`classify.ts`) puis route déterministe ou Class C.

3. Instrumentation
   - Logguer chaque turn dans `ai_conversation_turns` avec `surface='search'`, `ai_class`, `route_taken`, `classifier_confidence`.

4. Suggestions dans l'UI Search IA
   - Remplacer les 4 suggestions codées en dur de l'onglet IA par celles de `search_ai_suggestions` (actives + matching `category`/`city` si applicable).

## Phase 3 — Harmonisation Club et Embed (itération suivante)

1. Migrer `club-ai-chat` vers `router.ts`
   - Conserver le système de rescue/classifieur actuel comme fallback temporaire.
   - Faire remonter les suggestions `club_ai_suggestions` dans le classifieur B.

2. Migrer `embed-ai-chat` vers `router.ts`
   - Même principe : suggestions `embed_ai_suggestions` en Class A, input libre via classifieur B.

3. Relances unifiées
   - `*_ai_followups` filtrées par `category`, `city`, `subcategory_ids`, `badge_ids` selon le contexte courant.
   - Éviter les doublons de relances entre les 3 surfaces.

4. Tests et métriques
   - Comparer les taux de `route_taken` legacy vs unifié sur 30 jours.
   - Vérifier que les suggestions de Search/Club/Embed restent distinctes et contextuelles.

## Livrables de cette itération

- Migration SQL Phase 1 (tables + colonnes + RLS).
- `src/components/staff/SearchAiSuggestionsManagement.tsx`.
- `src/components/staff/SearchAiFollowupsManagement.tsx`.
- `src/pages/StaffIA.tsx` restructuré avec onglet Search.
- Mise à jour des types Supabase générés.

## Non-objectifs

- Ne pas toucher aux modèles de données de `ai_conversation_turns` ni `ai_routes` (déjà suffisants).
- Ne pas réécrire les outils de recherche eux-mêmes, seulement leur orchestration.
- Ne pas migrer Club/Embed dans cette itération.
