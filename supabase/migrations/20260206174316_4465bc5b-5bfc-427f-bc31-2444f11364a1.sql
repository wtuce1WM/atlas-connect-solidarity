-- Create countries table
CREATE TABLE public.countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_ar TEXT,
  code TEXT UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create cities table
CREATE TABLE public.cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_ar TEXT,
  region TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Countries policies
CREATE POLICY "Countries are viewable by everyone"
ON public.countries FOR SELECT
USING (true);

CREATE POLICY "Staff can insert countries"
ON public.countries FOR INSERT
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update countries"
ON public.countries FOR UPDATE
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete countries"
ON public.countries FOR DELETE
USING (is_staff(auth.uid()));

-- Cities policies
CREATE POLICY "Cities are viewable by everyone"
ON public.cities FOR SELECT
USING (true);

CREATE POLICY "Staff can insert cities"
ON public.cities FOR INSERT
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update cities"
ON public.cities FOR UPDATE
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete cities"
ON public.cities FOR DELETE
USING (is_staff(auth.uid()));

-- Create indexes
CREATE INDEX idx_cities_country_id ON public.cities(country_id);
CREATE INDEX idx_cities_region ON public.cities(region);

-- Add triggers for updated_at
CREATE TRIGGER update_countries_updated_at
BEFORE UPDATE ON public.countries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cities_updated_at
BEFORE UPDATE ON public.cities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Morocco as first country
INSERT INTO public.countries (name_fr, name_en, name_ar, code, sort_order)
VALUES ('Maroc', 'Morocco', 'المغرب', 'MA', 1);