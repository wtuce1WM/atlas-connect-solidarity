-- Add social media URL columns to businesses table
ALTER TABLE public.businesses
ADD COLUMN facebook_url TEXT,
ADD COLUMN instagram_url TEXT,
ADD COLUMN twitter_url TEXT,
ADD COLUMN linkedin_url TEXT,
ADD COLUMN youtube_url TEXT,
ADD COLUMN tiktok_url TEXT,
ADD COLUMN whatsapp TEXT;