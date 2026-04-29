UPDATE public.knowledge_entries
SET content = $kb$## Comportement

Le son des vidéos suit une **préférence utilisateur persistée** dans `localStorage` (clé `videoSoundPreference`) :

- **Par défaut : muet** (contrainte navigateur — autoplay avec son bloqué tant qu'aucune interaction n'a eu lieu).
- À la **1ère ouverture vidéo** : muet, l'utilisateur voit l'icône 🔇 et peut activer le son.
- Dès qu'il **clique unmute**, la préférence devient `on` et est stockée.
- **Toutes les vidéos suivantes** (suivant/précédent, nouveau panel, nouvelle session, autre onglet) démarrent **avec son**.
- Symétrique : remettre mute → muet partout.

## Implémentation

- Hook : `src/hooks/useVideoSoundPreference.ts`
  - Lit/écrit `localStorage`.
  - Sync entre instances via `CustomEvent('video-sound-preference-change')` + event natif `storage` (multi-onglets).

## Périmètre couvert

- ✅ `SlidePanelHome` (file, YouTube, Vimeo) — vignettes Home et Search.
- ✅ `VideoDocumentOverlay` (file, YouTube, Vimeo, Bunny) — overlay vidéos plein écran de la fiche immersive (`BookOnlineSlidePanel`).
- ❌ Vidéo de **fond** de la fiche immersive (`MediaBackground` via `BookOnlineSlidePanel`) — **volontairement toujours muted** (mode background : la vidéo joue en fond et les overlays gèrent le son).

## Note sur `business.default_sound_on`

La colonne DB `businesses.default_sound_on` (config par établissement) est désormais **supplantée par la préférence utilisateur** dans `VideoDocumentOverlay`. La prop `defaultSoundOn` reste dans la signature pour rétrocompat mais n'est plus lue. À supprimer plus tard si on confirme qu'on n'en a plus besoin.

## Pourquoi pas un cookie / DB ?

`localStorage` suffit : préférence par appareil, pas besoin de compte, pas de friction RGPD (donnée fonctionnelle non personnelle).$kb$,
    updated_at = now()
WHERE title = 'Préférence son vidéo persistée (mute/unmute)';