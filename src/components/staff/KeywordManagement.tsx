import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import KeywordsBySubcategorySection from "./KeywordsBySubcategorySection";
import KeywordsByBusinessSection from "./KeywordsByBusinessSection";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, ExternalLink, Eye, ArrowUpAZ, ArrowDownZA, ChevronDown, ChevronRight, X, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Category { id: string; name_fr: string; }
interface Subcategory { id: string; category_id: string; name_fr: string; keywords: string[] | null; }
interface Service { id: string; subcategory_id: string; name_fr: string; name_en: string | null; name_ar: string | null; keywords: string[] | null; }
interface ServiceRow { serviceId: string; serviceName: string; subcategoryId: string; keywords: string[]; }
interface BusinessMini { id: string; name: string; city: string | null; is_active: boolean; }
export interface SearchSynonym { id: string; key_word: string; synonyms: string[]; service_names: string[]; subcategory_names: string[]; }

export function findSynonymConflicts(keyword: string, allSynonyms: SearchSynonym[]): SearchSynonym[] {
  const kwLower = keyword.toLowerCase();
  return allSynonyms.filter(s =>
    s.key_word.toLowerCase() === kwLower ||
    s.synonyms.some(syn => syn.toLowerCase() === kwLower)
  );
}

const KeywordManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [searchSynonyms, setSearchSynonyms] = useState<SearchSynonym[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "count-asc" | "count-desc">("az");
  const [resultsOpen, setResultsOpen] = useState(false);

  const [businessCountByKw, setBusinessCountByKw] = useState<Record<string, number>>({});
  const [popup, setPopup] = useState<{ title: string; businesses: BusinessMini[]; loading: boolean } | null>(null);
  const [popupCityFilter, setPopupCityFilter] = useState<string>("all");

  // Editing state for services
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [bulkKeywords, setBulkKeywords] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [catRes, subRes, svcRes, bizRes, synRes] = await Promise.all([
      supabase.from("categories").select("id, name_fr").order("name_fr"),
      supabase.from("subcategories").select("id, category_id, name_fr, keywords").order("name_fr"),
      fetchAllRows("services", "id, subcategory_id, name_fr, name_en, name_ar, keywords", "name_fr"),
      supabase.from("businesses").select("services, keywords").eq("is_active", true),
      supabase.from("search_synonyms").select("id, key_word, synonyms, service_names, subcategory_names").eq("is_active", true),
    ]);

    if (catRes.data) setCategories(catRes.data);
    if (subRes.data) setSubcategories(subRes.data as Subcategory[]);
    if (svcRes) setServices(svcRes as unknown as Service[]);
    if (synRes.data) setSearchSynonyms(synRes.data as SearchSynonym[]);

    if (bizRes.data && svcRes) {
      const svcNameToId: Record<string, string> = {};
      for (const s of svcRes as unknown as Service[]) {
        svcNameToId[s.name_fr] = s.id;
        if (s.name_en) svcNameToId[s.name_en] = s.id;
        if (s.name_ar) svcNameToId[s.name_ar] = s.id;
      }
      const counts: Record<string, number> = {};
      for (const biz of bizRes.data) {
        const svcs = (biz.services as string[]) || [];
        const counted = new Set<string>();
        for (const s of svcs) {
          const id = svcNameToId[s];
          if (id && !counted.has(id)) {
            counted.add(id);
            counts[id] = (counts[id] || 0) + 1;
          }
        }
      }
      setBusinessCountByKw(counts);
    }
    setLoading(false);
  };

  const filteredSubcategories = useMemo(() => {
    if (categoryFilter === "all") return subcategories;
    return subcategories.filter(s => s.category_id === categoryFilter);
  }, [subcategories, categoryFilter]);

  useEffect(() => { setSubcategoryFilter("all"); }, [categoryFilter]);

  const totalServicesInScope = useMemo(() => {
    let pool = services;
    if (subcategoryFilter !== "all") {
      pool = pool.filter(s => s.subcategory_id === subcategoryFilter);
    } else if (categoryFilter !== "all") {
      const subIds = new Set(filteredSubcategories.map(sc => sc.id));
      pool = pool.filter(s => subIds.has(s.subcategory_id));
    }
    return pool.length;
  }, [services, categoryFilter, subcategoryFilter, filteredSubcategories]);

  const allServiceRows = useMemo(() => {
    const rows: ServiceRow[] = [];
    for (const svc of services) {
      rows.push({
        serviceId: svc.id,
        serviceName: svc.name_fr,
        subcategoryId: svc.subcategory_id,
        keywords: svc.keywords && svc.keywords.length > 0
          ? [...svc.keywords].sort((a, b) => a.localeCompare(b, "fr"))
          : [],
      });
    }
    return rows;
  }, [services]);

  const filteredServiceRows = useMemo(() => {
    let result = allServiceRows;
    if (subcategoryFilter !== "all") {
      result = result.filter(r => r.subcategoryId === subcategoryFilter);
    } else if (categoryFilter !== "all") {
      const subIds = new Set(filteredSubcategories.map(s => s.id));
      result = result.filter(r => subIds.has(r.subcategoryId));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result
        .map(r => {
          const matchingKws = r.keywords.filter(kw => kw.toLowerCase().includes(q));
          return matchingKws.length > 0 ? { ...r, keywords: matchingKws } : null;
        })
        .filter(Boolean) as ServiceRow[];
    }
    result = [...result].sort((a, b) => {
      if (sortOrder === "count-asc" || sortOrder === "count-desc") {
        const diff = (businessCountByKw[a.serviceId] || 0) - (businessCountByKw[b.serviceId] || 0);
        return sortOrder === "count-asc" ? diff : -diff;
      }
      const cmp = a.serviceName.localeCompare(b.serviceName, "fr");
      return sortOrder === "az" ? cmp : -cmp;
    });
    return result;
  }, [allServiceRows, categoryFilter, subcategoryFilter, filteredSubcategories, searchQuery, sortOrder, businessCountByKw]);

  const totalKeywords = useMemo(() => filteredServiceRows.reduce((sum, r) => sum + r.keywords.length, 0), [filteredServiceRows]);

  const getHierarchy = (subcategoryId: string) => {
    const sub = subcategories.find(s => s.id === subcategoryId);
    const cat = sub ? categories.find(c => c.id === sub.category_id) : null;
    return { subName: sub?.name_fr || "—", catName: cat?.name_fr || "—" };
  };

  const openBusinessesPopup = async (serviceName: string) => {
    setPopup({ title: serviceName, businesses: [], loading: true });
    setPopupCityFilter("all");
    const { data } = await supabase
      .from("businesses")
      .select("id, name, city, is_active")
      .filter("services", "cs", `{"${serviceName}"}`)
      .order("name");
    setPopup({ title: serviceName, businesses: data || [], loading: false });
  };

  const popupFilteredBusinesses = useMemo(() => {
    if (!popup) return [];
    if (popupCityFilter === "all") return popup.businesses;
    return popup.businesses.filter(b => b.city === popupCityFilter);
  }, [popup, popupCityFilter]);

  const popupCities = useMemo(() => {
    if (!popup) return [];
    return [...new Set(popup.businesses.map(b => b.city).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "fr"));
  }, [popup]);

  // --- Service keyword editing ---

  const updateServiceKeywords = async (serviceId: string, newKeywords: string[]) => {
    setSaving(true);
    const sorted = [...new Set(newKeywords.map(k => k.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
    const { error } = await supabase
      .from("services")
      .update({ keywords: sorted })
      .eq("id", serviceId);
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
      return false;
    }
    // Update local state
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, keywords: sorted } : s));
    return true;
  };

  const handleServiceDeleteKeyword = async (serviceId: string, keyword: string) => {
    const conflicts = findSynonymConflicts(keyword, searchSynonyms);
    if (conflicts.length > 0) {
      toast.warning(`⚠️ « ${keyword} » est utilisé dans ${conflicts.length} synonyme(s) de recherche : ${conflicts.map(c => c.key_word).join(", ")}`, { duration: 6000 });
    }
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return;
    const success = await updateServiceKeywords(serviceId, (svc.keywords || []).filter(k => k !== keyword));
    if (success) toast.success(`« ${keyword} » supprimé`);
  };

  const handleServiceDeleteAll = (serviceId: string, serviceName: string, count: number) => {
    toast(`Supprimer les ${count} mots-clés de « ${serviceName} » ?`, {
      action: { label: "Oui, tout supprimer", onClick: async () => {
        const success = await updateServiceKeywords(serviceId, []);
        if (success) toast.success("Tous les mots-clés supprimés");
      }},
      cancel: { label: "Annuler", onClick: () => {} },
      duration: 10000,
    });
  };

  const handleServiceAddKeyword = async (serviceId: string) => {
    const kw = newKeyword.trim();
    if (!kw) return;
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return;
    const conflicts = findSynonymConflicts(kw, searchSynonyms);
    const success = await updateServiceKeywords(serviceId, [...(svc.keywords || []), kw]);
    if (success) {
      setNewKeyword("");
      let msg = `« ${kw} » ajouté`;
      if (conflicts.length > 0) msg += ` (⚠️ utilisé dans synonyme: ${conflicts.map(c => c.key_word).join(", ")})`;
      toast.success(msg);
    }
  };

  const handleServiceBulkInject = async (serviceId: string) => {
    const raw = bulkKeywords.trim();
    if (!raw) return;
    const newKws = raw.split(",").map(k => k.trim()).filter(Boolean);
    if (newKws.length === 0) return;
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return;
    const allConflicts = newKws.flatMap(kw => findSynonymConflicts(kw, searchSynonyms));
    const success = await updateServiceKeywords(serviceId, [...(svc.keywords || []), ...newKws]);
    if (success) {
      setBulkKeywords("");
      let msg = `${newKws.length} mot(s)-clé(s) ajouté(s)`;
      if (allConflicts.length > 0) {
        const uniqueKeys = [...new Set(allConflicts.map(c => c.key_word))];
        msg += ` (⚠️ conflits synonymes: ${uniqueKeys.join(", ")})`;
      }
      toast.success(msg);
    }
  };

  const startEditingService = (serviceId: string | null) => {
    setEditingServiceId(serviceId);
    setNewKeyword("");
    setBulkKeywords("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Mots-clés par Services ({totalKeywords})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Toutes les sous-catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les sous-catégories</SelectItem>
                {filteredSubcategories.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name_fr}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un mot-clé…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Button variant="outline" className="w-full justify-between" onClick={() => setResultsOpen(!resultsOpen)}>
            <span>Résultats ({filteredServiceRows.length} services sur {totalServicesInScope} — {totalKeywords} mots-clés)</span>
            {resultsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          {resultsOpen && <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Sous-catégorie</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => setSortOrder(s => s === "az" ? "za" : "az")}>
                      Service {(sortOrder === "az" || sortOrder === "za") ? (sortOrder === "az" ? <ArrowUpAZ className="h-4 w-4" /> : <ArrowDownZA className="h-4 w-4" />) : null}
                    </Button>
                  </TableHead>
                  <TableHead>Mots-clés</TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSortOrder(s => s === "count-desc" ? "count-asc" : "count-desc")}>
                      Étab. {sortOrder === "count-desc" ? "↓" : sortOrder === "count-asc" ? "↑" : ""}
                    </Button>
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServiceRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Aucun mot-clé trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServiceRows.map((row) => {
                    const { catName, subName } = getHierarchy(row.subcategoryId);
                    const count = businessCountByKw[row.serviceId] || 0;
                    const isEditing = editingServiceId === row.serviceId;
                    return (
                      <TableRow key={row.serviceId} className="align-top">
                        <TableCell className="text-muted-foreground text-sm">{catName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{subName}</TableCell>
                        <TableCell className="text-sm font-medium">{row.serviceName}</TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {row.keywords.length === 0 ? (
                                <span className="text-muted-foreground text-xs italic">Aucun</span>
                              ) : (
                                row.keywords.map(kw => {
                                  const conflicts = findSynonymConflicts(kw, searchSynonyms);
                                  return (
                                    <Badge
                                      key={kw}
                                      variant="secondary"
                                      className={`text-xs gap-1 ${isEditing ? "cursor-pointer hover:bg-destructive/20 hover:line-through transition-all" : ""} ${conflicts.length > 0 ? "ring-1 ring-amber-400" : ""}`}
                                      onClick={isEditing ? () => handleServiceDeleteKeyword(row.serviceId, kw) : undefined}
                                      title={isEditing ? `Cliquer pour supprimer « ${kw} »${conflicts.length > 0 ? ` (⚠️ synonyme: ${conflicts.map(c => c.key_word).join(", ")})` : ""}` : conflicts.length > 0 ? `⚠️ Synonyme: ${conflicts.map(c => c.key_word).join(", ")}` : undefined}
                                    >
                                      {conflicts.length > 0 && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                                      {kw}
                                      {isEditing && <X className="h-3 w-3 text-muted-foreground" />}
                                    </Badge>
                                  );
                                })
                              )}
                            </div>
                            {isEditing && (
                              <div className="space-y-2 pt-1 border-t border-border/50">
                                {row.keywords.length > 0 && (
                                  <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => handleServiceDeleteAll(row.serviceId, row.serviceName, row.keywords.length)} disabled={saving}>
                                    <Trash2 className="h-3 w-3 mr-1" /> Tout supprimer ({row.keywords.length})
                                  </Button>
                                )}
                                <div className="flex gap-1.5 items-center">
                                  <Input placeholder="Ajouter un mot-clé…" value={newKeyword} onChange={e => setNewKeyword(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleServiceAddKeyword(row.serviceId); } }} className="h-7 text-xs flex-1" disabled={saving} />
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleServiceAddKeyword(row.serviceId)} disabled={saving || !newKeyword.trim()}>
                                    <Plus className="h-3 w-3 mr-1" /> Ajouter
                                  </Button>
                                </div>
                                <div className="space-y-1">
                                  <Textarea placeholder="Liste séparée par des virgules…" value={bulkKeywords} onChange={e => setBulkKeywords(e.target.value)} className="text-xs min-h-[50px]" disabled={saving} />
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleServiceBulkInject(row.serviceId)} disabled={saving || !bulkKeywords.trim()}>
                                    Injecter la liste
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant={count > 0 ? "outline" : "ghost"} size="sm" className="gap-1.5" disabled={count === 0} onClick={() => openBusinessesPopup(row.serviceName)}>
                            <Eye className="h-3.5 w-3.5" /> {count}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant={isEditing ? "default" : "outline"} className="h-7 px-2 text-xs" onClick={() => startEditingService(isEditing ? null : row.serviceId)}>
                            {isEditing ? "Fermer" : "Éditer"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>}
        </CardContent>
      </Card>

      <KeywordsBySubcategorySection
        categories={categories}
        subcategories={subcategories}
        services={services}
        businessCountByService={businessCountByKw}
        searchSynonyms={searchSynonyms}
        onSubcategoryKeywordsChange={(subId, newKws) => {
          setSubcategories(prev => prev.map(s => s.id === subId ? { ...s, keywords: newKws } : s));
        }}
      />

      <KeywordsByBusinessSection
        categories={categories}
        subcategories={subcategories}
      />

      {/* Businesses popup */}
      <Dialog open={!!popup} onOpenChange={open => { if (!open) setPopup(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Établissements — {popup?.title}</DialogTitle>
          </DialogHeader>
          {popup?.loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {popupCities.length > 1 && (
                <Select value={popupCityFilter} onValueChange={setPopupCityFilter}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Toutes les villes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les villes ({popup?.businesses.length})</SelectItem>
                    {popupCities.map(city => (
                      <SelectItem key={city} value={city}>{city} ({popup?.businesses.filter(b => b.city === city).length})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-sm text-muted-foreground">
                {popupFilteredBusinesses.length} établissement{popupFilteredBusinesses.length !== 1 ? "s" : ""}
              </p>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Ville</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {popupFilteredBusinesses.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{b.city || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={b.is_active ? "default" : "secondary"} className={b.is_active ? "bg-green-200 text-black hover:bg-green-300" : ""}>{b.is_active ? "Actif" : "Inactif"}</Badge>
                        </TableCell>
                        <TableCell className="flex gap-1">
                          <Link to={`/business/${b.id}`} target="_blank">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Voir la fiche"><Eye className="h-3.5 w-3.5" /></Button>
                          </Link>
                          <Link to={`/staff/catalogue?edit=${b.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Éditer"><ExternalLink className="h-3.5 w-3.5" /></Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KeywordManagement;
