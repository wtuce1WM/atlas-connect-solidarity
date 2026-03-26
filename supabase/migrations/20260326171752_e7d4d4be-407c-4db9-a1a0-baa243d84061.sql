-- Table to cache hotel prices from LiteAPI and SerpAPI
CREATE TABLE public.hotel_price_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  source text NOT NULL, -- 'liteapi' or 'serpapi'
  hotel_external_id text, -- liteapi_hotel_id or serp hotel name
  city text,
  price_per_night numeric,
  currency text NOT NULL DEFAULT 'EUR',
  check_in date,
  check_out date,
  room_type text,
  hotel_rating text,
  review_count integer,
  raw_data jsonb,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (business_id, source)
);

-- Enable RLS
ALTER TABLE public.hotel_price_cache ENABLE ROW LEVEL SECURITY;

-- Everyone can read prices (public cache)
CREATE POLICY "Hotel prices are viewable by everyone"
  ON public.hotel_price_cache FOR SELECT
  USING (true);

-- Staff can manage prices
CREATE POLICY "Staff can insert hotel prices"
  ON public.hotel_price_cache FOR INSERT
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update hotel prices"
  ON public.hotel_price_cache FOR UPDATE
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete hotel prices"
  ON public.hotel_price_cache FOR DELETE
  USING (is_staff(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_hotel_price_cache_business ON public.hotel_price_cache(business_id);
CREATE INDEX idx_hotel_price_cache_source ON public.hotel_price_cache(source);

-- Auto-update updated_at
CREATE TRIGGER update_hotel_price_cache_updated_at
  BEFORE UPDATE ON public.hotel_price_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();