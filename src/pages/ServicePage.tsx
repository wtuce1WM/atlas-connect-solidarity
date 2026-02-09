import { useParams, Link, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Phone, Building2, ShieldCheck, ChevronLeft, ChevronRight, Sun, X, Star } from "lucide-react";
import { ICONS } from "@/components/staff/IconPicker";
import logoWatermark from "@/assets/logoGOLDsimpleSML.webp";
import symboleMaroc from "@/assets/symbole-maroc-3.webp";

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

interface Gamme {
  id: string;
  name_fr: string;
  color_hex: string | null;
}

const ITEMS_PER_PAGE = 20;

const ServicePage = () => {
  const location = useLocation();
  const { language } = useLanguage();
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [citiesWithPriority, setCitiesWithPriority] = useState<{ name: string; priority: number }[]>([]);
  const [serviceIcon, setServiceIcon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCity, setSelectedCity] = useState<string>("all");
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
        // Fetch service icon from database
        const { data: serviceData } = await supabase
          .from("services")
          .select("icon")
          .eq("name_fr", decodedServiceName)
          .maybeSingle();

        if (serviceData?.icon) {
          setServiceIcon(serviceData.icon);
        }

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

  const getBusinessImage = (business: Business) => {
    if (business.images && business.images.length > 0) return business.images[0];
    if (business.logo_url) return business.logo_url;
    return "/placeholder.svg";
  };

  const getBusinessGamme = (business: Business): Gamme | null => {
    if (!business.gamme_id) return null;
    return gammes.find(g => g.id === business.gamme_id) || null;
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
    // Center on Morocco (lat: 31.7917, lng: -7.0926) when no city selected
    const centerParam = selectedCity !== "all" ? "" : "&center=31.7917,-7.0926";
    return `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(decodedServiceName)}+${selectedCity !== "all" ? encodeURIComponent(selectedCity) : "Maroc"}${centerParam}&zoom=${selectedCity !== "all" ? 13 : 6}`;
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
                  <Link key={business.id} to={`/business/${business.id}`}>
                    <Card className="group h-full overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 relative">
                      {/* Image - 16:9 aspect ratio */}
                      <div className="aspect-video overflow-hidden bg-muted relative">
                        <img
                          src={getBusinessImage(business)}
                          alt={business.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                        {/* Rating - top left */}
                        {business.rating && (
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1 z-10">
                            <Star className="h-4 w-4 fill-gold text-gold" />
                            <span className="text-gold font-bold text-sm">{business.rating}/20</span>
                          </div>
                        )}
                        {/* Watermark logo for verified businesses - top right of image */}
                        {business.wtuce_status === "verified" && (
                          <img 
                            src={logoWatermark} 
                            alt="" 
                            className="absolute top-2 right-2 w-10 h-10 object-contain opacity-90 pointer-events-none"
                          />
                        )}
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
                          {business.categories && business.categories.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {business.categories[0]}
                            </Badge>
                          )}
                          {(() => {
                            const gamme = getBusinessGamme(business);
                            if (gamme) {
                              return (
                                <Badge 
                                  className="text-xs text-black border border-black"
                                  style={{ backgroundColor: gamme.color_hex || '#666666' }}
                                >
                                  {gamme.name_fr}
                                </Badge>
                              );
                            }
                            return null;
                          })()}
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
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {business.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[120px]">{business.phone}</span>
                            </div>
                          )}
                          {business.whatsapp && (
                            <a
                              href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 text-[#25D366] hover:opacity-80 transition-opacity"
                              title="WhatsApp"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#25D366">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                              <span className="text-[#25D366] font-bold">WhatsApp</span>
                            </a>
                          )}
                          {business.skype && (
                            <a
                              href={`skype:${business.skype}?chat`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 text-[#00AFF0] hover:opacity-80 transition-opacity"
                              title="Skype"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#00AFF0">
                                <path d="M12.069 18.874c-4.023 0-5.82-1.979-5.82-3.464 0-.765.561-1.296 1.333-1.296 1.723 0 1.273 2.477 4.487 2.477 1.641 0 2.55-.895 2.55-1.811 0-.551-.269-1.16-1.354-1.429l-3.576-.895c-2.88-.724-3.403-2.286-3.403-3.751 0-3.047 2.861-4.191 5.549-4.191 2.471 0 5.393 1.373 5.393 3.199 0 .784-.688 1.24-1.453 1.24-1.469 0-1.198-2.037-4.164-2.037-1.469 0-2.292.664-2.292 1.617s1.153 1.258 2.157 1.487l2.637.587c2.891.649 3.624 2.346 3.624 3.944 0 2.476-1.902 4.324-5.722 4.324m11.084-4.882l-.029.135-.044-.24c.015.045.044.074.059.12.12-.675.181-1.363.181-2.052 0-1.529-.301-3.012-.898-4.42-.569-1.348-1.395-2.562-2.427-3.596-1.049-1.033-2.247-1.856-3.595-2.426-1.318-.631-2.801-.93-4.328-.93-.72 0-1.444.07-2.143.204l.119.06-.239-.033.119-.025C8.91.274 7.829 0 6.731 0c-1.789 0-3.47.698-4.736 1.967C.729 3.235.032 4.923.032 6.716c0 1.143.292 2.265.844 3.258l.02-.124.041.239-.06-.115c-.114.645-.172 1.299-.172 1.955 0 1.53.3 3.017.884 4.416.568 1.362 1.378 2.576 2.427 3.609a11.92 11.92 0 003.58 2.442c1.404.6 2.886.93 4.404.93.599 0 1.229-.06 1.868-.172l-.119-.062.239.033-.119.024c1.002.569 2.126.871 3.294.871 1.783 0 3.459-.69 4.733-1.963 1.259-1.259 1.962-2.951 1.962-4.749 0-1.138-.299-2.262-.853-3.266"/>
                              </svg>
                              <span className="text-[#00AFF0] font-bold">Skype</span>
                            </a>
                          )}
                        </div>

                        {/* View on map button */}
                        {(business.google_maps_url || (business.latitude && business.longitude)) && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSelectBusiness(business);
                            }}
                            className={`mt-3 flex items-center gap-1 text-xs font-bold transition-colors ${
                              selectedBusiness?.id === business.id
                                ? "text-gold"
                                : "text-muted-foreground hover:text-gold"
                            }`}
                          >
                            <MapPin className="h-3 w-3" />
                            {selectedBusiness?.id === business.id 
                              ? (language === "fr" ? "Affiché sur la carte" : language === "ar" ? "معروض على الخريطة" : "Shown on map")
                              : (language === "fr" ? "Voir sur la carte" : language === "ar" ? "عرض على الخريطة" : "View on map")
                            }
                          </button>
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
