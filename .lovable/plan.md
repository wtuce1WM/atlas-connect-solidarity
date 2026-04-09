
# Plan : Pagination serveur de business-search

## Contexte
Actuellement l'edge function retourne 500 résultats en une fois. On veut passer à 20 résultats paginés côté serveur pour améliorer la vitesse de réponse initiale.

## Étape 1 — Edge function : ajouter `offset` et `totalCount`
- Ajouter un paramètre `offset` (défaut: 0) dans `SearchParams`
- Le `limit` passe à 20 par défaut
- Ajouter un `COUNT(*)` SQL systématique (pas seulement quand on atteint la limite) pour retourner `totalCount` à chaque réponse
- Le `COUNT(*)` doit utiliser les **mêmes filtres** que la requête principale (ville, catégorie, service, neighborhood, etc.)
- Le tri doit rester stable (`ts_rank` + `priority_score` + `wtuce_status`) pour que offset fonctionne

## Étape 2 — Front-end : adapter SearchPage
- Passer `limit: 20, offset: 0` dans l'appel initial
- Stocker `totalCount` dans un state pour l'affichage du compteur
- Quand l'utilisateur change de page (pagination), relancer l'edge function avec le bon `offset`
- La carte Google affiche uniquement les marqueurs de la page courante (les 20 affichés)
- Les filtres client (ville, service, horaires, engagements) dans `filteredBusinesses` restent en place pour les pages taxonomiques mais sont **bypassés** quand les résultats viennent de l'edge function paginée

## Étape 3 — Gestion de la détection (sous-catégorie, catégorie, ville)
- Les métadonnées de détection (`detectedSubcategory`, `detectedCity`, etc.) ne changent pas — elles sont déjà calculées côté serveur sur l'ensemble des résultats
- Le `totalCount` servira pour le compteur affiché dans l'UI

## Points d'attention
- Le LLM rerank ne s'applique que sur les 20 premiers résultats (déjà le cas, il traite le top 20)
- Les pages taxonomiques (ville, catégorie) continuent d'utiliser leurs propres requêtes Supabase directes — pas impactées
- La pagination ne casse pas le SEO (les pages taxonomiques sont indépendantes)
- Le `search_logs` doit logger le `totalCount` et non plus `businesses.length`
