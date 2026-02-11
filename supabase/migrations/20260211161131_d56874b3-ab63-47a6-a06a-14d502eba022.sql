
-- Table pour stocker les avis clients récupérés depuis Google/TripAdvisor
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- 'google', 'tripadvisor'
  author_name TEXT,
  rating NUMERIC,
  text TEXT,
  relative_time TEXT, -- e.g. "il y a 2 mois"
  published_at TIMESTAMP WITH TIME ZONE,
  language TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour rechercher par business
CREATE INDEX idx_reviews_business_id ON public.reviews(business_id);
CREATE INDEX idx_reviews_source ON public.reviews(source);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Avis visibles par tout le monde
CREATE POLICY "Reviews are viewable by everyone"
ON public.reviews FOR SELECT
USING (true);

-- Staff peut gérer les avis
CREATE POLICY "Staff can insert reviews"
ON public.reviews FOR INSERT
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update reviews"
ON public.reviews FOR UPDATE
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete reviews"
ON public.reviews FOR DELETE
USING (is_staff(auth.uid()));
