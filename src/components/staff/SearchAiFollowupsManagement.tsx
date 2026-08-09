import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, MessageCircleReply, Loader2 } from "lucide-react";
import { detectRoute } from "./aiRouteDetect";

type Row = {
  id: string;
  label_fr: string;
  label_en: string | null;
  label_ar: string | null;
  category: string | null;
  city: string | null;
  mode: string | null;
  radius_km: number | null;
  sort_order: number;
  is_active: boolean;
  subcategory_ids: string[];
  badge_ids: string[];
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const SearchAiFollowupsManagement = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name_fr: string }[]>([]);
  const [badges, setBadges] = useState<{ id: string; name_fr: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [subcategorySearch, setSubcategorySearch] = useState<Record<string, string>>({});
  const [badgeSearch, setBadgeSearch] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: subs }, { data: bdgs }] = await Promise.all([
      (supabase as any).from("search_ai_followups").select("id,label_fr,label_en,label_ar,category,city,mode,radius_km,sort_order,is_active,subcategory_ids,badge_ids").order("sort_order", { ascending: true }),
      supabase.from("subcategories").select("id,name_fr").order("name_fr", { ascending: true }),
      supabase.from("badges").select("id,name_fr").order("name_fr", { ascending: true }),
    ]);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows(((data as any[]) || []).map((r) => ({ ...r, subcategory_ids: Array.isArray(r.subcategory_ids) ? r.subcategory_ids : [], badge_ids: Array.isArray(r.badge_ids) ? r.badge_ids : [] })) as Row[]);
    setSubcategories(((subs as any[]) || []).map((s) => ({ id: s.id, name_fr: s.name_fr || "(sans nom)" })));
    setBadges(((bdgs as any[]) || []).map((b) => ({ id: b.id, name_fr: b.name_fr || "(sans nom)" })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty((prev) => { const n = new Set(prev); n.add(id); return n; });
  };

  const add = async () => {
    const nextOrder = (rows.reduce((m, r) => Math.max(m, r.sort_order), 0) || 0) + 10;
    const { data, error } = await (supabase as any).from("search_ai_followups").insert({ label_fr: "Nouvelle relance", sort_order: nextOrder, is_active: true }).select().single();
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setRows((prev) => [...prev, { ...(data as any), subcategory_ids: [], badge_ids: [] } as Row]);
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette relance ?")) return;
    const { error } = await supabase.from("search_ai_followups").delete().eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const saveAll = async () => {
    setSaving(true);
    const changed = rows.filter((r) => dirty.has(r.id));
    for (const r of changed) {
      const { error } = await (supabase as any).from("search_ai_followups").update({
        label_fr: r.label_fr, label_en: r.label_en, label_ar: r.label_ar,
        category: r.category, city: r.city, mode: r.mode || null, radius_km: r.radius_km,
        sort_order: r.sort_order, is_active: r.is_active,
        subcategory_ids: r.subcategory_ids ?? [],
        badge_ids: r.badge_ids ?? [],
      }).eq("id", r.id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
    }
    toast({ title: "Enregistré", description: `${changed.length} relance(s) mise(s) à jour.` });
    setDirty(new Set());
    setSaving(false);
  };

  const Picker = ({
    row, field, options, search, setSearch, label, placeholder, empty, chipClass,
  }: {
    row: Row;
    field: "subcategory_ids" | "badge_ids";
    options: { id: string; name_fr: string }[];
    search: Record<string, string>;
    setSearch: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    label: string;
    placeholder: string;
    empty: string;
    chipClass: string;
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
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><MessageCircleReply className="h-5 w-5" /> Relances IA de la recherche</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
          <Button size="sm" onClick={saveAll} disabled={saving || dirty.size === 0}>
            <Save className="h-4 w-4 mr-1" /> Enregistrer ({dirty.size})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Relances affichées sous la dernière réponse IA de <code>/search</code>. Elles sont utilisées par défaut dans toutes les suggestions IA, sauf celles qui les désactivent explicitement.
          <br />
          <b>Catégorie</b> : permet d'interpréter le libellé comme un critère de filtrage côté moteur (ex: « bars » → category:bar).
          <br />
          <b>Mode</b> : si renseigné, force la route utilisée par le moteur IA (override de la détection automatique depuis le libellé).
        </p>
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className={`p-3 rounded-lg border ${dirty.has(r.id) ? "border-primary/50 bg-primary/5" : "border-border"} space-y-3`}>
                <div className="flex items-start gap-2">
                  <Input type="number" value={r.sort_order} onChange={(e) => update(r.id, { sort_order: parseInt(e.target.value) || 0 })} className="w-20 h-8 shrink-0" title="Ordre" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{r.label_fr || <em className="text-muted-foreground">(sans libellé FR)</em>}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(() => {
                        const mode = r.mode || detectRoute(r.label_fr || "").key;
                        const MODE_LABELS: Record<string, string> = {
                          events: "📅 search_events",
                          structure_front: "🧭 search_businesses",
                          weather: "🌤 météo",
                          map: "🗺 show_on_map",
                          booking: "🎟 booking",
                          nearby: "📍 nearby",
                          contact: "📞 contact",
                          llm: "💬 LLM",
                        };
                        return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-primary/15 text-primary">{MODE_LABELS[mode] || mode || "auto"}</span>;
                      })()}
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">Ville : {r.city || "Toutes"}</span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">Catégorie : {r.category || "—"}</span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">Sous-cat. : {r.subcategory_ids.length || "—"}</span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">Badges : {r.badge_ids.length || "—"}</span>
                      {r.radius_km != null && r.radius_km > 0 && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">Rayon : {r.radius_km} km</span>}
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">EN : {r.label_en ? "✓" : "—"}</span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">AR : {r.label_ar ? "✓" : "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={r.is_active} onCheckedChange={(v) => update(r.id, { is_active: v })} />
                    <span className="text-xs">{r.is_active ? "Actif" : "Off"}</span>
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)} title="Supprimer"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                  <Textarea value={r.label_fr} onChange={(e) => update(r.id, { label_fr: e.target.value })} placeholder="Libellé FR" rows={2} />
                  <Textarea value={r.label_en || ""} onChange={(e) => update(r.id, { label_en: e.target.value || null })} placeholder="Libellé EN" rows={2} />
                  <Textarea value={r.label_ar || ""} onChange={(e) => update(r.id, { label_ar: e.target.value || null })} placeholder="Libellé AR" rows={2} dir="rtl" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Ville ciblée</label>
                    <select
                      value={r.city || ""}
                      onChange={(e) => update(r.id, { city: e.target.value || null })}
                      className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="">Toutes</option>
                      <option value="Marrakech">Marrakech</option>
                      <option value="Essaouira">Essaouira</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Catégorie</label>
                    <Input value={r.category || ""} onChange={(e) => update(r.id, { category: e.target.value || null })} placeholder="ex: restaurant, bar…" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Mode (override)</label>
                    <select
                      value={r.mode || ""}
                      onChange={(e) => update(r.id, { mode: e.target.value || null })}
                      className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="">Auto depuis le libellé FR</option>
                      <option value="events">📅 Events</option>
                      <option value="structure_front">🧭 Structure du Front</option>
                      <option value="weather">🌤 Météo</option>
                      <option value="map">🗺 Carte</option>
                      <option value="booking">🎟 Booking</option>
                      <option value="nearby">📍 À proximité</option>
                      <option value="contact">📞 Contact</option>
                      <option value="llm">💬 LLM</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Rayon (km) — modes Carte / Proximité</label>
                    <Input type="number" value={r.radius_km ?? ""} onChange={(e) => update(r.id, { radius_km: e.target.value ? parseFloat(e.target.value) : null })} placeholder="ex: 1" />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  />
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

export default SearchAiFollowupsManagement;
