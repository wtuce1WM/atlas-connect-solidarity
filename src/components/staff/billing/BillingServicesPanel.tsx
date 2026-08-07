import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

type Service = {
  id: string;
  code: string | null;
  name_fr: string;
  description_fr: string | null;
  is_active: boolean;
  sort_order: number;
};

type Grid = {
  id: string;
  service_id: string;
  currency: "MAD" | "EUR" | "USD";
  recurrence: "one_time" | "monthly" | "quarterly" | "yearly";
  unit_price: number;
  is_active: boolean;
  valid_from: string;
  valid_to: string | null;
  notes: string | null;
};

const RECURRENCES: Array<{ v: Grid["recurrence"]; l: string }> = [
  { v: "one_time", l: "Ponctuel" },
  { v: "monthly", l: "Mensuel" },
  { v: "quarterly", l: "Trimestriel" },
  { v: "yearly", l: "Annuel" },
];

const BillingServicesPanel = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [grids, setGrids] = useState<Grid[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: g }] = await Promise.all([
      supabase.from("billing_services").select("*").order("sort_order").order("name_fr"),
      supabase.from("pricing_grids").select("*").order("valid_from", { ascending: false }),
    ]);
    setServices((s as Service[]) ?? []);
    setGrids((g as Grid[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addService = async () => {
    const { error } = await supabase.from("billing_services").insert({
      name_fr: "Nouveau service",
      sort_order: services.length,
    });
    if (error) return toast.error(error.message);
    load();
  };

  const saveService = async (s: Service) => {
    const { error } = await supabase
      .from("billing_services")
      .update({
        code: s.code,
        name_fr: s.name_fr,
        description_fr: s.description_fr,
        is_active: s.is_active,
        sort_order: s.sort_order,
      })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Service enregistré");
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase.from("billing_services").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const addGrid = async (serviceId: string) => {
    const { error } = await supabase.from("pricing_grids").insert({
      service_id: serviceId,
      unit_price: 0,
    });
    if (error) return toast.error(error.message);
    load();
  };

  const saveGrid = async (g: Grid) => {
    const { error } = await supabase
      .from("pricing_grids")
      .update({
        currency: g.currency,
        recurrence: g.recurrence,
        unit_price: g.unit_price,
        is_active: g.is_active,
        valid_from: g.valid_from,
        valid_to: g.valid_to || null,
        notes: g.notes,
      })
      .eq("id", g.id);
    if (error) return toast.error(error.message);
    toast.success("Tarif enregistré");
  };

  const deleteGrid = async (id: string) => {
    const { error } = await supabase.from("pricing_grids").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const patchService = (id: string, patch: Partial<Service>) =>
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const patchGrid = (id: string, patch: Partial<Grid>) =>
    setGrids((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Catalogue des services facturables et grille tarifaire versionnée.
        </p>
        <Button size="sm" onClick={addService} className="gap-2">
          <Plus className="h-4 w-4" /> Nouveau service
        </Button>
      </div>

      {services.map((s) => {
        const sg = grids.filter((g) => g.service_id === s.id);
        return (
          <Card key={s.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {s.name_fr}
                {!s.is_active && <Badge variant="secondary">Inactif</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  value={s.code ?? ""}
                  placeholder="Code (ex: WIDGET_IA)"
                  onChange={(e) => patchService(s.id, { code: e.target.value })}
                />
                <Input
                  className="md:col-span-2"
                  value={s.name_fr}
                  placeholder="Nom du service"
                  onChange={(e) => patchService(s.id, { name_fr: e.target.value })}
                />
                <Input
                  type="number"
                  value={s.sort_order}
                  placeholder="Ordre"
                  onChange={(e) => patchService(s.id, { sort_order: Number(e.target.value) })}
                />
              </div>
              <Textarea
                rows={2}
                value={s.description_fr ?? ""}
                placeholder="Description (apparaît sur le devis)"
                onChange={(e) => patchService(s.id, { description_fr: e.target.value })}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={(v) => patchService(s.id, { is_active: v })}
                  />
                  Actif
                </label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => saveService(s)} className="gap-2">
                    <Save className="h-4 w-4" /> Enregistrer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteService(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Tarifs</p>
                  <Button size="sm" variant="outline" onClick={() => addGrid(s.id)} className="gap-2">
                    <Plus className="h-3 w-3" /> Tarif
                  </Button>
                </div>
                {sg.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun tarif défini.</p>
                )}
                {sg.map((g) => (
                  <div key={g.id} className="grid gap-2 md:grid-cols-7 items-center">
                    <Input
                      type="number"
                      value={g.unit_price}
                      onChange={(e) => patchGrid(g.id, { unit_price: Number(e.target.value) })}
                    />
                    <select
                      className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                      value={g.currency}
                      onChange={(e) => patchGrid(g.id, { currency: e.target.value as Grid["currency"] })}
                    >
                      <option value="MAD">MAD</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                    <select
                      className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                      value={g.recurrence}
                      onChange={(e) => patchGrid(g.id, { recurrence: e.target.value as Grid["recurrence"] })}
                    >
                      {RECURRENCES.map((r) => (
                        <option key={r.v} value={r.v}>{r.l}</option>
                      ))}
                    </select>
                    <Input
                      type="date"
                      value={g.valid_from}
                      onChange={(e) => patchGrid(g.id, { valid_from: e.target.value })}
                    />
                    <Input
                      type="date"
                      value={g.valid_to ?? ""}
                      onChange={(e) => patchGrid(g.id, { valid_to: e.target.value })}
                    />
                    <label className="flex items-center gap-2 text-xs">
                      <Switch
                        checked={g.is_active}
                        onCheckedChange={(v) => patchGrid(g.id, { is_active: v })}
                      />
                      Actif
                    </label>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => saveGrid(g)}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteGrid(g.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default BillingServicesPanel;
