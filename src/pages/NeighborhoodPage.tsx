import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, ChevronLeft, ChevronRight, X, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BusinessCard, { Gamme } from "@/components/BusinessCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  logo_url: string | null;
  gamme_id: string | null;
  neighborhood: string | null;
}

const ITEMS_PER_PAGE = 20;

const NeighborhoodPage = () => {
  const { neighborhood } = useParams<{ neighborhood: string }>();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  const decodedNeighborhood = neighborhood ? decodeURIComponent(neighborhood) : "";
  const cityParam = searchParams.get("city") ? decodeURIComponent(searchParams.get("city")!) : "";

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    businesses.forEach((b) => {
      if (b.main_category) categories.add(b.main_category);
    });
    return Array.from(categories).sort((a, b) => a.localeCompare(b, "fr"));
  }, [businesses]);

  const filteredBusinesses = useMemo(() => {
    if (!selectedCategory) return businesses;
    return businesses.filter((b) => b.main_category === selectedCategory);
  }, [businesses, selectedCategory]);

  const totalPages = Math.ceil(filteredBusinesses.length / ITEMS_PER_PAGE);
  const paginatedBusinesses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBusinesses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBusinesses, currentPage]);

  const startResult = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endResult = Math.min(currentPage * ITEMS_PER_PAGE, filteredBusinesses.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!decodedNeighborhood) return;

      const { data: gammesData } = await supabase
        .from("gammes")
        .select("id, name_fr, color_hex")
        .order("sort_order", { ascending: true });

      if (gammesData) setGammes(gammesData);

      let query = supabase
        .from("businesses")
        .select("id, name, city, region, address, phone, whatsapp, skype, main_category, categories, latitude, longitude, google_maps_url, wtuce_status, services, images, rating, priority_score, logo_url, gamme_id, neighborhood")
        .eq("is_active", true)
        .ilike("neighborhood", decodedNeighborhood);

      if (cityParam) {
        query = query.ilike("city", cityParam);
      }

      const { data: businessData, error } = await query
        .order("wtuce_status", { ascending: true, nullsFirst: false })
        .order("priority_score", { ascending: false });

      if (error) {
        console.error("Error fetching businesses:", error);
      } else {
        setBusinesses(businessData || []);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [decodedNeighborhood, cityParam]);

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

  // Get the city name from the first business (all should share the same neighborhood)
  const cityName = cityParam || (businesses.length > 0 ? businesses[0].city : "");

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
        : `${selectedBusiness.name}, ${cityName}, Maroc`;
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(query)}&zoom=17`;
    }

    const searchQuery = `${decodedNeighborhood} ${cityName}`;
    const businessWithCoords = businesses.find(b => b.latitude && b.longitude);
    if (businessWithCoords) {
      return `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(searchQuery)}&center=${businessWithCoords.latitude},${businessWithCoords.longitude}&zoom=15`;
    }
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(searchQuery + ", Maroc")}&zoom=15`;
  };

  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const clearSelectedBusiness = () => {
    setSelectedBusiness(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-24">
        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <MapPin className="h-8 w-8 text-primary" />
            {language === "fr"
              ? `Quartier ${decodedNeighborhood}`
              : language === "ar"
                ? `حي ${decodedNeighborhood}`
                : `${decodedNeighborhood} Neighborhood`}
          </h1>
          {cityName && (
            <p className="text-muted-foreground mt-2">
              {cityName} — {filteredBusinesses.length} établissement{filteredBusinesses.length > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Google Maps */}
        <Card className="relative mb-6">
          <CardContent className="p-0">
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
                </div>
              </div>
            )}
            <iframe
              src={getMapEmbedUrl()}
              className="w-full h-[500px] border-0 rounded-lg"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={selectedBusiness ? `Localisation de ${selectedBusiness.name}` : `Carte du quartier ${decodedNeighborhood}`}
            />
          </CardContent>
        </Card>

        {/* Filters */}
        {availableCategories.length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-1">
              {language === "fr" ? "Catégorie" : language === "ar" ? "الفئة" : "Category"}
            </label>
            <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {language === "fr" ? "Toutes les catégories" : language === "ar" ? "جميع الفئات" : "All categories"}
                </SelectItem>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Results count */}
        {filteredBusinesses.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            {language === "fr"
              ? `Affichage ${startResult}-${endResult} sur ${filteredBusinesses.length} résultat${filteredBusinesses.length > 1 ? "s" : ""}`
              : language === "ar"
                ? `عرض ${startResult}-${endResult} من ${filteredBusinesses.length} نتيجة`
                : `Showing ${startResult}-${endResult} of ${filteredBusinesses.length} result${filteredBusinesses.length > 1 ? "s" : ""}`}
          </p>
        )}

        {/* Business Grid */}
        {filteredBusinesses.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {language === "fr"
                ? "Aucun établissement trouvé dans ce quartier"
                : language === "ar"
                  ? "لم يتم العثور على مؤسسات في هذا الحي"
                  : "No businesses found in this neighborhood"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedBusinesses.map((business) => (
              <BusinessCard 
                key={business.id} 
                business={business} 
                gammes={gammes} 
                verifiedLabel="Vérifié"
                showMapButton
                onSelectBusiness={handleSelectBusiness}
                selectedBusinessId={selectedBusiness?.id}
                mapButtonLabels={{ view: "Voir sur la carte", shown: "Affiché sur la carte" }}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => goToPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default NeighborhoodPage;
