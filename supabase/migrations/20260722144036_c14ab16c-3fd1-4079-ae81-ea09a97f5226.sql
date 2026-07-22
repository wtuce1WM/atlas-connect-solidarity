
CREATE TABLE public.ai_conversation_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID,
  user_id UUID,
  affiliate_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_message TEXT,
  intent_classified TEXT,
  route_taken TEXT,
  tools_called JSONB DEFAULT '[]'::jsonb,
  latency_ms_total INTEGER,
  latency_ms_first_token INTEGER,
  latency_ms_synth INTEGER,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd NUMERIC(10,6),
  city_active TEXT,
  city_detected TEXT,
  results_count INTEGER,
  results_shown INTEGER,
  had_error BOOLEAN DEFAULT false,
  error_message TEXT,
  stream_completed BOOLEAN DEFAULT true,
  feedback_score SMALLINT,
  feedback_comment TEXT,
  message_index INTEGER,
  language TEXT
);

GRANT SELECT ON public.ai_conversation_turns TO authenticated;
GRANT ALL ON public.ai_conversation_turns TO service_role;

ALTER TABLE public.ai_conversation_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all turns"
  ON public.ai_conversation_turns FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update feedback on their own turns"
  ON public.ai_conversation_turns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ai_turns_created_at ON public.ai_conversation_turns(created_at DESC);
CREATE INDEX idx_ai_turns_chat_id ON public.ai_conversation_turns(chat_id);
CREATE INDEX idx_ai_turns_user_id ON public.ai_conversation_turns(user_id);
CREATE INDEX idx_ai_turns_route_taken ON public.ai_conversation_turns(route_taken);
CREATE INDEX idx_ai_turns_had_error ON public.ai_conversation_turns(had_error) WHERE had_error = true;
