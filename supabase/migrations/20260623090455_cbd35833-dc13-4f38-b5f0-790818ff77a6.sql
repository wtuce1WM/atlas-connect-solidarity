
-- Allow anonymous users to create and update their own anonymous AI chats (user_id IS NULL).
-- Anon chats are automatically public so the share link works for the recipient.

CREATE POLICY "Anyone can insert anonymous chats"
  ON public.ai_chats
  FOR INSERT
  WITH CHECK (user_id IS NULL AND is_public = true);

CREATE POLICY "Anyone can update anonymous chats"
  ON public.ai_chats
  FOR UPDATE
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL AND is_public = true);

GRANT INSERT, UPDATE ON public.ai_chats TO anon;
