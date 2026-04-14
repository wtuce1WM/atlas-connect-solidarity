ALTER TABLE public.reviews ADD COLUMN is_default boolean NOT NULL DEFAULT false;

-- Ensure only one default review per business
CREATE UNIQUE INDEX reviews_one_default_per_business ON public.reviews (business_id) WHERE is_default = true;