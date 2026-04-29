INSERT INTO public.business_document_cities (document_id, city_id)
SELECT bd.id, c.id
FROM public.business_documents bd
JOIN public.businesses b ON b.id = bd.business_id
JOIN public.cities c ON lower(c.name_fr) = lower(b.city)
WHERE bd.type = 'video'
  AND NOT EXISTS (
    SELECT 1 FROM public.business_document_cities bdc WHERE bdc.document_id = bd.id
  )
ON CONFLICT DO NOTHING;