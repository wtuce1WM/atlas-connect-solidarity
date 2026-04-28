-- Backfill: for every business_documents row whose legacy `city` field is set
-- but which has no corresponding entry in business_document_cities,
-- create the multi-city link so the document keeps appearing for that city
-- once the front-end stops reading the legacy `city` column.
INSERT INTO public.business_document_cities (document_id, city_id)
SELECT bd.id, c.id
FROM public.business_documents bd
JOIN public.cities c
  ON lower(c.name_fr) = lower(bd.city)
WHERE bd.city IS NOT NULL
  AND bd.city <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.business_document_cities bdc
    WHERE bdc.document_id = bd.id
      AND bdc.city_id = c.id
  )
ON CONFLICT DO NOTHING;