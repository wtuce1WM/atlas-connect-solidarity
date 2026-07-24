import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Save, Code2, Loader2 } from "lucide-react";

type Row = {
  id: string;
  label_fr: string;
  label_en: string | null;
  label_ar: string | null;
  sort_order: number;
  is_active: boolean;
};

const EmbedAiSuggestionsManagement = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("embed_ai_suggestions")
      .select("id,label_fr,label_en,label_ar,sort_order,is_active")
      .order("sort_order", { ascending: true });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows((data as any[]) || []);
    setDirty(new Set());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty((prev) => { const n = new Set(prev); n.add(id); return n; });
  };

  const addRow = async () => {
    const nextOrder = rows.reduce((m, r) => Math.max(m, r.sort_order), 0) + 1;
    const { data, error } = await supabase
      .from("embed_ai_suggestions")
      .insert({ label_fr: "Nouvelle suggestion", sort_order: nextOrder })
      .select()
      .single();
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows((prev) => [...prev, data as Row]);
  };

  const removeRow = async (id: string) => {
    if (!confirm("Supprimer cette suggestion ?")) return;
    const { error } = await supabase.from("embed_ai_suggestions").delete().eq("id", id);
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const saveAll = async () => {
    setSaving(true);
    const toSave = rows.filter((r) => dirty.has(r.id));
    const results = await Promise.all(
      toSave.map((r) =>
        supabase.from("embed_ai_suggestions").update({
          label_fr: r.label_fr,
          label_en: r.label_en,
          label_ar: r.label_ar,
          sort_order: r.sort_order,
          is_active: r.is_active,
        }).eq("id", r.id)
      )
    );
    const hasError = results.some((r: any) => r.error);
    if (hasError) toast({ title: "Erreur", description: "Certaines suggestions n'ont pas pu être sauvegardées", variant: "destructive" });
    else toast({ title: "Sauvegardé", description: `${toSave.length} suggestion(s) mise(s) à jour` });
    await load();
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Code2 className="h-6 w-6 text-gold" />
          <div>
            <h2 className="text-xl font-bold">Suggestions Embed IA</h2>
            <p className="text-sm text-muted-foreground">
              Suggestions affichées dans les assistants embarqués <code>/embed/ask/:slug</code>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
          <Button size="sm" onClick={saveAll} disabled={saving || dirty.size === 0}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Sauvegarder ({dirty.size})
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Input
                    type="number"
                    value={r.sort_order}
                    onChange={(e) => update(r.id, { sort_order: parseInt(e.target.value) || 0 })}
                    className="w-20 h-8"
                  />
                  <span className="text-muted-foreground">Ordre</span>
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(v) => update(r.id, { is_active: v })}
                    />
                    <span className="text-xs text-muted-foreground">{r.is_active ? "Actif" : "Inactif"}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeRow(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-3">
              <div>
                <label className="text-xs text-muted-foreground">FR</label>
                <Input
                  value={r.label_fr || ""}
                  onChange={(e) => update(r.id, { label_fr: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">EN</label>
                <Input
                  value={r.label_en || ""}
                  onChange={(e) => update(r.id, { label_en: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">AR</label>
                <Input
                  value={r.label_ar || ""}
                  onChange={(e) => update(r.id, { label_ar: e.target.value })}
                  dir="rtl"
                />
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Aucune suggestion. Ajoutez-en une pour commencer.</p>
        )}
      </div>
    </div>
  );
};

export default EmbedAiSuggestionsManagement;
