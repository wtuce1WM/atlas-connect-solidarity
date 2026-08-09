# Processus de changement de classe A/B/C

La classe d'une route (`A`, `B` ou `C`) est un choix d'architecture. Elle ne peut pas être modifiée depuis le Backoffice (interface `AiRoutesManagement` en lecture seule). Ce document décrit comment demander, valider et appliquer un changement de classe.

## Règle de base

> **On ne monte d'une classe que si la classe inférieure ne peut pas répondre.**
> 
> Avant de demander un changement, il faut avoir un exemple concret, reproductible, qui prouve que la classe actuelle échoue.

---

## Quelle classe pour quel besoin ?

| Classe | Définition | Levier | Exemples actuels |
|---|---|---|---|
| **A** | Déterministe. Aucun appel LLM. Données en base ou API externe, template connu. | Coût quasi nul, très fiable. | `weather`, `tides`, `opening`, `pricing`, `booking`, `reviews`, `events`, `map`, `nearby`, `out_of_scope`, `smalltalk` |
| **B** | Classifieur léger. Un seul appel court (~300 tokens max) choisit la route et extrait les paramètres. Le rendu reste déterministe. | Accélère la recherche floue sans payer un LLM génératif. | `discover` (recherche typée ou avec exclusions) |
| **C** | Génératif contextualisé. LLM avec fiches, avis, historique glissant. Réponse rédigée. | Nécessaire quand il faut synthétiser, comparer, raisonner. | `business_qa`, `compare`, `itinerary`, `discover` (fallback) |

---

## Processus de demande

### 1. Identifier un échec concret

Avant toute demande, collecter :

- **Le message utilisateur exact** qui échoue.
- **Le comportement actuel** (classe A/B/C appliquée, réponse rendue, erreur, zéro résultat).
- **Le comportement attendu** (quelle réponse ou action voulue).
- **La surface** concernée (`/club`, `/embed/ask`, onglet IA de `/search`).
- **Les IDs** des établissements impliqués, si connus.

### 2. Vérifier que la classe actuelle ne peut pas répondre

Poser la question : peut-on résoudre le cas par une règle, un template, une donnée manquante, ou un meilleur paramètre ?

- **Si oui** : la solution est un patch de données/template, pas un changement de classe.
- **Si non** : on peut envisager une montée en classe.

### 3. Ouvrir un ticket d'architecture IA

Le ticket doit contenir :

```markdown
# Demande de changement de classe — Route : <code>

## Cas d'échec
Message : "..."
Surface : club | embed | search
Comportement actuel : ...
Comportement attendu : ...

## Classe proposée
Actuelle : A | B | C
Proposée : A | B | C

## Justification
Pourquoi la classe actuelle échoue ?
Pourquoi la classe proposée résout le cas ?

## Données / mesures
- Nombre de cas similaires observés (logs) : ...
- Taux de zéro-résultat ou d'erreur sur cette route : ...
- Exemples de prompts qui bénéficieraient du changement : ...

## Risques
- Coût token supplémentaire : ...
- Latence ajoutée : ...
- Risque de dégradation sur les cas actuels : ...
```

### 4. Validation par arbitrage

Le changement de classe est validé par le product owner (WTUCE) avec l'agent Lovable, après avoir éventuellement arbitré les retours de ChatGPT / Claude.

Critères de validation :

- Le cas d'échec est reproductible.
- La classe actuelle ne peut pas être étendue déterministement.
- Le coût/latence du changement est mesuré ou estimé.
- Les surfaces impactées sont listées.
- Un plan de rollback est défini.

### 5. Implémentation technique

Une fois validé, Lovable applique les modifications dans cet ordre :

1. **Migration** : mettre à jour `ai_routes.default_class` pour la route concernée.
2. **Code** : adapter le moteur (`supabase/functions/_shared/ai-engine/`) si la logique de la route change.
3. **Tests** : rejouer le cas d'échec original + une batterie de cas voisins.
4. **Instrumentation** : vérifier que `ai_class`, `classifier_confidence`, `fallback_reason` sont correctement logués dans `ai_conversation_turns`.
5. **Dashboard** : observer l'impact sur la répartition A/B/C, tokens, coût, latence.

### 6. Déploiement progressif

- Phase 1 : test sur une seule surface (par exemple `embed/ask` avec `?engine=v2`).
- Phase 2 : comparaison V1 vs V2 sur 14 jours minimum.
- Phase 3 : bascule globale si le nouveau comportement est supérieur sur les métriques clés (zéro-résultat, erreur, coût, satisfaction).

---

## Exemples de demandes valides et invalides

### Valide : passer `nearby` en B

> Message : "Un restaurant italien à moins de 500 mètres de ce riad, pas un fast-food."
>
> Actuellement `nearby` est en A : il compte les établissements à 1 km par catégorie de Structure du Front, mais ne filtre pas la cuisine italienne, ni les exclusions sémantiques.
>
> Proposition : `nearby` en B pour que le classifieur extrait la catégorie fine (`italien`) et l'exclusion (`fast-food`), puis applique la recherche déterministe.

### Invalide : passer `booking` en C

> "Je veux un texte plus vendeur pour la route booking."
>
> Refus : la route `booking` doit rester fiable. Le texte immersif peut être amélioré par le template, l'éditorial, ou le champ `editorial` de `ai_routes`, mais pas par un appel LLM génératif.

### Invalide : passer `weather` en B

> "Parfois la météo devrait être plus contextuelle."
>
> Refus : la météo est une API externe avec un format de réponse fixe. Le contexte peut être ajouté dans le template, pas dans un classifieur.

---

## Rollback

Si après bascule les métriques se dégradent :

1. Revenir à la classe précédente par migration immédiate.
2. Conserver les logs des tours dégradés pour analyse.
3. Re-ouvrir le ticket avec les données mesurées.

---

## Résumé

| Étape | Responsable | Livrable |
|---|---|---|
| Cas d'échec | Staff / PO | Exemple concret |
| Preuve d'impossibilité | Lovable | Analyse technique |
| Ticket d'architecture | PO | Document de demande |
| Validation | PO + Lovable | Décision go / no-go |
| Implémentation | Lovable | Migration + code + tests |
| Déploiement progressif | PO + Lovable | Dashboard A/B/C surveillé |
| Rollback | Lovable | Migration inverse si besoin |

> **En résumé** : une classe ne change pas dans l'interface. Elle change parce qu'un cas réel, mesuré et validé, le réclame.
