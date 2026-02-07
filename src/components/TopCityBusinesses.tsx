import { useRef } from "react";
import { Link } from "react-router-dom";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import logoWatermark from "@/assets/logoGOLD-watermark.webp";

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
}

interface TopCityBusinessesProps {
  businesses: Business[];
  cityName: string;
}

const TopCityBusinesses = ({ businesses, cityName }: TopCityBusinessesProps) => {
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
    <div className="mb-8">
      {/* Section Header */}
      <div className="mb-6 text-center">
        <h2 className="mb-2 text-2xl font-bold text-white">
          {language === "fr"
            ? <>Découvrez notre sélection des <span className="text-gold">adresses incontournables</span></>
            : language === "ar"
              ? <>اكتشف مجموعتنا من <span className="text-gold">العناوين التي لا غنى عنها</span></>
              : <>Discover our selection of <span className="text-gold">must-visit addresses</span></>}
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
              <Card className="w-56 h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-gold/20 border border-gold/30 relative">
                {/* Background Image with overlay */}
                <div className="absolute inset-0">
                  <img
                    src={business.images![0]}
                    alt={business.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors" />
                </div>

                <CardContent className="p-4 relative z-10 flex flex-col items-center justify-center min-h-[180px] text-center">
                  {/* Watermark logo for verified businesses */}
                  {business.wtuce_status === "verified" && (
                    <img 
                      src={logoWatermark} 
                      alt="" 
                      className="absolute bottom-2 right-2 w-10 h-10 object-contain opacity-80 pointer-events-none"
                    />
                  )}

                  {/* Rating */}
                  {business.rating && (
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Star className="h-4 w-4 fill-gold text-gold" />
                      <span className="text-gold font-bold text-sm">{business.rating}/20</span>
                    </div>
                  )}

                  {/* Name */}
                  <h3 className="text-sm font-semibold text-white group-hover:text-gold transition-colors mb-1 line-clamp-2">
                    {business.name}
                  </h3>

                  {/* Default Subcategory (first in categories array) */}
                  {business.categories && business.categories.length > 0 && (
                    <span className="text-xs text-gray-300">{business.categories[0]}</span>
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
