# Popup Club bleu depuis « Sauvegarder »

## Changement
- Remplacer l’ancien popup beige appelé par le CTA « Sauvegarder » de l’article par le popup bleu déjà utilisé par le CTA Profil du slidepanel.
- Réutiliser à l’identique son titre, son texte et son formulaire de connexion/inscription.
- Fermer automatiquement le popup après une connexion réussie, sans changer la logique de sauvegarde pour un membre déjà connecté.

## Périmètre technique
- Modifier uniquement le modèle d’article de blog.
- Retirer l’ancienne instance du popup Club de cette page et monter la source commune `ClubBlueAuthPopup` avec `ClubAuthPanel`.
- Vérifier en rendu mobile que « Sauvegarder » ouvre bien le popup bleu et que la fermeture fonctionne.
