ALTER TABLE public.embed_ai_suggestions
  ADD COLUMN IF NOT EXISTS proximity_a_subcategory_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS proximity_a_badge_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS proximity_b_subcategory_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS proximity_b_badge_ids uuid[] NOT NULL DEFAULT '{}';