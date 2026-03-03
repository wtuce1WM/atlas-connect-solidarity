import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, ExternalLink, Eye, ArrowUpAZ, ArrowDownZA, ChevronDown, ChevronRight } from "lucide-react";

interface Category { id: string; name_fr: string; }
interface Subcategory { id: string; category_id: string; name_fr: string; }
interface Service { id: string; subcategory_id: string; name_fr: string; name_en: string | null; name_ar: string | null; keywords: string[] | null; }
interface ServiceRow { serviceId: string; serviceName: string; subcategoryId: string; keywords: string[]; }
interface BusinessMini { id: string; name: string; city: string | null; is_active: boolean; }

const KeywordManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "count-asc" | "count-desc">("az");
  const [resultsOpen, setResultsOpen] = useState(false);

  const [businessCountByKw, setBusinessCountByKw] = useState<Record<string, number>>({});
  const [popup, setPopup] = useState<{ title: string; businesses: BusinessMini[]; loading: boolean } | null>(null);
  const [popupCityFilter, setPopupCityFilter] = useState<string>("all");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [catRes, subRes, svcRes, bizRes] = await Promise.all([
      supabase.from("categories").select("id, name_fr").order("name_fr"),
      supabase.from("subcategories").select("id, category_id, name_fr").order("name_fr"),
      fetchAllRows("services", "id, subcategory_id, name_fr, name_en, name_ar, keywords", "name_fr"),
      supabase.from("businesses").select("services, keywords").eq("is_active", true),
    ]);

    if (catRes.data) setCategories(catRes.data);
    if (subRes.data) setSubcategories(subRes.data);
    if (svcRes) setServices(svcRes as unknown as Service[]);

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

  // Total services in filtered scope (all, not just those with keywords)
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

  // Build ALL service rows (including those without keywords)
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

  // Filtered service rows
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
                      Établissements {sortOrder === "count-desc" ? "↓" : sortOrder === "count-asc" ? "↑" : ""}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServiceRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Aucun mot-clé trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServiceRows.map((row) => {
                    const { catName, subName } = getHierarchy(row.subcategoryId);
                    const count = businessCountByKw[row.serviceId] || 0;
                    return (
                      <TableRow key={row.serviceId}>
                        <TableCell className="text-muted-foreground text-sm">{catName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{subName}</TableCell>
                        <TableCell className="text-sm font-medium">{row.serviceName}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {row.keywords.map(kw => (
                              <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant={count > 0 ? "outline" : "ghost"}
                            size="sm"
                            className="gap-1.5"
                            disabled={count === 0}
                            onClick={() => openBusinessesPopup(row.serviceName)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {count}
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
    </div>
  );
};

export default KeywordManagement;
