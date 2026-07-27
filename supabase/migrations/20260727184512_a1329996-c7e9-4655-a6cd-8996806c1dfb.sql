
-- 1) ai_conversation_turns: allow users to read their own turns
CREATE POLICY "Users can read their own turns"
ON public.ai_conversation_turns
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2) business_events: remove open INSERT; ingestion goes through edge function (service_role)
DROP POLICY IF EXISTS "Anyone can insert business events" ON public.business_events;

-- 3) video_views: remove open INSERT; ingestion goes through edge function (service_role)
DROP POLICY IF EXISTS "Anyone can log a view" ON public.video_views;
