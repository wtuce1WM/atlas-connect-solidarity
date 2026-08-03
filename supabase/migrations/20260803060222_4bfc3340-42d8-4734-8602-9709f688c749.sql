ALTER TABLE public.widget_alert_subscribers
  ADD COLUMN IF NOT EXISTS unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE TABLE IF NOT EXISTS public.widget_alert_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES public.widget_alert_subscribers(id) ON DELETE CASCADE,
  city_slug text NOT NULL,
  email text NOT NULL,
  alert_type text NOT NULL,
  target_date date NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS widget_alert_sends_unique
  ON public.widget_alert_sends (lower(email), city_slug, alert_type, target_date);

GRANT ALL ON public.widget_alert_sends TO service_role;
GRANT SELECT ON public.widget_alert_sends TO authenticated;

ALTER TABLE public.widget_alert_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read widget alert sends"
  ON public.widget_alert_sends FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));