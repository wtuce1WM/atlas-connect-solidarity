-- Table pour stocker les avis clients des destinations
CREATE TABLE public.destination_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'google',
  author_name TEXT,
  rating NUMERIC,
  text TEXT,
  relative_time TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  language TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_destination_reviews_destination_id ON public.destination_reviews(destination_id);

ALTER TABLE public.destination_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Destination reviews are viewable by everyone"
ON public.destination_reviews FOR SELECT
USING (true);

CREATE POLICY "Staff can insert destination reviews"
ON public.destination_reviews FOR INSERT
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update destination reviews"
ON public.destination_reviews FOR UPDATE
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete destination reviews"
ON public.destination_reviews FOR DELETE
USING (is_staff(auth.uid()));