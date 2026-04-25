ALTER TABLE public.front_structure_homepage_extra_cards
ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_extra_cards_event_id ON public.front_structure_homepage_extra_cards(event_id);