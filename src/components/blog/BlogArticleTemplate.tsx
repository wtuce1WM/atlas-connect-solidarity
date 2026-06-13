import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { businessUrl } from "@/lib/businessUrl";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import PoiGoogleMap, { type PoiMapItem } from "@/components/PoiGoogleMap";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useArticleBookmark } from "@/hooks/useArticleBookmark";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, MapPin, Star, Clock, Bookmark } from "lucide-react";
import logoWatermark from "@/assets/logoGOLDsimpleSML.webp";
import ClubLoginPopup from "@/components/club/ClubLoginPopup";

export interface BlogArticleBusiness {
  id: string;
  name: string;
  slug: string | null;
  neighborhood: string | null;
  city: string | null;
  images: string[] | null;
  rating: number | null;
  categories: string[] | null;
  hook_fr: string | null;
  wtuce_status: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface BlogArticleEntry {
  id: string;
  extraIds?: string[];
  pretitle: string;
  title: string;
  hours: string;
  paragraphs: string[];
}

export interface BlogArticleTemplateProps {
  entries: BlogArticleEntry[];
  articlePath: string;
  articleTitle: string;
  articleDescription: string;
  bookmarkSlug: string;
  heroAlt: string;
  heroTitleTop: ReactNode;
  heroTitleBottom: ReactNode;
  heroSubtitle: ReactNode;
  intro: ReactNode;
  datePublished: string; // ISO
  dateModified?: string;
  siteUrl?: string;
  defaultOgImage?: string;
}

const DEFAULT_SITE_URL = "https://oneworldmorocco.com";

const BlogArticleTemplate = ({
  entries,
  articlePath,
  articleTitle,
  articleDescription,
  bookmarkSlug,
  heroAlt,
  heroTitleTop,
  heroTitleBottom,
  heroSubtitle,
  intro,
  datePublished,
  dateModified,
  siteUrl = DEFAULT_SITE_URL,
  defaultOgImage,
}: BlogArticleTemplateProps) => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Record<string, BlogArticleBusiness>>({});
  const [isLoading, setIsLoading] = useState(true);

  const geo = useGeolocation();
  const userLocation = geo.isEnabled && geo.coords ? geo.coords : null;

  const { isBookmarked, isLoading: bmLoading, isLoggedIn, toggle: toggleBookmark } =
    useArticleBookmark(bookmarkSlug);
  const { toast } = useToast();

  const allIds = entries.flatMap((e) => [e.id, ...(e.extraIds ?? [])]);
  const ogFallback = defaultOgImage || `${siteUrl}/images/og-image.jpg`;

  const heroImage =
    businesses[entries[0]?.id]?.images?.[0] ||
    businesses[entries[1]?.id]?.images?.[0] ||
    ogFallback;

  const handleSaveArticle = async () => {
    if (!isLoggedIn) {
      window.dispatchEvent(new CustomEvent("open-generic-club-popup"));
      return;
    }
    const ok = await toggleBookmark();
    if (ok) {
      toast({
        title: isBookmarked ? "Article retiré" : "Article sauvegardé",
        description: isBookmarked
          ? "L'article a été retiré de votre Club OWM."
          : "Retrouvez-le dans votre compte Club OWM.",
      });
    }
  };

  useSEO({
    title: articleTitle,
    description: articleDescription,
    canonical: articlePath,
    ogImage: heroImage,
    ogUrl: articlePath,
    ogType: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: articleTitle,
      description: articleDescription,
      image: [heroImage],
      datePublished,
      dateModified: dateModified || datePublished,
      author: { "@type": "Organization", name: "ONE WORLD MOROCCO", url: siteUrl },
      publisher: {
        "@type": "Organization",
        name: "ONE WORLD MOROCCO",
        logo: { "@type": "ImageObject", url: ogFallback },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}${articlePath}` },
    },
  });

  useEffect(() => {
    const fetchBiz = async () => {
      const { data } = await supabase
        .from("businesses")
        .select(
          "id, name, slug, neighborhood, city, images, rating, categories, hook_fr, wtuce_status, latitude, longitude"
        )
        .in("id", allIds)
        .eq("is_active", true);
      if (data) {
        const map: Record<string, BlogArticleBusiness> = {};
        data.forEach((b: any) => (map[b.id] = b));
        setBusinesses(map);
      }
      setIsLoading(false);
    };
    fetchBiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoading) return;
    let scrollId: string | null = null;
    try {
      scrollId = sessionStorage.getItem("returnToBlogScrollId");
      if (scrollId) sessionStorage.removeItem("returnToBlogScrollId");
    } catch {}
    if (!scrollId) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(`entry-${scrollId}`);
      if (el) el.scrollIntoView({ behavior: "auto", block: "center" });
    });
  }, [isLoading]);

  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader alwaysWhite />

      {/* Hero */}
      <div className="relative h-[60vh] min-h-[420px] overflow-hidden">
        {heroImage && (
          <img
            src={heroImage}
            alt={heroAlt}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#3B3B3B] via-[#3B3B3B]/50 to-[#3B3B3B]/30" />
        <div className="absolute inset-0 flex flex-col justify-end pb-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-4 gap-3">
              <button
                onClick={() => navigate("/blog")}
                className="inline-flex items-center gap-2 text-white/60 hover:text-gold transition-colors text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour au blog
              </button>
              <button
                onClick={handleSaveArticle}
                disabled={bmLoading}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  isBookmarked
                    ? "bg-gold text-black border-gold"
                    : "bg-black/40 text-white/90 border-white/30 hover:border-gold hover:text-gold"
                }`}
                aria-label={isBookmarked ? "Retirer de mon Club OWM" : "Sauvegarder dans mon Club OWM"}
              >
                <Bookmark
                  className="h-4 w-4"
                  fill={isBookmarked ? "currentColor" : "none"}
                />
                {isBookmarked ? "Sauvegardé" : "Sauvegarder"}
              </button>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold text-white font-['Playfair_Display'] italic leading-tight">
              {heroTitleTop}
              <br />
              <span className="text-gold">{heroTitleBottom}</span>
            </h1>
            <p className="mt-4 text-white/70 max-w-2xl text-lg">{heroSubtitle}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Intro */}
          <section className="py-14 bg-background">
            <div className="container mx-auto px-4 max-w-3xl">
              <p className="text-foreground/80 text-lg leading-relaxed">{intro}</p>
            </div>
          </section>

