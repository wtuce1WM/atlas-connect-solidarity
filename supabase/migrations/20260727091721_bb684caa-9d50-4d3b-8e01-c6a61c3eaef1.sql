ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS anchor_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS blog_posts_anchor_business_id_idx ON public.blog_posts(anchor_business_id);

UPDATE public.blog_posts
SET anchor_business_id = '96ce97b9-17ff-4345-93f1-be78d880ed06'
WHERE slug = '10-meilleures-tables-proche-riad-dar-najat-marrakech';