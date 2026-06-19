---
name: Voice search overlay scope
description: L'overlay vocal du PanelSearchBar reste borné à son conteneur (slidepanel droit), jamais fullscreen
type: constraint
---
L'overlay de recherche vocale (`VoiceSearchOverlay`) rendu par `PanelSearchBar` doit rester **contenu** dans son conteneur parent via `OverlayShell` + prop `contained`. **Why:** quand un slidepanel droit est ouvert sur /search (Google Map ou BookOnline), l'overlay doit s'ouvrir au-dessus du slidepanel uniquement, jamais en fullscreen sur toute la page.

**Interdit :**
- `createPortal` vers `document.body` ou tout sélecteur global pour cet overlay
- `position: fixed` couvrant tout le viewport
- Toute indirection (querySelector `.slidepanel-container`, etc.) — ce sélecteur n'existe pas dans le DOM (le slidepanel utilise la classe `.n`), le fallback `document.body` rend l'overlay fullscreen.

**Solution correcte (en place) :** dans `src/components/PanelSearchBar.tsx`, wrapper `<OverlayShell zClass="z-[91]" coverToolbar={!noToolbarOffset}>` + `<VoiceSearchOverlay … contained />`.
