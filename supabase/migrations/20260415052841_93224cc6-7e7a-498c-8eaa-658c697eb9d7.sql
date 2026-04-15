-- Add business_id to front_highlights to link highlights to specific businesses
ALTER TABLE public.front_highlights ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_front_highlights_business_id ON public.front_highlights(business_id);

-- Create composite unique constraint to ensure exactly 4 slots per business
CREATE UNIQUE INDEX idx_front_highlights_business_sort ON public.front_highlights(business_id, sort_order);

-- Migrate existing data: keep as global (for backward compatibility, set business_id to NULL)
-- New highlights will be created per-business

-- Update RLS policies
ALTER TABLE public.front_highlights ENABLE ROW LEVEL SECURITY;

-- Allow staff to manage all highlights
CREATE POLICY "Staff can manage front highlights"
ON public.front_highlights
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'staff');

-- Allow public to view highlights
CREATE POLICY "Public can view front highlights"
ON public.front_highlights
FOR SELECT
TO anon, authenticated
USING (true);