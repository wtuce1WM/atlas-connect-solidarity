-- Table for curated popular search suggestions
CREATE TABLE public.popular_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.popular_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Popular searches are viewable by everyone"
  ON public.popular_searches FOR SELECT
  USING (is_active = true);

CREATE POLICY "Staff can insert popular searches"
  ON public.popular_searches FOR INSERT
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update popular searches"
  ON public.popular_searches FOR UPDATE
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete popular searches"
  ON public.popular_searches FOR DELETE
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can view all popular searches"
  ON public.popular_searches FOR SELECT
  USING (is_staff(auth.uid()));