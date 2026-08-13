-- 1. Catalogue des widgets
CREATE TABLE public.widget_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  widget_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  embed_path text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.widget_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.widget_types TO authenticated;
GRANT ALL ON public.widget_types TO service_role;
ALTER TABLE public.widget_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "widget_types public read" ON public.widget_types FOR SELECT USING (true);
CREATE POLICY "widget_types staff manage" ON public.widget_types FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 2. Réglages par défaut
CREATE TABLE public.widget_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  widget_key text NOT NULL UNIQUE REFERENCES public.widget_types(widget_key) ON DELETE CASCADE,
  bg_light text,
  bg_dark text,
  card_mode text NOT NULL DEFAULT 'widget',
  theme text NOT NULL DEFAULT 'light',
  fit text NOT NULL DEFAULT '',
  height integer NOT NULL DEFAULT 640,
  max_width integer,
  radius integer NOT NULL DEFAULT 20,
  lang text NOT NULL DEFAULT 'fr',
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.widget_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.widget_settings TO authenticated;
GRANT ALL ON public.widget_settings TO service_role;
ALTER TABLE public.widget_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "widget_settings public read" ON public.widget_settings FOR SELECT USING (true);
CREATE POLICY "widget_settings staff manage" ON public.widget_settings FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 3. Surcharges par établissement
CREATE TABLE public.business_widget_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  widget_key text NOT NULL REFERENCES public.widget_types(widget_key) ON DELETE CASCADE,
  bg_light text,
  bg_dark text,
  card_mode text,
  theme text,
  fit text,
  height integer,
  max_width integer,
  radius integer,
  lang text,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, widget_key)
);
GRANT SELECT ON public.business_widget_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_widget_settings TO authenticated;
GRANT ALL ON public.business_widget_settings TO service_role;
ALTER TABLE public.business_widget_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bws public read" ON public.business_widget_settings FOR SELECT USING (true);
CREATE POLICY "bws staff manage" ON public.business_widget_settings FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "bws affiliate manage own" ON public.business_widget_settings FOR ALL TO authenticated
  USING (public.is_own_affiliate_business(auth.uid(), business_id))
  WITH CHECK (public.is_own_affiliate_business(auth.uid(), business_id));

-- 4. Évènements d'usage
CREATE TABLE public.widget_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  widget_key text NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  event_type text NOT NULL DEFAULT 'load',
  action text,
  host text,
  page_url text,
  device text,
  lang text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX widget_events_created_idx ON public.widget_events (created_at DESC);
CREATE INDEX widget_events_key_idx ON public.widget_events (widget_key, created_at DESC);
CREATE INDEX widget_events_business_idx ON public.widget_events (business_id, created_at DESC);
GRANT INSERT ON public.widget_events TO anon;
GRANT SELECT, INSERT ON public.widget_events TO authenticated;
GRANT ALL ON public.widget_events TO service_role;
ALTER TABLE public.widget_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "widget_events public insert" ON public.widget_events FOR INSERT WITH CHECK (true);
CREATE POLICY "widget_events staff read" ON public.widget_events FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "widget_events affiliate read own" ON public.widget_events FOR SELECT TO authenticated
  USING (business_id IS NOT NULL AND public.is_own_affiliate_business(auth.uid(), business_id));

-- 5. updated_at triggers
CREATE OR REPLACE FUNCTION public.widgets_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER widget_types_updated_at BEFORE UPDATE ON public.widget_types
  FOR EACH ROW EXECUTE FUNCTION public.widgets_set_updated_at();
CREATE TRIGGER widget_settings_updated_at BEFORE UPDATE ON public.widget_settings
  FOR EACH ROW EXECUTE FUNCTION public.widgets_set_updated_at();
CREATE TRIGGER business_widget_settings_updated_at BEFORE UPDATE ON public.business_widget_settings
  FOR EACH ROW EXECUTE FUNCTION public.widgets_set_updated_at();

