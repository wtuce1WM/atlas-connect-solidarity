# Plan de migration Embed IA → AI SDK

## Objectif

Migrer `embed-ai-chat` (edge function) et `EmbedAsk.tsx` (front) du `fetch` SSE custom vers l'AI SDK officiel + provider Lovable AI Gateway, **sans casser** les routes déterministes existantes (weather, events, search, map, nearby overview, POI nearby, blog RAG, suggestions ciblées, followups paramétrables).

## Principe directeur

Les routes déterministes (météo, events, search filtré, map, nearby, POI, count disclosure, pin-to-top) sont notre valeur ajoutée : elles restent **en amont** de l'AI SDK. L'AI SDK ne remplace que la partie "appel LLM + streaming" quand aucune route déterministe ne matche.

```text
requête ──► routeur déterministe ─┬─► réponse figée (weather/events/nearby/POI/...)
                                  └─► fallback ──► AI SDK streamText ──► toUIMessageStreamResponse
```

## Étapes

### 1. Helper partagé Lovable AI Gateway
- Créer `supabase/functions/_shared/ai-gateway.ts` avec `createLovableAiGatewayProvider` (pattern `ai-sdk-lovable-gateway`, header `Lovable-API-Key`, `X-Lovable-AIG-SDK: vercel-ai-sdk`, capture `X-Lovable-AIG-Run-ID`).
- Réutilisable par toutes les edge functions IA (club-ai-chat, embed-ai-chat, futures).

### 2. Refactor `embed-ai-chat` — couche routeur (inchangée)
- Garder tel quel : détection langue, cache sémantique, routes weather/events/nearby/POI/count, pin-to-top, filtre `closure_message`, blog RAG, suggestions ciblées (subcategories/badges/city/destinations/business_ids), followups (radius_km, mode).
- Ces routes retournent déjà des `Response` SSE fabriquées manuellement → à convertir en `createUIMessageStream` de l'AI SDK pour parler le même protocole que le fallback LLM.

### 3. Refactor `embed-ai-chat` — couche LLM (migrée)
- Remplacer le `fetch` direct vers `/chat/completions` + parsing SSE par :
  ```ts
  const result = streamText({ model: gateway("google/gemini-3.6-flash"), system, messages });
  return result.toUIMessageStreamResponse({ headers: corsHeaders });
  ```
- Les marqueurs actuels (`<!--SHOW_ON_MAP-->`, `<!--BLOG_CARDS-->`, `<!--RESULTS-->`) restent injectés dans le texte pour compat, ou migrés en `data parts` typés (phase 2).

### 4. Refactor `EmbedAsk.tsx` — client
- Remplacer le `fetch` + `ReadableStream` manuel par `useChat({ id, transport: new DefaultChatTransport({ api: ".../embed-ai-chat" }) })`.
- Rendre `message.parts` au lieu du string concaténé.
- Garder la logique de parsing des marqueurs (SHOW_ON_MAP, RESULTS, BLOG_CARDS) au-dessus de `message.parts.text` pendant la transition.
- Conserver : reset session, suggestions dynamiques, followups, googlemap host marker, miniatures Mindtrip.

### 5. Migration des outils (phase 2, optionnelle)
- Une fois le fallback LLM stable, exposer certaines routes déterministes comme `tool()` AI SDK (`get_weather`, `search_businesses`, `search_events`, `show_on_map`) au lieu de les court-circuiter en amont.
- Avantage : le modèle peut chaîner (ex: search → map). Inconvénient : perte du contrôle strict actuel.
- **Décision** : à discuter après la phase 1. Pour l'instant on garde le routeur déterministe en amont.

### 6. Tests avant de considérer la migration OK
- Chaque suggestion Embed IA testée sur `/embed/ask/riad-dar-najat` : weather, events, search filtré, nearby overview, POI nearby, blog RAG.
- Vérifier streaming fluide, marqueurs bien parsés, miniatures affichées, googlemap host marker OK.
- Vérifier logs AI Gateway (`X-Lovable-AIG-Run-ID` propagé).
- Vérifier snippet Wix (`wtucemorocco.wixstudio.com`) toujours fonctionnel.

### 7. Rollout
- Branche de travail, tests sur Riad Dar Najat.
- Une fois validé : appliquer le même pattern à `club-ai-chat` (streaming SSE déjà en place, migration plus mécanique).

## Ce qui NE change PAS

- Backoffice IA (dashboards, suggestions, followups, embed usage).
- Tables `embed_ai_suggestions`, `embed_ai_followups`, `ai_config`.
- Routes déterministes et leur logique métier.
- Design des miniatures, map slide panel, blog cards.

## Ce qui change côté code

| Fichier | Avant | Après |
|---|---|---|
| `supabase/functions/_shared/ai-gateway.ts` | n'existe pas | provider helper partagé |
| `supabase/functions/embed-ai-chat/index.ts` | `fetch` + SSE manuel | `streamText` + `toUIMessageStreamResponse` |
| `src/pages/EmbedAsk.tsx` | `fetch` + `ReadableStream` | `useChat` + `DefaultChatTransport` |

## Détails techniques

- Deno imports : `import { streamText } from "npm:ai"` et `import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible"`.
- Front : `@ai-sdk/react` + `ai` (déjà installables via bun).
- Le `sessionId` actuel devient l'`id` de `useChat` pour keyer les conversations.
- Les suggestions/followups continuent d'être injectés via `sendMessage({ text, data: { suggestionId, followupId } })`.

## Estimation

- Étape 1-2 : ~1 session (helper + wiring routeur).
- Étape 3-4 : ~1 session (LLM + client).
- Étape 6 : ~1 session de tests.
- Total : 3 sessions ciblées, sans régression visible pour l'utilisateur final.

## Prochaine action

Si tu valides, je commence par l'étape 1 (helper partagé) + étape 2 (adapter les routes déterministes au protocole UIMessageStream), sans encore toucher au fallback LLM ni au front.
