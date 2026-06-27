
CREATE TABLE public.serpapi_hotels_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_key text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  adults int NOT NULL DEFAULT 2,
  currency text NOT NULL DEFAULT 'EUR',
  language text NOT NULL DEFAULT 'fr',
  country text NOT NULL DEFAULT 'ma',
  payload jsonb NOT NULL,
  hotel_count int NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX serpapi_hotels_cache_key
  ON public.serpapi_hotels_cache (city_key, check_in, check_out, adults, currency, language, country);

CREATE INDEX serpapi_hotels_cache_expires_at ON public.serpapi_hotels_cache (expires_at);

GRANT SELECT ON public.serpapi_hotels_cache TO anon, authenticated;
GRANT ALL ON public.serpapi_hotels_cache TO service_role;

ALTER TABLE public.serpapi_hotels_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache is readable by everyone"
  ON public.serpapi_hotels_cache FOR SELECT USING (true);

CREATE POLICY "Staff can manage cache"
  ON public.serpapi_hotels_cache FOR ALL
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
