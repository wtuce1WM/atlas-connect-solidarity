
-- 1. search_noise_words: replaces hardcoded NOISE_ADJECTIVES
CREATE TABLE public.search_noise_words (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.search_noise_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_noise_words_select" ON public.search_noise_words FOR SELECT USING (true);
CREATE POLICY "search_noise_words_insert" ON public.search_noise_words FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "search_noise_words_update" ON public.search_noise_words FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "search_noise_words_delete" ON public.search_noise_words FOR DELETE USING (is_staff(auth.uid()));

-- 2. search_synonyms: replaces hardcoded synonyms map
CREATE TABLE public.search_synonyms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_word text NOT NULL UNIQUE,
  synonyms text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.search_synonyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_synonyms_select" ON public.search_synonyms FOR SELECT USING (true);
CREATE POLICY "search_synonyms_insert" ON public.search_synonyms FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "search_synonyms_update" ON public.search_synonyms FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "search_synonyms_delete" ON public.search_synonyms FOR DELETE USING (is_staff(auth.uid()));

-- 3. Add merge_group to subcategories for MERGED_SUBCATEGORIES
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS merge_group text DEFAULT NULL;
COMMENT ON COLUMN public.subcategories.merge_group IS 'Subcategories with the same merge_group are merged in search results (e.g. Hotel+Riad)';

-- 4. subcategory_relations: replaces RELATED_SUBCATEGORIES
CREATE TABLE public.subcategory_relations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_subcategory_id uuid NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  target_subcategory_id uuid NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(source_subcategory_id, target_subcategory_id)
);

ALTER TABLE public.subcategory_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subcategory_relations_select" ON public.subcategory_relations FOR SELECT USING (true);
CREATE POLICY "subcategory_relations_insert" ON public.subcategory_relations FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "subcategory_relations_update" ON public.subcategory_relations FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "subcategory_relations_delete" ON public.subcategory_relations FOR DELETE USING (is_staff(auth.uid()));
