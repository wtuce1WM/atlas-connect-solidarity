
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS url_4 text,
  ADD COLUMN IF NOT EXISTS url_4_cta text,
  ADD COLUMN IF NOT EXISTS url_4_force_external boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS url_4_presentation_mode text NOT NULL DEFAULT 'acheter_en_ligne'::text,
  ADD COLUMN IF NOT EXISTS url_5 text,
  ADD COLUMN IF NOT EXISTS url_5_cta text,
  ADD COLUMN IF NOT EXISTS url_5_force_external boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS url_5_presentation_mode text NOT NULL DEFAULT 'acheter_en_ligne'::text;
