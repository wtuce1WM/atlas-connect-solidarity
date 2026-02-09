import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Phone, Building2, ChevronLeft, ChevronRight, Sun, X, ArrowLeft } from "lucide-react";
import { ICONS } from "@/components/staff/IconPicker";
import symboleMaroc from "@/assets/symbole-maroc-3.webp";
import BusinessCard, { BusinessCardData, Gamme } from "@/components/BusinessCard";

interface Business {
  id: string;
  name: string;
  description: string | null;
  city: string;
  region: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  skype: string | null;
  website: string | null;
  logo_url: string | null;
  images: string[] | null;
  main_category: string | null;
  categories: string[] | null;
  wtuce_status: string | null;
  is_regulated_activity: boolean | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  opening_hours: unknown;
  show_opening_hours: boolean | null;
  rating: number | null;
  gamme_id: string | null;
}

// Gamme interface is imported from BusinessCard

const ITEMS_PER_PAGE = 20;

const ServicePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [citiesWithPriority, setCitiesWithPriority] = useState<{ name: string; priority: number; latitude: number | null; longitude: number | null }[]>([]);
  const [serviceIcon, setServiceIcon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    const params = new URLSearchParams(location.search);
    return params.get("city") || "all";
  });
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [gammes, setGammes] = useState<Gamme[]>([]);

  // Extract service name from URL path (handles special characters like /, &, etc.)
  const decodedServiceName = useMemo(() => {
    const path = location.pathname;
    const prefix = "/service/";
    if (path.startsWith(prefix)) {
      return decodeURIComponent(path.slice(prefix.length));
    }
    return "";
  }, [location.pathname]);

  // Get the icon component from the ICONS map
  const ServiceIconComponent = serviceIcon && ICONS[serviceIcon] ? ICONS[serviceIcon] : Sun;

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
        // Fetch service icon from database - prioritize entries with an icon
        const { data: serviceData } = await supabase
          .from("services")
          .select("icon")
          .eq("name_fr", decodedServiceName)
          .not("icon", "is", null)
          .limit(1)
          .maybeSingle();

        if (serviceData?.icon) {
          setServiceIcon(serviceData.icon);
        } else {
          // Fallback: try to get any service with this name (even without icon)
          const { data: fallbackData } = await supabase
            .from("services")
            .select("icon")
            .eq("name_fr", decodedServiceName)
            .limit(1)
            .maybeSingle();
          
          if (fallbackData?.icon) {
            setServiceIcon(fallbackData.icon);
          }
        }

        // Fetch cities with priority scores
        const { data: citiesData } = await supabase
          .from("cities")
          .select("name_fr, priority_score, latitude, longitude")
          .order("priority_score", { ascending: false });

        if (citiesData) {
          setCitiesWithPriority(
            citiesData.map(c => ({ name: c.name_fr, priority: c.priority_score || 0, latitude: c.latitude, longitude: c.longitude }))
          );
        }

        // Fetch gammes
        const { data: gammesData } = await supabase
          .from("gammes")
          .select("id, name_fr, color_hex")
          .order("sort_order", { ascending: true });

        if (gammesData) {
          setGammes(gammesData);
        }

        // Fetch ALL businesses with this service
        const { data: businessData, error } = await supabase
          .from("businesses")
          .select("id, name, description, city, region, address, phone, whatsapp, skype, website, logo_url, images, main_category, categories, wtuce_status, is_regulated_activity, latitude, longitude, google_maps_url, opening_hours, show_opening_hours, rating, gamme_id")
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

  // getBusinessImage and getBusinessGamme are now handled by BusinessCard component

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
    setSelectedBusiness(null);
  };

  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const clearSelectedBusiness = () => {
    setSelectedBusiness(null);
  };

  const getMapEmbedUrl = () => {
    if (selectedBusiness) {
      if (selectedBusiness.google_maps_url) {
        const placeMatch = selectedBusiness.google_maps_url.match(/place\/([^\/]+)/);
        if (placeMatch) {
          const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
          return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(placeName)}&zoom=17`;
        }
        const coordMatch = selectedBusiness.google_maps_url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (coordMatch) {
          return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=${coordMatch[1]},${coordMatch[2]}&zoom=17&maptype=roadmap`;
        }
      }
      if (selectedBusiness.latitude && selectedBusiness.longitude) {
        return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${selectedBusiness.latitude},${selectedBusiness.longitude}&zoom=17`;
      }
      const query = selectedBusiness.address 
        ? `${selectedBusiness.name}, ${selectedBusiness.address}`
        : `${selectedBusiness.name}, ${selectedBusiness.city}, Maroc`;
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(query)}&zoom=17`;
    }
    // When a city is selected, center on the city; otherwise center on Morocco
    if (selectedCity !== "all") {
      const cityData = citiesWithPriority.find(c => c.name === selectedCity);
      if (cityData?.latitude && cityData?.longitude) {
        return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=${cityData.latitude},${cityData.longitude}&zoom=13&maptype=roadmap`;
      }
      // Fallback: search by city name
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(selectedCity + ", Maroc")}&zoom=13`;
    }
    return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=31.7917,-7.0926&zoom=6&maptype=roadmap`;
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
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-white/60 hover:text-gold mb-4 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left gap-4 lg:gap-6">
            <div className="rounded-xl lg:rounded-2xl bg-gold/20 p-3 lg:p-6 border border-gold/30 flex-shrink-0">
              <ServiceIconComponent className="h-8 w-8 lg:h-12 lg:w-12 text-gold" />
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
          {/* Google Maps */}
          <Card className="mb-8 relative">
            <CardContent className="p-0">
              {/* Selected business indicator */}
              {selectedBusiness && (
                <div className="absolute top-2 right-2 z-10 bg-white text-black px-4 py-3 rounded shadow-lg max-w-xs">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-sm font-bold">{selectedBusiness.name}</span>
                    <button 
                      onClick={clearSelectedBusiness}
                      className="hover:bg-black/10 rounded p-1 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-1 text-xs">
                    {selectedBusiness.address && (
                      <div className="flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{selectedBusiness.address}</span>
                      </div>
                    )}
                    {selectedBusiness.phone && (
                      <a href={`tel:${selectedBusiness.phone}`} className="flex items-center gap-1 hover:text-primary">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        {selectedBusiness.phone}
                      </a>
                    )}
                    {selectedBusiness.whatsapp && (
                      <a href={`https://wa.me/${selectedBusiness.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 hover:text-green-700 font-bold">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        WhatsApp: {selectedBusiness.whatsapp}
                      </a>
                    )}
                    {selectedBusiness.skype && (
                      <a href={`skype:${selectedBusiness.skype}?chat`} className="flex items-center gap-1 text-[#00AFF0] hover:text-[#00AFF0]/80">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        Skype: {selectedBusiness.skype}
                      </a>
                    )}
                    {selectedBusiness.show_opening_hours && selectedBusiness.opening_hours && (
                      <div className="pt-1 border-t border-gray-200 mt-1">
                        <span className="font-medium">Horaires:</span>
                        <div className="text-[10px] mt-0.5">
                          {(() => {
                            const hours = selectedBusiness.opening_hours as Record<string, { open: string; close: string }>;
                            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                            const dayLabels: Record<string, string> = {
                              monday: 'Lun', tuesday: 'Mar', wednesday: 'Mer', 
                              thursday: 'Jeu', friday: 'Ven', saturday: 'Sam', sunday: 'Dim'
                            };
                            return days.map(day => {
                              const dayData = hours[day];
                              if (!dayData) return null;
                              return (
                                <div key={day} className="flex justify-between gap-2">
                                  <span>{dayLabels[day]}</span>
                                  <span>{dayData.open && dayData.close ? `${dayData.open}-${dayData.close}` : 'Fermé'}</span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <iframe
                src={getMapEmbedUrl()}
                className="w-full h-[400px] border-0 rounded-lg"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={selectedBusiness ? `Localisation de ${selectedBusiness.name}` : `Carte ${decodedServiceName}${selectedCity !== "all" ? ` à ${selectedCity}` : ""}`}
              />
            </CardContent>
          </Card>

          {/* City Quick Links */}
          {availableCities.length > 1 && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant={selectedCity === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCityChange("all")}
                  className={selectedCity === "all" 
                    ? "bg-gold hover:bg-gold/90 text-black" 
                    : "border-gold/30 text-gold hover:bg-gold/10 hover:border-gold"
                  }
                >
                  {t.allCities}
                </Button>
                {availableCities.map((city) => (
                  <Button
                    key={city}
                    variant={selectedCity === city ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCityChange(city)}
                    className={selectedCity === city 
                      ? "bg-gold hover:bg-gold/90 text-black" 
                      : "border-border text-muted-foreground hover:bg-gold/10 hover:border-gold hover:text-gold"
                    }
                  >
                    {city}
                  </Button>
                ))}
              </div>
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
                  <BusinessCard
                    key={business.id}
                    business={business}
                    gammes={gammes}
                    verifiedLabel={t.verified}
                    selectedBusinessId={selectedBusiness?.id}
                    onSelectBusiness={handleSelectBusiness}
                    showMapButton={true}
                    mapButtonLabels={{
                      view: language === "fr" ? "Voir sur la carte" : language === "ar" ? "عرض على الخريطة" : "View on map",
                      shown: language === "fr" ? "Affiché sur la carte" : language === "ar" ? "معروض على الخريطة" : "Shown on map"
                    }}
                  />
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
