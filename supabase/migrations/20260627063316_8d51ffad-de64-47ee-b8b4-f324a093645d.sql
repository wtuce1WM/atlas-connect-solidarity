
-- Trips for Club members
CREATE TABLE public.club_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) <= 50),
  description text CHECK (description IS NULL OR char_length(description) <= 150),
  arrival_date date,
  departure_date date,
  arrival_time time,
  departure_time time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_trips TO authenticated;
GRANT ALL ON public.club_trips TO service_role;

ALTER TABLE public.club_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own trips"
ON public.club_trips FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_club_trips_updated_at
BEFORE UPDATE ON public.club_trips
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link table trip <-> businesses
CREATE TABLE public.club_trip_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.club_trips(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, business_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_trip_businesses TO authenticated;
GRANT ALL ON public.club_trip_businesses TO service_role;

ALTER TABLE public.club_trip_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage businesses of their own trips"
ON public.club_trip_businesses FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.club_trips t WHERE t.id = trip_id AND t.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.club_trips t WHERE t.id = trip_id AND t.user_id = auth.uid()));

CREATE INDEX idx_club_trips_user_id ON public.club_trips(user_id);
CREATE INDEX idx_club_trip_businesses_trip_id ON public.club_trip_businesses(trip_id);
