# Embed IA affilié — parité avec /club

## Objectif
`/embed/ask/:slug` doit avoir les mêmes capacités que le chat IA de `/club` (recherche, events, blog RAG, cartes Google Maps, marqueurs), mais scopé "complémentaires seulement" : jamais un concurrent direct de l'établissement hôte.

## Architecture retenue
Plutôt que dupliquer 3300 lignes de `club-ai-chat`, on **étend `club-ai-chat`** avec un mode `embedContext` et on **remplace `embed-ai-chat`** par un simple proxy anon → `club-ai-chat`.

```
EmbedAsk (anon)  →  embed-ai-chat (proxy public)  →  club-ai-chat (tools + payloads)
```

`embed-ai-chat` :
- reste public (pas d'auth requise, `verify_jwt = false`)
- résout `slug` → business record (id, category_id, city, subcategory_ids)
- appelle `club-ai-chat` en interne (service role) avec un `embedContext` construit
- re-stream le SSE tel quel vers le client

## Modifs `club-ai-chat`
1. Accepter `embedContext?: { businessId, businessName, city, excludeCategoryId, excludeSubcategoryIds[] }` dans le body.
2. Si présent :
   - Injecter dans le system prompt : *"Tu es intégré sur le site de {name} à {city}. Propose UNIQUEMENT des choses complémentaires — activités, events, restos/bars/cafés à proximité, expériences. NE JAMAIS proposer un concurrent direct (même category_id/subcategory_ids que l'hôte). Si l'utilisateur demande un concurrent, redirige vers ce que {name} propose."*
   - Passer `excludeCategoryId` + `excludeSubcategoryIds` au tool `search_businesses` comme filtre dur post-résultats.
   - Biaiser la ville par défaut sur `city` de l'hôte (sauf demande explicite d'une autre ville).
   - Sauter la persistance (`ai_chats`, `ai_conversation_turns`) → mode éphémère.
   - Désactiver les analytics user-scoped.

## Modifs `embed-ai-chat`
- Retire l'appel direct au gateway ; devient proxy vers `club-ai-chat`.
- Lit le business (id, category_id, subcategory_ids depuis `business_subcategories`, city, name).
- Construit `embedContext` et forward messages + language.
- Re-stream SSE sortant.

## Modifs `EmbedAsk.tsx`
Ajout du rendu des payloads SSE (mêmes markers HTML que `ClubAiAssistant`) :
- `<!--SHOW_ON_MAP:...-->` → bouton "Voir sur la carte" ouvrant `MapSlidePanel`.
- `<!--EVENTS_SNAPSHOT:...-->` → carte events + `EventsSlidePanel`.
- `<!--BLOG_CARDS:...-->` → mini-carrousel articles.
- `<!--KNOWN_BUSINESSES:...-->` → carrousel cartes établissements avec ouverture `BookOnlineSlidePanel`.
- Extraction via une fonction utilitaire commune extraite de `ClubAiAssistant` vers `src/lib/embed/aiPayloads.ts` (partagée).

## Livrables techniques
- `supabase/functions/club-ai-chat/index.ts` — ajout branche `embedContext`
- `supabase/functions/embed-ai-chat/index.ts` — réécriture proxy
- `src/lib/embed/aiPayloads.ts` — extraction payloads (nouveau, partagé)
- `src/pages/EmbedAsk.tsx` — carrousels + slidepanels
- `src/components/embed/EmbedBusinessCarousel.tsx`, `EmbedMapPanel.tsx`, `EmbedEventsPanel.tsx`, `EmbedBlogCarousel.tsx` — variantes légères sans dépendance auth/Club

## Points de contrôle
1. Une question générique ("où boire un thé à la menthe près d'ici ?") → liste de complémentaires, jamais l'établissement hôte ni un concurrent même-catégorie.
2. "Que se passe-t-il ce week-end ?" → events de la ville de l'hôte, panneau vertical.
3. "Un restaurant marocain autour" (si l'hôte est un restaurant marocain) → l'IA redirige vers ce que l'hôte propose plutôt que lister des concurrents.
4. Marqueurs Google Maps cliquables → ouvrent le panneau carte.
5. Anon strict : aucune écriture en DB, aucune session Club consultée.

## Non-inclus (pour un chantier suivant si utile)
- Bookings/réservation via l'embed
- Bookmarks / partage de conversation
- Historique persistant côté visiteur
