import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, ArrowUpAZ, ArrowDownZA, ChevronDown, ChevronRight, ExternalLink, Loader2, X, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { type SearchSynonym, findSynonymConflicts } from "./KeywordManagement";

interface Category { id: string; name_fr: string; }
interface Subcategory { id: string; category_id: string; name_fr: string; keywords: string[] | null; }
interface Service { id: string; subcategory_id: string; name_fr: string; name_en: string | null; name_ar: string | null; keywords: string[] | null; }
interface BusinessMini { id: string; name: string; city: string | null; is_active: boolean; }

interface SubcategoryRow {
  subcategoryId: string;
  subcategoryName: string;
  categoryId: string;
  keywords: string[];
  serviceCount: number;
}

interface Props {
  categories: Category[];
  subcategories: Subcategory[];
  services: Service[];
  businessCountByService: Record<string, number>;
  searchSynonyms: SearchSynonym[];
  onSubcategoryKeywordsChange: (subId: string, newKeywords: string[]) => void;
}

const KeywordsBySubcategorySection = ({ categories, subcategories, services, businessCountByService, searchSynonyms, onSubcategoryKeywordsChange }: Props) => {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "kw-asc" | "kw-desc">("az");
  const [resultsOpen, setResultsOpen] = useState(false);

  const [popup, setPopup] = useState<{ title: string; businesses: BusinessMini[]; loading: boolean } | null>(null);
  const [popupCityFilter, setPopupCityFilter] = useState<string>("all");

  // Editing state
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [bulkKeywords, setBulkKeywords] = useState("");
  const [saving, setSaving] = useState(false);

  // Use subcategory's own keywords
  const allSubcategoryRows = useMemo(() => {
    const rows: SubcategoryRow[] = [];
    for (const sub of subcategories) {
      const subServices = services.filter(s => s.subcategory_id === sub.id);
      rows.push({
        subcategoryId: sub.id,
        subcategoryName: sub.name_fr,
        categoryId: sub.category_id,
        keywords: sub.keywords ? [...sub.keywords].sort((a, b) => a.localeCompare(b, "fr")) : [],
        serviceCount: subServices.length,
      });
    }
    return rows;
  }, [subcategories, services]);

  const totalSubcategoriesInScope = useMemo(() => {
    if (categoryFilter === "all") return subcategories.length;
    return subcategories.filter(s => s.category_id === categoryFilter).length;
  }, [subcategories, categoryFilter]);

  const filteredRows = useMemo(() => {
    let result = allSubcategoryRows;
    if (categoryFilter !== "all") {
      result = result.filter(r => r.categoryId === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result
        .map(r => {
          const matchingKws = r.keywords.filter(kw => kw.toLowerCase().includes(q));
          return matchingKws.length > 0 ? { ...r, keywords: matchingKws } : null;
        })
        .filter(Boolean) as SubcategoryRow[];
    }
    result = [...result].sort((a, b) => {
      if (sortOrder === "kw-asc" || sortOrder === "kw-desc") {
        const diff = a.keywords.length - b.keywords.length;
        return sortOrder === "kw-asc" ? diff : -diff;
      }
      const cmp = a.subcategoryName.localeCompare(b.subcategoryName, "fr");
      return sortOrder === "az" ? cmp : -cmp;
    });
    return result;
  }, [allSubcategoryRows, categoryFilter, searchQuery, sortOrder]);

  const totalKeywords = useMemo(() => filteredRows.reduce((sum, r) => sum + r.keywords.length, 0), [filteredRows]);

  const getCatName = (categoryId: string) => categories.find(c => c.id === categoryId)?.name_fr || "—";

  const getBusinessCount = (subcategoryId: string) => {
    const subServices = services.filter(s => s.subcategory_id === subcategoryId);
    let total = 0;
    for (const svc of subServices) total += businessCountByService[svc.id] || 0;
    return total;
  };

  const openBusinessesPopup = async (subcategoryName: string, subcategoryId: string) => {
    setPopup({ title: subcategoryName, businesses: [], loading: true });
    setPopupCityFilter("all");
    const subServices = services.filter(s => s.subcategory_id === subcategoryId);
    const serviceNames = subServices.map(s => s.name_fr);
    if (serviceNames.length === 0) { setPopup({ title: subcategoryName, businesses: [], loading: false }); return; }
    const { data } = await supabase.from("businesses").select("id, name, city, is_active, services").eq("is_active", true).order("name");
    const matched = (data || []).filter(b => {
      const bizServices = (b.services as string[]) || [];
      return bizServices.some(s => serviceNames.includes(s));
    });
    setPopup({ title: subcategoryName, businesses: matched.map(b => ({ id: b.id, name: b.name, city: b.city, is_active: b.is_active })), loading: false });
  };

  const popupFilteredBusinesses = useMemo(() => {
    if (!popup) return [];
    return popupCityFilter === "all" ? popup.businesses : popup.businesses.filter(b => b.city === popupCityFilter);
  }, [popup, popupCityFilter]);

  const popupCities = useMemo(() => {
    if (!popup) return [];
    return [...new Set(popup.businesses.map(b => b.city).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "fr"));
  }, [popup]);

  // --- Subcategory keyword editing ---

  const updateSubcategoryKeywords = async (subId: string, newKeywords: string[]) => {
    setSaving(true);
    const sorted = [...new Set(newKeywords.map(k => k.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
    const { error } = await supabase
      .from("subcategories")
      .update({ keywords: sorted })
      .eq("id", subId);
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
      return false;
    }
    onSubcategoryKeywordsChange(subId, sorted);
    return true;
  };

  const handleDeleteKeyword = async (subId: string, keyword: string) => {
    const conflicts = findSynonymConflicts(keyword, searchSynonyms);
    if (conflicts.length > 0) {
      toast.warning(`⚠️ « ${keyword} » est utilisé dans ${conflicts.length} synonyme(s) : ${conflicts.map(c => c.key_word).join(", ")}`, { duration: 6000 });
    }
    const sub = subcategories.find(s => s.id === subId);
    if (!sub) return;
    const success = await updateSubcategoryKeywords(subId, (sub.keywords || []).filter(k => k !== keyword));
    if (success) toast.success(`« ${keyword} » supprimé`);
  };

  const handleDeleteAll = (subId: string, subName: string, count: number) => {
    toast(`Supprimer les ${count} mots-clés de « ${subName} » ?`, {
      action: { label: "Oui, tout supprimer", onClick: async () => {
        const success = await updateSubcategoryKeywords(subId, []);
        if (success) toast.success("Tous les mots-clés supprimés");
      }},
      cancel: { label: "Annuler", onClick: () => {} },
      duration: 10000,
    });
  };

  const handleAddKeyword = async (subId: string) => {
    const kw = newKeyword.trim();
    if (!kw) return;
    const sub = subcategories.find(s => s.id === subId);
    if (!sub) return;
    const conflicts = findSynonymConflicts(kw, searchSynonyms);
    const success = await updateSubcategoryKeywords(subId, [...(sub.keywords || []), kw]);
    if (success) {
      setNewKeyword("");
      let msg = `« ${kw} » ajouté`;
      if (conflicts.length > 0) msg += ` (⚠️ synonyme: ${conflicts.map(c => c.key_word).join(", ")})`;
      toast.success(msg);
    }
  };

  const handleBulkInject = async (subId: string) => {
    const raw = bulkKeywords.trim();
    if (!raw) return;
    const newKws = raw.split(",").map(k => k.trim()).filter(Boolean);
    if (newKws.length === 0) return;
    const sub = subcategories.find(s => s.id === subId);
    if (!sub) return;
    const allConflicts = newKws.flatMap(kw => findSynonymConflicts(kw, searchSynonyms));
    const success = await updateSubcategoryKeywords(subId, [...(sub.keywords || []), ...newKws]);
    if (success) {
      setBulkKeywords("");
      let msg = `${newKws.length} mot(s)-clé(s) ajouté(s)`;
      if (allConflicts.length > 0) {
        const uniqueKeys = [...new Set(allConflicts.map(c => c.key_word))];
        msg += ` (⚠️ conflits: ${uniqueKeys.join(", ")})`;
      }
      toast.success(msg);
    }
  };

  const startEditing = (subId: string | null) => {
    setEditingSubId(subId);
    setNewKeyword("");
    setBulkKeywords("");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Mots-clés par Sous-catégories ({totalKeywords})
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

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un mot-clé…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>

          <Button variant="outline" className="w-full justify-between" onClick={() => setResultsOpen(!resultsOpen)}>
            <span>Résultats ({filteredRows.length} sous-catégories sur {totalSubcategoriesInScope} — {totalKeywords} mots-clés)</span>
            {resultsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          {resultsOpen && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => setSortOrder(s => s === "az" ? "za" : "az")}>
                        Sous-catégorie {(sortOrder === "az" || sortOrder === "za") ? (sortOrder === "az" ? <ArrowUpAZ className="h-4 w-4" /> : <ArrowDownZA className="h-4 w-4" />) : null}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSortOrder(s => s === "kw-desc" ? "kw-asc" : "kw-desc")}>
                        Mots-clés {sortOrder === "kw-desc" ? "↓" : sortOrder === "kw-asc" ? "↑" : ""}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">Services</TableHead>
                    <TableHead className="text-center">Étab.</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun mot-clé trouvé</TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => {
                      const bizCount = getBusinessCount(row.subcategoryId);
                      const isEditing = editingSubId === row.subcategoryId;
                      return (
                        <TableRow key={row.subcategoryId} className="align-top">
                          <TableCell className="text-muted-foreground text-sm">{getCatName(row.categoryId)}</TableCell>
                          <TableCell className="text-sm font-medium">{row.subcategoryName}</TableCell>
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
                                        onClick={isEditing ? () => handleDeleteKeyword(row.subcategoryId, kw) : undefined}
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
                                    <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => handleDeleteAll(row.subcategoryId, row.subcategoryName, row.keywords.length)} disabled={saving}>
                                      <Trash2 className="h-3 w-3 mr-1" /> Tout supprimer ({row.keywords.length})
                                    </Button>
                                  )}
                                  <div className="flex gap-1.5 items-center">
                                    <Input placeholder="Ajouter un mot-clé…" value={newKeyword} onChange={e => setNewKeyword(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddKeyword(row.subcategoryId); } }} className="h-7 text-xs flex-1" disabled={saving} />
                                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleAddKeyword(row.subcategoryId)} disabled={saving || !newKeyword.trim()}>
                                      <Plus className="h-3 w-3 mr-1" /> Ajouter
                                    </Button>
                                  </div>
                                  <div className="space-y-1">
                                    <Textarea placeholder="Liste séparée par des virgules…" value={bulkKeywords} onChange={e => setBulkKeywords(e.target.value)} className="text-xs min-h-[50px]" disabled={saving} />
                                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleBulkInject(row.subcategoryId)} disabled={saving || !bulkKeywords.trim()}>
                                      Injecter la liste
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">{row.serviceCount}</TableCell>
                          <TableCell className="text-center">
                            <Button variant={bizCount > 0 ? "outline" : "ghost"} size="sm" className="gap-1.5" disabled={bizCount === 0} onClick={() => openBusinessesPopup(row.subcategoryName, row.subcategoryId)}>
                              <Eye className="h-3.5 w-3.5" /> {bizCount}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant={isEditing ? "default" : "outline"} className="h-7 px-2 text-xs" onClick={() => startEditing(isEditing ? null : row.subcategoryId)}>
                              {isEditing ? "Fermer" : "Éditer"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Businesses popup */}
      <Dialog open={!!popup} onOpenChange={open => { if (!open) setPopup(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Établissements — {popup?.title}</DialogTitle>
          </DialogHeader>
          {popup?.loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {popupCities.length > 1 && (
                <Select value={popupCityFilter} onValueChange={setPopupCityFilter}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Toutes les villes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les villes ({popup?.businesses.length})</SelectItem>
                    {popupCities.map(city => (<SelectItem key={city} value={city}>{city} ({popup?.businesses.filter(b => b.city === city).length})</SelectItem>))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-sm text-muted-foreground">{popupFilteredBusinesses.length} établissement{popupFilteredBusinesses.length !== 1 ? "s" : ""}</p>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Ville</TableHead><TableHead>Statut</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {popupFilteredBusinesses.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{b.city || "—"}</TableCell>
                        <TableCell><Badge variant={b.is_active ? "default" : "secondary"} className={b.is_active ? "bg-green-200 text-black hover:bg-green-300" : ""}>{b.is_active ? "Actif" : "Inactif"}</Badge></TableCell>
                        <TableCell className="flex gap-1">
                          <Link to={`/business/${b.id}`} target="_blank"><Button variant="ghost" size="icon" className="h-7 w-7" title="Voir"><Eye className="h-3.5 w-3.5" /></Button></Link>
                          <Link to={`/staff/catalogue?edit=${b.id}`}><Button variant="ghost" size="icon" className="h-7 w-7" title="Éditer"><ExternalLink className="h-3.5 w-3.5" /></Button></Link>
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
    </>
  );
};

export default KeywordsBySubcategorySection;
