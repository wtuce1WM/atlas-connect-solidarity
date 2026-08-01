ALTER TABLE public.club_ai_followups
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS radius_km numeric;