-- 6. Analytics
CREATE OR REPLACE FUNCTION public.get_widget_analytics(p_days integer DEFAULT 30, p_business_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH scoped AS (
    SELECT * FROM public.widget_events
    WHERE created_at >= now() - (GREATEST(COALESCE(p_days, 30), 1) || ' days')::interval
      AND (p_business_id IS NULL OR business_id = p_business_id)
      AND (
        public.is_staff(auth.uid())
        OR (business_id IS NOT NULL AND public.is_own_affiliate_business(auth.uid(), business_id))
      )
  )
  SELECT jsonb_build_object(
    'total_loads', (SELECT count(*) FROM scoped WHERE event_type = 'load'),
    'total_interactions', (SELECT count(*) FROM scoped WHERE event_type = 'interaction'),
    'by_widget', COALESCE((SELECT jsonb_agg(x) FROM (
        SELECT widget_key,
               count(*) FILTER (WHERE event_type = 'load') AS loads,
               count(*) FILTER (WHERE event_type = 'interaction') AS interactions
        FROM scoped GROUP BY widget_key ORDER BY 2 DESC) x), '[]'::jsonb),
    'by_host', COALESCE((SELECT jsonb_agg(x) FROM (
        SELECT COALESCE(host, 'inconnu') AS host, count(*) AS events
        FROM scoped GROUP BY 1 ORDER BY 2 DESC LIMIT 50) x), '[]'::jsonb),
    'by_device', COALESCE((SELECT jsonb_agg(x) FROM (
        SELECT COALESCE(device, 'inconnu') AS device, count(*) AS events
        FROM scoped GROUP BY 1 ORDER BY 2 DESC) x), '[]'::jsonb),
    'by_day', COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'day')) FROM (
        SELECT jsonb_build_object(
          'day', to_char(date_trunc('day', created_at), 'YYYY-MM-DD'),
          'loads', count(*) FILTER (WHERE event_type = 'load'),
          'interactions', count(*) FILTER (WHERE event_type = 'interaction')
        ) AS x
        FROM scoped GROUP BY date_trunc('day', created_at)) y), '[]'::jsonb),
    'by_action', COALESCE((SELECT jsonb_agg(x) FROM (
        SELECT COALESCE(action, 'autre') AS action, count(*) AS events
        FROM scoped WHERE event_type = 'interaction' GROUP BY 1 ORDER BY 2 DESC LIMIT 30) x), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.get_widget_analytics(integer, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_widget_analytics(integer, uuid) TO authenticated, service_role;

-- 7. Catalogue initial
INSERT INTO public.widget_types (widget_key, label, description, embed_path, sort_order) VALUES
  ('ask', 'Assistant IA', 'Assistant IA embarqué (carte ou panneau flottant)', '/embed/ask/:slug', 10),
  ('weather', 'Météo', 'Météo multi-villes', '/embed/weather', 20),
  ('tides', 'Marées & Vents', 'Marées et vents (Essaouira)', '/embed/tides', 30),
  ('reviews', 'Avis clients', 'Note et avis agrégés', '/embed/reviews/:slug', 40),
  ('rateus', 'Laisser un avis', 'Invitation à déposer un avis', '/embed/avis/:slug', 50),
  ('nearby', 'Carte / À proximité', 'Carte des POI et établissements à proximité', '/embed/nearby/:slug', 60),
  ('fiche', 'Fiche établissement', 'Carte fiche compacte', '/embed/fiche/:slug', 70),
  ('spotify', 'Spotify', 'Lecteur Spotify', '/embed/spotify/:slug', 80),
  ('soundcloud', 'SoundCloud', 'Lecteur SoundCloud', '/embed/soundcloud/:slug', 90),
  ('substack', 'Substack', 'Derniers posts Substack', '/embed/substack/:slug', 100),
  ('article-map', 'Carte d''article', 'Carte des lieux d''un article', '/embed/article-map/:slug', 110);

INSERT INTO public.widget_settings (widget_key, bg_light, bg_dark, card_mode, theme, fit, height, max_width, radius, lang)
SELECT widget_key, NULL, NULL, 'widget', 'light', '',
       CASE widget_key WHEN 'ask' THEN 640 WHEN 'nearby' THEN 720 WHEN 'reviews' THEN 340
            WHEN 'rateus' THEN 380 WHEN 'fiche' THEN 520 ELSE 480 END,
       CASE widget_key WHEN 'fiche' THEN 380 ELSE NULL END,
       20, 'fr'
FROM public.widget_types;