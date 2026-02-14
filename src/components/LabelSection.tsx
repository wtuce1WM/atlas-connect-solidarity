import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import logoWatermark from "@/assets/logoGOLDsimpleSML.webp";
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
  useLogo2?: boolean;
  pageType?: string;
}

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

const LabelSection = ({
  labelId,
  titleFr,
  titleEn,
  titleAr,
  descriptionFr,
  descriptionEn,
  descriptionAr,
  logoUrl,
  useLogo2 = false,
  pageType,
}: LabelSectionProps) => {
  const { language } = useLanguage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedLogoUrl, setResolvedLogoUrl] = useState<string | undefined>(logoUrl);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch label info for logo if needed
        if (useLogo2) {
          const { data: labelInfo } = await supabase
            .from("labels" as any)
            .select("logo_url")
            .eq("id", labelId)
            .maybeSingle();
          if (labelInfo && (labelInfo as any).logo_url) {
            setResolvedLogoUrl((labelInfo as any).logo_url);
          }
        }

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

        const { data, error } = await supabase
          .from("businesses")
          .select("id, name, city, region, images, rating, description, wtuce_status, neighborhood")
          .eq("is_active", true)
          .in("id", businessIds)
          .order("priority_score", { ascending: false });

        if (error) throw error;
        setBusinesses(data || []);
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

  return (
    <section
      className="py-16 relative overflow-visible"
      style={
        pageType === "neighborhood"
          ? { background: "linear-gradient(to bottom, hsl(30, 25%, 97%) 0%, hsl(30, 25%, 90%) 15%, hsl(30, 10%, 50%) 40%, #000000 70%)" }
          : pageType === "service"
          ? { background: "linear-gradient(to bottom, hsl(30, 25%, 97%) 0%, #000000 40%)" }
          : { backgroundColor: "#000000" }
      }
    >
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
          {resolvedLogoUrl && (
            <div className="flex justify-center mb-4">
              <img src={resolvedLogoUrl} alt={title} className="h-24 object-contain" />
            </div>
          )}
          <h2 className={`mb-3 text-3xl font-bold ${pageType === "neighborhood" ? "text-black" : "text-white"}`}>
            {language === "fr" ? "Établissements " : language === "ar" ? "مؤسسات " : ""}
            <span className="text-gold">{title}</span>
            {language === "en" ? " Establishments" : ""}
          </h2>
          <p className={`mx-auto max-w-2xl ${pageType === "neighborhood" ? "text-black" : "text-gray-400"}`}>{description}</p>
        </div>

        {/* Business Cards Grid - same style as RelaisChateauxSection */}
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

                    {/* Rating - top left */}
                    {business.rating && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1 z-10">
                        <Star className="h-4 w-4 fill-gold text-gold" />
                        <span className="text-gold font-bold text-sm">{business.rating}/20</span>
                      </div>
                    )}

                    {/* Watermark logo for verified businesses - top right */}
                    {business.wtuce_status === "verified" && (
                      <img
                        src={logoWatermark}
                        alt=""
                        className="absolute top-2 right-2 w-10 h-10 object-contain opacity-90 pointer-events-none z-10"
                      />
                    )}
                  </div>
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default LabelSection;
