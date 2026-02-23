
-- Update the search_vector trigger to focus on: name, subcategories, services, service keywords, neighborhood, city
-- Remove: hook_fr, description, main_category
CREATE OR REPLACE FUNCTION public.update_business_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  service_keywords_text TEXT := '';
BEGIN
  -- Fetch keywords from the services table matching business service names
  SELECT string_agg(kw, ' ') INTO service_keywords_text
  FROM (
    SELECT unnest(s.keywords) AS kw
    FROM public.services s
    WHERE s.name_fr = ANY(NEW.services)
       OR s.name_en = ANY(NEW.services)
       OR s.name_ar = ANY(NEW.services)
  ) sub;

  NEW.search_vector := 
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.city, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.neighborhood, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.categories, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.services, ' '), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.keywords, ' '), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(service_keywords_text, '')), 'B');
  RETURN NEW;
END;
$function$;

-- Regenerate all search vectors by touching every row
UPDATE businesses SET updated_at = now() WHERE is_active = true;
