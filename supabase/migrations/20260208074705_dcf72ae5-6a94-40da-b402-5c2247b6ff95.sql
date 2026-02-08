-- Add KP regroupement field to businesses table
ALTER TABLE public.businesses
ADD COLUMN kp_regroupement VARCHAR(20);