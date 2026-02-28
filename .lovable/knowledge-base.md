# Base de connaissances — Atlas Concierge

Journal des décisions d'architecture, règles métier et apprentissages issus de nos échanges.

---

## 🔍 Moteur de recherche

### Architecture générale (v8)
- Le moteur utilise SQL (`ts_rank` sur `search_vector`) avec repli sémantique.
- Le `search_vector` inclut : nom, ville, quartier, sous-catégories (Poids A) ; services, mots-clés de services et mots-clés de sous-catégories (Poids B).
- Les mots-clés de l'établissement, la description et le hook sont EXCLUS du search_vector.
- L'intention détectée (via `search_intent_words`) PRIORISE sur le paramètre `category` de l'URL.
- En cas d'échec sémantique (0 résultat) avec catégorie+services, un second essai est tenté sans filtre de catégorie.

### Problème des requêtes multi-attributs transverses
- **Exemple** : "je cherche une piscine avec un bar pour faire la fête demain après-midi à Marrakech"
- **Diagnostic** : Le moteur est conçu pour "une intention = une catégorie". Cette requête est multi-attributs (piscine + bar + fête) et transverse (Hôtellerie, Loisirs, Restauration).
- **Solution court terme** : Enrichir les `keywords` des sous-catégories/services. Ajouter des `search_intent_words`.
- **Solution moyen terme** : Permettre la recherche sans catégorie imposée quand la requête est multi-facette. Scorer par nombre de services matchés.
- **Solution long terme** : Scoring par attributs pondérés — chaque mot-clé matché dans les services augmente le score, plutôt qu'un filtre binaire.

### Fidélité du LLM vocal (voice-search-intent)
- **Problème identifié** : Le LLM inventait des mots absents du transcript ("pizza" → ajoutait "cuisine italienne" + "viande").
- **Règle ajoutée** : JAMAIS inventer/ajouter/inférer des mots absents du transcript original.
- **Plats spécifiques** (pizza, sushi, tajine, burger…) : garder tel quel, ne PAS remplacer par "cuisine [nationalité]".
- La conversion "cuisine italienne" ne s'applique que quand l'utilisateur dit explicitement "manger italien" ou "restaurant italien".
- "feu de bois" → "feu bois" seulement (pas d'ajout automatique de "viande").

---

## ⏰ Horaires d'ouverture

### Badge "Ouvert"
- Le badge ne s'affiche que si `is_open_24h` est true OU si `opening_hours` contient des données valides pour le jour/créneau actuel.
- Si `opening_hours` est null ou le jour manquant : le badge est supprimé (pas d'affichage "Horaires non renseignées").
- Fonctionne avec le filtre par créneau horaire ET en temps réel (fallback quand aucun filtre actif).

### Vacances
- Les `vacation_dates` (tableau de `{start_date, end_date}`) sont prises en compte : si l'établissement est en vacances, il est considéré comme fermé.

---

## 🗣️ Recherche vocale

### Pipeline
1. Web Speech API → transcript brut
2. Edge Function `voice-search-intent` (LLM) → extraction de mots-clés + catégorie + timeKeyword
3. Navigation vers `/search?q=keywords&spoken=transcript&category=...`

### Règles clés
- Le LLM ne doit PAS imposer de catégorie au front-end quand l'intention est ambiguë.
- Le mot "massage" ne doit JAMAIS être converti en "spa hammam".
- Les mots temporels (midi, soir, brunch, maintenant…) vont dans `timeKeyword`, pas dans les keywords.
- "Maroc" / "au Maroc" sont supprimés car l'annuaire est déjà au Maroc.

---

## 🎨 Mise en page des résultats de recherche

### Logique d'affichage hybride
- **Grille plate paginée** : Affichage par défaut. Utilisé quand tous les résultats appartiennent à **une seule sous-catégorie** (ex: « riad artistique » → que des Riads).
- **Carrousels horizontaux groupés par sous-catégorie** : Activés uniquement quand les résultats contiennent **2+ sous-catégories distinctes** (ex: « salade » → Restaurants, Traiteurs, Épiceries).
- Les carrousels sont triés : la sous-catégorie détectée apparaît en premier, puis par `sort_order` de la table `subcategories`.

### Search Bundles
- Quand un bundle est actif, les **merge groups de sous-catégories** (ex: Riad + Hôtel) sont **désactivés** pour garantir la précision.
- Le bundle associe sous-catégorie + service sur la même ligne (ex: Riad + Galerie d'Art).
- Le bundle peut aussi filtrer par **badge_id** (ex: badge "Enfants") via la table `business_badges`.
- La résolution de casse est automatique (« riad » → « Riad » via lookup `ilike` dans la table `subcategories`).
- La correspondance de mot-clé est **tolérante aux pluriels** : « activités » matche « activité » grâce à un stemmer français simplifié.


## 📝 Notes diverses

- Le mot "boutique" ne doit JAMAIS être ajouté comme mot-clé de recherche (trop générique, matche des hôtels).
- Les `search_service_filters` permettent de filtrer par service requis quand un mot-clé spécifique est détecté.
- La table `search_intent_words` mappe des mots vers des catégories (ex: "acheter" → "Commerce").
