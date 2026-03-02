import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Loader2, Save, HelpCircle, Pencil, X, Check, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  synonyms: string[];
  subcategory_names: string[];
  service_names: string[];
  filters: SynonymFilter[];
  is_active: boolean;
  created_at: string;
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
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "oldest" | "newest">("newest");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSubcategory, setFilterSubcategory] = useState("");
  const [dirtyEntries, setDirtyEntries] = useState<Set<string>>(new Set());
  const [savingEntries, setSavingEntries] = useState<Set<string>>(new Set());
  // Inline editing for filter rows
  const [editingFilterRow, setEditingFilterRow] = useState<{ entryId: string; index: number } | null>(null);
  const [editFilterValues, setEditFilterValues] = useState<{ subcategory_name: string; required_service: string }>({ subcategory_name: "", required_service: "" });

  const load = async () => {
    setIsLoading(true);
    const [{ data }, { data: subcats }, { data: cats }, svcData] = await Promise.all([
      supabase.from("search_synonyms").select("*").order("key_word"),
      supabase.from("subcategories").select("id, name_fr, category_id").order("name_fr"),
      supabase.from("categories").select("id, name_fr").order("name_fr"),
      fetchAllRows<{ name_fr: string; subcategory_id: string }>("services", "name_fr, subcategory_id", "name_fr"),
    ]);
    if (data) setEntries(data.map((d: any) => ({
      ...d,
      subcategory_names: d.subcategory_names || [],
      service_names: d.service_names || [],
      filters: d.filters || [],
    })) as SynonymEntry[]);
    if (subcats) setAllSubcategories(subcats.map((s: any) => ({ id: s.id, name: s.name_fr, category_id: s.category_id })));
    if (cats) setAllCategories(cats as any);
    if (svcData) setAllServices(svcData.map((s: any) => ({ name: s.name_fr, subcategory_id: s.subcategory_id })));
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

  // ── Filter row management (Bundle-like) ──
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
    // Also sync legacy fields for backward compat
    const subcatNames = [...new Set(entry.filters.map(f => f.subcategory_name).filter(Boolean) as string[])];
    const svcNames = [...new Set(entry.filters.map(f => f.required_service).filter(Boolean) as string[])];
    const { error } = await supabase.from("search_synonyms").update({
      filters: entry.filters,
      subcategory_names: subcatNames,
      service_names: svcNames,
    } as any).eq("id", id);
    setSavingEntries(prev => { const n = new Set(prev); n.delete(id); return n; });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setDirtyEntries(prev => { const n = new Set(prev); n.delete(id); return n; });
      toast({ title: "Sauvegardé ✓" });
    }
  };

  // ── New filter row form state ──
  const [newFilterForm, setNewFilterForm] = useState<Record<string, { subcategory_name: string; required_service: string }>>({});

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
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
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Chaque synonyme étend la requête utilisateur (tsquery OR). Les <strong>filtres</strong> permettent de cibler précisément :
                    chaque ligne combine une sous-catégorie + un service requis (comme les Bundles).
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Ex :</strong> « bar à vin » → Ligne 1 : Bar + Cave à vin | Ligne 2 : Œnothèque (sans service)
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-sm text-muted-foreground">
            Chaque mot-clé est étendu avec ses synonymes. Les <strong>filtres</strong> définissent les combinaisons sous-catégorie + service.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Mot-clé" className="max-w-[150px]" />
            <Input value={newSynonyms} onChange={e => setNewSynonyms(e.target.value)} placeholder="Synonymes (séparés par virgule)" className="flex-1" />
            <Button size="sm" onClick={addEntry} className="bg-amber-600 hover:bg-amber-700 text-white"><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Tri :</span>
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as "asc" | "desc" | "oldest" | "newest")}
              className="text-sm border rounded px-2 py-1 bg-background"
            >
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
              <option value="oldest">Plus ancien</option>
              <option value="newest">Plus récent</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filtrer :</span>
            <select
              value={filterCategory}
              onChange={e => { setFilterCategory(e.target.value); setFilterSubcategory(""); }}
              className="text-sm border rounded px-2 py-1 bg-background max-w-[200px]"
            >
              <option value="">Toutes catégories</option>
              {allCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name_fr}</option>)}
            </select>
            <select
              value={filterSubcategory}
              onChange={e => setFilterSubcategory(e.target.value)}
              className="text-sm border rounded px-2 py-1 bg-background max-w-[200px]"
              disabled={!filterCategory}
            >
              <option value="">Toutes sous-catégories</option>
              {allSubcategories.filter(sc => sc.category_id === filterCategory).map(sc => <option key={sc.id} value={sc.name}>{sc.name}</option>)}
            </select>
            {(filterCategory || filterSubcategory) && (
              <button
                onClick={() => { setFilterCategory(""); setFilterSubcategory(""); }}
                className="text-xs text-primary hover:underline"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {[...entries]
        .filter(entry => {
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
        }).map(entry => (
        <Card key={entry.id} className={entry.is_active ? "" : "opacity-50"}>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={entry.is_active} onCheckedChange={v => toggleActive(entry.id, v)} />
                <code className="font-mono text-sm font-bold bg-muted px-2 py-0.5 rounded">{entry.key_word}</code>
                <span className="text-xs text-muted-foreground">→ {entry.synonyms.length} synonyme(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/search?q=${encodeURIComponent(entry.key_word)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Tester"
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
                <Button
                  size="sm"
                  onClick={() => saveEntryChanges(entry.id)}
                  disabled={!dirtyEntries.has(entry.id) || savingEntries.has(entry.id)}
                  className={dirtyEntries.has(entry.id) ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
                  variant={dirtyEntries.has(entry.id) ? "default" : "outline"}
                >
                  {savingEntries.has(entry.id) ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                  Sauvegarder
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer « {entry.key_word} » ?</AlertDialogTitle>
                      <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Non</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteEntry(entry.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Oui</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Synonymes */}
            <div className="flex flex-wrap gap-1.5">
              {entry.synonyms.map(syn => (
                <Badge key={syn} variant="outline" className="gap-1 group">
                  {syn}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ?</AlertDialogTitle>
                        <AlertDialogDescription>Retirer le synonyme « {syn} » ?</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Non</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeSynonymFromEntry(entry.id, syn)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Oui</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={editingSynonym[entry.id] || ""}
                onChange={e => setEditingSynonym(prev => ({ ...prev, [entry.id]: e.target.value }))}
                placeholder="Ajouter un synonyme..."
                className="max-w-xs text-sm"
                onKeyDown={e => e.key === "Enter" && addSynonymToEntry(entry.id)}
              />
              <Button size="sm" variant="outline" onClick={() => addSynonymToEntry(entry.id)} className="border-amber-600 text-amber-700 hover:bg-amber-50">
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* ── Filtres (Bundle-like table) ── */}
            <div className="border-t pt-2 mt-2">
              <span className="text-xs font-medium text-muted-foreground">Filtres (sous-catégorie + service requis) :</span>
              {entry.filters.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Sous-catégorie</TableHead>
                      <TableHead className="text-xs">Service requis</TableHead>
                      <TableHead className="w-16 text-xs"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entry.filters.map((filter, idx) => (
                      <TableRow key={idx} onDoubleClick={() => {
                        setEditingFilterRow({ entryId: entry.id, index: idx });
                        setEditFilterValues({
                          subcategory_name: filter.subcategory_name || "",
                          required_service: filter.required_service || "",
                        });
                      }}>
                        <TableCell className="font-medium text-sm">
                          {editingFilterRow?.entryId === entry.id && editingFilterRow?.index === idx ? (
                            <Input
                              value={editFilterValues.subcategory_name}
                              onChange={e => setEditFilterValues(prev => ({ ...prev, subcategory_name: e.target.value }))}
                              placeholder="* (wildcard)"
                              className="h-8"
                              autoFocus
                            />
                          ) : (
                            filter.subcategory_name || <span className="text-muted-foreground italic">* (wildcard)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {editingFilterRow?.entryId === entry.id && editingFilterRow?.index === idx ? (
                            <Input
                              value={editFilterValues.required_service}
                              onChange={e => setEditFilterValues(prev => ({ ...prev, required_service: e.target.value }))}
                              placeholder="Aucun"
                              className="h-8"
                              onKeyDown={e => {
                                if (e.key === "Enter") updateFilterRow(entry.id, idx, editFilterValues);
                                if (e.key === "Escape") setEditingFilterRow(null);
                              }}
                            />
                          ) : (
                            filter.required_service || <span className="text-muted-foreground italic">— (aucun)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {editingFilterRow?.entryId === entry.id && editingFilterRow?.index === idx ? (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateFilterRow(entry.id, idx, editFilterValues)}>
                                  <Check className="h-3.5 w-3.5 text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingFilterRow(null)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer ce filtre ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {filter.subcategory_name || "*"} + {filter.required_service || "aucun service"}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Non</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => removeFilterRow(entry.id, idx)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Oui</AlertDialogAction>
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
                <p className="text-xs text-muted-foreground italic mt-1">Aucun filtre — le synonyme agit uniquement sur le tsquery.</p>
              )}

              {/* Add new filter row */}
              <div className="flex gap-2 mt-2 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Sous-catégorie</label>
                  <Input
                    placeholder="vide = wildcard"
                    value={newFilterForm[entry.id]?.subcategory_name || ""}
                    onChange={e => setNewFilterForm(prev => ({
                      ...prev,
                      [entry.id]: { ...prev[entry.id] || { subcategory_name: "", required_service: "" }, subcategory_name: e.target.value }
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Service requis</label>
                  <Input
                    placeholder="vide = aucun"
                    value={newFilterForm[entry.id]?.required_service || ""}
                    onChange={e => setNewFilterForm(prev => ({
                      ...prev,
                      [entry.id]: { ...prev[entry.id] || { subcategory_name: "", required_service: "" }, required_service: e.target.value }
                    }))}
                    className="h-8 text-sm"
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const form = newFilterForm[entry.id];
                        if (form) {
                          addFilterRow(entry.id, form.subcategory_name, form.required_service);
                          setNewFilterForm(prev => ({ ...prev, [entry.id]: { subcategory_name: "", required_service: "" } }));
                        }
                      }
                    }}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-600 text-amber-700 hover:bg-amber-50 shrink-0"
                  onClick={() => {
                    const form = newFilterForm[entry.id] || { subcategory_name: "", required_service: "" };
                    addFilterRow(entry.id, form.subcategory_name, form.required_service);
                    setNewFilterForm(prev => ({ ...prev, [entry.id]: { subcategory_name: "", required_service: "" } }));
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Ajouter
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ Sensible à la casse — les noms doivent correspondre exactement.
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground">{entries.filter(e => e.is_active).length} groupes actifs sur {entries.length}</p>
    </div>
  );
};

export default SynonymsManagement;
