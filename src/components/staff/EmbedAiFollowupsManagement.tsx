import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Save, CornerDownRight } from "lucide-react";

type Row = {
  id: string;
  label_fr: string;
  label_en: string | null;
  label_ar: string | null;
  sort_order: number;
  is_active: boolean;
};

const EmbedAiFollowupsManagement = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("embed_ai_followups")
      .select("id,label_fr,label_en,label_ar,sort_order,is_active")
      .order("sort_order", { ascending: true });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows((data as Row[]) || []);
    setDirty(new Set());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty((prev) => { const n = new Set(prev); n.add(id); return n; });
  };

  const add = async () => {
    const nextOrder = (rows.reduce((m, r) => Math.max(m, r.sort_order), 0) || 0) + 10;
    const { data, error } = await supabase
      .from("embed_ai_followups")
      .insert({ label_fr: "Nouvelle relance", sort_order: nextOrder, is_active: true })
      .select()
      .single();
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows((prev) => [...prev, data as Row]);
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette relance ?")) return;
    const { error } = await supabase.from("embed_ai_followups").delete().eq("id", id);
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const saveAll = async () => {
    setSaving(true);
    const changed = rows.filter((r) => dirty.has(r.id));
    for (const r of changed) {
      const { error } = await supabase.from("embed_ai_followups").update({
        label_fr: r.label_fr,
        label_en: r.label_en,
        label_ar: r.label_ar,
        sort_order: r.sort_order,
        is_active: r.is_active,
      }).eq("id", r.id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
    }
    toast({ title: "Enregistré", description: `${changed.length} relance(s) mise(s) à jour.` });
    setDirty(new Set());
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CornerDownRight className="h-5 w-5" /> Relances après la réponse IA (embed)
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
          <Button size="sm" onClick={saveAll} disabled={saving || dirty.size === 0}>
            <Save className="h-4 w-4 mr-1" /> Enregistrer ({dirty.size})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Ces relances apparaissent après chaque réponse de l'IA dans <code>/embed/ask/:slug</code>, quelle que soit la suggestion cliquée.
          Le libellé <b>FR</b> est obligatoire ; EN et AR sont utilisés selon la langue. Le placeholder <code>{"{businessName}"}</code> est remplacé dynamiquement par le nom de l'établissement.
        </p>
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className={`p-3 rounded-lg border ${dirty.has(r.id) ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                <div className="grid grid-cols-1 lg:grid-cols-[70px_1fr_1fr_1fr_100px_40px] gap-2 items-center">
                  <Input type="number" value={r.sort_order} onChange={(e) => update(r.id, { sort_order: parseInt(e.target.value) || 0 })} title="Ordre" />
                  <Input value={r.label_fr} onChange={(e) => update(r.id, { label_fr: e.target.value })} placeholder="Relance FR" />
                  <Input value={r.label_en || ""} onChange={(e) => update(r.id, { label_en: e.target.value })} placeholder="EN" />
                  <Input value={r.label_ar || ""} onChange={(e) => update(r.id, { label_ar: e.target.value })} placeholder="AR" dir="rtl" />
                  <div className="flex items-center gap-2">
                    <Switch checked={r.is_active} onCheckedChange={(v) => update(r.id, { is_active: v })} />
                    <span className="text-xs">{r.is_active ? "Actif" : "Off"}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)} title="Supprimer">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {rows.length === 0 && <div className="text-sm text-muted-foreground">Aucune relance.</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmbedAiFollowupsManagement;
