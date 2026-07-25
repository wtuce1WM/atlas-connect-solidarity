import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Save, Code2, Loader2, ChevronDown, ChevronRight, CornerDownRight } from "lucide-react";

type Followup = { label_fr: string; label_en: string | null; label_ar: string | null };

type Route = { key: "weather" | "events" | "search" | "map" | "llm"; label: string; emoji: string; className: string };

function detectRoute(label: string): Route {
  const q = (label || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!q.trim()) return { key: "llm", label: "LLM direct", emoji: "💬", className: "bg-muted text-muted-foreground" };
  if (/\b(meteo|weather|forecast|temps|temperature|degres?|previsions?|il fait|quel temps)\b/.test(q))
    return { key: "weather", label: "get_weather", emoji: "🌤", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300" };
  if (/\b(event|events|evenement|agenda|week[- ]?end|ce soir|festival|concert|expo|spectacle|whats on)\b/.test(q))
    return { key: "events", label: "search_events", emoji: "📅", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" };
  if (/\b(carte|map|montre.*carte|show.*map|localise)\b/.test(q))
    return { key: "map", label: "show_on_map", emoji: "🗺", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" };
  if (/\b(proximite|autour|pres de|nearby|around|ou |où |restaurant|bar|cafe|the|rooftop|terrasse|musee|galerie|activite|visite|visiter|beach[- ]?club|hotel|riad|spa|boutique|shopping|manger|boire|dejeuner|diner|sortie|things to do|what to do|where)\b/.test(q))
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
  destination_ids: string[];
  subcategory_ids: string[];
  badge_ids: string[];
  city: string | null;
};

type BusinessOption = { id: string; name: string; slug: string | null };
type DestinationOption = { id: string; name_fr: string; name_en: string | null; name_ar: string | null };
type SubcategoryOption = { id: string; name_fr: string };
type BadgeOption = { id: string; name_fr: string };

const EmbedAiSuggestionsManagement = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);
  const [badges, setBadges] = useState<BadgeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [businessSearch, setBusinessSearch] = useState<Record<string, string>>({});
  const [destinationSearch, setDestinationSearch] = useState<Record<string, string>>({});
  const [subcategorySearch, setSubcategorySearch] = useState<Record<string, string>>({});
  const [badgeSearch, setBadgeSearch] = useState<Record<string, string>>({});


  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: bizs }, { data: dests }, { data: subs }, { data: bdgs }] = await Promise.all([
      supabase
        .from("embed_ai_suggestions")
        .select("id,label_fr,label_en,label_ar,sort_order,is_active,followups,business_ids,destination_ids,subcategory_ids,badge_ids,city")
        .order("sort_order", { ascending: true }),
      supabase
        .from("businesses")
        .select("id,name,slug")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("destinations")
        .select("id,name_fr,name_en,name_ar")
        .order("name_fr", { ascending: true }),
      supabase
        .from("subcategories")
        .select("id,name_fr")
        .order("name_fr", { ascending: true }),
      supabase
        .from("badges")
        .select("id,name_fr")
        .order("name_fr", { ascending: true }),
    ]);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows(
      ((data as any[]) || []).map((r) => ({
        ...r,
        followups: Array.isArray(r.followups) ? r.followups : [],
        business_ids: Array.isArray(r.business_ids) ? r.business_ids : [],
        destination_ids: Array.isArray(r.destination_ids) ? r.destination_ids : [],
        subcategory_ids: Array.isArray(r.subcategory_ids) ? r.subcategory_ids : [],
        badge_ids: Array.isArray(r.badge_ids) ? r.badge_ids : [],
      }))
    );
    setBusinesses(((bizs as any[]) || []).map((b) => ({ id: b.id, name: b.name || "(sans nom)", slug: b.slug })));
    setDestinations(((dests as any[]) || []).map((d) => ({ id: d.id, name_fr: d.name_fr || "(sans nom)", name_en: d.name_en || null, name_ar: d.name_ar || null })));
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
    setRows((prev) => [...prev, { ...(data as any), followups: [], business_ids: [], destination_ids: [], subcategory_ids: [], badge_ids: [], city: null } as Row]);
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
          business_ids: r.business_ids || [],
          destination_ids: r.destination_ids || [],
          subcategory_ids: r.subcategory_ids || [],
          badge_ids: r.badge_ids || [],
          city: r.city || null,
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

      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
        <span className="text-muted-foreground">Route détectée automatiquement selon le libellé FR :</span>
        <RouteBadge label="météo" />
        <RouteBadge label="ce week-end" />
        <RouteBadge label="à proximité" />
        <RouteBadge label="montre sur la carte" />
        <RouteBadge label="" />
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
                    {r.subcategory_ids.length > 0 || r.badge_ids.length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" title={`Route déterministe: ${r.subcategory_ids.length} sous-catégorie(s), ${r.badge_ids.length} badge(s)`}>
                        <span>🎯</span><span>
                          {r.subcategory_ids.length > 0 ? `subcat(${r.subcategory_ids.length})` : ""}
                          {r.subcategory_ids.length > 0 && r.badge_ids.length > 0 ? " + " : ""}
                          {r.badge_ids.length > 0 ? `badge(${r.badge_ids.length})` : ""}
                        </span>
                      </span>
                    ) : (
                      <RouteBadge label={r.label_fr || ""} />
                    )}
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
                  <p className="text-[11px] text-muted-foreground mt-1">Vide = affichée pour tous les établissements. Sinon uniquement pour ceux de cette ville.</p>
                </div>

                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Établissements ciblés {r.business_ids.length === 0 ? "(vide = tous)" : `(${r.business_ids.length})`}
                  </label>
                  {r.business_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.business_ids.map((bid) => {
                        const b = businesses.find((x) => x.id === bid);
                        return (
                          <span key={bid} className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary text-xs px-2 py-1">
                            {b?.name || bid}
                            <button
                              type="button"
                              onClick={() => update(r.id, { business_ids: r.business_ids.filter((x) => x !== bid) })}
                              className="hover:text-destructive"
                              title="Retirer"
                            >×</button>
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
                          const q = businessSearch[r.id].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                          const matches = businesses
                            .filter((b) => !r.business_ids.includes(b.id))
                            .filter((b) => b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q));
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
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Destinations liées {r.destination_ids.length === 0 ? "(aucune)" : `(${r.destination_ids.length})`}
                  </label>
                  {r.destination_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.destination_ids.map((did) => {
                        const d = destinations.find((x) => x.id === did);
                        return (
                          <span key={did} className="inline-flex items-center gap-1 rounded-md bg-gold/10 text-gold text-xs px-2 py-1">
                            {d?.name_fr || did}
                            <button
                              type="button"
                              onClick={() => update(r.id, { destination_ids: r.destination_ids.filter((x) => x !== did) })}
                              className="hover:text-destructive"
                              title="Retirer"
                            >×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="relative max-w-md">
                    <Input
                      placeholder="Rechercher une destination…"
                      value={destinationSearch[r.id] || ""}
                      onChange={(e) => setDestinationSearch((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Escape") setDestinationSearch((prev) => ({ ...prev, [r.id]: "" })); }}
                    />
                    {destinationSearch[r.id]?.trim() && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-60 overflow-auto">
                        {(() => {
                          const q = destinationSearch[r.id].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                          const matches = destinations
                            .filter((d) => !r.destination_ids.includes(d.id))
                            .filter((d) => d.name_fr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q));
                          if (matches.length === 0) return <div className="px-3 py-2 text-sm text-muted-foreground">Aucune destination trouvée</div>;
                          return matches.slice(0, 8).map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => { update(r.id, { destination_ids: [...r.destination_ids, d.id] }); setDestinationSearch((prev) => ({ ...prev, [r.id]: "" })); }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted truncate"
                            >
                              {d.name_fr}
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Sous-catégories ciblées {r.subcategory_ids.length === 0 ? "(aucune — recherche libre par l'IA)" : `(${r.subcategory_ids.length} — route déterministe)`}
                  </label>
                  {r.subcategory_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.subcategory_ids.map((sid) => {
                        const s = subcategories.find((x) => x.id === sid);
                        return (
                          <span key={sid} className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs px-2 py-1">
                            {s?.name_fr || sid}
                            <button
                              type="button"
                              onClick={() => update(r.id, { subcategory_ids: r.subcategory_ids.filter((x) => x !== sid) })}
                              className="hover:text-destructive"
                              title="Retirer"
                            >×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="relative max-w-md">
                    <Input
                      placeholder="Rechercher une sous-catégorie…"
                      value={subcategorySearch[r.id] || ""}
                      onChange={(e) => setSubcategorySearch((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Escape") setSubcategorySearch((prev) => ({ ...prev, [r.id]: "" })); }}
                    />
                    {subcategorySearch[r.id]?.trim() && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-60 overflow-auto">
                        {(() => {
                          const q = subcategorySearch[r.id].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                          const matches = subcategories
                            .filter((s) => !r.subcategory_ids.includes(s.id))
                            .filter((s) => s.name_fr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q));
                          if (matches.length === 0) return <div className="px-3 py-2 text-sm text-muted-foreground">Aucune sous-catégorie trouvée</div>;
                          return matches.slice(0, 8).map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => { update(r.id, { subcategory_ids: [...r.subcategory_ids, s.id] }); setSubcategorySearch((prev) => ({ ...prev, [r.id]: "" })); }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted truncate"
                            >
                              {s.name_fr}
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    💡 Quand une ou plusieurs sous-catégories sont liées, l'IA court-circuite le LLM et affiche directement les établissements de ces sous-catégories (résultats déterministes).
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Badges ciblés {r.badge_ids.length === 0 ? "(aucun)" : `(${r.badge_ids.length} — route déterministe)`}
                  </label>
                  {r.badge_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.badge_ids.map((bid) => {
                        const b = badges.find((x) => x.id === bid);
                        return (
                          <span key={bid} className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs px-2 py-1">
                            {b?.name_fr || bid}
                            <button
                              type="button"
                              onClick={() => update(r.id, { badge_ids: r.badge_ids.filter((x) => x !== bid) })}
                              className="hover:text-destructive"
                              title="Retirer"
                            >×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="relative max-w-md">
                    <Input
                      placeholder="Rechercher un badge…"
                      value={badgeSearch[r.id] || ""}
                      onChange={(e) => setBadgeSearch((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Escape") setBadgeSearch((prev) => ({ ...prev, [r.id]: "" })); }}
                    />
                    {badgeSearch[r.id]?.trim() && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-60 overflow-auto">
                        {(() => {
                          const q = badgeSearch[r.id].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                          const matches = badges
                            .filter((b) => !r.badge_ids.includes(b.id))
                            .filter((b) => b.name_fr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q));
                          if (matches.length === 0) return <div className="px-3 py-2 text-sm text-muted-foreground">Aucun badge trouvé</div>;
                          return matches.slice(0, 8).map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => { update(r.id, { badge_ids: [...r.badge_ids, b.id] }); setBadgeSearch((prev) => ({ ...prev, [r.id]: "" })); }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted truncate"
                            >
                              {b.name_fr}
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    💡 Quand un ou plusieurs badges sont liés, l'IA court-circuite le LLM et affiche uniquement les établissements portant ces badges (croisé avec les sous-catégories si présentes).
                  </p>
                </div>








                <p className="text-[11px] text-muted-foreground">
                  💬 Les relances après réponse IA sont gérées globalement dans l'onglet <b>Relances</b>.
                </p>
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
