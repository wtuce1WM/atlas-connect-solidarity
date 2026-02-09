import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import BusinessCard, { type BusinessCardData, type Gamme } from "@/components/BusinessCard";

interface TopCityBusinessesProps {
  businesses: BusinessCardData[];
  cityName: string;
  gammes?: Gamme[];
  onSelectBusiness?: (business: BusinessCardData) => void;
  selectedBusinessId?: string | null;
}

const TopCityBusinesses = ({ businesses, cityName, gammes = [], onSelectBusiness, selectedBusinessId }: TopCityBusinessesProps) => {
  const { language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get top 10 businesses with images, sorted by priority (verified first, then by rating)
  const topBusinesses = [...businesses]
    .filter((b) => b.images && b.images.length > 0)
    .sort((a, b) => {
      if (a.wtuce_status === "verified" && b.wtuce_status !== "verified") return -1;
      if (b.wtuce_status === "verified" && a.wtuce_status !== "verified") return 1;
      return (b.rating || 0) - (a.rating || 0);
    })
    .slice(0, 10);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (topBusinesses.length === 0) return null;

  return (
    <div className="mb-8 bg-black/20 backdrop-blur-sm rounded-xl p-6">
      {/* Section Header */}
      <div className="mb-6 text-center">
        <h2 className="mb-2 text-2xl font-bold text-white">
          {language === "fr"
            ? <>Découvrez notre sélection des <span className="text-white">adresses incontournables</span></>
            : language === "ar"
              ? <>اكتشف مجموعتنا من <span className="text-white">العناوين التي لا غنى عنها</span></>
              : <>Discover our selection of <span className="text-white">must-visit addresses</span></>}
        </h2>
      </div>

      {/* Scrollable Container with Arrows */}
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute -left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black p-3 shadow-lg transition-all hover:bg-black/80"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>

        <button
          onClick={() => scroll("right")}
          className="absolute -right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black p-3 shadow-lg transition-all hover:bg-black/80"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {topBusinesses.map((business) => (
            <div key={business.id} className="flex-shrink-0 w-72">
              <BusinessCard
                business={business}
                gammes={gammes}
                verifiedLabel={language === "fr" ? "Vérifié" : language === "ar" ? "موثق" : "Verified"}
                selectedBusinessId={selectedBusinessId}
                onSelectBusiness={onSelectBusiness}
                showMapButton={!!onSelectBusiness}
                mapButtonLabels={{
                  view: language === "fr" ? "Voir sur la carte" : language === "ar" ? "عرض على الخريطة" : "View on map",
                  shown: language === "fr" ? "Affiché sur la carte" : language === "ar" ? "معروض على الخريطة" : "Shown on map",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopCityBusinesses;
