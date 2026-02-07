import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Building2, 
  Loader2,
  Hotel,
  Utensils,
  Car,
  Palette,
  ShoppingBag,
  Wrench,
  Compass,
  Wheat,
  Factory,
  GraduationCap,
  Heart,
  Dumbbell,
  Sparkles,
  Theater,
  Cpu
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";

interface Category {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  icon: string | null;
  sort_order: number | null;
}

interface CategoryWithCount extends Category {
  businessCount: number;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Hôtellerie": Hotel,
  "Restauration": Utensils,
  "Transport": Car,
  "Artisanat": Palette,
  "Commerce": ShoppingBag,
  "Services": Wrench,
  "Tourisme": Compass,
  "Agriculture": Wheat,
  "Industrie": Factory,
  "Éducation": GraduationCap,
  "Santé": Heart,
  "Sport & Loisirs": Dumbbell,
  "Bien-être": Sparkles,
  "Culture": Theater,
  "Technologie": Cpu,
};

const CategoriesSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        // Fetch categories ordered by sort_order
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("id, name_fr, name_en, name_ar, icon, sort_order")
          .order("sort_order", { ascending: true });

        if (categoriesError) throw categoriesError;

        // Fetch business counts per main_category
        const { data: businessCounts, error: countError } = await supabase
          .from("businesses")
          .select("main_category")
          .eq("is_active", true);

        if (countError) throw countError;

        // Count businesses per category
        const countMap: Record<string, number> = {};
        businessCounts?.forEach((b) => {
          const category = b.main_category;
          if (category) {
            countMap[category] = (countMap[category] || 0) + 1;
          }
        });

        // Merge counts with categories (only include categories with businesses)
        const categoriesWithCounts: CategoryWithCount[] = (categoriesData || [])
          .map((cat) => ({
            ...cat,
            businessCount: countMap[cat.name_fr] || 0,
          }))
          .filter((cat) => cat.businessCount > 0);

        setCategories(categoriesWithCounts);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const getCategoryName = (category: Category) => {
    if (language === "ar" && category.name_ar) return category.name_ar;
    if (language === "en" && category.name_en) return category.name_en;
    return category.name_fr;
  };

  const getCategoryIcon = (categoryName: string) => {
    return CATEGORY_ICONS[categoryName] || Building2;
  };

  const getColorByIndex = (index: number) => {
    const colors = [
      "bg-primary/10 text-primary border-primary/20",
      "bg-secondary/10 text-secondary border-secondary/20",
      "bg-atlas/10 text-atlas border-atlas/20",
      "bg-gold/10 text-gold border-gold/20",
    ];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <section className="bg-black py-12">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="bg-black py-12">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-3xl font-bold text-white">
            {language === "fr"
              ? "Trouvez les meilleurs professionnels par secteur d'activité"
              : language === "ar"
                ? "ابحث عن أفضل المهنيين حسب قطاع النشاط"
                : "Find the best professionals by industry sector"}
          </h2>
        </div>

        {/* Scrollable Categories */}
        <div className="relative">
          {/* Scroll Buttons */}
          <button
            onClick={() => scroll("left")}
            className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-card p-3 shadow-lg transition-all hover:bg-primary hover:text-primary-foreground"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-card p-3 shadow-lg transition-all hover:bg-primary hover:text-primary-foreground"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Scrollable Container */}
          <div
            ref={scrollRef}
            className="scrollbar-hide flex gap-4 overflow-x-auto scroll-smooth pb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categories.map((category, index) => {
              const IconComponent = getCategoryIcon(category.name_fr);
              return (
                <Link
                  key={category.id}
                  to={`/category/${encodeURIComponent(category.name_fr)}`}
                  className="flex-shrink-0"
                >
                  <Card
                    className={`group w-56 overflow-hidden transition-all hover:shadow-lg hover:scale-105 border ${getColorByIndex(index)}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`rounded-full p-2 ${getColorByIndex(index)}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-white group-hover:text-primary transition-colors">
                          {getCategoryName(category)}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Building2 className="h-3 w-3" />
                        <span>
                          {category.businessCount}{" "}
                          {language === "fr"
                            ? "établissements"
                            : language === "ar"
                              ? "مؤسسة"
                              : "businesses"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
