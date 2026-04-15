
CREATE TABLE public.front_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  icon TEXT NOT NULL DEFAULT 'Star',
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.front_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Front highlights are viewable by everyone"
ON public.front_highlights FOR SELECT
USING (true);

CREATE POLICY "Staff can insert front highlights"
ON public.front_highlights FOR INSERT
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update front highlights"
ON public.front_highlights FOR UPDATE
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete front highlights"
ON public.front_highlights FOR DELETE
USING (is_staff(auth.uid()));

CREATE TRIGGER update_front_highlights_updated_at
BEFORE UPDATE ON public.front_highlights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 4 empty slots
INSERT INTO public.front_highlights (sort_order) VALUES (0), (1), (2), (3);
