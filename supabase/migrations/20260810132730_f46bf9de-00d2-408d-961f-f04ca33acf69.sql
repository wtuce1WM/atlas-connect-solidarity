GRANT SELECT ON public.ai_suggestions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_suggestions TO authenticated;
GRANT ALL ON public.ai_suggestions TO service_role;

GRANT SELECT ON public.ai_followups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_followups TO authenticated;
GRANT ALL ON public.ai_followups TO service_role;