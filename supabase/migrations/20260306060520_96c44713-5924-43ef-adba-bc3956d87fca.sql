-- Fix typo: "Marché hebdomaire" → "Marché hebdomadaire"
UPDATE subcategories SET name_fr = 'Marché hebdomadaire' WHERE id = '53135ede-6986-4ce6-bbb9-af5a8ad7537b';

-- Also update businesses that reference this subcategory in their categories array
UPDATE businesses 
SET categories = array_replace(categories, 'Marché hebdomaire', 'Marché hebdomadaire')
WHERE categories @> ARRAY['Marché hebdomaire'];