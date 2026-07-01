
ALTER TABLE public.search_service_filters
  ADD COLUMN IF NOT EXISTS keyword_en text,
  ADD COLUMN IF NOT EXISTS keyword_ar text;

ALTER TABLE public.neighborhoods
  ADD COLUMN IF NOT EXISTS hook_en text,
  ADD COLUMN IF NOT EXISTS hook_ar text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_ar text;

ALTER TABLE public.event_types
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_ar text;
