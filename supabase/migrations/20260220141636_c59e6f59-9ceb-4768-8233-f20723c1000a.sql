
-- Create points_of_interest table linked to cities
CREATE TABLE public.points_of_interest (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_ar TEXT,
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
ALTER TABLE public.points_of_interest ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Points of interest are viewable by everyone"
  ON public.points_of_interest FOR SELECT USING (true);

-- Staff CRUD
CREATE POLICY "Staff can insert points of interest"
  ON public.points_of_interest FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update points of interest"
  ON public.points_of_interest FOR UPDATE USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete points of interest"
  ON public.points_of_interest FOR DELETE USING (is_staff(auth.uid()));

-- Timestamp trigger
CREATE TRIGGER update_points_of_interest_updated_at
  BEFORE UPDATE ON public.points_of_interest
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
