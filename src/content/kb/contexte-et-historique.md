# Contexte et historique — ne pas perdre la contextualisation

L'IA de Lovable a une fenêtre de contexte limitée. Sur un projet long et complexe, elle peut oublier des règles, des décisions ou des nuances passées. Ce fichier liste les règles de reprise pour éviter ce phénomène.

## Pourquoi le contexte se perd

- Les conversations très longues dépassent la fenêtre de contexte du modèle.
- Les outils et résultats intermédiaires ne sont pas toujours réinjectés dans la mémoire active.
- Une demande vague force l'IA à deviner plutôt qu'à se référer à une règle établie.
- Les allers-retours rapides sur plusieurs sujets peuvent écraser la priorité du moment.

## Règles de sauvegarde du contexte

1. **Règles durables = KB ou mémoire projet.** Toute préférence, contrainte ou décision d'architecture doit être écrite dans l'onglet Connaissances (KB) ou dans `mem://` du projet.
2. **Un seul sujet par message.** Mélanger bug + nouvelle fonction + question produit dans un même tour dilue le contexte.
3. **Reprendre un chantier : donner le fichier source de vérité.** Au début d'un message de reprise, indiquer le fichier, la fonction ou la route concernée.
4. **Copier-coller la règle pertinente.** Si une décision ancienne compte, citer la ligne ou le fichier KB plutôt que laisser l'IA la deviner.
5. **Pas de « tu sais, comme l'autre fois ».** Reformuler brièvement la décision ou l'exception, surtout s'il y a eu des exceptions.

## Comment reprendre une session efficacement

```text
Chantier : [nom du chantier en cours]
Fichier : [chemin exact]
État actuel : [ce qui est en place / ce qui marche]
Problème : [symptôme exact ou écart]
Attendu : [résultat précis]
Contrainte : [règle à respecter, issue du KB si possible]
```

## Ce qui ne doit pas être recalculé à chaque fois

- Les décisions de design : couleurs, typographies, règles de composants.
- Les règles métier : pas de `gamme_id` pour le prix, booking via `min_price` / `manual_price_range`.
- Les architectures partagées : moteur `/search`, `BlogArticleTemplate`, `Club AI`, `Studio Vidéo`.
- Les seuils éditoriaux : tu les donnes, l'IA ne les invente pas.

## En résumé

- **Historique** : aide, mais n'est pas fiable sur le long terme.
- **KB + mémoire** : la source de vérité stable.
- **Message de reprise** : précis, réancré, un seul sujet.
