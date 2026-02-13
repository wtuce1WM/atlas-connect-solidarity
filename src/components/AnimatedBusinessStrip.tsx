import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Phone, Globe, MapPin } from "lucide-react";

interface StripBusiness {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  city: string;
}

interface AnimatedBusinessStripProps {
  city?: string;
  title?: string;
  businessIds?: string[];
}

const AnimatedBusinessStrip = ({ city, title, businessIds }: AnimatedBusinessStripProps) => {
  const [businesses, setBusinesses] = useState<StripBusiness[]>([]);
  const { language } = useLanguage();
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchBusinesses = async () => {
      let query = supabase
        .from("businesses")
        .select("id, name, logo_url, address, phone, website, city")
        .eq("is_active", true);

      if (businessIds && businessIds.length > 0) {
        query = query.in("id", businessIds);
      } else if (city) {
        query = query.eq("city", city).not("logo_url", "is", null);
      }

      const { data } = await query.order("priority_score", { ascending: false }).limit(12);
      setBusinesses(data || []);
    };
    fetchBusinesses();
  }, [city, businessIds]);

  if (businesses.length === 0) return null;

  // Duplicate items for infinite scroll effect
  const items = [...businesses, ...businesses];

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

                {biz.address && (
                  <p className="text-white/40 text-xs leading-tight line-clamp-2 flex items-start gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    {biz.address}
                  </p>
                )}

                {biz.phone && (
                  <p className="text-white/50 text-xs flex items-center gap-1">
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    {biz.phone}
                  </p>
                )}

                {biz.website && (
                  <p className="text-gold/60 text-xs group-hover:text-gold transition-colors duration-300 flex items-center gap-1">
                    <Globe className="h-3 w-3 flex-shrink-0" />
                    {new URL(biz.website).hostname.replace("www.", "")}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnimatedBusinessStrip;
