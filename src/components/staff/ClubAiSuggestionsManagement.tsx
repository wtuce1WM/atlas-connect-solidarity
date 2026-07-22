import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Save, MessageSquare } from "lucide-react";

type Row = {
  id: string;
  label_fr: string;
  label_en: string | null;
  label_ar: string | null;
  category: string | null;
  city: string | null;
  sort_order: number;
  is_active: boolean;
  fixed_response_fr: string | null;
  fixed_response_en: string | null;
  fixed_response_ar: string | null;
  blog_post_id: string | null;
  blog_post_ids: string[];
};

type BlogOption = { id: string; title: string; slug: string | null };



const ClubAiSuggestionsManagement = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: posts }] = await Promise.all([
      supabase
        .from("club_ai_suggestions")
        .select("id,label_fr,label_en,label_ar,category,city,sort_order,is_active,fixed_response_fr,fixed_response_en,fixed_response_ar,blog_post_id,blog_post_ids")
        .order("sort_order", { ascending: true }),
      supabase
        .from("blog_posts")
        .select("id,title_fr,title_en,slug")
        .order("title_fr", { ascending: true }),
    ]);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows((data as Row[]) || []);
    const options: BlogOption[] = ((posts as any[]) || [])
      .map((p) => ({ id: p.id, slug: p.slug, title: (p.title_fr || p.title_en || p.slug || "(sans titre)").trim() }))
      .sort((a, b) => a.title.localeCompare(b.title, "fr", { sensitivity: "base" }));
    setBlogPosts(options);
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
      .from("club_ai_suggestions")
      .insert({ label_fr: "Nouvelle suggestion", sort_order: nextOrder, is_active: true })
      .select()
      .single();
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setRows((prev) => [...prev, data as Row]);
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette suggestion ?")) return;
    const { error } = await supabase.from("club_ai_suggestions").delete().eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const saveAll = async () => {
    setSaving(true);
    const changed = rows.filter((r) => dirty.has(r.id));
    for (const r of changed) {
      const { error } = await supabase.from("club_ai_suggestions").update({
        label_fr: r.label_fr, label_en: r.label_en, label_ar: r.label_ar,
        category: r.category, city: r.city, sort_order: r.sort_order, is_active: r.is_active,
        fixed_response_fr: r.fixed_response_fr, fixed_response_en: r.fixed_response_en, fixed_response_ar: r.fixed_response_ar,
        blog_post_id: r.blog_post_ids?.[0] ?? null,
        blog_post_ids: r.blog_post_ids ?? [],
      }).eq("id", r.id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
    }
    toast({ title: "Enregistré", description: `${changed.length} suggestion(s) mise(s) à jour.` });
    setDirty(new Set());
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Suggestions Chat IA du Club
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
          Ces suggestions apparaissent sous le message d'accueil du chat IA sur <code>/club</code>.
          Le libellé <b>FR</b> est obligatoire ; EN et AR sont utilisés selon la langue de l'utilisateur (fallback FR).
          <br />
          <b>Ville</b> : laisser vide pour afficher partout, sinon la suggestion n'apparaîtra que pour la ville active.
          <br />
          <b>Réponse figée</b> : si renseignée dans la langue de l'utilisateur, elle est affichée telle quelle sans appel IA (coût = 0, texte 100% maîtrisé). Vide → réponse générée par l'IA comme avant. Markdown supporté (**gras**, listes, [liens](url)).
        </p>
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className={`p-3 rounded-lg border space-y-3 ${dirty.has(r.id) ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                <div className="grid grid-cols-1 lg:grid-cols-[70px_1fr_1fr_1fr_120px_100px_60px] gap-2 items-start">
                  <Input type="number" value={r.sort_order} onChange={(e) => update(r.id, { sort_order: parseInt(e.target.value) || 0 })} className="w-full" title="Ordre" />
                  <Textarea value={r.label_fr} onChange={(e) => update(r.id, { label_fr: e.target.value })} placeholder="Libellé FR" rows={2} />
                  <Textarea value={r.label_en || ""} onChange={(e) => update(r.id, { label_en: e.target.value })} placeholder="Libellé EN" rows={2} />
                  <Textarea value={r.label_ar || ""} onChange={(e) => update(r.id, { label_ar: e.target.value })} placeholder="Libellé AR" rows={2} dir="rtl" />
                  <select
                    value={r.city || ""}
                    onChange={(e) => update(r.id, { city: e.target.value || null })}
                    className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                    title="Ville"
                  >
                    <option value="">Toutes</option>
                    <option value="Marrakech">Marrakech</option>
                    <option value="Essaouira">Essaouira</option>
                  </select>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch checked={r.is_active} onCheckedChange={(v) => update(r.id, { is_active: v })} />
                    <span className="text-xs">{r.is_active ? "Actif" : "Off"}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)} title="Supprimer">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Articles de blog liés :</label>
                  {(r.blog_post_ids?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.blog_post_ids.map((pid) => {
                        const p = blogPosts.find((b) => b.id === pid);
                        return (
                          <span key={pid} className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary text-xs px-2 py-1">
                            {p?.title || pid}
                            <button
                              type="button"
                              onClick={() => update(r.id, { blog_post_ids: r.blog_post_ids.filter((x) => x !== pid) })}
                              className="hover:text-destructive"
                              title="Retirer"
                            >×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <select
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      if (!r.blog_post_ids.includes(v)) {
                        update(r.id, { blog_post_ids: [...r.blog_post_ids, v] });
                      }
                    }}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm w-full max-w-md"
                    title="Ajouter un article de blog"
                  >
                    <option value="">— Ajouter un article —</option>
                    {blogPosts
                      .filter((p) => !r.blog_post_ids.includes(p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                  </select>
                </div>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Réponse figée (optionnel) {(r.fixed_response_fr || r.fixed_response_en || r.fixed_response_ar) && <span className="ml-2 text-primary">● configurée</span>}
                  </summary>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mt-2">
                    <Textarea value={r.fixed_response_fr || ""} onChange={(e) => update(r.id, { fixed_response_fr: e.target.value || null })} placeholder="Réponse figée FR (Markdown)" rows={8} />
                    <Textarea value={r.fixed_response_en || ""} onChange={(e) => update(r.id, { fixed_response_en: e.target.value || null })} placeholder="Fixed response EN (Markdown)" rows={8} />
                    <Textarea value={r.fixed_response_ar || ""} onChange={(e) => update(r.id, { fixed_response_ar: e.target.value || null })} placeholder="الرد الثابت AR (Markdown)" rows={8} dir="rtl" />
                  </div>
                </details>
              </div>
            ))}
            {rows.length === 0 && <div className="text-sm text-muted-foreground">Aucune suggestion.</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClubAiSuggestionsManagement;
