ALTER TABLE public.ai_followups ADD COLUMN IF NOT EXISTS route_override text;
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS route_override text;

ALTER TABLE public.ai_followups DROP CONSTRAINT IF EXISTS ai_followups_route_override_check;
ALTER TABLE public.ai_followups ADD CONSTRAINT ai_followups_route_override_check
  CHECK (route_override IS NULL OR route_override IN (
    'search_businesses','show_on_map','contacts','opening_hours','hours_ranking_opens_first',
    'hours_ranking_closes_last','open_now','booking','distance_ranking_closest','distance_ranking_farthest',
    'rating_best','rating_most_reviewed','weather','tides','poi_nearby','nearby_overview','describe','count','llm'
  ));

ALTER TABLE public.ai_suggestions DROP CONSTRAINT IF EXISTS ai_suggestions_route_override_check;
ALTER TABLE public.ai_suggestions ADD CONSTRAINT ai_suggestions_route_override_check
  CHECK (route_override IS NULL OR route_override IN (
    'search_businesses','show_on_map','contacts','opening_hours','hours_ranking_opens_first',
    'hours_ranking_closes_last','open_now','booking','distance_ranking_closest','distance_ranking_farthest',
    'rating_best','rating_most_reviewed','weather','tides','poi_nearby','nearby_overview','describe','count','llm'
  ));