DROP POLICY IF EXISTS "Hotel prices are viewable by everyone" ON public.hotel_price_cache;
CREATE POLICY "Staff can read hotel prices" ON public.hotel_price_cache FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "search_noise_words_select" ON public.search_noise_words;
CREATE POLICY "search_noise_words_staff_select" ON public.search_noise_words FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "search_synonyms_select" ON public.search_synonyms;
CREATE POLICY "search_synonyms_staff_select" ON public.search_synonyms FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Cache is readable by everyone" ON public.serpapi_hotels_cache;
REVOKE SELECT ON public.hotel_price_cache, public.search_noise_words, public.search_synonyms, public.serpapi_hotels_cache FROM anon;