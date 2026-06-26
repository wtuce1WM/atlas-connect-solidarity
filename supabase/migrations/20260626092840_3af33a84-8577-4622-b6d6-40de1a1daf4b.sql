ALTER TABLE public.ai_chats ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'search';
CREATE INDEX IF NOT EXISTS idx_ai_chats_user_kind_updated ON public.ai_chats(user_id, kind, updated_at DESC);