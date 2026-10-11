import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const DateField = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) => {
  const parsed = value ? new Date(value + "T12:00:00") : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start font-normal text-left h-10"
        >
          <CalendarIcon className="h-4 w-4 mr-1 shrink-0" />
          {parsed ? format(parsed, "dd/MM/yyyy") : <span className="text-muted-foreground">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={parsed}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
};

const Field = ({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
    {children}
  </div>
);

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

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-2 text-sm";

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
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Catalogue des services facturables et grille tarifaire versionnée.
        </p>
        <Button size="sm" onClick={addService} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Nouveau service
        </Button>
      </div>

      {services.map((s) => {
        const sg = grids.filter((g) => g.service_id === s.id);
        return (
          <Card key={s.id}>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                  {s.name_fr}
                  {s.code && <Badge variant="outline" className="font-mono text-xs">{s.code}</Badge>}
                  {!s.is_active && <Badge variant="secondary">Inactif</Badge>}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={s.is_active}
                      onCheckedChange={(v) => patchService(s.id, { is_active: v })}
                    />
                    Actif
                  </label>
                  <Button size="sm" variant="outline" onClick={() => saveService(s)} className="gap-2">
                    <Save className="h-4 w-4" /> Enregistrer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteService(s.id)} aria-label="Supprimer le service">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="grid gap-4 md:grid-cols-12">
                <Field label="Code" className="md:col-span-3">
                  <Input
                    value={s.code ?? ""}
                    placeholder="ex: WIDGET_IA"
                    onChange={(e) => patchService(s.id, { code: e.target.value })}
                  />
                </Field>
                <Field label="Nom du service" className="md:col-span-7">
                  <Input
                    value={s.name_fr}
                    placeholder="Nom du service"
                    onChange={(e) => patchService(s.id, { name_fr: e.target.value })}
                  />
                </Field>
                <Field label="Ordre d'affichage" className="md:col-span-2">
                  <Input
                    type="number"
                    value={s.sort_order}
                    onChange={(e) => patchService(s.id, { sort_order: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <Field label="Description (apparaît sur le devis)">
                <Textarea
                  rows={2}
                  value={s.description_fr ?? ""}
                  placeholder="Description du service…"
                  onChange={(e) => patchService(s.id, { description_fr: e.target.value })}
                />
              </Field>

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Tarifs {sg.length > 0 && <span className="text-muted-foreground font-normal">({sg.length})</span>}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => addGrid(s.id)} className="gap-2">
                    <Plus className="h-3 w-3" /> Ajouter un tarif
                  </Button>
                </div>
                {sg.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun tarif défini.</p>
                )}
                {sg.map((g) => (
                  <div key={g.id} className="rounded-lg border bg-muted/30 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">
                        {g.unit_price.toLocaleString("fr-FR")} {g.currency}
                        <span className="text-muted-foreground font-normal">
                          {" "}· {RECURRENCES.find((r) => r.v === g.recurrence)?.l}
                        </span>
                        {!g.is_active && <Badge variant="secondary" className="ml-2">Inactif</Badge>}
                      </p>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs">
                          <Switch
                            checked={g.is_active}
                            onCheckedChange={(v) => patchGrid(g.id, { is_active: v })}
                          />
                          Actif
                        </label>
                        <Button size="sm" variant="outline" onClick={() => saveGrid(g)} className="gap-2">
                          <Save className="h-4 w-4" /> Enregistrer
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteGrid(g.id)} aria-label="Supprimer le tarif">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      <Field label="Prix unitaire">
                        <Input
                          type="number"
                          value={g.unit_price}
                          onChange={(e) => patchGrid(g.id, { unit_price: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="Devise">
                        <select
                          className={selectClass}
                          value={g.currency}
                          onChange={(e) => patchGrid(g.id, { currency: e.target.value as Grid["currency"] })}
                        >
                          <option value="MAD">MAD</option>
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
                        </select>
                      </Field>
                      <Field label="Récurrence">
                        <select
                          className={selectClass}
                          value={g.recurrence}
                          onChange={(e) => patchGrid(g.id, { recurrence: e.target.value as Grid["recurrence"] })}
                        >
                          {RECURRENCES.map((r) => (
                            <option key={r.v} value={r.v}>{r.l}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Valide à partir du">
                        <DateField
                          value={g.valid_from}
                          placeholder="Début"
                          onChange={(v) => patchGrid(g.id, { valid_from: v })}
                        />
                      </Field>
                      <Field label="Valide jusqu'au">
                        <DateField
                          value={g.valid_to ?? ""}
                          placeholder="Sans fin"
                          onChange={(v) => patchGrid(g.id, { valid_to: v })}
                        />
                      </Field>
                    </div>
                    <Field label="Notes (internes)">
                      <Input
                        value={g.notes ?? ""}
                        placeholder="Notes optionnelles…"
                        onChange={(e) => patchGrid(g.id, { notes: e.target.value })}
                      />
                    </Field>
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
