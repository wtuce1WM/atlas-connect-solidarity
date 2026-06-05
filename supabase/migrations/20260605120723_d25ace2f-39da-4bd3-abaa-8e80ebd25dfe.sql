
-- 1. Update the search_vector trigger function to include video + document text
CREATE OR REPLACE FUNCTION public.update_business_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  service_keywords_text TEXT := '';
  subcategory_keywords_text TEXT := '';
  clean_services TEXT := '';
  video_text TEXT := '';
  document_text TEXT := '';
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
  business_keywords_text TEXT := '';
BEGIN
  SELECT string_agg(kw, ' ') INTO service_keywords_text
  FROM (
    SELECT unnest(s.keywords) AS kw
    FROM public.services s
    WHERE s.name_fr = ANY(NEW.services)
       OR s.name_en = ANY(NEW.services)
       OR s.name_ar = ANY(NEW.services)
  ) sub;

  SELECT string_agg(kw, ' ') INTO subcategory_keywords_text
  FROM (
    SELECT unnest(sc.keywords) AS kw
    FROM public.subcategories sc
    WHERE sc.name_fr = ANY(NEW.categories)
       OR sc.name_en = ANY(NEW.categories)
       OR sc.name_ar = ANY(NEW.categories)
  ) sub;

  business_keywords_text := coalesce(array_to_string(NEW.keywords, ' '), '');

  clean_services := coalesce(array_to_string(NEW.services, ' '), '');
  service_words := string_to_array(clean_services, ' ');
  filtered_words := ARRAY[]::TEXT[];
  FOREACH word IN ARRAY service_words LOOP
    IF lower(word) != ALL(stopwords) THEN
      filtered_words := array_append(filtered_words, word);
    END IF;
  END LOOP;
  filtered_services := array_to_string(filtered_words, ' ');

  -- NEW: collect video text (YouTube titles + generic videos title/name/description)
  SELECT string_agg(t, ' ') INTO video_text
  FROM (
    SELECT title AS t
    FROM public.business_youtube_videos
    WHERE business_id = NEW.id AND title IS NOT NULL
    UNION ALL
    SELECT
      coalesce(gv.title, '') || ' ' || coalesce(gv.name, '') || ' ' || coalesce(gv.description, '') AS t
    FROM public.generic_video_businesses gvb
    JOIN public.generic_videos gv ON gv.id = gvb.generic_video_id
    WHERE gvb.business_id = NEW.id
  ) v;

  -- NEW: collect document text (name + description)
  SELECT string_agg(coalesce(name, '') || ' ' || coalesce(description, ''), ' ')
    INTO document_text
  FROM public.business_documents
  WHERE business_id = NEW.id;

  NEW.search_vector := 
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.name, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.city, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.neighborhood, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(array_to_string(NEW.categories, ' '), ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.country, ''))), 'C') ||
    setweight(to_tsvector('simple', unaccent(filtered_services)), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(service_keywords_text, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(subcategory_keywords_text, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(business_keywords_text)), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(video_text, ''))), 'C') ||
    setweight(to_tsvector('simple', unaccent(coalesce(document_text, ''))), 'C');
  RETURN NEW;
END;
$function$;

-- 2. Propagation trigger function: refresh businesses.search_vector when related text changes
CREATE OR REPLACE FUNCTION public.refresh_business_search_vector_for_ids(_ids uuid[])
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  UPDATE public.businesses SET updated_at = now() WHERE id = ANY(_ids);
$$;

