
-- Extensions for scheduled purge
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =========================
-- Table: ai_chats
-- =========================
CREATE TABLE public.ai_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nouvelle conversation',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  city text,
  is_public boolean NOT NULL DEFAULT false,
  is_bookmarked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chats TO authenticated;
GRANT SELECT ON public.ai_chats TO anon;
GRANT ALL ON public.ai_chats TO service_role;

ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;

-- Public read for shared chats
CREATE POLICY "Public chats are readable by anyone"
  ON public.ai_chats FOR SELECT
  USING (is_public = true);

-- Owner full read
CREATE POLICY "Owners can read their chats"
  ON public.ai_chats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Owner insert
CREATE POLICY "Owners can insert their chats"
  ON public.ai_chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Owner update
CREATE POLICY "Owners can update their chats"
  ON public.ai_chats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owner delete
CREATE POLICY "Owners can delete their chats"
  ON public.ai_chats FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- updated_at trigger (reuses existing public.update_updated_at_column)
CREATE TRIGGER trg_ai_chats_updated_at
  BEFORE UPDATE ON public.ai_chats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ai_chats_user_id ON public.ai_chats(user_id);
CREATE INDEX idx_ai_chats_public_updated ON public.ai_chats(is_public, is_bookmarked, updated_at);

-- =========================
-- Table: ai_chat_bookmarks
-- =========================
CREATE TABLE public.ai_chat_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id uuid NOT NULL REFERENCES public.ai_chats(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, chat_id)
);

GRANT SELECT, INSERT, DELETE ON public.ai_chat_bookmarks TO authenticated;
GRANT ALL ON public.ai_chat_bookmarks TO service_role;

ALTER TABLE public.ai_chat_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own bookmarks"
  ON public.ai_chat_bookmarks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookmarks"
  ON public.ai_chat_bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON public.ai_chat_bookmarks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_ai_chat_bookmarks_user ON public.ai_chat_bookmarks(user_id);
CREATE INDEX idx_ai_chat_bookmarks_chat ON public.ai_chat_bookmarks(chat_id);

-- =========================
-- Daily purge: shared non-bookmarked chats older than 30 days
-- =========================
SELECT cron.schedule(
  'purge-expired-ai-chats',
  '0 3 * * *',
  $$
  DELETE FROM public.ai_chats
  WHERE is_bookmarked = false
    AND updated_at < now() - interval '30 days';
  $$
);
