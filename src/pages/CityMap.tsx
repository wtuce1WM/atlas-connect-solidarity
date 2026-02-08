import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, X, ExternalLink, BookOpen, Phone, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CityWeather from "@/components/CityWeather";
import TopCityBusinesses from "@/components/TopCityBusinesses";
import symboleMaroc from "@/assets/symbole-maroc.webp";
import logoWatermark from "@/assets/logoGOLDsimpleSML.webp";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Business {
  id: string;
  name: string;
  city: string;
  region: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  skype: string | null;
  main_category: string | null;
  categories: string[] | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  wtuce_status: "verified" | "pending" | null;
  services: string[] | null;
  images: string[] | null;
  rating: number | null;
  priority_score: number | null;
}

interface CityInfo {
  description: string | null;
  official_site_1_name: string | null;
  official_site_1_url: string | null;
  official_site_2_name: string | null;
  official_site_2_url: string | null;
  official_site_3_name: string | null;
  official_site_3_url: string | null;
  official_site_4_name: string | null;
  official_site_4_url: string | null;
  official_site_5_name: string | null;
  official_site_5_url: string | null;
  official_site_6_name: string | null;
  official_site_6_url: string | null;
  wikipedia_fr: string | null;
  wikipedia_en: string | null;
  wikipedia_ar: string | null;
}

