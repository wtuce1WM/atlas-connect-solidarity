
CREATE TABLE public.knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  source TEXT DEFAULT 'chat'
);

ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Knowledge entries are viewable by staff"
  ON public.knowledge_entries FOR SELECT
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can insert knowledge entries"
  ON public.knowledge_entries FOR INSERT
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update knowledge entries"
  ON public.knowledge_entries FOR UPDATE
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete knowledge entries"
  ON public.knowledge_entries FOR DELETE
  USING (is_staff(auth.uid()));
