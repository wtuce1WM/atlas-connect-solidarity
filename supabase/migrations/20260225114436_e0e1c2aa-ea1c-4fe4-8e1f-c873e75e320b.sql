
-- Table for intent word → category mappings (replaces hardcoded INTENT_TO_CATEGORY)
CREATE TABLE public.search_intent_words (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word text NOT NULL,
  category_name text NOT NULL,
  merge_on_conflict boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(word)
);

-- RLS policies
ALTER TABLE public.search_intent_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Intent words are viewable by everyone" ON public.search_intent_words
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert intent words" ON public.search_intent_words
  FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update intent words" ON public.search_intent_words
  FOR UPDATE USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete intent words" ON public.search_intent_words
  FOR DELETE USING (is_staff(auth.uid()));

-- Seed with existing hardcoded values
INSERT INTO public.search_intent_words (word, category_name, merge_on_conflict) VALUES
  ('manger', 'Restauration', true),
  ('déjeuner', 'Restauration', true),
  ('dejeuner', 'Restauration', true),
  ('dîner', 'Restauration', true),
  ('diner', 'Restauration', true),
  ('souper', 'Restauration', true),
  ('boire', 'Restauration', true),
  ('déguster', 'Restauration', true),
  ('deguster', 'Restauration', true),
  ('goûter', 'Restauration', true),
  ('gouter', 'Restauration', true),
  ('bruncher', 'Restauration', true),
  ('acheter', 'Commerce', true),
  ('achat', 'Commerce', true),
  ('achats', 'Commerce', true),
  ('shopping', 'Commerce', true),
  ('courses', 'Commerce', true),
  ('dormir', 'Hôtellerie', true),
  ('héberger', 'Hôtellerie', true),
  ('heberger', 'Hôtellerie', true),
  ('loger', 'Hôtellerie', true),
  ('séjourner', 'Hôtellerie', true),
  ('sejourner', 'Hôtellerie', true),
  ('nuit', 'Hôtellerie', true),
  ('nuitée', 'Hôtellerie', true),
  ('nuitee', 'Hôtellerie', true);
