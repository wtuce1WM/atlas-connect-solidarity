
ALTER TABLE public.knowledge_entries
  ADD COLUMN city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  ADD COLUMN neighborhood_id uuid REFERENCES public.neighborhoods(id) ON DELETE SET NULL,
  ADD COLUMN destination_id uuid REFERENCES public.destinations(id) ON DELETE SET NULL,
  ADD COLUMN point_of_interest_id uuid REFERENCES public.points_of_interest(id) ON DELETE SET NULL;
