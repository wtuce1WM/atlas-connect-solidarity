-- Trigger function to update businesses when a category name changes
CREATE OR REPLACE FUNCTION public.sync_category_name_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update main_category in businesses when category name_fr changes
  IF OLD.name_fr IS DISTINCT FROM NEW.name_fr THEN
    UPDATE businesses 
    SET main_category = NEW.name_fr
    WHERE main_category = OLD.name_fr;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function to update businesses when a subcategory name changes
CREATE OR REPLACE FUNCTION public.sync_subcategory_name_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update categories array in businesses when subcategory name_fr changes
  IF OLD.name_fr IS DISTINCT FROM NEW.name_fr THEN
    UPDATE businesses 
    SET categories = array_replace(categories, OLD.name_fr, NEW.name_fr)
    WHERE OLD.name_fr = ANY(categories);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function to update businesses when a service name changes
CREATE OR REPLACE FUNCTION public.sync_service_name_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update services array in businesses when service name_fr changes
  IF OLD.name_fr IS DISTINCT FROM NEW.name_fr THEN
    UPDATE businesses 
    SET services = array_replace(services, OLD.name_fr, NEW.name_fr)
    WHERE OLD.name_fr = ANY(services);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers on taxonomy tables
DROP TRIGGER IF EXISTS trigger_sync_category_name ON categories;
CREATE TRIGGER trigger_sync_category_name
  AFTER UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION sync_category_name_change();

DROP TRIGGER IF EXISTS trigger_sync_subcategory_name ON subcategories;
CREATE TRIGGER trigger_sync_subcategory_name
  AFTER UPDATE ON subcategories
  FOR EACH ROW
  EXECUTE FUNCTION sync_subcategory_name_change();

DROP TRIGGER IF EXISTS trigger_sync_service_name ON services;
CREATE TRIGGER trigger_sync_service_name
  AFTER UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION sync_service_name_change();