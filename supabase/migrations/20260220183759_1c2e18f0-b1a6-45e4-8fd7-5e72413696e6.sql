-- Reduce description weight from B to D in search vector trigger
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
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(NEW.main_category, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.categories, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.services, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.keywords, ' '), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.hook_fr, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.hook_en, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.hook_ar, '')), 'B');
  RETURN NEW;
END;
$function$;