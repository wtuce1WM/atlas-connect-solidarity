import { useEffect, useState, useMemo } from "react";
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
  id: string;
}

interface ServiceItem {
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  icon: string | null;
  count: number;
}

interface CityCategoryFilterProps {
  cityName: string | null;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  selectedSubcategory?: string | null;
  onSelectSubcategory?: (subcategory: string | null) => void;
  selectedService?: string | null;
  onSelectService?: (service: string | null) => void;
  hasCityBar?: boolean;
  stickyBaseTop?: number;
}

const CityCategoryFilter = ({
  cityName,
  selectedCategory,
  onSelectCategory,
  selectedSubcategory,
  onSelectSubcategory,
  selectedService,
  onSelectService,
  hasCityBar = false,
  stickyBaseTop,
}: CityCategoryFilterProps) => {
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryCount[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const { language } = useLanguage();

  // Fetch categories
  useEffect(() => {
    setIsLoading(true);
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

      let businessQuery = supabase
        .from("businesses")
        .select("main_category")
        .eq("is_active", true);
      if (cityName) {
        businessQuery = businessQuery.ilike("city", cityName);
      }
      const { data: businesses } = await businessQuery;

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
    if (!selectedCategory) {
      setSubcategories([]);
      return;
    }

    setIsLoadingSubs(true);

    const fetchSubcategoryCounts = async () => {
      const cat = categories.find(c => c.name_fr === selectedCategory);
      if (!cat) {
        setIsLoadingSubs(false);
        return;
      }

      const { data: allSubs } = await supabase
        .from("subcategories")
        .select("id, name_fr, name_en, name_ar, icon, sort_order")
        .eq("category_id", cat.id)
        .order("sort_order", { ascending: true });

      if (!allSubs) {
        setIsLoadingSubs(false);
        return;
      }

      let subBusinessQuery = supabase
        .from("businesses")
        .select("categories")
        .eq("is_active", true)
        .eq("main_category", selectedCategory);
      if (cityName) {
        subBusinessQuery = subBusinessQuery.ilike("city", cityName);
      }
      const { data: businesses } = await subBusinessQuery;

      if (!businesses) {
        setIsLoadingSubs(false);
        return;
      }

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
        }))
        .sort((a, b) => {
          // Put the detected (selected) subcategory first
          const aSelected = a.name_fr === selectedSubcategory ? -1 : 0;
          const bSelected = b.name_fr === selectedSubcategory ? -1 : 0;
          if (aSelected !== bSelected) return aSelected - bSelected;
          return b.sort_order - a.sort_order;
        });

      setSubcategories(result);
      setIsLoadingSubs(false);
    };

    fetchSubcategoryCounts();
  }, [selectedCategory, cityName, categories]);

  // Fetch services when a subcategory is selected
  useEffect(() => {
    if (!selectedSubcategory) {
      setServices([]);
      return;
    }

    setIsLoadingServices(true);

    const fetchServices = async () => {
      // Find subcategory id
      const sub = subcategories.find(s => s.name_fr === selectedSubcategory);
      if (!sub) {
        setIsLoadingServices(false);
        return;
      }

      // Fetch active + filtered services for this subcategory
      const { data: allServices } = await supabase
        .from("services")
        .select("id, name_fr, name_en, name_ar, icon, is_filtered")
        .eq("subcategory_id", sub.id)
        .eq("is_active", true)
        .eq("is_filtered", true)
        .order("name_fr", { ascending: true });

      if (!allServices || allServices.length === 0) {
        setServices([]);
        setIsLoadingServices(false);
        return;
      }

      // Filter services by city if a city is specified
      let filteredServices = allServices;
      if (cityName) {
        // Get city id
        const { data: cities } = await supabase
          .from("cities")
          .select("id, name_fr")
          .ilike("name_fr", cityName)
          .limit(1);

        const cityId = cities?.[0]?.id;

        if (cityId) {
          // Check which services are enabled for this city
          const serviceIds = allServices.map(s => s.id);
          const { data: cityFilters } = await supabase
            .from("service_city_filters")
            .select("service_id")
            .eq("city_id", cityId)
            .in("service_id", serviceIds);

          const allowedServiceIds = new Set((cityFilters || []).map(cf => cf.service_id));
          filteredServices = allServices.filter(svc => allowedServiceIds.has(svc.id));
        }
      }

      // Count businesses that have each service in this subcategory (optionally filtered by city)
      let svcBusinessQuery = supabase
        .from("businesses")
        .select("services")
        .eq("is_active", true)
        .contains("categories", [selectedSubcategory]);
      if (cityName) {
        svcBusinessQuery = svcBusinessQuery.ilike("city", cityName);
      }
      const { data: businesses } = await svcBusinessQuery;

      const countMap: Record<string, number> = {};
      if (businesses) {
        for (const b of businesses) {
          if (b.services) {
            for (const s of b.services) {
              countMap[s] = (countMap[s] || 0) + 1;
            }
          }
        }
      }

      const result: ServiceItem[] = filteredServices
        .filter(svc => (countMap[svc.name_fr] || 0) > 0)
        .map(svc => ({
          name_fr: svc.name_fr,
          name_en: svc.name_en,
          name_ar: svc.name_ar,
          icon: svc.icon,
          count: countMap[svc.name_fr] || 0,
        }))
        .sort((a, b) => a.name_fr.localeCompare(b.name_fr, "fr"));

      setServices(result);
      setIsLoadingServices(false);
    };

    fetchServices();
  }, [selectedSubcategory, cityName, subcategories]);

  if (isLoading || categories.length === 0) return null;

  const getLabel = (item: { name_fr: string; name_en: string | null; name_ar: string | null }) => {
    if (language === "en" && item.name_en) return item.name_en;
    if (language === "ar" && item.name_ar) return item.name_ar;
    return item.name_fr;
  };

  const baseTop = stickyBaseTop ?? (104 + (hasCityBar ? 44 : 0));

  return (
    <>
      {/* Sticky categories zone */}
      <div data-category-filter className={`sticky z-[5] bg-background border-b border-border py-2 relative`} style={{ top: `${baseTop}px` }}>
        <span className="absolute top-0 left-1 z-50 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded select-all cursor-text">🟡 STICKY 3b — Category Filter</span>
        <div className="mx-auto px-4 max-w-[80%]">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.name_fr;
              return (
                <button
                  key={cat.name_fr}
                  onClick={() => onSelectCategory(isSelected ? null : cat.name_fr)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                    isSelected
                      ? "bg-gold/20 border-gold text-gold shadow-sm"
                      : "bg-card border-border text-muted-foreground hover:border-gold/40 hover:text-foreground"
                  }`}
                >
                  {cat.icon ? (
                    <DynamicIcon
                      name={cat.icon}
                      size={16}
                      className={isSelected ? "text-gold" : "text-muted-foreground"}
                    />
                  ) : (
                    <LayoutGrid size={16} className={isSelected ? "text-gold" : "text-muted-foreground"} />
                  )}
                  <span>{getLabel(cat)}</span>
                  <span className={`text-[10px] ${isSelected ? "text-gold" : "text-muted-foreground/60"}`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky subcategories zone */}
      {selectedCategory && !isLoadingSubs && subcategories.length > 0 && (
        <div data-subcategory-filter className={`sticky z-[4] bg-background border-b border-border py-2 relative`} ref={(el) => { if (el) { const catEl = document.querySelector<HTMLElement>('[data-category-filter]'); if (catEl) { const catBottom = parseFloat(catEl.style.top || '0') + catEl.getBoundingClientRect().height; el.style.top = `${catBottom}px`; } else { el.style.top = `${baseTop + 62}px`; } } }}>
          <span className="absolute top-0 left-1 z-50 bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded select-all cursor-text">🩷 STICKY 3c — Subcategory Filter</span>
          <div className="mx-auto px-4 max-w-[80%]">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {subcategories.map((sub) => {
                const isSelected = selectedSubcategory === sub.name_fr;
                return (
                  <button
                    key={sub.name_fr}
                    onClick={() => onSelectSubcategory?.(isSelected ? null : sub.name_fr)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                      isSelected
                        ? "bg-secondary/20 border-secondary text-secondary shadow-sm"
                        : "bg-card border-border text-muted-foreground hover:border-secondary/40 hover:text-foreground"
                    }`}
                  >
                    {sub.icon ? (
                      <DynamicIcon
                        name={sub.icon}
                        size={14}
                        className={isSelected ? "text-secondary" : "text-muted-foreground"}
                      />
                    ) : null}
                    <span>{getLabel(sub)}</span>
                    <span className={`text-[10px] ${isSelected ? "text-secondary" : "text-muted-foreground/60"}`}>
                      {sub.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sticky services zone */}
      {selectedSubcategory && !isLoadingServices && services.length > 0 && (
        <div data-service-filter className={`sticky z-[3] bg-background border-b border-border py-2 relative`} ref={(el) => { if (el) { const subEl = document.querySelector<HTMLElement>('[data-subcategory-filter]'); if (subEl) { const subBottom = parseFloat(subEl.style.top || '0') + subEl.getBoundingClientRect().height; el.style.top = `${subBottom}px`; } else { el.style.top = `${baseTop + 113}px`; } } }}>
          <span className="absolute top-0 left-1 z-50 bg-cyan-500 text-white text-[10px] font-bold px-2 py-0.5 rounded select-all cursor-text">🩵 STICKY 3d — Service Filter</span>
          <div className="mx-auto px-4 max-w-[80%]">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {services.map((svc) => {
                const isSelected = selectedService === svc.name_fr;
                return (
                  <button
                    key={svc.name_fr}
                    onClick={() => onSelectService?.(isSelected ? null : svc.name_fr)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium whitespace-nowrap transition-all shrink-0 ${
                      isSelected
                        ? "bg-accent/20 border-accent text-accent-foreground shadow-sm"
                        : "bg-card border-border text-muted-foreground hover:border-accent/40 hover:text-foreground"
                    }`}
                  >
                    {svc.icon ? (
                      <DynamicIcon
                        name={svc.icon}
                        size={12}
                        className={isSelected ? "text-accent-foreground" : "text-muted-foreground"}
                      />
                    ) : null}
                    <span>{getLabel(svc)}</span>
                    <span className={`text-[9px] ${isSelected ? "text-accent-foreground/70" : "text-muted-foreground/60"}`}>
                      {svc.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CityCategoryFilter;
