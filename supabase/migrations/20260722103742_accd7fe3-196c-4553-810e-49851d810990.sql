
-- 1) Link "rooftop" synonym to the Rooftop service so it actually filters
UPDATE public.search_synonyms
SET service_names = ARRAY['Rooftop']::text[]
WHERE key_word ILIKE 'rooftop';

-- 2) Add "coucher de soleil / sunset / غروب" as a known synonym (no filter, avoids being treated as blocking noise)
INSERT INTO public.search_synonyms (key_word, key_word_en, key_word_ar, synonyms, synonyms_en, synonyms_ar, service_names, subcategory_names, is_active)
SELECT 'coucher de soleil', 'sunset', 'غروب الشمس',
       ARRAY['coucher de soleil','coucher du soleil','sunset']::text[],
       ARRAY['sunset','sundown']::text[],
       ARRAY['غروب','غروب الشمس']::text[],
       ARRAY[]::text[], ARRAY[]::text[], true
WHERE NOT EXISTS (
  SELECT 1 FROM public.search_synonyms WHERE key_word ILIKE 'coucher de soleil'
);