const CityMap = () => {
  const { city } = useParams<{ city: string }>();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [cityInfo, setCityInfo] = useState<CityInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  const decodedCity = city ? decodeURIComponent(city) : "";
  
  // Initialize selectedActivities from URL parameter on mount
  useEffect(() => {
    const serviceParam = searchParams.get("service");
    if (serviceParam) {
      setSelectedActivities([decodeURIComponent(serviceParam)]);
    }
  }, [searchParams]);

  // Extract unique main categories from businesses
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    businesses.forEach((business) => {
      if (business.main_category) categories.add(business.main_category);
    });
    return Array.from(categories).sort((a, b) => a.localeCompare(b, "fr"));
  }, [businesses]);

  // Extract unique subcategories based on selected category
  const availableSubcategories = useMemo(() => {
    const subcategories = new Set<string>();
    const filteredByCategory = selectedCategory
      ? businesses.filter((b) => b.main_category === selectedCategory)
      : businesses;
    
    filteredByCategory.forEach((business) => {
      business.categories?.forEach((cat) => subcategories.add(cat));
    });
    return Array.from(subcategories).sort((a, b) => a.localeCompare(b, "fr"));
  }, [businesses, selectedCategory]);

  // Extract unique activities from filtered businesses
  const availableActivities = useMemo(() => {
    const activities = new Set<string>();
    let filtered = businesses;
    
    if (selectedCategory) {
      filtered = filtered.filter((b) => b.main_category === selectedCategory);
    }
    if (selectedSubcategory) {
      filtered = filtered.filter((b) => b.categories?.includes(selectedSubcategory));
    }
    
    filtered.forEach((business) => {
      business.services?.forEach((service) => activities.add(service));
    });
    return Array.from(activities).sort((a, b) => a.localeCompare(b, "fr"));
  }, [businesses, selectedCategory, selectedSubcategory]);

  // Filter businesses by all criteria
  const filteredBusinesses = useMemo(() => {
    let result = businesses;
    
    if (selectedCategory) {
      result = result.filter((b) => b.main_category === selectedCategory);
    }
    if (selectedSubcategory) {
      result = result.filter((b) => b.categories?.includes(selectedSubcategory));
    }
    if (selectedActivities.length > 0) {
      result = result.filter((business) =>
        selectedActivities.some((activity) => business.services?.includes(activity))
      );
    }
    
    return result;
  }, [businesses, selectedCategory, selectedSubcategory, selectedActivities]);

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedActivities([]);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value === "all" ? "" : value);
    setSelectedSubcategory("");
    setSelectedActivities([]);
  };

  const handleSubcategoryChange = (value: string) => {
    setSelectedSubcategory(value === "all" ? "" : value);
    setSelectedActivities([]);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!decodedCity) return;

      // Fetch businesses - ordered by verified status then priority score
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("id, name, city, region, address, phone, whatsapp, skype, main_category, categories, latitude, longitude, google_maps_url, wtuce_status, services, images, rating, priority_score")
        .eq("is_active", true)
        .ilike("city", decodedCity)
        .order("wtuce_status", { ascending: true, nullsFirst: false })
        .order("priority_score", { ascending: false });

      if (businessError) {
        console.error("Error fetching businesses:", businessError);
      } else {
        setBusinesses(businessData || []);
      }

      // Fetch city info
      const { data: cityData, error: cityError } = await supabase
        .from("cities")
        .select("description, official_site_1_name, official_site_1_url, official_site_2_name, official_site_2_url, official_site_3_name, official_site_3_url, official_site_4_name, official_site_4_url, official_site_5_name, official_site_5_url, official_site_6_name, official_site_6_url, wikipedia_fr, wikipedia_en, wikipedia_ar")
        .ilike("name_fr", decodedCity)
        .maybeSingle();

      if (cityError) {
        console.error("Error fetching city info:", cityError);
      } else if (cityData) {
        setCityInfo(cityData);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [decodedCity]);

  // Build Google Maps embed URL - dynamic based on selected business
  const getMapEmbedUrl = () => {
    // If a business is selected, show its location
    if (selectedBusiness) {
      // Try to extract place ID or coordinates from google_maps_url
      if (selectedBusiness.google_maps_url) {
        // If URL contains place/, use place mode
        const placeMatch = selectedBusiness.google_maps_url.match(/place\/([^\/]+)/);
        if (placeMatch) {
          const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
          return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(placeName)}&zoom=17`;
        }
        // If URL contains coordinates (@lat,lng)
        const coordMatch = selectedBusiness.google_maps_url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (coordMatch) {
          return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=${coordMatch[1]},${coordMatch[2]}&zoom=17&maptype=roadmap`;
        }
      }
      // Fallback to lat/lng if available
      if (selectedBusiness.latitude && selectedBusiness.longitude) {
        return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${selectedBusiness.latitude},${selectedBusiness.longitude}&zoom=17`;
      }
      // Last fallback: search by name and address
      const query = selectedBusiness.address 
        ? `${selectedBusiness.name}, ${selectedBusiness.address}`
        : `${selectedBusiness.name}, ${selectedBusiness.city}, Maroc`;
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(query)}&zoom=17`;
    }

    // Default: show city overview
    if (businesses.length === 0) {
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(decodedCity + ", Maroc")}&zoom=13`;
    }

    // If we have businesses with coordinates, center on the first one
    const businessWithCoords = businesses.find(b => b.latitude && b.longitude);
    if (businessWithCoords) {
      return `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=entreprises+${encodeURIComponent(decodedCity)}&center=${businessWithCoords.latitude},${businessWithCoords.longitude}&zoom=14`;
    }

    return `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=entreprises+${encodeURIComponent(decodedCity + ", Maroc")}&zoom=13`;
  };

  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
    // Scroll to map
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const clearSelectedBusiness = () => {
    setSelectedBusiness(null);
  };

  const handleOpenInMaps = (business: Business) => {
    const query = business.latitude && business.longitude
      ? `${business.latitude},${business.longitude}`
      : encodeURIComponent(`${business.name}, ${business.address || business.city}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-morocco-red to-morocco-green relative">
      {/* Background decorative emblem */}
      <div 
        className="absolute top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] opacity-40 pointer-events-none"
        style={{
          backgroundImage: `url(${symboleMaroc})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <Header variant="morocco" />

      <main className="container mx-auto px-4 py-24 relative z-10">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-white hover:text-gold mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <MapPin className="h-8 w-8 text-gold" />
            Entreprises à {decodedCity}
          </h1>
          <p className="text-white/80 mt-2">
            {businesses.length} entreprise{businesses.length > 1 ? "s" : ""} dans l'annuaire WTUCE
          </p>
        </div>

        {/* Top City Businesses */}
        <TopCityBusinesses 
          businesses={businesses} 
          cityName={decodedCity} 
          onSelectBusiness={handleSelectBusiness}
          selectedBusinessId={selectedBusiness?.id}
        />

        {/* Map + Business list - Full width */}
        <div className="space-y-6">
          <Card className="relative">
            <CardContent className="p-0">
              {/* Selected business indicator */}
              {selectedBusiness && (
                <div className="absolute top-2 left-2 right-2 z-10 bg-white text-black px-4 py-3 rounded-md shadow-lg">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-bold truncate">{selectedBusiness.name}</span>
                    <div className="flex items-center gap-3 text-xs flex-shrink-0">
                      {selectedBusiness.phone && (
                        <a href={`tel:${selectedBusiness.phone}`} className="flex items-center gap-1 hover:text-primary">
                          <Phone className="h-3 w-3" />
                          {selectedBusiness.phone}
                        </a>
                      )}
                      {selectedBusiness.whatsapp && (
                        <a href={`https://wa.me/${selectedBusiness.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 hover:text-green-700 font-bold">
                          <Phone className="h-3 w-3" />
                          WhatsApp
                        </a>
                      )}
                      {selectedBusiness.skype && (
                        <a href={`skype:${selectedBusiness.skype}?chat`} className="flex items-center gap-1 text-[#00AFF0] hover:text-[#00AFF0]/80">
                          <Phone className="h-3 w-3" />
                          Skype
                        </a>
                      )}
                      <button 
                        onClick={clearSelectedBusiness}
                        className="hover:bg-black/10 rounded p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <iframe
                src={getMapEmbedUrl()}
                className="w-full h-[500px] border-0 rounded-lg"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={selectedBusiness ? `Localisation de ${selectedBusiness.name}` : `Carte des entreprises à ${decodedCity}`}
              />
            </CardContent>
          </Card>

          {/* Filters + Business list */}
          <div className="space-y-4">
            {/* Category & Subcategory Filters */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {/* Main Category Filter */}
                <div className="flex-1 min-w-[140px]">
                  <label className="text-sm font-medium text-white mb-1.5 block">Catégorie</label>
                  <Select value={selectedCategory || "all"} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {availableCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subcategory Filter */}
                {availableSubcategories.length > 0 && (
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-sm font-medium text-white mb-1.5 block">Sous-catégorie</label>
                    <Select value={selectedSubcategory || "all"} onValueChange={handleSubcategoryChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Toutes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        {availableSubcategories.map((subcategory) => (
                          <SelectItem key={subcategory} value={subcategory}>
                            {subcategory}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Clear All Button */}
              {(selectedCategory || selectedSubcategory || selectedActivities.length > 0) && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Effacer les filtres
                </button>
              )}

              {/* Activity Filters - Only show when category is selected */}
              {selectedCategory && availableActivities.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white mb-2">Activités</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableActivities.slice(0, 8).map((activity) => (
                      <label
                        key={activity}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-pointer transition-colors text-xs ${
                          selectedActivities.includes(activity)
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-background border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        <Checkbox
                          checked={selectedActivities.includes(activity)}
                          onCheckedChange={() => toggleActivity(activity)}
                          className="h-3 w-3"
                        />
                        {activity}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Business list */}
            <h2 className="text-lg font-semibold text-white mb-3">
              Entreprises ({filteredBusinesses.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[1200px] overflow-y-auto pr-2">
              {filteredBusinesses.map((business) => (
                <Link key={business.id} to={`/business/${business.id}`}>
                  <Card className="group h-full overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 relative">
                    {/* Image - 16:9 aspect ratio */}
                    {business.images && business.images.length > 0 && (
                      <div className="aspect-video overflow-hidden bg-muted relative">
                        <img
                          src={business.images[0]}
                          alt={business.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                        {/* Watermark logo for verified businesses - top right of image */}
                        {business.wtuce_status === "verified" && (
                          <img 
                            src={logoWatermark} 
                            alt="" 
                            className="absolute top-2 right-2 w-10 h-10 object-contain opacity-90 pointer-events-none"
                          />
                        )}
                      </div>
                    )}
                    
                    <CardContent className="p-4">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {business.wtuce_status === "verified" && (
                          <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Vérifié
                          </Badge>
                        )}
                        {business.categories && business.categories.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {business.categories[0]}
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
                        <span className="truncate">{business.address || business.city}</span>
                      </div>

                      {/* Contact info */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
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
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelectBusiness(business);
                        }}
                        className={`w-full text-xs py-1.5 px-2 rounded transition-colors flex items-center justify-center gap-1 ${
                          selectedBusiness?.id === business.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary"
                        }`}
                      >
                        <MapPin className="h-3 w-3" />
                        {selectedBusiness?.id === business.id ? "Affiché sur la carte" : "Voir sur la carte"}
                      </button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {filteredBusinesses.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  {selectedActivities.length > 0
                    ? "Aucune entreprise pour ces activités"
                    : `Aucune entreprise trouvée à ${decodedCity}`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* City Info Section - Full width below directory */}
        <div className="mt-12 space-y-8">
          {/* City Description - Full width */}
          {cityInfo?.description && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">À propos de {decodedCity}</h3>
                <div 
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: cityInfo.description }}
                />
              </CardContent>
            </Card>
          )}

          {/* Weather, Official Sites, Wikipedia - 3 columns */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Weather */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Météo</h3>
              <CityWeather city={decodedCity} />
            </div>

            {/* Official Sites */}
            {cityInfo && [1, 2, 3, 4, 5, 6].some((num) => {
              const name = cityInfo[`official_site_${num}_name` as keyof CityInfo];
              const url = cityInfo[`official_site_${num}_url` as keyof CityInfo];
              return name && url;
            }) && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Sites officiels</h3>
                <Card className="bg-morocco-red/90 border-white/10">
                  <CardContent className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5, 6].map((num) => {
                      const name = cityInfo[`official_site_${num}_name` as keyof CityInfo] as string | null;
                      const url = cityInfo[`official_site_${num}_url` as keyof CityInfo] as string | null;
                      if (!name || !url) return null;
                      return (
                        <a
                          key={num}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-white hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {name}
                        </a>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Wikipedia Link */}
            {cityInfo && (() => {
              const wikipediaUrl = language === "ar" 
                ? cityInfo.wikipedia_ar 
                : language === "en" 
                  ? cityInfo.wikipedia_en 
                  : cityInfo.wikipedia_fr;
              
              if (!wikipediaUrl) return null;
              
              const label = language === "ar" 
                ? "ويكيبيديا" 
                : language === "en" 
                  ? "Wikipedia" 
                  : "Wikipédia";
              
              return (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">En savoir plus</h3>
                  <Card className="bg-morocco-red/90 border-white/10">
                    <CardContent className="p-4">
                      <a
                        href={wikipediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-white hover:underline"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        {label}
                      </a>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
          </div>
        </div>
      </main>

      {/* Bottom decorative emblem */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url(${symboleMaroc})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat'
        }}
      />

      <Footer variant="morocco" />
    </div>
  );
};

export default CityMap;
