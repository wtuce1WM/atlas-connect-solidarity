
ALTER TABLE public.search_noise_words ADD COLUMN IF NOT EXISTS word_en text, ADD COLUMN IF NOT EXISTS word_ar text;
ALTER TABLE public.popular_searches ADD COLUMN IF NOT EXISTS query_en text, ADD COLUMN IF NOT EXISTS query_ar text;
ALTER TABLE public.subcategory_search_config ADD COLUMN IF NOT EXISTS synonyms_en text[] DEFAULT '{}', ADD COLUMN IF NOT EXISTS synonyms_ar text[] DEFAULT '{}';
