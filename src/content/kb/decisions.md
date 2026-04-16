# Décisions techniques validées

Choix architecturaux actés. Ne pas remettre en question sans demande explicite.

## MediaBackground isolé du flux navigation

**Décision :** Le fond média d'un slidepanel ne doit pas être affecté par l'ouverture/fermeture des overlays ni par la navigation entre fiches partageant la même source.

**Implémentation :**
- Communication avec iframe YouTube via `postMessage` (mute/pause/play). Ne **jamais** vider `iframe.src`.
- Hook `useVideoSync` pour synchroniser play/pause/mute sans manipulation DOM depuis le parent.
- `key` du `<video>` / `<iframe>` basé sur `effectiveMedia.url` uniquement.

## URL cosmétique pour les slidepanels

Les slidepanels rewriten l'URL via `window.history.replaceState` sans recharger la page. La route `/fiche/:slug` redirige vers `/search?openBusiness=ID` pour préserver le contexte de recherche.

## Recherche : ranking global

Voir `mem://logic/search/global-ranking-policy-v2-priority-score`.
- Match exact du nom > match en début de mot > ts_rank
- `wtuce_status = 'verified'` remonte
- Tri final : `priority_score DESC NULLS LAST`

## Booking strictement basé sur prix réel

`min_price` ou `manual_price_range` requis. Jamais `gamme_id`.

## Authentification backend

Lovable Cloud (Supabase géré). RLS partout. Rôles dans `user_roles` (jamais sur la table profiles).
