# Spécification technique — Moteur IA A/B/C (1WM)

Arbitrage des retours ChatGPT intégré. Document d'implémentation : ce qui est construit, dans quel ordre, et ce qui ne l'est pas.

## 0. Vocabulaire figé

- **Classe** = combien d'intelligence est nécessaire. `A` déterministe → `B` classifieur → `C` générateur contextualisé.
  Formulation retenue : **Déterministe → Classifier → Générateur** (C n'est pas « du raisonnement », c'est de la génération avec contexte injecté).
- **Route** = quelle action métier est exécutée (`weather`, `nearby`, `booking`, `opening`, `reviews`, `events`, `map`, `pricing`, `tides`, `discover`, `compare`, `itinerary`, `business_qa`, `out_of_scope`, `smalltalk`).
- Les deux dimensions évoluent indépendamment. Une route a une classe **par défaut**, définie par le développeur, pas par le staff.

## 1. Frontière classe / back-office

`ai_routes` (table, pas d'enum) :

| colonne | rôle | modifiable en backoffice |
|---|---|---|
| `code` | identifiant de route | non |
| `label` | libellé affiché | oui |
| `default_class` | `A` / `B` / `C` | **non** (code only) |
| `enabled` | route active | oui |
| `surfaces` | `club`, `embed`, `search` | oui |
| `editorial` | ton, intro, formulation, nb de résultats | oui |

Le staff ne peut jamais passer `weather` en C ni `booking` en B. Il agit sur l'activation, les surfaces et l'éditorial. Pas de colonne `model` : politique projet = un seul modèle (`openai/gpt-5.6-sol`) pour tous les appels. Le levier de coût est la **classe**, pas le modèle.

## 2. Classifieur B — contrat strict

Entrée : `message` + `surface` + **focus context** compact. **Jamais** d'historique de conversation, **jamais** de fiches d'établissements.

Le focus context résout l'anaphore sans dégrader B (≈ 30 tokens, pas de fiches) :

```json
{ "last_business_ids": ["uuid1","uuid2"], "last_business_names": ["Riad Dar Najat"], "last_route": "reviews", "last_category": "restaurant", "active_city": "Marrakech" }
```

Ainsi « et lui, il fait quoi comme cuisine ? » reste traitable : détection de reprise pronominale → le focus fournit la cible → route `business_qa` sur un ID connu, sans remonter en C par défaut d'information. Escalade en C seulement si le focus est vide **et** la reprise est ambiguë (`fallback_reason = ambiguous`).

Sortie unique :

```json
{ "intent": "search", "category": "restaurant", "exclude": ["hotel"], "city": "Marrakech", "target_business_id": null, "confidence": 0.91 }
```

Le code fait le reste (résolution catégorie → subcategories, géo, ranking, rendu). Garde-fou explicite : si on est tenté d'envoyer des fiches au classifieur pour qu'il choisisse, c'est que la question relève de C — on ne dégrade pas B en « C déguisé ».

### Seuil de confiance : paramètre de surface, pas constante

`confidence_threshold` vit dans la surface config, pas en dur dans le classifieur :

| surface | seuil | raison |
|---|---|---|
| `embed` | 0.45 | contexte étroit (un établissement + rayon), peu d'ambiguïté possible |
| `club` | 0.60 | périmètre national, ambiguïté fréquente |
| `search` | 0.60 | périmètre large, filtres concurrents |

Sous le seuil → C, `fallback_reason = confidence_low`.

### Cache du classifieur

Décision : **oui, mais après la première mesure.** Table `ai_classify_cache` (`hash(message normalisé + surface + active_city + host_business_id)` → sortie JSON, TTL 30 j). Un hit = zéro token. À brancher à l'étape 4bis, une fois que les logs montrent le taux de répétition réel des formulations — pas avant, pour ne pas ajouter une autorité de vérité non mesurée. Un hit se logue avec `ai_class = 'B'` et `fallback_reason = 'cache_hit'`, tokens à 0.

## 3. Historique

- Classe A : aucun historique envoyé au LLM (aucun appel LLM).
- Classe B : aucun historique — seulement le focus context (§2).
- Classe C : 6 derniers tours max + contexte pertinent uniquement.


Le thread reste stocké en base intégralement (`ai_chats`, `ai_conversation_turns`) ; c'est l'**envoi au modèle** qui est restreint, pas le stockage.

## 4. Instrumentation (obligatoire dès le jour 1)

`ai_conversation_turns` possède déjà : `intent_classified`, `route_taken`, `tools_called`, `tokens_in`, `tokens_out`, `cost_usd`, `latency_ms_total`, `latency_ms_first_token`, `had_error`, `stream_completed`, `results_count`, `city_active`, `city_detected`, `language`.

À ajouter (migration) :

| colonne | type | valeurs |
|---|---|---|
| `ai_class` | text | `A` / `B` / `C` |
| `classifier_confidence` | numeric | 0→1, null si A |
| `fallback_reason` | text | `null`, `confidence_low`, `ambiguous`, `route_failed`, `route_disabled`, `no_results` |
| `surface` | text | `club` / `embed` / `search` |
| `model` | text | modèle réellement appelé |

`success` est déjà couvert par `had_error` + `stream_completed` — pas de nouvelle colonne.

Le tableau de bord (Backoffice / IA) affiche alors la répartition réelle **A / B / C / B→C / A→C** avec tokens et coût par classe. Le 70/20/10 est une hypothèse **à mesurer**, pas une cible à optimiser avant d'avoir des chiffres.

## 5. Ordre de construction

1. **Migration instrumentation** (§4) + table `ai_routes` seedée avec les 15 routes et leur classe par défaut.
2. **Moteur partagé** `supabase/functions/_shared/ai-engine/` :
   - `router.ts` — curated input (suggestion/relance → route directe) vs free input (→ classifieur)
   - `classify.ts` — appel court, contrat §2
   - `routes/<route>.ts` — une fonction par route déterministe, testable seule
   - `respond.ts` — response builder : template déterministe ou appel C
   - `log.ts` — écriture du turn instrumenté
   - `surfaces.ts` — 3 configurations de contexte (périmètre, routes autorisées, ton, priorisation)
3. **Routes déterministes** portées depuis `club-ai-chat` / `embed-ai-chat` (weather, tides, nearby, booking, opening, reviews, events, map, pricing) — extraction, pas réécriture : le rendu actuel est déjà validé en prod.
4. **Classifieur minimal**.
5. **C** branché sur `discover` flou, `compare`, `itinerary`, `business_qa` uniquement.
6. **Branchement des surfaces** : `club-ai-chat`, `embed-ai-chat`, onglet IA de `/search` deviennent des enveloppes fines au-dessus du moteur.

## 6. Ce qu'on ne construit pas

- Pas de vues de compatibilité, pas de double écriture : phase dev, on supprime le legacy au fur et à mesure de l'étape 3.
- Pas de modèle par route.
- Pas d'embeddings tant que le classifieur tient.
- Pas de `required_context` déclaratif.
- Pas de classe modifiable par le staff.
