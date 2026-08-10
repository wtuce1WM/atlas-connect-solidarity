# Résolveur taxonomique partagé

## Constat mesuré

Sur 14 439 recherches (25/02 → 10/08, hors autocomplete) :

- **188 (1,3 %)** renvoient zéro résultat, dont **163** portent sur un terme qui existe pourtant en base.
- **2 857 (19,8 %)** contiennent un libellé de service réel sans que `detected_subcategory` soit renseigné — et renvoient quand même des résultats. L'échec est donc **invisible** dans les métriques actuelles.
- `quad marrakech` : 0 résultat 16 fois, alors que 6 libellés de services actifs et **32 établissements** couvrent le quad.
- 66 lignes `search_synonyms` dont seulement 29 ont `service_names`, 23 `subcategory_names`, 1 `commodity_filters`, 0 `engagement_filters`.

Cause racine identifiée dans le code : la détection de services existe, mais **uniquement dans `business-search`** (≈ lignes 2619-3063, plus la détection de sous-catégories lignes 1310-1660). Le moteur IA ne la possède pas : `_shared/ai-engine/routes/nearby.ts` filtre sur `categories` et `main_category` seulement, jamais sur `services`. C'est pourquoi le classifieur qui renvoie `category: "piscine"` produit zéro ou de mauvais résultats.

Le problème n'est ni la donnée ni l'absence d'index : c'est **une logique de résolution enfermée dans une seule fonction et non partagée**.

## Objectif

Une seule autorité de résolution « terme utilisateur → cible typée », utilisée par `business-search` et par le moteur IA, plus une métrique qui rend visible le trou silencieux.

## Ce qui est construit

### 1. `_shared/taxonomy-resolver.ts` (nouveau)

Module pur, sans dépendance à une surface. Entrée : le texte de la requête. Sortie : une liste de cibles typées, ordonnées par force de correspondance.

```text
resolve("piscine à proximité")
  → [ { type: "service",     value: "Piscine",   strength: "exact",   source: "services.name_fr" },
      { type: "subcategory", value: "Piscine",   strength: "keyword", source: "subcategories.keywords" } ]

resolve("quad marrakech")
  → [ { type: "service",     value: "Quad",              strength: "exact" },
      { type: "service",     value: "Excursions en quad", strength: "exact" },
      { type: "city",        value: "Marrakech" } ]
```

Types de cible : `category`, `subcategory`, `service`, `badge`, `engagement`, `commodity`, `city`, `neighborhood`.

Sources consultées, dans cet ordre de priorité :
1. `subcategories.name_fr` / `name_en` / `name_ar`
2. `subcategories.keywords`
3. `services.name_fr` (1 610 actifs, 1 269 libellés distincts)
4. `services.keywords`
5. `search_synonyms` (`key_word` + `synonyms` → `subcategory_names`, `service_names`, `badge_id`, `commodity_filters`, `engagement_filters`)
6. `categories`

Le vocabulaire est chargé une fois et mis en cache mémoire (même schéma que le cache synonymes existant de `business-search`).

Règle stricte : le résolveur **ne décide jamais** du filtrage. Il retourne des cibles typées ; c'est l'appelant qui choisit filtre dur ou facteur de ranking. Un service reste un facteur, jamais un filtre éliminatoire — conformément au principe déjà retenu pour les points de vue.

### 2. Câblage du moteur IA

- `classify.ts` : le classifieur ne produit plus une catégorie devinée. Il renvoie un `term` et un type d'intention ; la résolution est faite après coup par le résolveur contre le vocabulaire réel. Fin des `category: "piscine"` inventées.
- `routes/nearby.ts` : les cibles de type `service` sont ajoutées aux requêtes, en `overlaps` sur `services[]`, en parallèle des passes `categories` / `main_category` existantes.
- Aucune route existante n'est réécrite : on ajoute une passe de requête, on ne touche pas au formatage des réponses.

### 3. Câblage de `business-search`

La logique actuelle est **remplacée par un appel au résolveur**, pas dupliquée. Les branches impératives de détection de sous-catégories et de services délèguent au module partagé ; les règles spécifiques déjà validées (override multi-mots, collapse de services synonymes, protection des filtres appariés) sont conservées et appliquées **au-dessus** du résultat du résolveur.

C'est le point le plus délicat du chantier : extraction à l'identique du comportement, pas réécriture. Vérifié par les tests existants de `business-search/index.test.ts`, complétés.

### 4. Métrique de résolution

Nouvelles colonnes sur `search_logs` : les cibles résolues et leur type, plus un indicateur « non résolu ». Même chose côté `ai_conversation_turns`.

Un bloc « Résolution » est ajouté au dashboard Backoffice / IA :
- taux de requêtes sans aucune cible résolue ;
- taux de requêtes résolues via `services` seulement (celles qui étaient jusqu'ici invisibles) ;
- top des termes non résolus, pour piloter le remplissage.

C'est ce dernier point qui remplace le faux signal « taux d'erreur 0 % ».

### 5. Remplissage ciblé

Une fois la métrique en place, complément des `search_synonyms` sans mapping (37 lignes), en priorité sur les termes réellement observés dans les logs. Travail de données, pas de code, guidé par le top des non-résolus.

## Hors périmètre

- Aucun `tsvector`, aucun index plein texte : `description`, `hook` et textes IA restent non indexés à cette étape. C'est un chantier séparé, à traiter après mesure du gain du résolveur.
- La route `reviews` à double mode reste un chantier indépendant.
- `rooftop mer vue marrakech` (17 échecs) relève de la logique de point de vue déjà identifiée, pas du résolveur.
- `business_menu_summaries` → `business_ai_texts` : migration de contenu à traiter à part.

## Ordre d'exécution

1. `_shared/taxonomy-resolver.ts` + tests unitaires sur les cas mesurés (`piscine`, `quad`, `vélo électrique`, `langouste`, `restauration`).
2. Métrique de résolution (migration + logs), en observation seule.
3. Câblage moteur IA (`classify` + `nearby`).
4. Extraction dans `business-search`, à comportement constant.
5. Lecture des métriques, puis remplissage des synonymes.

Les étapes 1 et 2 ne changent aucun résultat visible : elles installent l'autorité et la mesure. Rien n'est basculé avant d'avoir des chiffres.

## Détails techniques

- Nouveau fichier : `supabase/functions/_shared/taxonomy-resolver.ts`.
- Modifiés : `_shared/ai-engine/classify.ts`, `_shared/ai-engine/routes/nearby.ts`, `business-search/index.ts`, `business-search/index.test.ts`.
- Migration : colonnes de résolution sur `search_logs` et `ai_conversation_turns`.
- Front Backoffice : bloc « Résolution » dans le dashboard IA existant.
- Normalisation partagée : minuscules, suppression des accents, correspondance sur frontière de mot pour éviter les faux positifs du type `Lunettes de piscine` sur `piscine`.
