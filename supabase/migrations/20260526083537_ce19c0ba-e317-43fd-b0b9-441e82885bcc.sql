UPDATE public.ai_config SET value = '3000', updated_at = now() WHERE key = 'max_tokens';

INSERT INTO public.knowledge_entries (category, title, content, tags, source)
VALUES (
  'technique',
  'Paramètre max_tokens de la Suggestion IA',
  E'**Définition**\nLe paramètre `max_tokens` (configurable dans Backoffice → Config IA) limite la longueur de la réponse générée par l''IA pour la "Suggestion IA" et la Carte 4 de l''onglet Résultats.\n\nUn token ≈ 0,75 mot en français.\n\n**Impact sur le nombre d''établissements cités**\n- 1200 tokens → ~7 établissements décrits\n- 2000 tokens → ~12–15 établissements\n- 3000 tokens → ~20 établissements\n\nLa Carte 4 et l''overlay Suggestion IA n''affichent QUE les établissements cités en **gras** par l''IA dans sa réponse (extraction via `extractCitedBusinesses`).\n\n**Coût pour 3000 tokens générés** (via Lovable AI Gateway)\n- google/gemini-2.5-flash-lite : ~0,001 $\n- google/gemini-2.5-flash : ~0,002 $\n- google/gemini-3-flash-preview (modèle actuel) : ~0,002–0,003 $\n- google/gemini-2.5-pro : ~0,03 $\n- openai/gpt-5-mini : ~0,006 $\n- openai/gpt-5 : ~0,03 $\n\nLes tokens d''entrée (prompt + liste des 10–60 établissements envoyés) sont facturés en plus, généralement plus volumineux que la sortie. Avec un modèle Flash et ~1000 recherches/jour, le coût mensuel reste de quelques dollars.\n\n**Autres leviers liés**\n- `ai-search-answer/index.ts` ligne 52 : `slice(0, isRefinement ? 60 : 10)` limite le nombre d''établissements envoyés au modèle (10 sur recherche initiale, 60 en raffinement chat).\n- Augmenter cette valeur permet à l''IA de choisir parmi davantage de candidats.\n\n**Valeur actuelle** : 3000',
  ARRAY['ai','max_tokens','suggestion-ia','cout','config'],
  'doc'
);