# Mode `pinIds` — page Search

Le mode `pinIds` est un mode spécial de la page Search où **la liste des établissements à afficher est imposée par l'URL** (paramètre `?pinIds=id1,id2,id3...`), au lieu d'être calculée par le moteur de recherche.

## Comment ça marche

- L'URL contient une liste explicite d'IDs d'établissements.
- La page ne fait pas de recherche texte/catégorie : elle charge exactement ces IDs, **dans l'ordre fourni**.
- Les filtres habituels (ranking global, score, tri par ville) sont court-circuités.

## Quand c'est utilisé

- **Carrousels vidéo de la homepage** → un clic sur "voir les résultats" envoie la liste exacte des établissements du carrousel (ex : Piscines + Marrakech).
- **Onglet "Voir liste"** depuis un filtre Front Structure sur la carte.
- **Pages `/fiche/:slug`** qui redirigent vers un groupe KP.

## Conséquences techniques

- **Pagination 100 % côté client** : tous les IDs sont déjà chargés au premier fetch, changer de page ne déclenche aucun refetch serveur (garantit la cohérence entre pages).
- **Vignettes verrouillées prioritaires** : si un `business_document` a `thumbnail_locked = true` pour le badge + la ville de l'URL, son image remplace l'image n°1 de l'établissement sur la card.
- **Filtre badge vidéo-niveau** : si `pinBadge` (ou `label`) est présent, les établissements sans vidéo portant ce badge dans la ville sont retirés — même s'ils ont le badge au niveau business.
- **Tolérance singulier/pluriel** sur la résolution du badge depuis le `label` (ex : "Piscines" URL ↔ "Piscine" base).
- **Carte suggestion IA** : affichée même en mode `pinIds` (case n°4 des résultats).

## En résumé

C'est un mode « liste figée » garantissant la cohérence entre ce que l'utilisateur a vu (carrousel, carte, fiche) et ce qu'il retrouve sur la page Résultats.
