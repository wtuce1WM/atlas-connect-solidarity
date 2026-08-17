update public.destinations
set keywords = array(select distinct unnest(coalesce(keywords, '{}'::text[]) || array['atlas','montagnes de l''atlas','haut atlas','moyen atlas']))
where name_fr = 'Montagnes de l’Atlas';