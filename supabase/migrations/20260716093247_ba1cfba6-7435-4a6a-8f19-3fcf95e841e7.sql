ALTER TABLE public.ai_chats ADD COLUMN IF NOT EXISTS anon_token uuid DEFAULT gen_random_uuid();

DROP POLICY IF EXISTS "Anyone can update anonymous chats" ON public.ai_chats;

CREATE POLICY "Anonymous chat owners can update their own chat"
  ON public.ai_chats
  FOR UPDATE
  USING (
    user_id IS NULL
    AND anon_token = (current_setting('request.headers.x-anon-token', true)::uuid)
  )
  WITH CHECK (
    user_id IS NULL
    AND is_public = true
    AND anon_token = (current_setting('request.headers.x-anon-token', true)::uuid)
  );

GRANT UPDATE ON public.ai_chats TO anon;