
CREATE TABLE public.hotel_api_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liteapi_hotel_id text NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (liteapi_hotel_id)
);

ALTER TABLE public.hotel_api_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hotel_api_mappings_select" ON public.hotel_api_mappings FOR SELECT USING (true);
CREATE POLICY "hotel_api_mappings_insert" ON public.hotel_api_mappings FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "hotel_api_mappings_update" ON public.hotel_api_mappings FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "hotel_api_mappings_delete" ON public.hotel_api_mappings FOR DELETE USING (is_staff(auth.uid()));
