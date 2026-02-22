-- Create junction table for multiple badges per business
CREATE TABLE public.business_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(business_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.business_badges ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Business badges are viewable by everyone"
  ON public.business_badges FOR SELECT USING (true);

CREATE POLICY "Staff can insert business badges"
  ON public.business_badges FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update business badges"
  ON public.business_badges FOR UPDATE USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete business badges"
  ON public.business_badges FOR DELETE USING (is_staff(auth.uid()));

-- Migrate existing badge_id data to the new table
INSERT INTO public.business_badges (business_id, badge_id, is_default)
SELECT id, badge_id, true
FROM public.businesses
WHERE badge_id IS NOT NULL;