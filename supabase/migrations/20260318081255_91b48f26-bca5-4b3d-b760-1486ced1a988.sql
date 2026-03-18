
-- Function to check if a user is an affiliate for a given business
CREATE OR REPLACE FUNCTION public.is_own_affiliate_business(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.affiliates a
    JOIN public.businesses b ON b.affiliate_id = a.id
    WHERE a.user_id = _user_id
      AND b.id = _business_id
  )
$$;

-- Allow affiliates to view their own affiliate record
CREATE POLICY "Affiliates can view own record"
ON public.affiliates
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow affiliates to update their own businesses
CREATE POLICY "Affiliates can update own businesses"
ON public.businesses
FOR UPDATE
TO authenticated
USING (is_own_affiliate_business(auth.uid(), id))
WITH CHECK (is_own_affiliate_business(auth.uid(), id));
