
ALTER TABLE public.voice_intent_rules
  ADD COLUMN IF NOT EXISTS rule_text_en text,
  ADD COLUMN IF NOT EXISTS rule_text_ar text;

ALTER TABLE public.regions
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_ar text;
