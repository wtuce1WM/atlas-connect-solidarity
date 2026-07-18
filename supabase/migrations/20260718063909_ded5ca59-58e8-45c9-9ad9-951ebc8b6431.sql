ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS name_ar TEXT;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;

-- Existing RLS remains in place; no new policies needed.