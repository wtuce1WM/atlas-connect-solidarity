
-- Badges table (similar to gammes)
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_ar TEXT,
  description TEXT,
  color_hex VARCHAR DEFAULT '#000000',
  text_color_hex VARCHAR DEFAULT '#FFFFFF',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Badge-subcategory associations (similar to gamme_categories)
CREATE TABLE public.badge_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(badge_id, subcategory_id)
);

-- Add badge_id to businesses
ALTER TABLE public.businesses ADD COLUMN badge_id UUID REFERENCES public.badges(id) ON DELETE SET NULL;

-- RLS for badges
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges are viewable by everyone" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Staff can insert badges" ON public.badges FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update badges" ON public.badges FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete badges" ON public.badges FOR DELETE USING (is_staff(auth.uid()));

-- RLS for badge_subcategories
ALTER TABLE public.badge_subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badge subcategories are viewable by everyone" ON public.badge_subcategories FOR SELECT USING (true);
CREATE POLICY "Staff can insert badge subcategories" ON public.badge_subcategories FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update badge subcategories" ON public.badge_subcategories FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete badge subcategories" ON public.badge_subcategories FOR DELETE USING (is_staff(auth.uid()));

-- Trigger for updated_at on badges
CREATE TRIGGER update_badges_updated_at BEFORE UPDATE ON public.badges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
