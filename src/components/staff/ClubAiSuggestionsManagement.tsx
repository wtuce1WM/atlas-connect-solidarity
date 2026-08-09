import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Save, MessageSquare, Sparkles, Loader2, CornerDownRight, ChevronDown, ChevronRight } from "lucide-react";
import { detectRoute, RouteBadge } from "./aiRouteDetect";
import { Chip } from "./AiParamChip";


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
  mode: string | null;
  destination_ids: string[];
  subcategory_ids: string[];
  badge_ids: string[];
  disabled_followup_ids: string[];
};

type BlogOption = { id: string; title: string; slug: string | null };
type DestinationOption = { id: string; name_fr: string };
type SubcategoryOption = { id: string; name_fr: string };
type BadgeOption = { id: string; name_fr: string };
type GlobalFollowup = { id: string; label_fr: string; is_active: boolean; sort_order: number };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const ClubAiSuggestionsManagement = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogOption[]>([]);
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);
  const [badges, setBadges] = useState<BadgeOption[]>([]);
  const [globalFollowups, setGlobalFollowups] = useState<GlobalFollowup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [embedding, setEmbedding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const [destinationSearch, setDestinationSearch] = useState<Record<string, string>>({});
  const [subcategorySearch, setSubcategorySearch] = useState<Record<string, string>>({});
  const [badgeSearch, setBadgeSearch] = useState<Record<string, string>>({});

  const runEmbed = async (force = false) => {
    setEmbedding(true);
    try {
      const { data, error } = await supabase.functions.invoke("embed-club-suggestions", { body: { force } });
      if (error) throw error;
      const d = data as any;
      toast({ title: "Réindexation terminée", description: `${d.processed}/${d.total} suggestions ré-embeddées (${d.skipped} à jour).` });
    } catch (e: any) {
      toast({ title: "Erreur réindexation", description: e.message || String(e), variant: "destructive" });
    } finally {
      setEmbedding(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: posts }, { data: dests }, { data: subs }, { data: bdgs }, { data: fups }] = await Promise.all([
      (supabase as any)
        .from("club_ai_suggestions")
        .select("id,label_fr,label_en,label_ar,category,city,sort_order,is_active,fixed_response_fr,fixed_response_en,fixed_response_ar,blog_post_id,blog_post_ids,mode,destination_ids,subcategory_ids,badge_ids,disabled_followup_ids")
        .order("sort_order", { ascending: true }),
      supabase.from("blog_posts").select("id,title_fr,title_en,slug").order("title_fr", { ascending: true }),
      supabase.from("destinations").select("id,name_fr").order("name_fr", { ascending: true }),
      supabase.from("subcategories").select("id,name_fr").order("name_fr", { ascending: true }),
      supabase.from("badges").select("id,name_fr").order("name_fr", { ascending: true }),
      (supabase as any).from("club_ai_followups").select("id,label_fr,is_active,sort_order").order("sort_order", { ascending: true }),
    ]);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows(
      ((data as any[]) || []).map((r) => ({
        ...r,
        blog_post_ids: r.blog_post_ids || (r.blog_post_id ? [r.blog_post_id] : []),
        destination_ids: Array.isArray(r.destination_ids) ? r.destination_ids : [],
        subcategory_ids: Array.isArray(r.subcategory_ids) ? r.subcategory_ids : [],
        badge_ids: Array.isArray(r.badge_ids) ? r.badge_ids : [],
        disabled_followup_ids: Array.isArray(r.disabled_followup_ids) ? r.disabled_followup_ids : [],
      })) as Row[]
    );
    const options: BlogOption[] = ((posts as any[]) || [])
      .map((p) => ({ id: p.id, slug: p.slug, title: (p.title_fr || p.title_en || p.slug || "(sans titre)").trim() }))
      .sort((a, b) => a.title.localeCompare(b.title, "fr", { sensitivity: "base" }));
    setBlogPosts(options);
    setDestinations(((dests as any[]) || []).map((d) => ({ id: d.id, name_fr: d.name_fr || "(sans nom)" })));
    setSubcategories(((subs as any[]) || []).map((s) => ({ id: s.id, name_fr: s.name_fr || "(sans nom)" })));
    setBadges(((bdgs as any[]) || []).map((b) => ({ id: b.id, name_fr: b.name_fr || "(sans nom)" })));
    setGlobalFollowups(((fups as any[]) || []).map((f) => ({ id: f.id, label_fr: f.label_fr || "", is_active: !!f.is_active, sort_order: f.sort_order || 0 })));
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
    const { data, error } = await (supabase as any)
      .from("club_ai_suggestions")
      .insert({ label_fr: "Nouvelle suggestion", sort_order: nextOrder, is_active: true })
      .select()
      .single();
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setRows((prev) => [...prev, { ...(data as any), blog_post_ids: [], destination_ids: [], subcategory_ids: [], badge_ids: [], disabled_followup_ids: [], mode: null } as Row]);
    setExpanded((prev) => new Set(prev).add((data as any).id));

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
      const { error } = await (supabase as any).from("club_ai_suggestions").update({
        label_fr: r.label_fr, label_en: r.label_en, label_ar: r.label_ar,
        category: r.category, city: r.city, sort_order: r.sort_order, is_active: r.is_active,
        fixed_response_fr: r.fixed_response_fr, fixed_response_en: r.fixed_response_en, fixed_response_ar: r.fixed_response_ar,
        blog_post_id: r.blog_post_ids?.[0] ?? null,
        blog_post_ids: r.blog_post_ids ?? [],
        mode: r.mode || null,
        destination_ids: r.destination_ids ?? [],
        subcategory_ids: r.subcategory_ids ?? [],
        badge_ids: r.badge_ids ?? [],
        disabled_followup_ids: r.disabled_followup_ids ?? [],
      }).eq("id", r.id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
    }
    toast({ title: "Enregistré", description: `${changed.length} suggestion(s) mise(s) à jour.` });
    setDirty(new Set());
    setSaving(false);
  };

  // Generic chip multi-picker (destinations / sous-catégories / badges)
  const Picker = ({
    row, field, options, search, setSearch, label, placeholder, empty, chipClass, hint,
  }: {
    row: Row;
    field: "destination_ids" | "subcategory_ids" | "badge_ids";
    options: { id: string; name_fr: string }[];
    search: Record<string, string>;
    setSearch: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    label: string;
    placeholder: string;
    empty: string;
    chipClass: string;
    hint?: string;
  }) => {
    const ids = row[field] as string[];
    return (
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">{label} {ids.length === 0 ? "(aucune)" : `(${ids.length})`}</label>
        {ids.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {ids.map((id) => {
              const o = options.find((x) => x.id === id);
              return (
                <span key={id} className={`inline-flex items-center gap-1 rounded-md text-xs px-2 py-1 ${chipClass}`}>
                  {o?.name_fr || id}
                  <button type="button" onClick={() => update(row.id, { [field]: ids.filter((x) => x !== id) } as any)} className="hover:text-destructive" title="Retirer">×</button>
                </span>
              );
            })}
          </div>
        )}
        <div className="relative max-w-md">
          <Input
            placeholder={placeholder}
            value={search[row.id] || ""}
            onChange={(e) => setSearch((prev) => ({ ...prev, [row.id]: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Escape") setSearch((prev) => ({ ...prev, [row.id]: "" })); }}
          />
          {search[row.id]?.trim() && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-60 overflow-auto">
              {(() => {
                const q = norm(search[row.id]);
                const matches = options.filter((o) => !ids.includes(o.id)).filter((o) => norm(o.name_fr).includes(q));
                if (matches.length === 0) return <div className="px-3 py-2 text-sm text-muted-foreground">{empty}</div>;
                return matches.slice(0, 8).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => { update(row.id, { [field]: [...ids, o.id] } as any); setSearch((prev) => ({ ...prev, [row.id]: "" })); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted truncate"
                  >
                    {o.name_fr}
                  </button>
                ));
              })()}
            </div>
          )}
        </div>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Suggestions Chat IA du Club
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => runEmbed(false)} disabled={embedding} title="Ré-embed les suggestions modifiées">
            {embedding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />} Réindexer
          </Button>
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
          <b>Réponse figée</b> : si renseignée dans la langue de l'utilisateur, elle est affichée telle quelle sans appel IA (coût = 0). Markdown supporté.
        </p>
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const isOpen = expanded.has(r.id);
              return (
              <div key={r.id} className={`p-3 rounded-lg border space-y-3 ${dirty.has(r.id) ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                {/* EN-TÊTE PLIABLE */}
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(r.id)}
                    className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md hover:bg-muted"
                    title={isOpen ? "Replier" : "Déplier"}
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <Input type="number" value={r.sort_order} onChange={(e) => update(r.id, { sort_order: parseInt(e.target.value) || 0 })} className="w-20 h-8 shrink-0" title="Ordre" />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-semibold truncate cursor-pointer"
                      onClick={() => toggleExpanded(r.id)}
                      title={r.label_fr || ""}
                    >
                      {r.label_fr || <em className="text-muted-foreground">(sans libellé FR)</em>}
                    </div>
                    {/* Résumé des paramètres */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {(() => {
                        const effectiveMode = r.mode || ((r.subcategory_ids.length > 0 || r.badge_ids.length > 0) ? "structure_front" : "");
                        const MODE_LABELS: Record<string, string> = {
                          events: "📅 search_events",
                          structure_front: "🔍 search_businesses",
                          weather: "🌤 météo",
                          map: "🗺 show_on_map",
                          llm: "💬 LLM direct",
                        };
                        return effectiveMode
                          ? <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-primary/15 text-primary">{MODE_LABELS[effectiveMode] || effectiveMode}</span>
                          : <RouteBadge label={r.label_fr || ""} />;
                      })()}
                      <Chip label="Ville" value={r.city || "Toutes"} />
                      <Chip label="Catégorie" value={r.category || "—"} />
                      <Chip label="Destinations" value={r.destination_ids.length === 0 ? "—" : String(r.destination_ids.length)} />
                      <Chip label="Sous-cat." value={r.subcategory_ids.length === 0 ? "—" : String(r.subcategory_ids.length)} />
                      <Chip label="Badges" value={r.badge_ids.length === 0 ? "—" : String(r.badge_ids.length)} />
                      <Chip label="Blog" value={(r.blog_post_ids?.length ?? 0) === 0 ? "—" : String(r.blog_post_ids.length)} />
                      <Chip label="EN" value={r.label_en ? "✓" : "—"} />
                      <Chip label="AR" value={r.label_ar ? "✓" : "—"} />
                      <Chip label="Réponse figée" value={(r.fixed_response_fr || r.fixed_response_en || r.fixed_response_ar) ? "✓" : "—"} />
                      <Chip
                        label="Relances"
                        value={`${globalFollowups.length - (r.disabled_followup_ids?.length || 0)}/${globalFollowups.length}`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={r.is_active} onCheckedChange={(v) => update(r.id, { is_active: v })} />
                    <span className="text-xs">{r.is_active ? "Actif" : "Off"}</span>
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)} title="Supprimer">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {isOpen && (<>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 items-start">
                  <Textarea value={r.label_fr} onChange={(e) => update(r.id, { label_fr: e.target.value })} placeholder="Libellé FR" rows={2} />
                  <Textarea value={r.label_en || ""} onChange={(e) => update(r.id, { label_en: e.target.value })} placeholder="Libellé EN" rows={2} />
                  <Textarea value={r.label_ar || ""} onChange={(e) => update(r.id, { label_ar: e.target.value })} placeholder="Libellé AR" rows={2} dir="rtl" />
                </div>


                {/* VILLE CIBLÉE */}
                <div className="max-w-xs">
                  <label className="text-xs text-muted-foreground">Ville ciblée</label>
                  <select
                    value={r.city || ""}
                    onChange={(e) => update(r.id, { city: e.target.value || null })}
                    className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                    title="Ville"
                  >
                    <option value="">Toutes</option>
                    <option value="Marrakech">Marrakech</option>
                    <option value="Essaouira">Essaouira</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">Vide = affichée pour tous les membres et recherche sans contrainte de ville. Sinon la suggestion est réservée à cette ville et la recherche y est ancrée.</p>
                </div>


                {/* ROUTE */}
                <div className="max-w-md">
                  <label className="text-xs text-muted-foreground">Route</label>
                  {(() => {
                    const effectiveMode = r.mode || ((r.subcategory_ids.length > 0 || r.badge_ids.length > 0) ? "structure_front" : "");
                    const autoDetected = detectRoute(r.label_fr || "");
                    return (
                      <>
                        <select
                          value={effectiveMode}
                          onChange={(e) => update(r.id, { mode: e.target.value || null })}
                          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                          title="Route"
                        >
                          <option value="">Auto — détectée depuis le libellé FR : {autoDetected.emoji} {autoDetected.label}</option>
                          <option value="events">📅 Events (search_events sur la ville active)</option>
                          <option value="structure_front">🧭 Structure du Front (search_businesses + sous-catégories/badges)</option>
                          <option value="weather">🌤 Météo (widget)</option>
                          <option value="map">🗺 Carte (show_on_map)</option>
                          <option value="llm">💬 LLM direct</option>
                        </select>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          <b>Auto</b> : le runtime choisit la route à partir du libellé FR et du message utilisateur.
                          Les autres valeurs forcent une route déterministe et court-circuitent le LLM.
                        </p>
                      </>
                    );
                  })()}
                </div>

                <div className="flex flex-wrap gap-2 text-[10px]">
                  <RouteBadge label={r.label_fr || ""} />
                  {(r.subcategory_ids.length > 0 || r.badge_ids.length > 0) && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium bg-primary/15 text-primary">
                      🔍 search_businesses · {r.subcategory_ids.length > 0 ? `subcat(${r.subcategory_ids.length})` : ""}
                      {r.subcategory_ids.length > 0 && r.badge_ids.length > 0 ? " + " : ""}
                      {r.badge_ids.length > 0 ? `badge(${r.badge_ids.length})` : ""}
                    </span>
                  )}
                </div>

                {/* DESTINATIONS */}
                <Picker
                  row={r}
                  field="destination_ids"
                  options={destinations}
                  search={destinationSearch}
                  setSearch={setDestinationSearch}
                  label="Destinations liées"
                  placeholder="Rechercher une destination…"
                  empty="Aucune destination trouvée"
                  chipClass="bg-gold/10 text-gold"
                />

                {/* SOUS-CATÉGORIES */}
                <Picker
                  row={r}
                  field="subcategory_ids"
                  options={subcategories}
                  search={subcategorySearch}
                  setSearch={setSubcategorySearch}
                  label="Sous-catégories ciblées"
                  placeholder="Rechercher une sous-catégorie…"
                  empty="Aucune sous-catégorie trouvée"
                  chipClass="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  hint="💡 Quand une ou plusieurs sous-catégories sont liées, l'IA court-circuite le LLM et affiche directement les établissements de ces sous-catégories."
                />

                {/* BADGES */}
                <Picker
                  row={r}
                  field="badge_ids"
                  options={badges}
                  search={badgeSearch}
                  setSearch={setBadgeSearch}
                  label="Badges ciblés"
                  placeholder="Rechercher un badge…"
                  empty="Aucun badge trouvé"
                  chipClass="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  hint="💡 Croisé avec les sous-catégories si les deux sont renseignés."
                />

                {/* ARTICLES DE BLOG */}
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

                {/* RELANCES */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      <CornerDownRight className="h-3.5 w-3.5" />
                      Relances affichées après la réponse IA
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      {globalFollowups.length - (r.disabled_followup_ids?.length || 0)}/{globalFollowups.length} activée(s)
                    </span>
                  </div>
                  {globalFollowups.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Aucune relance dans l'onglet <b>Relances Club</b>.</p>
                  ) : (
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {globalFollowups.map((f) => {
                        const enabled = !(r.disabled_followup_ids || []).includes(f.id);
                        return (
                          <label
                            key={f.id}
                            className={`flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs cursor-pointer transition ${
                              enabled ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30 text-muted-foreground"
                            } ${!f.is_active ? "opacity-50" : ""}`}
                            title={!f.is_active ? "Relance désactivée globalement" : ""}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={enabled}
                              onChange={(e) => {
                                const cur = new Set(r.disabled_followup_ids || []);
                                if (e.target.checked) cur.delete(f.id); else cur.add(f.id);
                                update(r.id, { disabled_followup_ids: Array.from(cur) });
                              }}
                            />
                            <span className="flex-1 leading-tight">
                              {f.label_fr || <em className="text-muted-foreground">(sans libellé)</em>}
                              {!f.is_active && <span className="ml-1 text-[10px]">(off global)</span>}
                            </span>
                            <RouteBadge label={f.label_fr || ""} />
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-2">
                    ☑️ Cochée = affichée après la réponse IA quand cette suggestion est active. Par défaut, toutes les relances sont activées.
                  </p>
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
                </>)}
              </div>
              );
            })}

            {rows.length === 0 && <div className="text-sm text-muted-foreground">Aucune suggestion.</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClubAiSuggestionsManagement;
