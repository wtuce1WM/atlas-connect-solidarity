import { useParams, Link, useSearchParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MapPin, Phone, Globe, Building2, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Hotel,
  Utensils,
  Car,
  Palette,
  ShoppingBag,
  Wrench,
  Compass,
  Wheat,
  Factory,
  GraduationCap,
  Heart,
  Dumbbell,
  Sparkles,
  Theater,
  Cpu
} from "lucide-react";

interface Business {
  id: string;
  name: string;
  description: string | null;
  city: string;
  region: string;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  images: string[] | null;
  main_category: string | null;
  categories: string[] | null;
  wtuce_status: string | null;
  is_regulated_activity: boolean | null;
}

interface CategoryInfo {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  icon: string | null;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Hôtellerie": Hotel,
  "Restauration": Utensils,
  "Transport": Car,
  "Artisanat": Palette,
  "Commerce": ShoppingBag,
  "Services": Wrench,
  "Tourisme": Compass,
  "Agriculture": Wheat,
  "Industrie": Factory,
  "Éducation": GraduationCap,
  "Santé": Heart,
  "Sport & Loisirs": Dumbbell,
  "Bien-être": Sparkles,
  "Culture": Theater,
  "Technologie": Cpu,
};

const ITEMS_PER_PAGE = 20;

