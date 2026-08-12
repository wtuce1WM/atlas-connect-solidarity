import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { detectRoute, RouteBadge, type Route } from "./aiRouteDetect";
import { FORCED_ROUTES, forcedRouteLabel } from "@/lib/aiForcedRoutes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Save, CornerDownRight, ChevronDown, ChevronRight } from "lucide-react";
import { Chip } from "./AiParamChip";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

type Row = {
  id: string;
  label_fr: string;
  label_en: string | null;
  label_ar: string | null;
  sort_order: number;
  is_active: boolean;
  radius_km: number | null;
  mode: string | null;
  route_override: string | null;

  category: string | null;
  city: string | null;
  subcategory_ids: string[];
  badge_ids: string[];
};

type Option = { id: string; name_fr: string };


const AiFollowupsManagement = ({ surface = "embed" }: { surface?: "club" | "embed" | "search" }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [subcategories, setSubcategories] = useState<Option[]>([]);
  const [badges, setBadges] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [subcategorySearch, setSubcategorySearch] = useState<Record<string, string>>({});
  const [badgeSearch, setBadgeSearch] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: subs }, { data: bdgs }] = await Promise.all([
      (supabase as any)
        .from("ai_followups")
        .select("id,label_fr,label_en,label_ar,sort_order,is_active,radius_km,mode,route_override,category,city,subcategory_ids,badge_ids")
        .eq("surface", surface)
        .order("sort_order", { ascending: true }),
      supabase.from("subcategories").select("id,name_fr").order("name_fr", { ascending: true }),
      supabase.from("badges").select("id,name_fr").order("name_fr", { ascending: true }),
    ]);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows(((data as any[]) || []).map((r) => ({ ...r, subcategory_ids: Array.isArray(r.subcategory_ids) ? r.subcategory_ids : [], badge_ids: Array.isArray(r.badge_ids) ? r.badge_ids : [] })) as Row[]);
    setSubcategories(((subs as any[]) || []).map((s) => ({ id: s.id, name_fr: s.name_fr || "(sans nom)" })));
    setBadges(((bdgs as any[]) || []).map((b) => ({ id: b.id, name_fr: b.name_fr || "(sans nom)" })));
    setDirty(new Set());
    setLoading(false);
  };

  useEffect(() => { load(); }, [surface]);

  const update = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty((prev) => { const n = new Set(prev); n.add(id); return n; });
  };

  const add = async () => {
    const nextOrder = (rows.reduce((m, r) => Math.max(m, r.sort_order), 0) || 0) + 10;
    const { data, error } = await (supabase as any)
      .from("ai_followups")
      .insert({ label_fr: "Nouvelle relance", sort_order: nextOrder, is_active: true, surface })
      .select()
      .single();
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows((prev) => [...prev, { ...(data as any), subcategory_ids: [], badge_ids: [] } as Row]);
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette relance ?")) return;
    const { error } = await supabase.from("ai_followups").delete().eq("id", id);
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const saveAll = async () => {
    setSaving(true);
    const changed = rows.filter((r) => dirty.has(r.id));
    for (const r of changed) {
      const { error } = await (supabase as any).from("ai_followups").update({
        label_fr: r.label_fr,
        label_en: r.label_en,
        label_ar: r.label_ar,
        sort_order: r.sort_order,
        is_active: r.is_active,
        radius_km: r.radius_km,
        mode: r.mode,
        route_override: r.route_override,

        category: r.category,
        city: r.city,
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
    options: Option[];
    search: Record<string, string>;
    setSearch: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    label: string;
    placeholder: string;
    empty: string;
    chipClass: string;
  }) => {
    const ids = row[field] as string[];
    return (
      <div className="space-y-1.5">
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
        <div className="relative max-w-xs">
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

  const SURFACE_LABEL = surface === "club" ? "club" : surface === "search" ? "search" : "embed";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <CornerDownRight className="h-6 w-6 text-gold" />
          <div>
            <h2 className="text-xl font-bold">Relances après la réponse IA ({SURFACE_LABEL})</h2>
            <p className="text-sm text-muted-foreground">
              Ces relances apparaissent après chaque réponse de l'IA, quelle que soit la suggestion cliquée.
              Le libellé <b>FR</b> est obligatoire ; EN et AR sont utilisés selon la langue. <code>{"{businessName}"}</code> est remplacé dynamiquement.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
          <Button size="sm" onClick={saveAll} disabled={saving || dirty.size === 0}>
            <Save className="h-4 w-4 mr-1" /> Enregistrer ({dirty.size})
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-1">
        <div><b>Ville / Catégorie / Sous-catégories / Badges</b> : filtres de contexte. Si renseignés, ils forcent les contraintes de la relance au lieu de compter uniquement sur la détection du libellé.</div>
        <div><b>Rayon (km)</b> : si renseigné, la relance déclenche une route déterministe « aperçu à proximité » bornée à ce rayon (500 m = 0,5). Vide = route auto.</div>
        <div><b>Mode</b> : <code>Auto</code> = établissements 1WM à proximité. <code>POI seulement</code> = uniquement les Points d'intérêt dans le rayon. <code>Météo</code> = widget météo.</div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span>Route détectée automatiquement selon le libellé FR :</span>
          <RouteBadge label="météo" />
          <RouteBadge label="ce week-end" />
          <RouteBadge label="à proximité" />
          <RouteBadge label="montre sur la carte" />
          <RouteBadge label="" />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const isOpen = expanded.has(r.id);
            return (
              <Card key={r.id} className={dirty.has(r.id) ? "border-primary/50" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(r.id)}
                        className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md hover:bg-muted"
                        title={isOpen ? "Replier" : "Déplier"}
                      >
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <Input
                        type="number"
                        value={r.sort_order}
                        onChange={(e) => update(r.id, { sort_order: parseInt(e.target.value) || 0 })}
                        className="w-20 h-8"
                      />
                      <span className="truncate font-semibold cursor-pointer" onClick={() => toggleExpanded(r.id)} title={r.label_fr || ""}>
                        {r.label_fr || <em className="text-muted-foreground">(sans libellé FR)</em>}
                      </span>
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch checked={r.is_active} onCheckedChange={(v) => update(r.id, { is_active: v })} />
                        <span className="text-xs text-muted-foreground">{r.is_active ? "Actif" : "Inactif"}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => remove(r.id)} title="Supprimer">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Résumé des paramètres (toujours visible) */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[11px]">
                    {r.mode === "weather" ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium bg-sky-500/15 text-sky-700 dark:text-sky-300">🌤 get_weather</span>
                    ) : r.mode === "poi_nearby" ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">📍 poi_nearby</span>
                    ) : (
                      <RouteBadge label={r.label_fr || ""} />
                    )}
                    <Chip label="Mode" value={r.mode ? (r.mode === "poi_nearby" ? "POI seulement" : r.mode === "weather" ? "Météo" : r.mode) : "Auto"} alert={!!r.mode} />
                    <Chip label="Rayon" value={r.radius_km == null ? "auto" : `${r.radius_km} km`} alert={r.radius_km != null} />
                    <Chip label="Ville" value={r.city || "Toutes"} alert={!!r.city} />
                    <Chip label="Catégorie" value={r.category || "—"} alert={!!r.category} />
                    <Chip label="Sous-cat." value={r.subcategory_ids.length === 0 ? "—" : String(r.subcategory_ids.length)} alert={r.subcategory_ids.length > 0} />
                    <Chip label="Badges" value={r.badge_ids.length === 0 ? "—" : String(r.badge_ids.length)} alert={r.badge_ids.length > 0} />
                    <Chip label="EN" value={r.label_en ? "✓" : "—"} alert={!r.label_en} />
                    <Chip label="AR" value={r.label_ar ? "✓" : "—"} alert={!r.label_ar} />
                  </div>
                </CardHeader>

                {isOpen && (
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 md:grid-cols-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">FR</label>
                        <Input value={r.label_fr} onChange={(e) => update(r.id, { label_fr: e.target.value })} placeholder="Relance FR" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">EN</label>
                        <Input value={r.label_en || ""} onChange={(e) => update(r.id, { label_en: e.target.value })} placeholder="EN" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">AR</label>
                        <Input value={r.label_ar || ""} onChange={(e) => update(r.id, { label_ar: e.target.value })} placeholder="AR" dir="rtl" />
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-4">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Rayon (km)</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={r.radius_km ?? ""}
                          placeholder="auto"
                          title="Rayon en km (ex: 0.5, 1, 2, 5). Vide = route auto."
                          onChange={(e) => {
                            const v = e.target.value.trim();
                            update(r.id, { radius_km: v === "" ? null : parseFloat(v) });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Mode</label>
                        <select
                          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                          value={r.mode ?? ""}
                          onChange={(e) => update(r.id, { mode: e.target.value || null })}
                        >
                          <option value="">Auto</option>
                          <option value="poi_nearby">POI seulement</option>
                          <option value="weather">Météo (widget)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Ville ciblée</label>
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
                        <label className="text-xs text-muted-foreground block mb-1">Catégorie</label>
                        <Input value={r.category || ""} onChange={(e) => update(r.id, { category: e.target.value || null })} placeholder="ex: restaurant, bar…" />
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
                  </CardContent>
                )}
              </Card>
            );
          })}
          {rows.length === 0 && <div className="text-sm text-muted-foreground">Aucune relance.</div>}
        </div>
      )}
    </div>
  );
};


export default AiFollowupsManagement;
