
-- Lot 1 / M4 : contraintes d'intégrité (anti double facture, anti double paiement,
-- unicité des numéros, cohérence des montants). Tables vides en prod : aucun risque
-- de conflit avec des données existantes.

CREATE UNIQUE INDEX invoices_quote_id_uniq ON public.invoices(quote_id) WHERE quote_id IS NOT NULL;
CREATE UNIQUE INDEX payments_invoice_succeeded_uniq ON public.payments(invoice_id) WHERE status = 'succeeded';
CREATE UNIQUE INDEX invoices_number_uniq ON public.invoices(number) WHERE number IS NOT NULL;
CREATE UNIQUE INDEX quotes_number_uniq ON public.quotes(number) WHERE number IS NOT NULL;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_amounts_nonneg CHECK (subtotal_ht >= 0 AND total_vat >= 0 AND total_ttc >= 0);
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_amounts_nonneg CHECK (total_ht >= 0 AND total_vat >= 0 AND total_ttc >= 0);
ALTER TABLE public.quote_items
  ADD CONSTRAINT quote_items_amounts_check CHECK (quantity > 0 AND unit_price_ht >= 0 AND vat_rate >= 0 AND vat_rate <= 100);
ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_amounts_check CHECK (quantity > 0 AND unit_price_ht >= 0 AND vat_rate >= 0 AND vat_rate <= 100);
ALTER TABLE public.payments
  ADD CONSTRAINT payments_amount_pos CHECK (amount > 0);

COMMENT ON COLUMN public.invoices.total_ht IS 'Gelé à l''émission : copie du devis accepté, non modifiable (écritures via RPC uniquement).';
COMMENT ON COLUMN public.invoice_items.line_total_ttc IS 'Gelé à l''émission : copie de la ligne de devis, non modifiable.';
