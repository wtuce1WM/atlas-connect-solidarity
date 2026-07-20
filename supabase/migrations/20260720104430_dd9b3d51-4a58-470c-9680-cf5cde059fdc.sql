CREATE TABLE public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  chat_id uuid REFERENCES public.ai_chats(id) ON DELETE SET NULL,
  context text NOT NULL,
  model text,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  error_message text,
  request_id text,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(12, 8) NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_ai_usage_events_created_at ON public.ai_usage_events(created_at DESC);
CREATE INDEX idx_ai_usage_events_user_id ON public.ai_usage_events(user_id, created_at DESC);
CREATE INDEX idx_ai_usage_events_affiliate_id ON public.ai_usage_events(affiliate_id, created_at DESC);
CREATE INDEX idx_ai_usage_events_business_id ON public.ai_usage_events(business_id, created_at DESC);
CREATE INDEX idx_ai_usage_events_context ON public.ai_usage_events(context, created_at DESC);
CREATE INDEX idx_ai_usage_events_status ON public.ai_usage_events(status) WHERE status = 'error';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_usage_events TO authenticated;
GRANT ALL ON public.ai_usage_events TO service_role;

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage events"
  ON public.ai_usage_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff can view all AI usage events"
  ON public.ai_usage_events FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "Authenticated can insert own AI usage events"
  ON public.ai_usage_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_staff(auth.uid()));

CREATE POLICY "Service role can manage all AI usage events"
  ON public.ai_usage_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.resolve_affiliate_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.affiliates WHERE user_id = _user_id LIMIT 1;
$$;