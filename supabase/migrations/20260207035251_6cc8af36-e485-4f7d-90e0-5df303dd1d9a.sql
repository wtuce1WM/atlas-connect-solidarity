-- Add rating field to businesses table (note on 20)
ALTER TABLE public.businesses 
ADD COLUMN rating numeric(3,1) CHECK (rating >= 0 AND rating <= 20);