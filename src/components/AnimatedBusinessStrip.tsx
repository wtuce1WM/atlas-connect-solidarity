import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Phone, Globe, MapPin, Map, Crown, Star } from "lucide-react";

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
          .select("id, name, logo_url, neighborhood, phone, website, city, google_maps_url, rating, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count")
          .eq("is_active", true)
          .or(`main_category.eq.${category},categories.cs.{${category}}`)
          .not("logo_url", "is", null);

        if (bizData) {
          // Calculate weighted avg rating (same logic as BusinessDetail: manual rating takes priority)
          const withRating = bizData.map((b) => {
            const sources: { rating: number; count: number }[] = [];
            if (b.google_rating && b.google_review_count) sources.push({ rating: b.google_rating, count: b.google_review_count });
            if (b.tripadvisor_rating && b.tripadvisor_review_count) sources.push({ rating: b.tripadvisor_rating, count: b.tripadvisor_review_count });
            if (b.restaurant_guru_rating && b.restaurant_guru_review_count) sources.push({ rating: b.restaurant_guru_rating, count: b.restaurant_guru_review_count });
            const totalCount = sources.reduce((s, r) => s + r.count, 0);
            const weightedAvg = totalCount > 0 ? sources.reduce((s, r) => s + r.rating * r.count, 0) / totalCount : 0;
            const computedOn20 = totalCount > 0 ? Math.round(weightedAvg * 4 * 10) / 10 : null;
            const avgOn20 = b.rating ?? computedOn20;
            return { ...b, avg_rating: avgOn20 };
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

  // Filter out businesses without logo
  const withLogo = businesses.filter(b => !!b.logo_url);
  if (withLogo.length === 0) return null;

  // Separate #1 from the rest for the champion card
  const champion = withLogo[0];
  const items = [...withLogo, ...withLogo];

  return (
    <div className="w-full py-10 overflow-hidden bg-black/90 rounded-2xl my-8">
      {title && (
        <h2 className="text-center text-2xl md:text-3xl font-bold text-white mb-8 font-['Playfair_Display'] italic">
          {title}
        </h2>
      )}
      
      <div className="flex items-stretch gap-0">
        {/* Champion card - fixed on the left (desktop/tablet only) */}
        <Link
          to={`/business/${champion.id}`}
          className="hidden md:flex flex-shrink-0 w-64 px-4 group relative"
        >
          <div className="flex flex-col items-center text-center space-y-3 h-full justify-center">
            <Crown className="h-6 w-6 text-gold fill-gold animate-pulse" />
            <div className="w-36 h-36 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border-2 border-gold/60 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.3)] group-hover:shadow-[0_0_40px_rgba(212,175,55,0.5)] transition-all duration-500">
              {champion.logo_url ? (
                <img
                  src={champion.logo_url}
                  alt={champion.name}
                  className="w-28 h-28 object-contain filter brightness-0 invert opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                />
              ) : (
                <span className="text-gold text-4xl font-bold">{champion.name.charAt(0)}</span>
              )}
            </div>
            <h3 className="text-gold font-bold text-lg leading-tight line-clamp-2">{champion.name}</h3>
            {champion.avg_rating !== null && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-gold text-gold" />
                <span className="text-gold text-sm font-bold">{champion.avg_rating}/20</span>
              </div>
            )}
            <p className="text-white/50 text-xs leading-tight flex items-start gap-1">
              <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
              {champion.city}{champion.neighborhood ? `, ${champion.neighborhood}` : ""}
            </p>
          </div>
          <div className="absolute right-0 top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-gold/30 to-transparent" />
        </Link>

        {/* Marquee */}
        <div className="relative flex-1 overflow-hidden min-w-0">
          <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-black/90 to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-black/90 to-transparent pointer-events-none" />
          
          <div
            ref={stripRef}
            className="flex animate-marquee hover:[animation-play-state:paused]"
            style={{ width: "max-content" }}
          >
            {items.map((biz, index) => {
              const isChampionInMarquee = biz.id === champion.id;
              return (
              <Link
                key={`${biz.id}-${index}`}
                to={`/business/${biz.id}`}
                className="flex-shrink-0 w-56 mx-4 group"
              >
                <div className="flex flex-col items-center text-center space-y-3 transition-all duration-500 group-hover:scale-105">
                  {/* Crown for #1 on mobile only */}
                  {isChampionInMarquee && (
                    <Crown className="h-5 w-5 text-gold fill-gold animate-pulse md:hidden" />
                  )}
                  {/* Logo */}
                  <div className={`rounded-full flex items-center justify-center overflow-hidden transition-colors duration-500 ${
                    isChampionInMarquee 
                      ? "w-32 h-32 md:w-28 md:h-28 bg-gradient-to-br from-gold/20 to-gold/5 border-2 border-gold/60 shadow-[0_0_20px_rgba(212,175,55,0.25)] md:bg-white/5 md:border md:border-white/10 md:shadow-none group-hover:border-gold/50" 
                      : "w-28 h-28 bg-white/5 border border-white/10 group-hover:border-gold/50"
                  }`}>
                    {biz.logo_url ? (
                      <img
                        src={biz.logo_url}
                        alt={biz.name}
                        className={`object-contain filter brightness-0 invert group-hover:opacity-100 transition-opacity duration-500 ${
                          isChampionInMarquee ? "w-24 h-24 md:w-20 md:h-20 opacity-90" : "w-20 h-20 opacity-80"
                        }`}
                      />
                    ) : (
                      <span className="text-white/40 text-3xl font-bold">{biz.name.charAt(0)}</span>
                    )}
                  </div>

                  <h3 className={`font-semibold text-sm leading-tight line-clamp-2 transition-colors duration-300 ${
                    isChampionInMarquee ? "text-gold md:text-white md:group-hover:text-gold" : "text-white group-hover:text-gold"
                  }`}>
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
            )})}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedBusinessStrip;
