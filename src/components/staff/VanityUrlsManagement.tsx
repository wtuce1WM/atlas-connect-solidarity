import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Trash2, ExternalLink, Plus, Search } from "lucide-react";

type VanityRow = {
  slug: string;
  target_type: "business" | "destination";
  target_id: string;
  created_at?: string;
  updated_at?: string;
  // joined display
  target_label?: string;
};

const slugify = (s: string) =>
  s.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const VanityUrlsManagement = () => {
  const [rows, setRows] = useState<VanityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  // form
  const [slug, setSlug] = useState("");
  const [targetType, setTargetType] = useState<"business" | "destination">("business");
  const [targetQuery, setTargetQuery] = useState("");
  const [targetResults, setTargetResults] = useState<Array<{ id: string; label: string }>>([]);
  const [targetId, setTargetId] = useState<string>("");
  const [targetLabel, setTargetLabel] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("vanity_urls")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur chargement", description: error.message, variant: "destructive" });
      setRows([]);
      setLoading(false);
      return;
    }
    const list = (data || []) as VanityRow[];
    // enrich with labels
    const bizIds = list.filter(r => r.target_type === "business").map(r => r.target_id);
    const destIds = list.filter(r => r.target_type === "destination").map(r => r.target_id);
    const [bizRes, destRes] = await Promise.all([
      bizIds.length ? supabase.from("businesses").select("id,name").in("id", bizIds) : Promise.resolve({ data: [] as any }),
      destIds.length ? supabase.from("destinations").select("id,name_fr").in("id", destIds) : Promise.resolve({ data: [] as any }),
    ]);
    const bizMap = new Map((bizRes.data || []).map((b: any) => [b.id, b.name]));
    const destMap = new Map((destRes.data || []).map((d: any) => [d.id, d.name_fr]));
    setRows(list.map(r => ({
      ...r,
      target_label: (r.target_type === "business" ? bizMap.get(r.target_id) : destMap.get(r.target_id)) as string | undefined,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // search target
  useEffect(() => {
    let cancelled = false;
    const q = targetQuery.trim();
    if (q.length < 2) { setTargetResults([]); return; }
    (async () => {
      if (targetType === "business") {
        const { data } = await supabase.from("businesses").select("id,name,city").ilike("name", `%${q}%`).limit(15);
        if (!cancelled) setTargetResults((data || []).map((b: any) => ({ id: b.id, label: `${b.name}${b.city ? " — " + b.city : ""}` })));
      } else {
        const { data } = await supabase.from("destinations").select("id,name_fr").ilike("name_fr", `%${q}%`).limit(15);
        if (!cancelled) setTargetResults((data || []).map((d: any) => ({ id: d.id, label: d.name_fr })));
      }
    })();
    return () => { cancelled = true; };
  }, [targetQuery, targetType]);

  const resetForm = () => {
    setSlug(""); setTargetQuery(""); setTargetResults([]); setTargetId(""); setTargetLabel("");
  };

  const save = async () => {
    const cleanSlug = slugify(slug);
    if (!cleanSlug) { toast({ title: "Slug requis", variant: "destructive" }); return; }
    if (!targetId) { toast({ title: "Cible requise", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("vanity_urls").upsert({
      slug: cleanSlug, target_type: targetType, target_id: targetId,
    }, { onConflict: "slug" });
    setSaving(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Alias enregistré", description: `/${cleanSlug} → ${targetLabel}` });
    resetForm();
    load();
  };

  const remove = async (slugToDelete: string) => {
    if (!confirm(`Supprimer l'alias /${slugToDelete} ?`)) return;
    const { error } = await (supabase as any).from("vanity_urls").delete().eq("slug", slugToDelete);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Supprimé" });
    load();
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.slug.toLowerCase().includes(q) ||
      (r.target_label || "").toLowerCase().includes(q)
    );
  }, [rows, filter]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Nouvel alias d'URL</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Slug (oneworldmorocco.com/<b>slug</b>)</label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="ex: ouzoud" onBlur={() => setSlug(slugify(slug))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type de cible</label>
              <Select value={targetType} onValueChange={(v: any) => { setTargetType(v); setTargetId(""); setTargetLabel(""); setTargetResults([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Établissement</SelectItem>
                  <SelectItem value="destination">Destination</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Rechercher la cible</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" value={targetQuery} onChange={e => { setTargetQuery(e.target.value); setTargetId(""); setTargetLabel(""); }} placeholder="Nom..." />
              </div>
              {targetId && <p className="text-xs text-green-600 mt-1">✓ {targetLabel}</p>}
            </div>
          </div>
          {targetResults.length > 0 && !targetId && (
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {targetResults.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setTargetId(r.id);
                    setTargetLabel(r.label);
                    setTargetResults([]);
                    setTargetQuery(r.label);
                    // Auto-remplit le slug avec le nom (avant le " — ville" éventuel) si vide
                    if (!slug.trim()) {
                      const base = r.label.split(" — ")[0];
                      setSlug(slugify(base));
                    }
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                >{r.label}</button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving || !slug || !targetId}>
              <Plus className="h-4 w-4 mr-2" />Enregistrer
            </Button>
            <Button variant="ghost" onClick={resetForm}>Annuler</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Alias existants ({rows.length})</span>
            <Input className="max-w-xs" placeholder="Filtrer..." value={filter} onChange={e => setFilter(e.target.value)} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun alias.</p>
          ) : (
            <div className="divide-y">
              {filtered.map(r => (
                <div key={r.slug} className="py-2 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm">/{r.slug}</code>
                      <a
                        href={`/${r.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Ouvrir"
                      ><ExternalLink className="h-3 w-3" /></a>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.target_type === "business" ? "Établissement" : "Destination"} → {r.target_label || r.target_id}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(r.slug)} aria-label="Supprimer">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VanityUrlsManagement;
