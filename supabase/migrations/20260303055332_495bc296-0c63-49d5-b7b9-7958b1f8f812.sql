
-- Trigger: when services.keywords change, refresh search_vector of linked businesses
CREATE OR REPLACE FUNCTION public.propagate_service_keywords_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.keywords IS DISTINCT FROM NEW.keywords THEN
    UPDATE businesses
    SET updated_at = now()
    WHERE NEW.name_fr = ANY(services)
       OR NEW.name_en = ANY(services)
       OR NEW.name_ar = ANY(services);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER propagate_service_keywords
AFTER UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.propagate_service_keywords_change();

-- Trigger: when subcategories.keywords change, refresh search_vector of linked businesses
CREATE OR REPLACE FUNCTION public.propagate_subcategory_keywords_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.keywords IS DISTINCT FROM NEW.keywords THEN
    UPDATE businesses
    SET updated_at = now()
    WHERE NEW.name_fr = ANY(categories)
       OR NEW.name_en = ANY(categories)
       OR NEW.name_ar = ANY(categories);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER propagate_subcategory_keywords
AFTER UPDATE ON public.subcategories
FOR EACH ROW
EXECUTE FUNCTION public.propagate_subcategory_keywords_change();
