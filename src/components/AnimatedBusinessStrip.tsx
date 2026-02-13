import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Phone, Globe, MapPin, Map } from "lucide-react";

interface StripBusiness {
  id: string;
  name: string;
  logo_url: string | null;
  city: string;
  neighborhood: string | null;
  phone: string | null;
  website: string | null;
  google_maps_url: string | null;
  avg_rating: number | null;
}

interface AnimatedBusinessStripProps {
  city?: string;
  title?: string;
  businessIds?: string[];
  category?: string;
  showMapLink?: boolean;
}

const AnimatedBusinessStrip = ({ city, title, businessIds, category, showMapLink }: AnimatedBusinessStripProps) => {
  const [businesses, setBusinesses] = useState<StripBusiness[]>([]);
  const { language } = useLanguage();
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchBusinesses = async () => {
      if (category) {
        // Fetch businesses in this category, then sort by avg review rating
        const { data: bizData } = await supabase
          .from("businesses")
          .select("id, name, logo_url, neighborhood, phone, website, city, google_maps_url, google_rating, tripadvisor_rating, restaurant_guru_rating")
          .eq("is_active", true)
          .or(`main_category.eq.${category},categories.cs.{${category}}`)
          .not("logo_url", "is", null)
          .order("priority_score", { ascending: false })
          .limit(50);

        if (bizData) {
          // Calculate avg rating and sort by it
          const withRating = bizData.map((b) => {
            const ratings: number[] = [];
            if (b.google_rating) ratings.push(b.google_rating);
            if (b.tripadvisor_rating) ratings.push(b.tripadvisor_rating);
            if (b.restaurant_guru_rating) ratings.push(b.restaurant_guru_rating);
            const avg = ratings.length > 0 ? ratings.reduce((a, c) => a + c, 0) / ratings.length : null;
            return { ...b, avg_rating: avg ? Math.round((avg / 5) * 20 * 10) / 10 : null };
          });
          withRating.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
          setBusinesses(withRating.slice(0, 12));
        }
      } else {
        let query = supabase
          .from("businesses")
          .select("id, name, logo_url, neighborhood, phone, website, city, google_maps_url")
          .eq("is_active", true);

        if (businessIds && businessIds.length > 0) {
          query = query.in("id", businessIds);
        } else if (city) {
          query = query.eq("city", city).not("logo_url", "is", null);
        }

        const { data } = await query.order("priority_score", { ascending: false }).limit(12);
        setBusinesses((data || []).map((b) => ({ ...b, avg_rating: null })));
      }
    };
    fetchBusinesses();
  }, [city, businessIds, category]);

  if (businesses.length === 0) return null;

  // Filter out businesses without logo, then duplicate for infinite scroll
  const withLogo = businesses.filter(b => !!b.logo_url);
  if (withLogo.length === 0) return null;
  const items = [...withLogo, ...withLogo];

  return (
    <div className="w-full py-10 overflow-hidden bg-black/90 rounded-2xl my-8">
      {title && (
        <h2 className="text-center text-2xl md:text-3xl font-bold text-white mb-8 font-['Playfair_Display'] italic">
          {title}
        </h2>
      )}
      
      {/* Infinite marquee */}
      <div className="relative">
        {/* Gradient masks */}
        <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-black/90 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-black/90 to-transparent pointer-events-none" />
        
        <div
          ref={stripRef}
          className="flex animate-marquee hover:[animation-play-state:paused]"
          style={{ width: "max-content" }}
        >
          {items.map((biz, index) => (
            <Link
              key={`${biz.id}-${index}`}
              to={`/business/${biz.id}`}
              className="flex-shrink-0 w-56 mx-4 group"
            >
              <div className="flex flex-col items-center text-center space-y-3 transition-all duration-500 group-hover:scale-105">
                {/* Logo */}
                <div className="w-28 h-28 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-gold/50 transition-colors duration-500">
                  {biz.logo_url ? (
                    <img
                      src={biz.logo_url}
                      alt={biz.name}
                      className="w-20 h-20 object-contain filter brightness-0 invert opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                    />
                  ) : (
                    <span className="text-white/40 text-3xl font-bold">{biz.name.charAt(0)}</span>
                  )}
                </div>

                {/* Info */}
                <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2 group-hover:text-gold transition-colors duration-300">
                  {biz.name}
                </h3>

                {biz.avg_rating !== null && (
                  <span className="text-gold text-xs font-bold">{biz.avg_rating}/20</span>
                )}

                <p className="text-white/40 text-xs leading-tight flex items-start gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  {biz.city}{biz.neighborhood ? `, ${biz.neighborhood}` : ""}
                </p>

                {biz.phone && (
                  <p className="text-white/50 text-xs flex items-center gap-1">
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    {biz.phone}
                  </p>
                )}

                {showMapLink && biz.google_maps_url ? (
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(biz.google_maps_url!, "_blank");
                    }}
                    className="text-gold/60 text-xs group-hover:text-gold transition-colors duration-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Map className="h-3 w-3 flex-shrink-0" />
                    {language === "fr" ? "Voir sur la carte" : language === "ar" ? "عرض على الخريطة" : "View on map"}
                  </span>
                ) : !showMapLink && biz.website ? (
                  <p className="text-gold/60 text-xs group-hover:text-gold transition-colors duration-300 flex items-center gap-1">
                    <Globe className="h-3 w-3 flex-shrink-0" />
                    {new URL(biz.website).hostname.replace("www.", "")}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnimatedBusinessStrip;
