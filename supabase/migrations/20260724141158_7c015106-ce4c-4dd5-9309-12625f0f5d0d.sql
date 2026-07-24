
-- 1) Strict folder-prefix ownership check for storage paths
CREATE OR REPLACE FUNCTION public.affiliate_owns_business_in_path(_user_id uuid, _name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.affiliates a
    JOIN public.businesses b ON b.affiliate_id = a.id
    WHERE a.user_id = _user_id
      AND regexp_replace(_name, '^.*/', '') LIKE b.id::text || '-%'
  )
$function$;

-- 2) Remove the overly permissive public SELECT policy on hotel_mappings
DROP POLICY IF EXISTS "Public can read hotel_mappings" ON public.hotel_mappings;
