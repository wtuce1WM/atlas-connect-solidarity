import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Save, CornerDownRight } from "lucide-react";
import { RouteBadge } from "./aiRouteDetect";

type Row = {
  id: string;
  label_fr: string;
  label_en: string | null;
  label_ar: string | null;
  sort_order: number;
  is_active: boolean;
  mode: string | null;
  radius_km: number | null;
  category: string | null;
  city: string | null;
  subcategory_ids: string[];
  badge_ids: string[];
};

type Option = { id: string; name_fr: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const CLUB_MODES: { value: string; label: string }[] = [
  { value: "", label: "Auto" },
  { value: "map_replay", label: "Carte (résultats précédents)" },
  { value: "booking", label: "Réserver en ligne" },
  { value: "opening_hours", label: "Horaires" },
  { value: "nearby", label: "À proximité (1WM)" },
  { value: "poi_nearby", label: "POI seulement" },
  { value: "weather", label: "Météo (widget)" },
  { value: "events", label: "Agenda / événements" },
];

const ClubAiFollowupsManagement = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [subcategories, setSubcategories] = useState<Option[]>([]);
  const [badges, setBadges] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [subcategorySearch, setSubcategorySearch] = useState<Record<string, string>>({});
  const [badgeSearch, setBadgeSearch] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: subs }, { data: bdgs }] = await Promise.all([
      (supabase as any)
        .from("club_ai_followups")
        .select("id,label_fr,label_en,label_ar,sort_order,is_active,mode,radius_km,category,city,subcategory_ids,badge_ids")
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

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty((prev) => { const n = new Set(prev); n.add(id); return n; });
  };

  const add = async () => {
    const nextOrder = (rows.reduce((m, r) => Math.max(m, r.sort_order), 0) || 0) + 10;
    const { data, error } = await (supabase as any)
      .from("club_ai_followups")
      .insert({ label_fr: "Nouvelle relance", sort_order: nextOrder, is_active: true })
      .select()
      .single();
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows((prev) => [...prev, { ...(data as any), subcategory_ids: [], badge_ids: [] } as Row]);
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette relance ?")) return;
    const { error } = await (supabase as any).from("club_ai_followups").delete().eq("id", id);
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const saveAll = async () => {
    setSaving(true);
    const changed = rows.filter((r) => dirty.has(r.id));
    for (const r of changed) {
      const { error } = await (supabase as any).from("club_ai_followups").update({
        label_fr: r.label_fr,
        label_en: r.label_en,
        label_ar: r.label_ar,
        sort_order: r.sort_order,
        is_active: r.is_active,
        mode: r.mode,
        radius_km: r.radius_km,
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CornerDownRight className="h-5 w-5" /> Relances après la réponse IA (Club)
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
          Liste des relances proposables après une réponse de l'assistant du Club (<code>/club</code>).
          Chaque suggestion (onglet <b>Suggestions Club</b>) peut ensuite cocher/décocher celles qu'elle affiche.
          Le libellé <b>FR</b> est obligatoire ; EN et AR sont utilisés selon la langue de l'utilisateur.
          <br />
          <b>Ville / Catégorie / Sous-catégories / Badges</b> : filtres de contexte. Si renseignés, le moteur force ces contraintes lors de la relance au lieu de compter uniquement sur la détection du libellé.
          <br />
          <b>Mode</b> : force une route déterministe. <code>Auto</code> = détection par le libellé.
          <br />
          <b>Rayon (km)</b> : borne les routes de proximité (500 m = 0,5). Ancre = géoloc utilisateur si autorisée, sinon ville détectée.
        </p>
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className={`p-3 rounded-lg border ${dirty.has(r.id) ? "border-primary/50 bg-primary/5" : "border-border"} space-y-3`}>
                <div className="grid grid-cols-1 lg:grid-cols-[70px_1fr_1fr_1fr_140px_90px_170px_100px_40px] gap-2 items-start">
                  <Input type="number" value={r.sort_order} onChange={(e) => update(r.id, { sort_order: parseInt(e.target.value) || 0 })} title="Ordre" />
                  <Input value={r.label_fr} onChange={(e) => update(r.id, { label_fr: e.target.value })} placeholder="Relance FR" />
                  <Input value={r.label_en || ""} onChange={(e) => update(r.id, { label_en: e.target.value })} placeholder="EN" />
                  <Input value={r.label_ar || ""} onChange={(e) => update(r.id, { label_ar: e.target.value })} placeholder="AR" dir="rtl" />
                  <div className="flex justify-start pt-1"><RouteBadge label={r.label_fr || ""} /></div>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={r.radius_km ?? ""}
                    placeholder="Rayon km"
                    title="Rayon en km (ex: 0.5, 1, 2, 5). Vide = pas de contrainte."
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      update(r.id, { radius_km: v === "" ? null : parseFloat(v) });
                    }}
                  />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                    value={r.mode ?? ""}
                    title="Route forcée"
                    onChange={(e) => update(r.id, { mode: e.target.value || null })}
                  >
                    {CLUB_MODES.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch checked={r.is_active} onCheckedChange={(v) => update(r.id, { is_active: v })} />
                    <span className="text-xs">{r.is_active ? "Actif" : "Off"}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)} title="Supprimer" className="mt-0.5">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
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
                    <Input value={r.category || ""} onChange={(e) => update(r.id, { category: e.target.value || null })} placeholder="ex: restaurant, bar, hotel…" />
                  </div>
                  <div className="hidden lg:block" />
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
            {rows.length === 0 && <div className="text-sm text-muted-foreground">Aucune relance. Ajoutez-en une pour commencer.</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClubAiFollowupsManagement;
