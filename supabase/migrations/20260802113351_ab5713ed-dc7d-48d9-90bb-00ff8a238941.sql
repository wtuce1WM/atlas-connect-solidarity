ALTER TABLE public.business_ai_texts
  ADD COLUMN IF NOT EXISTS extra_instructions text,
  ADD COLUMN IF NOT EXISTS length_mode text;