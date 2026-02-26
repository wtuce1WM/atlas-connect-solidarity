
CREATE OR REPLACE FUNCTION public.update_business_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  service_keywords_text TEXT := '';
  clean_services TEXT := '';
  stopwords TEXT[] := ARRAY[
    'quotidien', 'quotidienne', 'quotidiens', 'quotidiennes',
    'service', 'services',
    'petit', 'petite', 'petits', 'petites',
    'grand', 'grande', 'grands', 'grandes',
    'nouveau', 'nouvelle', 'nouveaux', 'nouvelles',
    'gratuit', 'gratuite', 'gratuits', 'gratuites',
    'ouvert', 'ouverte', 'ouverts', 'ouvertes',
    'disponible', 'disponibles',
    'complet', 'complète', 'complets', 'complètes',
    'inclus', 'incluse', 'incluses',
    'spécial', 'spéciale', 'spéciaux', 'spéciales',
    'général', 'générale', 'généraux', 'générales',
    'tout', 'toute', 'tous', 'toutes',
    'autre', 'autres',
    'avec', 'sans', 'pour', 'dans', 'sur', 'par', 'plus',
    'mise', 'jour', 'nuit'
  ];
  word TEXT;
  filtered_services TEXT := '';
  service_words TEXT[];
  filtered_words TEXT[];
BEGIN
  SELECT string_agg(kw, ' ') INTO service_keywords_text
  FROM (
    SELECT unnest(s.keywords) AS kw
    FROM public.services s
    WHERE s.name_fr = ANY(NEW.services)
       OR s.name_en = ANY(NEW.services)
       OR s.name_ar = ANY(NEW.services)
  ) sub;

  clean_services := coalesce(array_to_string(NEW.services, ' '), '');
  service_words := string_to_array(clean_services, ' ');
  filtered_words := ARRAY[]::TEXT[];
  FOREACH word IN ARRAY service_words LOOP
    IF lower(word) != ALL(stopwords) THEN
      filtered_words := array_append(filtered_words, word);
    END IF;
  END LOOP;
  filtered_services := array_to_string(filtered_words, ' ');

  NEW.search_vector := 
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.city, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.neighborhood, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.categories, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', filtered_services), 'B') ||
    setweight(to_tsvector('simple', coalesce(service_keywords_text, '')), 'B');
  RETURN NEW;
END;
$function$;
