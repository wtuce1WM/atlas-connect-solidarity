import { useState, useEffect, useCallback } from "react";
import { Search, Save, Loader2, Plus, Trash2, X, Settings2, Zap, Hash, Type, Globe, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import IntentManagement from "./IntentManagement";
import ServiceFilterManagement from "./ServiceFilterManagement";
import NoiseWordsManagement from "./NoiseWordsManagement";
import SynonymsManagement from "./SynonymsManagement";
import SubcategoryMergesManagement from "./SubcategoryMergesManagement";

interface Subcategory {
  id: string;
  name_fr: string;
  category_id: string;
}

interface Category {
  id: string;
  name_fr: string;
}

interface SearchConfig {
  id?: string;
  subcategory_id: string;
  search_mode: "strict" | "broad";
  max_results: number | null;
  boost_weight: number;
  synonyms: string[];
}

const SearchConfigManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [configs, setConfigs] = useState<Record<string, SearchConfig>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [newSynonym, setNewSynonym] = useState<Record<string, string>>({});
  const [businessCounts, setBusinessCounts] = useState<Record<string, number>>({});

  // Load data
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [catRes, subRes, configRes, bizRes] = await Promise.all([
        supabase.from("categories").select("id, name_fr").order("name_fr"),
        supabase.from("subcategories").select("id, name_fr, category_id").order("name_fr"),
        supabase.from("subcategory_search_config").select("*"),
        supabase.from("businesses").select("categories, is_active"),
      ]);

      if (catRes.data) setCategories(catRes.data);
      if (subRes.data) setSubcategories(subRes.data);
      // Count active businesses per subcategory name
      if (bizRes.data && subRes.data) {
        const counts: Record<string, number> = {};
        const subNames = new Set(subRes.data.map(s => s.name_fr));
        for (const biz of bizRes.data) {
          if (!biz.is_active || !biz.categories) continue;
          for (const cat of biz.categories) {
            if (subNames.has(cat)) {
              counts[cat] = (counts[cat] || 0) + 1;
            }
          }
        }
        setBusinessCounts(counts);
      }
      if (configRes.data) {
        const map: Record<string, SearchConfig> = {};
        for (const c of configRes.data) {
          map[c.subcategory_id] = {
            id: c.id,
            subcategory_id: c.subcategory_id,
            search_mode: c.search_mode as "strict" | "broad",
            max_results: c.max_results,
            boost_weight: Number(c.boost_weight),
            synonyms: c.synonyms || [],
          };
        }
        setConfigs(map);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  // Filter subcategories
  const filteredSubcategories = subcategories.filter((sub) => {
    const matchesCat = selectedCategory === "all" || sub.category_id === selectedCategory;
    const matchesSearch = !searchQuery || sub.name_fr.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Get or create default config for a subcategory
  const getConfig = (subcategoryId: string): SearchConfig => {
    return configs[subcategoryId] || {
      subcategory_id: subcategoryId,
      search_mode: "broad",
      max_results: null,
      boost_weight: 1.0,
      synonyms: [],
    };
  };

  // Update local config
  const updateConfig = (subcategoryId: string, updates: Partial<SearchConfig>) => {
    setConfigs((prev) => ({
      ...prev,
      [subcategoryId]: { ...getConfig(subcategoryId), ...updates },
    }));
  };

  // Save config
  const saveConfig = useCallback(async (subcategoryId: string) => {
    const config = getConfig(subcategoryId);
    setSavingIds((prev) => new Set(prev).add(subcategoryId));

    try {
      if (config.id) {
        const { error } = await supabase
          .from("subcategory_search_config")
          .update({
            search_mode: config.search_mode,
            max_results: config.max_results,
            boost_weight: config.boost_weight,
            synonyms: config.synonyms,
          })
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("subcategory_search_config")
          .insert({
            subcategory_id: subcategoryId,
            search_mode: config.search_mode,
            max_results: config.max_results,
            boost_weight: config.boost_weight,
            synonyms: config.synonyms,
          })
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setConfigs((prev) => ({
            ...prev,
            [subcategoryId]: { ...config, id: data.id },
          }));
        }
      }
      toast({ title: "Sauvegardé", description: `Configuration de recherche mise à jour.` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(subcategoryId);
        return next;
      });
    }
  }, [configs]);

  // Delete config (reset to defaults)
  const deleteConfig = useCallback(async (subcategoryId: string) => {
    const config = configs[subcategoryId];
    if (!config?.id) return;

    try {
      const { error } = await supabase
        .from("subcategory_search_config")
        .delete()
        .eq("id", config.id);
      if (error) throw error;
      setConfigs((prev) => {
        const next = { ...prev };
        delete next[subcategoryId];
        return next;
      });
      toast({ title: "Réinitialisé", description: "Configuration supprimée, valeurs par défaut restaurées." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  }, [configs]);

  // Add synonym
  const addSynonym = (subcategoryId: string) => {
    const value = (newSynonym[subcategoryId] || "").trim();
    if (!value) return;
    const config = getConfig(subcategoryId);
    if (config.synonyms.includes(value)) return;
    updateConfig(subcategoryId, { synonyms: [...config.synonyms, value] });
    setNewSynonym((prev) => ({ ...prev, [subcategoryId]: "" }));
  };

  // Remove synonym
  const removeSynonym = (subcategoryId: string, synonym: string) => {
    const config = getConfig(subcategoryId);
    updateConfig(subcategoryId, { synonyms: config.synonyms.filter((s) => s !== synonym) });
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name_fr || "—";
  };

  // Count configured vs total
  const configuredCount = Object.keys(configs).length;
  const totalCount = subcategories.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="subcategories" className="space-y-6">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="subcategories">Sous-catégories</TabsTrigger>
        <TabsTrigger value="intents">Intentions</TabsTrigger>
        <TabsTrigger value="service-filters">Filtres de services</TabsTrigger>
        <TabsTrigger value="synonyms">Synonymes</TabsTrigger>
        <TabsTrigger value="noise-words">Mots bruyants</TabsTrigger>
        <TabsTrigger value="merges">Fusions</TabsTrigger>
      </TabsList>

      <TabsContent value="intents">
        <IntentManagement />
      </TabsContent>

      <TabsContent value="subcategories">
    <div className="space-y-6">
      {/* Header stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="outline" className="text-sm px-3 py-1">
          <Settings2 className="h-3.5 w-3.5 mr-1.5" />
          {configuredCount} personnalisée{configuredCount > 1 ? "s" : ""} sur {totalCount}
        </Badge>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Zap className="h-3.5 w-3.5 mr-1.5" />
          Strict = filtre sous-catégorie uniquement
        </Badge>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Search className="h-3.5 w-3.5 mr-1.5" />
          Broad = full-text (par défaut)
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrer par catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name_fr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une sous-catégorie…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Subcategory config cards */}
      <div className="grid gap-4">
        {filteredSubcategories.map((sub) => {
          const config = getConfig(sub.id);
          const hasConfig = !!configs[sub.id];
          const isSaving = savingIds.has(sub.id);
          const isModified = hasConfig || config.search_mode !== "broad" || config.max_results !== null || config.boost_weight !== 1.0 || config.synonyms.length > 0;

          return (
            <Card key={sub.id} className={`transition-colors ${hasConfig ? "border-primary/30 bg-primary/[0.02]" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4 flex-wrap lg:flex-nowrap">
                  {/* Name & category */}
                  <div className="min-w-[200px] flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{sub.name_fr}</h3>
                      {hasConfig && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">
                          Configuré
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {getCategoryName(sub.category_id)}
                      </p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {businessCounts[sub.name_fr] || 0} étab.
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <a
                        href={`/search?q=${encodeURIComponent(sub.name_fr)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                        title="Recherche"
                      >
                        <Search className="h-3 w-3" /> Recherche
                      </a>
                      <a
                        href={`/subcategory/${encodeURIComponent(sub.name_fr)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                        title="Page sous-catégorie"
                      >
                        <Globe className="h-3 w-3" /> Sous-cat.
                      </a>
                    </div>
                  </div>

                  {/* Mode */}
                  <div className="flex flex-col gap-1 min-w-[160px]">
                    <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Mode</label>
                    <Select
                      value={config.search_mode}
                      onValueChange={(v) => updateConfig(sub.id, { search_mode: v as "strict" | "broad" })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="broad">
                          <span className="flex items-center gap-1.5">
                            <Search className="h-3 w-3" /> Broad (full-text)
                          </span>
                        </SelectItem>
                        <SelectItem value="strict">
                          <span className="flex items-center gap-1.5">
                            <Zap className="h-3 w-3" /> Strict (sous-cat.)
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Max results */}
                  <div className="flex flex-col gap-1 min-w-[120px]">
                    <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                      <Hash className="h-3 w-3 inline mr-0.5" />
                      Max résultats
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      placeholder="Illimité"
                      value={config.max_results ?? ""}
                      onChange={(e) =>
                        updateConfig(sub.id, {
                          max_results: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      className="h-8 text-xs"
                    />
                    {config.max_results !== null && (
                      <button
                        onClick={() => updateConfig(sub.id, { max_results: null })}
                        className="text-[10px] text-muted-foreground hover:text-primary transition-colors mt-0.5"
                      >
                        ✕ Illimité
                      </button>
                    )}
                  </div>

                  {/* Boost */}
                  <div className="flex flex-col gap-1 min-w-[160px]">
                    <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                      Boost ×{config.boost_weight.toFixed(1)}
                    </label>
                    <Slider
                      min={0}
                      max={5}
                      step={0.1}
                      value={[config.boost_weight]}
                      onValueChange={([v]) => updateConfig(sub.id, { boost_weight: v })}
                      className="mt-1.5"
                    />
                  </div>

                  {/* Synonyms */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                      <Type className="h-3 w-3" />
                      Synonymes
                    </label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.synonyms.map((syn) => (
                        <Badge
                          key={syn}
                          variant="secondary"
                          className="text-xs gap-1 pr-1"
                        >
                          {syn}
                          <button
                            onClick={() => removeSynonym(sub.id, syn)}
                            className="hover:text-destructive transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      <div className="flex items-center gap-1">
                        <Input
                          placeholder="Ajouter…"
                          value={newSynonym[sub.id] || ""}
                          onChange={(e) =>
                            setNewSynonym((prev) => ({ ...prev, [sub.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addSynonym(sub.id);
                            }
                          }}
                          className="h-6 text-xs w-48 px-2"
                        />
                        <button
                          onClick={() => addSynonym(sub.id)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 mt-3 lg:mt-0">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => saveConfig(sub.id)}
                      disabled={isSaving}
                      className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredSubcategories.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Aucune sous-catégorie trouvée.</p>
      )}

      {/* Documentation */}
      <Card className="bg-muted/40 border-dashed mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Comment la configuration est appliquée au moteur de recherche
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p><strong>1. Chargement des configs</strong> — Au lancement d'une recherche, toutes les configurations sont récupérées depuis <code>subcategory_search_config</code> et indexées par sous-catégorie.</p>
          <p><strong>2. Mode Strict</strong> — Si le mode est <code>strict</code>, le moteur ignore le fallback full-text (tsquery) et filtre uniquement par sous-catégorie directe. Idéal pour les pages catégorie où le comptage doit correspondre exactement.</p>
          <p><strong>3. Max résultats</strong> — La valeur <code>max_results</code> est appliquée comme limite spécifique à la requête de cette sous-catégorie, indépendamment de la limite globale.</p>
          <p><strong>4. Boost (poids)</strong> — Le <code>boost_weight</code> multiplie le <code>priority_score</code> des établissements lors du tri final, tout en maintenant la priorité des établissements « vérifiés ».</p>
          <p><strong>5. Injection de synonymes</strong> — Les synonymes configurés sont ajoutés dynamiquement à la carte de synonymes globale et utilisés pour la détection automatique de sous-catégorie (si un terme de la requête correspond à un synonyme configuré).</p>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800">
            <Hash className="h-4 w-4" />
            Mots-clés vs Synonymes : quelle différence ?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-3">
          <div>
            <p className="font-semibold text-amber-700 mb-1">Mots-clés de sous-catégorie (onglet Catégories)</p>
            <p>Servent à <strong>détecter la sous-catégorie</strong> à partir de la requête utilisateur. Ex : le mot-clé <code>"docteur"</code> sur la sous-catégorie « Médecins généralistes » permet au moteur de comprendre que la requête <em>"je cherche un docteur"</em> cible cette sous-catégorie → il filtre alors tous les établissements classés « Médecins généralistes ».</p>
          </div>
          <div>
            <p className="font-semibold text-amber-700 mb-1">Synonymes de recherche (ci-dessus)</p>
            <p>Servent à <strong>élargir la recherche full-text</strong> (expansion du tsquery). Ex : si <code>"riad"</code> est synonyme de « Maison d'hôtes », le moteur cherchera aussi le terme <em>"riad"</em> dans le contenu textuel des fiches, même si aucun établissement ne contient explicitement ce mot.</p>
          </div>
          <div className="border-t border-amber-200 pt-2">
            <p className="text-amber-700"><strong>En résumé :</strong> un <em>mot-clé</em> dit « ce mot désigne cette sous-catégorie » (filtre structurel), un <em>synonyme</em> dit « cherche aussi ce terme dans le texte » (élargissement textuel). Inutile de mettre un terme dans les deux : le mot-clé suffit s'il déclenche le bon filtre sous-catégorie.</p>
          </div>
        </CardContent>
      </Card>
    </div>
      </TabsContent>
      <TabsContent value="service-filters">
        <ServiceFilterManagement />
      </TabsContent>
      <TabsContent value="synonyms">
        <SynonymsManagement />
      </TabsContent>
      <TabsContent value="noise-words">
        <NoiseWordsManagement />
      </TabsContent>
      <TabsContent value="merges">
        <SubcategoryMergesManagement />
      </TabsContent>
    </Tabs>
  );
};

export default SearchConfigManagement;
