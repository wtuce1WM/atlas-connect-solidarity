
CREATE OR REPLACE FUNCTION public.update_business_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.city, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.neighborhood, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.main_category, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.categories, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.services, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.keywords, ' '), '')), 'B');
  RETURN NEW;
END;
$function$;

-- Regenerate all search vectors without region
UPDATE businesses SET search_vector = 
  setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(city, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(neighborhood, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(main_category, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(array_to_string(categories, ' '), '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(array_to_string(services, ' '), '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(array_to_string(keywords, ' '), '')), 'B');
