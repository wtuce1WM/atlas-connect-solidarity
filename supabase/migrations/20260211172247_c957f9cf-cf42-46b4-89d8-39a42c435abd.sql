
-- Attach sync triggers to taxonomy tables
CREATE TRIGGER sync_category_name_change
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.sync_category_name_change();

CREATE TRIGGER sync_subcategory_name_change
BEFORE UPDATE ON public.subcategories
FOR EACH ROW
EXECUTE FUNCTION public.sync_subcategory_name_change();

CREATE TRIGGER sync_service_name_change
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.sync_service_name_change();
