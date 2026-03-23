# Base de connaissances — Atlas Concierge

Journal des décisions d'architecture, règles métier et apprentissages issus de nos échanges.

---

## 🔍 Moteur de recherche

### Architecture générale (v8)
- Le moteur utilise SQL (`ts_rank` sur `search_vector`) avec repli sémantique.
- Le `search_vector` inclut : nom, ville, quartier, sous-catégories (Poids A) ; services, mots-clés de services, mots-clés de sous-catégories ET mots-clés de l'établissement (Poids B).
- La description et le hook sont EXCLUS du search_vector.
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


### Fonctionnement d'une recherche textuelle simple (ex: « Majorelle »)
1. **Normalisation** : le mot est nettoyé (accents, casse) → `majorelle`
2. **tsquery** : le moteur génère une requête full-text `majorelle:*` contre le champ `search_vector` de chaque business.
3. **Matching** : tous les établissements dont le `search_vector` contient le token `majorelle` sont retenus (nom, adresse, mots-clés…).
4. **Filtrage géo** : la clause `is_visible_locale` + zone s'applique, mais si aucune ville n'est spécifiée dans la requête, seul le filtre `is_active = true` compte.
5. **Classement** : les résultats sont triés par `ts_rank` (pertinence textuelle), `priority_score` (score éditorial) et `wtuce_status` (vérifié > pending).
6. **Pas de synonyme/bundle** : si le mot ne correspond à aucun service/sous-catégorie configuré (ex: nom propre), c'est une recherche purement textuelle directe.

## 📝 Notes diverses

- Le mot "boutique" ne doit JAMAIS être ajouté comme mot-clé de recherche (trop générique, matche des hôtels).
- Les `search_service_filters` permettent de filtrer par service requis quand un mot-clé spécifique est détecté.
- La table `search_intent_words` mappe des mots vers des catégories (ex: "acheter" → "Commerce").

### Normalisation des accents (diacritiques)
- Le `search_vector` utilise `unaccent()` (extension PostgreSQL) sur **tous** les champs indexés. Il ne stocke que des versions sans accent.
- Le tsquery dans l'Edge Function applique aussi `stripAccentsGlobal()` sur tous les termes finaux, garantissant la correspondance.
- Cela couvre les **diacritiques Unicode du bloc U+0300–U+036F** (Combining Diacritical Marks) :
  - **Accents** : ◌̀ grave (U+0300), ◌́ aigu (U+0301), ◌̂ circonflexe (U+0302), ◌̃ tilde (U+0303)
  - **Tréma / umlaut** : ◌̈ (U+0308)
  - **Cédille** : ◌̧ (U+0327) — transforme ç en c
  - **Macron, brève, point suscrit, rond en chef**, etc.
- **Méthode JS** : `str.normalize("NFD")` + `.replace(/[\u0300-\u036f]/g, "")` (supprime les combinants).
- **Méthode SQL** : `unaccent()` dans le trigger `update_business_search_vector`.
- **Exemples** : médina→medina, crêperie→creperie, française→francaise, naïf→naif, façade→facade.
- Les ligatures (œ, æ) sont aussi décomposées par NFD : œ→oe, æ→ae.

---

## ⚡ Performance SearchPage

### Goulot d'étranglement identifié
- `SearchPage.tsx` fait ~4600 lignes avec ~50 `useState`. Chaque `setState` re-traverse tout l'arbre React.
- Sur mobile, le temps perçu = temps edge function (~1-1.5s) + cascade de re-renders + rendu DOM des cards + requêtes secondaires (AI answer, filtres) ≈ 2-3× le temps réseau seul.
- **Solution identifiée (non implémentée)** : Découper SearchPage en sous-composants mémoïsés (`React.memo`) pour isoler les re-renders. C'est un refactoring majeur.
- **Optimisation appliquée** : `SearchInput` (desktop) et `MobileSearchOverlay` (mobile) sont rendus conditionnellement via `isMobile` pour éviter le montage de hooks redondants sur chaque viewport.
- **Optimisation appliquée** : `useIsMobile` initialisé de manière synchrone (lazy initializer sur `window.innerWidth`) pour éviter un double render au montage.

