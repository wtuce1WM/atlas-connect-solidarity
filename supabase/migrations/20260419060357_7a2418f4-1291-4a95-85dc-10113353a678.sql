ALTER TABLE public.personas
  ADD COLUMN IF NOT EXISTS video_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- Migrer la valeur existante (si UUID valide) vers le tableau
UPDATE public.personas
SET video_ids = ARRAY[video_id::uuid]
WHERE video_id IS NOT NULL
  AND video_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (video_ids IS NULL OR array_length(video_ids, 1) IS NULL);

ALTER TABLE public.personas DROP COLUMN IF EXISTS video_id;