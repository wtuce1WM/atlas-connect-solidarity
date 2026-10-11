
-- Lot 1 / M3 : durcissement RLS. Les écritures passent désormais par les RPC
-- SECURITY DEFINER (propriétaire = contournement RLS contrôlé) ; les écritures
-- directes depuis le client sont retirées. Lectures staff et affilié inchangées.

-- quotes : lecture staff conservée ; suppression limitée aux brouillons ;
-- plus d'INSERT/UPDATE directs (via save_quote / set_quote_status).
DROP POLICY "Staff manage quotes" ON public.quotes;
CREATE POLICY "Staff view quotes" ON public.quotes
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete draft quotes" ON public.quotes
  FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()) AND status = 'draft');

-- quote_items : lecture staff conservée ; plus d'écriture directe.
DROP POLICY "Staff manage quote_items" ON public.quote_items;
CREATE POLICY "Staff view quote_items" ON public.quote_items
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- invoices : lecture staff conservée ; plus d'UPDATE/DELETE directs.
DROP POLICY "Staff manage invoices" ON public.invoices;
CREATE POLICY "Staff view invoices" ON public.invoices
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- invoice_items : lecture staff conservée ; plus d'écriture directe.
DROP POLICY "Staff manage invoice_items" ON public.invoice_items;
CREATE POLICY "Staff view invoice_items" ON public.invoice_items
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- payments : lecture staff et affilié déjà en place ; aucune écriture directe
-- (record_payment insère en SECURITY DEFINER). Aucun changement nécessaire.
