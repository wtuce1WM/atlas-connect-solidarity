import { useRef } from "react";
import { Link } from "react-router-dom";
import { Star, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import logoWatermark from "@/assets/logoGOLDsimpleSML.webp";

interface Gamme {
  id: string;
  name_fr: string;
  color_hex: string | null;
}

interface Business {
  id: string;
  name: string;
  city: string;
  region: string;
  images: string[] | null;
  rating: number | null;
  main_category: string | null;
  categories: string[] | null;
  wtuce_status: string | null;
  google_maps_url: string | null;
  gamme_id: string | null;
}

interface TopCityBusinessesProps {
  businesses: Business[];
  cityName: string;
  neighborhoodName?: string;
  gammes?: Gamme[];
  onSelectBusiness?: (business: Business) => void;
  selectedBusinessId?: string | null;
}

const TopCityBusinesses = ({ businesses, cityName, neighborhoodName, gammes = [], onSelectBusiness, selectedBusinessId }: TopCityBusinessesProps) => {
  const { language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get top 10 businesses with images, sorted by priority (verified first, then by rating)
  const topBusinesses = [...businesses]
    .filter((b) => b.images && b.images.length > 0)
    .sort((a, b) => {
      // Verified first
      if (a.wtuce_status === "verified" && b.wtuce_status !== "verified") return -1;
      if (b.wtuce_status === "verified" && a.wtuce_status !== "verified") return 1;
      // Then by rating
      return (b.rating || 0) - (a.rating || 0);
    })
    .slice(0, 10);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 240;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (topBusinesses.length === 0) return null;

  return (
    <div className="mb-8 rounded-xl p-6 bg-black/20">
      {/* Section Header */}
      <div className="mb-6 text-center">
        <h2 className="mb-2 text-2xl font-bold text-black">
          {language === "fr"
            ? <>Les <span className="text-gold">adresses incontournables</span> <span className="text-white">de {cityName}{neighborhoodName ? ` ${neighborhoodName}` : ""}</span></>
            : language === "ar"
              ? <><span className="text-gold">العناوين التي لا غنى عنها</span> <span className="text-white">في {cityName}{neighborhoodName ? ` ${neighborhoodName}` : ""}</span></>
              : <>The <span className="text-gold">must-visit addresses</span> <span className="text-white">of {cityName}{neighborhoodName ? ` ${neighborhoodName}` : ""}</span></>}
        </h2>
      </div>

      {/* Scrollable Container with Arrows */}
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute -left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-gold p-3 shadow-lg transition-all hover:bg-gold/80"
        >
          <ChevronLeft className="h-6 w-6 text-black" />
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute -right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-gold p-3 shadow-lg transition-all hover:bg-gold/80"
        >
          <ChevronRight className="h-6 w-6 text-black" />
        </button>

        {/* Business Cards - Horizontal Scroll */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {topBusinesses.map((business) => (
            <Link
              key={business.id}
              to={`/business/${business.id}`}
              className="group flex-shrink-0"
            >
              <Card className="w-72 h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-gold/20 border border-gold/30 relative">
                {/* Background Image with overlay */}
                <div className="absolute inset-0">
                  <img
                    src={business.images![0]}
                    alt={business.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/70 transition-colors" />
                  
                  {/* Watermark logo for verified businesses - top right of image */}
                  {business.wtuce_status === "verified" && (
                    <img 
                      src={logoWatermark} 
                      alt="" 
                      className="absolute top-2 right-2 w-10 h-10 object-contain opacity-90 pointer-events-none z-10"
                    />
                  )}

                  {/* Rating - top left */}
                  {business.rating && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1 z-10">
                      <Star className="h-4 w-4 fill-gold text-gold" />
                      <span className="text-gold font-bold text-sm">{business.rating}/20</span>
                    </div>
                  )}

                  {/* Gamme badge - top center */}
                  {(() => {
                    const gamme = business.gamme_id ? gammes.find(g => g.id === business.gamme_id) : null;
                    return gamme ? (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                        <span 
                          className="text-xs text-black border border-black rounded-full px-2 py-0.5 whitespace-nowrap"
                          style={{ backgroundColor: gamme.color_hex || '#666666' }}
                        >
                          {gamme.name_fr}
                        </span>
                      </div>
                    ) : null;
                  })()}
                </div>

                <CardContent className="p-5 relative z-10 flex flex-col items-center justify-end min-h-[220px] text-center">

                  {/* Name */}
                  <h3 className="text-base font-semibold text-white group-hover:text-gold transition-colors mb-2 line-clamp-2">
                    {business.name}
                  </h3>

                  {/* Subcategory badge */}
                  {business.categories && business.categories.length > 0 && (
                    <span className="text-xs bg-white/20 text-white rounded-full px-2 py-0.5 mb-2">{business.categories[0]}</span>
                  )}

                  {/* View on map button */}
                  {onSelectBusiness && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectBusiness(business);
                      }}
                      className={`flex items-center gap-1 text-xs font-bold transition-colors ${
                        selectedBusinessId === business.id
                          ? "text-gold"
                          : "text-white hover:text-gold"
                      }`}
                    >
                      <MapPin className="h-3 w-3" />
                      {selectedBusinessId === business.id ? "Affiché sur la carte" : "Voir sur la carte"}
                    </button>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopCityBusinesses;
