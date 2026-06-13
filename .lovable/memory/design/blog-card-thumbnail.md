---
name: Blog card thumbnail = hero image
description: Règle des vignettes des cartes d'articles dans /blog
type: design
---
Pour chaque article de blog listé dans `/blog`, la vignette de la carte
doit utiliser **la 1ʳᵉ image de la 1ʳᵉ fiche (entrée) listée dans l'article**.
C'est exactement la même image que celle utilisée comme hero de l'article
(cf. `BlogArticleTemplate` : `businesses[entries[0].id].images[0]`).

Implémentation : dans `src/pages/Blog.tsx`, fetch direct par `id` de la
1ʳᵉ fiche de l'article (pas de requête par catégorie/service).
