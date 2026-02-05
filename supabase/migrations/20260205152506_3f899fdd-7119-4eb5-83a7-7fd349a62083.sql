-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create enum for WTUCE status
CREATE TYPE public.wtuce_status AS ENUM ('verified', 'pending');

-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create businesses table
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  categories TEXT[] DEFAULT '{}',
  services TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  country TEXT DEFAULT 'Maroc',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  wtuce_status public.wtuce_status DEFAULT 'pending',
  priority_score INTEGER DEFAULT 0,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  logo_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  search_vector tsvector,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_businesses_search_vector ON public.businesses USING GIN(search_vector);
CREATE INDEX idx_businesses_location ON public.businesses (city, region);
CREATE INDEX idx_businesses_coords ON public.businesses (latitude, longitude);
CREATE INDEX idx_businesses_status ON public.businesses (wtuce_status);
CREATE INDEX idx_businesses_priority ON public.businesses (priority_score DESC);
CREATE INDEX idx_businesses_name_trgm ON public.businesses USING GIN(name gin_trgm_ops);

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Businesses are viewable by everyone" 
ON public.businesses 
FOR SELECT 
USING (true);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION public.update_business_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.categories, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.services, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.keywords, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for search vector
CREATE TRIGGER update_businesses_search_vector
BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.update_business_search_vector();

-- Create function to calculate distance (Haversine formula)
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  R CONSTANT DOUBLE PRECISION := 6371;
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Create trigger for updated_at
CREATE TRIGGER update_businesses_updated_at
BEFORE UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.businesses (name, description, categories, services, keywords, city, region, latitude, longitude, wtuce_status, priority_score, is_featured)
VALUES 
  ('Riad Atlas', 'Magnifique riad traditionnel au cœur de la médina', ARRAY['Hébergement', 'Hôtel'], ARRAY['Chambre d''hôtes', 'Spa', 'Restaurant'], ARRAY['riad', 'médina', 'traditionnel'], 'Marrakech', 'Marrakech-Safi', 31.6295, -7.9811, 'verified', 100, true),
  ('Restaurant Le Jardin', 'Cuisine marocaine raffinée dans un jardin luxuriant', ARRAY['Restaurant', 'Gastronomie'], ARRAY['Cuisine marocaine', 'Terrasse', 'Événements'], ARRAY['tagine', 'couscous', 'terrasse'], 'Marrakech', 'Marrakech-Safi', 31.6310, -7.9850, 'verified', 90, true),
  ('Transport Atlas', 'Service de transport touristique et transferts aéroport', ARRAY['Transport', 'Tourisme'], ARRAY['Transfert aéroport', 'Excursions', 'Location voiture'], ARRAY['taxi', 'navette', 'excursion'], 'Marrakech', 'Marrakech-Safi', 31.6250, -7.9750, 'verified', 85, false),
  ('Hammam Traditionnel', 'Authentique hammam marocain avec soins spa', ARRAY['Bien-être', 'Spa'], ARRAY['Hammam', 'Massage', 'Gommage'], ARRAY['détente', 'bien-être', 'soins'], 'Fès', 'Fès-Meknès', 34.0331, -5.0003, 'verified', 80, false),
  ('Guide Sahara', 'Excursions et circuits dans le désert', ARRAY['Tourisme', 'Aventure'], ARRAY['Excursion désert', 'Nuit en bivouac', 'Quad'], ARRAY['sahara', 'désert', 'aventure'], 'Merzouga', 'Drâa-Tafilalet', 31.0801, -4.0134, 'pending', 70, false),
  ('Artisanat Berbère', 'Boutique d''artisanat marocain authentique', ARRAY['Shopping', 'Artisanat'], ARRAY['Tapis', 'Poterie', 'Bijoux'], ARRAY['artisanat', 'souvenir', 'berbère'], 'Essaouira', 'Marrakech-Safi', 31.5085, -9.7595, 'verified', 75, false);