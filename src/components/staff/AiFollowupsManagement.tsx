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
  mode: string | null;
  category: string | null;
  city: string | null;
  subcategory_ids: string[];
  badge_ids: string[];
};

type Option = { id: string; name_fr: string };

type Route = { key: "weather" | "events" | "search" | "map" | "hours" | "booking" | "rating" | "distance" | "opennow" | "ordinal" | "count" | "llm"; label: string; emoji: string; className: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function detectRoute(label: string): Route {
  const q = (label || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!q.trim()) return { key: "llm", label: "LLM direct", emoji: "💬", className: "bg-muted text-muted-foreground" };
  if (/\b(meteo|weather|forecast|temps|temperature|degres?|previsions?|il fait|quel temps)\b/.test(q))
    return { key: "weather", label: "get_weather", emoji: "🌤", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300" };
  if (/\b(event|events|evenement|agenda|week[- ]?end|ce soir|festival|concert|expo|spectacle|whats on)\b/.test(q))
    return { key: "events", label: "search_events", emoji: "📅", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" };
  if (/\b(horaire|horaires|ouvert|ouverts|ouverte|ouvertes|ouverture|ouvrir|ouvre|ouvrent|fermeture|fermer|ferme|ferment|tard|tot|early|late|open|close|closing|hours)\b/.test(q))
    return { key: "hours", label: "hours_ranking", emoji: "🕒", className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" };
  if (/\b(reserv|book|booking|reserver|reservation)\b/.test(q))
    return { key: "booking", label: "booking", emoji: "🎟", className: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300" };
  if (/\b(mieux note|meilleur note|meilleure note|top note|plus davis|plus d avis|best.?rated|highest.?rated|top.?rated|most.?reviewed)\b/.test(q))
    return { key: "rating", label: "rating_ranking", emoji: "⭐", className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300" };
  if (/\b(distance|distances|plus proche|plus pres|nearest|closest|le plus loin|farthest)\b/.test(q))
    return { key: "distance", label: "distance_ranking", emoji: "📏", className: "bg-teal-500/15 text-teal-700 dark:text-teal-300" };
  if (/\b(ouvert maintenant|open now|ouverts maintenant|open right now)\b/.test(q))
    return { key: "opennow", label: "open_filter", emoji: "🟢", className: "bg-green-500/15 text-green-700 dark:text-green-300" };
  if (/\b(premier|deuxieme|troisieme|first|second|third|numero \d|n°\s*\d)\b/.test(q))
    return { key: "ordinal", label: "ordinal_pick", emoji: "#️⃣", className: "bg-rose-500/15 text-rose-700 dark:text-rose-300" };
  if (/\b(combien|how many|count|nombre de resultats)\b/.test(q))
    return { key: "count", label: "count_priors", emoji: "🔢", className: "bg-slate-500/15 text-slate-700 dark:text-slate-300" };
  if (/\b(carte|map|montre.*carte|show.*map|localise|coordonnees|contact|appeler|telephone)\b/.test(q))
    return { key: "map", label: "show_on_map", emoji: "🗺", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" };
  if (/\b(que faire|sur place|proximite|autour|pres de|nearby|around|ou |où |restaurant|bar|cafe|the|rooftop|terrasse|musee|galerie|activite|activites|visite|visiter|beach[- ]?club|hotel|riad|spa|boutique|shopping|manger|boire|dejeuner|diner|sortie|things to do|what to do|where|point.*interet|interets?)\b/.test(q))
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

const AiFollowupsManagement = ({ surface = "embed" }: { surface?: "club" | "embed" | "search" }) => {
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
        .from("ai_followups")
        .select("id,label_fr,label_en,label_ar,sort_order,is_active,radius_km,mode,category,city,subcategory_ids,badge_ids")
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
          <b>Ville / Catégorie / Sous-catégories / Badges</b> : filtres de contexte. Si renseignés, ils forcent les contraintes de la relance au lieu de compter uniquement sur la détection du libellé.
          <br />
          <b>Rayon (km)</b> : si renseigné, la relance déclenche une route déterministe « aperçu à proximité » bornée à ce rayon autour de l'établissement (500 m = 0,5). Laisser vide pour la route auto.
          <br />
          <b>Mode</b> : <code>Auto</code> = établissements 1WM à proximité (par défaut). <code>POI seulement</code> = liste uniquement les Points d'intérêt (base <code>points_of_interest</code>) dans le rayon, sans passer par les POIs liés à l'établissement.
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
              <div key={r.id} className={`p-3 rounded-lg border ${dirty.has(r.id) ? "border-primary/50 bg-primary/5" : "border-border"} space-y-3`}>
                <div className="grid grid-cols-1 lg:grid-cols-[70px_1fr_1fr_1fr_140px_90px_120px_100px_40px] gap-2 items-start">
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
                    title="Rayon en km (ex: 0.5, 1, 2, 5). Vide = route auto."
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      update(r.id, { radius_km: v === "" ? null : parseFloat(v) });
                    }}
                  />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                    value={r.mode ?? ""}
                    title="Mode de la relance à proximité"
                    onChange={(e) => update(r.id, { mode: e.target.value || null })}
                  >
                    <option value="">Auto</option>
                    <option value="poi_nearby">POI seulement</option>
                    <option value="weather">Météo (widget)</option>
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
                    <Input value={r.category || ""} onChange={(e) => update(r.id, { category: e.target.value || null })} placeholder="ex: restaurant, bar…" />
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
            {rows.length === 0 && <div className="text-sm text-muted-foreground">Aucune relance.</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AiFollowupsManagement;
