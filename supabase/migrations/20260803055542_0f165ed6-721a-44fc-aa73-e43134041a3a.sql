CREATE TABLE public.widget_alert_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_slug TEXT NOT NULL,
  city_name TEXT,
  email TEXT NOT NULL,
  nickname TEXT,
  avatar_url TEXT,
  lang TEXT NOT NULL DEFAULT 'fr',
  alert_spring_tide BOOLEAN NOT NULL DEFAULT false,
  alert_surf BOOLEAN NOT NULL DEFAULT false,
  alert_kitesurf BOOLEAN NOT NULL DEFAULT false,
  alert_wingfoil BOOLEAN NOT NULL DEFAULT false,
  alert_fishing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX widget_alert_subscribers_email_city_key
  ON public.widget_alert_subscribers (lower(email), city_slug);

GRANT INSERT, UPDATE ON public.widget_alert_subscribers TO anon;
GRANT INSERT, UPDATE, SELECT ON public.widget_alert_subscribers TO authenticated;
GRANT ALL ON public.widget_alert_subscribers TO service_role;

ALTER TABLE public.widget_alert_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe from the widget"
  ON public.widget_alert_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update their widget subscription"
  ON public.widget_alert_subscribers FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Staff can read widget subscribers"
  ON public.widget_alert_subscribers FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_widget_alert_subscribers_updated_at
  BEFORE UPDATE ON public.widget_alert_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();