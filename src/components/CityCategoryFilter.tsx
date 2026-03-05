import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import DynamicIcon from "@/components/DynamicIcon";
import { LayoutGrid } from "lucide-react";

interface CategoryCount {
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  icon: string | null;
  sort_order: number;
  count: number;
}

interface CityCategoryFilterProps {
  cityName: string;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

const CityCategoryFilter = ({ cityName, selectedCategory, onSelectCategory }: CityCategoryFilterProps) => {
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = useLanguage();

  useEffect(() => {
    if (!cityName) return;
    setIsLoading(true);

    const fetchCategoryCounts = async () => {
      // Fetch all categories with sort_order
      const { data: allCategories } = await supabase
        .from("categories")
        .select("name_fr, name_en, name_ar, icon, sort_order")
        .order("sort_order", { ascending: true });

      if (!allCategories) {
        setIsLoading(false);
        return;
      }

      // Fetch count of active businesses per main_category for this city
      const { data: businesses } = await supabase
        .from("businesses")
        .select("main_category")
        .eq("is_active", true)
        .ilike("city", cityName);

      if (!businesses) {
        setIsLoading(false);
        return;
      }

      // Count per category
      const countMap: Record<string, number> = {};
      for (const b of businesses) {
        if (b.main_category) {
          countMap[b.main_category] = (countMap[b.main_category] || 0) + 1;
        }
      }

      // Filter categories with at least 1 business, sorted by sort_order
      const result: CategoryCount[] = allCategories
        .filter(cat => (countMap[cat.name_fr] || 0) > 0)
        .map(cat => ({
          ...cat,
          sort_order: cat.sort_order ?? 999,
          count: countMap[cat.name_fr] || 0,
        }));

      setCategories(result);
      setIsLoading(false);
    };

    fetchCategoryCounts();
  }, [cityName]);

  if (isLoading || categories.length === 0) return null;

  const getLabel = (cat: CategoryCount) => {
    if (language === "en" && cat.name_en) return cat.name_en;
    if (language === "ar" && cat.name_ar) return cat.name_ar;
    return cat.name_fr;
  };

  return (
    <div className="mb-8">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.name_fr;
          return (
            <button
              key={cat.name_fr}
              onClick={() => onSelectCategory(isSelected ? null : cat.name_fr)}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all text-center min-h-[90px] ${
                isSelected
                  ? "bg-gold/20 border-gold text-gold shadow-md"
                  : "bg-card border-border text-muted-foreground hover:border-gold/40 hover:text-foreground"
              }`}
            >
              {cat.icon ? (
                <DynamicIcon
                  name={cat.icon}
                  size={22}
                  className={isSelected ? "text-gold" : "text-muted-foreground"}
                />
              ) : (
                <LayoutGrid size={22} className={isSelected ? "text-gold" : "text-muted-foreground"} />
              )}
              <span className="text-xs font-medium leading-tight line-clamp-2">{getLabel(cat)}</span>
              <span className={`text-[10px] font-semibold ${isSelected ? "text-gold" : "text-muted-foreground/60"}`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CityCategoryFilter;
