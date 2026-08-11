import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Save, Code2, Loader2, ChevronDown, ChevronRight, CornerDownRight } from "lucide-react";
import { Chip } from "./AiParamChip";


type Followup = { label_fr: string; label_en: string | null; label_ar: string | null };

type Route = { key: "weather" | "events" | "search" | "map" | "hours" | "booking" | "rating" | "distance" | "opennow" | "ordinal" | "count" | "llm"; label: string; emoji: string; className: string };

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
  blog_post_ids: string[];
  subcategory_ids: string[];
  service_ids: string[];
  badge_ids: string[];
  commodity_filters: string[];
  city: string | null;
  main_categories: string[];
  disabled_followup_ids: string[];
  mode: string | null;
  proximity_a_subcategory_ids: string[];
  proximity_a_badge_ids: string[];
  proximity_b_subcategory_ids: string[];
  proximity_b_badge_ids: string[];
  category: string | null;
  prompt_fr: string | null;
  prompt_en: string | null;
  prompt_ar: string | null;
  fixed_response_fr: string | null;
  fixed_response_en: string | null;
  fixed_response_ar: string | null;
};

export type AiSurface = "club" | "embed" | "search";

const SURFACE_META: Record<AiSurface, { title: string; desc: string }> = {
  club: {
    title: "Suggestions Chat IA du Club",
    desc: "Suggestions affichées dans l'assistant IA de /club.",
  },
  embed: {
    title: "Suggestions Embed IA",
    desc: "Suggestions affichées dans les assistants embarqués /embed/ask/:slug.",
  },
  search: {
    title: "Suggestions IA de /search",
    desc: "Suggestions affichées dans l'onglet IA de la recherche.",
  },
};

type BusinessOption = { id: string; name: string; slug: string | null };
type BlogOption = { id: string; title: string; slug: string | null };
type DestinationOption = { id: string; name_fr: string; name_en: string | null; name_ar: string | null };
type SubcategoryOption = { id: string; name_fr: string };
type ServiceOption = { id: string; name_fr: string };
type BadgeOption = { id: string; name_fr: string };
type GlobalFollowup = { id: string; label_fr: string; is_active: boolean; sort_order: number };

