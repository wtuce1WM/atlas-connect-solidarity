import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BusinessCard, { BusinessCardData, Gamme, Badge, SubcategoryRef, BadgeSubcategoryRef } from "./BusinessCard";

interface RelatedEstablishmentsProps {
  currentBusinessId: string;
  kpRegroupement: string;
  kpRegroupement2?: string;
  isVerified?: boolean;
}

const RelatedEstablishments = ({ currentBusinessId, kpRegroupement, kpRegroupement2, isVerified = false }: RelatedEstablishmentsProps) => {
  const [relatedBusinesses, setRelatedBusinesses] = useState<BusinessCardData[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryRef[]>([]);
  const [badgeSubcategories, setBadgeSubcategories] = useState<BadgeSubcategoryRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if ((!kpRegroupement || kpRegroupement.trim() === "") && (!kpRegroupement2 || kpRegroupement2.trim() === "")) {
        setIsLoading(false);
        return;
      }

      // Try KP1 first
      let businessData: any[] = [];
      if (kpRegroupement && kpRegroupement.trim() !== "") {
        const res = await supabase
          .from("businesses")
          .select("id, name, city, region, address, phone, whatsapp, skype, logo_url, images, categories, default_service, wtuce_status, latitude, longitude, google_maps_url, rating, gamme_id, badge_id, neighborhood, is_master")
          .eq("kp_regroupement", kpRegroupement)
          .eq("is_active", true)
          .neq("id", currentBusinessId)
          .order("wtuce_status", { ascending: false })
          .order("priority_score", { ascending: false });
        businessData = res.data || [];
      }

      // Fallback to KP2 if KP1 has no results
      if (businessData.length === 0 && kpRegroupement2 && kpRegroupement2.trim() !== "") {
        const res = await supabase
          .from("businesses")
          .select("id, name, city, region, address, phone, whatsapp, skype, logo_url, images, categories, default_service, wtuce_status, latitude, longitude, google_maps_url, rating, gamme_id, badge_id, neighborhood, is_master")
          .eq("kp_regroupement_2", kpRegroupement2)
          .eq("is_active", true)
          .neq("id", currentBusinessId)
          .order("wtuce_status", { ascending: false })
          .order("priority_score", { ascending: false });
        businessData = res.data || [];
      }

      const [gammesRes, badgesRes, subcatsRes, badgeSubcatsRes] = await Promise.all([
        supabase.from("gammes").select("id, name_fr, color_hex, text_color_hex"),
        supabase.from("badges").select("id, name_fr, color_hex, text_color_hex"),
        supabase.from("subcategories").select("id, name_fr"),
        supabase.from("badge_subcategories").select("badge_id, subcategory_id")
      ]);

      if (businessData.length > 0) {
        const sorted = [...businessData].sort((a: any, b: any) => {
          if (a.is_master && !b.is_master) return -1;
          if (!a.is_master && b.is_master) return 1;
          return 0;
        });
        setRelatedBusinesses(sorted as BusinessCardData[]);
      }
      if (gammesRes.data) {
        setGammes(gammesRes.data as Gamme[]);
      }
      if (badgesRes.data) {
        setBadges(badgesRes.data as Badge[]);
      }
      if (subcatsRes.data) {
        setSubcategories(subcatsRes.data as SubcategoryRef[]);
      }
      if (badgeSubcatsRes.data) {
        setBadgeSubcategories(badgeSubcatsRes.data as BadgeSubcategoryRef[]);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [currentBusinessId, kpRegroupement, kpRegroupement2]);

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

      <div className="relative">
        {relatedBusinesses.length > 3 && (
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
          className={`flex gap-4 pb-4 ${relatedBusinesses.length > 3 ? 'overflow-x-auto scroll-smooth' : 'justify-start flex-wrap'}`}
          style={relatedBusinesses.length > 3 ? { scrollbarWidth: "none", msOverflowStyle: "none" } : undefined}
        >
          {relatedBusinesses.map((business) => (
            <div key={business.id} className="flex-shrink-0 w-72" onClick={() => window.scrollTo(0, 0)}>
              <BusinessCard
                business={business}
                gammes={gammes}
                badges={badges}
                subcategories={subcategories}
                badgeSubcategories={badgeSubcategories}
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