---

## 🏗️ Architecture des composants partagés (panneaux latéraux)

### Modules extraits pour réutilisation BookOnline ↔ WebOnly
| Module | Fichier | Contenu |
|---|---|---|
| Drapeaux de langues | `src/lib/languageFlags.ts` | `LANG_FLAGS`, `LANG_ALT`, `getLangFlag()`, `getLangAlt()` |
| Icône WhatsApp | `src/components/icons/WhatsAppIcon.tsx` | SVG réutilisable |
| Parsing vidéo | `src/lib/videoEmbed.ts` | `getVideoEmbed()` — YouTube/Vimeo/fichier → embed URL + détection verticale |
| Carte Contact flip | `src/components/cards/ContactFlipCard.tsx` | Contact + horaires (front) / Google Map (back) |
| Carte Avis flip | `src/components/cards/ReviewsFlipCard.tsx` | Notes agrégées (front) / Avis traduits (back) |

### Règles d'extraction
- Les sous-composants de cartes gèrent leur propre état de flip (`flipped`) et de traduction — pas de remontée d'état au parent.
- `getVideoEmbed` est une fonction pure (pas de hooks) définie hors composant pour éviter la recréation à chaque render.

---

## 🔊 Lecture d'articles (concept — pas encore implémenté)

### Flux proposé : "Lire un article de presse"

Quand une entrée de la Base IA possède des URLs externes avec langue associée, l'agent vocal ElevenLabs peut proposer :
> *« Voulez-vous que je vous lise un article ? »*

### Architecture technique

1. **Détection** : L'agent vocal détecte les URLs externes disponibles sur l'entrée Knowledge Base.
2. **Choix de la langue** : Il liste les URLs avec leur langue (ex: « J'ai un article en FR et un en EN »), l'utilisateur répond vocalement.
3. **Scraping** : Une Edge Function scrape le contenu de l'URL choisie (via Firecrawl ou un simple fetch + extraction du texte principal).
4. **Lecture TTS** : Le contenu scrappé est envoyé à ElevenLabs TTS (`eleven_multilingual_v2`) qui le lit à voix haute.

### Points à considérer

- **Longueur** : Les articles longs coûtent cher en TTS. Proposer un résumé IA avant la lecture complète.
- **Qualité du scraping** : Certains sites bloquent le scraping. Firecrawl gère mieux les sites complexes.
- **Voix multilingue** : Utiliser le modèle `eleven_multilingual_v2` pour supporter toutes les langues.
- **Résumé optionnel** : Passer par Lovable AI (Gemini/GPT) pour résumer ou nettoyer le texte avant lecture.

---

## 📂 Fichier .lovable/knowledge-base.md

- Ce fichier est le journal interne des décisions d'architecture, règles métier et apprentissages du projet.
- Il n'est **PAS accessible via une URL publique**.
- Pour le consulter :
  - **Code Editor Lovable** : icône code en haut du preview → naviguer vers `.lovable/knowledge-base.md`
  - **GitHub** : si le projet est connecté à GitHub, le fichier est visible dans le repo.
- Ce fichier est différent de la table `knowledge_entries` (Base IA du backoffice) qui stocke les connaissances consultables par l'IA conversationnelle.

---

## 📌 Conventions de communication

### Terme "Connaissances" / "KB"
- Quand l'utilisateur parle de **"connaissances"** ou **"KB"**, cela signifie **toujours** la table `knowledge_entries` du backoffice (Base IA), et **jamais** le fichier `.lovable/knowledge-base.md`.
- L'insertion doit se faire via un `INSERT` dans la table `knowledge_entries` avec les champs appropriés (title, content, category, tags…).
