ALTER TABLE public.destination_reviews
  ADD COLUMN is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;