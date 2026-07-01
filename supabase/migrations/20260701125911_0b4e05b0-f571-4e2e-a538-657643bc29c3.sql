
ALTER TABLE public.search_synonyms
  ADD COLUMN IF NOT EXISTS key_word_en text,
  ADD COLUMN IF NOT EXISTS key_word_ar text,
  ADD COLUMN IF NOT EXISTS synonyms_en text[],
  ADD COLUMN IF NOT EXISTS synonyms_ar text[];

CREATE INDEX IF NOT EXISTS idx_search_synonyms_key_word_en ON public.search_synonyms(key_word_en);
CREATE INDEX IF NOT EXISTS idx_search_synonyms_key_word_ar ON public.search_synonyms(key_word_ar);
