import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";

type Invoice = {
  id: string;
  number: string | null;
  status: "unpaid" | "paid";
  affiliate_id: string | null;
  prospect_email: string | null;
  prospect_name: string | null;
  currency: string;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  paid_at: string | null;
  created_at: string;
};

type Item = {
  id: string;
  invoice_id: string;
  label: string;
  quantity: number;
  unit_price_ht: number;
  vat_rate: number;
  vat_exempt: boolean;
  line_total_ttc: number;
};

const InvoicesPanel = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [affiliates, setAffiliates] = useState<Array<{ id: string; name: string }>>([]);
  const [items, setItems] = useState<Record<string, Item[]>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: inv }, { data: aff }] = await Promise.all([
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliates").select("id, name").order("name"),
    ]);
    setInvoices((inv as Invoice[]) ?? []);
    setAffiliates((aff as typeof affiliates) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string) => {
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    if (!items[id]) {
      const { data } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", id)
        .order("sort_order");
      setItems((p) => ({ ...p, [id]: (data as unknown as Item[]) ?? [] }));
    }
  };

  const markPaid = async (inv: Invoice) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", inv.id);
    if (error) return toast.error(error.message);
    toast.success("Facture marquée payée");
    load();
  };

  const clientOf = (inv: Invoice) =>
    affiliates.find((a) => a.id === inv.affiliate_id)?.name ??
    inv.prospect_name ??
    inv.prospect_email ??
    "—";

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Factures générées depuis les devis acceptés. Lignes gelées, non modifiables.
      </p>
      {invoices.length === 0 && <p className="text-sm text-muted-foreground">Aucune facture.</p>}
      {invoices.map((inv) => (
        <Card key={inv.id}>
          <CardContent className="py-3 space-y-3">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <button
                onClick={() => toggle(inv.id)}
                className="flex items-center gap-2 text-left min-w-0"
              >
                {open === inv.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{inv.number ?? "—"}</span>
                    <Badge variant={inv.status === "paid" ? "default" : "secondary"}>
                      {inv.status === "paid" ? "Payée" : "Impayée"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {clientOf(inv)} · {inv.total_ttc} {inv.currency} TTC
                  </p>
                </div>
              </button>
              {inv.status === "unpaid" && (
                <Button size="sm" variant="outline" onClick={() => markPaid(inv)} className="gap-1">
                  <Check className="h-3 w-3" /> Marquer payée
                </Button>
              )}
            </div>

            {open === inv.id && (
              <div className="border-t pt-3 space-y-1 text-sm">
                {(items[inv.id] ?? []).map((it) => (
                  <div key={it.id} className="flex justify-between gap-3">
                    <span className="truncate">
                      {it.label} × {it.quantity} @ {it.unit_price_ht}
                      {it.vat_exempt ? " (exonéré)" : ` (TVA ${it.vat_rate}%)`}
                    </span>
                    <span className="font-medium whitespace-nowrap">{it.line_total_ttc} {inv.currency}</span>
                  </div>
                ))}
                <div className="border-t pt-2 text-right space-y-0.5">
                  <p>Total HT : <strong>{inv.total_ht} {inv.currency}</strong></p>
                  <p>TVA : <strong>{inv.total_vat} {inv.currency}</strong></p>
                  <p>Total TTC : <strong>{inv.total_ttc} {inv.currency}</strong></p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default InvoicesPanel;
