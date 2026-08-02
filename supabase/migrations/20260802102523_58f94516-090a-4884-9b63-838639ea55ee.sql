ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS anchor_kind text NOT NULL DEFAULT 'generic';

ALTER TABLE public.blog_posts
  DROP CONSTRAINT IF EXISTS blog_posts_anchor_kind_check;

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_anchor_kind_check CHECK (anchor_kind IN ('owner','generic'));

CREATE INDEX IF NOT EXISTS idx_blog_posts_anchor_kind
  ON public.blog_posts (anchor_business_id, anchor_kind);

UPDATE public.blog_posts
SET anchor_kind = 'owner'
WHERE anchor_business_id IS NOT NULL
  AND slug LIKE '%riad-dar-najat%';