CREATE TABLE public.article_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_slug)
);

GRANT SELECT, INSERT, DELETE ON public.article_bookmarks TO authenticated;
GRANT ALL ON public.article_bookmarks TO service_role;

ALTER TABLE public.article_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own article bookmarks"
  ON public.article_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own article bookmarks"
  ON public.article_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own article bookmarks"
  ON public.article_bookmarks FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all article bookmarks"
  ON public.article_bookmarks FOR SELECT
  USING (is_staff(auth.uid()));