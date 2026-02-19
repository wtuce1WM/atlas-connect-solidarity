import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Building2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import DynamicIcon from "@/components/DynamicIcon";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";

interface Category {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  icon: string | null;
  businessCount?: number;
}

const CategoriesCarouselSection = ({ showTitle = true }: { showTitle?: boolean }) => {
  const { language } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -320 : 320,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [{ data: categoriesData }, { data: businessCounts }] = await Promise.all([
          supabase.from("categories").select("id, name_fr, name_en, name_ar, icon").order("sort_order", { ascending: true }),
          supabase.from("businesses").select("main_category").eq("is_active", true),
        ]);

        const categoryCountMap: Record<string, number> = {};
        businessCounts?.forEach((b) => {
          const mainCat = (b as any).main_category;
          if (mainCat) categoryCountMap[mainCat] = (categoryCountMap[mainCat] || 0) + 1;
        });

        const merged = (categoriesData || [])
          .map((cat) => ({ ...cat, businessCount: categoryCountMap[cat.name_fr] || 0 }))
          .filter((cat) => cat.businessCount > 0);

        setCategories(merged);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getCategoryName = (cat: Category) => {
    if (language === "ar" && cat.name_ar) return cat.name_ar;
    if (language === "en" && cat.name_en) return cat.name_en;
    return cat.name_fr;
  };

  if (isLoading) {
    return (
      <section className="bg-black py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </section>
    );
  }

  return (
    <section className="bg-black py-16 px-4">
      <div className="container mx-auto max-w-5xl">
        {showTitle && (
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-3xl font-bold text-white">
              {language === "fr"
                ? <>Trouvez les <span className="text-gold">meilleurs professionnels</span> par secteur d'activité</>
                : language === "ar"
                  ? <>ابحث عن <span className="text-gold">أفضل المهنيين</span> حسب قطاع النشاط</>
                  : <>Find the <span className="text-gold">best professionals</span> by industry sector</>}
            </h2>
          </div>
        )}

        <div className="relative rounded-[2rem] bg-white/5 p-4">
          <button
            onClick={() => scroll("left")}
            className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-gold p-2 shadow-lg transition-all hover:bg-white/20 backdrop-blur-sm"
          >
            <ChevronLeft className="h-5 w-5 text-black hover:text-white" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-gold p-2 shadow-lg transition-all hover:bg-white/20 backdrop-blur-sm"
          >
            <ChevronRight className="h-5 w-5 text-black hover:text-white" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${encodeURIComponent(category.name_fr)}`}
                className="flex-shrink-0"
              >
                <Card className="w-52 h-36 bg-white/10 border-white/30 hover:bg-gold/20 hover:border-gold transition-all">
                  <CardContent className="p-5 text-center h-full flex flex-col items-center justify-center">
                    <div className="flex justify-center mb-2">
                      {category.icon ? (
                        <DynamicIcon name={category.icon} className="h-7 w-7 text-gold" fallback={<Building2 className="h-7 w-7 text-gold" />} />
                      ) : (
                        <Building2 className="h-7 w-7 text-gold" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">
                      {getCategoryName(category)}
                    </h3>
                    <div className="flex items-center justify-center gap-1 text-sm text-gray-300">
                      <Building2 className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {category.businessCount || 0}{" "}
                        {language === "fr" ? "établissements" : language === "ar" ? "مؤسسة" : "businesses"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoriesCarouselSection;
