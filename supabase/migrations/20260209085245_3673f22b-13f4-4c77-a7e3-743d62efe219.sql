-- Create junction table for gamme-category relationship
CREATE TABLE public.gamme_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gamme_id UUID NOT NULL REFERENCES public.gammes(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(gamme_id, category_id)
);

-- Enable RLS
ALTER TABLE public.gamme_categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Gamme categories are viewable by everyone" 
ON public.gamme_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Staff can insert gamme categories" 
ON public.gamme_categories 
FOR INSERT 
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update gamme categories" 
ON public.gamme_categories 
FOR UPDATE 
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete gamme categories" 
ON public.gamme_categories 
FOR DELETE 
USING (is_staff(auth.uid()));