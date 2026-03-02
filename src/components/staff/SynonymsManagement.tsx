import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Save, HelpCircle } from "lucide-react";
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

interface SynonymEntry {
  id: string;
  key_word: string;
  synonyms: string[];
  subcategory_names: string[];
  service_names: string[];
  is_active: boolean;
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
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [editingService, setEditingService] = useState<Record<string, string>>({});
  const [serviceSubcatFilter, setServiceSubcatFilter] = useState<Record<string, string>>({});

  const load = async () => {
    setIsLoading(true);
    const [{ data }, { data: subcats }, { data: cats }, { data: svcData }] = await Promise.all([
      supabase.from("search_synonyms").select("*").order("key_word"),
      supabase.from("subcategories").select("id, name_fr, category_id").order("name_fr"),
      supabase.from("categories").select("id, name_fr").order("name_fr"),
      supabase.from("services").select("name_fr, subcategory_id").order("name_fr"),
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

  const addServiceToEntry = async (id: string) => {
    const name = (editingService[id] || "").trim();
    if (!name) return;
    const entry = entries.find(e => e.id === id);
    if (!entry || entry.service_names.includes(name)) return;
    const updated = [...entry.service_names, name];
    await supabase.from("search_synonyms").update({ service_names: updated } as any).eq("id", id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, service_names: updated } : e));
    setEditingService(prev => ({ ...prev, [id]: "" }));
  };

  const removeServiceFromEntry = async (id: string, name: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const updated = entry.service_names.filter(s => s !== name);
    await supabase.from("search_synonyms").update({ service_names: updated } as any).eq("id", id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, service_names: updated } : e));
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
              onChange={e => setSortOrder(e.target.value as "asc" | "desc")}
              className="text-sm border rounded px-2 py-1 bg-background"
            >
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {[...entries].sort((a, b) => sortOrder === "asc" ? a.key_word.localeCompare(b.key_word) : b.key_word.localeCompare(a.key_word)).map(entry => (
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
                  <Badge key={sc} variant="secondary" className="gap-1 group">
                    {sc}
                    <button className="opacity-0 group-hover:opacity-100" onClick={() => removeSubcategoryFromEntry(entry.id, sc)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </Badge>
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
                {entry.service_names.map(svc => (
                  <Badge key={svc} variant="secondary" className="gap-1 group bg-blue-50 text-blue-800 border-blue-200">
                    {svc}
                    <button className="opacity-0 group-hover:opacity-100" onClick={() => removeServiceFromEntry(entry.id, svc)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </Badge>
                ))}
                {entry.service_names.length === 0 && <span className="text-xs text-muted-foreground italic">Aucun</span>}
              </div>
              <div className="flex gap-2 mt-1 flex-wrap">
                <select
                  value={serviceSubcatFilter[entry.id] || ""}
                  onChange={e => {
                    setServiceSubcatFilter(prev => ({ ...prev, [entry.id]: e.target.value }));
                    setEditingService(prev => ({ ...prev, [entry.id]: "" }));
                  }}
                  className="max-w-[200px] text-sm border rounded px-2 py-1 bg-background"
                >
                  <option value="">Sous-catégorie...</option>
                  <option value="*">* Toutes</option>
                  {allSubcategories.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                </select>
                <select
                  value={editingService[entry.id] || ""}
                  onChange={e => setEditingService(prev => ({ ...prev, [entry.id]: e.target.value }))}
                  className="max-w-xs text-sm border rounded px-2 py-1 bg-background"
                  disabled={!serviceSubcatFilter[entry.id]}
                >
                  <option value="">Service...</option>
                  {allServices
                    .filter(svc => {
                      if (serviceSubcatFilter[entry.id] === "*") return true;
                      return svc.subcategory_id === serviceSubcatFilter[entry.id];
                    })
                    .filter(svc => !entry.service_names.includes(svc.name))
                    .map(svc => <option key={svc.name} value={svc.name}>{svc.name}</option>)
                  }
                </select>
                <Button size="sm" variant="outline" onClick={() => addServiceToEntry(entry.id)} className="border-blue-600 text-blue-700 hover:bg-blue-50">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground">{entries.filter(e => e.is_active).length} groupes actifs sur {entries.length}</p>
    </div>
  );
};

export default SynonymsManagement;
