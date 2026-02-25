CREATE TABLE public.search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  effective_query text,
  detected_city text,
  detected_neighborhood text,
  detected_subcategory text,
  search_mode text,
  search_level text,
  total_results integer DEFAULT 0,
  rerank_applied boolean DEFAULT false,
  rerank_latency_ms integer,
  results_before jsonb,
  results_after jsonb,
  movements jsonb,
  is_autocomplete boolean DEFAULT false,
  is_superlative boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view search logs" ON public.search_logs
  FOR SELECT USING (is_staff(auth.uid()));

CREATE POLICY "Service role can insert search logs" ON public.search_logs
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_search_logs_created_at ON public.search_logs (created_at DESC);
CREATE INDEX idx_search_logs_query ON public.search_logs (query);