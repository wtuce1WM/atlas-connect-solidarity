ALTER TABLE public.front_structure_homepage_extra_cards
ADD COLUMN IF NOT EXISTS popular_search_id UUID REFERENCES public.popular_searches(id) ON DELETE SET NULL;