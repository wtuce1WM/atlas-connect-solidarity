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
  radius_km: number | null;
};

type Route = { key: "weather" | "events" | "search" | "map" | "llm"; label: string; emoji: string; className: string };

function detectRoute(label: string): Route {
  const q = (label || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!q.trim()) return { key: "llm", label: "LLM direct", emoji: "💬", className: "bg-muted text-muted-foreground" };
  if (/\b(meteo|weather|forecast|temps|temperature|degres?|previsions?|il fait|quel temps)\b/.test(q))
    return { key: "weather", label: "get_weather", emoji: "🌤", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300" };
  if (/\b(event|events|evenement|agenda|week[- ]?end|ce soir|festival|concert|expo|spectacle|whats on)\b/.test(q))
    return { key: "events", label: "search_events", emoji: "📅", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" };
  if (/\b(carte|map|montre.*carte|show.*map|localise|coordonnees|contact|appeler|telephone|distances?)\b/.test(q))
    return { key: "map", label: "show_on_map", emoji: "🗺", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" };
  if (/\b(proximite|autour|pres de|nearby|around|ou |où |restaurant|bar|cafe|the|rooftop|terrasse|musee|galerie|activite|visite|visiter|beach[- ]?club|hotel|riad|spa|boutique|shopping|manger|boire|dejeuner|diner|sortie|things to do|what to do|where|point.*interet|interets?)\b/.test(q))
    return { key: "search", label: "search_businesses", emoji: "🔍", className: "bg-primary/15 text-primary" };
  return { key: "llm", label: "LLM direct", emoji: "💬", className: "bg-muted text-muted-foreground" };
}

const RouteBadge = ({ label }: { label: string }) => {
  const r = detectRoute(label);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${r.className}`} title={`Route détectée: ${r.label}`}>
      <span>{r.emoji}</span>
      <span>{r.label}</span>
    </span>
  );
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
      .select("id,label_fr,label_en,label_ar,sort_order,is_active,radius_km")
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
        radius_km: r.radius_km,
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
          <br />
          <b>Rayon (km)</b> : si renseigné, la relance déclenche une route déterministe « aperçu à proximité » bornée à ce rayon autour de l'établissement (500 m = 0,5). Laisser vide pour la route auto.
        </p>
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
              <span className="text-muted-foreground">Route détectée automatiquement selon le libellé FR :</span>
              <RouteBadge label="météo" />
              <RouteBadge label="ce week-end" />
              <RouteBadge label="à proximité" />
              <RouteBadge label="montre sur la carte" />
              <RouteBadge label="" />
            </div>
            {rows.map((r) => (
              <div key={r.id} className={`p-3 rounded-lg border ${dirty.has(r.id) ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                <div className="grid grid-cols-1 lg:grid-cols-[70px_1fr_1fr_1fr_140px_90px_100px_40px] gap-2 items-center">
                  <Input type="number" value={r.sort_order} onChange={(e) => update(r.id, { sort_order: parseInt(e.target.value) || 0 })} title="Ordre" />
                  <Input value={r.label_fr} onChange={(e) => update(r.id, { label_fr: e.target.value })} placeholder="Relance FR" />
                  <Input value={r.label_en || ""} onChange={(e) => update(r.id, { label_en: e.target.value })} placeholder="EN" />
                  <Input value={r.label_ar || ""} onChange={(e) => update(r.id, { label_ar: e.target.value })} placeholder="AR" dir="rtl" />
                  <div className="flex justify-start"><RouteBadge label={r.label_fr || ""} /></div>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={r.radius_km ?? ""}
                    placeholder="Rayon km"
                    title="Rayon en km (ex: 0.5, 1, 2, 5). Vide = route auto."
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      update(r.id, { radius_km: v === "" ? null : parseFloat(v) });
                    }}
                  />
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
