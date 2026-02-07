import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import relaisLogo from "@/assets/relais-chateaux-logo.png";

interface Business {
  id: string;
  name: string;
  city: string;
  region: string;
  images: string[] | null;
  rating: number | null;
  description: string | null;
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
          .select("id, name, city, region, images, rating, description")
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
    <section className="bg-black py-16">
      <div className="container mx-auto px-4">
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
              <Card className="h-full bg-gradient-to-b from-gray-900 to-black border border-gold/30 overflow-hidden transition-all duration-300 hover:border-gold hover:shadow-lg hover:shadow-gold/20">
                <CardContent className="p-0 flex flex-col">
                  {/* First Image */}
                  {business.images && business.images.length > 0 && (
                    <div className="aspect-[4/3] w-full overflow-hidden">
                      <img
                        src={business.images[0]}
                        alt={business.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  <div className="p-4 text-center">
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
                    <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
                      <MapPin className="h-3 w-3" />
                      <span>{business.city}</span>
                    </div>
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
