import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import BusinessCard, { BusinessCardData, Gamme } from "./BusinessCard";
import relaisLogo from "@/assets/relais-chateaux-logo.png";
import symboleMaroc from "@/assets/symbole-maroc-2.webp";

// Label ID for "Relais & Châteaux"
const RELAIS_CHATEAUX_LABEL_ID = "4be8e4aa-99fb-4502-a531-7eec608efe5a";

const RelaisChateauxSection = () => {
  const { language } = useLanguage();
  const [businesses, setBusinesses] = useState<BusinessCardData[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRelaisChateaux = async () => {
      setIsLoading(true);
      try {
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

        const [businessesRes, gammesRes] = await Promise.all([
          supabase
            .from("businesses")
            .select("id, name, city, region, address, phone, whatsapp, skype, logo_url, images, categories, wtuce_status, latitude, longitude, google_maps_url, rating, gamme_id")
            .eq("is_active", true)
            .in("id", businessIds)
            .order("priority_score", { ascending: false }),
          supabase
            .from("gammes")
            .select("id, name_fr, color_hex")
        ]);

        if (businessesRes.error) throw businessesRes.error;
        setBusinesses((businessesRes.data || []) as BusinessCardData[]);
        if (gammesRes.data) setGammes(gammesRes.data as Gamme[]);
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {businesses.map((business) => (
            <div key={business.id}>
              <BusinessCard
                business={business}
                gammes={gammes}
                verifiedLabel={language === "fr" ? "Vérifié WTUCE" : language === "ar" ? "تم التحقق WTUCE" : "Verified WTUCE"}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RelaisChateauxSection;
