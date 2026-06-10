
-- =========================================
-- video_views : log brut des vues
-- =========================================
CREATE TABLE public.video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL,
  video_source text NOT NULL CHECK (video_source IN ('youtube','business','generic')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX video_views_video_idx ON public.video_views (video_source, video_id);
CREATE INDEX video_views_user_idx ON public.video_views (user_id);

GRANT SELECT, INSERT ON public.video_views TO anon;
GRANT SELECT, INSERT ON public.video_views TO authenticated;
GRANT ALL ON public.video_views TO service_role;

ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view video views"
  ON public.video_views FOR SELECT
  USING (true);

CREATE POLICY "Anyone can log a view"
  ON public.video_views FOR INSERT
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );

-- =========================================
-- video_bookmarks : favoris par vidéo
-- =========================================
CREATE TABLE public.video_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  video_source text NOT NULL CHECK (video_source IN ('youtube','business','generic')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id, video_source)
);

CREATE INDEX video_bookmarks_video_idx ON public.video_bookmarks (video_source, video_id);
CREATE INDEX video_bookmarks_user_idx ON public.video_bookmarks (user_id);

GRANT SELECT ON public.video_bookmarks TO anon;
GRANT SELECT, INSERT, DELETE ON public.video_bookmarks TO authenticated;
GRANT ALL ON public.video_bookmarks TO service_role;

ALTER TABLE public.video_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view video bookmarks"
  ON public.video_bookmarks FOR SELECT
  USING (true);

CREATE POLICY "Users can bookmark videos"
  ON public.video_bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own video bookmarks"
  ON public.video_bookmarks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
