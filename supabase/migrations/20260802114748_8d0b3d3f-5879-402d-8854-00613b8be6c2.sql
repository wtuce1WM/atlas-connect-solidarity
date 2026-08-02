ALTER TABLE public.business_feature_rights
  ADD COLUMN IF NOT EXISTS has_email_signature boolean NOT NULL DEFAULT true;

UPDATE public.business_feature_rights SET has_email_signature = true WHERE has_email_signature IS NOT TRUE;