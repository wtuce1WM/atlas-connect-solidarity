ALTER TABLE public.club_ai_suggestions ADD COLUMN IF NOT EXISTS city text NULL;
COMMENT ON COLUMN public.club_ai_suggestions.city IS 'NULL = universel ; sinon Marrakech ou Essaouira';