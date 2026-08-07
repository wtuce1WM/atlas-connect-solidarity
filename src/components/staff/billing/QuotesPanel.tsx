import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Send, Check, X, FileText, Pencil } from "lucide-react";
import { toast } from "sonner";

type QuoteStatus = "draft" | "sent" | "accepted" | "refused" | "expired" | "invoiced";
type Currency = "MAD" | "EUR" | "USD";
type Recurrence = "one_time" | "monthly" | "quarterly" | "yearly";

type Quote = {
  id: string;
  number: string | null;
  status: QuoteStatus;
  affiliate_id: string | null;
  prospect_email: string | null;
  prospect_name: string | null;
  currency: Currency;
  subtotal_ht: number;
  total_vat: number;
  total_ttc: number;
  expires_at: string | null;
  refusal_reason: string | null;
  internal_notes: string | null;
  created_at: string;
};

type Line = {
  id?: string;
  label: string;
  quantity: number;
  unit_price_ht: number;
  vat_rate: number;
  vat_exempt: boolean;
  vat_exempt_reason: string | null;
  pricing_grid_id: string | null;
  price_source: "grid" | "manual";
  manual_reason: string | null;
  recurrence: Recurrence;
  sort_order: number;
};

type GridRow = {
  id: string;
  service_id: string;
  unit_price: number;
  currency: Currency;
  recurrence: Recurrence;
  is_active: boolean;
  billing_services: { name_fr: string } | null;
};

const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  refused: "Refusé",
  expired: "Expiré",
  invoiced: "Facturé",
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const computeLine = (l: Line) => {
  const ht = round2(l.quantity * l.unit_price_ht);
  const vat = l.vat_exempt ? 0 : round2(ht * (l.vat_rate / 100));
  return { ht, vat, ttc: round2(ht + vat) };
};

const emptyLine = (sort: number): Line => ({
  label: "",
  quantity: 1,
  unit_price_ht: 0,
  vat_rate: 20,
  vat_exempt: false,
  vat_exempt_reason: null,
  pricing_grid_id: null,
  price_source: "manual",
  manual_reason: null,
  recurrence: "one_time",
  sort_order: sort,
});

