import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Save, Code2, Loader2, ChevronDown, ChevronRight, CornerDownRight } from "lucide-react";

type Followup = { label_fr: string; label_en: string | null; label_ar: string | null };

const DEFAULT_FOLLOWUPS: Followup[] = [
  { label_fr: "Consulter les horaires", label_en: "Check opening hours", label_ar: "الاطلاع على ساعات العمل" },
  { label_fr: "Autres points d'intérêt à proximité", label_en: "Other points of interest nearby", label_ar: "نقاط اهتمام أخرى قريبة" },
  { label_fr: "Autres activités à proximité", label_en: "Other activities nearby", label_ar: "أنشطة أخرى قريبة" },
  { label_fr: "Quelle est la météo prévue ?", label_en: "What's the weather forecast?", label_ar: "ما هي توقعات الطقس؟" },
  { label_fr: "Quelles sont les distances depuis {businessName} ?", label_en: "What are the distances from {businessName}?", label_ar: "ما هي المسافات من {businessName}؟" },
  { label_fr: "Montre-moi les coordonnées pour appeler", label_en: "Show me the contact details to call", label_ar: "أظهر لي بيانات الاتصال للاتصال" },
  { label_fr: "On peut réserver en ligne ?", label_en: "Can we book online?", label_ar: "هل يمكن الحجز عبر الإنترنت؟" },
];

type Row = {
  id: string;
  label_fr: string;
  label_en: string | null;
  label_ar: string | null;
  sort_order: number;
  is_active: boolean;
  followups: Followup[];
  business_ids: string[];
};

type BusinessOption = { id: string; name: string; slug: string | null };

const EmbedAiSuggestionsManagement = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: bizs }] = await Promise.all([
      supabase
        .from("embed_ai_suggestions")
        .select("id,label_fr,label_en,label_ar,sort_order,is_active,followups,business_ids")
        .order("sort_order", { ascending: true }),
      supabase
        .from("businesses")
        .select("id,name,slug")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows(
      ((data as any[]) || []).map((r) => ({
        ...r,
        followups: Array.isArray(r.followups) ? r.followups : [],
        business_ids: Array.isArray(r.business_ids) ? r.business_ids : [],
      }))
    );
    setBusinesses(((bizs as any[]) || []).map((b) => ({ id: b.id, name: b.name || "(sans nom)", slug: b.slug })));
    setDirty(new Set());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty((prev) => { const n = new Set(prev); n.add(id); return n; });
  };

  const updateFollowup = (id: string, index: number, patch: Partial<Followup>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = [...r.followups];
        next[index] = { ...next[index], ...patch };
        return { ...r, followups: next };
      })
    );
    setDirty((prev) => { const n = new Set(prev); n.add(id); return n; });
  };

  const addFollowup = (id: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const existing = new Set(r.followups.map((f) => (f.label_fr || "").trim().toLowerCase()));
        const toAdd = DEFAULT_FOLLOWUPS.filter((f) => !existing.has(f.label_fr.trim().toLowerCase()));
        return { ...r, followups: [...r.followups, ...toAdd] };
      })
    );
    setDirty((prev) => { const n = new Set(prev); n.add(id); return n; });
  };

  const removeFollowup = (id: string, index: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, followups: r.followups.filter((_, i) => i !== index) } : r
      )
    );
    setDirty((prev) => { const n = new Set(prev); n.add(id); return n; });
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const addRow = async () => {
    const nextOrder = rows.reduce((m, r) => Math.max(m, r.sort_order), 0) + 1;
    const { data, error } = await supabase
      .from("embed_ai_suggestions")
      .insert({ label_fr: "Nouvelle suggestion", sort_order: nextOrder })
      .select()
      .single();
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows((prev) => [...prev, { ...(data as any), followups: [] } as Row]);
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
          followups: r.followups.filter((f) => (f.label_fr || "").trim()),
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
              Suggestions affichées dans les assistants embarqués <code>/embed/ask/:slug</code>.
              Chaque suggestion peut avoir ses propres <b>relances</b> affichées après la réponse IA.
              Utilisez <code>{"{businessName}"}</code> dans un libellé pour insérer le nom de l'établissement.
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
        {rows.map((r) => {
          const isOpen = expanded.has(r.id);
          return (
            <Card key={r.id} className={dirty.has(r.id) ? "border-primary/50" : ""}>
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
              <CardContent className="space-y-3">
                <div className="grid gap-2 md:grid-cols-3">
                  <div>
                    <label className="text-xs text-muted-foreground">FR</label>
                    <Input value={r.label_fr || ""} onChange={(e) => update(r.id, { label_fr: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">EN</label>
                    <Input value={r.label_en || ""} onChange={(e) => update(r.id, { label_en: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">AR</label>
                    <Input value={r.label_ar || ""} onChange={(e) => update(r.id, { label_ar: e.target.value })} dir="rtl" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpanded(r.id)}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  Relances après la réponse IA ({r.followups.length})
                </button>

                {isOpen && (
                  <div className="space-y-2 pl-4 border-l-2 border-muted">
                    {r.followups.map((f, idx) => (
                      <div key={idx} className="grid gap-2 md:grid-cols-[16px_1fr_1fr_1fr_40px] items-center">
                        <CornerDownRight className="h-4 w-4 text-muted-foreground" />
                        <Input
                          value={f.label_fr || ""}
                          onChange={(e) => updateFollowup(r.id, idx, { label_fr: e.target.value })}
                          placeholder="Relance FR"
                        />
                        <Input
                          value={f.label_en || ""}
                          onChange={(e) => updateFollowup(r.id, idx, { label_en: e.target.value })}
                          placeholder="EN"
                        />
                        <Input
                          value={f.label_ar || ""}
                          onChange={(e) => updateFollowup(r.id, idx, { label_ar: e.target.value })}
                          placeholder="AR"
                          dir="rtl"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeFollowup(r.id, idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addFollowup(r.id)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une relance
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {rows.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Aucune suggestion. Ajoutez-en une pour commencer.</p>
        )}
      </div>
    </div>
  );
};

export default EmbedAiSuggestionsManagement;
