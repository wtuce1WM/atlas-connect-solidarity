-- Add structured-content columns + rendering template to blog_posts
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS entries_fr JSONB,
  ADD COLUMN IF NOT EXISTS entries_en JSONB,
  ADD COLUMN IF NOT EXISTS entries_ar JSONB,
  ADD COLUMN IF NOT EXISTS template TEXT NOT NULL DEFAULT 'article_template',
  ADD COLUMN IF NOT EXISTS hero_title_top_fr TEXT,
  ADD COLUMN IF NOT EXISTS hero_title_top_en TEXT,
  ADD COLUMN IF NOT EXISTS hero_title_top_ar TEXT,
  ADD COLUMN IF NOT EXISTS hero_title_bottom_fr TEXT,
  ADD COLUMN IF NOT EXISTS hero_title_bottom_en TEXT,
  ADD COLUMN IF NOT EXISTS hero_title_bottom_ar TEXT,
  ADD COLUMN IF NOT EXISTS hero_subtitle_fr TEXT,
  ADD COLUMN IF NOT EXISTS hero_subtitle_en TEXT,
  ADD COLUMN IF NOT EXISTS hero_subtitle_ar TEXT,
  ADD COLUMN IF NOT EXISTS intro_fr TEXT,
  ADD COLUMN IF NOT EXISTS intro_en TEXT,
  ADD COLUMN IF NOT EXISTS intro_ar TEXT,
  ADD COLUMN IF NOT EXISTS hero_alt TEXT,
  ADD COLUMN IF NOT EXISTS bookmark_slug TEXT,
  ADD COLUMN IF NOT EXISTS custom_hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Ensure slug is unique
CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_slug_unique ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON public.blog_posts(is_published, published_at DESC);

-- Allow constrained values for template
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_template_check'
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_template_check
      CHECK (template IN ('article_template','custom'));
  END IF;
END $$;

-- Ensure GRANTs (defensive — table already exists)
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;