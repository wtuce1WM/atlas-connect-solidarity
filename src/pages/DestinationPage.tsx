import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useSEO } from "@/hooks/useSEO";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import { supabase } from "@/integrations/supabase/client";
import { sortWtuceAndRating } from "@/lib/businessRanking";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, ChevronLeft, ChevronRight, ArrowLeft, Compass } from "lucide-react";
import BusinessCard, { type Gamme, type Badge } from "@/components/BusinessCard";
import heroBackground from "@/assets/hero-marrakech.jpg";

interface Business {
  id: string;
  name: string;
  description: string | null;
  city: string;
  region: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  skype: string | null;
  website: string | null;
  logo_url: string | null;
  images: string[] | null;
  main_category: string | null;
  categories: string[] | null;
  services: string[] | null;
  wtuce_status: string | null;
  is_regulated_activity: boolean | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  opening_hours: unknown;
  show_opening_hours: boolean | null;
  is_open_24h: boolean;
  rating: number | null;
  gamme_id: string | null;
  badge_id: string | null;
  neighborhood: string | null;
  hook_fr: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
}

const ITEMS_PER_PAGE = 20;

const DestinationPage = () => {
  const { destinationName } = useParams<{ destinationName: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [destinationInfo, setDestinationInfo] = useState<{ name_fr: string; name_en: string | null; name_ar: string | null; hook: string | null; description: string | null } | null>(null);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name_fr: string; sort_order: number | null }[]>([]);
  const [badgeSubcategories, setBadgeSubcategories] = useState<{ badge_id: string; subcategory_id: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const decodedName = destinationName ? decodeURIComponent(destinationName) : "";

  useSEO({
    title: decodedName ? `${decodedName} – Destination` : "Destination",
    description: decodedName ? `Découvrez les meilleures adresses à ${decodedName}. Guide sélectionné par ONE WORLD MOROCCO.` : undefined,
    canonical: destinationName ? `/destination/${destinationName}` : undefined,
  });

  const getEffectiveRating = (b: Business): number | null => {
    if (b.rating) return Number(b.rating);
    return computeWeightedRatingOn20(collectRatingSources(b));
  };

  const sortedBusinesses = useMemo(() => {
    // WTUCE > priority_score > rating (ignore <10 reviews) — same as SearchPage
    return [...businesses].sort(sortWtuceAndRating);
  }, [businesses]);

  const totalPages = Math.ceil(sortedBusinesses.length / ITEMS_PER_PAGE);
  const paginatedBusinesses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedBusinesses.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedBusinesses, currentPage]);

  useEffect(() => {
    const fetchData = async () => {
      if (!decodedName) return;
      setIsLoading(true);

      try {
        // Fetch destination info
        const { data: destData } = await (supabase
          .from("destinations" as any)
          .select("id, name_fr, name_en, name_ar, hook, description")
          .eq("name_fr", decodedName)
          .maybeSingle() as any);

        if (!destData) {
          setIsLoading(false);
          return;
        }
        setDestinationInfo(destData);

        // Fetch linked business IDs
        const { data: links } = await (supabase
          .from("business_destinations" as any)
          .select("business_id")
          .eq("destination_id", destData.id) as any);

        const businessIds = (links || []).map((l: any) => l.business_id);

        if (businessIds.length === 0) {
          setBusinesses([]);
          setIsLoading(false);
          return;
        }

        // Fetch businesses + gammes + badges in parallel
        const [bizRes, gammesRes, badgesRes, subcatsRes, badgeSubcatsRes] = await Promise.all([
          supabase
            .from("businesses")
            .select("id, slug, name, description, city, region, address, phone, whatsapp, skype, website, logo_url, images, main_category, categories, services, default_service, wtuce_status, is_regulated_activity, latitude, longitude, google_maps_url, opening_hours, show_opening_hours, is_open_24h, rating, computed_rating, total_review_count, priority_score, gamme_id, badge_id, neighborhood, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, hook_fr")
            .eq("is_active", true)
            .in("id", businessIds),
          supabase.from("gammes").select("id, name_fr, color_hex, text_color_hex, sort_order").order("sort_order"),
          supabase.from("badges").select("id, name_fr, color_hex, text_color_hex").order("sort_order"),
          supabase.from("subcategories").select("id, name_fr, sort_order"),
          supabase.from("badge_subcategories").select("badge_id, subcategory_id"),
        ]);

        setBusinesses(bizRes.data || []);
        setGammes(gammesRes.data || []);
        setBadges(badgesRes.data || []);
        setSubcategories(subcatsRes.data || []);
        setBadgeSubcategories(badgeSubcatsRes.data || []);
      } catch (error) {
        console.error("Error fetching destination data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [decodedName]);

  const getDisplayName = () => {
    if (!destinationInfo) return decodedName;
    if (language === "ar" && destinationInfo.name_ar) return destinationInfo.name_ar;
    if (language === "en" && destinationInfo.name_en) return destinationInfo.name_en;
    return destinationInfo.name_fr;
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

  const startResult = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endResult = Math.min(currentPage * ITEMS_PER_PAGE, sortedBusinesses.length);

  return (
    <div className="min-h-screen relative">
      {/* Full-page background */}
      <div className="fixed inset-0 -z-10">
        <img src={heroBackground} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/70" />
      </div>
      <Header />

      {/* Hero Section */}
      <section className="pt-28 pb-8 lg:pb-16 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-white/80 hover:text-gold mb-4 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3 uppercase" style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: "0.12em" }}>
              <Compass className="h-8 w-8 text-gold" />
              {getDisplayName()}
            </h1>
            {destinationInfo?.hook && (
              <p className="text-white/60 mt-1 text-sm" style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: "0.02em" }}>{destinationInfo.hook}</p>
            )}
            <p className="text-white/80 mt-2">
              <span className="text-gold font-semibold">{sortedBusinesses.length}</span>{" "}
              {language === "fr" ? "établissement(s) lié(s) à cette destination" : language === "ar" ? "مؤسسة مرتبطة بهذه الوجهة" : "establishment(s) linked to this destination"}
            </p>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {sortedBusinesses.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl text-muted-foreground">
                {language === "fr" ? "Aucun établissement lié à cette destination" : "No establishments linked to this destination"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedBusinesses.map((business) => (
                  <BusinessCard
                    key={business.id}
                    business={business}
                    gammes={gammes}
                    badges={badges}
                    subcategories={subcategories}
                    badgeSubcategories={badgeSubcategories}
                    verifiedLabel="Vérifié"
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex flex-col items-center gap-4">
                  <p className="text-sm text-white/60">
                    {startResult} – {endResult} sur {sortedBusinesses.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="gap-1">
                      <ChevronLeft className="h-4 w-4" />
                      Précédent
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      return (
                        <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => goToPage(pageNum)} className="w-10">
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="gap-1">
                      Suivant
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Footer variant="morocco" />
    </div>
  );
};

export default DestinationPage;
