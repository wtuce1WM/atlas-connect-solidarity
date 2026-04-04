UPDATE businesses
SET presentation_mode = 'consulter_offre', updated_at = now()
WHERE is_active = true
  AND presentation_mode != 'consulter_offre'
  AND EXISTS (
    SELECT 1 FROM subcategories s
    JOIN categories c ON c.id = s.category_id
    WHERE s.name_fr = businesses.categories[1]
      AND c.name_fr = 'Services'
  );