const AiSuggestionsManagement = ({ surface = "embed" }: { surface?: AiSurface }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogOption[]>([]);
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [badges, setBadges] = useState<BadgeOption[]>([]);
  const [mainCategories, setMainCategories] = useState<string[]>([]);
  const [globalFollowups, setGlobalFollowups] = useState<GlobalFollowup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [businessSearch, setBusinessSearch] = useState<Record<string, string>>({});
  const [destinationSearch, setDestinationSearch] = useState<Record<string, string>>({});
  const [subcategorySearch, setSubcategorySearch] = useState<Record<string, string>>({});
  const [serviceSearch, setServiceSearch] = useState<Record<string, string>>({});
  const [badgeSearch, setBadgeSearch] = useState<Record<string, string>>({});
  const [commodities, setCommodities] = useState<string[]>([]);
  const [commoditySearch, setCommoditySearch] = useState<Record<string, string>>({});
  const [proxSearch, setProxSearch] = useState<Record<string, string>>({}); // key: `${rowId}:${side}:${kind}`


  const load = async () => {
    setLoading(true);
    // Fetch businesses in pages to bypass PostgREST max-rows cap
    const fetchAllBusinesses = async () => {
      const pageSize = 1000;
      let from = 0;
      const all: any[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("businesses")
          .select("id,name,slug,engagements")
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
    const [{ data, error }, bizs, { data: dests }, { data: subs }, { data: svcs }, { data: bdgs }, { data: fups }, { data: posts }, { data: cats }] = await Promise.all([
      supabase
        .from("ai_suggestions")
        .select("id,label_fr,label_en,label_ar,sort_order,is_active,followups,business_ids,destination_ids,blog_post_ids,subcategory_ids,service_ids,badge_ids,commodity_filters,city,main_categories,disabled_followup_ids,mode,proximity_a_subcategory_ids,proximity_a_badge_ids,proximity_b_subcategory_ids,proximity_b_badge_ids,category,prompt_fr,prompt_en,prompt_ar,fixed_response_fr,fixed_response_en,fixed_response_ar")
        .eq("surface", surface)
        .order("sort_order", { ascending: true }),
      fetchAllBusinesses(),
      supabase
        .from("destinations")
        .select("id,name_fr,name_en,name_ar")
        .order("name_fr", { ascending: true }),
      supabase
        .from("subcategories")
        .select("id,name_fr")
        .order("name_fr", { ascending: true }),
      supabase
        .from("services")
        .select("id,name_fr")
        .order("name_fr", { ascending: true })
        .range(0, 4999),
      supabase
        .from("badges")
        .select("id,name_fr")
        .order("name_fr", { ascending: true }),
      supabase
        .from("ai_followups")
        .select("id,label_fr,is_active,sort_order")
        .eq("surface", surface)
        .order("sort_order", { ascending: true }),
      supabase
        .from("blog_posts")
        .select("id,title_fr,title_en,slug")
        .order("title_fr", { ascending: true }),
      supabase
        .from("categories")
        .select("name_fr")
        .order("name_fr", { ascending: true }),
    ]);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows(
      ((data as any[]) || []).map((r) => ({
        ...r,
        followups: Array.isArray(r.followups) ? r.followups : [],
        business_ids: Array.isArray(r.business_ids) ? r.business_ids : [],
        destination_ids: Array.isArray(r.destination_ids) ? r.destination_ids : [],
        blog_post_ids: Array.isArray(r.blog_post_ids) ? r.blog_post_ids : [],
        subcategory_ids: Array.isArray(r.subcategory_ids) ? r.subcategory_ids : [],
        service_ids: Array.isArray(r.service_ids) ? r.service_ids : [],
        badge_ids: Array.isArray(r.badge_ids) ? r.badge_ids : [],
        commodity_filters: Array.isArray(r.commodity_filters) ? r.commodity_filters : [],
        main_categories: Array.isArray(r.main_categories) ? r.main_categories : [],
        disabled_followup_ids: Array.isArray(r.disabled_followup_ids) ? r.disabled_followup_ids : [],
        proximity_a_subcategory_ids: Array.isArray(r.proximity_a_subcategory_ids) ? r.proximity_a_subcategory_ids : [],
        proximity_a_badge_ids: Array.isArray(r.proximity_a_badge_ids) ? r.proximity_a_badge_ids : [],
        proximity_b_subcategory_ids: Array.isArray(r.proximity_b_subcategory_ids) ? r.proximity_b_subcategory_ids : [],
        proximity_b_badge_ids: Array.isArray(r.proximity_b_badge_ids) ? r.proximity_b_badge_ids : [],
      }))
    );
    setBusinesses((bizs || []).map((b: any) => ({ id: b.id, name: b.name || "(sans nom)", slug: b.slug })));
    // Commodités disponibles = valeurs « Logistique: » réellement présentes en base
    const commSet = new Set<string>();
    for (const b of (bizs || []) as any[]) {
      for (const e of (Array.isArray(b.engagements) ? b.engagements : [])) {
        const v = String(e || "");
        if (v.startsWith("Logistique:")) commSet.add(v.slice("Logistique:".length).trim());
      }
    }
    setCommodities([...commSet].filter(Boolean).sort((a, b) => a.localeCompare(b, "fr")));
    setDestinations(((dests as any[]) || []).map((d) => ({ id: d.id, name_fr: d.name_fr || "(sans nom)", name_en: d.name_en || null, name_ar: d.name_ar || null })));
    setSubcategories(((subs as any[]) || []).map((s) => ({ id: s.id, name_fr: s.name_fr || "(sans nom)" })));
    setServices(((svcs as any[]) || []).map((s) => ({ id: s.id, name_fr: s.name_fr || "(sans nom)" })));
    setBadges(((bdgs as any[]) || []).map((b) => ({ id: b.id, name_fr: b.name_fr || "(sans nom)" })));
    setGlobalFollowups(((fups as any[]) || []).map((f) => ({ id: f.id, label_fr: f.label_fr || "", is_active: !!f.is_active, sort_order: f.sort_order || 0 })));
    setBlogPosts(
      ((posts as any[]) || [])
        .map((p) => ({ id: p.id, slug: p.slug, title: (p.title_fr || p.title_en || p.slug || "(sans titre)").trim() }))
        .sort((a, b) => a.title.localeCompare(b.title, "fr", { sensitivity: "base" }))
    );
    setMainCategories(((cats as any[]) || []).map((c) => (c.name_fr || "").trim()).filter(Boolean));



    setDirty(new Set());
    setLoading(false);
  };

  useEffect(() => { load(); }, [surface]);

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
      .from("ai_suggestions")
      .insert({ label_fr: "Nouvelle suggestion", sort_order: nextOrder, surface })
      .select()
      .single();
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows((prev) => [...prev, { ...(data as any), followups: [], business_ids: [], destination_ids: [], blog_post_ids: [], subcategory_ids: [], service_ids: [], badge_ids: [], commodity_filters: [], city: null, main_categories: [], disabled_followup_ids: [], mode: null, proximity_a_subcategory_ids: [], proximity_a_badge_ids: [], proximity_b_subcategory_ids: [], proximity_b_badge_ids: [], category: null, prompt_fr: null, prompt_en: null, prompt_ar: null, fixed_response_fr: null, fixed_response_en: null, fixed_response_ar: null } as Row]);
    setExpanded((prev) => new Set(prev).add((data as any).id));

  };


  const removeRow = async (id: string) => {
    if (!confirm("Supprimer cette suggestion ?")) return;
    const { error } = await supabase.from("ai_suggestions").delete().eq("id", id);
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const saveAll = async () => {
    setSaving(true);
    const toSave = rows.filter((r) => dirty.has(r.id));
    const results = await Promise.all(
      toSave.map((r) =>
        supabase.from("ai_suggestions").update({
          label_fr: r.label_fr,
          label_en: r.label_en,
          label_ar: r.label_ar,
          sort_order: r.sort_order,
          is_active: r.is_active,
          followups: r.followups.filter((f) => (f.label_fr || "").trim()),
          business_ids: r.business_ids || [],
          destination_ids: r.destination_ids || [],
          blog_post_ids: r.blog_post_ids || [],
          subcategory_ids: r.subcategory_ids || [],
          service_ids: r.service_ids || [],
          badge_ids: r.badge_ids || [],
          commodity_filters: r.commodity_filters || [],
          city: r.city || null,
          main_categories: r.main_categories || [],
          disabled_followup_ids: r.disabled_followup_ids || [],
          mode: r.mode || null,
          proximity_a_subcategory_ids: r.proximity_a_subcategory_ids || [],
          proximity_a_badge_ids: r.proximity_a_badge_ids || [],
          proximity_b_subcategory_ids: r.proximity_b_subcategory_ids || [],
          proximity_b_badge_ids: r.proximity_b_badge_ids || [],
          category: r.category || null,
          prompt_fr: r.prompt_fr || null,
          prompt_en: r.prompt_en || null,
          prompt_ar: r.prompt_ar || null,
          fixed_response_fr: r.fixed_response_fr || null,
          fixed_response_en: r.fixed_response_en || null,
          fixed_response_ar: r.fixed_response_ar || null,
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
            <h2 className="text-xl font-bold">{SURFACE_META[surface].title}</h2>
            <p className="text-sm text-muted-foreground">
              {SURFACE_META[surface].desc}{" "}
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

      <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <b>Route</b> : laisse <code>Auto</code> pour que le runtime détecte la route depuis le libellé FR (météo, événements, proximité, carte…) ou force une route déterministe pour court-circuiter le LLM.
      </div>


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
                    <span
                      className="truncate font-semibold cursor-pointer"
                      onClick={() => toggleExpanded(r.id)}
                      title={r.label_fr || ""}
                    >
                      {r.label_fr || <em className="text-muted-foreground">(sans libellé FR)</em>}
                    </span>
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

                {/* Résumé des paramètres (toujours visible) */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[11px]">
                  {r.mode === "events" ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium bg-amber-500/15 text-amber-700">📅 search_events</span>
                  ) : r.mode === "video_feed" ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium bg-fuchsia-500/15 text-fuchsia-700">🎬 video_feed</span>
                  ) : r.mode === "structure_front" || r.subcategory_ids.length > 0 || r.badge_ids.length > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium bg-primary/15 text-primary">🔍 search_businesses</span>
                  ) : r.mode === "direct_viewer" ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium bg-slate-500/15 text-slate-700">📌 direct_viewer</span>
                  ) : (
                    <RouteBadge label={r.label_fr || ""} />
                  )}
                  <Chip label="Ville" value={r.city || "Toutes"} alert={!!r.city} />
                  <Chip
                    label="Catégories"
                    value={
                      (r.main_categories?.length ?? 0) === 0
                        ? "Toutes"
                        : r.main_categories.length <= 2
                          ? r.main_categories.join(", ")
                          : `${r.main_categories.length} sélectionnées`
                    }
                    alert={(r.main_categories?.length ?? 0) > 0}
                  />
                  <Chip label="Établissements" value={r.business_ids.length === 0 ? "tous" : String(r.business_ids.length)} alert={r.business_ids.length > 0} />
                  <Chip label="Destinations" value={r.destination_ids.length === 0 ? "—" : String(r.destination_ids.length)} alert={r.destination_ids.length > 0} />
                  <Chip label="Blog" value={r.blog_post_ids.length === 0 ? "auto" : String(r.blog_post_ids.length)} alert={r.blog_post_ids.length > 0} />
                  <Chip label="Sous-cat." value={r.subcategory_ids.length === 0 ? "—" : String(r.subcategory_ids.length)} alert={r.subcategory_ids.length > 0} />
                  <Chip label="Services" value={(r.service_ids?.length ?? 0) === 0 ? "—" : String(r.service_ids.length)} alert={(r.service_ids?.length ?? 0) > 0} />
                  <Chip label="Badges" value={r.badge_ids.length === 0 ? "—" : String(r.badge_ids.length)} alert={r.badge_ids.length > 0} />
                  <Chip
                    label="Commodités"
                    value={(r.commodity_filters?.length ?? 0) === 0 ? "—" : String(r.commodity_filters.length)}
                    alert={(r.commodity_filters?.length ?? 0) > 0}
                  />
                  {(r.proximity_a_subcategory_ids.length > 0 || r.proximity_a_badge_ids.length > 0 || r.proximity_b_subcategory_ids.length > 0 || r.proximity_b_badge_ids.length > 0) && (
                    <Chip
                      label="Proximité A/B"
                      value={`A ${r.proximity_a_subcategory_ids.length + r.proximity_a_badge_ids.length} · B ${r.proximity_b_subcategory_ids.length + r.proximity_b_badge_ids.length}`}
                      alert
                    />
                  )}
                  <Chip label="Réponse figée" value={(r.fixed_response_fr || r.fixed_response_en || r.fixed_response_ar) ? "✓" : "—"} alert={!!(r.fixed_response_fr || r.fixed_response_en || r.fixed_response_ar)} />
                  <Chip label="Prompt" value={(r.prompt_fr || r.prompt_en || r.prompt_ar) ? "✓" : "—"} alert={!!(r.prompt_fr || r.prompt_en || r.prompt_ar)} />
                  <Chip label="EN" value={r.label_en ? "✓" : "—"} alert={!r.label_en} />
                  <Chip label="AR" value={r.label_ar ? "✓" : "—"} alert={!r.label_ar} />
                  <Chip
                    label="Relances"
                    value={`${globalFollowups.length - (r.disabled_followup_ids?.length || 0)}/${globalFollowups.length}`}
                  />
                </div>
              </CardHeader>
              {isOpen && (
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
                </div>

                <div className="pt-2 border-t space-y-2">
                  <label className="text-xs font-semibold">
                    Réponse figée (optionnel)
                    {(r.fixed_response_fr || r.fixed_response_en || r.fixed_response_ar) && <span className="ml-2 text-primary">● configurée</span>}
                  </label>
                  <div className="grid gap-2 md:grid-cols-3">
                    <Textarea value={r.fixed_response_fr || ""} onChange={(e) => update(r.id, { fixed_response_fr: e.target.value || null })} placeholder="Réponse figée FR (Markdown)" rows={6} />
                    <Textarea value={r.fixed_response_en || ""} onChange={(e) => update(r.id, { fixed_response_en: e.target.value || null })} placeholder="Fixed response EN (Markdown)" rows={6} />
                    <Textarea value={r.fixed_response_ar || ""} onChange={(e) => update(r.id, { fixed_response_ar: e.target.value || null })} placeholder="الرد الثابت AR (Markdown)" rows={6} dir="rtl" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Si renseignée, la réponse est servie telle quelle (classe A, aucun token LLM).</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold">
                    Prompt LLM (optionnel)
                    {(r.prompt_fr || r.prompt_en || r.prompt_ar) && <span className="ml-2 text-primary">● configuré</span>}
                  </label>
                  <div className="grid gap-2 md:grid-cols-3">
                    <Textarea value={r.prompt_fr || ""} onChange={(e) => update(r.id, { prompt_fr: e.target.value || null })} placeholder="Prompt system FR" rows={4} />
                    <Textarea value={r.prompt_en || ""} onChange={(e) => update(r.id, { prompt_en: e.target.value || null })} placeholder="System prompt EN" rows={4} />
                    <Textarea value={r.prompt_ar || ""} onChange={(e) => update(r.id, { prompt_ar: e.target.value || null })} placeholder="Prompt system AR" rows={4} dir="rtl" />
                  </div>
                </div>

                <div className="max-w-xs">
                  <label className="text-xs text-muted-foreground">Catégorie (regroupement)</label>
                  <Input value={r.category || ""} onChange={(e) => update(r.id, { category: e.target.value || null })} placeholder="ex. gastronomie" />
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

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-muted-foreground">Catégories principales ciblées</label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        onClick={() => update(r.id, { main_categories: [...mainCategories] })}
                      >
                        Tout sélectionner
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        onClick={() => update(r.id, { main_categories: [] })}
                      >
                        Aucune
                      </Button>
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {mainCategories.map((c) => {
                      const on = (r.main_categories || []).includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() =>
                            update(r.id, {
                              main_categories: on
                                ? (r.main_categories || []).filter((x) => x !== c)
                                : [...(r.main_categories || []), c],
                            })
                          }
                          className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                            on
                              ? "border-primary bg-primary/15 text-primary font-medium"
                              : "border-input text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Vide = suggestion affichée pour tous les établissements. Sinon uniquement pour les établissements
                    dont la catégorie principale est sélectionnée.
                  </p>
                </div>

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
                          <option value="events">📅 Events (search_events ville hôte, badge_ids ou #Agenda)</option>
                          <option value="structure_front">🧭 Structure du Front (search_businesses + sous-catégories/badges)</option>
                          <option value="direct_viewer">📌 Direct viewer (carousel figé des business_ids)</option>
                          <option value="video_feed">🎬 Feed vidéo (vidéos internes + génériques des badges)</option>
                        </select>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          <b>Auto</b> : le runtime choisit la route (météo, événements, proximité, carte, recherche…) à partir du libellé FR et du message utilisateur.<br />
                          <b>Events / Structure du Front / Direct viewer</b> : court-circuitent le LLM et forcent la route indiquée.
                        </p>
                      </>
                    );
                  })()}
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
                  <label className="text-xs text-muted-foreground block mb-1">
                    Articles de blog liés {r.blog_post_ids.length === 0 ? "(aucun — détection auto par l'IA)" : `(${r.blog_post_ids.length} — lien explicite prioritaire)`}
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      if (!r.blog_post_ids.includes(v)) update(r.id, { blog_post_ids: [...r.blog_post_ids, v] });
                    }}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm w-full max-w-md"
                    title="Ajouter un article de blog"
                  >
                    <option value="">— Ajouter un article —</option>
                    {blogPosts.filter((p) => !r.blog_post_ids.includes(p.id)).map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                  {r.blog_post_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.blog_post_ids.map((pid) => {
                        const p = blogPosts.find((x) => x.id === pid);
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
                    Services ciblés {(r.service_ids?.length ?? 0) === 0 ? "(aucun — recherche libre par l'IA)" : `(${r.service_ids.length} — route déterministe)`}
                  </label>
                  {(r.service_ids?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.service_ids.map((sid) => {
                        const s = services.find((x) => x.id === sid);
                        return (
                          <span key={sid} className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-300 text-xs px-2 py-1">
                            {s?.name_fr || sid}
                            <button
                              type="button"
                              onClick={() => update(r.id, { service_ids: r.service_ids.filter((x) => x !== sid) })}
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
                      placeholder="Rechercher un service…"
                      value={serviceSearch[r.id] || ""}
                      onChange={(e) => setServiceSearch((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Escape") setServiceSearch((prev) => ({ ...prev, [r.id]: "" })); }}
                    />
                    {serviceSearch[r.id]?.trim() && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-60 overflow-auto">
                        {(() => {
                          const q = serviceSearch[r.id].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                          const matches = services
                            .filter((s) => !(r.service_ids || []).includes(s.id))
                            .filter((s) => s.name_fr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q));
                          if (matches.length === 0) return <div className="px-3 py-2 text-sm text-muted-foreground">Aucun service trouvé</div>;
                          return matches.slice(0, 8).map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => { update(r.id, { service_ids: [...(r.service_ids || []), s.id] }); setServiceSearch((prev) => ({ ...prev, [r.id]: "" })); }}
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
                    💡 Filtre dur sur le champ « services » des fiches : seuls les établissements proposant l'un de ces services sont retenus (classe A, zéro token).
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

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Commodités ciblées {r.commodity_filters.length === 0 ? "(aucune)" : `(${r.commodity_filters.length} — route déterministe)`}
                  </label>
                  {r.commodity_filters.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.commodity_filters.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-300 text-xs px-2 py-1">
                          {c}
                          <button
                            type="button"
                            onClick={() => update(r.id, { commodity_filters: r.commodity_filters.filter((x) => x !== c) })}
                            className="hover:text-destructive"
                            title="Retirer"
                          >×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative max-w-md">
                    <Input
                      placeholder="Rechercher une commodité (Logistique)…"
                      value={commoditySearch[r.id] || ""}
                      onChange={(e) => setCommoditySearch((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Escape") setCommoditySearch((prev) => ({ ...prev, [r.id]: "" })); }}
                    />
                    {commoditySearch[r.id]?.trim() && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-60 overflow-auto">
                        {(() => {
                          const norm = (v: string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                          const q = norm(commoditySearch[r.id]);
                          const matches = commodities
                            .filter((c) => !r.commodity_filters.includes(c))
                            .filter((c) => norm(c).includes(q));
                          if (matches.length === 0) return <div className="px-3 py-2 text-sm text-muted-foreground">Aucune commodité trouvée</div>;
                          return matches.slice(0, 8).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => { update(r.id, { commodity_filters: [...r.commodity_filters, c] }); setCommoditySearch((prev) => ({ ...prev, [r.id]: "" })); }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted truncate"
                            >
                              {c}
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    💡 Commodités de la Structure du Front (ex. « Livraison internationale ») : quand une commodité est liée, l'IA filtre en dur sur les établissements qui la portent, sans passer par le LLM.
                  </p>
                </div>



                {/* PROXIMITÉ DEUX ENTITÉS (A à côté d'un B) */}
                {(() => {
                  const sides: Array<{ key: "a" | "b"; label: string; subField: "proximity_a_subcategory_ids" | "proximity_b_subcategory_ids"; badgeField: "proximity_a_badge_ids" | "proximity_b_badge_ids" }> = [
                    { key: "a", label: "Entité A (la cible cherchée)", subField: "proximity_a_subcategory_ids", badgeField: "proximity_a_badge_ids" },
                    { key: "b", label: "Entité B (la référence de proximité)", subField: "proximity_b_subcategory_ids", badgeField: "proximity_b_badge_ids" },
                  ];
                  const aHas = r.proximity_a_subcategory_ids.length > 0 || r.proximity_a_badge_ids.length > 0;
                  const bHas = r.proximity_b_subcategory_ids.length > 0 || r.proximity_b_badge_ids.length > 0;
                  const active = aHas && bHas;
                  return (
                    <div className="pt-2 border-t space-y-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold">Proximité A à côté de B (deux entités)</label>
                        {active ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/15 text-primary" title="Route déterministe two_entity_proximity">
                            🔗 Route déterministe A/B active
                          </span>
                        ) : (aHas || bHas) ? (
                          <span className="text-[10px] text-amber-600">⚠️ Un seul côté rempli — remplis A ET B pour activer</span>
                        ) : null}
                      </div>
                      {sides.map((side) => {
                        const subIds = r[side.subField] as string[];
                        const badgeIds = r[side.badgeField] as string[];
                        const subKey = `${r.id}:${side.key}:sub`;
                        const badgeKey = `${r.id}:${side.key}:badge`;
                        return (
                          <div key={side.key} className="border border-border/60 rounded-md p-2 space-y-2">
                            <div className="text-[11px] font-medium">{side.label}</div>
                            {/* Sous-cat */}
                            <div className="space-y-1">
                              <div className="text-[10px] text-muted-foreground">Sous-catégories ({subIds.length})</div>
                              {subIds.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {subIds.map((sid) => {
                                    const s = subcategories.find((x) => x.id === sid);
                                    return (
                                      <span key={sid} className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] px-1.5 py-0.5">
                                        {s?.name_fr || sid}
                                        <button type="button" onClick={() => update(r.id, { [side.subField]: subIds.filter((x) => x !== sid) } as any)} className="hover:text-destructive">×</button>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              <div className="relative max-w-md">
                                <Input
                                  placeholder="Rechercher une sous-catégorie…"
                                  value={proxSearch[subKey] || ""}
                                  onChange={(e) => setProxSearch((prev) => ({ ...prev, [subKey]: e.target.value }))}
                                  className="h-8 text-xs"
                                />
                                {proxSearch[subKey]?.trim() && (
                                  <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-52 overflow-auto">
                                    {(() => {
                                      const q = proxSearch[subKey].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                      const matches = subcategories.filter((s) => !subIds.includes(s.id)).filter((s) => s.name_fr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q));
                                      if (matches.length === 0) return <div className="px-3 py-2 text-xs text-muted-foreground">Aucune sous-catégorie</div>;
                                      return matches.slice(0, 8).map((s) => (
                                        <button key={s.id} type="button" onClick={() => { update(r.id, { [side.subField]: [...subIds, s.id] } as any); setProxSearch((prev) => ({ ...prev, [subKey]: "" })); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted truncate">{s.name_fr}</button>
                                      ));
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Badges */}
                            <div className="space-y-1">
                              <div className="text-[10px] text-muted-foreground">Badges ({badgeIds.length})</div>
                              {badgeIds.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {badgeIds.map((bid) => {
                                    const b = badges.find((x) => x.id === bid);
                                    return (
                                      <span key={bid} className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] px-1.5 py-0.5">
                                        {b?.name_fr || bid}
                                        <button type="button" onClick={() => update(r.id, { [side.badgeField]: badgeIds.filter((x) => x !== bid) } as any)} className="hover:text-destructive">×</button>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              <div className="relative max-w-md">
                                <Input
                                  placeholder="Rechercher un badge…"
                                  value={proxSearch[badgeKey] || ""}
                                  onChange={(e) => setProxSearch((prev) => ({ ...prev, [badgeKey]: e.target.value }))}
                                  className="h-8 text-xs"
                                />
                                {proxSearch[badgeKey]?.trim() && (
                                  <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-52 overflow-auto">
                                    {(() => {
                                      const q = proxSearch[badgeKey].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                      const matches = badges.filter((b) => !badgeIds.includes(b.id)).filter((b) => b.name_fr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q));
                                      if (matches.length === 0) return <div className="px-3 py-2 text-xs text-muted-foreground">Aucun badge</div>;
                                      return matches.slice(0, 8).map((b) => (
                                        <button key={b.id} type="button" onClick={() => { update(r.id, { [side.badgeField]: [...badgeIds, b.id] } as any); setProxSearch((prev) => ({ ...prev, [badgeKey]: "" })); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted truncate">{b.name_fr}</button>
                                      ));
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-[11px] text-muted-foreground">
                        💡 Quand A et B sont tous deux définis (sous-cat et/ou badges), l'IA lance la route <b>two_entity_proximity</b> avec ces mappings exacts (pas de résolution texte). L'union sous-cat ∪ badges est utilisée comme pool pour chaque côté.
                      </p>
                    </div>
                  );
                })()}



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
                    <p className="text-[11px] text-muted-foreground">Aucune relance dans l'onglet <b>Relances</b>.</p>
                  ) : (
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {globalFollowups.map((f) => {
                        const disabled = (r.disabled_followup_ids || []).includes(f.id);
                        const enabled = !disabled;
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
              </CardContent>
              )}

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

export default AiSuggestionsManagement;
