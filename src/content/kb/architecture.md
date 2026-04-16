# Règles d'architecture

Ces règles s'appliquent à chaque modification de code. L'IA doit les relire avant toute action.

## 1. Diagnostic avant action

**Toujours nommer la cause racine avant de patcher.** Pas d'édition tant que je n'ai pas écrit explicitement :
- Quel est le symptôme observé ?
- Quel est le mécanisme sous-jacent (état React, cycle de vie, layout CSS, ordre de rendu, etc.) ?
- Quelle est la racine architecturale (couplage, isolation manquante, effet de bord) ?

## 2. Isolation des couches

Une couche visuelle (ex : média de fond d'un slidepanel) ne doit **jamais** dépendre des états transitoires d'autres couches (overlays, navigation, toolbar). 

Outils d'isolation à privilégier :
- `contain: layout paint` + `isolation: isolate` en CSS
- `key` stable basé sur l'identité de la donnée, pas sur des états annexes
- Hooks dédiés (`useVideoSync`, `useMediaItems`) plutôt que `useEffect` pilotés depuis le parent

## 3. Découplage navigation / lecture

La navigation entre fiches ne doit **jamais** :
- Forcer le rechargement d'une iframe (ne pas vider `iframe.src`)
- Réinitialiser l'aspect ratio d'une vidéo sans changement de source réel
- Déclencher des effets sur l'overlay quand seule la fiche change

Communication avec une iframe YouTube : `postMessage` (pause/mute/play), jamais réinitialisation de `src`.

## 4. Pas de patch sur symptôme

Si un bug réapparaît après correction : c'est que la cause racine n'a pas été traitée. Stop, re-diagnostiquer.
