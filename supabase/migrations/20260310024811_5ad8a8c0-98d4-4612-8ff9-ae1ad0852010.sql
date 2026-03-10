
-- Drop and recreate all triggers to ensure they exist
DROP TRIGGER IF EXISTS trg_propagate_subcategory_keywords ON public.subcategories;
DROP TRIGGER IF EXISTS trg_propagate_service_keywords ON public.services;
DROP TRIGGER IF EXISTS trg_sync_category_name ON public.categories;
DROP TRIGGER IF EXISTS trg_sync_subcategory_name ON public.subcategories;
DROP TRIGGER IF EXISTS trg_sync_service_name ON public.services;

CREATE TRIGGER trg_propagate_subcategory_keywords
  AFTER UPDATE ON public.subcategories
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_subcategory_keywords_change();

CREATE TRIGGER trg_propagate_service_keywords
  AFTER UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_service_keywords_change();

CREATE TRIGGER trg_sync_category_name
  AFTER UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_category_name_change();

CREATE TRIGGER trg_sync_subcategory_name
  AFTER UPDATE ON public.subcategories
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_subcategory_name_change();

CREATE TRIGGER trg_sync_service_name
  AFTER UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_service_name_change();
