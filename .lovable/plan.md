# Amélioration performances Conversations IA — 3 chantiers

## Chantier 1 — Streaming côté client

**Objectif** : premier token visible en ~500ms au lieu de 3-8s d'attente d'un bloc unique.

**Aujourd'hui**
- `club-ai-chat` renvoie `new Response(JSON.stringify({ answer, chatId, followups }))` en un seul bloc, quel que soit le chemin (router direct, tool-loop, agenda).
- Le client `ClubAiAssistant.tsx` attend la fin complète avant d'afficher.

**À faire**
1. Introduire un mode streaming dans `club-ai-chat` via `ReadableStream` SSE (compatible AI SDK) :
   - Chemin **router direct + synth** : streamer directement les tokens du call gateway `synth` au lieu de bufferiser.
   - Chemin **tool-loop LLM** : streamer la dernière itération assistante.
   - Chemin **agenda / events** : streamer l'intro éditoriale, envoyer le snapshot `EVENTS_SNAPSHOT` en événement final.
2. Encoder le `chatId` et les marqueurs (`SEARCH_RESULTS`, `EVENTS_SNAPSHOT`, `BUSINESS_LINKS`) comme événements SSE distincts (`event: metadata`, `event: token`, `event: done`).
3. Adapter `ClubAiAssistant.tsx` : lire le stream, afficher les tokens à mesure, appliquer les marqueurs à la fin.
4. Conserver un fallback non-streaming pour les cas courts (< 100 tokens attendus) et l'appel initial de suggestions.
5. Ajouter un vrai bouton Stop (AbortController côté client) qui coupe le fetch — remplace le stop cosmétique actuel.

**Risques** : régressions sur la persistance (sauvegarde `ai_chats.messages`). Solution : sauvegarder dans `onFinish` du stream, pas avant.

## Chantier 2 — Résolution des liens business côté serveur

**Objectif** : supprimer le bruit visible dans les network logs (N requêtes `name.ilike` avec émojis, phrases entières, "5 résultats affichés sur 11…") et fiabiliser les noms cliquables.

**Aujourd'hui**
- Le client parse la réponse assistante, extrait les noms en gras (`**Nom**`), puis fait une requête `businesses?name.ilike.%Nom%` par nom.
- Beaucoup de requêtes ratent (émojis, ponctuation, noms partiels, phrases meta comme "5 résultats affichés sur 11 trouvés dans la base 1WM").
- Le résolveur fuzzy de secours part sur des `or=(name.ilike.%mot1%,name.ilike.%mot2%,…)` qui remontent n'importe quoi.

**À faire**
1. Dans `club-ai-chat`, avant le return :
   - Détecter tous les `**Xxx**` de la réponse finale.
   - Croiser avec `map_slugs` du snapshot ET avec un fuzzy match normalisé (accents/émojis strippés) contre la liste des `results[].name` déjà en mémoire.
   - Émettre un commentaire structuré `<!--BUSINESS_LINKS:[{"name":"…","slug":"…"}]-->` en fin de réponse.
2. Côté `ClubAiAssistant.tsx` :
   - Parser d'abord `BUSINESS_LINKS` → convertir les `**Nom**` en `<Link>` déterministes.
   - Ne PAS déclencher de requêtes `name.ilike` pour les noms résolus.
   - Ne garder le fallback client (avec normalisation stricte + garde-fous) que pour les noms non présents dans `BUSINESS_LINKS`, et l'inhiber sur les lignes meta (regex "N résultats affichés sur M").
3. Ajouter côté serveur une liste d'exclusion pour les phrases meta afin qu'aucune tentative de résolution ne parte sur elles.

## Chantier 3 — Log structuré par tour + dashboard perf

**Objectif** : piloter les optimisations avec des chiffres, pas au ressenti.

**Aujourd'hui**
- `ai_usage_events` capture tokens/coût par appel gateway, mais pas la structure du tour (intent, chemin, outils appelés, latence par phase).
- Les logs edge (`console.log`) ne sont pas requêtables ni graphables.

**À faire**
1. Nouvelle table `ai_conversation_turns` :
   - `id`, `chat_id`, `user_id`, `created_at`
   - `user_message` (tronqué 500c), `intent_classified`, `route_taken` (`router_direct` / `tool_loop` / `agenda_shortcut` / `map_shortcut` / `affirmative_map` / `fallback_qa`)
   - `tools_called jsonb` (nom, latence, résultats_count)
   - `latency_ms_total`, `latency_ms_first_token`, `latency_ms_synth`
   - `tokens_in`, `tokens_out`, `cost_usd`
   - `city_active`, `city_detected`, `results_count`, `results_shown`
   - `had_error boolean`, `error_message text`
   - `stream_completed boolean`
   - RLS : lecture staff/admin uniquement, insert via service_role.
2. Instrumenter `club-ai-chat` : un objet `turnLog` accumulé tout au long, flushé en fin de handler (dans un `finally` pour capturer erreurs).
3. Nouvelle page staff `/backoffice/ai-perf` :
   - Filtres date / user / route.
   - KPI : latence P50/P95 par route, taux d'erreur, coût moyen/tour, ratio tokens_in/out.
   - Top 20 requêtes lentes (> 5s) avec drill-down.
   - Top 20 requêtes 0 résultat.
   - Graphe latence dans le temps par route (avant/après un déploiement).
4. Bouton feedback discret 👍/👎 sous chaque message assistant → colonne `feedback_score smallint` sur `ai_conversation_turns` pour évaluer les régressions qualité.

## Ordre d'exécution recommandé

1. **Chantier 3** en premier (baseline mesurée avant/après).
2. **Chantier 1** streaming (impact perçu le plus visible).
3. **Chantier 2** résolution slugs serveur (impact fiabilité).

## Détails techniques

- Streaming : `ReadableStream` SSE natif dans la fonction Deno, format compatible avec `useChat` de `@ai-sdk/react` si on veut migrer plus tard (garder les `data:` chunks JSON).
- Résolution slugs : normalisation `String.prototype.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\p{L}\p{N}\s]/gu,"").toLowerCase()`.
- Table `ai_conversation_turns` : GRANT INSERT à service_role, GRANT SELECT à authenticated avec policy `has_role(auth.uid(),'admin')`.
- Pas de changement de modèle IA dans ce lot — mesures d'abord.

## Hors périmètre (pour un second lot)

- Cache de recherche court (5-10min).
- Router déterministe étendu (météo, bookmarks, détails).
- Mémoire courte structurée.
- Modèle adapté par phase.
- Filtre "ouvert ce soir" côté business-search.
