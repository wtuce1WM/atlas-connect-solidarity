---
name: Horaires non publiés = ouvert 24h/24
description: Règle globale — si "Afficher les horaires sur la fiche publique" est décoché, le business est traité comme ouvert 24h/24 (filtres "Ouverts maintenant", relances horaires)
type: feature
---

Règle 1WM (à appliquer dans tous les développements horaires) :

- `show_opening_hours = false` (case « Afficher les horaires sur la fiche publique » décochée) ⇒ le business est considéré **ouvert 24h/24** pour les filtres et relances horaires (ex. « Ouverts maintenant »), au lieu d'être exclu.
- Le champ `is_open_24h` est en fin de vie : Julien prévoit de le supprimer. Ne pas construire de nouvelle logique qui en dépende seul ; toujours combiner `is_open_24h === true || show_opening_hours !== true`.
- Implémenté dans : `_shared/ai-engine/routes/opening.ts` (buildOpenFilter), `embed-ai-chat-v2/index.ts` (flag `hasHours` du POOL marker), `src/pages/EmbedAsk.tsx` (affichage du badge « Ouverts maintenant »).
