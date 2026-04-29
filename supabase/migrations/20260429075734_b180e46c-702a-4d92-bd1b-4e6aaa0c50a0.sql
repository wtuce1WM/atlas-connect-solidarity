-- 1. business_youtube_video_businesses (multi + timeframe)
CREATE TABLE public.business_youtube_video_businesses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_video_id uuid NOT NULL REFERENCES public.business_youtube_videos(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  start_time numeric NULL,
  end_time numeric NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (youtube_video_id, business_id)
);
CREATE INDEX idx_byvb_video ON public.business_youtube_video_businesses(youtube_video_id);
CREATE INDEX idx_byvb_business ON public.business_youtube_video_businesses(business_id);

ALTER TABLE public.business_youtube_video_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read youtube video businesses"
  ON public.business_youtube_video_businesses FOR SELECT USING (true);
CREATE POLICY "Staff can insert youtube video businesses"
  ON public.business_youtube_video_businesses FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update youtube video businesses"
  ON public.business_youtube_video_businesses FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete youtube video businesses"
  ON public.business_youtube_video_businesses FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- 2. business_youtube_video_destinations (multi + timeframe)
CREATE TABLE public.business_youtube_video_destinations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_video_id uuid NOT NULL REFERENCES public.business_youtube_videos(id) ON DELETE CASCADE,
  destination_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  start_time numeric NULL,
  end_time numeric NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (youtube_video_id, destination_id)
);
CREATE INDEX idx_byvd_video ON public.business_youtube_video_destinations(youtube_video_id);
CREATE INDEX idx_byvd_destination ON public.business_youtube_video_destinations(destination_id);

ALTER TABLE public.business_youtube_video_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read youtube video destinations"
  ON public.business_youtube_video_destinations FOR SELECT USING (true);
CREATE POLICY "Staff can insert youtube video destinations"
  ON public.business_youtube_video_destinations FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update youtube video destinations"
  ON public.business_youtube_video_destinations FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete youtube video destinations"
  ON public.business_youtube_video_destinations FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- 3. business_youtube_video_cities
CREATE TABLE public.business_youtube_video_cities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_video_id uuid NOT NULL REFERENCES public.business_youtube_videos(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (youtube_video_id, city_id)
);
CREATE INDEX idx_byvc_video ON public.business_youtube_video_cities(youtube_video_id);
CREATE INDEX idx_byvc_city ON public.business_youtube_video_cities(city_id);

ALTER TABLE public.business_youtube_video_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read youtube video cities"
  ON public.business_youtube_video_cities FOR SELECT USING (true);
CREATE POLICY "Staff can insert youtube video cities"
  ON public.business_youtube_video_cities FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update youtube video cities"
  ON public.business_youtube_video_cities FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete youtube video cities"
  ON public.business_youtube_video_cities FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- 4. business_youtube_video_subcategories
CREATE TABLE public.business_youtube_video_subcategories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_video_id uuid NOT NULL REFERENCES public.business_youtube_videos(id) ON DELETE CASCADE,
  subcategory_id uuid NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (youtube_video_id, subcategory_id)
);
CREATE INDEX idx_byvs_video ON public.business_youtube_video_subcategories(youtube_video_id);
CREATE INDEX idx_byvs_subcategory ON public.business_youtube_video_subcategories(subcategory_id);

ALTER TABLE public.business_youtube_video_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read youtube video subcategories"
  ON public.business_youtube_video_subcategories FOR SELECT USING (true);
CREATE POLICY "Staff can insert youtube video subcategories"
  ON public.business_youtube_video_subcategories FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update youtube video subcategories"
  ON public.business_youtube_video_subcategories FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete youtube video subcategories"
  ON public.business_youtube_video_subcategories FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));