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
  id: string;
}

interface SubcategoryCount {
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
  selectedSubcategory?: string | null;
  onSelectSubcategory?: (subcategory: string | null) => void;
}

const CityCategoryFilter = ({
  cityName,
  selectedCategory,
  onSelectCategory,
  selectedSubcategory,
  onSelectSubcategory,
}: CityCategoryFilterProps) => {
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);
  const { language } = useLanguage();

  // Fetch categories
  useEffect(() => {
    if (!cityName) return;
    setIsLoading(true);

    const fetchCategoryCounts = async () => {
      const { data: allCategories } = await supabase
        .from("categories")
        .select("id, name_fr, name_en, name_ar, icon, sort_order")
        .order("sort_order", { ascending: true });

      if (!allCategories) {
        setIsLoading(false);
        return;
      }

      const { data: businesses } = await supabase
        .from("businesses")
        .select("main_category")
        .eq("is_active", true)
        .ilike("city", cityName);

      if (!businesses) {
        setIsLoading(false);
        return;
      }

      const countMap: Record<string, number> = {};
      for (const b of businesses) {
        if (b.main_category) {
          countMap[b.main_category] = (countMap[b.main_category] || 0) + 1;
        }
      }

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

  // Fetch subcategories when a category is selected
  useEffect(() => {
    if (!selectedCategory || !cityName) {
      setSubcategories([]);
      return;
    }

    setIsLoadingSubs(true);

    const fetchSubcategoryCounts = async () => {
      // Find the category id
      const cat = categories.find(c => c.name_fr === selectedCategory);
      if (!cat) {
        setIsLoadingSubs(false);
        return;
      }

      // Fetch subcategories for this category
      const { data: allSubs } = await supabase
        .from("subcategories")
        .select("name_fr, name_en, name_ar, icon, sort_order")
        .eq("category_id", cat.id)
        .order("sort_order", { ascending: true });

      if (!allSubs) {
        setIsLoadingSubs(false);
        return;
      }

      // Fetch businesses in this city+category to count subcategories
      const { data: businesses } = await supabase
        .from("businesses")
        .select("categories")
        .eq("is_active", true)
        .ilike("city", cityName)
        .eq("main_category", selectedCategory);

      if (!businesses) {
        setIsLoadingSubs(false);
        return;
      }

      // Count per subcategory name
      const countMap: Record<string, number> = {};
      for (const b of businesses) {
        if (b.categories) {
          for (const c of b.categories) {
            countMap[c] = (countMap[c] || 0) + 1;
          }
        }
      }

      const result: SubcategoryCount[] = allSubs
        .filter(sub => (countMap[sub.name_fr] || 0) > 0)
        .map(sub => ({
          ...sub,
          sort_order: sub.sort_order ?? 999,
          count: countMap[sub.name_fr] || 0,
        }));

      setSubcategories(result);
      setIsLoadingSubs(false);
    };

    fetchSubcategoryCounts();
  }, [selectedCategory, cityName, categories]);

  if (isLoading || categories.length === 0) return null;

  const getLabel = (item: { name_fr: string; name_en: string | null; name_ar: string | null }) => {
    if (language === "en" && item.name_en) return item.name_en;
    if (language === "ar" && item.name_ar) return item.name_ar;
    return item.name_fr;
  };

  return (
    <div className="mb-8">
      {/* Categories */}
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

      {/* Subcategories — shown when a category is selected */}
      {selectedCategory && !isLoadingSubs && subcategories.length > 0 && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {subcategories.map((sub) => {
            const isSelected = selectedSubcategory === sub.name_fr;
            return (
              <button
                key={sub.name_fr}
                onClick={() => onSelectSubcategory?.(isSelected ? null : sub.name_fr)}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all text-center min-h-[90px] ${
                  isSelected
                    ? "bg-secondary/20 border-secondary text-secondary shadow-md"
                    : "bg-card border-border text-muted-foreground hover:border-secondary/40 hover:text-foreground"
                }`}
              >
                {sub.icon ? (
                  <DynamicIcon
                    name={sub.icon}
                    size={20}
                    className={isSelected ? "text-secondary" : "text-muted-foreground"}
                  />
                ) : (
                  <LayoutGrid size={20} className={isSelected ? "text-secondary" : "text-muted-foreground"} />
                )}
                <span className="text-xs font-medium leading-tight line-clamp-2">{getLabel(sub)}</span>
                <span className={`text-[10px] font-semibold ${isSelected ? "text-secondary" : "text-muted-foreground/60"}`}>
                  {sub.count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CityCategoryFilter;
