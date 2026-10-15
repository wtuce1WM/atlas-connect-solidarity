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
  _sub numeric := 0; _tvat numeric := 0; _ttc numeric := 0;
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

  -- Tarif : prix TTC (TVA incluse), HT déduit.
  UPDATE _lines SET
    line_total_ttc = round(quantity * unit_price_ht, 2),
    line_total_ht = CASE WHEN vat_exempt THEN round(quantity * unit_price_ht, 2)
                         ELSE round(round(quantity * unit_price_ht, 2) / (1 + vat_rate / 100), 2) END,
    unit_price_ht = CASE WHEN vat_exempt THEN unit_price_ht
                         ELSE round(unit_price_ht / (1 + vat_rate / 100), 2) END
  WHERE price_source = 'grid';
  UPDATE _lines SET line_total_vat = line_total_ttc - line_total_ht WHERE price_source = 'grid';
  -- Manuel : prix saisi HT.
  UPDATE _lines SET
    line_total_ht = round(quantity * unit_price_ht, 2),
    line_total_vat = CASE WHEN vat_exempt THEN 0 ELSE round(round(quantity * unit_price_ht, 2) * vat_rate / 100, 2) END
  WHERE price_source = 'manual';
  UPDATE _lines SET line_total_ttc = line_total_ht + line_total_vat WHERE price_source = 'manual';

  SELECT COALESCE(sum(line_total_ht),0), COALESCE(sum(line_total_vat),0), COALESCE(sum(line_total_ttc),0)
    INTO _sub, _tvat, _ttc FROM _lines;

  IF _quote_id IS NULL THEN
    INSERT INTO public.quotes (affiliate_id, prospect_email, prospect_name, currency, expires_at,
                               subtotal_ht, total_vat, total_ttc, created_by)
    VALUES (NULLIF(p_quote->>'affiliate_id','')::uuid, p_quote->>'prospect_email', p_quote->>'prospect_name',
            COALESCE((p_quote->>'currency')::public.billing_currency, 'MAD'),
            NULLIF(p_quote->>'expires_at','')::date, _sub, _tvat, _ttc, auth.uid())
    RETURNING id INTO _quote_id;
  ELSE
    UPDATE public.quotes SET
      affiliate_id = NULLIF(p_quote->>'affiliate_id','')::uuid,
      prospect_email = p_quote->>'prospect_email',
      prospect_name = p_quote->>'prospect_name',
      currency = COALESCE((p_quote->>'currency')::public.billing_currency, 'MAD'),
      expires_at = NULLIF(p_quote->>'expires_at','')::date,
      subtotal_ht = _sub, total_vat = _tvat, total_ttc = _ttc
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

GRANT EXECUTE ON FUNCTION public.save_quote(jsonb, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_quote(jsonb, jsonb, text) TO service_role;