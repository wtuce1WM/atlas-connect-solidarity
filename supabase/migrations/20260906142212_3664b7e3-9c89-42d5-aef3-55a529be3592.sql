INSERT INTO public.search_synonyms (key_word, key_word_en, synonyms, synonyms_en, badge_id, is_active)
SELECT v.key_word, v.key_word_en, v.synonyms, v.synonyms_en, v.badge_id, true
FROM (VALUES
  (
    'acheter',
    'buy',
    ARRAY['achat','achats','acheter','j''achete','acquerir','acquisition','investir','investissement','a vendre','mise en vente','vendre','vente immobiliere']::text[],
    ARRAY['buy','buying','purchase','for sale','invest','investment','acquire']::text[],
    '6ae94381-ec78-4165-80bd-26b2c56399a3'::uuid
  ),
  (
    'louer',
    'rent',
    ARRAY['louer','a louer','loue','mise en location','location saisonniere','locations','en location']::text[],
    ARRAY['rent','rental','rentals','to rent','for rent','lease']::text[],
    '0180bcff-0dc6-409d-a58c-19a2d81555c6'::uuid
  )
) AS v(key_word, key_word_en, synonyms, synonyms_en, badge_id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.search_synonyms s WHERE lower(s.key_word) = lower(v.key_word)
);