ALTER TABLE public.search_intent_words
  ADD COLUMN IF NOT EXISTS word_en text,
  ADD COLUMN IF NOT EXISTS word_ar text;

CREATE INDEX IF NOT EXISTS idx_search_intent_words_word_en ON public.search_intent_words (lower(word_en));
CREATE INDEX IF NOT EXISTS idx_search_intent_words_word_ar ON public.search_intent_words (lower(word_ar));