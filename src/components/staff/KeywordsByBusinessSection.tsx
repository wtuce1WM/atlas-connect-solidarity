import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, ExternalLink, Loader2, Building2 } from "lucide-react";

interface Category { id: string; name_fr: string; }
interface Subcategory { id: string; category_id: string; name_fr: string; }

interface BusinessRow {
  id: string;
  name: string;
  city: string | null;
  is_active: boolean;
  services: string[];
  keywords: string[];
}

interface Props {
  categories: Category[];
  subcategories: Subcategory[];
}

const KeywordsByBusinessSection = ({ categories, subcategories }: Props) => {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [servicesBySubcategory, setServicesBySubcategory] = useState<Record<string, string[]>>({});
  const [cities, setCities] = useState<string[]>([]);

  const filteredSubcategories = useMemo(() => {
    if (categoryFilter === "all") return subcategories;
    return subcategories.filter(s => s.category_id === categoryFilter);
  }, [subcategories, categoryFilter]);

  useEffect(() => { setSubcategoryFilter("all"); }, [categoryFilter]);

  // Load service names per subcategory for filtering
  useEffect(() => {
    const map: Record<string, string[]> = {};
    // We don't have services prop here, fetch lightly or accept it
    // Actually let's fetch services once
    const fetch = async () => {
      const { data } = await supabase
        .from("services")
        .select("subcategory_id, name_fr");
      if (data) {
        for (const s of data) {
          if (!map[s.subcategory_id]) map[s.subcategory_id] = [];
          map[s.subcategory_id].push(s.name_fr);
        }
      }
      setServicesBySubcategory(map);
    };
    fetch();
  }, []);

  // Fetch distinct cities
  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabase
        .from("businesses")
        .select("city")
        .eq("is_active", true)
        .not("city", "is", null);
      if (data) {
        const unique = [...new Set(data.map(b => b.city).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "fr"));
        setCities(unique);
      }
    };
    fetchCities();
  }, []);

  // Fetch businesses when subcategory is selected
  useEffect(() => {
    if (subcategoryFilter === "all") {
      setBusinesses([]);
      return;
    }

    const serviceNames = servicesBySubcategory[subcategoryFilter] || [];
    if (serviceNames.length === 0) {
      setBusinesses([]);
      return;
    }

    const fetchBusinesses = async () => {
      setLoading(true);
      // Fetch all active businesses and filter client-side by service names
      const data = await fetchAllRows("businesses", "id, name, city, is_active, services, keywords", "name");
      if (data) {
        const matched = (data as any[]).filter(b => {
          const bizServices = (b.services as string[]) || [];
          return bizServices.some(s => serviceNames.includes(s));
        }).map(b => ({
          id: b.id,
          name: b.name,
          city: b.city,
          is_active: b.is_active,
          services: (b.services as string[]) || [],
          keywords: (b.keywords as string[]) || [],
        }));
        setBusinesses(matched);
      }
      setLoading(false);
    };
    fetchBusinesses();
  }, [subcategoryFilter, servicesBySubcategory]);

  // Filter by city and search
  const filteredBusinesses = useMemo(() => {
    let result = businesses;

    if (cityFilter !== "all") {
      result = result.filter(b => b.city === cityFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.services.some(s => s.toLowerCase().includes(q))
      );
    }

    return result;
  }, [businesses, cityFilter, searchQuery]);

  const totalKeywords = useMemo(() => filteredBusinesses.reduce((sum, b) => sum + b.keywords.length, 0), [filteredBusinesses]);

  const selectedSubName = subcategories.find(s => s.id === subcategoryFilter)?.name_fr;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Mots-clés par Établissement
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

          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Toutes les villes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou service…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {subcategoryFilter === "all" ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Sélectionnez une sous-catégorie pour afficher les résultats.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {filteredBusinesses.length} établissement{filteredBusinesses.length !== 1 ? "s" : ""} pour « {selectedSubName} » — {totalKeywords} mot{totalKeywords !== 1 ? "s" : ""}-clé{totalKeywords !== 1 ? "s" : ""}
            </p>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Mots-clés</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBusinesses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Aucun établissement trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBusinesses.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{b.city || "—"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {b.keywords.length === 0 ? (
                              <span className="text-muted-foreground text-xs italic">Aucun</span>
                            ) : (
                              b.keywords.sort((a, c) => a.localeCompare(c, "fr")).map(kw => (
                                <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
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
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default KeywordsByBusinessSection;
