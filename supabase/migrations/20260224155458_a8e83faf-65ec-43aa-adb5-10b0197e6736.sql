
-- Table de configuration de recherche par sous-catégorie
CREATE TABLE public.subcategory_search_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcategory_id UUID NOT NULL UNIQUE REFERENCES public.subcategories(id) ON DELETE CASCADE,
  search_mode TEXT NOT NULL DEFAULT 'broad' CHECK (search_mode IN ('strict', 'broad')),
  max_results INTEGER NULL CHECK (max_results IS NULL OR max_results > 0),
  boost_weight NUMERIC NOT NULL DEFAULT 1.0 CHECK (boost_weight >= 0 AND boost_weight <= 10),
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subcategory_search_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read (needed by edge function)
CREATE POLICY "Search config is viewable by everyone"
ON public.subcategory_search_config
FOR SELECT USING (true);

-- Only staff can manage
CREATE POLICY "Staff can insert search config"
ON public.subcategory_search_config
FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update search config"
ON public.subcategory_search_config
FOR UPDATE USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete search config"
ON public.subcategory_search_config
FOR DELETE USING (is_staff(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_subcategory_search_config_updated_at
BEFORE UPDATE ON public.subcategory_search_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.subcategory_search_config IS 'Paramètres de recherche par sous-catégorie : mode de filtrage, max résultats, boost, synonymes';
COMMENT ON COLUMN public.subcategory_search_config.search_mode IS 'strict = filtre sur le array categories (comme page sous-catégorie), broad = full-text (comportement par défaut)';
COMMENT ON COLUMN public.subcategory_search_config.max_results IS 'Nombre max de résultats pour cette sous-catégorie (NULL = pas de limite)';
COMMENT ON COLUMN public.subcategory_search_config.boost_weight IS 'Multiplicateur de pertinence (1.0 = normal, >1 = prioritaire, <1 = rétrogradé)';
COMMENT ON COLUMN public.subcategory_search_config.synonyms IS 'Termes alternatifs qui déclenchent le même filtrage (ex: resto, restau pour Restaurant)';
