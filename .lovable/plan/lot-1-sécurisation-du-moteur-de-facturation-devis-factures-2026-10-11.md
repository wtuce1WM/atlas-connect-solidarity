# Lot 1 — Sécurisation du moteur de facturation (devis & factures)

Plan d'implémentation. Aucune modification n'a été faite. Périmètre : uniquement le lot 1 (pas de PDF/e-mail, paiement en ligne, abonnements).

## 1. État vérifié (PROUVÉ, base et code inspectés le 11/10/2026)

**Fonctions**
- `next_billing_number(_kind text)` : SECURITY DEFINER, exécutable par `anon`, `authenticated`, `service_role` (ACL vérifiée). Tout utilisateur connecté peut incrémenter les compteurs DEV/FAC à volonté → trous de numérotation.
- `billing_set_updated_at()` : trigger partagé, non SECURITY DEFINER. **Aucune modification prévue** (contrainte respectée).

**Tables et RLS**
- `quotes` / `quote_items` : staff ALL + affilié SELECT sur les siens. Le staff peut donc modifier/supprimer un devis à tout statut, y compris `invoiced`.
- `invoices` / `invoice_items` : staff ALL (inclut UPDATE et DELETE) + affilié SELECT. Une facture émise est modifiable et supprimable par le staff : montants, lignes, numéro.
- `payments` : staff SELECT uniquement, affilié SELECT. **Aucune politique d'écriture** : personne ne peut enregistrer un paiement (le marquage « payée » actuel écrit directement sur `invoices`).
- `billing_number_sequences` : aucune politique (accès via la fonction seulement) — correct.
- Grants : la vue `table_privileges` retourne vide via le rôle de lecture ; les politiques existent et le module fonctionne, donc les GRANT sont en place côté PostgREST. À revérifier dans la migration (GRANT idempotents inclus par sécurité).

