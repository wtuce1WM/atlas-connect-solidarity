
-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_fr TEXT NOT NULL,
  title_en TEXT,
  title_ar TEXT,
  slug TEXT NOT NULL UNIQUE,
  excerpt_fr TEXT,
  excerpt_en TEXT,
  excerpt_ar TEXT,
  content_fr TEXT,
  content_en TEXT,
  content_ar TEXT,
  cover_image_url TEXT,
  author_name TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Published blog posts are viewable by everyone"
ON public.blog_posts
FOR SELECT
USING (is_published = true);

-- Staff can manage all posts
CREATE POLICY "Staff can manage blog posts"
ON public.blog_posts
FOR ALL
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
