
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings are viewable by everyone" ON public.site_settings FOR SELECT TO public USING (true);
CREATE POLICY "Staff can insert site settings" ON public.site_settings FOR INSERT TO public WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update site settings" ON public.site_settings FOR UPDATE TO public USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete site settings" ON public.site_settings FOR DELETE TO public USING (is_staff(auth.uid()));

INSERT INTO public.site_settings (key, value, label) VALUES
  ('social_whatsapp', 'https://wa.me/212661439221', 'WhatsApp'),
  ('social_tiktok', '', 'TikTok'),
  ('social_instagram', '', 'Instagram'),
  ('social_facebook', '', 'Facebook'),
  ('social_twitter', '', 'X (Twitter)'),
  ('social_pinterest', '', 'Pinterest'),
  ('social_soundcloud', '', 'SoundCloud'),
  ('social_youtube', '', 'YouTube');
