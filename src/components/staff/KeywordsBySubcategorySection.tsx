import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, ArrowUpAZ, ArrowDownZA, ChevronDown, ChevronRight, ExternalLink, Loader2 } from "lucide-react";

interface Category { id: string; name_fr: string; }
interface Subcategory { id: string; category_id: string; name_fr: string; }
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
}

const KeywordsBySubcategorySection = ({ categories, subcategories, services, businessCountByService }: Props) => {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "kw-asc" | "kw-desc">("az");
  const [resultsOpen, setResultsOpen] = useState(false);

  const [popup, setPopup] = useState<{ title: string; businesses: BusinessMini[]; loading: boolean } | null>(null);
  const [popupCityFilter, setPopupCityFilter] = useState<string>("all");

  // Build subcategory rows with aggregated keywords from all their services
  const allSubcategoryRows = useMemo(() => {
    const rows: SubcategoryRow[] = [];
    for (const sub of subcategories) {
      const subServices = services.filter(s => s.subcategory_id === sub.id);
      const allKeywords = new Set<string>();
      for (const svc of subServices) {
        if (svc.keywords) {
          for (const kw of svc.keywords) {
            allKeywords.add(kw);
          }
        }
      }
      rows.push({
        subcategoryId: sub.id,
        subcategoryName: sub.name_fr,
        categoryId: sub.category_id,
        keywords: [...allKeywords].sort((a, b) => a.localeCompare(b, "fr")),
        serviceCount: subServices.length,
      });
    }
    return rows;
  }, [subcategories, services]);

  // Total subcategories in scope
  const totalSubcategoriesInScope = useMemo(() => {
    if (categoryFilter === "all") return subcategories.length;
    return subcategories.filter(s => s.category_id === categoryFilter).length;
  }, [subcategories, categoryFilter]);

  // Filtered rows
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

  const getCatName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name_fr || "—";
  };

  // Count businesses for a subcategory = unique businesses across all its services
  const getBusinessCount = (subcategoryId: string) => {
    const subServices = services.filter(s => s.subcategory_id === subcategoryId);
    // Sum of service-level counts (approximation — same business may appear in multiple services)
    let total = 0;
    for (const svc of subServices) {
      total += businessCountByService[svc.id] || 0;
    }
    return total;
  };

  const openBusinessesPopup = async (subcategoryName: string, subcategoryId: string) => {
    setPopup({ title: subcategoryName, businesses: [], loading: true });
    setPopupCityFilter("all");

    // Get all service names for this subcategory
    const subServices = services.filter(s => s.subcategory_id === subcategoryId);
    const serviceNames = subServices.map(s => s.name_fr);

    if (serviceNames.length === 0) {
      setPopup({ title: subcategoryName, businesses: [], loading: false });
      return;
    }

    // Fetch businesses that have any of these services
    const { data } = await supabase
      .from("businesses")
      .select("id, name, city, is_active, services")
      .eq("is_active", true)
      .order("name");

    const matched = (data || []).filter(b => {
      const bizServices = (b.services as string[]) || [];
      return bizServices.some(s => serviceNames.includes(s));
    });

    setPopup({ title: subcategoryName, businesses: matched.map(b => ({ id: b.id, name: b.name, city: b.city, is_active: b.is_active })), loading: false });
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
              <Input
                placeholder="Rechercher un mot-clé…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
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
                    <TableHead className="text-center">Établissements</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Aucun mot-clé trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => {
                      const bizCount = getBusinessCount(row.subcategoryId);
                      return (
                        <TableRow key={row.subcategoryId}>
                          <TableCell className="text-muted-foreground text-sm">{getCatName(row.categoryId)}</TableCell>
                          <TableCell className="text-sm font-medium">{row.subcategoryName}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {row.keywords.length === 0 ? (
                                <span className="text-muted-foreground text-xs italic">Aucun</span>
                              ) : (
                                row.keywords.map(kw => (
                                  <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {row.serviceCount}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant={bizCount > 0 ? "outline" : "ghost"}
                              size="sm"
                              className="gap-1.5"
                              disabled={bizCount === 0}
                              onClick={() => openBusinessesPopup(row.subcategoryName, row.subcategoryId)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {bizCount}
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
                      <SelectItem key={city} value={city}>
                        {city} ({popup?.businesses.filter(b => b.city === city).length})
                      </SelectItem>
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
                          <Badge variant={b.is_active ? "default" : "secondary"} className={b.is_active ? "bg-green-200 text-black hover:bg-green-300" : ""}>
                            {b.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex gap-1">
                          <Link to={`/business/${b.id}`} target="_blank">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Voir la fiche">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link to={`/staff/catalogue?edit=${b.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Éditer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
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
    </>
  );
};

export default KeywordsBySubcategorySection;