const QuotesPanel = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [affiliates, setAffiliates] = useState<Array<{ id: string; name: string; contact_email: string | null }>>([]);
  const [gridRows, setGridRows] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: q }, { data: a }, { data: g }] = await Promise.all([
      supabase.from("quotes").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliates").select("id, name, contact_email").order("name"),
      supabase
        .from("pricing_grids")
        .select("id, service_id, unit_price, currency, recurrence, is_active, billing_services(name_fr)")
        .eq("is_active", true),
    ]);
    setQuotes((q as Quote[]) ?? []);
    setAffiliates((a as typeof affiliates) ?? []);
    setGridRows((g as unknown as GridRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing({
      id: "",
      number: null,
      status: "draft",
      affiliate_id: null,
      prospect_email: null,
      prospect_name: null,
      currency: "MAD",
      subtotal_ht: 0,
      total_vat: 0,
      total_ttc: 0,
      expires_at: null,
      refusal_reason: null,
      internal_notes: null,
      created_at: new Date().toISOString(),
    });
    setLines([emptyLine(0)]);
  };

  const openEdit = async (q: Quote) => {
    const { data } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", q.id)
      .order("sort_order");
    setEditing(q);
    setLines(((data as unknown as Line[]) ?? []).map((l) => ({ ...l })));
  };

  const totals = useMemo(() => {
    let ht = 0, vat = 0;
    lines.forEach((l) => {
      const c = computeLine(l);
      ht += c.ht;
      vat += c.vat;
    });
    return { ht: round2(ht), vat: round2(vat), ttc: round2(ht + vat) };
  }, [lines]);

  const patchLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const applyGrid = (i: number, gridId: string) => {
    if (!gridId) {
      patchLine(i, { pricing_grid_id: null, price_source: "manual" });
      return;
    }
    const g = gridRows.find((r) => r.id === gridId);
    if (!g) return;
    patchLine(i, {
      pricing_grid_id: g.id,
      price_source: "grid",
      unit_price_ht: Number(g.unit_price),
      recurrence: g.recurrence,
      label: g.billing_services?.name_fr ?? "",
    });
  };

  const saveQuote = async () => {
    if (!editing) return;
    if (!editing.affiliate_id && !editing.prospect_email) {
      toast.error("Sélectionnez un affilié ou renseignez un email prospect");
      return;
    }
    if (lines.length === 0 || lines.some((l) => !l.label.trim())) {
      toast.error("Chaque ligne doit avoir un libellé");
      return;
    }
    setSaving(true);
    const payload = {
      affiliate_id: editing.affiliate_id,
      prospect_email: editing.prospect_email,
      prospect_name: editing.prospect_name,
      currency: editing.currency,
      expires_at: editing.expires_at || null,
      internal_notes: editing.internal_notes,
      subtotal_ht: totals.ht,
      total_vat: totals.vat,
      total_ttc: totals.ttc,
    };

    let quoteId = editing.id;
    if (!quoteId) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("quotes")
        .insert({ ...payload, created_by: user?.id ?? null })
        .select("id")
        .single();
      if (error) { setSaving(false); return toast.error(error.message); }
      quoteId = data.id;
    } else {
      const { error } = await supabase.from("quotes").update(payload).eq("id", quoteId);
      if (error) { setSaving(false); return toast.error(error.message); }
      await supabase.from("quote_items").delete().eq("quote_id", quoteId);
    }

    const rows = lines.map((l, i) => {
      const c = computeLine(l);
      return {
        quote_id: quoteId,
        label: l.label,
        quantity: l.quantity,
        unit_price_ht: l.unit_price_ht,
        vat_rate: l.vat_rate,
        vat_exempt: l.vat_exempt,
        vat_exempt_reason: l.vat_exempt_reason,
        line_total_ht: c.ht,
        line_total_vat: c.vat,
        line_total_ttc: c.ttc,
        pricing_grid_id: l.pricing_grid_id,
        price_source: l.price_source,
        manual_reason: l.manual_reason,
        recurrence: l.recurrence,
        sort_order: i,
      };
    });
    const { error: e2 } = await supabase.from("quote_items").insert(rows);
    setSaving(false);
    if (e2) return toast.error(e2.message);
    toast.success("Devis enregistré");
    setEditing(null);
    load();
  };

  const setStatus = async (q: Quote, status: QuoteStatus) => {
    const patch: Record<string, unknown> = { status };
    if (status === "sent") {
      patch.sent_at = new Date().toISOString();
      if (!q.number) {
        const { data, error } = await supabase.rpc("next_billing_number", { _kind: "quote" });
        if (error) return toast.error(error.message);
        patch.number = data;
      }
    }
    if (status === "accepted") patch.accepted_at = new Date().toISOString();
    if (status === "refused") patch.refused_at = new Date().toISOString();
    const { error } = await supabase.from("quotes").update(patch).eq("id", q.id);
    if (error) return toast.error(error.message);
    toast.success(`Devis ${STATUS_LABEL[status].toLowerCase()}`);
    load();
  };

  const convertToInvoice = async (q: Quote) => {
    const { data: items, error: e0 } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", q.id)
      .order("sort_order");
    if (e0) return toast.error(e0.message);

    const { data: number, error: e1 } = await supabase.rpc("next_billing_number", { _kind: "invoice" });
    if (e1) return toast.error(e1.message);

    const { data: inv, error: e2 } = await supabase
      .from("invoices")
      .insert({
        number,
        quote_id: q.id,
        affiliate_id: q.affiliate_id,
        prospect_email: q.prospect_email,
        prospect_name: q.prospect_name,
        currency: q.currency,
        total_ht: q.subtotal_ht,
        total_vat: q.total_vat,
        total_ttc: q.total_ttc,
      })
      .select("id")
      .single();
    if (e2) return toast.error(e2.message);

    const rows = (items ?? []).map((l: Record<string, unknown>, i: number) => ({
      invoice_id: inv.id,
      label: l.label as string,
      quantity: l.quantity as number,
      unit_price_ht: l.unit_price_ht as number,
      vat_rate: l.vat_rate as number,
      vat_exempt: l.vat_exempt as boolean,
      vat_exempt_reason: (l.vat_exempt_reason as string) ?? null,
      line_total_ht: l.line_total_ht as number,
      line_total_vat: l.line_total_vat as number,
      line_total_ttc: l.line_total_ttc as number,
      price_source: l.price_source as "grid" | "manual",
      manual_reason: (l.manual_reason as string) ?? null,
      recurrence: l.recurrence as Recurrence,
      sort_order: i,
    }));
    const { error: e3 } = await supabase.from("invoice_items").insert(rows);
    if (e3) return toast.error(e3.message);

    await supabase
      .from("quotes")
      .update({ status: "invoiced", invoiced_at: new Date().toISOString() })
      .eq("id", q.id);
    toast.success(`Facture ${number} créée`);
    load();
  };

  const deleteQuote = async (id: string) => {
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const affiliateName = (id: string | null) => affiliates.find((a) => a.id === id)?.name ?? null;

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Devis affiliés & prospects. Les lignes sont gelées à la facturation.
        </p>
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Nouveau devis
        </Button>
      </div>

      {quotes.length === 0 && <p className="text-sm text-muted-foreground">Aucun devis.</p>}

      <div className="space-y-2">
        {quotes.map((q) => (
          <Card key={q.id}>
            <CardContent className="py-3 flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{q.number ?? "— brouillon —"}</span>
                  <Badge variant={q.status === "accepted" || q.status === "invoiced" ? "default" : "secondary"}>
                    {STATUS_LABEL[q.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {affiliateName(q.affiliate_id) ?? q.prospect_name ?? q.prospect_email ?? "—"}
                  {" · "}
                  {q.total_ttc} {q.currency} TTC
                  {q.expires_at ? ` · expire le ${q.expires_at}` : ""}
                </p>
              </div>
              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => openEdit(q)} className="gap-1">
                  <Pencil className="h-3 w-3" /> Éditer
                </Button>
                {q.status === "draft" && (
                  <Button size="sm" variant="outline" onClick={() => setStatus(q, "sent")} className="gap-1">
                    <Send className="h-3 w-3" /> Envoyer
                  </Button>
                )}
                {q.status === "sent" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setStatus(q, "accepted")} className="gap-1">
                      <Check className="h-3 w-3" /> Valider
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(q, "refused")} className="gap-1">
                      <X className="h-3 w-3" /> Refuser
                    </Button>
                  </>
                )}
                {q.status === "accepted" && (
                  <Button size="sm" onClick={() => convertToInvoice(q)} className="gap-1">
                    <FileText className="h-3 w-3" /> Facturer
                  </Button>
                )}
                {q.status === "draft" && (
                  <Button size="sm" variant="ghost" onClick={() => deleteQuote(q.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.number ? `Devis ${editing.number}` : "Nouveau devis"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Affilié</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                    value={editing.affiliate_id ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, affiliate_id: e.target.value || null })
                    }
                  >
                    <option value="">— Prospect (sans compte) —</option>
                    {affiliates.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Devise</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                    value={editing.currency}
                    onChange={(e) => setEditing({ ...editing, currency: e.target.value as Currency })}
                  >
                    <option value="MAD">MAD</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                {!editing.affiliate_id && (
                  <>
                    <Input
                      placeholder="Nom du prospect"
                      value={editing.prospect_name ?? ""}
                      onChange={(e) => setEditing({ ...editing, prospect_name: e.target.value })}
                    />
                    <Input
                      type="email"
                      placeholder="Email du prospect"
                      value={editing.prospect_email ?? ""}
                      onChange={(e) => setEditing({ ...editing, prospect_email: e.target.value })}
                    />
                  </>
                )}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Date de validité</label>
                  <Input
                    type="date"
                    value={editing.expires_at ?? ""}
                    onChange={(e) => setEditing({ ...editing, expires_at: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Lignes</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLines((p) => [...p, emptyLine(p.length)])}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" /> Ligne
                  </Button>
                </div>

                {lines.map((l, i) => {
                  const c = computeLine(l);
                  return (
                    <div key={i} className="rounded-md border p-3 space-y-2">
                      <div className="grid gap-2 md:grid-cols-2">
                        <select
                          className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                          value={l.pricing_grid_id ?? ""}
                          onChange={(e) => applyGrid(i, e.target.value)}
                        >
                          <option value="">— Prix manuel —</option>
                          {gridRows.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.billing_services?.name_fr} · {g.unit_price} {g.currency}
                            </option>
                          ))}
                        </select>
                        <Input
                          placeholder="Libellé (figé sur le devis)"
                          value={l.label}
                          onChange={(e) => patchLine(i, { label: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2 md:grid-cols-5 items-center">
                        <Input
                          type="number"
                          step="0.01"
                          value={l.quantity}
                          placeholder="Qté"
                          onChange={(e) => patchLine(i, { quantity: Number(e.target.value) })}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={l.unit_price_ht}
                          placeholder="PU HT"
                          onChange={(e) =>
                            patchLine(i, { unit_price_ht: Number(e.target.value), price_source: "manual" })
                          }
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={l.vat_rate}
                          placeholder="TVA %"
                          disabled={l.vat_exempt}
                          onChange={(e) => patchLine(i, { vat_rate: Number(e.target.value) })}
                        />
                        <select
                          className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                          value={l.recurrence}
                          onChange={(e) => patchLine(i, { recurrence: e.target.value as Recurrence })}
                        >
                          <option value="one_time">Ponctuel</option>
                          <option value="monthly">Mensuel</option>
                          <option value="quarterly">Trimestriel</option>
                          <option value="yearly">Annuel</option>
                        </select>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{c.ttc} TTC</span>
                          <Button size="sm" variant="ghost" onClick={() => setLines((p) => p.filter((_, x) => x !== i))}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-xs">
                          <Switch
                            checked={l.vat_exempt}
                            onCheckedChange={(v) => patchLine(i, { vat_exempt: v })}
                          />
                          Exonéré de TVA
                        </label>
                        {l.vat_exempt && (
                          <Input
                            className="flex-1 min-w-[200px]"
                            placeholder="Motif d'exonération"
                            value={l.vat_exempt_reason ?? ""}
                            onChange={(e) => patchLine(i, { vat_exempt_reason: e.target.value })}
                          />
                        )}
                        {l.price_source === "manual" && (
                          <Input
                            className="flex-1 min-w-[200px]"
                            placeholder="Motif du prix manuel"
                            value={l.manual_reason ?? ""}
                            onChange={(e) => patchLine(i, { manual_reason: e.target.value })}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t pt-3 text-sm space-y-1 text-right">
                <p>Total HT : <strong>{totals.ht} {editing.currency}</strong></p>
                <p>TVA : <strong>{totals.vat} {editing.currency}</strong></p>
                <p className="text-base">Total TTC : <strong>{totals.ttc} {editing.currency}</strong></p>
              </div>

              <Textarea
                rows={2}
                placeholder="Notes internes (non visibles par le client)"
                value={editing.internal_notes ?? ""}
                onChange={(e) => setEditing({ ...editing, internal_notes: e.target.value })}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={saveQuote} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuotesPanel;
