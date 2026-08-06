import { useEffect, useState, useMemo } from "react";
import { useSEO } from "@/hooks/useSEO";
import { businessUrl } from "@/lib/businessUrl";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import { Link, useNavigate } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { useLanguage } from "@/contexts/LanguageContext";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import ratedHeroAsset from "@/assets/rated-businesses-hero.webp.asset.json";
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
import { Loader2, Star, X, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useAvailableMainCategories } from "@/hooks/useAvailableMainCategories";

type SortKey = "name" | "subcat" | "google" | "guru" | "tripadvisor" | "avg" | "total";
type SortDir = "asc" | "desc";

interface RatedBusiness {
  id: string;
  name: string;
  city: string;
  neighborhood: string | null;
  categories: string[] | null;
  main_category: string | null;
  services: string[] | null;
  images: string[] | null;
  google_rating: number | null;
  google_review_count: number | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
  rating: number | null;
}

const RatedBusinesses = () => {
  const navigate = useLocalizedNavigate();
  const { language } = useLanguage();
  const [businesses, setBusinesses] = useState<RatedBusiness[]>([]);
  const [vanityMap, setVanityMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);

  const t = (fr: string, en: string, ar: string) =>
    language === "en" ? en : language === "ar" ? ar : fr;

  const linkFor = (b: { id: string; slug?: string | null }) => {
    const v = vanityMap[b.id];
    return v ? `/${v}` : businessUrl(b);
  };
  const { categories: mainCategories } = useAvailableMainCategories();

  // Subcategories & services from DB
  const [allSubcategories, setAllSubcategories] = useState<{ name_fr: string; category_id: string }[]>([]);
  const [allCategoryMap, setAllCategoryMap] = useState<Record<string, string>>({}); // cat name_fr -> id
  const [allServices, setAllServices] = useState<{ name_fr: string; subcategory_id: string }[]>([]);
  const [allSubcatMap, setAllSubcatMap] = useState<Record<string, string>>({}); // subcat name_fr -> id

  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("avg");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-40" />;
    return sortDir === "asc" 
      ? <ArrowUp className="h-3 w-3 ml-1 inline text-gold" /> 
      : <ArrowDown className="h-3 w-3 ml-1 inline text-gold" />;
  };

  // Check staff status
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsStaff(false); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      setIsStaff(!!roles && roles.some((r: any) => r.role === "admin" || r.role === "staff"));
    };
    check();
  }, []);

  // Fetch businesses with any rating data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      // Fetch ALL rated businesses (paginated — PostgREST caps at 1000/req)
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;
      const all: RatedBusiness[] = [];
      while (hasMore) {
        const { data, error } = await supabase
          .from("businesses")
          .select("id, name, city, neighborhood, categories, main_category, services, images, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, rating")
          .eq("is_active", true)
          .or("google_review_count.gt.0,tripadvisor_review_count.gt.0,restaurant_guru_review_count.gt.0,rating.not.is.null")
          .order("priority_score", { ascending: false })
          .order("id")
          .range(offset, offset + batchSize - 1);
        if (error) break;
        if (data && data.length > 0) {
          all.push(...(data as RatedBusiness[]));
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      setBusinesses(all);

      // Fetch vanity URLs for these businesses (paginated by id chunks)
      const ids = all.map((b) => b.id);
      const vmap: Record<string, string> = {};
      const chunkSize = 300;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { data: vrows } = await supabase
          .from("vanity_urls")
          .select("slug, target_id")
          .eq("target_type", "business")
          .in("target_id", chunk);
        (vrows || []).forEach((r: any) => {
          if (r.target_id && r.slug && !vmap[r.target_id]) vmap[r.target_id] = r.slug;
        });
      }
      setVanityMap(vmap);

      // Fetch categories, subcategories, services for filter mapping
      const [catRes, subcatRes, svcData] = await Promise.all([
        supabase.from("categories").select("id, name_fr").order("sort_order"),
        supabase.from("subcategories").select("id, name_fr, category_id").order("sort_order"),
        fetchAllRows("services", "id, name_fr, subcategory_id", "sort_order"),
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
      setAllServices(svcData as any[]);

      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Filter subcategories by selected category
  const filteredSubcategories = useMemo(() => {
    if (selectedCategory === "all") return [];
    const catId = allCategoryMap[selectedCategory];
    if (!catId) return [];
    return allSubcategories.filter((s) => s.category_id === catId).sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr'));
  }, [selectedCategory, allCategoryMap, allSubcategories]);

  // Filter services by selected subcategory
  const filteredServices = useMemo(() => {
    if (selectedSubcategory === "all") return [];
    const subcatId = allSubcatMap[selectedSubcategory];
    if (!subcatId) return [];
    return allServices.filter((s) => s.subcategory_id === subcatId).sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr'));
  }, [selectedSubcategory, allSubcatMap, allServices]);

  // Compute average /20 for a business
  const computeAverage20 = (b: RatedBusiness) => {
    return computeWeightedRatingOn20(collectRatingSources(b));
  };

  const totalReviews = (b: RatedBusiness) =>
    (b.google_review_count || 0) + (b.tripadvisor_review_count || 0) + (b.restaurant_guru_review_count || 0);

  // Available cities sorted (strictly restricted to Marrakech and Essaouira)
  const availableCities = useMemo(() => {
    const cities = [...new Set(businesses.map((b) => b.city))]
      .filter((c) => c === "Marrakech" || c === "Essaouira")
      .sort();
    return cities;
  }, [businesses]);

  // Filter businesses
  const filteredBusinesses = useMemo(() => {
    let result = businesses;

    if (selectedCity !== "all") {
      result = result.filter((b) => b.city === selectedCity);
    }
    if (selectedCategory !== "all") {
      result = result.filter((b) => b.main_category === selectedCategory);
    }
    if (selectedSubcategory !== "all") {
      result = result.filter((b) => b.categories?.includes(selectedSubcategory));
    }
    if (selectedService !== "all") {
      result = result.filter((b) => b.services?.includes(selectedService));
    }

    // Sort
    const dir = sortDir === "asc" ? 1 : -1;
    return [...result].sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;
      switch (sortKey) {
        case "name": valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
        case "subcat": valA = (a.categories?.[0] || "").toLowerCase(); valB = (b.categories?.[0] || "").toLowerCase(); break;
        case "google": valA = a.google_rating ?? -1; valB = b.google_rating ?? -1; break;
        case "guru": valA = a.restaurant_guru_rating ?? -1; valB = b.restaurant_guru_rating ?? -1; break;
        case "tripadvisor": valA = a.tripadvisor_rating ?? -1; valB = b.tripadvisor_rating ?? -1; break;
        case "avg": valA = computeAverage20(a) ?? -1; valB = computeAverage20(b) ?? -1; break;
        case "total": valA = totalReviews(a); valB = totalReviews(b); break;
      }
      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });
  }, [businesses, selectedCity, selectedCategory, selectedSubcategory, selectedService, sortKey, sortDir]);

  const clearFilters = () => {
    setSelectedCity("all");
    setSelectedCategory("all");
    setSelectedSubcategory("all");
    setSelectedService("all");
  };

  const hasFilters = selectedCity !== "all" || selectedCategory !== "all" || selectedSubcategory !== "all" || selectedService !== "all";

  const heroImage = ratedHeroAsset.url;
  const heroAlt = t("Établissements notés au Maroc", "Rated establishments in Morocco", "المؤسسات المصنفة في المغرب");
  const backLabel = t("Retour au blog", "Back to blog", "العودة إلى المدونة");
  const h1Top = t("Établissements", "Rated", "المؤسسات");
  const h1Bottom = t("notés au Maroc", "establishments in Morocco", "المصنفة في المغرب");
  const reviewsWord = t("avis", "reviews", "تقييم");
  const dash = "—";

  return (
    <div className="min-h-screen bg-background" dir={language === "ar" ? "rtl" : "ltr"}>
      <HomeMindtripHeader alwaysWhite />

      {/* Hero */}
      <div className="relative h-[60vh] min-h-[420px] overflow-hidden">
        <img
          src={heroImage}
          alt={heroAlt}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#3B3B3B] via-[#3B3B3B]/50 to-[#3B3B3B]/30" />
        <div className="absolute inset-0 flex flex-col justify-end pb-12">
          <div className="container mx-auto px-4">
            <button
              onClick={() => navigate("/blog")}
              className="inline-flex items-center gap-2 text-white/60 hover:text-gold mb-4 transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </button>
            <h1 className="text-3xl md:text-5xl font-bold text-white font-['Playfair_Display'] italic leading-tight">
              {h1Top}
              <br />
              <span className="text-gold">{h1Bottom}</span>
            </h1>
            <p className="mt-4 text-white/70 max-w-2xl text-lg">
              {t(
                `${filteredBusinesses.length} établissement${filteredBusinesses.length > 1 ? "s" : ""} avec des avis vérifiés — Google, TripAdvisor et Restaurant Guru réunis dans un classement unique sur 20.`,
                `${filteredBusinesses.length} establishment${filteredBusinesses.length > 1 ? "s" : ""} with verified reviews — Google, TripAdvisor and Restaurant Guru combined into a single ranking out of 20.`,
                `${filteredBusinesses.length} مؤسسة بتقييمات موثّقة — Google وTripAdvisor وRestaurant Guru مجمّعة في تصنيف واحد على 20.`,
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div className="w-full sm:w-auto min-w-[200px]">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{t("Ville", "City", "المدينة")}</label>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger><SelectValue placeholder={t("Toutes", "All", "الكل")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("Toutes les villes", "All cities", "كل المدن")}</SelectItem>
                {availableCities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-auto min-w-[200px]">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{t("Catégorie", "Category", "الفئة")}</label>
            <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setSelectedSubcategory("all"); setSelectedService("all"); }}>
              <SelectTrigger><SelectValue placeholder={t("Toutes", "All", "الكل")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("Toutes les catégories", "All categories", "كل الفئات")}</SelectItem>
                {mainCategories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategory !== "all" && filteredSubcategories.length > 0 && (
            <div className="w-full sm:w-auto min-w-[200px]">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">{t("Sous-catégorie", "Subcategory", "الفئة الفرعية")}</label>
              <Select value={selectedSubcategory} onValueChange={(v) => { setSelectedSubcategory(v); setSelectedService("all"); }}>
                <SelectTrigger><SelectValue placeholder={t("Toutes", "All", "الكل")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Toutes", "All", "الكل")}</SelectItem>
                  {filteredSubcategories.map((s) => (
                    <SelectItem key={s.name_fr} value={s.name_fr}>{s.name_fr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedSubcategory !== "all" && filteredServices.length > 0 && (
            <div className="w-full sm:w-auto min-w-[200px]">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">{t("Service", "Service", "الخدمة")}</label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger><SelectValue placeholder={t("Tous", "All", "الكل")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Tous", "All", "الكل")}</SelectItem>
                  {filteredServices.map((s) => (
                    <SelectItem key={s.name_fr} value={s.name_fr}>{s.name_fr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" /> {t("Effacer les filtres", "Clear filters", "مسح الفلاتر")}
            </Button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">{t("Aucun établissement noté trouvé.", "No rated establishment found.", "لم يتم العثور على أي مؤسسة مصنفة.")}</div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-center w-[50px] font-bold">#</TableHead>
                  <TableHead className="font-bold cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    {t("Nom", "Name", "الاسم")} <SortIcon col="name" />
                  </TableHead>
                  <TableHead>{t("Ville", "City", "المدينة")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("Quartier", "Neighborhood", "الحي")}</TableHead>
                  <TableHead className="hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort("subcat")}>
                    <span className="text-xs">{t("Sous-cat.", "Subcat.", "الفئة الفرعية")} <SortIcon col="subcat" /></span>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort("google")}>
                    <span className="text-xs">Google <SortIcon col="google" /></span>
                  </TableHead>
                  <TableHead className="text-center hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleSort("guru")}>
                    <span className="text-xs">R. Guru <SortIcon col="guru" /></span>
                  </TableHead>
                  <TableHead className="text-center hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleSort("tripadvisor")}>
                    <span className="text-xs">TripAdvisor <SortIcon col="tripadvisor" /></span>
                  </TableHead>
                  <TableHead className="text-center font-bold cursor-pointer select-none" onClick={() => toggleSort("avg")}>
                    <span className="text-xs">{t("Moy. /20", "Avg. /20", "المعدل /20")} <SortIcon col="avg" /></span>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort("total")}>
                    <span className="text-xs">{t("Total avis", "Total reviews", "إجمالي التقييمات")} <SortIcon col="total" /></span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBusinesses.map((b, index) => {
                  const avg = computeAverage20(b);
                  const total = totalReviews(b);
                  const defaultSubcat = b.categories?.[0] || "—";

                  return (
                    <TableRow key={b.id} className="hover:bg-muted/30">
                      <TableCell className="text-center text-sm font-bold text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium whitespace-normal break-words">
                        <Link to={linkFor(b)} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                          {b.name}
                        </Link>
                      </TableCell>
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
                            <div className="text-muted-foreground">{b.google_review_count || 0} {reviewsWord}</div>
                          </div>
                        ) : "—"}
                      </TableCell>
                      {/* Restaurant Guru */}
                      <TableCell className="text-center text-xs hidden sm:table-cell">
                        {b.restaurant_guru_rating != null ? (
                          <div>
                            <div className="font-semibold">{Number(b.restaurant_guru_rating).toFixed(1)}/5</div>
                            <div className="text-muted-foreground">{b.restaurant_guru_review_count || 0} {reviewsWord}</div>
                          </div>
                        ) : "—"}
                      </TableCell>
                      {/* TripAdvisor */}
                      <TableCell className="text-center text-xs hidden sm:table-cell">
                        {b.tripadvisor_rating != null ? (
                          <div>
                            <div className="font-semibold">{Number(b.tripadvisor_rating).toFixed(1)}/5</div>
                            <div className="text-muted-foreground">{b.tripadvisor_review_count || 0} {reviewsWord}</div>
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
