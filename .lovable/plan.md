# Stabiliser les résultats de disponibilité

## Correction
- Associer chaque recherche de disponibilité au business qui l’a déclenchée.
- Ignorer toute réponse devenue obsolète après un scroll vers un autre business.
- Empêcher une ancienne recherche de modifier le chargement ou le fallback du business affiché.

## Vérification
- Contrôler le typage.
- Vérifier qu’un aller-retour scroll bas/haut conserve exactement le même état de disponibilité pour un même business.

## Détail technique
Le hook de disponibilité utilisera un identifiant de génération et l’identifiant du business courant. Seule la dernière requête encore rattachée au business affiché pourra écrire son résultat.
