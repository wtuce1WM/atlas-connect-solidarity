-- Attach the service name sync trigger
CREATE TRIGGER trg_sync_service_name_change
  AFTER UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_service_name_change();

-- Attach the subcategory name sync trigger
CREATE TRIGGER trg_sync_subcategory_name_change
  AFTER UPDATE ON public.subcategories
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_subcategory_name_change();

-- Attach the category name sync trigger
CREATE TRIGGER trg_sync_category_name_change
  AFTER UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_category_name_change();

-- Attach service keywords propagation trigger
CREATE TRIGGER trg_propagate_service_keywords
  AFTER UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_service_keywords_change();

-- Attach subcategory keywords propagation trigger
CREATE TRIGGER trg_propagate_subcategory_keywords
  AFTER UPDATE ON public.subcategories
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_subcategory_keywords_change();

-- Attach search vector trigger on businesses
CREATE TRIGGER trg_update_business_search_vector
  BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_business_search_vector();

-- Attach updated_at triggers
CREATE TRIGGER trg_updated_at_businesses
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();