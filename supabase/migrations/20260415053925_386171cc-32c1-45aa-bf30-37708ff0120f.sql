-- Ajout d'un titre de section personnalisable pour les highlights
ALTER TABLE public.front_highlights 
ADD COLUMN section_title TEXT NULL;

-- Met à jour tous les enregistrements existants avec une valeur par défaut
UPDATE public.front_highlights 
SET section_title = 'Nos Points Forts' 
WHERE section_title IS NULL;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_front_highlights_business_id_sort 
ON public.front_highlights(business_id, sort_order);