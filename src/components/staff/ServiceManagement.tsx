import { useState, useEffect, useMemo } from "react";
import { businessUrl } from "@/lib/businessUrl";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2, ExternalLink, Eye, EyeOff, ArrowUpAZ, ArrowDownZA, Filter, X } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name_fr: string;
}

interface Subcategory {
  id: string;
  category_id: string;
  name_fr: string;
}

interface Service {
  id: string;
  subcategory_id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  icon: string | null;
  keywords: string[] | null;
  is_active: boolean;
  is_filtered: boolean;
}

interface City {
  id: string;
  name_fr: string;
}

interface BusinessMini {
  id: string;
  name: string;
  city: string | null;
  is_active: boolean;
}

const ServiceManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "count-asc" | "count-desc">("az");

  // Raw active businesses (services + categorization) to recompute counts under filters
  const [rawBusinesses, setRawBusinesses] = useState<{ services: string[] | null; main_category: string | null; categories: string[] | null }[]>([]);
  // Business counts per service id (filter-aware)
  const [businessCountBySvc, setBusinessCountBySvc] = useState<Record<string, number>>({});

  // City filters per service: { serviceId: Set<cityId> }
  const [serviceCityFilters, setServiceCityFilters] = useState<Record<string, Set<string>>>({});

  // Filter popup state
  const [filterPopup, setFilterPopup] = useState<{ serviceId: string; serviceName: string } | null>(null);
  const [filterPopupSelection, setFilterPopupSelection] = useState<Set<string>>(new Set());
  const [filterPopupSaving, setFilterPopupSaving] = useState(false);

  // Business popup state
  const [popup, setPopup] = useState<{ title: string; businesses: BusinessMini[]; loading: boolean } | null>(null);
  const [popupCityFilter, setPopupCityFilter] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const fetchAllActiveBusinessServices = async () => {
      const all: { services: string[] | null; main_category: string | null; categories: string[] | null }[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("businesses")
          .select("services, main_category, categories")
          .eq("is_active", true)
          .order("id")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as any));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return { data: all };
    };
    const [catRes, subRes, svcRes, bizRes, citiesRes, filtersRes] = await Promise.all([
      supabase.from("categories").select("id, name_fr").order("name_fr"),
      supabase.from("subcategories").select("id, category_id, name_fr").order("name_fr"),
      fetchAllRows("services", "id, subcategory_id, name_fr, name_en, name_ar, icon, keywords, is_active, is_filtered", "name_fr"),
      fetchAllActiveBusinessServices(),
      supabase.from("cities").select("id, name_fr").order("name_fr"),
      supabase.from("service_city_filters" as any).select("service_id, city_id"),
    ]);

    if (catRes.data) setCategories(catRes.data);
    if (subRes.data) setSubcategories(subRes.data);
    if (svcRes) setServices(svcRes as unknown as Service[]);
    if (citiesRes.data) setCities(citiesRes.data);

    // Build city filter map
    if (filtersRes.data) {
      const map: Record<string, Set<string>> = {};
      for (const row of filtersRes.data as any[]) {
        if (!map[row.service_id]) map[row.service_id] = new Set();
        map[row.service_id].add(row.city_id);
      }
      setServiceCityFilters(map);
    }

    // Store raw business list; counts are recomputed in a memo (filter-aware).
    if (bizRes.data) setRawBusinesses(bizRes.data as any);
    setLoading(false);
  };

  // Filtered subcategories based on selected category
  const filteredSubcategories = useMemo(() => {
    if (categoryFilter === "all") return subcategories;
    return subcategories.filter(s => s.category_id === categoryFilter);
  }, [subcategories, categoryFilter]);

  // Reset subcategory filter when category changes
  useEffect(() => {
    setSubcategoryFilter("all");
  }, [categoryFilter]);

  // Recompute business counts whenever data or category/subcategory filters change.
  // Count businesses per service NAME (then map back to every service sharing
  // that name — multiple services can share the same label).
  useEffect(() => {
    if (!services.length) return;
    const selCatName = categoryFilter !== "all"
      ? categories.find(c => c.id === categoryFilter)?.name_fr
      : null;
    const selSubName = subcategoryFilter !== "all"
      ? subcategories.find(s => s.id === subcategoryFilter)?.name_fr
      : null;

    const countsByName: Record<string, number> = {};
    for (const biz of rawBusinesses) {
      if (selCatName && biz.main_category !== selCatName) continue;
      if (selSubName && !(biz.categories || []).includes(selSubName)) continue;
      const svcs = biz.services || [];
      const counted = new Set<string>();
      for (const s of svcs) {
        if (!s || counted.has(s)) continue;
        counted.add(s);
        countsByName[s] = (countsByName[s] || 0) + 1;
      }
    }
    const counts: Record<string, number> = {};
    for (const s of services) {
      counts[s.id] = Math.max(
        countsByName[s.name_fr] || 0,
        s.name_en ? (countsByName[s.name_en] || 0) : 0,
        s.name_ar ? (countsByName[s.name_ar] || 0) : 0,
      );
    }
    setBusinessCountBySvc(counts);
  }, [rawBusinesses, services, categoryFilter, subcategoryFilter, categories, subcategories]);

  // Filtered services
  const filteredServices = useMemo(() => {
    let result = services;

    if (subcategoryFilter !== "all") {
      result = result.filter(s => s.subcategory_id === subcategoryFilter);
    } else if (categoryFilter !== "all") {
      const subIds = new Set(filteredSubcategories.map(s => s.id));
      result = result.filter(s => subIds.has(s.subcategory_id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(s =>
        s.name_fr.toLowerCase().includes(q) ||
        s.name_en?.toLowerCase().includes(q) ||
        s.name_ar?.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      if (sortOrder === "count-asc" || sortOrder === "count-desc") {
        const diff = (businessCountBySvc[a.id] || 0) - (businessCountBySvc[b.id] || 0);
        return sortOrder === "count-asc" ? diff : -diff;
      }
      const cmp = a.name_fr.localeCompare(b.name_fr, "fr");
      return sortOrder === "az" ? cmp : -cmp;
    });

    return result;
  }, [services, categoryFilter, subcategoryFilter, filteredSubcategories, searchQuery, sortOrder, businessCountBySvc]);

  // Helper: get subcategory & category name for a service
  const getHierarchy = (svc: Service) => {
    const sub = subcategories.find(s => s.id === svc.subcategory_id);
    const cat = sub ? categories.find(c => c.id === sub.category_id) : null;
    return { subName: sub?.name_fr || "—", catName: cat?.name_fr || "—" };
  };

  // Open filter city popup
  const openFilterPopup = (svc: Service) => {
    const currentCities = serviceCityFilters[svc.id] || new Set();
    setFilterPopupSelection(new Set(currentCities));
    setFilterPopup({ serviceId: svc.id, serviceName: svc.name_fr });
  };

  // Save filter city selections
  const saveFilterCities = async () => {
    if (!filterPopup) return;
    setFilterPopupSaving(true);
    const serviceId = filterPopup.serviceId;
    const selectedCities = filterPopupSelection;

    // Delete all existing entries for this service
    const { error: delError } = await supabase.from("service_city_filters" as any).delete().eq("service_id", serviceId);
    if (delError) {
      console.error("Delete error:", delError);
      toast.error(`Erreur suppression filtres: ${delError.message}`);
      setFilterPopupSaving(false);
      return;
    }

    // Insert new entries
    if (selectedCities.size > 0) {
      const rows = [...selectedCities].map(cityId => ({ service_id: serviceId, city_id: cityId }));
      const { error: insError } = await supabase.from("service_city_filters" as any).insert(rows);
      if (insError) {
        console.error("Insert error:", insError);
        toast.error(`Erreur insertion filtres: ${insError.message}`);
        setFilterPopupSaving(false);
        return;
      }
    }

    // Update is_filtered on services table
    const isFiltered = selectedCities.size > 0;
    const { error: updError } = await supabase.from("services").update({ is_filtered: isFiltered } as any).eq("id", serviceId);
    if (updError) {
      console.error("Update error:", updError);
      toast.error(`Erreur mise à jour service: ${updError.message}`);
      setFilterPopupSaving(false);
      return;
    }

    // Update local state
    setServiceCityFilters(prev => {
      const next = { ...prev };
      if (selectedCities.size > 0) {
        next[serviceId] = new Set(selectedCities);
      } else {
        delete next[serviceId];
      }
      return next;
    });
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, is_filtered: isFiltered } : s));

    setFilterPopupSaving(false);
    setFilterPopup(null);
    toast.success(`Filtre mis à jour pour "${filterPopup.serviceName}"`);
  };

  // Toggle a city in filter popup
  const toggleFilterCity = (cityId: string) => {
    setFilterPopupSelection(prev => {
      const next = new Set(prev);
      if (next.has(cityId)) next.delete(cityId);
      else next.add(cityId);
      return next;
    });
  };

  // Open businesses popup for a service (respects Category/Subcategory filters)
  const openBusinessesPopup = async (svcName: string) => {
    setPopup({ title: svcName, businesses: [], loading: true });
    setPopupCityFilter("all");
    let query = supabase
      .from("businesses")
      .select("id, name, city, is_active")
      .eq("is_active", true)
      .filter("services", "cs", `{"${svcName}"}`);
    if (categoryFilter !== "all") {
      const selCatName = categories.find(c => c.id === categoryFilter)?.name_fr;
      if (selCatName) query = query.eq("main_category", selCatName);
    }
    if (subcategoryFilter !== "all") {
      const selSubName = subcategories.find(s => s.id === subcategoryFilter)?.name_fr;
      if (selSubName) query = query.contains("categories", [selSubName]);
    }
    const { data } = await query.order("name");
    setPopup({ title: svcName, businesses: data || [], loading: false });
  };

  // Popup filtered businesses
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
            Services ({filteredServices.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
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
                placeholder="Rechercher un service…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Results table */}
          <div className="border rounded-lg">
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
                  <TableHead className="text-center">Filtre</TableHead>
                  <TableHead className="text-center">Actif</TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSortOrder(s => s === "count-desc" ? "count-asc" : "count-desc")}>
                      Établissements {sortOrder === "count-desc" ? "↓" : sortOrder === "count-asc" ? "↑" : ""}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Aucun service trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServices.map(svc => {
                    const { catName, subName } = getHierarchy(svc);
                    const count = businessCountBySvc[svc.id] || 0;
                    const filterCityCount = serviceCityFilters[svc.id]?.size || 0;
                    const isFilterActive = svc.is_filtered || filterCityCount > 0;
                    return (
                      <TableRow key={svc.id}>
                        <TableCell className="text-muted-foreground text-sm">{catName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{subName}</TableCell>
                        <TableCell className="font-medium">{svc.name_fr}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant={isFilterActive ? "default" : "outline"}
                            size="sm"
                            className={`gap-1.5 ${isFilterActive ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
                            onClick={() => openFilterPopup(svc)}
                          >
                            <Filter className="h-3.5 w-3.5" />
                            {filterCityCount > 0 ? filterCityCount : isFilterActive ? "✓" : "—"}
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={svc.is_active}
                            onCheckedChange={async (checked) => {
                              const { error } = await supabase
                                .from("services")
                                .update({ is_active: checked } as any)
                                .eq("id", svc.id);
                              if (!error) {
                                setServices(prev => prev.map(s => s.id === svc.id ? { ...s, is_active: checked } : s));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant={count > 0 ? "outline" : "ghost"}
                            size="sm"
                            className="gap-1.5"
                            disabled={count === 0}
                            onClick={() => openBusinessesPopup(svc.name_fr)}
                          >
                            {count > 0 ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                            {count}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Filter cities popup */}
      <Dialog open={!!filterPopup} onOpenChange={open => { if (!open) setFilterPopup(null); }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-red-500" />
              Filtre — {filterPopup?.serviceName}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Sélectionnez les villes où ce service sera filtré (masqué sur le front).
          </p>

          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {filterPopupSelection.size} ville{filterPopupSelection.size !== 1 ? "s" : ""} sélectionnée{filterPopupSelection.size !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setFilterPopupSelection(new Set(cities.map(c => c.id)))}>
                Tout
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setFilterPopupSelection(new Set())}>
                Aucun
              </Button>
            </div>
          </div>

          <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
            {cities.map(city => (
              <label key={city.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                <Checkbox
                  checked={filterPopupSelection.has(city.id)}
                  onCheckedChange={() => toggleFilterCity(city.id)}
                />
                <span className="text-sm">{city.name_fr}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setFilterPopup(null)}>Annuler</Button>
            <Button
              onClick={saveFilterCities}
              disabled={filterPopupSaving}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {filterPopupSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              {/* City filter */}
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
                          <Link to={businessUrl(b)} target="_blank">
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

export default ServiceManagement;
