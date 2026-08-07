-- ============ ENUMS ============
CREATE TYPE public.quote_status AS ENUM ('draft','sent','accepted','refused','expired','invoiced');
CREATE TYPE public.invoice_status AS ENUM ('unpaid','paid');
CREATE TYPE public.billing_payment_status AS ENUM ('pending','succeeded','failed');
CREATE TYPE public.billing_recurrence AS ENUM ('one_time','monthly','quarterly','yearly');
CREATE TYPE public.billing_price_source AS ENUM ('grid','manual');
CREATE TYPE public.billing_currency AS ENUM ('MAD','EUR','USD');

-- ============ shared updated_at trigger fn ============
CREATE OR REPLACE FUNCTION public.billing_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ 1. billing_services (nouvelle table dédiée) ============
CREATE TABLE public.billing_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name_fr text NOT NULL,
  description_fr text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_services TO authenticated;
GRANT ALL ON public.billing_services TO service_role;
ALTER TABLE public.billing_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage billing_services" ON public.billing_services
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_billing_services_updated BEFORE UPDATE ON public.billing_services
  FOR EACH ROW EXECUTE FUNCTION public.billing_set_updated_at();

-- ============ 2. pricing_grids (versionnée) ============
CREATE TABLE public.pricing_grids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.billing_services(id) ON DELETE RESTRICT,
  currency public.billing_currency NOT NULL DEFAULT 'MAD',
  recurrence public.billing_recurrence NOT NULL DEFAULT 'one_time',
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_to date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pricing_grids_lookup ON public.pricing_grids (service_id, currency, recurrence, is_active);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_grids TO authenticated;
GRANT ALL ON public.pricing_grids TO service_role;
ALTER TABLE public.pricing_grids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage pricing_grids" ON public.pricing_grids
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_pricing_grids_updated BEFORE UPDATE ON public.pricing_grids
  FOR EACH ROW EXECUTE FUNCTION public.billing_set_updated_at();

-- ============ 3. numérotation annuelle (serveur uniquement) ============
CREATE TABLE public.billing_number_sequences (
  kind text NOT NULL,
  year integer NOT NULL,
  last_value integer NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, year)
);
GRANT ALL ON public.billing_number_sequences TO service_role;
ALTER TABLE public.billing_number_sequences ENABLE ROW LEVEL SECURITY;
-- aucune policy : accès service_role / security definer uniquement

CREATE OR REPLACE FUNCTION public.next_billing_number(_kind text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _y integer := EXTRACT(YEAR FROM now())::int; _n integer; _prefix text;
BEGIN
  IF _kind NOT IN ('quote','invoice') THEN RAISE EXCEPTION 'invalid kind %', _kind; END IF;
  INSERT INTO public.billing_number_sequences (kind, year, last_value)
  VALUES (_kind, _y, 1)
  ON CONFLICT (kind, year) DO UPDATE SET last_value = public.billing_number_sequences.last_value + 1
  RETURNING last_value INTO _n;
  _prefix := CASE WHEN _kind = 'quote' THEN 'DEV' ELSE 'FAC' END;
  RETURN _prefix || '-' || _y::text || '-' || lpad(_n::text, 4, '0');
END; $$;
REVOKE ALL ON FUNCTION public.next_billing_number(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_billing_number(text) TO service_role;

-- ============ 4. quotes ============
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE,
  status public.quote_status NOT NULL DEFAULT 'draft',
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  prospect_email text,
  prospect_name text,
  currency public.billing_currency NOT NULL DEFAULT 'MAD',
  subtotal_ht numeric(12,2) NOT NULL DEFAULT 0,
  total_vat numeric(12,2) NOT NULL DEFAULT 0,
  total_ttc numeric(12,2) NOT NULL DEFAULT 0,
  created_by uuid,
  sent_at timestamptz,
  accepted_at timestamptz,
  refused_at timestamptz,
  expired_at timestamptz,
  invoiced_at timestamptz,
  expires_at date,
  reminder_sent_at timestamptz,
  refusal_reason text,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotes_recipient_required CHECK (
    affiliate_id IS NOT NULL OR (prospect_email IS NOT NULL AND prospect_name IS NOT NULL)
  )
);
CREATE INDEX idx_quotes_affiliate ON public.quotes (affiliate_id);
CREATE INDEX idx_quotes_status ON public.quotes (status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage quotes" ON public.quotes
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Affiliates view own quotes" ON public.quotes
  FOR SELECT TO authenticated USING (
    affiliate_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.affiliates a WHERE a.id = quotes.affiliate_id AND a.user_id = auth.uid()
    )
  );
CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.billing_set_updated_at();

-- ============ 5. quote_items ============
CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  label text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_ht numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price_ht >= 0),
  vat_rate numeric(5,2) NOT NULL DEFAULT 20,
  vat_exempt boolean NOT NULL DEFAULT false,
  vat_exempt_reason text,
  line_total_ht numeric(12,2) NOT NULL DEFAULT 0,
  line_total_vat numeric(12,2) NOT NULL DEFAULT 0,
  line_total_ttc numeric(12,2) NOT NULL DEFAULT 0,
  pricing_grid_id uuid REFERENCES public.pricing_grids(id) ON DELETE SET NULL,
  price_source public.billing_price_source NOT NULL DEFAULT 'grid',
  manual_reason text,
  recurrence public.billing_recurrence NOT NULL DEFAULT 'one_time',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_items_vat_exempt_reason CHECK (NOT vat_exempt OR vat_exempt_reason IS NOT NULL),
  CONSTRAINT quote_items_manual_reason CHECK (price_source <> 'manual' OR manual_reason IS NOT NULL)
);
CREATE INDEX idx_quote_items_quote ON public.quote_items (quote_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_items TO service_role;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage quote_items" ON public.quote_items
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Affiliates view own quote_items" ON public.quote_items
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.quotes q JOIN public.affiliates a ON a.id = q.affiliate_id
    WHERE q.id = quote_items.quote_id AND a.user_id = auth.uid()
  ));

