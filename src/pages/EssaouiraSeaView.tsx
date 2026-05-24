import { useEffect, useState } from "react";
import { businessUrl } from "@/lib/businessUrl";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { Loader2, ArrowLeft, Star, MapPin, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import logoWatermark from "@/assets/logoGOLDsimpleSML.webp";

interface Business {
  id: string;
  name: string;
  services: string[] | null;
  neighborhood: string | null;
  images: string[] | null;
  rating: number | null;
  main_category: string | null;
  categories: string[] | null;
  wtuce_status: string | null;
  description: string | null;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  google_maps_url: string | null;
  website: string | null;
  gamme_id: string | null;
}

interface Gamme {
  id: string;
  name_fr: string;
  color_hex: string | null;
  text_color_hex: string | null;
}

const EssaouiraSeaView = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [bizResult, gammeResult] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, city, neighborhood, images, rating, main_category, categories, services, wtuce_status, description, hook_fr, hook_en, hook_ar, google_maps_url, website, gamme_id")
          .eq("city", "Essaouira")
          .eq("is_active", true)
          .order("priority_score", { ascending: false }),
        supabase.from("gammes").select("id, name_fr, color_hex, text_color_hex"),
      ]);

      if (bizResult.data) {
        // Filter businesses that have images AND "Vue sur mer" or "Vue mer" service
        const seaViewKeywords = ["Vue sur mer", "Vue mer"];
        setBusinesses(
          bizResult.data.filter(
            (b) =>
              b.images &&
              b.images.length > 0 &&
              b.services?.some((s: string) =>
                seaViewKeywords.some((kw) => s.toLowerCase() === kw.toLowerCase())
              )
          )
        );
      }
      if (gammeResult.data) setGammes(gammeResult.data);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const getHook = (b: Business) => {
    if (language === "ar" && b.hook_ar) return b.hook_ar;
    if (language === "en" && b.hook_en) return b.hook_en;
    return b.hook_fr || "";
  };

  const getGamme = (gammeId: string | null) => {
    if (!gammeId) return null;
    return gammes.find((g) => g.id === gammeId);
  };

  // Split into featured (first 3 with most images) and rest
  const featured = businesses.slice(0, 3);
  const rest = businesses.slice(3);

  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader alwaysWhite />

      {/* Hero Section */}
      <div className="relative h-[60vh] min-h-[400px] overflow-hidden">
        {featured[0]?.images?.[0] && (
          <img
            src={featured[0].images[0]}
            alt="Essaouira vue sur mer"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
        <div className="absolute inset-0 flex flex-col justify-end pb-12">
          <div className="container mx-auto px-4">
            <button
              onClick={() => navigate("/blog")}
              className="inline-flex items-center gap-2 text-white/60 hover:text-gold mb-4 transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au blog
            </button>
            <h1 className="text-3xl md:text-5xl font-bold text-white font-['Playfair_Display'] italic leading-tight">
              Établissements à Essaouira
              <br />
              <span className="text-gold">avec vue sur mer</span>
            </h1>
            <p className="mt-4 text-white/70 max-w-2xl text-lg">
              Découvrez notre sélection des meilleurs établissements d'Essaouira offrant une vue imprenable sur l'océan Atlantique. Restaurants, hôtels et riads face à la mer.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Featured Section - Top 3 */}
          {featured.length > 0 && (
            <section className="bg-black py-16">
              <div className="container mx-auto px-4">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center font-['Playfair_Display'] italic">
                  Les <span className="text-gold">incontournables</span>
                </h2>
                <p className="text-center text-white/50 mb-10">
                  Les adresses phares face à l'océan
                </p>

                <div className="grid md:grid-cols-3 gap-6">
                  {featured.map((business, index) => (
                    <Link key={business.id} to={businessUrl(business)} className="group">
                      <div className={`relative overflow-hidden rounded-2xl ${index === 1 ? "md:-mt-4 md:mb-4" : ""}`}>
                        <div className="aspect-[3/4] overflow-hidden">
                          <img
                            src={business.images![0]}
                            alt={business.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Watermark */}
                        {business.wtuce_status === "verified" && (
                          <img
                            src={logoWatermark}
                            alt=""
                            className="absolute top-4 right-4 w-10 h-10 object-contain opacity-90 pointer-events-none"
                          />
                        )}

                        {/* Rating */}
                        {business.rating && (
                          <div className="absolute top-4 left-4 flex items-center gap-1 bg-black/60 rounded-full px-3 py-1">
                            <Star className="h-4 w-4 fill-gold text-gold" />
                            <span className="text-gold font-bold text-sm">{business.rating}/20</span>
                          </div>
                        )}

                        {/* Gamme badge */}
                        {(() => {
                          const gamme = getGamme(business.gamme_id);
                          return gamme ? (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2">
                              <span
                                className="text-xs text-black border border-black rounded-full px-2 py-0.5 whitespace-nowrap"
                                style={{ backgroundColor: gamme.color_hex || "#666666" }}
                              >
                                {gamme.name_fr}
                              </span>
                            </div>
                          ) : null;
                        })()}

                        {/* Content overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                          <div className="flex items-center gap-2 mb-2">
                            {business.categories?.[0] && (
                              <span className="text-xs bg-white/20 text-white rounded-full px-2 py-0.5 backdrop-blur-sm">
                                {business.categories[0]}
                              </span>
                            )}
                            {business.neighborhood && (
                              <span className="text-xs text-white/60 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {business.neighborhood}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-bold text-white group-hover:text-gold transition-colors">
                            {business.name}
                          </h3>
                          {getHook(business) && (
                            <p className="mt-1 text-white/70 text-sm line-clamp-2">
                              {getHook(business)}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* All other businesses - Grid */}
          {rest.length > 0 && (
            <section className="py-16 bg-background">
              <div className="container mx-auto px-4">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center font-['Playfair_Display'] italic">
                  Tous les <span className="text-primary">établissements</span>
                </h2>
                <p className="text-center text-muted-foreground mb-10">
                  {businesses.length} adresses sélectionnées à Essaouira
                </p>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {rest.map((business) => (
                    <Link key={business.id} to={businessUrl(business)} className="group">
                      <Card className="overflow-hidden border-border/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 h-full">
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <img
                            src={business.images![0]}
                            alt={business.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                          {business.wtuce_status === "verified" && (
                            <img
                              src={logoWatermark}
                              alt=""
                              className="absolute top-2 right-2 w-8 h-8 object-contain opacity-90 pointer-events-none"
                            />
                          )}

                          {business.rating && (
                            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-0.5">
                              <Star className="h-3 w-3 fill-gold text-gold" />
                              <span className="text-gold font-bold text-xs">{business.rating}/20</span>
                            </div>
                          )}

                          {(() => {
                            const gamme = getGamme(business.gamme_id);
                            return gamme ? (
                              <div className="absolute top-2 left-1/2 -translate-x-1/2">
                                <span
                                  className="text-[10px] text-black border border-black rounded-full px-1.5 py-0.5 whitespace-nowrap"
                                  style={{ backgroundColor: gamme.color_hex || "#666666" }}
                                >
                                  {gamme.name_fr}
                                </span>
                              </div>
                            ) : null;
                          })()}
                        </div>

                        <CardContent className="p-4">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">
                            {business.name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {business.categories?.[0] && (
                              <span className="bg-muted rounded-full px-2 py-0.5">
                                {business.categories[0]}
                              </span>
                            )}
                            {business.neighborhood && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" />
                                {business.neighborhood}
                              </span>
                            )}
                          </div>
                          {getHook(business) && (
                            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                              {getHook(business)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* CTA */}
          <section className="bg-black py-12">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4 font-['Playfair_Display'] italic">
                Explorez Essaouira sur la <span className="text-gold">carte</span>
              </h2>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => navigate("/city/Essaouira")}
                  className="bg-gold text-black hover:bg-gold/80 gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Voir la carte d'Essaouira
                </Button>
                <Button
                  onClick={() => navigate("/carte")}
                  variant="outline"
                  className="border-gold/50 text-gold hover:bg-gold/10 gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Carte du Maroc
                </Button>
              </div>
            </div>
          </section>
        </>
      )}

      <Footer />
    </div>
  );
};

export default EssaouiraSeaView;