const CategoryPage = () => {
  const { categoryName } = useParams<{ categoryName: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<CategoryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCity, setSelectedCity] = useState<string>("all");

  const decodedCategoryName = categoryName ? decodeURIComponent(categoryName) : "";

  // Extract unique cities from businesses
  const availableCities = useMemo(() => {
    const cities = [...new Set(allBusinesses.map(b => b.city))].sort((a, b) => 
      a.localeCompare(b, "fr")
    );
    return cities;
  }, [allBusinesses]);

  // Filter businesses by city
  const filteredBusinesses = useMemo(() => {
    if (selectedCity === "all") return allBusinesses;
    return allBusinesses.filter(b => b.city === selectedCity);
  }, [allBusinesses, selectedCity]);

  // Paginate
  const totalPages = Math.ceil(filteredBusinesses.length / ITEMS_PER_PAGE);
  const paginatedBusinesses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBusinesses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBusinesses, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity]);

  useEffect(() => {
    const fetchData = async () => {
      if (!decodedCategoryName) return;
      
      setIsLoading(true);
      try {
        // Fetch category info
        const { data: catData } = await supabase
          .from("categories")
          .select("id, name_fr, name_en, name_ar, icon")
          .eq("name_fr", decodedCategoryName)
          .maybeSingle();

        if (catData) {
          setCategoryInfo(catData);
        }

        // Fetch ALL businesses in this category (no limit)
        const { data: businessData, error } = await supabase
          .from("businesses")
          .select("id, name, description, city, region, phone, website, logo_url, images, main_category, categories, wtuce_status, is_regulated_activity")
          .eq("is_active", true)
          .or(`main_category.eq.${decodedCategoryName},categories.cs.{${decodedCategoryName}}`)
          .order("wtuce_status", { ascending: true })
          .order("priority_score", { ascending: false });

        if (error) throw error;
        
        // Filter out businesses without images
        const businessesWithImages = (businessData || []).filter(b => 
          (b.images && b.images.length > 0)
        );
        setAllBusinesses(businessesWithImages);
      } catch (error) {
        console.error("Error fetching category data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [decodedCategoryName]);

  const getCategoryName = () => {
    if (!categoryInfo) return decodedCategoryName;
    if (language === "ar" && categoryInfo.name_ar) return categoryInfo.name_ar;
    if (language === "en" && categoryInfo.name_en) return categoryInfo.name_en;
    return categoryInfo.name_fr;
  };

  const getCategoryIcon = () => {
    return CATEGORY_ICONS[decodedCategoryName] || Building2;
  };

  const getBusinessImage = (business: Business) => {
    // Prioritize images array over logo
    if (business.images && business.images.length > 0) return business.images[0];
    if (business.logo_url) return business.logo_url;
    return "/placeholder.svg";
  };

  const IconComponent = getCategoryIcon();

  const translations = {
    fr: {
      establishments: "établissements",
      inCategory: "dans cette catégorie",
      noResults: "Aucun établissement trouvé dans cette catégorie",
      verified: "Vérifié",
      regulated: "Réglementé",
      allCities: "Toutes les villes",
      filterByCity: "Filtrer par ville",
      page: "Page",
      of: "sur",
      previous: "Précédent",
      next: "Suivant",
      showing: "Affichage de",
      to: "à",
      results: "résultats"
    },
    en: {
      establishments: "establishments",
      inCategory: "in this category",
      noResults: "No establishments found in this category",
      verified: "Verified",
      regulated: "Regulated",
      allCities: "All cities",
      filterByCity: "Filter by city",
      page: "Page",
      of: "of",
      previous: "Previous",
      next: "Next",
      showing: "Showing",
      to: "to",
      results: "results"
    },
    ar: {
      establishments: "مؤسسة",
      inCategory: "في هذه الفئة",
      noResults: "لم يتم العثور على مؤسسات في هذه الفئة",
      verified: "موثق",
      regulated: "منظم",
      allCities: "جميع المدن",
      filterByCity: "تصفية حسب المدينة",
      page: "صفحة",
      of: "من",
      previous: "السابق",
      next: "التالي",
      showing: "عرض",
      to: "إلى",
      results: "نتائج"
    }
  };

  const t = translations[language] || translations.fr;

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  const startResult = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endResult = Math.min(currentPage * ITEMS_PER_PAGE, filteredBusinesses.length);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-black pt-28 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-6">
            <div className="rounded-2xl bg-primary/20 p-6 border border-primary/30">
              <IconComponent className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                {getCategoryName()}
              </h1>
              <p className="text-xl text-gray-400">
                <span className="text-primary font-semibold">{filteredBusinesses.length}</span> {t.establishments} {t.inCategory}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters & Results */}
      <section className="py-12 bg-black">
        <div className="container mx-auto px-4">
          {/* City Filter */}
          {availableCities.length > 1 && (
            <div className="mb-8 flex flex-wrap items-center gap-4">
              <label className="text-sm text-gray-400">{t.filterByCity}:</label>
              <Select value={selectedCity} onValueChange={handleCityChange}>
                <SelectTrigger className="w-[220px] bg-card border-border">
                  <SelectValue placeholder={t.allCities} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allCities}</SelectItem>
                  {availableCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {filteredBusinesses.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-400">{t.noResults}</p>
            </div>
          ) : (
            <>
              {/* Results Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedBusinesses.map((business) => (
                  <Link key={business.id} to={`/business/${business.id}`}>
                    <Card className="group h-full overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                      {/* Image - 16:9 aspect ratio */}
                      <div className="aspect-video overflow-hidden bg-muted">
                        <img
                          src={getBusinessImage(business)}
                          alt={business.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                      
                      <CardContent className="p-4">
                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {business.wtuce_status === "verified" && (
                            <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              {t.verified}
                            </Badge>
                          )}
                          {business.is_regulated_activity && (
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              {t.regulated}
                            </Badge>
                          )}
                        </div>

                        {/* Name */}
                        <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {business.name}
                        </h3>

                        {/* Location */}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{business.city}, {business.region}</span>
                        </div>

                        {/* Contact info */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {business.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span className="truncate">{business.phone}</span>
                            </div>
                          )}
                          {business.website && (
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              <span>Web</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex flex-col items-center gap-4">
                  {/* Results count */}
                  <p className="text-sm text-gray-400">
                    {t.showing} {startResult} {t.to} {endResult} {t.of} {filteredBusinesses.length} {t.results}
                  </p>
                  
                  {/* Pagination controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t.previous}
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="gap-1"
                    >
                      {t.next}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Page indicator */}
                  <p className="text-xs text-gray-500">
                    {t.page} {currentPage} {t.of} {totalPages}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CategoryPage;
