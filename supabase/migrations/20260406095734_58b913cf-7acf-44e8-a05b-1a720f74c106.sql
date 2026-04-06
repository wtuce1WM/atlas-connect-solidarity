ALTER TABLE public.destinations ADD COLUMN city_ids uuid[] DEFAULT '{}';
UPDATE public.destinations SET city_ids = ARRAY[city_id] WHERE city_id IS NOT NULL;
ALTER TABLE public.destinations DROP COLUMN city_id;