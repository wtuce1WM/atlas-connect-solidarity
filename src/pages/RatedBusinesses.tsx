import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Settings, Star, X } from "lucide-react";
import { useAvailableMainCategories } from "@/hooks/useAvailableMainCategories";

interface RatedBusiness {
  id: string;
  name: string;
  city: string;
  neighborhood: string | null;
  categories: string[] | null;
  main_category: string | null;
  services: string[] | null;
  google_rating: number | null;
  google_review_count: number | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
  rating: number | null;
}

const RatedBusinesses = () => {
  const { language } = useLanguage();
  const [businesses, setBusinesses] = useState<RatedBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { categories: mainCategories } = useAvailableMainCategories();

  // Subcategories & services from DB
  const [allSubcategories, setAllSubcategories] = useState<{ name_fr: string; category_id: string }[]>([]);
  const [allCategoryMap, setAllCategoryMap] = useState<Record<string, string>>({}); // cat name_fr -> id
  const [allServices, setAllServices] = useState<{ name_fr: string; subcategory_id: string }[]>([]);
  const [allSubcatMap, setAllSubcatMap] = useState<Record<string, string>>({}); // subcat name_fr -> id

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<string>("all");

  // Fetch businesses with any rating data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      // Fetch rated businesses
      const { data } = await supabase
        .from("businesses")
        .select("id, name, city, neighborhood, categories, main_category, services, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, rating")
        .eq("is_active", true)
        .or("google_review_count.gt.0,tripadvisor_review_count.gt.0,restaurant_guru_review_count.gt.0,rating.not.is.null");

      if (data) setBusinesses(data);

      // Fetch categories, subcategories, services for filter mapping
      const [catRes, subcatRes, svcRes] = await Promise.all([
        supabase.from("categories").select("id, name_fr").order("sort_order"),
        supabase.from("subcategories").select("id, name_fr, category_id").order("sort_order"),
        supabase.from("services").select("id, name_fr, subcategory_id").order("sort_order"),
      ]);

      if (catRes.data) {
        const map: Record<string, string> = {};
        catRes.data.forEach((c) => (map[c.name_fr] = c.id));
        setAllCategoryMap(map);
      }
      if (subcatRes.data) {
        setAllSubcategories(subcatRes.data);
        const map: Record<string, string> = {};
        subcatRes.data.forEach((s) => (map[s.name_fr] = s.id));
        setAllSubcatMap(map);
      }
      if (svcRes.data) setAllServices(svcRes.data);

      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Filter subcategories by selected category
  const filteredSubcategories = useMemo(() => {
    if (selectedCategory === "all") return [];
    const catId = allCategoryMap[selectedCategory];
    if (!catId) return [];
    return allSubcategories.filter((s) => s.category_id === catId);
  }, [selectedCategory, allCategoryMap, allSubcategories]);

  // Filter services by selected subcategory
  const filteredServices = useMemo(() => {
    if (selectedSubcategory === "all") return [];
    const subcatId = allSubcatMap[selectedSubcategory];
    if (!subcatId) return [];
    return allServices.filter((s) => s.subcategory_id === subcatId);
  }, [selectedSubcategory, allSubcatMap, allServices]);

  // Compute average /20 for a business
  const computeAverage20 = (b: RatedBusiness) => {
    if (b.rating != null) return b.rating;
    const sources: number[] = [];
    if (b.google_rating != null) sources.push(b.google_rating * 4);
    if (b.tripadvisor_rating != null) sources.push(b.tripadvisor_rating * 4);
    if (b.restaurant_guru_rating != null) sources.push(b.restaurant_guru_rating * 4);
    if (sources.length === 0) return null;
    return sources.reduce((a, c) => a + c, 0) / sources.length;
  };

  const totalReviews = (b: RatedBusiness) =>
    (b.google_review_count || 0) + (b.tripadvisor_review_count || 0) + (b.restaurant_guru_review_count || 0);

  // Filter businesses
  const filteredBusinesses = useMemo(() => {
    let result = businesses;

    if (selectedCategory !== "all") {
      result = result.filter((b) => b.main_category === selectedCategory);
    }
    if (selectedSubcategory !== "all") {
      result = result.filter((b) => b.categories?.includes(selectedSubcategory));
    }
    if (selectedService !== "all") {
      result = result.filter((b) => b.services?.includes(selectedService));
    }

    // Sort by average desc
    return [...result].sort((a, b) => {
      const avgA = computeAverage20(a) ?? 0;
      const avgB = computeAverage20(b) ?? 0;
      return avgB - avgA;
    });
  }, [businesses, selectedCategory, selectedSubcategory, selectedService]);

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedSubcategory("all");
    setSelectedService("all");
  };

  const hasFilters = selectedCategory !== "all" || selectedSubcategory !== "all" || selectedService !== "all";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <div className="bg-black pt-28 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
            <Star className="h-8 w-8 text-gold" />
            Établissements notés
          </h1>
          <p className="text-white/60 mt-2">
            {filteredBusinesses.length} établissement{filteredBusinesses.length > 1 ? "s" : ""} avec des avis
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div className="w-full sm:w-auto min-w-[200px]">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Catégorie</label>
            <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setSelectedSubcategory("all"); setSelectedService("all"); }}>
              <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {mainCategories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategory !== "all" && filteredSubcategories.length > 0 && (
            <div className="w-full sm:w-auto min-w-[200px]">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Sous-catégorie</label>
              <Select value={selectedSubcategory} onValueChange={(v) => { setSelectedSubcategory(v); setSelectedService("all"); }}>
                <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {filteredSubcategories.map((s) => (
                    <SelectItem key={s.name_fr} value={s.name_fr}>{s.name_fr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedSubcategory !== "all" && filteredServices.length > 0 && (
            <div className="w-full sm:w-auto min-w-[200px]">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Service</label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {filteredServices.map((s) => (
                    <SelectItem key={s.name_fr} value={s.name_fr}>{s.name_fr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" /> Effacer les filtres
            </Button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">Aucun établissement noté trouvé.</div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">Nom</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead className="hidden md:table-cell">Quartier</TableHead>
                  <TableHead className="hidden lg:table-cell">Sous-cat.</TableHead>
                  <TableHead className="text-center">
                    <span className="text-xs">Google</span>
                  </TableHead>
                  <TableHead className="text-center hidden sm:table-cell">
                    <span className="text-xs">R. Guru</span>
                  </TableHead>
                  <TableHead className="text-center hidden sm:table-cell">
                    <span className="text-xs">TripAdvisor</span>
                  </TableHead>
                  <TableHead className="text-center font-bold">
                    <span className="text-xs">Moy. /20</span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="text-xs">Total avis</span>
                  </TableHead>
                  <TableHead className="text-center w-[80px]">Liens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBusinesses.map((b) => {
                  const avg = computeAverage20(b);
                  const total = totalReviews(b);
                  const defaultSubcat = b.categories?.[0] || "—";

                  return (
                    <TableRow key={b.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium max-w-[200px] truncate">{b.name}</TableCell>
                      <TableCell className="text-sm">{b.city}</TableCell>
                      <TableCell className="text-sm hidden md:table-cell">{b.neighborhood || "—"}</TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">
                        <span className="truncate block max-w-[120px]">{defaultSubcat}</span>
                      </TableCell>
                      {/* Google */}
                      <TableCell className="text-center text-xs">
                        {b.google_rating != null ? (
                          <div>
                            <div className="font-semibold">{Number(b.google_rating).toFixed(1)}/5</div>
                            <div className="text-muted-foreground">{b.google_review_count || 0} avis</div>
                          </div>
                        ) : "—"}
                      </TableCell>
                      {/* Restaurant Guru */}
                      <TableCell className="text-center text-xs hidden sm:table-cell">
                        {b.restaurant_guru_rating != null ? (
                          <div>
                            <div className="font-semibold">{Number(b.restaurant_guru_rating).toFixed(1)}/5</div>
                            <div className="text-muted-foreground">{b.restaurant_guru_review_count || 0} avis</div>
                          </div>
                        ) : "—"}
                      </TableCell>
                      {/* TripAdvisor */}
                      <TableCell className="text-center text-xs hidden sm:table-cell">
                        {b.tripadvisor_rating != null ? (
                          <div>
                            <div className="font-semibold">{Number(b.tripadvisor_rating).toFixed(1)}/5</div>
                            <div className="text-muted-foreground">{b.tripadvisor_review_count || 0} avis</div>
                          </div>
                        ) : "—"}
                      </TableCell>
                      {/* Average /20 */}
                      <TableCell className="text-center">
                        {avg != null ? (
                          <Badge variant={avg >= 16 ? "default" : avg >= 12 ? "secondary" : "outline"} className="text-sm font-bold">
                            {avg.toFixed(1)}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      {/* Total reviews */}
                      <TableCell className="text-center text-sm font-medium">{total > 0 ? total : "—"}</TableCell>
                      {/* Links */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link to={`/business/${b.id}`} title="Voir la fiche">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link to={`/staff/backoffice?edit=${b.id}`} title="Modifier dans le backoffice">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Settings className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default RatedBusinesses;
