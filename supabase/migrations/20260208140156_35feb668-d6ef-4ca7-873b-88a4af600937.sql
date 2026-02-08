-- Create junction table for business-label relationships
CREATE TABLE public.business_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  label_id UUID NOT NULL,
  custom_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_id, label_id)
);

-- Enable RLS
ALTER TABLE public.business_labels ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Business labels are viewable by everyone" 
ON public.business_labels 
FOR SELECT 
USING (true);

CREATE POLICY "Staff can insert business labels" 
ON public.business_labels 
FOR INSERT 
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update business labels" 
ON public.business_labels 
FOR UPDATE 
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete business labels" 
ON public.business_labels 
FOR DELETE 
USING (is_staff(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_business_labels_business_id ON public.business_labels(business_id);
CREATE INDEX idx_business_labels_label_id ON public.business_labels(label_id);