-- ============ 6. invoices ============
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  status public.invoice_status NOT NULL DEFAULT 'unpaid',
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  prospect_email text,
  prospect_name text,
  currency public.billing_currency NOT NULL DEFAULT 'MAD',
  total_ht numeric(12,2) NOT NULL DEFAULT 0,
  total_vat numeric(12,2) NOT NULL DEFAULT 0,
  total_ttc numeric(12,2) NOT NULL DEFAULT 0,
  pdf_url text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_affiliate ON public.invoices (affiliate_id);
CREATE INDEX idx_invoices_quote ON public.invoices (quote_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage invoices" ON public.invoices
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Affiliates view own invoices" ON public.invoices
  FOR SELECT TO authenticated USING (
    affiliate_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.affiliates a WHERE a.id = invoices.affiliate_id AND a.user_id = auth.uid()
    )
  );
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.billing_set_updated_at();

-- ============ 7. invoice_items (copie figée) ============
CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  label text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price_ht numeric(12,2) NOT NULL DEFAULT 0,
  vat_rate numeric(5,2) NOT NULL DEFAULT 20,
  vat_exempt boolean NOT NULL DEFAULT false,
  vat_exempt_reason text,
  line_total_ht numeric(12,2) NOT NULL DEFAULT 0,
  line_total_vat numeric(12,2) NOT NULL DEFAULT 0,
  line_total_ttc numeric(12,2) NOT NULL DEFAULT 0,
  price_source public.billing_price_source NOT NULL DEFAULT 'grid',
  manual_reason text,
  recurrence public.billing_recurrence NOT NULL DEFAULT 'one_time',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items (invoice_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage invoice_items" ON public.invoice_items
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Affiliates view own invoice_items" ON public.invoice_items
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.invoices i JOIN public.affiliates a ON a.id = i.affiliate_id
    WHERE i.id = invoice_items.invoice_id AND a.user_id = auth.uid()
  ));

-- ============ 8. payment_links ============
CREATE TABLE public.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 days'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_links_invoice ON public.payment_links (invoice_id);
GRANT ALL ON public.payment_links TO service_role;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view payment_links" ON public.payment_links
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
GRANT SELECT ON public.payment_links TO authenticated;

-- ============ 9. payments ============
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_reference text,
  amount numeric(12,2) NOT NULL,
  currency public.billing_currency NOT NULL DEFAULT 'MAD',
  status public.billing_payment_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_invoice ON public.payments (invoice_id);
CREATE UNIQUE INDEX idx_payments_provider_ref ON public.payments (provider, provider_reference) WHERE provider_reference IS NOT NULL;
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view payments" ON public.payments
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Affiliates view own payments" ON public.payments
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.invoices i JOIN public.affiliates a ON a.id = i.affiliate_id
    WHERE i.id = payments.invoice_id AND a.user_id = auth.uid()
  ));