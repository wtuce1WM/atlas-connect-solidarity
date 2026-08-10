import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Save, MessageSquare, Loader2, CornerDownRight, ChevronDown, ChevronRight } from "lucide-react";
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
  prompt_fr: string | null;
  prompt_en: string | null;
  prompt_ar: string | null;
  blog_post_ids: string[];
  mode: string | null;
  destination_ids: string[];
  subcategory_ids: string[];
  badge_ids: string[];
  business_ids: string[];
  disabled_followup_ids: string[];
};

type BlogOption = { id: string; title: string; slug: string | null };
type DestinationOption = { id: string; name_fr: string };
type SubcategoryOption = { id: string; name_fr: string };
type BadgeOption = { id: string; name_fr: string };
type BusinessOption = { id: string; name: string };
type GlobalFollowup = { id: string; label_fr: string; is_active: boolean; sort_order: number };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const SearchAiSuggestionsManagement = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogOption[]>([]);
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);
  const [badges, setBadges] = useState<BadgeOption[]>([]);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [globalFollowups, setGlobalFollowups] = useState<GlobalFollowup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
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
  const [businessSearch, setBusinessSearch] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const fetchAllBusinesses = async () => {
      const pageSize = 1000;
      let from = 0;
      const all: any[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("businesses")
          .select("id,name")
          .eq("is_active", true)
          .order("name", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); break; }
        const chunk = (data as any[]) || [];
        all.push(...chunk);
        if (chunk.length < pageSize) break;
        from += pageSize;
        if (from > 20000) break;
      }
      return all;
    };
    const [{ data, error }, { data: posts }, { data: dests }, { data: subs }, { data: bdgs }, { data: fups }, bizs] = await Promise.all([
      (supabase as any)
        .from("ai_suggestions")
        .select("id,label_fr,label_en,label_ar,category,city,sort_order,is_active,fixed_response_fr,fixed_response_en,fixed_response_ar,prompt_fr,prompt_en,prompt_ar,blog_post_ids,mode,destination_ids,subcategory_ids,badge_ids,business_ids,disabled_followup_ids")
        .order("sort_order", { ascending: true }),
      supabase.from("blog_posts").select("id,title_fr,title_en,slug").order("title_fr", { ascending: true }),
      supabase.from("destinations").select("id,name_fr").order("name_fr", { ascending: true }),
      supabase.from("subcategories").select("id,name_fr").order("name_fr", { ascending: true }),
      supabase.from("badges").select("id,name_fr").order("name_fr", { ascending: true }),
      (supabase as any).from("ai_followups").select("id,label_fr,is_active,sort_order").order("sort_order", { ascending: true }),
      fetchAllBusinesses(),
    ]);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows(
      ((data as any[]) || []).map((r) => ({
        ...r,
        blog_post_ids: Array.isArray(r.blog_post_ids) ? r.blog_post_ids : [],
        destination_ids: Array.isArray(r.destination_ids) ? r.destination_ids : [],
        subcategory_ids: Array.isArray(r.subcategory_ids) ? r.subcategory_ids : [],
        badge_ids: Array.isArray(r.badge_ids) ? r.badge_ids : [],
        business_ids: Array.isArray(r.business_ids) ? r.business_ids : [],
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
    setBusinesses((bizs || []).map((b: any) => ({ id: b.id, name: b.name || "(sans nom)" })).sort((a: any, b: any) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" })));
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
      .from("ai_suggestions")
      .insert({ label_fr: "Nouvelle suggestion", sort_order: nextOrder, is_active: true })
      .select()
      .single();
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setRows((prev) => [...prev, { ...(data as any), blog_post_ids: [], destination_ids: [], subcategory_ids: [], badge_ids: [], business_ids: [], disabled_followup_ids: [], mode: null } as Row]);
    setExpanded((prev) => new Set(prev).add((data as any).id));
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette suggestion ?")) return;
    const { error } = await supabase.from("ai_suggestions").delete().eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const saveAll = async () => {
    setSaving(true);
    const changed = rows.filter((r) => dirty.has(r.id));
    for (const r of changed) {
      const { error } = await (supabase as any).from("ai_suggestions").update({
        label_fr: r.label_fr, label_en: r.label_en, label_ar: r.label_ar,
        category: r.category, city: r.city, sort_order: r.sort_order, is_active: r.is_active,
        fixed_response_fr: r.fixed_response_fr, fixed_response_en: r.fixed_response_en, fixed_response_ar: r.fixed_response_ar,
        prompt_fr: r.prompt_fr, prompt_en: r.prompt_en, prompt_ar: r.prompt_ar,
        blog_post_ids: r.blog_post_ids ?? [],
        mode: r.mode || null,
        destination_ids: r.destination_ids ?? [],
        subcategory_ids: r.subcategory_ids ?? [],
        badge_ids: r.badge_ids ?? [],
        business_ids: r.business_ids ?? [],
        disabled_followup_ids: r.disabled_followup_ids ?? [],
      }).eq("id", r.id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
    }
    toast({ title: "Enregistré", description: `${changed.length} suggestion(s) mise(s) à jour.` });
    setDirty(new Set());
    setSaving(false);
  };

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
          <MessageSquare className="h-5 w-5" /> Suggestions IA de la recherche
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
          Ces suggestions apparaissent dans l'onglet IA de <code>/search</code>.
          Le libellé <b>FR</b> est obligatoire ; EN et AR sont utilisés selon la langue de l'utilisateur (fallback FR).
          <br />
          <b>Ville</b> : laisser vide pour afficher partout, sinon la suggestion n'apparaîtra que pour la ville active.
          <br />
          <b>Réponse figée</b> : si renseignée dans la langue de l'utilisateur, elle est affichée telle quelle sans appel IA (coût = 0). Markdown supporté.
          <br />
          <b>Prompt</b> : utilisé comme system prompt court lorsque la route est en mode LLM direct.
        </p>
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const isOpen = expanded.has(r.id);
              return (
              <div key={r.id} className={`p-3 rounded-lg border space-y-3 ${dirty.has(r.id) ? "border-primary/50 bg-primary/5" : "border-border"}`}>
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
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {(() => {
                        const effectiveMode = r.mode || ((r.subcategory_ids.length > 0 || r.badge_ids.length > 0 || r.business_ids.length > 0) ? "structure_front" : "");
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
                      <Chip label="Établissements" value={r.business_ids.length === 0 ? "—" : String(r.business_ids.length)} />
                      <Chip label="Blog" value={(r.blog_post_ids?.length ?? 0) === 0 ? "—" : String(r.blog_post_ids.length)} />
                      <Chip label="EN" value={r.label_en ? "✓" : "—"} />
                      <Chip label="AR" value={r.label_ar ? "✓" : "—"} />
                      <Chip label="Réponse figée" value={(r.fixed_response_fr || r.fixed_response_en || r.fixed_response_ar) ? "✓" : "—"} />
                      <Chip label="Prompt" value={(r.prompt_fr || r.prompt_en || r.prompt_ar) ? "✓" : "—"} />
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
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
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Catégorie</label>
                    <Input value={r.category || ""} onChange={(e) => update(r.id, { category: e.target.value || null })} placeholder="ex: restaurant, bar, hotel…" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Route</label>
                    {(() => {
                      const effectiveMode = r.mode || ((r.subcategory_ids.length > 0 || r.badge_ids.length > 0 || r.business_ids.length > 0) ? "structure_front" : "");
                      const autoDetected = detectRoute(r.label_fr || "");
                      return (
                        <select
                          value={effectiveMode}
                          onChange={(e) => update(r.id, { mode: e.target.value || null })}
                          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                          title="Route"
                        >
                          <option value="">Auto — détectée depuis le libellé FR : {autoDetected.emoji} {autoDetected.label}</option>
                          <option value="events">📅 Events (search_events sur la ville active)</option>
                          <option value="structure_front">🧭 Structure du Front (search_businesses + filtres)</option>
                          <option value="weather">🌤 Météo (widget)</option>
                          <option value="map">🗺 Carte (show_on_map)</option>
                          <option value="llm">💬 LLM direct</option>
                        </select>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px]">
                  <RouteBadge label={r.label_fr || ""} />
                  {(r.subcategory_ids.length > 0 || r.badge_ids.length > 0 || r.business_ids.length > 0) && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium bg-primary/15 text-primary">
                      🔍 search_businesses · {r.subcategory_ids.length > 0 ? `subcat(${r.subcategory_ids.length})` : ""}
                      {r.subcategory_ids.length > 0 && r.badge_ids.length > 0 ? " + " : ""}
                      {r.badge_ids.length > 0 ? `badge(${r.badge_ids.length})` : ""}
                      {(r.badge_ids.length > 0 || r.subcategory_ids.length > 0) && r.business_ids.length > 0 ? " + " : ""}
                      {r.business_ids.length > 0 ? `biz(${r.business_ids.length})` : ""}
                    </span>
                  )}
                </div>

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
                  hint="Quand une ou plusieurs sous-catégories sont liées, l'IA court-circuite le LLM et affiche directement les établissements de ces sous-catégories."
                />

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
                  hint="Croisé avec les sous-catégories si les deux sont renseignés."
                />

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Établissements liés : {r.business_ids.length === 0 ? "(aucun)" : `(${r.business_ids.length})`}</label>
                  {r.business_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.business_ids.map((bid) => {
                        const b = businesses.find((x) => x.id === bid);
                        return (
                          <span key={bid} className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary text-xs px-2 py-1">
                            {b?.name || bid}
                            <button type="button" onClick={() => update(r.id, { business_ids: r.business_ids.filter((x) => x !== bid) })} className="hover:text-destructive" title="Retirer">×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="relative max-w-md">
                    <Input
                      placeholder="Rechercher un établissement…"
                      value={businessSearch[r.id] || ""}
                      onChange={(e) => setBusinessSearch((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Escape") setBusinessSearch((prev) => ({ ...prev, [r.id]: "" })); }}
                    />
                    {businessSearch[r.id]?.trim() && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-60 overflow-auto">
                        {(() => {
                          const q = norm(businessSearch[r.id]);
                          const matches = businesses.filter((b) => !r.business_ids.includes(b.id)).filter((b) => norm(b.name).includes(q));
                          if (matches.length === 0) return <div className="px-3 py-2 text-sm text-muted-foreground">Aucun établissement trouvé</div>;
                          return matches.slice(0, 8).map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => { update(r.id, { business_ids: [...r.business_ids, b.id] }); setBusinessSearch((prev) => ({ ...prev, [r.id]: "" })); }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted truncate"
                            >
                              {b.name}
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Les établissements liés sont priorisés en tête des résultats sans masquer les autres correspondances.</p>
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
                    <p className="text-[11px] text-muted-foreground">Aucune relance dans l'onglet <b>Relances Search</b>.</p>
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
                    Cochée = affichée après la réponse IA quand cette suggestion est active. Par défaut, toutes les relances sont activées.
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

                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Prompt LLM (optionnel) {(r.prompt_fr || r.prompt_en || r.prompt_ar) && <span className="ml-2 text-primary">● configuré</span>}
                  </summary>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mt-2">
                    <Textarea value={r.prompt_fr || ""} onChange={(e) => update(r.id, { prompt_fr: e.target.value || null })} placeholder="Prompt system FR" rows={4} />
                    <Textarea value={r.prompt_en || ""} onChange={(e) => update(r.id, { prompt_en: e.target.value || null })} placeholder="System prompt EN" rows={4} />
                    <Textarea value={r.prompt_ar || ""} onChange={(e) => update(r.id, { prompt_ar: e.target.value || null })} placeholder="Prompt system AR" rows={4} dir="rtl" />
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

export default SearchAiSuggestionsManagement;
