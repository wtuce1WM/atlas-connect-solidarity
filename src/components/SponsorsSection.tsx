import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2 } from "lucide-react";

interface Sponsor {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  url_fr: string | null;
  url_en: string | null;
  url_ar: string | null;
  logo_big_url_fr: string | null;
  logo_big_url_en: string | null;
  logo_big_url_ar: string | null;
  logo_small_url_fr: string | null;
  logo_small_url_en: string | null;
  logo_small_url_ar: string | null;
  image_big_url_fr: string | null;
  image_big_url_en: string | null;
  image_big_url_ar: string | null;
  zones: string[];
  sort_order: number | null;
}

interface SponsorsSectionProps {
  zone: string;
  cityId?: string;
}

const SponsorsSection = ({ zone, cityId }: SponsorsSectionProps) => {
  const { language } = useLanguage();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSponsors = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("sponsors")
          .select("*")
          .eq("is_active", true)
          .contains("zones", [zone])
          .order("sort_order", { ascending: true });

        if (error) throw error;

        // Filter by city if provided
        let filteredSponsors = data || [];
        if (cityId) {
          filteredSponsors = filteredSponsors.filter(s => 
            !s.city_ids || s.city_ids.length === 0 || s.city_ids.includes(cityId)
          );
        }

        setSponsors(filteredSponsors);
      } catch (error) {
        console.error("Error fetching sponsors:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSponsors();
  }, [zone, cityId]);

  const getSponsorUrl = (sponsor: Sponsor) => {
    if (language === "ar" && sponsor.url_ar) return sponsor.url_ar;
    if (language === "en" && sponsor.url_en) return sponsor.url_en;
    return sponsor.url_fr;
  };

  const getSponsorLogo = (sponsor: Sponsor) => {
    // Try big logo first, then small
    if (language === "ar") {
      return sponsor.logo_big_url_ar || sponsor.logo_small_url_ar || sponsor.image_big_url_ar ||
             sponsor.logo_big_url_fr || sponsor.logo_small_url_fr || sponsor.image_big_url_fr;
    }
    if (language === "en") {
      return sponsor.logo_big_url_en || sponsor.logo_small_url_en || sponsor.image_big_url_en ||
             sponsor.logo_big_url_fr || sponsor.logo_small_url_fr || sponsor.image_big_url_fr;
    }
    return sponsor.logo_big_url_fr || sponsor.logo_small_url_fr || sponsor.image_big_url_fr;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  if (sponsors.length === 0) {
    return null;
  }

  return (
    <section className="bg-black py-8">
      <div className="container mx-auto px-4">
        <div 
          className="flex items-center justify-center gap-8 md:gap-12 overflow-x-auto pb-4 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {sponsors.map((sponsor) => {
            const url = getSponsorUrl(sponsor);
            const logo = getSponsorLogo(sponsor);

            if (!logo) return null;

            const logoElement = (
              <img
                src={logo}
                alt={sponsor.name_fr}
                className="h-auto w-auto max-h-32 md:max-h-40 object-contain opacity-70 hover:opacity-100 transition-opacity"
              />
            );

            if (url) {
              return (
                <a
                  key={sponsor.id}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  {logoElement}
                </a>
              );
            }

            return (
              <div key={sponsor.id} className="flex-shrink-0">
                {logoElement}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SponsorsSection;
