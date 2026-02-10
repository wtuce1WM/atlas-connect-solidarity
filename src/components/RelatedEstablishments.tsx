import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BusinessCard, { BusinessCardData, Gamme } from "./BusinessCard";

interface RelatedEstablishmentsProps {
  currentBusinessId: string;
  kpRegroupement: string;
  isVerified?: boolean;
}

const RelatedEstablishments = ({ currentBusinessId, kpRegroupement, isVerified = false }: RelatedEstablishmentsProps) => {
  const [relatedBusinesses, setRelatedBusinesses] = useState<BusinessCardData[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!kpRegroupement || kpRegroupement.trim() === "") {
        setIsLoading(false);
        return;
      }

      const [businessesRes, gammesRes] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, city, region, address, phone, whatsapp, skype, logo_url, images, categories, wtuce_status, latitude, longitude, google_maps_url, rating, gamme_id, neighborhood")
          .eq("kp_regroupement", kpRegroupement)
          .eq("is_active", true)
          .neq("id", currentBusinessId)
          .order("wtuce_status", { ascending: false })
          .order("priority_score", { ascending: false }),
        supabase
          .from("gammes")
          .select("id, name_fr, color_hex")
      ]);

      if (businessesRes.data && businessesRes.data.length > 0) {
        setRelatedBusinesses(businessesRes.data as BusinessCardData[]);
      }
      if (gammesRes.data) {
        setGammes(gammesRes.data as Gamme[]);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [currentBusinessId, kpRegroupement]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (isLoading || relatedBusinesses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className={`h-5 w-5 ${isVerified ? 'text-gold' : 'text-primary'}`} />
        <h2 className={`text-xl font-semibold ${isVerified ? 'text-white' : ''}`}>Autres établissements</h2>
      </div>
      <p className={`text-sm ${isVerified ? 'text-white/60' : 'text-muted-foreground'}`}>
        Ces établissements font partie de la même entreprise
      </p>

      <div className="relative">
        {relatedBusinesses.length > 2 && (
          <>
            <button
              onClick={() => scroll("left")}
              className="absolute -left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-gold p-3 shadow-lg transition-all hover:bg-gold/80"
            >
              <ChevronLeft className="h-6 w-6 text-foreground" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="absolute -right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-gold p-3 shadow-lg transition-all hover:bg-gold/80"
            >
              <ChevronRight className="h-6 w-6 text-foreground" />
            </button>
          </>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {relatedBusinesses.map((business) => (
            <div key={business.id} className="flex-shrink-0 w-72" onClick={() => window.scrollTo(0, 0)}>
              <BusinessCard
                business={business}
                gammes={gammes}
                verifiedLabel="Vérifié WTUCE"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RelatedEstablishments;
