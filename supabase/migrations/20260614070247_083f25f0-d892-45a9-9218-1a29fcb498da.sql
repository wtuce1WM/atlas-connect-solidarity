UPDATE public.businesses
SET images = ARRAY['https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/business-images/businesses/6f48e2fa-bf01-4ce4-a51c-0e986ce17e18-streetfood-hero.jpg'] || COALESCE(images, ARRAY[]::text[])
WHERE id = '6f48e2fa-bf01-4ce4-a51c-0e986ce17e18';