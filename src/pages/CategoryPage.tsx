import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Phone, Globe, ArrowLeft, Building2, ShieldCheck } from "lucide-react";
import {
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

interface Business {
  id: string;
  name: string;
  description: string | null;
  city: string;
  region: string;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  images: string[] | null;
  main_category: string | null;
  categories: string[] | null;
  wtuce_status: string | null;
  is_regulated_activity: boolean | null;
}

interface CategoryInfo {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  icon: string | null;
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

const CategoryPage = () => {
  const { categoryName } = useParams<{ categoryName: string }>();
  const { language } = useLanguage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<CategoryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const decodedCategoryName = categoryName ? decodeURIComponent(categoryName) : "";

  useEffect(() => {
    const fetchData = async () => {
      if (!decodedCategoryName) return;
      
      setIsLoading(true);
      try {
        // Fetch category info
        const { data: catData } = await supabase
          .from("categories")
          .select("id, name_fr, name_en, name_ar, icon")
          .eq("name_fr", decodedCategoryName)
          .single();

        if (catData) {
          setCategoryInfo(catData);
        }

        // Fetch businesses in this category
        const { data: businessData, error } = await supabase
          .from("businesses")
          .select("id, name, description, city, region, phone, website, logo_url, images, main_category, categories, wtuce_status, is_regulated_activity")
          .eq("is_active", true)
          .or(`main_category.eq.${decodedCategoryName},categories.cs.{${decodedCategoryName}}`)
          .order("wtuce_status", { ascending: true })
          .order("priority_score", { ascending: false })
          .limit(100);

        if (error) throw error;
        setBusinesses(businessData || []);
      } catch (error) {
        console.error("Error fetching category data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [decodedCategoryName]);

  const getCategoryName = () => {
    if (!categoryInfo) return decodedCategoryName;
    if (language === "ar" && categoryInfo.name_ar) return categoryInfo.name_ar;
    if (language === "en" && categoryInfo.name_en) return categoryInfo.name_en;
    return categoryInfo.name_fr;
  };

  const getCategoryIcon = () => {
    return CATEGORY_ICONS[decodedCategoryName] || Building2;
  };

  const getBusinessImage = (business: Business) => {
    if (business.logo_url) return business.logo_url;
    if (business.images && business.images.length > 0) return business.images[0];
    return "/placeholder.svg";
  };

  const IconComponent = getCategoryIcon();

  const translations = {
    fr: {
      backToHome: "Retour à l'accueil",
      establishments: "établissements",
      inCategory: "dans cette catégorie",
      noResults: "Aucun établissement trouvé dans cette catégorie",
      verified: "Vérifié",
      regulated: "Réglementé",
      viewDetails: "Voir détails"
    },
    en: {
      backToHome: "Back to home",
      establishments: "establishments",
      inCategory: "in this category",
      noResults: "No establishments found in this category",
      verified: "Verified",
      regulated: "Regulated",
      viewDetails: "View details"
    },
    ar: {
      backToHome: "العودة للرئيسية",
      establishments: "مؤسسة",
      inCategory: "في هذه الفئة",
      noResults: "لم يتم العثور على مؤسسات في هذه الفئة",
      verified: "موثق",
      regulated: "منظم",
      viewDetails: "عرض التفاصيل"
    }
  };

  const t = translations[language] || translations.fr;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-black py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-6">
            <div className="rounded-2xl bg-primary/20 p-6 border border-primary/30">
              <IconComponent className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                {getCategoryName()}
              </h1>
              <p className="text-xl text-gray-400">
                <span className="text-primary font-semibold">{businesses.length}</span> {t.establishments} {t.inCategory}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Results Grid */}
      <section className="py-12 bg-black">
        <div className="container mx-auto px-4">
          {businesses.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-400">{t.noResults}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {businesses.map((business) => (
                <Link key={business.id} to={`/business/${business.id}`}>
                  <Card className="group h-full overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                    {/* Image */}
                    <div className="aspect-[4/3] overflow-hidden bg-muted">
                      <img
                        src={getBusinessImage(business)}
                        alt={business.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    </div>
                    
                    <CardContent className="p-4">
                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {business.wtuce_status === "verified" && (
                          <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            {t.verified}
                          </Badge>
                        )}
                        {business.is_regulated_activity && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            {t.regulated}
                          </Badge>
                        )}
                      </div>

                      {/* Name */}
                      <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {business.name}
                      </h3>

                      {/* Location */}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{business.city}, {business.region}</span>
                      </div>

                      {/* Contact info */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {business.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span className="truncate">{business.phone}</span>
                          </div>
                        )}
                        {business.website && (
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            <span>Web</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CategoryPage;