          {/* Full-width map */}
          <section className="bg-background">
            <div className="w-full h-[520px]">
              {(() => {
                const pois: PoiMapItem[] = Object.values(businesses)
                  .filter((b) => b.latitude != null && b.longitude != null)
                  .map((b) => ({
                    id: b.id,
                    name: b.name,
                    latitude: b.latitude,
                    longitude: b.longitude,
                    images: b.images,
                    city: b.city,
                    neighborhood: b.neighborhood,
                    rating: b.rating,
                  }));
                return (
                  <PoiGoogleMap
                    pois={pois}
                    selectedPoiId={null}
                    fitToMarkers
                    userLocation={userLocation}
                    onPoiClick={(id) => {
                      const b = businesses[id];
                      if (b) {
                        try {
                          sessionStorage.setItem("returnToBlogPath", articlePath);
                          sessionStorage.setItem("returnToBlogEntryId", b.id);
                        } catch {}
                        navigate(businessUrl(b));
                      }
                    }}
                  />
                );
              })()}
            </div>
          </section>

          {entries.map((entry, idx) => {
            const isDark = idx % 2 === 0;
            return (
              <section
                key={entry.id}
                className={`py-16 ${isDark ? "bg-[#3B3B3B]" : "bg-background"}`}
              >
                <div className="container mx-auto px-4 max-w-5xl">
                  <p
                    className={`text-sm uppercase tracking-wider mb-2 ${
                      isDark ? "text-gold/80" : "text-primary"
                    }`}
                  >
                    {entry.pretitle}
                  </p>
                  <h2
                    className={`text-2xl md:text-4xl font-bold mb-6 font-['Playfair_Display'] italic leading-tight ${
                      isDark ? "text-white" : "text-foreground"
                    }`}
                  >
                    {entry.title}
                  </h2>

                  <div className="space-y-4 mb-8">
                    {[entry.id, ...(entry.extraIds ?? [])].map((bid) => {
                      const b = businesses[bid];
                      if (!b) return null;
                      return (
                        <Link
                          key={bid}
                          id={`entry-${b.id}`}
                          to={businessUrl(b)}
                          onClick={() => {
                            try {
                              sessionStorage.setItem("returnToBlogPath", articlePath);
                              sessionStorage.setItem("returnToBlogEntryId", b.id);
                            } catch {}
                          }}
                          className="block group"
                        >
                          <Card className="overflow-hidden border-border/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
                            <div className="grid md:grid-cols-2">
                              <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden bg-muted">
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
                              </div>
                              <CardContent className="p-6 flex flex-col justify-center">
                                <h3 className="font-semibold text-xl text-foreground group-hover:text-primary transition-colors mb-2">
                                  {b.name}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
                                  {b.categories?.slice(0, 3).map((c) => (
                                    <span
                                      key={c}
                                      className="bg-muted rounded-full px-2 py-0.5"
                                    >
                                      {c}
                                    </span>
                                  ))}
                                  {(b.neighborhood || b.city) && (
                                    <span className="flex items-center gap-0.5">
                                      <MapPin className="h-3 w-3" />
                                      {b.neighborhood || b.city}
                                    </span>
                                  )}
                                </div>
                                <p className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                                  <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                                  <span>{entry.hours}</span>
                                </p>
                                {b.hook_fr && (
                                  <p className="text-sm text-foreground/70 italic">
                                    « {b.hook_fr} »
                                  </p>
                                )}
                              </CardContent>
                            </div>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>

                  <div
                    className={`prose prose-lg max-w-none space-y-4 ${
                      isDark ? "prose-invert text-white/85" : "text-foreground/85"
                    }`}
                  >
                    {entry.paragraphs.map((p, i) => (
                      <p key={i} className="leading-relaxed">
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </>
      )}

      <Footer />
      <ClubLoginPopup />
    </div>
  );
};

export default BlogArticleTemplate;
