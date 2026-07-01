import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Loader2, Save, HelpCircle, Pencil, X, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { fetchAllRows } from "@/lib/fetchAllRows";

interface SynonymFilter {
  subcategory_name: string | null;
  required_service: string | null;
}

interface SynonymEntry {
  id: string;
  key_word: string;
  key_word_en: string | null;
  key_word_ar: string | null;
  synonyms: string[];
  synonyms_en: string[];
  synonyms_ar: string[];
  subcategory_names: string[];
  service_names: string[];
  filters: SynonymFilter[];
  is_active: boolean;
  badge_id: string | null;
  engagement_filters: string[];
  commodity_filters: string[];
  created_at: string;
}

interface BusinessDataWithBadges {
  id: string;
  categories: string[];
  services: string[];
  engagements: string[];
  is_visible_locale: boolean;
  is_active: boolean;
  badge_ids: string[];
}

interface BadgeEntry {
  id: string;
  name_fr: string;
  color_hex: string | null;
  text_color_hex: string | null;
}

const SynonymsManagement = () => {
  const [entries, setEntries] = useState<SynonymEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newSynonyms, setNewSynonyms] = useState("");
  const [editingSynonym, setEditingSynonym] = useState<Record<string, string>>({});
  const [allSubcategories, setAllSubcategories] = useState<{id: string; name: string; category_id: string}[]>([]);
  const [allCategories, setAllCategories] = useState<{id: string; name_fr: string}[]>([]);
  const [allServices, setAllServices] = useState<{name: string; subcategory_id: string}[]>([]);
  const [badges, setBadges] = useState<BadgeEntry[]>([]);
  const [businessData, setBusinessData] = useState<BusinessDataWithBadges[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "oldest" | "newest">("asc");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSubcategory, setFilterSubcategory] = useState("");
  const [dirtyEntries, setDirtyEntries] = useState<Set<string>>(new Set());
  const [savingEntries, setSavingEntries] = useState<Set<string>>(new Set());
  const [editingFilterRow, setEditingFilterRow] = useState<{ entryId: string; index: number } | null>(null);
  const [editFilterValues, setEditFilterValues] = useState<{ subcategory_name: string; required_service: string }>({ subcategory_name: "", required_service: "" });
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [globalEngagements, setGlobalEngagements] = useState<string[]>([]);
  const [globalCommodites, setGlobalCommodites] = useState<string[]>([]);

  const load = async () => {
    setIsLoading(true);
    const [{ data }, { data: subcats }, { data: cats }, svcData, { data: bdgData }, bizData, { data: engOptsData }, bizBadgesData] = await Promise.all([
      supabase.from("search_synonyms").select("*").order("key_word"),
      supabase.from("subcategories").select("id, name_fr, category_id").order("name_fr"),
      supabase.from("categories").select("id, name_fr").order("name_fr"),
      fetchAllRows<{ name_fr: string; subcategory_id: string }>("services", "name_fr, subcategory_id", "name_fr"),
      supabase.from("badges").select("id, name_fr, color_hex, text_color_hex").order("name_fr"),
      fetchAllRows<{ id: string; categories: string[]; services: string[]; engagements: string[]; is_visible_locale: boolean; is_active: boolean }>("businesses", "id, categories, services, engagements, is_visible_locale, is_active", "name"),
      supabase.from("staff_notes").select("content").eq("key", "engagement_custom_options_v1").maybeSingle(),
      fetchAllRows<{ business_id: string; badge_id: string }>("business_badges", "business_id, badge_id", "business_id"),
    ]);

    // Build a map of business_id → badge_ids
    const bizBadgeMap = new Map<string, string[]>();
    for (const bb of bizBadgesData || []) {
      if (!bizBadgeMap.has(bb.business_id)) bizBadgeMap.set(bb.business_id, []);
      bizBadgeMap.get(bb.business_id)!.push(bb.badge_id);
    }

    const dbEngagements = new Set<string>();
    const dbCommodites = new Set<string>();
    for (const biz of bizData || []) {
      for (const raw of biz.engagements || []) {
        const value = typeof raw === "string" ? raw.trim() : "";
        if (!value) continue;
        if (value.startsWith("Logistique:")) {
          const commodity = value.replace("Logistique:", "").trim();
          if (commodity) dbCommodites.add(commodity);
        } else if (!value.startsWith("Certification:") && !value.startsWith("Marché:")) {
          dbEngagements.add(value);
        }
      }
    }

    let noteEngagements: string[] = [];
    let noteCommodites: string[] = [];
    if (engOptsData?.content) {
      try {
        const parsed = JSON.parse(engOptsData.content);
        noteEngagements = Array.isArray(parsed?.engagements)
          ? parsed.engagements.filter((v: unknown) => typeof v === "string" && v.trim())
          : [];
        noteCommodites = Array.isArray(parsed?.commodites)
          ? parsed.commodites.filter((v: unknown) => typeof v === "string" && v.trim())
          : [];
      } catch {
        // ignore malformed staff_notes content
      }
    }

    setGlobalEngagements([...new Set([...noteEngagements, ...dbEngagements])].sort((a, b) => a.localeCompare(b, "fr")));
    setGlobalCommodites([...new Set([...noteCommodites, ...dbCommodites])].sort((a, b) => a.localeCompare(b, "fr")));

    if (data) setEntries(data.map((d: any) => ({
      ...d,
      key_word_en: d.key_word_en ?? null,
      key_word_ar: d.key_word_ar ?? null,
      synonyms_en: d.synonyms_en || [],
      synonyms_ar: d.synonyms_ar || [],
      subcategory_names: d.subcategory_names || [],
      service_names: d.service_names || [],
      filters: d.filters || [],
      engagement_filters: d.engagement_filters || [],
      commodity_filters: d.commodity_filters || [],
    })) as SynonymEntry[]);
    if (subcats) setAllSubcategories(subcats.map((s: any) => ({ id: s.id, name: s.name_fr, category_id: s.category_id })));
    if (cats) setAllCategories(cats as any);
    if (svcData) setAllServices(svcData.map((s: any) => ({ name: s.name_fr, subcategory_id: s.subcategory_id })));
    if (bdgData) setBadges(bdgData as BadgeEntry[]);
    if (bizData) setBusinessData(bizData.map((b: any) => ({
      id: b.id,
      categories: b.categories || [],
      services: b.services || [],
      engagements: b.engagements || [],
      is_visible_locale: b.is_visible_locale ?? true,
      is_active: b.is_active ?? true,
      badge_ids: bizBadgeMap.get(b.id) || [],
    })));
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addEntry = async () => {
    const key = newKey.trim().toLowerCase();
    const syns = newSynonyms.split(",").map(s => s.trim()).filter(Boolean);
    if (!key || syns.length === 0) return;
    const { error } = await supabase.from("search_synonyms").insert({ key_word: key, synonyms: syns });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setNewKey("");
      setNewSynonyms("");
      load();
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await supabase.from("search_synonyms").update({ is_active }).eq("id", id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, is_active } : e));
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("search_synonyms").delete().eq("id", id);
    setEntries(prev => prev.filter(e => e.id !== id));
    if (selectedEntryId === id) setSelectedEntryId(null);
  };

  const addSynonymToEntry = async (id: string) => {
    const syn = (editingSynonym[id] || "").trim();
    if (!syn) return;
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const updated = [...entry.synonyms, syn];
    await supabase.from("search_synonyms").update({ synonyms: updated }).eq("id", id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, synonyms: updated } : e));
    setEditingSynonym(prev => ({ ...prev, [id]: "" }));
  };

  const removeSynonymFromEntry = async (id: string, syn: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const updated = entry.synonyms.filter(s => s !== syn);
    await supabase.from("search_synonyms").update({ synonyms: updated }).eq("id", id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, synonyms: updated } : e));
  };

  const addFilterRow = (id: string, subcategory_name: string, required_service: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const newFilter: SynonymFilter = {
      subcategory_name: subcategory_name.trim() || null,
      required_service: required_service.trim() || null,
    };
    if (!newFilter.subcategory_name && !newFilter.required_service) return;
    const updatedFilters = [...entry.filters, newFilter];
    setEntries(prev => prev.map(e => e.id === id ? { ...e, filters: updatedFilters } : e));
    setDirtyEntries(prev => new Set(prev).add(id));
  };

  const removeFilterRow = (id: string, index: number) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const updatedFilters = entry.filters.filter((_, i) => i !== index);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, filters: updatedFilters } : e));
    setDirtyEntries(prev => new Set(prev).add(id));
  };

  const updateFilterRow = (id: string, index: number, values: { subcategory_name: string; required_service: string }) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const updatedFilters = [...entry.filters];
    updatedFilters[index] = {
      subcategory_name: values.subcategory_name.trim() || null,
      required_service: values.required_service.trim() || null,
    };
    setEntries(prev => prev.map(e => e.id === id ? { ...e, filters: updatedFilters } : e));
    setEditingFilterRow(null);
    setDirtyEntries(prev => new Set(prev).add(id));
  };

  const saveEntryChanges = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    setSavingEntries(prev => new Set(prev).add(id));
    const subcatNames = [...new Set(entry.filters.map(f => f.subcategory_name).filter(Boolean) as string[])];
    const svcNames = [...new Set(entry.filters.map(f => f.required_service).filter(Boolean) as string[])];
    const { error } = await supabase.from("search_synonyms").update({
      key_word: entry.key_word,
      key_word_en: entry.key_word_en,
      key_word_ar: entry.key_word_ar,
      synonyms_en: entry.synonyms_en,
      synonyms_ar: entry.synonyms_ar,
      filters: entry.filters,
      subcategory_names: subcatNames,
      service_names: svcNames,
      badge_id: entry.badge_id,
      engagement_filters: entry.engagement_filters,
      commodity_filters: entry.commodity_filters,
    } as any).eq("id", id);
    setSavingEntries(prev => { const n = new Set(prev); n.delete(id); return n; });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setDirtyEntries(prev => { const n = new Set(prev); n.delete(id); return n; });
      toast({ title: "Sauvegardé ✓" });
    }
  };

  const [newFilterForm, setNewFilterForm] = useState<Record<string, { subcategory_name: string; required_service: string }>>({});

  const filteredSorted = useMemo(() => {
    return [...entries]
      .filter(entry => {
        // Text search
        if (searchText) {
          const q = searchText.toLowerCase();
          if (!entry.key_word.includes(q) && !entry.synonyms.some(s => s.toLowerCase().includes(q))) return false;
        }
        // Category/subcategory filter
        if (!filterCategory && !filterSubcategory) return true;
        const entrySubcats = entry.filters.map(f => f.subcategory_name).filter(Boolean) as string[];
        if (filterSubcategory) return entrySubcats.includes(filterSubcategory);
        const subcatNamesInCat = allSubcategories.filter(sc => sc.category_id === filterCategory).map(sc => sc.name);
        return entrySubcats.some(sn => subcatNamesInCat.includes(sn));
      })
      .sort((a, b) => {
        if (sortOrder === "asc") return a.key_word.localeCompare(b.key_word);
        if (sortOrder === "desc") return b.key_word.localeCompare(a.key_word);
        if (sortOrder === "oldest") return (a.created_at || "").localeCompare(b.created_at || "");
        return (b.created_at || "").localeCompare(a.created_at || "");
      });
  }, [entries, searchText, filterCategory, filterSubcategory, sortOrder, allSubcategories]);

  const selectedEntry = selectedEntryId ? entries.find(e => e.id === selectedEntryId) : null;

  const getBusinessCount = useMemo(() => {
    const cache = new Map<string, number>();
    for (const entry of entries) {
      // Check if entry has any criteria at all
      const hasFilters = entry.filters.length > 0;
      const hasBadge = !!entry.badge_id;
      const hasEngagements = entry.engagement_filters.length > 0;
      const hasCommodities = entry.commodity_filters.length > 0;
      
      if (!hasFilters && !hasBadge && !hasEngagements && !hasCommodities) {
        cache.set(entry.id, 0);
        continue;
      }
      
      let count = 0;
      for (const biz of businessData) {
        // Match front search behavior: only active businesses are globally required
        if (!biz.is_active) continue;
        
        // Badge match: business must have the badge
        if (hasBadge && !biz.badge_ids.includes(entry.badge_id!)) continue;
        
        // Engagement match: business must have ALL required engagements
        if (hasEngagements) {
          const bizEngs = biz.engagements.map(e => typeof e === 'string' ? e.trim() : '');
          const allEngMatch = entry.engagement_filters.every(eng => bizEngs.includes(eng));
          if (!allEngMatch) continue;
        }
        
        // Commodity match: business must have ALL required commodities (prefixed with "Logistique:")
        if (hasCommodities) {
          const bizEngs = biz.engagements.map(e => typeof e === 'string' ? e.trim() : '');
          const allComMatch = entry.commodity_filters.every(com => bizEngs.includes(`Logistique:${com}`));
          if (!allComMatch) continue;
        }
        
        // Filters match (OR between filter rows): at least one filter row must match
        if (hasFilters) {
          const filterMatch = entry.filters.some(f => {
            const subcatMatch = !f.subcategory_name || biz.categories.includes(f.subcategory_name);
            const svcMatch = !f.required_service || biz.services.includes(f.required_service);
            return subcatMatch && svcMatch;
          });
          if (!filterMatch) continue;
        }
        
        count++;
      }
      cache.set(entry.id, count);
    }
    return cache;
  }, [entries, businessData]);

  const getFilterSummary = (entry: SynonymEntry) => {
    if (entry.filters.length === 0) return "Aucun filtre";
    const subcats = [...new Set(entry.filters.map(f => f.subcategory_name).filter(Boolean))];
    const services = [...new Set(entry.filters.map(f => f.required_service).filter(Boolean))];
    const parts: string[] = [];
    if (subcats.length > 0) parts.push(subcats.length <= 2 ? subcats.join(", ") : `${subcats.length} sous-cat.`);
    if (services.length > 0) parts.push(services.length <= 2 ? services.join(", ") : `${services.length} services`);
    return parts.join(" · ") || "Aucun filtre";
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Synonymes de recherche</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <button className="rounded-full text-muted-foreground hover:text-foreground transition-colors" title="Comprendre les synonymes">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[420px] p-4 text-sm space-y-3" align="start">
                <h4 className="font-semibold">Synonymes de recherche</h4>
                <p className="text-xs text-muted-foreground">
                  Chaque synonyme étend la requête utilisateur (tsquery OR). Les <strong>filtres</strong> permettent de cibler précisément :
                  chaque ligne combine une sous-catégorie + un service requis (comme les Bundles).
                </p>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add new */}
          <div className="flex gap-2 flex-wrap">
            <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Mot-clé" className="max-w-[150px]" />
            <Input value={newSynonyms} onChange={e => setNewSynonyms(e.target.value)} placeholder="Synonymes (séparés par virgule)" className="flex-1" onKeyDown={e => e.key === "Enter" && addEntry()} />
            <Button size="sm" onClick={addEntry} className="bg-amber-600 hover:bg-amber-700 text-white"><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
          </div>
          {/* Search + Sort + Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Rechercher…" className="max-w-[200px] h-8 text-sm" />
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="text-sm border rounded px-2 py-1 bg-background h-8">
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
              <option value="oldest">Plus ancien</option>
              <option value="newest">Plus récent</option>
            </select>
            <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setFilterSubcategory(""); }} className="text-sm border rounded px-2 py-1 bg-background max-w-[200px] h-8">
              <option value="">Toutes catégories</option>
              {allCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name_fr}</option>)}
            </select>
            {filterCategory && (
              <select value={filterSubcategory} onChange={e => setFilterSubcategory(e.target.value)} className="text-sm border rounded px-2 py-1 bg-background max-w-[200px] h-8">
                <option value="">Toutes sous-catégories</option>
                {allSubcategories.filter(sc => sc.category_id === filterCategory).map(sc => <option key={sc.id} value={sc.name}>{sc.name}</option>)}
              </select>
            )}
            {(filterCategory || filterSubcategory || searchText) && (
              <button onClick={() => { setFilterCategory(""); setFilterSubcategory(""); setSearchText(""); }} className="text-xs text-destructive hover:underline font-medium">
                Effacer les filtres
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{filteredSorted.length} résultat(s) · {entries.filter(e => e.is_active).length} actifs sur {entries.length}</p>
        </CardContent>
      </Card>

      {/* Card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filteredSorted.map(entry => (
          <div
            key={entry.id}
            className={`relative rounded-lg p-3 cursor-pointer transition-all hover:scale-[1.03] hover:shadow-lg flex flex-col justify-between aspect-square ${
              entry.is_active
                ? "bg-amber-500 text-white shadow-md"
                : "bg-amber-200 text-amber-800 opacity-60"
            }`}
            onClick={() => setSelectedEntryId(entry.id)}
          >
            {/* Toggle top-right */}
            <div className="absolute top-2 right-2" onClick={e => e.stopPropagation()}>
              <Switch
                checked={entry.is_active}
                onCheckedChange={v => toggleActive(entry.id, v)}
                className="data-[state=checked]:bg-white/30 data-[state=unchecked]:bg-black/20 scale-75"
              />
            </div>

            {/* Content */}
            <div className="space-y-1 min-w-0">
              <h3 className="font-bold text-sm leading-tight truncate pr-8">{entry.key_word}</h3>
              <p className="text-xs opacity-80">{entry.synonyms.length} synonyme{entry.synonyms.length !== 1 ? "s" : ""}</p>
              {(() => {
                const bdg = badges.find(b => b.id === entry.badge_id);
                return bdg ? (
                  <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-white/90 font-medium mt-0.5" style={{ color: bdg.color_hex || '#000' }}>
                    {bdg.name_fr}
                  </span>
                ) : null;
              })()}
              {entry.engagement_filters.length > 0 && (
                <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-green-200/90 text-green-900 font-medium mt-0.5">
                  {entry.engagement_filters.length} eng.
                </span>
              )}
              {entry.commodity_filters.length > 0 && (
                <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-orange-200/90 text-orange-900 font-medium mt-0.5">
                  {entry.commodity_filters.length} com.
                </span>
              )}
            </div>

            {/* Filter summary + count + link */}
            <div className="mt-auto pt-2 space-y-1">
              {(() => {
                const subcats = [...new Set(entry.filters.map(f => f.subcategory_name).filter(Boolean))];
                const services = [...new Set(entry.filters.map(f => f.required_service).filter(Boolean))];
                const count = getBusinessCount.get(entry.id) || 0;
                const hasBadge = !!entry.badge_id;
                const hasEngagements = entry.engagement_filters.length > 0;
                const hasCommodities = entry.commodity_filters.length > 0;
                const hasAnyFilter = subcats.length > 0 || services.length > 0 || hasBadge || hasEngagements || hasCommodities;
                // Resolve categories from subcategory names
                const categoryNames = [...new Set(subcats.flatMap(sn => {
                  const sc = allSubcategories.find(s => s.name === sn);
                  if (!sc) return [];
                  const cat = allCategories.find(c => c.id === sc.category_id);
                  return cat ? [cat.name_fr] : [];
                }))];
                if (!hasAnyFilter) {
                  return <p className="text-xs opacity-75 italic">Aucun filtre</p>;
                }
                return (
                  <>
                    {categoryNames.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {categoryNames.map(cn => (
                          <span key={cn} className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-black/80 text-white font-medium">{cn}</span>
                        ))}
                      </div>
                    )}
                    {subcats.length > 0 && (
                      <p className="text-xs font-bold leading-snug line-clamp-2">{subcats.join(", ")}</p>
                    )}
                    {services.length > 0 && (
                      <p className="text-xs opacity-80 leading-snug line-clamp-2">{services.join(", ")}</p>
                    )}
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[11px] font-semibold opacity-90">{count} établissement{count !== 1 ? "s" : ""}</span>
                      <a
                        href={`/search?q=${encodeURIComponent(entry.key_word)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-white/80 hover:text-white transition-colors"
                        title="Voir les résultats"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Dirty indicator */}
            {dirtyEntries.has(entry.id) && (
              <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-white animate-pulse" title="Modifications non sauvegardées" />
            )}
          </div>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={open => { if (!open) setSelectedEntryId(null); }}>
        {selectedEntry && (
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Input
                  value={selectedEntry.key_word}
                  onChange={e => {
                    const newKey = e.target.value;
                    setEntries(prev => prev.map(ent => ent.id === selectedEntry.id ? { ...ent, key_word: newKey } : ent));
                    setDirtyEntries(prev => new Set(prev).add(selectedEntry.id));
                  }}
                  className="font-mono text-lg bg-amber-100 text-amber-800 px-2 py-0.5 rounded w-auto max-w-[300px] h-8"
                />
                <Switch checked={selectedEntry.is_active} onCheckedChange={v => toggleActive(selectedEntry.id, v)} />
                <span className="text-xs text-muted-foreground font-normal">{selectedEntry.is_active ? "Actif" : "Inactif"}</span>
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <a
                  href={`/search?q=${encodeURIComponent(selectedEntry.key_word)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-700 hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Tester la recherche
                </a>
              </DialogDescription>
            </DialogHeader>

            {/* Badge */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Badge</h4>
              <Select
                value={selectedEntry.badge_id || "none"}
                onValueChange={val => {
                  const newBadgeId = val === "none" ? null : val;
                  setEntries(prev => prev.map(e => e.id === selectedEntry.id ? { ...e, badge_id: newBadgeId } : e));
                  setDirtyEntries(prev => new Set(prev).add(selectedEntry.id));
                }}
              >
                <SelectTrigger className="w-48 h-9">
                  <SelectValue placeholder="Aucun badge" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun badge</SelectItem>
                  {badges.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: b.color_hex || '#ccc' }} />
                        {b.name_fr}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(() => {
                const bdg = badges.find(b => b.id === selectedEntry.badge_id);
                return bdg ? (
                  <span className="inline-flex items-center text-xs px-2 py-0.5 rounded" style={{ backgroundColor: bdg.color_hex || '#ccc', color: bdg.text_color_hex || '#fff' }}>
                    {bdg.name_fr}
                  </span>
                ) : null;
              })()}
            </div>

            {/* Engagements */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Engagements</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedEntry.engagement_filters.sort((a, b) => a.localeCompare(b, "fr")).map(eng => (
                  <Badge key={eng} variant="outline" className="gap-1 group bg-green-50 border-green-300">
                    {eng}
                    <button
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        const updated = selectedEntry.engagement_filters.filter(e => e !== eng);
                        setEntries(prev => prev.map(e => e.id === selectedEntry.id ? { ...e, engagement_filters: updated } : e));
                        setDirtyEntries(prev => new Set(prev).add(selectedEntry.id));
                      }}
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </button>
                  </Badge>
                ))}
              </div>
              {(() => {
                if (globalEngagements.length === 0) {
                  return <p className="text-xs text-muted-foreground">Aucun engagement disponible dans le référentiel.</p>;
                }
                const available = globalEngagements.filter(e => !selectedEntry.engagement_filters.includes(e));
                if (available.length === 0) return <p className="text-xs text-muted-foreground">Tous les engagements sont déjà ajoutés.</p>;
                return (
                  <Select onValueChange={val => {
                    setEntries(prev => prev.map(en => en.id === selectedEntry.id ? { ...en, engagement_filters: [...en.engagement_filters, val] } : en));
                    setDirtyEntries(prev => new Set(prev).add(selectedEntry.id));
                  }}>
                    <SelectTrigger className="max-w-xs h-8 text-sm"><SelectValue placeholder="Ajouter un engagement…" /></SelectTrigger>
                    <SelectContent>
                      {available.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                );
              })()}
            </div>

            {/* Commodités */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Commodités</h4>
              <p className="text-xs text-muted-foreground">Préfixe « Logistique: » ajouté automatiquement lors du filtrage.</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedEntry.commodity_filters.sort((a, b) => a.localeCompare(b, "fr")).map(com => (
                  <Badge key={com} variant="outline" className="gap-1 group bg-orange-50 border-orange-300">
                    {com}
                    <button
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        const updated = selectedEntry.commodity_filters.filter(c => c !== com);
                        setEntries(prev => prev.map(e => e.id === selectedEntry.id ? { ...e, commodity_filters: updated } : e));
                        setDirtyEntries(prev => new Set(prev).add(selectedEntry.id));
                      }}
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </button>
                  </Badge>
                ))}
              </div>
              {(() => {
                const available = globalCommodites.filter(c => !selectedEntry.commodity_filters.includes(c));
                if (available.length === 0) return <p className="text-xs text-muted-foreground">Toutes les commodités sont déjà ajoutées.</p>;
                return (
                  <Select onValueChange={val => {
                    setEntries(prev => prev.map(en => en.id === selectedEntry.id ? { ...en, commodity_filters: [...en.commodity_filters, val] } : en));
                    setDirtyEntries(prev => new Set(prev).add(selectedEntry.id));
                  }}>
                    <SelectTrigger className="max-w-xs h-8 text-sm"><SelectValue placeholder="Ajouter une commodité…" /></SelectTrigger>
                    <SelectContent>
                      {available.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                );
              })()}
            </div>

            {/* Synonymes */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Synonymes</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedEntry.synonyms.map(syn => (
                  <Badge key={syn} variant="outline" className="gap-1 group">
                    {syn}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3 text-destructive" /></button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ?</AlertDialogTitle>
                          <AlertDialogDescription>Retirer le synonyme « {syn} » ?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Non</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeSynonymFromEntry(selectedEntry.id, syn)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Oui</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={editingSynonym[selectedEntry.id] || ""}
                  onChange={e => setEditingSynonym(prev => ({ ...prev, [selectedEntry.id]: e.target.value }))}
                  placeholder="Ajouter un synonyme..."
                  className="max-w-xs text-sm"
                  onKeyDown={e => e.key === "Enter" && addSynonymToEntry(selectedEntry.id)}
                />
                <Button size="sm" variant="outline" onClick={() => addSynonymToEntry(selectedEntry.id)} className="border-amber-600 text-amber-700 hover:bg-amber-50">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Traductions EN / AR */}
            <div className="space-y-3 border-t pt-3">
              <h4 className="text-sm font-semibold">Traductions (utilisées pour les recherches EN / AR)</h4>
              <p className="text-xs text-muted-foreground">
                Peut être rempli manuellement ou via <a href="/staff/translations" className="text-amber-700 hover:underline">/staff/translations</a> (batch « Synonymes de recherche »).
              </p>
              {(["en", "ar"] as const).map((lang) => {
                const keyField = `key_word_${lang}` as const;
                const synField = `synonyms_${lang}` as const;
                const keyVal = (selectedEntry[keyField] as string | null) || "";
                const synVal = ((selectedEntry[synField] as string[]) || []).join(", ");
                return (
                  <div key={lang} className="space-y-1.5" dir={lang === "ar" ? "rtl" : "ltr"}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase text-muted-foreground w-6">{lang}</span>
                      <Input
                        value={keyVal}
                        onChange={(e) => {
                          const v = e.target.value;
                          setEntries((prev) => prev.map((ent) => ent.id === selectedEntry.id ? { ...ent, [keyField]: v || null } : ent));
                          setDirtyEntries((prev) => new Set(prev).add(selectedEntry.id));
                        }}
                        placeholder={lang === "en" ? "Keyword (EN)" : "الكلمة الرئيسية"}
                        className="max-w-[240px] h-8 text-sm"
                      />
                    </div>
                    <Input
                      value={synVal}
                      onChange={(e) => {
                        const arr = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                        setEntries((prev) => prev.map((ent) => ent.id === selectedEntry.id ? { ...ent, [synField]: arr } : ent));
                        setDirtyEntries((prev) => new Set(prev).add(selectedEntry.id));
                      }}
                      placeholder={lang === "en" ? "Synonyms (comma-separated)" : "المرادفات (مفصولة بفواصل)"}
                      className="text-sm"
                    />
                  </div>
                );
              })}
            </div>



            {/* Filtres */}
            <div className="space-y-2 border-t pt-3">
              <h4 className="text-sm font-semibold">Filtres (sous-catégorie + service requis)</h4>
              {selectedEntry.filters.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Sous-catégorie</TableHead>
                      <TableHead className="text-xs">Service requis</TableHead>
                      <TableHead className="w-16 text-xs"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEntry.filters.map((filter, idx) => (
                      <TableRow key={idx} onDoubleClick={() => {
                        setEditingFilterRow({ entryId: selectedEntry.id, index: idx });
                        setEditFilterValues({ subcategory_name: filter.subcategory_name || "", required_service: filter.required_service || "" });
                      }}>
                        <TableCell className="font-medium text-sm">
                          {editingFilterRow?.entryId === selectedEntry.id && editingFilterRow?.index === idx ? (
                            <Input value={editFilterValues.subcategory_name} onChange={e => setEditFilterValues(prev => ({ ...prev, subcategory_name: e.target.value }))} placeholder="* (wildcard)" className="h-8" autoFocus />
                          ) : (
                            filter.subcategory_name || <span className="text-muted-foreground italic">* (wildcard)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {editingFilterRow?.entryId === selectedEntry.id && editingFilterRow?.index === idx ? (
                            <Input value={editFilterValues.required_service} onChange={e => setEditFilterValues(prev => ({ ...prev, required_service: e.target.value }))} placeholder="Aucun" className="h-8"
                              onKeyDown={e => { if (e.key === "Enter") updateFilterRow(selectedEntry.id, idx, editFilterValues); if (e.key === "Escape") setEditingFilterRow(null); }} />
                          ) : (
                            filter.required_service || <span className="text-muted-foreground italic">— (aucun)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {editingFilterRow?.entryId === selectedEntry.id && editingFilterRow?.index === idx ? (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateFilterRow(selectedEntry.id, idx, editFilterValues)}><Check className="h-3.5 w-3.5 text-primary" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingFilterRow(null)}><X className="h-3.5 w-3.5" /></Button>
                              </>
                            ) : (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer ce filtre ?</AlertDialogTitle>
                                    <AlertDialogDescription>{filter.subcategory_name || "*"} + {filter.required_service || "aucun service"}</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Non</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => removeFilterRow(selectedEntry.id, idx)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Oui</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-xs text-muted-foreground italic">Aucun filtre — le synonyme agit uniquement sur le tsquery.</p>
              )}

              {/* Add filter row */}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Sous-catégorie</label>
                  <Input
                    placeholder="vide = wildcard"
                    value={newFilterForm[selectedEntry.id]?.subcategory_name || ""}
                    onChange={e => setNewFilterForm(prev => ({ ...prev, [selectedEntry.id]: { ...prev[selectedEntry.id] || { subcategory_name: "", required_service: "" }, subcategory_name: e.target.value } }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Service requis</label>
                  <Input
                    placeholder="vide = aucun"
                    value={newFilterForm[selectedEntry.id]?.required_service || ""}
                    onChange={e => setNewFilterForm(prev => ({ ...prev, [selectedEntry.id]: { ...prev[selectedEntry.id] || { subcategory_name: "", required_service: "" }, required_service: e.target.value } }))}
                    className="h-8 text-sm"
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const form = newFilterForm[selectedEntry.id];
                        if (form) {
                          addFilterRow(selectedEntry.id, form.subcategory_name, form.required_service);
                          setNewFilterForm(prev => ({ ...prev, [selectedEntry.id]: { subcategory_name: "", required_service: "" } }));
                        }
                      }
                    }}
                  />
                </div>
                <Button
                  size="sm" variant="outline"
                  className="border-amber-600 text-amber-700 hover:bg-amber-50 shrink-0"
                  onClick={() => {
                    const form = newFilterForm[selectedEntry.id] || { subcategory_name: "", required_service: "" };
                    addFilterRow(selectedEntry.id, form.subcategory_name, form.required_service);
                    setNewFilterForm(prev => ({ ...prev, [selectedEntry.id]: { subcategory_name: "", required_service: "" } }));
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Ajouter
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">⚠️ Sensible à la casse — les noms doivent correspondre exactement.</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t pt-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer « {selectedEntry.key_word} » ?</AlertDialogTitle>
                    <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Non</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteEntry(selectedEntry.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Oui</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                size="sm"
                onClick={() => saveEntryChanges(selectedEntry.id)}
                disabled={!dirtyEntries.has(selectedEntry.id) || savingEntries.has(selectedEntry.id)}
                className={dirtyEntries.has(selectedEntry.id) ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
                variant={dirtyEntries.has(selectedEntry.id) ? "default" : "outline"}
              >
                {savingEntries.has(selectedEntry.id) ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Sauvegarder
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default SynonymsManagement;
