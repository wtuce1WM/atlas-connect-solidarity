import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import BusinessCard, { BusinessCardData, Gamme } from "./BusinessCard";

interface LabelSectionProps {
  labelId: string;
  logoSrc?: string;
  logoAlt?: string;
  title: { fr: string; en: string; ar: string };
  subtitle: { fr: string; en: string; ar: string };
  highlightedText?: string;
  backgroundEmblem?: string;
}

const LabelSection = ({
  labelId,
  logoSrc,
  logoAlt,
  title,
  subtitle,
  highlightedText,
  backgroundEmblem,
}: LabelSectionProps) => {
  const { language } = useLanguage();
  const [businesses, setBusinesses] = useState<BusinessCardData[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLabelBusinesses = async () => {
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

        const [businessesRes, gammesRes] = await Promise.all([
          supabase
            .from("businesses")
            .select("id, name, city, region, address, phone, whatsapp, skype, logo_url, images, categories, wtuce_status, latitude, longitude, google_maps_url, rating, gamme_id")
            .eq("is_active", true)
            .in("id", businessIds)
            .order("priority_score", { ascending: false }),
          supabase.from("gammes").select("id, name_fr, color_hex"),
        ]);

        if (businessesRes.error) throw businessesRes.error;
        setBusinesses((businessesRes.data || []) as BusinessCardData[]);
        if (gammesRes.data) setGammes(gammesRes.data as Gamme[]);
      } catch (error) {
        console.error("Error fetching label businesses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLabelBusinesses();
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

  const localizedTitle = language === "ar" ? title.ar : language === "en" ? title.en : title.fr;
  const localizedSubtitle = language === "ar" ? subtitle.ar : language === "en" ? subtitle.en : subtitle.fr;
  const verifiedLabel = language === "fr" ? "Vérifié WTUCE" : language === "ar" ? "تم التحقق WTUCE" : "Verified WTUCE";

  return (
    <section className="bg-black py-16 relative overflow-visible">
      {backgroundEmblem && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 pointer-events-none z-0">
          <div
            className="w-[460px] h-[460px] opacity-15"
            style={{
              backgroundImage: `url(${backgroundEmblem})`,
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>
      )}

      <div className="container mx-auto px-4 relative z-10">
        <div className="mb-10 text-center">
          {logoSrc && (
            <div className="flex justify-center mb-4">
              <img src={logoSrc} alt={logoAlt || ""} className="h-16 object-contain" />
            </div>
          )}
          <h2 className="mb-3 text-3xl font-bold text-white">
            {highlightedText ? (
              <>
                {localizedTitle.split(highlightedText)[0]}
                <span className="text-gold">{highlightedText}</span>
                {localizedTitle.split(highlightedText)[1] || ""}
              </>
            ) : (
              localizedTitle
            )}
          </h2>
          <p className="mx-auto max-w-2xl text-gray-400">{localizedSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {businesses.map((business) => (
            <div key={business.id}>
              <BusinessCard business={business} gammes={gammes} verifiedLabel={verifiedLabel} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LabelSection;
