-- 1. Table de règles : badge auto par établissement pour ses vidéos YouTube
CREATE TABLE IF NOT EXISTS public.business_youtube_badge_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, badge_id)
);

GRANT SELECT ON public.business_youtube_badge_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_youtube_badge_rules TO authenticated;
GRANT ALL ON public.business_youtube_badge_rules TO service_role;

ALTER TABLE public.business_youtube_badge_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read youtube badge rules"
ON public.business_youtube_badge_rules FOR SELECT USING (true);

CREATE POLICY "Staff can manage youtube badge rules"
ON public.business_youtube_badge_rules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Règles pour les 2 chaînes
INSERT INTO public.business_youtube_badge_rules (business_id, badge_id) VALUES
  ('08f848fc-83ee-48c5-9636-fb80e68f0218', '226a6dcd-f53b-4408-ac97-16d083cb4f98'),
  ('6f7600e8-57ca-49fc-a769-2b0c4a392fe1', '3454814c-df50-414e-b5e1-70fc3976cb30')
ON CONFLICT DO NOTHING;

-- 3. Trigger d'application automatique à chaque insertion de vidéo
CREATE OR REPLACE FUNCTION public.apply_youtube_badge_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.business_youtube_video_badges (youtube_video_id, badge_id)
  SELECT NEW.id, r.badge_id
  FROM public.business_youtube_badge_rules r
  WHERE r.business_id = NEW.business_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_youtube_badge_rules ON public.business_youtube_videos;
CREATE TRIGGER trg_apply_youtube_badge_rules
AFTER INSERT ON public.business_youtube_videos
FOR EACH ROW EXECUTE FUNCTION public.apply_youtube_badge_rules();

-- 4. Rattrapage sur les vidéos existantes
INSERT INTO public.business_youtube_video_badges (youtube_video_id, badge_id)
SELECT v.id, r.badge_id
FROM public.business_youtube_videos v
JOIN public.business_youtube_badge_rules r ON r.business_id = v.business_id
ON CONFLICT DO NOTHING;