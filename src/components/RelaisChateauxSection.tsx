import { useEffect, useState } from "react";
import { businessUrl } from "@/lib/businessUrl";
import { Link } from "react-router-dom";
import { MapPin, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import relaisLogo from "@/assets/relais-chateaux-logo.png";
import logoWatermark from "@/assets/logoGOLDsimpleSML.webp";
import symboleMaroc from "@/assets/symbole-maroc-2.webp";
interface Business {
  id: string;
  name: string;
  city: string;
  region: string;
  images: string[] | null;
  rating: number | null;
  computed_rating?: number | null;
  description: string | null;
  wtuce_status: string | null;
}

// Label ID for "Relais & Châteaux"
const RELAIS_CHATEAUX_LABEL_ID = "4be8e4aa-99fb-4502-a531-7eec608efe5a";

const RelaisChateauxSection = () => {
  const { language } = useLanguage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRelaisChateaux = async () => {
      setIsLoading(true);
      try {
        // First, get business IDs that have the Relais & Châteaux label
        const { data: labelData, error: labelError } = await supabase
          .from("business_labels")
          .select("business_id")
          .eq("label_id", RELAIS_CHATEAUX_LABEL_ID);

        if (labelError) throw labelError;

        const businessIds = labelData?.map((bl) => bl.business_id) || [];

        if (businessIds.length === 0) {
          setBusinesses([]);
          setIsLoading(false);
          return;
        }

        // Then fetch the businesses with those IDs
        const { data, error } = await supabase
          .from("businesses")
          .select("id, name, city, region, images, rating, computed_rating, description, wtuce_status, neighborhood")
          .eq("is_active", true)
          .in("id", businessIds)
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
    <section id="relais-chateaux" className="bg-black py-16 relative overflow-visible">
      {/* Background decorative emblem - positioned to straddle sections */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 pointer-events-none z-0"
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
              className="h-24 object-contain"
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
          {businesses.map((business) => {
            const displayRating = business.computed_rating ?? business.rating;
            return (
            <Link
              key={business.id}
              to={businessUrl(business)}
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

                {/* Rating - top left */}
                {displayRating && (
                  <div className="absolute top-2 left-2 flex flex-col items-center gap-0.5 bg-black/60 rounded-full px-2 py-1 z-20">
                    <Star className="h-4 w-4 fill-gold text-gold" />
                    <span className="text-gold font-semibold text-xs">{displayRating}/20</span>
                  </div>
                )}

                {/* Watermark logo for verified businesses - top right */}
                {business.wtuce_status === "verified" && (
                  <img 
                    src={logoWatermark} 
                    alt="" 
                    className="absolute top-2 right-2 w-10 h-10 object-contain opacity-90 pointer-events-none z-20"
                  />
                )}

                <CardContent className="p-6 relative z-10 flex flex-col items-center justify-end min-h-[200px] text-center">
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
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RelaisChateauxSection;
