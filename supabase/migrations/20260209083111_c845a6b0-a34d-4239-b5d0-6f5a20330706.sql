-- Add KP regroupement field to affiliates
ALTER TABLE public.affiliates 
ADD COLUMN IF NOT EXISTS kp_regroupement text;