**Code (`QuotesPanel.tsx`, `InvoicesPanel.tsx`)**
- Totaux HT/TVA/TTC calculés dans le navigateur (`computeLine`, `round2`) puis enregistrés tels quels — la base ne recalcule ni ne valide rien.
- `saveQuote` : update du devis + DELETE de toutes les lignes + INSERT des lignes, en 3 appels non transactionnels. Un échec au milieu laisse un devis sans lignes.
- `convertToInvoice` : lecture lignes → numéro → INSERT facture → INSERT lignes → update devis, en 5 appels non transactionnels. Double clic = double facture possible (aucune contrainte d'unicité sur `invoices.quote_id`).
- `markPaid` : UPDATE direct sur `invoices` (status + paid_at), sans ligne dans `payments`, sans montant, sans contrôle du statut courant.
- Numérotation : `next_billing_number` appelé depuis le client ; en cas d'échec d'écriture après l'appel, le numéro est consommé (trou).

## 2. Architecture cible du lot 1

Toutes les écritures critiques passent par des fonctions SQL `SECURITY DEFINER` qui vérifient `is_staff(auth.uid())`, recalculent les montants, et s'exécutent en une transaction. Le client ne fait plus que lire et appeler des RPC.

```text
QuotesPanel.tsx ──RPC──> save_quote(p_quote jsonb, p_items jsonb, p_note text)
                        set_quote_status(p_quote_id uuid, p_status quote_status, p_refusal_reason text)
                        convert_quote_to_invoice(p_quote_id uuid)
InvoicesPanel.tsx ─RPC──> record_payment(p_invoice_id uuid, p_amount numeric, p_provider text, p_reference text)
                                 │
                                 ▼
        recalcul serveur des lignes (HT, TVA, TTC, arrondi 2 déc.)
        validation des prix grille (pricing_grid_id → prix repris de pricing_grids)
        transitions de statut contrôlées (machine à états)
        numérotation consommée dans la même transaction que l'écriture
```

## 3. Migrations (ordre)

**M1 — `billing_revoke_number_grant`**
- `REVOKE EXECUTE ON public.next_billing_number(text) FROM anon, authenticated;`
- La fonction reste appelée en interne par les RPC staff (SECURITY DEFINER → droits du propriétaire, pas de l'appelant).
- Vérification post-migration : `has_function_privilege('authenticated', 'public.next_billing_number(text)', 'EXECUTE')` doit renvoyer `false`.

**M2 — `billing_server_functions`** (fonctions, toutes `SECURITY DEFINER`, `SET search_path = public`, garde `is_staff(auth.uid())` en première instruction)

1. `save_quote(p_quote jsonb, p_items jsonb, p_note text) returns uuid`
   - Insert ou update du devis **uniquement si statut `draft`** (refus sinon).
   - Pour chaque ligne : si `pricing_grid_id` fourni, reprendre `unit_price` et `recurrence` depuis `pricing_grids` (et vérifier `is_active`) ; si `price_source = 'manual'`, exiger `manual_reason` non vide.
   - Recalcul serveur : `ht = round(qty * prix, 2)`, `vat = round(ht * taux/100, 2)` (0 si exonéré, motif alors obligatoire), `ttc = ht + vat`. Totaux du devis = somme des lignes. Les montants envoyés par le client sont ignorés.
   - Remplacement des lignes (delete + insert) dans la même transaction que l'update du devis.
   - Upsert de la note interne.
2. `set_quote_status(p_quote_id uuid, p_status quote_status, p_refusal_reason text default null) returns void`
   - Machine à états : `draft→sent` (attribue le numéro via `next_billing_number` dans la même transaction, pose `sent_at`), `sent→accepted` (`accepted_at`), `sent→refused` (`refused_at` + motif obligatoire), `sent→expired` (`expired_at`). Toute autre transition rejetée.
3. `convert_quote_to_invoice(p_quote_id uuid) returns uuid`
   - Verrouille le devis (`SELECT ... FOR UPDATE`), exige statut `accepted`.
   - Crée la facture + copie les lignes gelées + passe le devis à `invoiced`, le tout en une transaction. Numéro FAC consommé dans la même transaction (pas de trou si échec).
   - Anti-doublon : échoue si une facture existe déjà pour ce devis (renforcé par l'index unique de M4).
4. `record_payment(p_invoice_id uuid, p_amount numeric, p_provider text default 'manual', p_reference text default null) returns uuid`
   - Verrouille la facture, exige statut `unpaid`, exige `p_amount = total_ttc` (paiement unique complet ; les paiements partiels sont une décision métier à trancher — voir §6).
   - Insère la ligne `payments` (statut `succeeded`, `paid_at`) et passe la facture à `paid` dans la même transaction.
   - Anti-doublon : refuse si un paiement `succeeded` existe déjà pour la facture.

**M3 — `billing_rls_hardening`** (politiques, aucune table ni colonne supprimée)
- `quotes` : remplacer « Staff manage » (ALL) par SELECT/INSERT/UPDATE staff, UPDATE restreint par les RPC (la RLS s'applique aux écritures directes ; les RPC SECURITY DEFINER contournent RLS en tant que propriétaire) + DELETE staff limité aux brouillons (`status = 'draft'`). Politique affilié SELECT inchangée.
- `quote_items` : idem — DELETE/INSERT/UPDATE staff seulement via devis en brouillon.
- `invoices` : staff SELECT + INSERT (via RPC) ; **retirer UPDATE et DELETE** des écritures directes staff. Politique affilié SELECT inchangée.
- `invoice_items` : staff SELECT + INSERT via RPC ; retirer UPDATE/DELETE directs.
- `payments` : ajouter INSERT staff (utilisé par la RPC) ; pas d'UPDATE ni DELETE.
- Effet net : depuis le client, même un staff ne peut plus modifier ou supprimer une facture émise ni ses lignes ; seules les RPC (contrôlées) écrivent.

**M4 — `billing_integrity_constraints`**
- `CREATE UNIQUE INDEX invoices_quote_id_uniq ON public.invoices(quote_id) WHERE quote_id IS NOT NULL;` (anti double facture, y compris double clic concurrent).
- `CREATE UNIQUE INDEX payments_invoice_succeeded_uniq ON public.payments(invoice_id) WHERE status = 'succeeded';` (anti double paiement).
- `CREATE UNIQUE INDEX invoices_number_uniq ON public.invoices(number) WHERE number IS NOT NULL;` et idem sur `quotes(number)` (anti collision de numéros).
- CHECKs additifs : montants ≥ 0, `vat_rate` entre 0 et 100, `quantity > 0`.
- Commentaires `DEPRECATED`/documentation sur les colonnes gelées si besoin.

## 4. Fichiers modifiés (code)

- `src/components/staff/billing/QuotesPanel.tsx` : `saveQuote` → RPC `save_quote` (envoie lignes brutes, plus de totaux calculés client ; `computeLine` conservé **uniquement pour l'affichage**). `setStatus` → RPC `set_quote_status`. `convertToInvoice` → RPC `convert_quote_to_invoice`. Suppression du devis inchangée (DELETE brouillon, désormais garanti par RLS).
- `src/components/staff/billing/InvoicesPanel.tsx` : `markPaid` → RPC `record_payment` avec le `total_ttc` de la facture.
- Aucun autre écran ne touche ces tables (vérifié : seuls ces deux panneaux et `BillingManagement.tsx` qui les orchestre).

## 5. Tests et critères d'acceptation

Exécutés en SQL (requêtes en lecture + appels RPC via un compte staff de test) et à l'écran :

1. **Droits** : `next_billing_number` non exécutable par `authenticated` (doit échouer) ; RPC staff exécutables par un staff, refusées par un non-staff et par `anon`.
2. **Recalcul** : enregistrer un devis en envoyant des totaux volontairement faux → les totaux en base sont ceux recalculés serveur.
3. **Prix grille** : ligne avec `pricing_grid_id` → prix repris de la grille même si le client envoie un autre prix ; ligne manuelle sans motif → refus.
4. **Transactionnalité** : simuler un échec (ligne invalide en 2e position) → aucun devis ni ligne résiduelle.
5. **Double clic / appels répétés** : deux appels `convert_quote_to_invoice` simultanés → une seule facture (index unique) ; deux `record_payment` → un seul paiement.
6. **Transitions** : `draft→accepted` direct refusé ; modifier un devis `sent` refusé ; supprimer un devis `sent` refusé.
7. **Facture émise** : UPDATE/DELETE direct sur `invoices`/`invoice_items` par un staff → refusé par RLS.
8. **Lecture intacte** : l'affilié lit toujours ses devis/factures/paiements ; les panneaux staff affichent tout comme avant.
9. **Numérotation** : pas de trou après un échec de conversion (numéro consommé dans la transaction).

## 6. Décisions métier à trancher (bloquantes pour finaliser, aucune règle inventée)

1. **Paiements partiels** : le plan impose un paiement unique = total TTC. Si des acomptes sont souhaités, `record_payment` doit accepter des montants partiels et la facture passer à `paid` quand la somme atteint le TTC.
2. **Motif de refus obligatoire** : le plan l'exige pour `sent→refused`. Confirmer.
3. **Règle d'arrondi** : arrondi à 2 décimales par ligne (HT puis TVA), comme aujourd'hui côté client. Confirmer que c'est la règle comptable retenue.
4. **Avoirs / annulation de facture** : hors lot 1 ; sans eux, une facture émise erronée ne pourra pas être corrigée (conséquence assumée du durcissement RLS).
5. **Suppression de devis** : limitée aux brouillons. Confirmer.

## 7. Risques

- **RLS + SECURITY DEFINER** : les RPC doivent appartenir à un rôle propriétaire des tables pour contourner RLS ; un mauvais `search_path` ou un `is_staff` manquant ouvrirait une faille → revue de chaque fonction avant application.
- **Politiques remplacées** : une politique mal écrite peut bloquer l'affichage affilié → test 8 systématique après M3.
- **Index uniques** : si des doublons historiques existent (0 devis/facture en prod aujourd'hui, donc risque nul), la migration échouerait → vérifié, tables vides.
- **`billing_set_updated_at`** : non touchée ; les triggers existants continuent de fonctionner sur les updates faits par les RPC.

## 8. Hors périmètre (lots suivants, non commencés)

PDF, envoi e-mail, paiement en ligne (`payment_links` déjà en place côté schéma), abonnements/récurrence, avoirs, expiration automatique des devis.
