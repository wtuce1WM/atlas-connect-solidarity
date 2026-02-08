import { useParams, Link } from "react-router-dom";
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
import { Loader2, MapPin, Phone, Building2, ShieldCheck, ChevronLeft, ChevronRight, Wrench } from "lucide-react";
import logoWatermark from "@/assets/logoGOLD-watermark.webp";
import symboleMaroc from "@/assets/symbole-maroc-3.webp";

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

const ITEMS_PER_PAGE = 20;

const ServicePage = () => {
  const { serviceName } = useParams<{ serviceName: string }>();
  const { language } = useLanguage();
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [citiesWithPriority, setCitiesWithPriority] = useState<{ name: string; priority: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCity, setSelectedCity] = useState<string>("all");

  const decodedServiceName = serviceName ? decodeURIComponent(serviceName) : "";

  // Get cities available for this service, sorted by priority score
  const availableCities = useMemo(() => {
    const businessCities = new Set(allBusinesses.map(b => b.city));
    return citiesWithPriority
      .filter(c => businessCities.has(c.name))
      .sort((a, b) => b.priority - a.priority)
      .map(c => c.name);
  }, [allBusinesses, citiesWithPriority]);

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
      if (!decodedServiceName) return;
      
      setIsLoading(true);
      try {
        // Fetch cities with priority scores
        const { data: citiesData } = await supabase
          .from("cities")
          .select("name_fr, priority_score")
          .order("priority_score", { ascending: false });

        if (citiesData) {
          setCitiesWithPriority(
            citiesData.map(c => ({ name: c.name_fr, priority: c.priority_score || 0 }))
          );
        }

        // Fetch ALL businesses with this service
        const { data: businessData, error } = await supabase
          .from("businesses")
          .select("id, name, description, city, region, phone, website, logo_url, images, main_category, categories, wtuce_status, is_regulated_activity")
          .eq("is_active", true)
          .contains("services", [decodedServiceName])
          .order("wtuce_status", { ascending: true })
          .order("priority_score", { ascending: false });

        if (error) throw error;
        
        // Filter out businesses without images
        const businessesWithImages = (businessData || []).filter(b => 
          (b.images && b.images.length > 0)
        );
        setAllBusinesses(businessesWithImages);
      } catch (error) {
        console.error("Error fetching service data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [decodedServiceName]);

  const getBusinessImage = (business: Business) => {
    if (business.images && business.images.length > 0) return business.images[0];
    if (business.logo_url) return business.logo_url;
    return "/placeholder.svg";
  };

  const translations = {
    fr: {
      establishments: "établissements",
      withService: "proposant ce service",
      noResults: "Aucun établissement trouvé pour ce service",
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
      withService: "offering this service",
      noResults: "No establishments found for this service",
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
      withService: "تقدم هذه الخدمة",
      noResults: "لم يتم العثور على مؤسسات لهذه الخدمة",
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
      <section className="bg-black pt-28 pb-8 lg:pb-16 relative overflow-hidden">
        {/* Background decorative emblem - hidden on mobile and tablet */}
        <div 
          className="hidden lg:block absolute top-28 left-1/2 -translate-x-1/2 w-[120px] h-[120px] opacity-100 pointer-events-none"
          style={{
            backgroundImage: `url(${symboleMaroc})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left gap-4 lg:gap-6">
            <div className="rounded-xl lg:rounded-2xl bg-gold/20 p-3 lg:p-6 border border-gold/30 flex-shrink-0">
              <Wrench className="h-8 w-8 lg:h-12 lg:w-12 text-gold" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-white mb-1 lg:mb-2">
                {decodedServiceName}
              </h1>
              <p className="text-base lg:text-xl text-gray-400">
                <span className="text-gold font-semibold">{filteredBusinesses.length}</span> {t.establishments} {t.withService}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters & Results */}
      <section className="py-6 lg:py-12 bg-black">
        <div className="container mx-auto px-4">
          {/* City Filter */}
          {availableCities.length > 1 && (
            <div className="mb-8 flex flex-col items-center sm:flex-row sm:items-center gap-2 sm:gap-4">
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
                    <Card className="group h-full overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 relative">
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
                      
                      <CardContent className="p-4 relative">
                        {/* Watermark logo for verified businesses */}
                        {business.wtuce_status === "verified" && (
                          <img 
                            src={logoWatermark} 
                            alt="" 
                            className="absolute bottom-2 right-2 w-16 h-16 object-contain opacity-80 pointer-events-none"
                          />
                        )}
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
                        <h3 className={`font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors ${business.wtuce_status === "verified" ? "text-foreground font-bold" : "text-foreground"}`}>
                          {business.name}
                        </h3>

                        {/* Location */}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{business.city}, {business.region}</span>
                        </div>

                        {/* Contact info */}
                        {business.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span className="truncate">{business.phone}</span>
                          </div>
                        )}
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

export default ServicePage;
