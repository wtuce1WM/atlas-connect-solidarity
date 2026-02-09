
-- Create neighborhoods table
CREATE TABLE public.neighborhoods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Neighborhoods are viewable by everyone"
  ON public.neighborhoods FOR SELECT USING (true);

CREATE POLICY "Staff can insert neighborhoods"
  ON public.neighborhoods FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update neighborhoods"
  ON public.neighborhoods FOR UPDATE USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete neighborhoods"
  ON public.neighborhoods FOR DELETE USING (is_staff(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_neighborhoods_updated_at
  BEFORE UPDATE ON public.neighborhoods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
