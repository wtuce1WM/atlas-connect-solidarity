
-- Junction table: business <-> destinations
CREATE TABLE public.business_destinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_id, destination_id)
);

ALTER TABLE public.business_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business destinations are viewable by everyone"
  ON public.business_destinations FOR SELECT USING (true);
CREATE POLICY "Staff can insert business destinations"
  ON public.business_destinations FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update business destinations"
  ON public.business_destinations FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete business destinations"
  ON public.business_destinations FOR DELETE USING (is_staff(auth.uid()));

-- Junction table: business <-> points_of_interest
CREATE TABLE public.business_points_of_interest (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  point_of_interest_id UUID NOT NULL REFERENCES public.points_of_interest(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_id, point_of_interest_id)
);

ALTER TABLE public.business_points_of_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business POIs are viewable by everyone"
  ON public.business_points_of_interest FOR SELECT USING (true);
CREATE POLICY "Staff can insert business POIs"
  ON public.business_points_of_interest FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update business POIs"
  ON public.business_points_of_interest FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete business POIs"
  ON public.business_points_of_interest FOR DELETE USING (is_staff(auth.uid()));
