
-- Create destinations table linked to regions
CREATE TABLE public.destinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_ar TEXT,
  region TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  wikipedia_fr TEXT,
  wikipedia_en TEXT,
  wikipedia_ar TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Destinations are viewable by everyone"
  ON public.destinations FOR SELECT USING (true);

-- Staff CRUD
CREATE POLICY "Staff can insert destinations"
  ON public.destinations FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update destinations"
  ON public.destinations FOR UPDATE USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete destinations"
  ON public.destinations FOR DELETE USING (is_staff(auth.uid()));

-- Auto-update updated_at
CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
