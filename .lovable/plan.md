# Brancher l'onglet IA de /search sur le moteur V2

Objectif : l'onglet IA de /search cesse d'utiliser `ai-search-answer` (logique 2025, pool d'établissements envoyé par le client) et consomme le moteur A/B/C partagé, comme /club et /embed. Le bloc vidéo `media[]` arrive ensuite, une fois les 3 surfaces sur le même contrat.

## Principe

Une seule fonction moteur, trois surfaces. `embed-ai-chat-v2` devient générique : le `hostBusinessId` cesse d'être obligatoire, et la surface est portée par le body (`surface: "search" | "embed" | "club"`). /search envoie un contexte de recherche (ville active, filtres, requête) au lieu d'un pool de 200 fiches.

```text
/club      ─┐
/embed/ask ─┼─> moteur A/B/C (classify → routes → editorial → génération)
/search IA ─┘        + marqueurs SHOW_ON_MAP / KNOWN_BUSINESSES / (bientôt) MEDIA
```

## Ce qui change côté serveur

1. `embed-ai-chat-v2/index.ts`
   - `businessSlug` devient optionnel ; si absent, exiger `surface` et une ville (`activeCity`).
   - Nouveau champ de body : `activeCity`, `userCoords`, `searchContext` (requête initiale, filtres actifs).
   - `SURFACE_LOG` dérivé du body (`search_v2`) pour garder la comparaison V1/V2 dans les logs.
   - Aucune régression /embed : mêmes valeurs par défaut quand `businessSlug` est fourni.
2. `_shared/ai-engine/surfaces.ts` : la config `search` (ton, `historyTurns`, longueur de réponse) devient réellement utilisée.
3. Routes curatées : `matchCuratedByText` déjà `crossSurface` — on l'appelle avec `surface: "search"`.

## Ce qui change côté client

1. `src/pages/SearchPage.tsx`
   - Les tours de l'onglet IA (`invoke("ai-search-answer")`) passent sur `embed-ai-chat-v2` en mode streaming, avec le même parsing des marqueurs que `EmbedAsk` (KNOWN_BUSINESSES → pool carousel/carte, SHOW_ON_MAP → marqueurs).
   - On garde l'UX existante : bulles, scroll, carousel, carte, `clarify` si renvoyé.
2. `src/components/AISearchAnswer.tsx` : la réponse d'ouverture (au chargement des résultats) utilise le même appel, sans pool de fiches.
3. `src/components/overlays/PanelAiOverlay.tsx` : aligné sur le même appel.
4. Un helper partagé `src/lib/aiEngineClient.ts` : appel streaming + extraction des marqueurs, réutilisé par les 3 points d'appel (aujourd'hui dupliqués).

## Ce qui ne change pas

- `ai-search-answer` reste déployée et intacte : bascule pilotée par `?engine=v2` puis par défaut une fois mesuré.
- Le tri, les filtres, la carte et le carousel de /search : le moteur ne fait que fournir texte + ids.
- Pas de vidéos dans cette étape.

## Étape suivante (hors périmètre ici)

Contrat `media[]` déterministe (badge + #Vlogs/#Culture…) émis par le moteur et ouvert dans `BookOnlineSlidePanel`, consommé identiquement par les 3 surfaces.

## Détails techniques

- Streaming : `embed-ai-chat-v2` renvoie un UIMessageStream (AI SDK v5). Côté /search, lecture du flux par `fetch` sur `/functions/v1/embed-ai-chat-v2` (comme EmbedAsk), pas `functions.invoke`.
- Logs : `ai_conversation_turns.surface = "search_v2"`, pour comparer à `search` (V1) sur 14 jours avant bascule par défaut.
- Garde-fou : si le moteur ne renvoie ni texte ni ids, on retombe silencieusement sur l'ancien appel (une seule fois, loguée) pendant la phase de mesure.
