import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Phone, Globe, MapPin, Map, Crown, Star, MessageCircle } from "lucide-react";

interface StripBusiness {
  id: string;
  name: string;
  logo_url: string | null;
  city: string;
  neighborhood: string | null;
  phone: string | null;
  whatsapp: string | null;
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
  onSelectBusiness?: (business: StripBusiness) => void;
}

const AnimatedBusinessStrip = ({ city, title, businessIds, category, showMapLink, onSelectBusiness }: AnimatedBusinessStripProps) => {
  const [businesses, setBusinesses] = useState<StripBusiness[]>([]);
  const { language } = useLanguage();
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchBusinesses = async () => {
      if (category) {
        // Fetch businesses in this category, then sort by avg review rating
        const { data: bizData } = await supabase
          .from("businesses")
          .select("id, name, logo_url, neighborhood, phone, whatsapp, website, city, google_maps_url, rating, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count")
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
          .select("id, name, logo_url, neighborhood, phone, whatsapp, website, city, google_maps_url")
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
    <div className="w-full py-10 bg-black/90 rounded-2xl my-8">
      {title && (
        <h2 className="text-center text-3xl md:text-4xl font-bold text-white mb-10 font-['Playfair_Display'] italic leading-relaxed tracking-wide">
          {title.replace("{count}", String(withLogo.length))}
        </h2>
      )}
      
      <div className="flex items-stretch gap-0">
        {/* Champion card - fixed on the left (desktop/tablet only) */}
        <Link
          to={`/business/${champion.id}`}
          className="hidden md:flex flex-shrink-0 w-64 px-4 group relative items-center justify-center"
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <Crown className="h-6 w-6 text-gold fill-gold animate-pulse" />
            <div className="w-36 h-36 rounded-full bg-black border-2 border-gold/60 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.3)] group-hover:shadow-[0_0_40px_rgba(212,175,55,0.5)] transition-all duration-500">
              {champion.logo_url ? (
                <img
                  src={champion.logo_url}
                  alt={champion.name}
                  className="w-28 h-28 object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-500 brightness-0 invert"
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
        <div className="relative flex-1 overflow-hidden min-w-0 py-4">
          <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-black/90 to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-black/90 to-transparent pointer-events-none" />
          
          <div
            ref={stripRef}
            className="flex items-center animate-marquee hover:[animation-play-state:paused]"
            style={{ width: "max-content" }}
          >
            {items.map((biz, index) => {
              // Determine podium rank (based on original index in withLogo)
              const originalIndex = withLogo.findIndex(w => w.id === biz.id);
              const podiumRank = originalIndex >= 0 && originalIndex <= 2 ? originalIndex + 1 : 0; // 1=gold, 2=silver, 3=bronze

              const podiumColors = {
                1: { text: "text-gold", fill: "fill-gold", border: "border-gold/60", bg: "from-gold/20 to-gold/5", shadow: "shadow-[0_0_20px_rgba(212,175,55,0.25)]", glow: "shadow-[0_0_30px_rgba(212,175,55,0.4)]" },
                2: { text: "text-[#C0C0C0]", fill: "fill-[#C0C0C0]", border: "border-[#C0C0C0]/60", bg: "from-[#C0C0C0]/15 to-[#C0C0C0]/5", shadow: "shadow-[0_0_20px_rgba(192,192,192,0.2)]", glow: "shadow-[0_0_30px_rgba(192,192,192,0.35)]" },
                3: { text: "text-[#CD7F32]", fill: "fill-[#CD7F32]", border: "border-[#CD7F32]/60", bg: "from-[#CD7F32]/15 to-[#CD7F32]/5", shadow: "shadow-[0_0_20px_rgba(205,127,50,0.2)]", glow: "shadow-[0_0_30px_rgba(205,127,50,0.35)]" },
              } as const;

              const colors = podiumRank > 0 ? podiumColors[podiumRank as 1 | 2 | 3] : null;

              return (
              <Link
                key={`${biz.id}-${index}`}
                to={`/business/${biz.id}`}
                className="flex-shrink-0 w-56 mx-4 group"
              >
                <div className="flex flex-col items-center text-center transition-all duration-500 group-hover:scale-105">
                  {/* Top section: crown + logo — fixed height for alignment */}
                  <div className="flex flex-col items-center justify-end space-y-2 h-44">
                    {colors ? (
                      <Crown className={`h-5 w-5 ${colors.text} ${colors.fill} animate-pulse`} />
                    ) : (
                      <div className="h-5" />
                    )}
                    <div className={`rounded-full flex items-center justify-center overflow-hidden transition-all duration-500 bg-black ${
                      colors 
                        ? `w-32 h-32 border-2 ${colors.border} ${colors.shadow} group-hover:${colors.glow}` 
                        : "w-28 h-28 border border-gold/50 group-hover:border-gold"
                    }`}>
                      {biz.logo_url ? (
                        <img
                          src={biz.logo_url}
                          alt={biz.name}
                          className={`object-contain group-hover:opacity-100 transition-opacity duration-500 brightness-0 invert ${
                            colors ? "w-24 h-24 opacity-90" : "w-20 h-20 opacity-80"
                          }`}
                        />
                      ) : (
                        <span className="text-white/40 text-3xl font-bold">{biz.name.charAt(0)}</span>
                      )}
                    </div>
                  </div>

                  {/* Title — alignment anchor */}
                  <h3 className={`font-semibold text-base leading-relaxed line-clamp-2 mt-3 h-12 flex items-center transition-colors duration-300 ${
                    colors ? `${colors.text}` : "text-white group-hover:text-gold"
                  }`}>
                    {biz.name}
                  </h3>

                  {/* Bottom section: details — fixed height so cards stay uniform */}
                  <div className="flex flex-col items-center min-h-[5.5rem]">
                    {biz.avg_rating !== null && (
                      <span className={`text-sm font-bold mt-1 ${colors ? colors.text : "text-gold"}`}>{biz.avg_rating}/20</span>
                    )}

                    <p className="text-white text-sm leading-relaxed mt-2">
                      <MapPin className="h-3.5 w-3.5 inline-block align-middle mr-0.5" />
                      {biz.city}{biz.neighborhood ? `, ${biz.neighborhood}` : ""}
                    </p>

                    {biz.whatsapp ? (
                      <a
                        href={`https://wa.me/${biz.whatsapp.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#25D366] text-sm flex items-center gap-1.5 mt-2 hover:underline"
                      >
                        <MessageCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        WhatsApp
                      </a>
                    ) : biz.phone ? (
                      <a
                        href={`tel:${biz.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-white/50 text-sm flex items-center gap-1.5 mt-2 hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                        {biz.phone}
                      </a>
                    ) : null}

                    {showMapLink && biz.google_maps_url ? (
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          if (onSelectBusiness) {
                            onSelectBusiness(biz);
                          } else {
                            window.open(biz.google_maps_url!, "_blank");
                          }
                        }}
                        className="text-gold/60 text-sm group-hover:text-gold transition-colors duration-300 flex items-center gap-1.5 mt-2 cursor-pointer"
                      >
                        <Map className="h-3.5 w-3.5 flex-shrink-0" />
                        {language === "fr" ? "Voir sur la carte" : language === "ar" ? "عرض على الخريطة" : "View on map"}
                      </span>
                    ) : !showMapLink && biz.website ? (
                      <p className="text-gold/60 text-sm group-hover:text-gold transition-colors duration-300 flex items-center gap-1.5 mt-2">
                        <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                        {new URL(biz.website).hostname.replace("www.", "")}
                      </p>
                    ) : null}
                  </div>
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
