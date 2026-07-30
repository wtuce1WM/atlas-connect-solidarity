# Méthode de travail — économiser les crédits Lovable

Objectif : réduire fortement la consommation de crédits sans ralentir le développement.
Le principe unique : **moins l'IA doit deviner, moins ça coûte.**

## Les 5 règles de base

1. **Un message = une intention.** Pas de « et tant qu'on y est ».
2. **Bug = repro exacte** + ce que je vois + ce que j'attends. Jamais « ça marche pas ».
3. **Réflexion produit / architecture / rédaction → Claude ou ChatGPT.** Écriture de code → Lovable.
4. **SQL de curation (Top 20, seuils éditoriaux) : les seuils sont donnés**, l'IA n'explore pas la base pour les deviner.
5. **Nouvelle fonctionnalité = un plan validé en une phrase** avant toute modification de code.

## Ce qui coûte cher

- Les tours où l'IA doit **relire beaucoup de code** pour comprendre le contexte.
- Les demandes floues qui déclenchent une exploration du projet.
- Les allers-retours de correction sur un symptôme mal décrit.
- Les refactorings implicites (« nettoie aussi pendant que tu y es »).

## Ce qui fait économiser

- **Donner le chemin exact du fichier** : « dans `StudioVideoScenarioPanel.tsx`, change X » coûte une fraction d'une demande vague.
- **Découper finement** : un prompt = un fichier ou une fonction.
- **Copier-coller le message d'erreur** exact plutôt que de le décrire.
- **Regrouper les micro-changements** d'un même fichier dans un seul message.
- **Réutiliser l'existant** : pointer le composant/moteur à réutiliser (`BlogArticleTemplate`, moteur `/search`) au lieu de laisser l'IA en recréer un.

## Modèle de prompt efficace

```text
Fichier : src/pages/StudioVideo.tsx
Symptôme : le bouton « Générer la vidéo » s'affiche avant la prévisualisation.
Attendu : il n'apparaît qu'après clic sur « Prévisualiser le scénario ».
Périmètre : ce fichier uniquement, pas de refactoring.
```

## Répartition des outils

| Tâche | Outil |
|---|---|
| Idées, arbitrages produit, comparaison d'approches | ChatGPT / Claude |
| Rédaction éditoriale (articles, textes marketing) | ChatGPT / Claude |
| Spécification technique et découpage des tickets | ChatGPT / Claude |
| Écriture, correction et déploiement du code | Lovable |
| Requêtes SQL de curation | Seuils décidés hors Lovable, exécution dans Lovable |

## À éviter

- Les demandes multiples empilées dans un seul message long et mouvant.
- Laisser l'IA choisir les critères éditoriaux à ma place.
- Relancer une génération sans avoir lu la cause racine de l'échec précédent.
