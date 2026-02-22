
CREATE OR REPLACE FUNCTION public.update_business_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', coalesce(NEW.city, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.categories, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.services, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.hook_fr, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.keywords, ' '), '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(NEW.neighborhood, '')), 'D');
  RETURN NEW;
END;
$function$;

-- Regenerate all search vectors
UPDATE businesses SET updated_at = now();
