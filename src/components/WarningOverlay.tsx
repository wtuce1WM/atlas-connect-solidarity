import { useEffect, useState } from "react";
import { MapPin, AlertTriangle, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface CityOption {
  name: string;
  priority: number;
  [key: string]: any;
}

const normalizeText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

interface WarningOverlayProps {
  /** All businesses from current search — used to extract available categories and cities */
  allBusinesses: { main_category: string | null; categories?: string[] | null; city?: string | null }[];
  /** Sorted city list */
  citiesWithPriority: CityOption[];
  /** Currently selected city (or "all") */
  selectedCity: string | null;
  /** City detected by the search engine */
  detectedCity: string | null;
  /** Currently selected category filter */
  selectedCategoryFilter: string | null;
  /** Subcategory detected by the search engine */
  detectedSubcategory: string | null;
  /** Category detected by intent words */
  detectedCategory: string | null;
  /** The raw search query for display */
  searchQuery: string;
  /** Spoken text alternative */
  spokenText?: string;
  onSelectCity: (city: string) => void;
  onSelectCategory: (cat: string) => void;
  onClose?: () => void;
}

const WarningOverlay = ({
  allBusinesses,
  citiesWithPriority,
  selectedCity,
  detectedCity,
  selectedCategoryFilter,
  detectedSubcategory,
  detectedCategory,
  searchQuery,
  spokenText,
  onSelectCity,
  onSelectCategory,
  onClose,
}: WarningOverlayProps) => {
  const { language } = useLanguage();

  const hasCity = (selectedCity && selectedCity !== "all") || !!detectedCity;
  const hasCategory = !!selectedCategoryFilter || !!detectedSubcategory || !!detectedCategory;

  const effectiveCategory = selectedCategoryFilter || detectedCategory;
  const effectiveSubcategory = detectedSubcategory;

  const scopedBusinesses = allBusinesses.filter((business) => {
    if (effectiveCategory) {
      if (!business.main_category || normalizeText(business.main_category) !== normalizeText(effectiveCategory)) {
        return false;
      }
    }

    if (effectiveSubcategory) {
      const matchesSubcategory =
        Array.isArray(business.categories) &&
        business.categories.some((sub) => normalizeText(sub) === normalizeText(effectiveSubcategory));
      if (!matchesSubcategory) return false;
    }

    return true;
  });

  const rawCategories = [...new Set(scopedBusinesses.map(b => b.main_category).filter(Boolean))] as string[];

  // For city suggestions, use all businesses (not category-scoped) when category is already known,
  // because the backend already returned relevant results and re-filtering by main_category
  // can exclude valid results (e.g. "Vie nocturne" businesses for a "Restauration" detected category)
  const businessesForCities = hasCategory ? allBusinesses : scopedBusinesses;
  const businessCities = new Set(
    businessesForCities
      .map((b) => (b.city ? normalizeText(b.city) : null))
      .filter(Boolean) as string[]
  );
  const availableCities = citiesWithPriority.filter((c) => businessCities.has(normalizeText(c.name)));

  // Fetch sort_order from categories table
  const [sortedCategories, setSortedCategories] = useState<string[]>(rawCategories);
  useEffect(() => {
    if (rawCategories.length === 0) return;
    const fetchOrder = async () => {
      const { data } = await supabase
        .from("categories")
        .select("name_fr, sort_order")
        .in("name_fr", rawCategories)
        .order("sort_order", { ascending: true });
      if (data) {
        const ordered = data.map(c => c.name_fr);
        const remaining = rawCategories.filter(c => !ordered.includes(c));
        setSortedCategories([...ordered, ...remaining]);
      }
    };
    fetchOrder();
  }, [rawCategories.join(",")]);

  const categories = sortedCategories;

  // Don't render if both are already known
  if (hasCity && hasCategory) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Fermer"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>
      )}
      {/* Scrollable content — leave space for bottom search bar */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-28">
        <div className="max-w-3xl mx-auto pt-20 sm:pt-24">
          {/* Warning header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/15 text-gold mb-4">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {language === "en" ? "Precision required" : language === "ar" ? "الدقة مطلوبة" : "Précision requise"}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              {language === "en"
                ? "To show you relevant results, please specify:"
                : language === "ar"
                  ? "لعرض نتائج دقيقة، يرجى تحديد:"
                  : "Pour vous afficher des résultats pertinents, veuillez préciser :"}
            </p>
            {(spokenText || searchQuery) && (
              <p className="text-lg md:text-xl font-bold text-foreground mt-3">
                «&nbsp;{spokenText || searchQuery}&nbsp;»
              </p>
            )}
          </div>

          {/* Category selection */}
          {!hasCategory && (
            <div className="pb-6">
              <div className="text-center">
                <p className="text-sm font-medium text-foreground mb-3">
                  {language === "en" ? "What are you looking for?" : language === "ar" ? "ماذا تبحث عنه؟" : "Que cherchez-vous ?"}
                </p>
                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                  {categories.slice(0, 8).map(cat => (
                    <button
                      key={cat}
                      onClick={() => onSelectCategory(cat)}
                      className="shrink-0 whitespace-nowrap px-4 py-2 rounded-full border border-border bg-card text-sm text-foreground hover:border-gold/50 hover:bg-gold/10 transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* City selection */}
          {!hasCity && (
            <div className="pb-6">
              <div className="text-center">
                <p className="text-sm font-medium text-foreground mb-3">
                  {language === "en" ? "Where are you looking?" : language === "ar" ? "أين تبحث؟" : "Où le cherchez-vous ?"}
                </p>
                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                  {availableCities.slice(0, 10).map(c => (
                    <button
                      key={c.name}
                      onClick={() => onSelectCity(c.name)}
                      className="shrink-0 whitespace-nowrap px-4 py-2 rounded-full border border-border bg-card text-sm text-foreground hover:border-gold/50 hover:bg-gold/10 transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5 inline mr-1.5 text-muted-foreground" />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarningOverlay;
