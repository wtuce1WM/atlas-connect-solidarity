
-- Lot 1 / M2 : fonctions serveur du moteur de facturation.
-- Toutes SECURITY DEFINER, garde is_staff en première instruction,
-- recalcul serveur des montants, écritures transactionnelles.

CREATE OR REPLACE FUNCTION public.save_quote(p_quote jsonb, p_items jsonb, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  _quote_id uuid := NULLIF(p_quote->>'id','')::uuid;
  _item jsonb;
  _grid record;
  _qty numeric; _price numeric; _rate numeric; _exempt boolean;
  _ht numeric; _vat numeric;
  _sub numeric := 0; _tvat numeric := 0;
  _i int := 0;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'quote must have at least one line';
  END IF;

  IF _quote_id IS NOT NULL THEN
    PERFORM 1 FROM public.quotes WHERE id = _quote_id AND status = 'draft' FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'quote % not found or not editable (only drafts can be modified)', _quote_id;
    END IF;
  END IF;

  -- Validation et recalcul des lignes (les montants envoyés par le client sont ignorés)
  CREATE TEMP TABLE _lines ON COMMIT DROP AS
  SELECT NULL::int AS sort_order, NULL::text AS label, NULL::numeric AS quantity,
         NULL::numeric AS unit_price_ht, NULL::numeric AS vat_rate,
         NULL::boolean AS vat_exempt, NULL::text AS vat_exempt_reason,
         NULL::uuid AS pricing_grid_id, NULL::public.billing_price_source AS price_source,
         NULL::text AS manual_reason, NULL::public.billing_recurrence AS recurrence,
         NULL::numeric AS line_total_ht, NULL::numeric AS line_total_vat, NULL::numeric AS line_total_ttc
  WHERE false;

  FOR _item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    _qty := COALESCE((_item->>'quantity')::numeric, 0);
    _rate := COALESCE((_item->>'vat_rate')::numeric, 20);
    _exempt := COALESCE((_item->>'vat_exempt')::boolean, false);

    IF _qty <= 0 THEN RAISE EXCEPTION 'quantity must be > 0'; END IF;
    IF _rate < 0 OR _rate > 100 THEN RAISE EXCEPTION 'vat_rate must be between 0 and 100'; END IF;
    IF NULLIF(btrim(COALESCE(_item->>'label','')), '') IS NULL THEN
      RAISE EXCEPTION 'each line must have a label';
    END IF;
    IF _exempt AND NULLIF(btrim(COALESCE(_item->>'vat_exempt_reason','')), '') IS NULL THEN
      RAISE EXCEPTION 'vat_exempt_reason is required for exempt lines';
    END IF;

    IF NULLIF(_item->>'pricing_grid_id','') IS NOT NULL THEN
      SELECT * INTO _grid FROM public.pricing_grids
      WHERE id = (_item->>'pricing_grid_id')::uuid AND is_active;
      IF NOT FOUND THEN RAISE EXCEPTION 'pricing grid row % not found or inactive', _item->>'pricing_grid_id'; END IF;
      _price := _grid.unit_price;
      INSERT INTO _lines VALUES (
        _i, _item->>'label', _qty, _price, _rate, _exempt, _item->>'vat_exempt_reason',
        _grid.id, 'grid', NULL, _grid.recurrence, 0, 0, 0);
    ELSE
      IF NULLIF(btrim(COALESCE(_item->>'manual_reason','')), '') IS NULL THEN
        RAISE EXCEPTION 'manual_reason is required for manual prices';
      END IF;
      _price := COALESCE((_item->>'unit_price_ht')::numeric, 0);
      IF _price < 0 THEN RAISE EXCEPTION 'unit_price_ht must be >= 0'; END IF;
      INSERT INTO _lines VALUES (
        _i, _item->>'label', _qty, _price, _rate, _exempt, _item->>'vat_exempt_reason',
        NULL, 'manual', _item->>'manual_reason',
        COALESCE((_item->>'recurrence')::public.billing_recurrence, 'one_time'), 0, 0, 0);
    END IF;
    _i := _i + 1;
  END LOOP;

  UPDATE _lines SET
    line_total_ht = round(quantity * unit_price_ht, 2),
    line_total_vat = CASE WHEN vat_exempt THEN 0 ELSE round(round(quantity * unit_price_ht, 2) * vat_rate / 100, 2) END;
  UPDATE _lines SET line_total_ttc = line_total_ht + line_total_vat;

  SELECT COALESCE(sum(line_total_ht),0), COALESCE(sum(line_total_vat),0) INTO _sub, _tvat FROM _lines;

  IF _quote_id IS NULL THEN
    INSERT INTO public.quotes (affiliate_id, prospect_email, prospect_name, currency, expires_at,
                               subtotal_ht, total_vat, total_ttc, created_by)
    VALUES (NULLIF(p_quote->>'affiliate_id','')::uuid, p_quote->>'prospect_email', p_quote->>'prospect_name',
            COALESCE((p_quote->>'currency')::public.billing_currency, 'MAD'),
            NULLIF(p_quote->>'expires_at','')::date, _sub, _tvat, _sub + _tvat, auth.uid())
    RETURNING id INTO _quote_id;
  ELSE
    UPDATE public.quotes SET
      affiliate_id = NULLIF(p_quote->>'affiliate_id','')::uuid,
      prospect_email = p_quote->>'prospect_email',
      prospect_name = p_quote->>'prospect_name',
      currency = COALESCE((p_quote->>'currency')::public.billing_currency, 'MAD'),
      expires_at = NULLIF(p_quote->>'expires_at','')::date,
      subtotal_ht = _sub, total_vat = _tvat, total_ttc = _sub + _tvat
    WHERE id = _quote_id;
    DELETE FROM public.quote_items WHERE quote_id = _quote_id;
  END IF;

  INSERT INTO public.quote_items (quote_id, label, quantity, unit_price_ht, vat_rate, vat_exempt,
                                  vat_exempt_reason, line_total_ht, line_total_vat, line_total_ttc,
                                  pricing_grid_id, price_source, manual_reason, recurrence, sort_order)
  SELECT _quote_id, label, quantity, unit_price_ht, vat_rate, vat_exempt, vat_exempt_reason,
         line_total_ht, line_total_vat, line_total_ttc, pricing_grid_id, price_source,
         manual_reason, recurrence, sort_order
  FROM _lines ORDER BY sort_order;

  INSERT INTO public.quote_internal_notes (quote_id, notes)
  VALUES (_quote_id, NULLIF(btrim(COALESCE(p_note,'')), ''))
  ON CONFLICT (quote_id) DO UPDATE SET notes = EXCLUDED.notes;

  RETURN _quote_id;
END;
$func$;

CREATE OR REPLACE FUNCTION public.set_quote_status(p_quote_id uuid, p_status public.quote_status, p_refusal_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE _cur public.quote_status;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;

  SELECT status INTO _cur FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'quote % not found', p_quote_id; END IF;

  IF _cur = 'draft' AND p_status = 'sent' THEN
    UPDATE public.quotes SET status = 'sent', sent_at = now(),
      number = COALESCE(number, public.next_billing_number('quote'))
    WHERE id = p_quote_id;
  ELSIF _cur = 'sent' AND p_status = 'accepted' THEN
    UPDATE public.quotes SET status = 'accepted', accepted_at = now() WHERE id = p_quote_id;
  ELSIF _cur = 'sent' AND p_status = 'refused' THEN
    IF NULLIF(btrim(COALESCE(p_refusal_reason,'')), '') IS NULL THEN
      RAISE EXCEPTION 'refusal_reason is required';
    END IF;
    UPDATE public.quotes SET status = 'refused', refused_at = now(), refusal_reason = p_refusal_reason
    WHERE id = p_quote_id;
  ELSIF _cur = 'sent' AND p_status = 'expired' THEN
    UPDATE public.quotes SET status = 'expired', expired_at = now() WHERE id = p_quote_id;
  ELSE
    RAISE EXCEPTION 'invalid status transition: % -> %', _cur, p_status;
  END IF;
END;
$func$;

CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice(p_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  _q record;
  _invoice_id uuid;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;

  SELECT * INTO _q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'quote % not found', p_quote_id; END IF;
  IF _q.status <> 'accepted' THEN
    RAISE EXCEPTION 'quote must be accepted to be invoiced (current: %)', _q.status;
  END IF;
  IF EXISTS (SELECT 1 FROM public.invoices WHERE quote_id = p_quote_id) THEN
    RAISE EXCEPTION 'an invoice already exists for quote %', p_quote_id;
  END IF;

  INSERT INTO public.invoices (number, quote_id, affiliate_id, prospect_email, prospect_name,
                               currency, total_ht, total_vat, total_ttc)
  VALUES (public.next_billing_number('invoice'), _q.id, _q.affiliate_id, _q.prospect_email,
          _q.prospect_name, _q.currency, _q.subtotal_ht, _q.total_vat, _q.total_ttc)
  RETURNING id INTO _invoice_id;

  INSERT INTO public.invoice_items (invoice_id, label, quantity, unit_price_ht, vat_rate, vat_exempt,
                                    vat_exempt_reason, line_total_ht, line_total_vat, line_total_ttc,
                                    price_source, manual_reason, recurrence, sort_order)
  SELECT _invoice_id, label, quantity, unit_price_ht, vat_rate, vat_exempt, vat_exempt_reason,
         line_total_ht, line_total_vat, line_total_ttc, price_source, manual_reason, recurrence, sort_order
  FROM public.quote_items WHERE quote_id = p_quote_id ORDER BY sort_order;

  UPDATE public.quotes SET status = 'invoiced', invoiced_at = now() WHERE id = p_quote_id;

  RETURN _invoice_id;
END;
$func$;

CREATE OR REPLACE FUNCTION public.record_payment(p_invoice_id uuid, p_amount numeric, p_provider text DEFAULT 'manual', p_reference text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  _inv record;
  _payment_id uuid;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;

  SELECT * INTO _inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice % not found', p_invoice_id; END IF;
  IF _inv.status <> 'unpaid' THEN RAISE EXCEPTION 'invoice is already paid'; END IF;
  IF p_amount IS NULL OR p_amount <> _inv.total_ttc THEN
    RAISE EXCEPTION 'payment amount (%) must equal invoice total TTC (%)', p_amount, _inv.total_ttc;
  END IF;
  IF EXISTS (SELECT 1 FROM public.payments WHERE invoice_id = p_invoice_id AND status = 'succeeded') THEN
    RAISE EXCEPTION 'a succeeded payment already exists for invoice %', p_invoice_id;
  END IF;

  INSERT INTO public.payments (invoice_id, provider, provider_reference, amount, currency, status, paid_at)
  VALUES (p_invoice_id, COALESCE(NULLIF(btrim(p_provider),''), 'manual'), p_reference,
          p_amount, _inv.currency, 'succeeded', now())
  RETURNING id INTO _payment_id;

  UPDATE public.invoices SET status = 'paid', paid_at = now() WHERE id = p_invoice_id;

  RETURN _payment_id;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.save_quote(jsonb, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_quote_status(uuid, public.quote_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_invoice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_quote(jsonb, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_quote_status(uuid, public.quote_status, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_invoice(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_payment(uuid, numeric, text, text) TO service_role;
