
-- Create search_history table for authenticated users
CREATE TABLE public.search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  city text,
  category text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX idx_search_history_user_id ON public.search_history(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own history
CREATE POLICY "Users can view own search history"
  ON public.search_history FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own searches
CREATE POLICY "Users can insert own searches"
  ON public.search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own history
CREATE POLICY "Users can delete own search history"
  ON public.search_history FOR DELETE
  USING (auth.uid() = user_id);

-- Staff can view all
CREATE POLICY "Staff can view all search history"
  ON public.search_history FOR SELECT
  USING (is_staff(auth.uid()));
