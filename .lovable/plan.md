# Plusieurs modèles de site vitrine

## Objectif
Pouvoir choisir, pour chaque établissement, un modèle de vitrine différent sur `/staff/backoffice/sites`. Les contenus déjà saisis (accroche, histoire, galerie, réservation, avis, météo, blog…) restent les mêmes : seul le rendu change.

## Ce que vous verrez
- Dans `/staff/backoffice/sites`, un nouveau choix « Modèle » avec un aperçu miniature de chaque modèle.
- Le modèle actuel s'appelle « Premium » et reste celui par défaut : Riad Dar Najat et les autres vitrines ne changent pas.
- Un bouton « Prévisualiser » ouvre la vitrine avec le modèle choisi avant de l'enregistrer.

## Étapes
1. **Socle** : ajouter le champ « modèle » à chaque vitrine (valeur par défaut « premium ») et le sélecteur dans le back-office.
2. **Découpage du modèle actuel** : séparer les blocs communs (header, galerie, réservation Elloha/WhatsApp, avis, météo, blog, carte, Zitoun IA, PWA) des choix de mise en page. Rendu de Dar Najat strictement identique, contrôlé par capture avant/après.
3. **Modèle n°2** : construit à partir des mêmes blocs, avec une mise en page différente (à définir avec vous).
4. **Modèles suivants** : chacun s'ajoute ensuite sans toucher aux précédents.

## Questions à trancher avant l'étape 3
- Combien de modèles au départ, et pour quels types d'établissements (riad/hôtel, restaurant, activité/excursion, boutique…) ?
- Le style de chaque modèle : par exemple « Clair & aéré », « Magazine », « Minimal ».
- Les sections propres à un type : menu pour un restaurant, programme pour une excursion, etc.
- Qui choisit le modèle : le staff seulement, ou l'affilié aussi ?

## Détails techniques
- Migration additive : `business_showcase_site.template text NOT NULL DEFAULT 'premium'`, avec une contrainte limitant les valeurs connues. Pas de changement aux politiques d'accès existantes.
- `ShowcaseSite.tsx` garde le chargement des données et les blocs partagés, puis choisit une mise en page selon `template` (`src/components/showcase/templates/PremiumTemplate.tsx`, puis les suivantes). Repli sur `premium` si la valeur est inconnue.
- Prévisualisation : paramètre `?template=` lu uniquement pour le staff connecté.
- Règle d'architecture ajoutée dans AGENTS.md.
