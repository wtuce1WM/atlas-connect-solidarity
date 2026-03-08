
-- Create table for multiple menu summaries per business
CREATE TABLE public.business_menu_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text,
  content text,
  avg_price_range jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_menu_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "business_menu_summaries_select" ON public.business_menu_summaries FOR SELECT USING (true);
CREATE POLICY "business_menu_summaries_insert" ON public.business_menu_summaries FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "business_menu_summaries_update" ON public.business_menu_summaries FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "business_menu_summaries_delete" ON public.business_menu_summaries FOR DELETE USING (is_staff(auth.uid()));

-- Migrate existing data from businesses table
INSERT INTO public.business_menu_summaries (business_id, title, content, avg_price_range, sort_order)
SELECT id, menu_summary_title, menu_summary, avg_price_range, 0
FROM public.businesses
WHERE menu_summary IS NOT NULL OR menu_summary_title IS NOT NULL OR avg_price_range IS NOT NULL;
