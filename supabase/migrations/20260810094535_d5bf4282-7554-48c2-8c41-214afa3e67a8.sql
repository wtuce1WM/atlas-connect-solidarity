ALTER TABLE public.search_logs
  ADD COLUMN IF NOT EXISTS resolved_targets jsonb,
  ADD COLUMN IF NOT EXISTS resolved_types text[],
  ADD COLUMN IF NOT EXISTS resolution_unresolved boolean,
  ADD COLUMN IF NOT EXISTS resolution_service_only boolean;

ALTER TABLE public.ai_conversation_turns
  ADD COLUMN IF NOT EXISTS resolved_targets jsonb,
  ADD COLUMN IF NOT EXISTS resolved_types text[],
  ADD COLUMN IF NOT EXISTS resolution_unresolved boolean,
  ADD COLUMN IF NOT EXISTS resolution_service_only boolean;

CREATE INDEX IF NOT EXISTS idx_search_logs_resolution_unresolved
  ON public.search_logs (resolution_unresolved) WHERE resolution_unresolved IS TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_turns_resolution_unresolved
  ON public.ai_conversation_turns (resolution_unresolved) WHERE resolution_unresolved IS TRUE;