-- 3. Trigger on business_youtube_videos (title changes)
CREATE OR REPLACE FUNCTION public.trg_propagate_yt_video_to_business_sv()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.business_id IS NOT NULL THEN ids := ARRAY[OLD.business_id]; END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.business_id IS NOT NULL THEN ids := ARRAY[NEW.business_id]; END IF;
  ELSE
    IF NEW.business_id IS DISTINCT FROM OLD.business_id THEN
      ids := ARRAY[NEW.business_id, OLD.business_id];
    ELSIF NEW.title IS DISTINCT FROM OLD.title THEN
      ids := ARRAY[NEW.business_id];
    END IF;
  END IF;
  IF array_length(ids, 1) > 0 THEN
    PERFORM public.refresh_business_search_vector_for_ids(ids);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_yt_video_sv_propagate ON public.business_youtube_videos;
CREATE TRIGGER trg_yt_video_sv_propagate
AFTER INSERT OR UPDATE OR DELETE ON public.business_youtube_videos
FOR EACH ROW EXECUTE FUNCTION public.trg_propagate_yt_video_to_business_sv();

-- 4. Trigger on generic_videos (title/name/description changes → all linked businesses)
CREATE OR REPLACE FUNCTION public.trg_propagate_generic_video_to_business_sv()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  ids uuid[];
  vid uuid;
BEGIN
  vid := COALESCE(NEW.id, OLD.id);
  IF TG_OP = 'UPDATE'
     AND NEW.title IS NOT DISTINCT FROM OLD.title
     AND NEW.name  IS NOT DISTINCT FROM OLD.name
     AND NEW.description IS NOT DISTINCT FROM OLD.description THEN
    RETURN NEW;
  END IF;
  SELECT array_agg(business_id) INTO ids
  FROM public.generic_video_businesses
  WHERE generic_video_id = vid AND business_id IS NOT NULL;
  IF ids IS NOT NULL AND array_length(ids, 1) > 0 THEN
    PERFORM public.refresh_business_search_vector_for_ids(ids);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_generic_video_sv_propagate ON public.generic_videos;
CREATE TRIGGER trg_generic_video_sv_propagate
AFTER UPDATE OR DELETE ON public.generic_videos
FOR EACH ROW EXECUTE FUNCTION public.trg_propagate_generic_video_to_business_sv();

-- 5. Trigger on generic_video_businesses linkage (insert/delete only)
CREATE OR REPLACE FUNCTION public.trg_propagate_generic_video_link_to_business_sv()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  bid uuid;
BEGIN
  bid := COALESCE(NEW.business_id, OLD.business_id);
  IF bid IS NOT NULL THEN
    PERFORM public.refresh_business_search_vector_for_ids(ARRAY[bid]);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_gvb_sv_propagate ON public.generic_video_businesses;
CREATE TRIGGER trg_gvb_sv_propagate
AFTER INSERT OR DELETE ON public.generic_video_businesses
FOR EACH ROW EXECUTE FUNCTION public.trg_propagate_generic_video_link_to_business_sv();

-- 6. Trigger on business_documents (name/description changes)
CREATE OR REPLACE FUNCTION public.trg_propagate_business_doc_to_business_sv()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.business_id IS NOT NULL THEN ids := ARRAY[OLD.business_id]; END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.business_id IS NOT NULL THEN ids := ARRAY[NEW.business_id]; END IF;
  ELSE
    IF NEW.business_id IS DISTINCT FROM OLD.business_id THEN
      ids := ARRAY[NEW.business_id, OLD.business_id];
    ELSIF NEW.name IS DISTINCT FROM OLD.name
       OR NEW.description IS DISTINCT FROM OLD.description THEN
      ids := ARRAY[NEW.business_id];
    END IF;
  END IF;
  IF array_length(ids, 1) > 0 THEN
    PERFORM public.refresh_business_search_vector_for_ids(ids);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_business_doc_sv_propagate ON public.business_documents;
CREATE TRIGGER trg_business_doc_sv_propagate
AFTER INSERT OR UPDATE OR DELETE ON public.business_documents
FOR EACH ROW EXECUTE FUNCTION public.trg_propagate_business_doc_to_business_sv();

-- 7. Reindex all businesses to apply the enrichment immediately
UPDATE public.businesses SET updated_at = now();
