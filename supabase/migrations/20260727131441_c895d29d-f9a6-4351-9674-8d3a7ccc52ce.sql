ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS blog_posts_pinned_idx ON public.blog_posts (is_pinned, published_at DESC);