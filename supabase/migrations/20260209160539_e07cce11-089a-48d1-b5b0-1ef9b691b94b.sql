
-- Update the trigger function to include city and region in search_vector
CREATE OR REPLACE FUNCTION public.update_business_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.city, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.region, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.main_category, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.categories, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.services, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.keywords, ' '), '')), 'B');
  RETURN NEW;
END;
$function$;

-- Regenerate search vectors for all existing businesses
UPDATE businesses SET search_vector = 
  setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(city, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(region, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(main_category, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(array_to_string(categories, ' '), '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(array_to_string(services, ' '), '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(array_to_string(keywords, ' '), '')), 'B');
