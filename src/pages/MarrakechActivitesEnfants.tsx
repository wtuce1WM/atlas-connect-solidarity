import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { businessUrl } from "@/lib/businessUrl";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, MapPin, Star } from "lucide-react";
import logoWatermark from "@/assets/logoGOLDsimpleSML.webp";

const KIDS_BADGE_ID = "645463af-f0a1-41f4-90c0-b79c5c74a09f";

interface Business {
  id: string;
  name: string;
  slug: string | null;
  neighborhood: string | null;
  city: string | null;
  images: string[] | null;
  rating: number | null;
  categories: string[] | null;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  wtuce_status: string | null;
  gamme_id: string | null;
  default_service: string | null;
}

interface Gamme {
  id: string;
  name_fr: string;
  color_hex: string | null;
}

const MarrakechActivitesEnfants = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useSEO({
    title: "Activités pour les enfants à Marrakech",
    description:
      "Notre sélection d'activités et d'adresses pour les enfants à Marrakech : parcs aquatiques, ateliers, kids clubs, restaurants familiaux et plus.",
    canonical: "/blog/activites-enfants-marrakech",
  });

  useEffect(() => {
    const fetchData = async () => {
      // 1) IDs vidéo (docs) avec badge Enfants
      const { data: docBadges } = await supabase
        .from("business_document_badges")
        .select("document_id")
        .eq("badge_id", KIDS_BADGE_ID);
      const docIds = (docBadges || []).map((r: any) => r.document_id);

      // 2) IDs vidéo (YouTube) avec badge Enfants
      const { data: ytBadges } = await supabase
        .from("business_youtube_video_badges")
        .select("youtube_video_id")
        .eq("badge_id", KIDS_BADGE_ID);
      const ytIds = (ytBadges || []).map((r: any) => r.youtube_video_id);

      // 3) business_id correspondants
      const bizIdSet = new Set<string>();
      if (docIds.length) {
        const { data } = await supabase
          .from("business_documents")
          .select("business_id")
          .in("id", docIds);
        (data || []).forEach((r: any) => r.business_id && bizIdSet.add(r.business_id));
      }
      if (ytIds.length) {
        const { data } = await supabase
          .from("business_youtube_videos")
          .select("business_id")
          .in("id", ytIds);
        (data || []).forEach((r: any) => r.business_id && bizIdSet.add(r.business_id));
      }

      const ids = Array.from(bizIdSet);
      if (!ids.length) {
        setIsLoading(false);
        return;
      }

      const [bizRes, gammeRes] = await Promise.all([
        supabase
          .from("businesses")
          .select(
            "id, name, slug, neighborhood, city, images, rating, categories, hook_fr, hook_en, hook_ar, wtuce_status, gamme_id, default_service"
          )
          .in("id", ids)
          .eq("is_active", true)
          .eq("city", "Marrakech"),
        supabase.from("gammes").select("id, name_fr, color_hex"),
      ]);

      if (bizRes.data) setBusinesses(bizRes.data as any);
      if (gammeRes.data) setGammes(gammeRes.data);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const getHook = (b: Business) => {
    if (language === "ar" && b.hook_ar) return b.hook_ar;
    if (language === "en" && b.hook_en) return b.hook_en;
    return b.hook_fr || "";
  };

  const getGamme = (id: string | null) =>
    id ? gammes.find((g) => g.id === id) || null : null;

  // Regroupement par default_service
  const groups: { service: string; items: Business[] }[] = (() => {
    const map = new Map<string, Business[]>();
    businesses.forEach((b) => {
      const key = b.default_service || "Autres activités";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return Array.from(map.entries())
      .map(([service, items]) => ({
        service,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.service.localeCompare(b.service));
  })();

  const heroImage = businesses.find((b) => b.images?.length)?.images?.[0];

  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader />

      {/* Hero */}
      <div className="relative h-[60vh] min-h-[420px] overflow-hidden">
        {heroImage && (
          <img
            src={heroImage}
            alt="Activités pour les enfants à Marrakech"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
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
              Activités pour les enfants
              <br />
              <span className="text-gold">à Marrakech</span>
            </h1>
            <p className="mt-4 text-white/70 max-w-2xl text-lg">
              Notre sélection d'adresses testées et approuvées pour les
              familles — parcs aquatiques, ateliers créatifs, kids clubs,
              restaurants et hôtels accueillants pour les enfants.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : businesses.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          Aucune adresse pour le moment.
        </div>
      ) : (
        <>
          {groups.map((group, idx) => {
            const isDark = idx % 2 === 0;
            return (
              <section
                key={group.service}
                className={`py-14 ${isDark ? "bg-black" : "bg-background"}`}
              >
                <div className="container mx-auto px-4">
                  <h2
                    className={`text-2xl md:text-3xl font-bold mb-2 font-['Playfair_Display'] italic ${
                      isDark ? "text-white" : "text-foreground"
                    }`}
                  >
                    {group.service}
                  </h2>
                  <p
                    className={`mb-8 ${
                      isDark ? "text-white/60" : "text-muted-foreground"
                    }`}
                  >
                    {group.items.length} adresse
                    {group.items.length > 1 ? "s" : ""} sélectionnée
                    {group.items.length > 1 ? "s" : ""}
                  </p>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {group.items.map((b) => (
                      <Link key={b.id} to={businessUrl(b)} className="group">
                        <Card className="overflow-hidden border-border/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 h-full">
                          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                            {b.images?.[0] ? (
                              <img
                                src={b.images[0]}
                                alt={b.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                {b.name}
                              </div>
                            )}

                            {b.wtuce_status === "verified" && (
                              <img
                                src={logoWatermark}
                                alt=""
                                className="absolute top-2 right-2 w-8 h-8 object-contain opacity-90 pointer-events-none"
                              />
                            )}

                            {b.rating && (
                              <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-0.5">
                                <Star className="h-3 w-3 fill-gold text-gold" />
                                <span className="text-gold font-bold text-xs">
                                  {b.rating}/20
                                </span>
                              </div>
                            )}

                            {(() => {
                              const g = getGamme(b.gamme_id);
                              return g ? (
                                <div className="absolute top-2 left-1/2 -translate-x-1/2">
                                  <span
                                    className="text-[10px] text-black border border-black rounded-full px-1.5 py-0.5 whitespace-nowrap"
                                    style={{
                                      backgroundColor: g.color_hex || "#666",
                                    }}
                                  >
                                    {g.name_fr}
                                  </span>
                                </div>
                              ) : null;
                            })()}
                          </div>

                          <CardContent className="p-4">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">
                              {b.name}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {b.categories?.[0] && (
                                <span className="bg-muted rounded-full px-2 py-0.5">
                                  {b.categories[0]}
                                </span>
                              )}
                              {(b.neighborhood || b.city) && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {b.neighborhood || b.city}
                                </span>
                              )}
                            </div>
                            {getHook(b) && (
                              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                                {getHook(b)}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}

          {/* CTA */}
          <section className="bg-black py-12">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4 font-['Playfair_Display'] italic">
                Continuer l'exploration sur la{" "}
                <span className="text-gold">carte</span>
              </h2>
              <div className="flex justify-center gap-4 flex-wrap">
                <Button
                  onClick={() => navigate("/city/Marrakech")}
                  className="bg-gold text-black hover:bg-gold/80 gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Voir la carte de Marrakech
                </Button>
                <Button
                  onClick={() => navigate("/carte")}
                  variant="outline"
                  className="border-gold/50 text-gold hover:bg-gold/10 gap-2"
                >
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

export default MarrakechActivitesEnfants;
