CREATE TABLE public.video_feed_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  is_published boolean NOT NULL DEFAULT false,

  hero_title_top_fr text,
  hero_title_top_en text,
  hero_title_top_ar text,
  hero_title_bottom_fr text,
  hero_title_bottom_en text,
  hero_title_bottom_ar text,
  hero_subtitle_fr text,
  hero_subtitle_en text,
  hero_subtitle_ar text,
  intro_fr text,
  intro_en text,
  intro_ar text,

  section_title_fr text,
  section_title_en text,
  section_title_ar text,
  section_intro_fr text,
  section_intro_en text,
  section_intro_ar text,

  cover_image_url text,
  custom_hero_image_url text,
  hero_alt text,

  video_config jsonb NOT NULL DEFAULT '{}'::jsonb,

  seo_title_fr text,
  seo_title_en text,
  seo_title_ar text,
  seo_description_fr text,
  seo_description_en text,
  seo_description_ar text,

  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT ON public.video_feed_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_feed_pages TO authenticated;
GRANT ALL ON public.video_feed_pages TO service_role;

ALTER TABLE public.video_feed_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published video feed pages"
  ON public.video_feed_pages
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "Staff can view all video feed pages"
  ON public.video_feed_pages
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert video feed pages"
  ON public.video_feed_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update video feed pages"
  ON public.video_feed_pages
  FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete video feed pages"
  ON public.video_feed_pages
  FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER trg_video_feed_pages_updated_at
  BEFORE UPDATE ON public.video_feed_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_video_feed_pages_slug ON public.video_feed_pages(slug);
CREATE INDEX idx_video_feed_pages_published ON public.video_feed_pages(is_published, published_at DESC);