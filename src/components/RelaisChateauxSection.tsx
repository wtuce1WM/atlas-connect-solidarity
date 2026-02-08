import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import relaisLogo from "@/assets/relais-chateaux-logo.png";
import logoWatermark from "@/assets/logoGOLD-watermark.webp";
import symboleMaroc from "@/assets/symbole-maroc-2.webp";

interface Business {
  id: string;
  name: string;
  city: string;
  region: string;
  images: string[] | null;
  rating: number | null;
  description: string | null;
  wtuce_status: string | null;
}

const RELAIS_CHATEAUX_NAMES = [
  "La Mamounia",
  "Royal Mansour Marrakech",
  "Heure Bleue Palais",
  "Kasbah Tamadot",
];

const RelaisChateauxSection = () => {
  const { language } = useLanguage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRelaisChateaux = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("id, name, city, region, images, rating, description, wtuce_status")
          .eq("is_active", true)
          .in("name", RELAIS_CHATEAUX_NAMES)
          .order("priority_score", { ascending: false });

        if (error) throw error;
        setBusinesses(data || []);
      } catch (error) {
        console.error("Error fetching Relais & Châteaux:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRelaisChateaux();
  }, []);

  if (isLoading) {
    return (
      <section className="bg-black py-16">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      </section>
    );
  }

  if (businesses.length === 0) return null;

  return (
    <section id="relais-chateaux" className="bg-black py-16 relative overflow-hidden">
      {/* Background decorative emblem */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div 
          className="w-[460px] h-[460px] opacity-15"
          style={{
            backgroundImage: `url(${symboleMaroc})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="mb-10 text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={relaisLogo} 
              alt="Relais & Châteaux" 
              className="h-16 object-contain"
            />
          </div>
          <h2 className="mb-3 text-3xl font-bold text-white">
            {language === "fr"
              ? "Établissements "
              : language === "ar"
                ? "مؤسسات "
                : ""}
            <span className="text-gold">Relais & Châteaux</span>
            {language === "en" ? " Establishments" : ""}
          </h2>
          <p className="mx-auto max-w-2xl text-gray-400">
            {language === "fr"
              ? "Découvrez les adresses d'exception au Maroc, membres du prestigieux réseau Relais & Châteaux"
              : language === "ar"
                ? "اكتشف العناوين الاستثنائية في المغرب، أعضاء شبكة Relais & Châteaux المرموقة"
                : "Discover exceptional addresses in Morocco, members of the prestigious Relais & Châteaux network"}
          </p>
        </div>

        {/* Business Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {businesses.map((business) => (
            <Link
              key={business.id}
              to={`/business/${business.id}`}
              className="group"
            >
              <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-gold/20 border border-gold/30 relative">
                {/* Background Image with overlay */}
                {business.images && business.images.length > 0 && (
                  <div className="absolute inset-0">
                    <img
                      src={business.images[0]}
                      alt={business.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors" />
                  </div>
                )}

                <CardContent className="p-6 relative z-10 flex flex-col items-center justify-center min-h-[200px] text-center">
                  {/* Watermark logo for verified businesses */}
                  {business.wtuce_status === "verified" && (
                    <img 
                      src={logoWatermark} 
                      alt="" 
                      className="absolute bottom-2 right-2 w-12 h-12 object-contain opacity-80 pointer-events-none"
                    />
                  )}

                  {/* Rating */}
                  {business.rating && (
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Star className="h-4 w-4 fill-gold text-gold" />
                      <span className="text-gold font-bold">{business.rating}/20</span>
                    </div>
                  )}

                  {/* Name */}
                  <h3 className="text-lg font-semibold text-white group-hover:text-gold transition-colors mb-2">
                    {business.name}
                  </h3>

                  {/* Location */}
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-300">
                    <MapPin className="h-3 w-3" />
                    <span>{business.city}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RelaisChateauxSection;
