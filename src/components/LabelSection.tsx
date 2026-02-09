import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import BusinessCard, { Gamme } from "@/components/BusinessCard";
import symboleMaroc from "@/assets/symbole-maroc-2.webp";

interface LabelSectionProps {
  labelId: string;
  titleFr: string;
  titleEn: string;
  titleAr: string;
  descriptionFr: string;
  descriptionEn: string;
  descriptionAr: string;
  logoUrl?: string;
}

interface Business {
  id: string;
  name: string;
  city: string;
  region: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  skype: string | null;
  logo_url: string | null;
  images: string[] | null;
  categories: string[] | null;
  wtuce_status: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  rating: number | null;
  gamme_id: string | null;
}

const LabelSection = ({
  labelId,
  titleFr,
  titleEn,
  titleAr,
  descriptionFr,
  descriptionEn,
  descriptionAr,
  logoUrl,
}: LabelSectionProps) => {
  const { language } = useLanguage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: labelData, error: labelError } = await supabase
          .from("business_labels")
          .select("business_id")
          .eq("label_id", labelId);

        if (labelError) throw labelError;

        const businessIds = labelData?.map((bl) => bl.business_id) || [];
        if (businessIds.length === 0) {
          setBusinesses([]);
          setIsLoading(false);
          return;
        }

        const [businessRes, gammeRes] = await Promise.all([
          supabase
            .from("businesses")
            .select("id, name, city, region, address, phone, whatsapp, skype, logo_url, images, categories, wtuce_status, latitude, longitude, google_maps_url, rating, gamme_id")
            .eq("is_active", true)
            .in("id", businessIds)
            .order("priority_score", { ascending: false }),
          supabase
            .from("gammes")
            .select("id, name_fr, color_hex")
            .order("sort_order", { ascending: true }),
        ]);

        if (businessRes.error) throw businessRes.error;
        setBusinesses(businessRes.data || []);
        setGammes(gammeRes.data || []);
      } catch (error) {
        console.error("Error fetching label businesses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [labelId]);

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

  const title = language === "ar" ? titleAr : language === "en" ? titleEn : titleFr;
  const description = language === "ar" ? descriptionAr : language === "en" ? descriptionEn : descriptionFr;
  const verifiedLabel = language === "ar" ? "موثق" : language === "en" ? "Verified" : "Vérifié";

  return (
    <section className="bg-black py-16 relative overflow-visible">
      {/* Background decorative emblem */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 pointer-events-none z-0">
        <div
          className="w-[460px] h-[460px] opacity-15"
          style={{
            backgroundImage: `url(${symboleMaroc})`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="mb-10 text-center">
          {logoUrl && (
            <div className="flex justify-center mb-4">
              <img src={logoUrl} alt={title} className="h-16 object-contain" />
            </div>
          )}
          <h2 className="mb-3 text-3xl font-bold text-white">
            {language === "fr" ? "Établissements " : language === "ar" ? "مؤسسات " : ""}
            <span className="text-gold">{title}</span>
            {language === "en" ? " Establishments" : ""}
          </h2>
          <p className="mx-auto max-w-2xl text-gray-400">{description}</p>
        </div>

        {/* Business Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {businesses.map((business) => (
            <BusinessCard
              key={business.id}
              business={business}
              gammes={gammes}
              verifiedLabel={verifiedLabel}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default LabelSection;
