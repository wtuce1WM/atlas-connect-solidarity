
-- Add kp_active boolean column, default false for new businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS kp_active boolean NOT NULL DEFAULT false;

-- Set kp_active = true for all existing businesses that share a kp_regroupement with at least one other business
UPDATE public.businesses b
SET kp_active = true
WHERE b.kp_regroupement IS NOT NULL
  AND b.kp_regroupement != ''
  AND EXISTS (
    SELECT 1 FROM public.businesses b2
    WHERE b2.kp_regroupement = b.kp_regroupement
      AND b2.id != b.id
  );
