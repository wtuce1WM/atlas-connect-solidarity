import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

type Route = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  default_class: string;
  enabled: boolean;
  surfaces: string[];
  confidence_threshold: number | null;
  sort_order: number;
};

const SURFACES = ["club", "embed", "search"] as const;


const classColor = (c: string) =>
  c === "A" ? "bg-emerald-100 text-emerald-800" : c === "B" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800";

const AiRoutesManagement = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_routes")
      .select("id, code, label, description, default_class, enabled, surfaces, confidence_threshold, sort_order")
      .order("sort_order");
    if (error) toast.error(error.message);
    setRoutes((data as Route[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const patch = (id: string, changes: Partial<Route>) =>
    setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)));

  const save = async (r: Route) => {
    setSavingId(r.id);
    const { error } = await supabase
      .from("ai_routes")
      .update({
        label: r.label,
        description: r.description,
        enabled: r.enabled,
        surfaces: r.surfaces,
        confidence_threshold: r.confidence_threshold,
        sort_order: r.sort_order,
      })
      .eq("id", r.id);
    setSavingId(null);
    if (error) toast.error(error.message);
    else toast.success(`Route « ${r.code} » enregistrée`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Chaque route est une intention reconnue par le moteur. La <strong>classe</strong> détermine le coût :
        <span className="mx-1"><Badge className={classColor("A")}>A</Badge> déterministe, 0 token</span>·
        <span className="mx-1"><Badge className={classColor("B")}>B</Badge> classifieur léger</span>·
        <span className="mx-1"><Badge className={classColor("C")}>C</Badge> génératif complet</span>.
        Les <strong>surfaces</strong> disent où la route est active (/club, widget embed, onglet IA de /search).
        Le <strong>seuil</strong> est la confiance minimale du classifieur pour que la route soit appliquée sans LLM (vide = valeur globale de l'onglet IA).
      </p>

      {routes.map((r) => (
        <Card key={r.id} className={r.enabled ? "" : "opacity-60"}>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-3 text-base">
              <Badge className={classColor(r.default_class)}>Classe {r.default_class}</Badge>
              <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
              <span>{r.label}</span>
              <div className="ml-auto flex items-center gap-2">
                <Label htmlFor={`en-${r.id}`} className="text-xs font-normal">Active</Label>
                <Switch id={`en-${r.id}`} checked={r.enabled} onCheckedChange={(v) => patch(r.id, { enabled: v })} />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Description interne</Label>
              <Input
                value={r.description || ""}
                onChange={(e) => patch(r.id, { description: e.target.value })}
                placeholder="Ce que fait la route"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-xs">Classe par défaut</Label>
              <div className="mt-1 flex items-center gap-2">
                <Badge className={classColor(r.default_class)}>Classe {r.default_class}</Badge>
                <span className="text-xs text-muted-foreground">Fixée dans le code (spec §2).</span>
              </div>
            </div>

              <div>
                <Label className="text-xs">Surfaces</Label>
                <div className="flex gap-1 mt-1">
                  {SURFACES.map((s) => {
                    const on = r.surfaces?.includes(s);
                    return (
                      <Button
                        key={s}
                        type="button"
                        size="sm"
                        variant={on ? "default" : "outline"}
                        onClick={() =>
                          patch(r.id, {
                            surfaces: on ? r.surfaces.filter((x) => x !== s) : [...(r.surfaces || []), s],
                          })
                        }
                      >
                        {s}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-xs">Seuil de confiance (0 à 1)</Label>
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={r.confidence_threshold ?? ""}
                  onChange={(e) =>
                    patch(r.id, { confidence_threshold: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  placeholder="défaut global"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={() => save(r)} disabled={savingId === r.id}>
                {savingId === r.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AiRoutesManagement;
