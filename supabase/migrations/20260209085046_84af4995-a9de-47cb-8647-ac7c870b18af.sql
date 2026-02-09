-- Create gammes table for predefined ranges
CREATE TABLE public.gammes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_ar TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gammes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Gammes are viewable by everyone" 
ON public.gammes 
FOR SELECT 
USING (true);

CREATE POLICY "Staff can insert gammes" 
ON public.gammes 
FOR INSERT 
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update gammes" 
ON public.gammes 
FOR UPDATE 
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete gammes" 
ON public.gammes 
FOR DELETE 
USING (is_staff(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_gammes_updated_at
BEFORE UPDATE ON public.gammes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add gamme_id to businesses table
ALTER TABLE public.businesses
ADD COLUMN gamme_id UUID REFERENCES public.gammes(id) ON DELETE SET NULL;

-- Insert default gammes
INSERT INTO public.gammes (name_fr, name_en, sort_order) VALUES
('Luxe', 'Luxury', 1),
('Premium', 'Premium', 2),
('Standard', 'Standard', 3),
('Économique', 'Budget', 4);