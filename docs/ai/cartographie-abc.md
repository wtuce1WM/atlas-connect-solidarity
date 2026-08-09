# Cartographie A/B/C — Assistant IA (club, embed/ask, search)

Objectif : pour chaque type de question, décider du coût minimal de traitement.

- **A — Zéro LLM** : la question est résolue par du SQL/API déterministe. Le LLM n'est jamais appelé (ni pour comprendre, ni pour rédiger). Le texte est produit par un formateur (template) déjà éprouvé.
- **B — LLM de classification** : 1 appel court (≤ 300 tokens sortie, pas d'historique complet) qui ne sert qu'à choisir la route + extraire les paramètres (ville, quartier, catégorie, contraintes, exclusions). Le rendu reste déterministe (A).
- **C — LLM de raisonnement** : 1 appel long avec contexte métier injecté (fiches, avis, horaires) + historique glissant. Le LLM rédige.

Règle d'or : **A > B > C**. On ne monte d'un cran que si le cran inférieur ne peut pas répondre.

---

## 1. Matrice par intention

| # | Intention utilisateur | Route | Classe | Déclencheur | Contexte injecté | Sortie |
|---|---|---|---|---|---|---|
| 1 | Suggestion cliquée (prompt catalogué) | route de la suggestion | **A** | `ai_prompts.route` connu | aucun (params en base) | template |
| 2 | Relance cliquée | route de la relance | **A** | idem | contexte du thread (IDs déjà connus) | template |
| 3 | Météo / quand venir | `weather` | **A** | mots-clés + géoloc | API météo + ville résolue | widget + template |
| 4 | Marées / vent (surf, kite) | `tides` | **A** | mots-clés | API | widget |
| 5 | À proximité (rayon) | `nearby` | **A** | mots-clés + business courant | comptage par catégorie < 1 km | template déterministe |
| 6 | Réserver en ligne ? | `booking` | **A** | mots-clés | urls 1→5, tel, whatsapp | template immersif |
| 7 | Ouvert maintenant / horaires | `opening` | **A** | mots-clés | `opening_hours` | template |
| 8 | Le mieux noté / avis | `reviews` | **A** | mots-clés | note + nb avis + extraits | template |
| 9 | Agenda / événements | `events` | **A** | mots-clés + dates | `search_events` | template |
| 10 | Montre sur une carte | `map` | **A** | mots-clés | IDs du thread | overlay map |
| 11 | Prix / budget | `pricing` | **A** | mots-clés | `min_price` / `manual_price_range` | template |
| 12 | Recherche typée simple ("un bar à Gueliz") | `discover` | **B** | ville + catégorie extractibles | — | classification → A |
| 13 | Recherche avec exclusion ("un bar, pas un hôtel") | `discover` | **B** | négation détectée | — | classification (+ `exclude`) → A |
| 14 | Recherche floue / ambiance ("un endroit calme pour finir la soirée") | `discover` | **B→C** | pas de catégorie mappable | top N fiches candidates | LLM rédige la sélection |
| 15 | Comparaison ("lequel des deux pour un dîner d'affaires ?") | `compare` | **C** | ≥ 2 IDs dans le thread | fiches complètes des IDs | LLM |
| 16 | Itinéraire / journée type | `itinerary` | **C** | mots-clés durée/jour | IDs + distances + horaires | LLM |
| 17 | Question libre sur un établissement (fiche) | `business_qa` | **C** | business courant | fiche + textes IA + avis | LLM |
| 18 | Hors périmètre (visa, vol, politique) | `out_of_scope` | **A** | classifieur ou mots-clés | — | template de refus + 3 relances |
| 19 | Salutation / méta ("bonjour", "tu peux quoi ?") | `smalltalk` | **A** | regex | — | template + suggestions |

Répartition cible attendue : **~70 % A, ~20 % B, ~10 % C**.

---

## 2. Différences par surface

| Aspect | `/club` | `/embed/ask` (widget affilié) | onglet IA de `/search` |
|---|---|---|---|
| Périmètre | tout le Maroc (villes couvertes) | établissement hôte prioritaire + rayon | résultats de la recherche courante |
| Contexte implicite | géoloc utilisateur | `business_id` hôte + `poi_radius_km` | filtres actifs (ville, catégorie, dates) |
| Routes désactivées | — | `events` national, `itinerary` (optionnel) | `weather` secondaire |
| Ton | Club, immersif | affilié, orienté conversion | concis, orienté résultats |
| Priorité de résultats | ranking global | hôte d'abord, puis voisins | ordre du ranking de recherche |

Le moteur est **le même** ; seule la « surface config » change (périmètre, routes autorisées, ton, priorisation). Pas de fork de code par surface.

---

## 3. Conséquences techniques

1. **Classifieur unique** (`classify`) : entrée = message + surface + contexte court ; sortie = `{ route, params, exclude, confidence }`. Pas d'historique complet, pas de fiches → coût quasi nul.
2. **Seuil de confiance** : `confidence < 0.6` → on tombe en C plutôt que de deviner une route.
3. **Moteur partagé** : `supabase/functions/_shared/ai-routes/<route>.ts`, une fonction par route, testable seule, consommée par `club-ai-chat`, `embed-ai-chat` et la recherche.
4. **Table `ai_routes`** (pas d'enum) : code, libellé, classe A/B/C, surfaces autorisées, activable en backoffice.
5. **`ai_prompts` unifiée** (suggestions + relances) avec `surfaces[]`, `route`, `route_params`, ciblage polymorphe (catégorie hiérarchique, établissement, ville).
6. **Historique glissant** : 6 derniers tours max, et uniquement pour la classe C.
7. **Mesure** : logger `route`, `classe`, tokens in/out par message → on vérifie la répartition 70/20/10 avec des chiffres réels, pas au ressenti.

---

## 4. Ce qu'on ne fait pas

- Pas de modèle différent par route (politique : un seul modèle).
- Pas de vues de compatibilité (phase dev : on drop/recrée).
- Pas d'embeddings tant que le mapping mots-clés + classifieur tient.
- Pas de `required_context` déclaratif avant d'avoir un cas réel qui le réclame.
