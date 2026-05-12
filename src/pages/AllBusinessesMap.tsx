import { useEffect, useState, useMemo } from "react";
import { businessUrl } from "@/lib/businessUrl";
import { cleanPhone } from "@/lib/phoneUtils";
import { Link } from "react-router-dom";
import { Loader2, MapPin, X, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import symboleMaroc from "@/assets/symbole-maroc.webp";

interface Business {
  id: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  main_category: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  images: string[] | null;
  logo_url: string | null;
  neighborhood: string | null;
}



const AllBusinessesMap = () => {
  const { t } = useLanguage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, city, address, phone, whatsapp, main_category, latitude, longitude, google_maps_url, images, logo_url, neighborhood")
        .eq("is_active", true)
        .order("city")
        .order("name");

      if (!error && data) setBusinesses(data);
      setIsLoading(false);
    };
    fetchBusinesses();
  }, []);

  const cities = useMemo(() => 
    [...new Set(businesses.map(b => b.city))].sort((a, b) => a.localeCompare(b, "fr")),
    [businesses]
  );

  const categories = useMemo(() => 
    [...new Set(businesses.map(b => b.main_category).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "fr")),
    [businesses]
  );

  const filtered = useMemo(() => {
    let result = businesses;
    if (selectedCity) result = result.filter(b => b.city === selectedCity);
    if (selectedCategory) result = result.filter(b => b.main_category === selectedCategory);
    return result;
  }, [businesses, selectedCity, selectedCategory]);

  const withGPS = useMemo(() => filtered.filter(b => b.latitude && b.longitude), [filtered]);

  const getMapUrl = () => {
    if (selectedBusiness) {
      if (selectedBusiness.latitude && selectedBusiness.longitude) {
        return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_EMBED_KEY}&q=${selectedBusiness.latitude},${selectedBusiness.longitude}&zoom=16`;
      }
      const q = encodeURIComponent(`${selectedBusiness.name}, ${selectedBusiness.address || selectedBusiness.city}, Maroc`);
      return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_EMBED_KEY}&q=${q}&zoom=16`;
    }
    if (selectedCity) {
      return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_EMBED_KEY}&q=${encodeURIComponent(selectedCity + ", Maroc")}&zoom=13`;
    }
    return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_EMBED_KEY}&q=Maroc&zoom=6`;
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
      <div 
        className="absolute top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] opacity-40 pointer-events-none"
        style={{
          backgroundImage: `url(${symboleMaroc})`,
          backgroundSize: "contain",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
      />
      <Header variant="morocco" />

      <main className="container mx-auto px-4 py-24 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <MapPin className="h-8 w-8 text-gold" />
            Carte des établissements
          </h1>
          <p className="text-white/80 mt-2">
            {withGPS.length} établissement{withGPS.length > 1 ? "s" : ""} géolocalisé{withGPS.length > 1 ? "s" : ""} sur {filtered.length} au total
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={selectedCity || "all"} onValueChange={v => setSelectedCity(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[200px] bg-white/90 text-foreground">
              <SelectValue placeholder="Toutes les villes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedCategory || "all"} onValueChange={v => setSelectedCategory(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[220px] bg-white/90 text-foreground">
              <SelectValue placeholder="Toutes les catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {(selectedCity || selectedCategory) && (
            <Button variant="outline" size="sm" className="bg-white/90 text-foreground" onClick={() => { setSelectedCity(""); setSelectedCategory(""); }}>
              <X className="h-4 w-4 mr-1" /> Réinitialiser
            </Button>
          )}
        </div>

        {/* Map */}
        <Card className="mb-6 relative">
          <CardContent className="p-0">
            {selectedBusiness && (
              <div className="absolute top-2 right-2 z-10 bg-white text-black px-4 py-3 rounded shadow-lg max-w-xs">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Link to={businessUrl(selectedBusiness)} className="text-sm font-bold hover:text-primary">
                    {selectedBusiness.name}
                  </Link>
                  <button onClick={() => setSelectedBusiness(null)} className="hover:bg-black/10 rounded p-1 flex-shrink-0">
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
                    <a href={`tel:${cleanPhone(selectedBusiness.phone)}`} className="flex items-center gap-1 hover:text-primary">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      {selectedBusiness.phone}
                    </a>
                  )}
                </div>
              </div>
            )}
            <iframe
              src={getMapUrl()}
              className="w-full h-[450px] border-0 rounded-lg"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Carte des établissements"
            />
          </CardContent>
        </Card>

        {/* Business List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(b => (
            <button
              key={b.id}
              onClick={() => { setSelectedBusiness(b); window.scrollTo({ top: 200, behavior: "smooth" }); }}
              className={`text-left p-4 rounded-lg border transition-all ${
                selectedBusiness?.id === b.id 
                  ? "bg-gold/20 border-gold ring-2 ring-gold" 
                  : "bg-white/90 border-white/50 hover:bg-white hover:shadow-md"
              }`}
            >
              <p className="font-semibold text-sm truncate text-foreground">{b.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{b.city}{b.neighborhood ? ` · ${b.neighborhood}` : ""}</p>
              {b.main_category && <p className="text-xs text-primary mt-1">{b.main_category}</p>}
              <div className="flex items-center gap-2 mt-2">
                {b.latitude && b.longitude ? (
                  <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" /> GPS
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Pas de GPS</span>
                )}
                <Link 
                  to={businessUrl(b)} 
                  className="text-[10px] text-primary hover:underline ml-auto"
                  onClick={e => e.stopPropagation()}
                >
                  Voir la fiche →
                </Link>
              </div>
            </button>
          ))}
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default AllBusinessesMap;
