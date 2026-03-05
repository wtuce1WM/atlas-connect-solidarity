CREATE TABLE public.voice_intent_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_text text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_intent_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_intent_rules_select" ON public.voice_intent_rules FOR SELECT USING (true);
CREATE POLICY "voice_intent_rules_insert" ON public.voice_intent_rules FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "voice_intent_rules_update" ON public.voice_intent_rules FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "voice_intent_rules_delete" ON public.voice_intent_rules FOR DELETE USING (is_staff(auth.uid()));