# Coût tokens IA runtime (AI Gateway)

Consommation **AI Gateway** mesurée sur la période du **5 juin → 5 juillet 2026** (workspace 1WM).

## Détail par modèle

| Modèle | Input | Output | Total |
|---|---|---|---|
| `google/gemini-3-flash-preview` | 2,887 cr | 0,463 cr | **3,35 cr** |
| `google/gemini-3.1-pro-preview` | 0,314 cr | 0,172 cr | **0,49 cr** |
| `google/gemini-2.5-flash-lite` | 0,009 cr | 0,038 cr | **0,05 cr** |
| **Total IA runtime** | — | — | **≈ 3,89 crédits** |

## Mise en perspective sur la même période

| Poste | Crédits | Part |
|---|---|---|
| Build mode (agent Lovable) | 3 964,80 cr | ~98 % |
| Cloud (egress + compute + storage + functions) | 64,4 cr | ~1,6 % |
| **AI Gateway (tokens runtime app)** | **3,89 cr** | **< 0,1 %** |

## Lecture

- Le coût des tokens IA côté app (agents `/search`, `/club`, génération vidéos, scénarisation, etc.) est **marginal** face au build mode et au Cloud.
- Le **routage hybride** fonctionne comme prévu : `gemini-3-flash-preview` assure ~86 % des dépenses IA, `gemini-3.1-pro-preview` reste réservé aux requêtes complexes (itinéraires, planification, historiques longs).
- `gemini-2.5-flash-lite` est anecdotique (tâches de classification/synthèse rapides).

## Bonnes pratiques pour rester sous contrôle

1. Garder Flash en défaut sur tous les agents ; ne basculer Pro que sur heuristique (mots-clés ou contexte ≥ 4 tours).
2. Plafonner `maxTokens` côté Edge Functions (actuellement 3 200 pour `ai-search-answer`).
3. Mettre en cache les réponses récurrentes (météo, urgences, recherches populaires) avant de réinterroger l'IA.
4. Pour les volumes importants de génération (vidéos, descriptions), préférer Haiku/Flash-Lite lorsque la tâche est structurée.
