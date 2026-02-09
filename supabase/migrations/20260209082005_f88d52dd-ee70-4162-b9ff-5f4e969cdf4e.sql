-- Update trigger function to sync all language names for categories
CREATE OR REPLACE FUNCTION public.sync_category_name_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update main_category in businesses when category name changes (any language)
  IF OLD.name_fr IS DISTINCT FROM NEW.name_fr THEN
    UPDATE businesses 
    SET main_category = NEW.name_fr
    WHERE main_category = OLD.name_fr;
  END IF;
  
  IF OLD.name_en IS DISTINCT FROM NEW.name_en AND OLD.name_en IS NOT NULL THEN
    UPDATE businesses 
    SET main_category = NEW.name_en
    WHERE main_category = OLD.name_en;
  END IF;
  
  IF OLD.name_ar IS DISTINCT FROM NEW.name_ar AND OLD.name_ar IS NOT NULL THEN
    UPDATE businesses 
    SET main_category = NEW.name_ar
    WHERE main_category = OLD.name_ar;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update trigger function to sync all language names for subcategories
CREATE OR REPLACE FUNCTION public.sync_subcategory_name_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update categories array in businesses when subcategory name changes (any language)
  IF OLD.name_fr IS DISTINCT FROM NEW.name_fr THEN
    UPDATE businesses 
    SET categories = array_replace(categories, OLD.name_fr, NEW.name_fr)
    WHERE OLD.name_fr = ANY(categories);
  END IF;
  
  IF OLD.name_en IS DISTINCT FROM NEW.name_en AND OLD.name_en IS NOT NULL THEN
    UPDATE businesses 
    SET categories = array_replace(categories, OLD.name_en, NEW.name_en)
    WHERE OLD.name_en = ANY(categories);
  END IF;
  
  IF OLD.name_ar IS DISTINCT FROM NEW.name_ar AND OLD.name_ar IS NOT NULL THEN
    UPDATE businesses 
    SET categories = array_replace(categories, OLD.name_ar, NEW.name_ar)
    WHERE OLD.name_ar = ANY(categories);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update trigger function to sync all language names for services
CREATE OR REPLACE FUNCTION public.sync_service_name_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update services array in businesses when service name changes (any language)
  IF OLD.name_fr IS DISTINCT FROM NEW.name_fr THEN
    UPDATE businesses 
    SET services = array_replace(services, OLD.name_fr, NEW.name_fr)
    WHERE OLD.name_fr = ANY(services);
  END IF;
  
  IF OLD.name_en IS DISTINCT FROM NEW.name_en AND OLD.name_en IS NOT NULL THEN
    UPDATE businesses 
    SET services = array_replace(services, OLD.name_en, NEW.name_en)
    WHERE OLD.name_en = ANY(services);
  END IF;
  
  IF OLD.name_ar IS DISTINCT FROM NEW.name_ar AND OLD.name_ar IS NOT NULL THEN
    UPDATE businesses 
    SET services = array_replace(services, OLD.name_ar, NEW.name_ar)
    WHERE OLD.name_ar = ANY(services);
  END IF;
  
  RETURN NEW;
END;
$$;