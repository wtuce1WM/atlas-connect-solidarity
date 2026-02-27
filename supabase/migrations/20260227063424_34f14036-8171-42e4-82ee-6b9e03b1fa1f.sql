
-- Create search_bundles table for multi-subcategory intent mapping
CREATE TABLE public.search_bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  subcategory_name TEXT, -- NULL means wildcard (match any subcategory)
  required_service TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE public.search_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_bundles_select" ON public.search_bundles FOR SELECT USING (true);
CREATE POLICY "search_bundles_insert" ON public.search_bundles FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "search_bundles_update" ON public.search_bundles FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "search_bundles_delete" ON public.search_bundles FOR DELETE USING (is_staff(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_search_bundles_updated_at
  BEFORE UPDATE ON public.search_bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
