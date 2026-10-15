CREATE TABLE public.quote_email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent','suppressed','failed')),
  error_message text,
  sent_by uuid,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quote_email_sends_quote_idx ON public.quote_email_sends(quote_id, sent_at DESC);
GRANT SELECT ON public.quote_email_sends TO authenticated;
GRANT ALL ON public.quote_email_sends TO service_role;
ALTER TABLE public.quote_email_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read quote email sends" ON public.quote_email_sends FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));