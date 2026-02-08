-- Create labels table for certifications/labels that can be assigned to businesses
CREATE TABLE public.labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_ar TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Labels are viewable by everyone" 
ON public.labels 
FOR SELECT 
USING (true);

CREATE POLICY "Staff can insert labels" 
ON public.labels 
FOR INSERT 
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update labels" 
ON public.labels 
FOR UPDATE 
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete labels" 
ON public.labels 
FOR DELETE 
USING (is_staff(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_labels_updated_at
BEFORE UPDATE ON public.labels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();