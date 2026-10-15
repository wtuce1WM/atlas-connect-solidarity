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
  business_id: string | null;
  prospect_email: string | null;
  prospect_name: string | null;
  currency: Currency;
  subtotal_ht: number;
  total_vat: number;
  total_ttc: number;
  expires_at: string | null;
  refusal_reason: string | null;
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
  // Tarif : prix TTC (TVA incluse) → HT déduit. Manuel : prix saisi HT.
  if (l.price_source === "grid") {
    const ttc = round2(l.quantity * l.unit_price_ht);
    const ht = l.vat_exempt ? ttc : round2(ttc / (1 + l.vat_rate / 100));
    return { ht, vat: round2(ttc - ht), ttc };
  }
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
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string; affiliate_id: string | null }>>([]);
  const [gridRows, setGridRows] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  const [sends, setSends] = useState<Array<{ quote_id: string; recipient_email: string; status: string; sent_at: string }>>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: q }, { data: a }, { data: b }, { data: g }, { data: s }] = await Promise.all([
      supabase.from("quotes").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliates").select("id, name, contact_email").order("name"),
      supabase.from("businesses").select("id, name, affiliate_id").not("affiliate_id", "is", null).order("name"),
      supabase
        .from("pricing_grids")
        .select("id, service_id, unit_price, currency, recurrence, is_active, billing_services(name_fr)")
        .eq("is_active", true),
      supabase.from("quote_email_sends").select("quote_id, recipient_email, status, sent_at").order("sent_at", { ascending: false }),
    ]);
    setSends((s as typeof sends) ?? []);
    setQuotes((q as unknown as Quote[]) ?? []);
    setAffiliates((a as typeof affiliates) ?? []);
    setBusinesses((b as typeof businesses) ?? []);
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
      business_id: null,
      prospect_email: null,
      prospect_name: null,
      currency: "MAD",
      subtotal_ht: 0,
      total_vat: 0,
      total_ttc: 0,
      expires_at: null,
      refusal_reason: null,
      created_at: new Date().toISOString(),
    });
    setInternalNote("");
    setLines([emptyLine(0)]);
  };

  const openEdit = async (q: Quote) => {
    const { data } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", q.id)
      .order("sort_order");
    const { data: noteRow } = await supabase
      .from("quote_internal_notes")
      .select("notes")
      .eq("quote_id", q.id)
      .maybeSingle();
    setInternalNote((noteRow as { notes: string | null } | null)?.notes ?? "");
    setEditing(q);
    setLines(((data as unknown as Array<Line & { line_total_ttc: number }>) ?? []).map(({ line_total_ttc, ...l }) =>
      l.price_source === "grid" ? { ...l, unit_price_ht: round2(Number(line_total_ttc) / l.quantity) } : { ...l },
    ));
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
    // Les montants sont recalculés côté serveur (save_quote) ; le client n'envoie que les lignes brutes.
    const { error } = await supabase.rpc("save_quote", {
      p_quote: {
        id: editing.id || null,
        affiliate_id: editing.affiliate_id,
        business_id: editing.business_id,
        prospect_email: editing.prospect_email,
        prospect_name: editing.prospect_name,
        currency: editing.currency,
        expires_at: editing.expires_at || null,
      },
      p_items: lines.map((l) => ({
        label: l.label,
        quantity: l.quantity,
        unit_price_ht: l.unit_price_ht,
        vat_rate: l.vat_rate,
        vat_exempt: l.vat_exempt,
        vat_exempt_reason: l.vat_exempt_reason,
        pricing_grid_id: l.pricing_grid_id,
        manual_reason: l.manual_reason,
        recurrence: l.recurrence,
      })),
      p_note: internalNote || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Devis enregistré");
    setEditing(null);
    load();
  };

  const setStatus = async (q: Quote, status: QuoteStatus) => {
    let refusalReason: string | null = null;
    if (status === "refused") {
      refusalReason = window.prompt("Motif du refus (obligatoire) :");
      if (!refusalReason?.trim()) return;
    }
    const { error } = await supabase.rpc("set_quote_status", {
      p_quote_id: q.id,
      p_status: status,
      p_refusal_reason: refusalReason,
    });
    if (error) return toast.error(error.message);
    toast.success(`Devis ${STATUS_LABEL[status].toLowerCase()}`);
    load();
  };

  const sendEmail = async (q: Quote) => {
    setSendingId(q.id);
    const { data, error } = await supabase.functions.invoke("send-quote-email", { body: { quote_id: q.id } });
    setSendingId(null);
    if (error || data?.error) {
      toast.error(data?.error ?? "Échec de l'envoi de l'email");
    } else if (data?.status === "suppressed") {
      toast.warning(`Email bloqué pour ${data.recipient} (désinscrit ou adresse invalide)`);
    } else {
      toast.success(`Email envoyé à ${data?.recipient}`);
    }
    load();
  };

  const convertToInvoice = async (q: Quote) => {
    // Conversion transactionnelle côté serveur : facture + lignes gelées + statut, anti-doublon inclus.
    const { error } = await supabase.rpc("convert_quote_to_invoice", { p_quote_id: q.id });
    if (error) return toast.error(error.message);
    toast.success("Facture créée");
    load();
  };

  const deleteQuote = async (id: string) => {
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const affiliateName = (id: string | null) => affiliates.find((a) => a.id === id)?.name ?? null;
  const businessName = (id: string | null) => businesses.find((b) => b.id === id)?.name ?? null;
  const affiliateBusinesses = useMemo(
    () => businesses.filter((b) => b.affiliate_id === editing?.affiliate_id),
    [businesses, editing?.affiliate_id],
  );

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
                  {q.business_id ? ` · ${businessName(q.business_id) ?? "entreprise supprimée"}` : ""}
                  {" · "}
                  {q.total_ttc} {q.currency} TTC
                  {q.expires_at ? ` · expire le ${q.expires_at}` : ""}
                  {(q as Quote & { paid_at?: string | null }).paid_at ? ` · payé en ligne le ${new Date((q as Quote & { paid_at: string }).paid_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}` : ""}
                </p>
                {sends.filter((x) => x.quote_id === q.id).map((x, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {x.status === "sent" ? "Email envoyé" : x.status === "suppressed" ? "Email bloqué" : "Échec d'envoi"} à {x.recipient_email} le{" "}
                    {new Date(x.sent_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                ))}
              </div>
              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => openEdit(q)} className="gap-1">
                  <Pencil className="h-3 w-3" /> Éditer
                </Button>
                {(q.status === "draft" || q.status === "sent") && (
                  <Button size="sm" variant="outline" disabled={sendingId === q.id} onClick={() => sendEmail(q)} className="gap-1">
                    <Send className="h-3 w-3" />
                    {sendingId === q.id ? "Envoi…" : sends.some((x) => x.quote_id === q.id && x.status === "sent") ? "Renvoyer l'email" : "Envoyer l'email"}
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
                      setEditing({ ...editing, affiliate_id: e.target.value || null, business_id: null })
                    }
                  >
                    <option value="">— Prospect (sans compte) —</option>
                    {affiliates.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Entreprise</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
                    value={editing.business_id ?? ""}
                    disabled={!editing.affiliate_id}
                    onChange={(e) => setEditing({ ...editing, business_id: e.target.value || null })}
                  >
                    <option value="">
                      {editing.affiliate_id
                        ? "— Aucune (toutes les entreprises) —"
                        : "— Choisir d'abord un affilié —"}
                    </option>
                    {affiliateBusinesses.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
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
                          placeholder={l.price_source === "grid" ? "PU TTC" : "PU HT"} title={l.price_source === "grid" ? "Prix du tarif, TVA incluse" : "Prix unitaire HT"}
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
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
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
