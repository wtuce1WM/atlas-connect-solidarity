import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Loader2, Save, HelpCircle, Pencil, X, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
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

interface SynonymEntry {
  id: string;
  key_word: string;
  synonyms: string[];
  subcategory_names: string[];
  service_names: string[];
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
  const [editingSubcat, setEditingSubcat] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<Record<string, string>>({});
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "oldest" | "newest">("newest");
  const [editingService, setEditingService] = useState<Record<string, string>>({});
  const [serviceFilterRows, setServiceFilterRows] = useState<Record<string, { catId: string; subcatId: string }[]>>({});
  const [editingSubcatName, setEditingSubcatName] = useState<{ entryId: string; oldName: string; newName: string } | null>(null);
  const [editingServiceName, setEditingServiceName] = useState<{ entryId: string; oldName: string; newName: string } | null>(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSubcategory, setFilterSubcategory] = useState("");
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});
  const [serviceSearchFilter, setServiceSearchFilter] = useState<Record<string, string>>({});

  const getServiceFilterRows = (entryId: string) => serviceFilterRows[entryId] || [{ catId: "", subcatId: "" }];

  const updateServiceFilterRow = (entryId: string, rowIndex: number, field: "catId" | "subcatId", value: string) => {
    setServiceFilterRows(prev => {
      const rows = [...(prev[entryId] || [{ catId: "", subcatId: "" }])];
      rows[rowIndex] = { ...rows[rowIndex], [field]: value };
      if (field === "catId") rows[rowIndex].subcatId = "";
      return { ...prev, [entryId]: rows };
    });
  };

  const addServiceFilterRow = (entryId: string) => {
    setServiceFilterRows(prev => {
      const rows = [...(prev[entryId] || [{ catId: "", subcatId: "" }])];
      rows.push({ catId: "", subcatId: "" });
      return { ...prev, [entryId]: rows };
    });
  };

  const removeServiceFilterRow = (entryId: string, rowIndex: number) => {
    setServiceFilterRows(prev => {
      const rows = [...(prev[entryId] || [{ catId: "", subcatId: "" }])];
      rows.splice(rowIndex, 1);
      if (rows.length === 0) rows.push({ catId: "", subcatId: "" });
      return { ...prev, [entryId]: rows };
    });
  };

  const load = async () => {
    setIsLoading(true);
    const [{ data }, { data: subcats }, { data: cats }, svcData] = await Promise.all([
      supabase.from("search_synonyms").select("*").order("key_word"),
      supabase.from("subcategories").select("id, name_fr, category_id").order("name_fr"),
      supabase.from("categories").select("id, name_fr").order("name_fr"),
      fetchAllRows<{ name_fr: string; subcategory_id: string }>("services", "name_fr, subcategory_id", "name_fr"),
    ]);
    if (data) setEntries(data.map((d: any) => ({ ...d, subcategory_names: d.subcategory_names || [], service_names: d.service_names || [] })) as SynonymEntry[]);
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

  const addSubcategoryToEntry = async (id: string) => {
    const name = (editingSubcat[id] || "").trim();
    if (!name) return;
    const entry = entries.find(e => e.id === id);
    if (!entry || entry.subcategory_names.includes(name)) return;
    const updated = [...entry.subcategory_names, name];
    await supabase.from("search_synonyms").update({ subcategory_names: updated }).eq("id", id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, subcategory_names: updated } : e));
    setEditingSubcat(prev => ({ ...prev, [id]: "" }));
  };

  const removeSubcategoryFromEntry = async (id: string, name: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const updated = entry.subcategory_names.filter(s => s !== name);
    await supabase.from("search_synonyms").update({ subcategory_names: updated }).eq("id", id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, subcategory_names: updated } : e));
  };

  const addServiceToEntry = async (id: string, serviceName?: string) => {
    const name = (serviceName || editingService[id] || "").trim();
    if (!name) return;
    const entry = entries.find(e => e.id === id);
    if (!entry || entry.service_names.includes(name)) return;
    const updated = [...entry.service_names, name];
    await supabase.from("search_synonyms").update({ service_names: updated } as any).eq("id", id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, service_names: updated } : e));
    if (!serviceName) setEditingService(prev => ({ ...prev, [id]: "" }));
  };

  const removeServiceFromEntry = async (id: string, name: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const updated = entry.service_names.filter(s => s !== name);
    await supabase.from("search_synonyms").update({ service_names: updated } as any).eq("id", id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, service_names: updated } : e));
  };

  const renameSubcategoryInEntry = async (id: string, oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) { setEditingSubcatName(null); return; }
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const updated = entry.subcategory_names.map(s => s === oldName ? trimmed : s);
    const { error } = await supabase.from("search_synonyms").update({ subcategory_names: updated }).eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setEntries(prev => prev.map(e => e.id === id ? { ...e, subcategory_names: updated } : e));
    setEditingSubcatName(null);
    toast({ title: "Sous-catégorie renommée" });
  };

  const renameServiceInEntry = async (id: string, oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) { setEditingServiceName(null); return; }
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const updated = entry.service_names.map(s => s === oldName ? trimmed : s);
    const { error } = await supabase.from("search_synonyms").update({ service_names: updated } as any).eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setEntries(prev => prev.map(e => e.id === id ? { ...e, service_names: updated } : e));
    setEditingServiceName(null);
    toast({ title: "Service renommé" });
  };

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
                <h4 className="font-semibold">Synonymes vs Mots-clés : quelle différence ?</h4>

                <div className="space-y-2">
                  <div>
                    <span className="font-medium">🔍 Synonymes de recherche</span>
                    <span className="text-muted-foreground"> (cette page)</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Agissent côté <strong>requête</strong> (tsquery). Quand l'utilisateur tape un mot, ses synonymes sont ajoutés automatiquement à la recherche via OR.
                      <br />Ex : <code className="bg-muted px-1 rounded">riad</code> → cherche aussi <code className="bg-muted px-1 rounded">maison d'hôtes</code>, <code className="bg-muted px-1 rounded">guesthouse</code>.
                    </p>
                  </div>

                  <div>
                    <span className="font-medium">📦 Mots-clés de sous-catégories</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Indexés dans le <code className="bg-muted px-1 rounded">search_vector</code> de chaque établissement (Poids A — fort). Permettent à une sous-catégorie d'être trouvée par des termes alternatifs.
                      <br />Ex : sous-catégorie « Riad » avec keywords <code className="bg-muted px-1 rounded">dar, maison d'hôtes</code>.
                    </p>
                  </div>

                  <div>
                    <span className="font-medium">🏷️ Mots-clés de services</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Indexés dans le <code className="bg-muted px-1 rounded">search_vector</code> (Poids B — moyen). Permettent à un service d'être trouvé par des variantes.
                      <br />Ex : service « Piscine » avec keywords <code className="bg-muted px-1 rounded">pool, bassin, baignade</code>.
                    </p>
                  </div>
                </div>

                <div className="border-t pt-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left pb-1 pr-3 font-medium text-muted-foreground"></th>
                        <th className="text-left pb-1 pr-3 font-medium text-muted-foreground">Où ça agit</th>
                        <th className="text-left pb-1 pr-3 font-medium text-muted-foreground">Côté</th>
                        <th className="text-left pb-1 font-medium text-muted-foreground">Poids</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td className="py-1.5 pr-3 font-medium">Synonymes</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">Requête (tsquery)</td>
                        <td className="py-1.5 pr-3">🔍 Recherche</td>
                        <td className="py-1.5 text-muted-foreground">—</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-1.5 pr-3 font-medium">Keywords sous-cat</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">Index (search_vector)</td>
                        <td className="py-1.5 pr-3">📦 Données</td>
                        <td className="py-1.5 text-muted-foreground">A (fort)</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-3 font-medium">Keywords services</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">Index (search_vector)</td>
                        <td className="py-1.5 pr-3">📦 Données</td>
                        <td className="py-1.5 text-muted-foreground">B (moyen)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-muted-foreground italic">
                  Les synonymes élargissent <em>ce qu'on cherche</em>, les mots-clés élargissent <em>ce qu'on trouve</em>.
                </p>

                <div className="border-t pt-2 space-y-1">
                  <h5 className="font-semibold text-xs">⚡ Impact sur les performances</h5>
                  <p className="text-xs text-muted-foreground">
                    <strong>Synonymes</strong> : chargés par l'Edge Function à chaque recherche (cache TTL 5 min). Impact minime.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Mots-clés</strong> : pré-indexés dans le <code className="bg-muted px-1 rounded">search_vector</code> via un trigger PostgreSQL. Coût payé une seule fois à l'écriture, <strong>zéro impact à la lecture</strong>.
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    → Les mots-clés sont la solution la plus performante car tout est pré-calculé dans l'index.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-sm text-muted-foreground">
            Chaque mot-clé est étendu avec ses synonymes dans les requêtes tsquery.
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
          if (filterSubcategory) return entry.subcategory_names.includes(filterSubcategory);
          // Filter by category: show entries that have at least one subcategory belonging to this category
          const subcatNamesInCat = allSubcategories.filter(sc => sc.category_id === filterCategory).map(sc => sc.name);
          return entry.subcategory_names.some(sn => subcatNamesInCat.includes(sn));
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Voulez-vous vraiment supprimer le groupe de synonymes « {entry.key_word} » ?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Non</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteEntry(entry.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Oui</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
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
                        <AlertDialogDescription>
                          Retirer le synonyme « {syn} » de « {entry.key_word} » ?
                        </AlertDialogDescription>
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
            {/* Sous-catégories associées */}
            <div className="border-t pt-2 mt-2">
              <span className="text-xs font-medium text-muted-foreground">Sous-catégories associées :</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {entry.subcategory_names.map(sc => (
                  editingSubcatName?.entryId === entry.id && editingSubcatName?.oldName === sc ? (
                    <div key={sc} className="flex items-center gap-1">
                      <Input
                        value={editingSubcatName.newName}
                        onChange={e => setEditingSubcatName(prev => prev ? { ...prev, newName: e.target.value } : null)}
                        className="h-7 w-40 text-sm"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === "Enter") renameSubcategoryInEntry(entry.id, sc, editingSubcatName.newName);
                          if (e.key === "Escape") setEditingSubcatName(null);
                        }}
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => renameSubcategoryInEntry(entry.id, sc, editingSubcatName.newName)}>
                        <Check className="h-3 w-3 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingSubcatName(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Badge key={sc} variant="secondary" className="gap-1 group">
                      {sc}
                      <button className="opacity-0 group-hover:opacity-100" onClick={() => setEditingSubcatName({ entryId: entry.id, oldName: sc, newName: sc })} title="Modifier">
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100" title="Supprimer">
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Retirer la sous-catégorie « {sc} » de « {entry.key_word} » ?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Non</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeSubcategoryFromEntry(entry.id, sc)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Oui</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </Badge>
                  )
                ))}
                {entry.subcategory_names.length === 0 && <span className="text-xs text-muted-foreground italic">Aucune</span>}
              </div>
              <div className="flex gap-2 mt-1 flex-wrap">
                <select
                  value={selectedCategory[entry.id] || ""}
                  onChange={e => {
                    setSelectedCategory(prev => ({ ...prev, [entry.id]: e.target.value }));
                    setEditingSubcat(prev => ({ ...prev, [entry.id]: "" }));
                  }}
                  className="max-w-[200px] text-sm border rounded px-2 py-1 bg-background"
                >
                  <option value="">Catégorie...</option>
                  {allCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name_fr}</option>)}
                </select>
                <select
                  value={editingSubcat[entry.id] || ""}
                  onChange={e => setEditingSubcat(prev => ({ ...prev, [entry.id]: e.target.value }))}
                  className="max-w-xs text-sm border rounded px-2 py-1 bg-background"
                  disabled={!selectedCategory[entry.id]}
                >
                  <option value="">Sous-catégorie...</option>
                  {allSubcategories
                    .filter(sc => sc.category_id === selectedCategory[entry.id] && !entry.subcategory_names.includes(sc.name))
                    .map(sc => <option key={sc.name} value={sc.name}>{sc.name}</option>)
                  }
                </select>
                <Button size="sm" variant="outline" onClick={() => addSubcategoryToEntry(entry.id)} className="border-amber-600 text-amber-700 hover:bg-amber-50">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {/* Services associés */}
            <div className="border-t pt-2 mt-2">
              <span className="text-xs font-medium text-muted-foreground">Services associés :</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(expandedServices[entry.id] ? entry.service_names : entry.service_names.slice(0, 6)).map(svc => (
                  editingServiceName?.entryId === entry.id && editingServiceName?.oldName === svc ? (
                    <div key={svc} className="flex items-center gap-1">
                      <Input
                        value={editingServiceName.newName}
                        onChange={e => setEditingServiceName(prev => prev ? { ...prev, newName: e.target.value } : null)}
                        className="h-7 w-40 text-sm"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === "Enter") renameServiceInEntry(entry.id, svc, editingServiceName.newName);
                          if (e.key === "Escape") setEditingServiceName(null);
                        }}
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => renameServiceInEntry(entry.id, svc, editingServiceName.newName)}>
                        <Check className="h-3 w-3 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingServiceName(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Badge key={svc} variant="secondary" className="gap-1 group bg-blue-50 text-blue-800 border-blue-200">
                      {svc}
                      <button className="opacity-0 group-hover:opacity-100" onClick={() => setEditingServiceName({ entryId: entry.id, oldName: svc, newName: svc })} title="Modifier">
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100" title="Supprimer">
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Retirer le service « {svc} » de « {entry.key_word} » ?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Non</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeServiceFromEntry(entry.id, svc)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Oui</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </Badge>
                  )
                ))}
                {entry.service_names.length === 0 && <span className="text-xs text-muted-foreground italic">Aucun</span>}
                {entry.service_names.length > 6 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground px-2"
                    onClick={() => setExpandedServices(prev => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                  >
                    {expandedServices[entry.id] ? (
                      <><ChevronUp className="h-3 w-3 mr-1" />Voir moins</>
                    ) : (
                      <><ChevronDown className="h-3 w-3 mr-1" />+{entry.service_names.length - 6} autres</>
                    )}
                  </Button>
                )}
              </div>
              {getServiceFilterRows(entry.id).map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-2 mt-1 flex-wrap items-center">
                  <select
                    value={row.catId}
                    onChange={e => updateServiceFilterRow(entry.id, rowIndex, "catId", e.target.value)}
                    className="max-w-[200px] text-sm border rounded px-2 py-1 bg-background"
                  >
                    <option value="">Catégorie...</option>
                    {allCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name_fr}</option>)}
                  </select>
                  <select
                    value={row.subcatId}
                    onChange={e => updateServiceFilterRow(entry.id, rowIndex, "subcatId", e.target.value)}
                    className="max-w-[200px] text-sm border rounded px-2 py-1 bg-background"
                    disabled={!row.catId}
                  >
                    <option value="">Sous-catégorie...</option>
                    <option value="*">* Toutes</option>
                    {allSubcategories
                      .filter(sc => sc.category_id === row.catId)
                      .map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                  </select>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="max-w-xs text-sm justify-start font-normal" disabled={!row.subcatId}>
                        <Plus className="h-3 w-3 mr-1" /> Ajouter des services
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-2" align="start">
                      <Input
                        placeholder="Filtrer les services..."
                        value={serviceSearchFilter[`${entry.id}-${rowIndex}`] || ""}
                        onChange={e => setServiceSearchFilter(prev => ({ ...prev, [`${entry.id}-${rowIndex}`]: e.target.value }))}
                        className="h-8 text-sm mb-2"
                        autoFocus
                      />
                      <div className="max-h-48 overflow-y-auto space-y-0.5">
                        {allServices
                          .filter(svc => {
                            if (row.subcatId === "*") {
                              const subcatIds = allSubcategories.filter(sc => sc.category_id === row.catId).map(sc => sc.id);
                              return subcatIds.includes(svc.subcategory_id);
                            }
                            return svc.subcategory_id === row.subcatId;
                          })
                          .filter(svc => !entry.service_names.includes(svc.name))
                          .filter(svc => !serviceSearchFilter[`${entry.id}-${rowIndex}`] || svc.name.toLowerCase().includes((serviceSearchFilter[`${entry.id}-${rowIndex}`] || "").toLowerCase()))
                          .map(svc => (
                            <button
                              key={svc.name}
                              className="w-full text-left px-2 py-1 text-sm rounded hover:bg-accent hover:text-accent-foreground truncate"
                              onClick={() => addServiceToEntry(entry.id, svc.name)}
                            >
                              <Plus className="h-3 w-3 inline mr-1 text-muted-foreground" />
                              {svc.name}
                            </button>
                          ))
                        }
                      </div>
                    </PopoverContent>
                  </Popover>
                  {getServiceFilterRows(entry.id).length > 1 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeServiceFilterRow(entry.id, rowIndex)} title="Supprimer cette ligne">
                      <X className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => addServiceFilterRow(entry.id)}
              >
                <Plus className="h-3 w-3 mr-1" /> Autre sous-catégorie
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground">{entries.filter(e => e.is_active).length} groupes actifs sur {entries.length}</p>
    </div>
  );
};

export default SynonymsManagement;
