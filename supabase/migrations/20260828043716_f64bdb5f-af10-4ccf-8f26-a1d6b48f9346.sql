create or replace function public.get_hotel_mappings_by_city(_city text)
returns table(id uuid, serp_hotel_name text, business_id uuid, city text)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.serp_hotel_name, m.business_id, m.city
  from public.hotel_mappings m
  where m.city ilike _city
    and m.business_id is not null
    and m.serp_hotel_name is not null
$$;

grant execute on function public.get_hotel_mappings_by_city(text) to anon, authenticated, service_role;