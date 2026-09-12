# Animation d'aide au swipe sur les feeds Home mobiles

## Objectif
Afficher à chaque ouverture d’un feed vidéo sur la version mobile de Home une surimpression temporaire inspirée de l’exemple TikTok, sans reprendre son habillage.

## Mise en œuvre
- Ajouter l’animation dans le composant commun à tous les feeds vidéo de Home.
- Afficher un pictogramme téléphone/doigt et le texte « Balayez vers le haut pour voir plus ».
- Lancer l’animation une seule fois à l’ouverture du feed, puis la faire disparaître automatiquement.
- Ne pas bloquer les taps ni les swipes pendant l’animation.
- Ne rien afficher sur desktop et ne pas relancer l’animation à chaque vidéo du même feed.

## Vérification
- Contrôler l’ouverture d’un feed Home en format iPhone et en desktop.
- Vérifier que le swipe reste utilisable et que l’animation disparaît seule.
