ALTER TABLE public.knowledge_entries 
ADD COLUMN IF NOT EXISTS external_urls_title text,
ADD COLUMN IF NOT EXISTS external_urls jsonb DEFAULT '[]'::jsonb;