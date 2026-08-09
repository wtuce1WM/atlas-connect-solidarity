create or replace function public.staff_rls_matrix()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  res jsonb;
begin
  if not public.is_staff(auth.uid()) then
    raise exception 'forbidden';
  end if;

  select jsonb_agg(x order by x->>'t') into res from (
    select jsonb_build_object(
      't', c.relname,
      'rls', c.relrowsecurity,
      'forced', c.relforcerowsecurity,
      'anon', (select string_agg(p, ',') from (values ('select'),('insert'),('update'),('delete')) v(p)
               where has_table_privilege('anon', c.oid, v.p)),
      'auth', (select string_agg(p, ',') from (values ('select'),('insert'),('update'),('delete')) v(p)
               where has_table_privilege('authenticated', c.oid, v.p)),
      'svc', (select string_agg(p, ',') from (values ('select'),('insert'),('update'),('delete')) v(p)
              where has_table_privilege('service_role', c.oid, v.p)),
      'pol', (select jsonb_agg(jsonb_build_object(
                 'n', pol.policyname, 'c', pol.cmd,
                 'r', array_to_string(pol.roles, '+'),
                 'u', left(coalesce(pol.qual, ''), 220),
                 'w', left(coalesce(pol.with_check, ''), 220))
               order by pol.policyname)
              from pg_policies pol
              where pol.schemaname = 'public' and pol.tablename = c.relname)
    ) x
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  ) s;

  return coalesce(res, '[]'::jsonb);
end;
$$;

revoke all on function public.staff_rls_matrix() from public;
grant execute on function public.staff_rls_matrix() to authenticated;