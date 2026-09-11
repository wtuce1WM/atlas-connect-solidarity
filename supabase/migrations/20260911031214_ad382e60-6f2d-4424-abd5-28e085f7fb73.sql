create or replace function public.get_serp_hotel_mapping_for_business(_business_id uuid)
returns table(serp_hotel_name text, city text)
language sql
stable
security definer
set search_path = public
as $$
  select hm.serp_hotel_name, hm.city
  from public.hotel_mappings hm
  where hm.business_id = _business_id
  limit 1
$$;

grant execute on function public.get_serp_hotel_mapping_for_business(uuid) to anon, authenticated, service_role;