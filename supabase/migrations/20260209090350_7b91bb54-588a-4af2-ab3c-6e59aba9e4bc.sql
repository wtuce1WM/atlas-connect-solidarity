-- Add 'affiliate' role to the existing enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'affiliate';

-- Add user_id column to affiliates table to link with auth.users
ALTER TABLE public.affiliates
ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON public.affiliates(user_id);