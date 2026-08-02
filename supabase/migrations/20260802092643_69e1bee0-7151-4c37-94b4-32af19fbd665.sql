ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS has_ai_assistant boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_blog_export boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_nearby_widget boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_email_signature boolean NOT NULL DEFAULT true;