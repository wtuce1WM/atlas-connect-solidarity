import { useEffect, useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, User, ArrowRight, MapPin, Database } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS, ar } from "date-fns/locale";

interface BlogPost {
  id: string;
  title_fr: string;
  title_en: string | null;
  title_ar: string | null;
  slug: string;
  excerpt_fr: string | null;
  excerpt_en: string | null;
  excerpt_ar: string | null;
  cover_image_url: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
}

const Blog = () => {
  const { language, t } = useLanguage();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [staticHeroes, setStaticHeroes] = useState<{ essaouira?: string; marrakech?: string; kids?: string; galeries?: string }>({});

  useSEO({
    title: "Blog – Actualités et guides",
    description: "Articles, guides et actualités sur le Maroc par ONE WORLD MOROCCO.",
    canonical: "/blog",
  });

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title_fr, title_en, title_ar, slug, excerpt_fr, excerpt_en, excerpt_ar, cover_image_url, author_name, published_at, created_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (data) setPosts(data);
      setIsLoading(false);
    };
    fetchPosts();

    // Hero images for static blog cards (same logic as their pages)
    const fetchStaticHeroes = async () => {
      const KIDS_BADGE_ID = "645463af-f0a1-41f4-90c0-b79c5c74a09f";
      const [essRes, mrkRes, kidsDocRes, kidsYtRes, galRes] = await Promise.all([
        supabase
          .from("businesses")
          .select("images, services")
          .eq("city", "Essaouira")
          .eq("is_active", true)
          .order("priority_score", { ascending: false })
          .limit(20),
        supabase
          .from("businesses")
          .select("images")
          .eq("id", "83d7e07e-128c-47a3-92c6-225a53e34b42")
          .maybeSingle(),
        supabase
          .from("business_document_badges")
          .select("document_id")
          .eq("badge_id", KIDS_BADGE_ID),
        supabase
          .from("business_youtube_video_badges")
          .select("youtube_video_id")
          .eq("badge_id", KIDS_BADGE_ID),
        supabase
          .from("businesses")
          .select("images")
          .eq("id", "b484d0cd-6c47-43a2-b388-8ad34f590cd8")
          .maybeSingle(),
      ]);
      const seaKW = ["vue sur mer", "vue mer"];
      const essImg = essRes.data
        ?.find((b: any) =>
          b.images?.length &&
          b.services?.some((s: string) => seaKW.includes(s.toLowerCase()))
        )?.images?.[0];

      // Hero kids : 1ʳᵉ image d'un établissement Marrakech avec badge Enfants
      const kidsBizIds = new Set<string>();
      const docIds = (kidsDocRes.data || []).map((r: any) => r.document_id);
      const ytIds = (kidsYtRes.data || []).map((r: any) => r.youtube_video_id);
      if (docIds.length) {
        const { data } = await supabase
          .from("business_documents")
          .select("business_id")
          .in("id", docIds);
        (data || []).forEach((r: any) => r.business_id && kidsBizIds.add(r.business_id));
      }
      if (ytIds.length) {
        const { data } = await supabase
          .from("business_youtube_videos")
          .select("business_id")
          .in("id", ytIds);
        (data || []).forEach((r: any) => r.business_id && kidsBizIds.add(r.business_id));
      }
      let kidsImg: string | undefined;
      if (kidsBizIds.size) {
        const { data } = await supabase
          .from("businesses")
          .select("images")
          .in("id", Array.from(kidsBizIds))
          .eq("is_active", true)
          .eq("city", "Marrakech")
          .order("priority_score", { ascending: false })
          .limit(20);
        kidsImg = (data || []).find((b: any) => b.images?.length)?.images?.[0];
      }

      setStaticHeroes({
        essaouira: essImg,
        marrakech: (mrkRes.data as any)?.images?.[0],
        kids: kidsImg,
        galeries: (galRes.data as any)?.images?.[0],
      });
    };
    fetchStaticHeroes();
  }, []);

  const getTitle = (post: BlogPost) => {
    if (language === "ar" && post.title_ar) return post.title_ar;
    if (language === "en" && post.title_en) return post.title_en;
    return post.title_fr;
  };

  const getExcerpt = (post: BlogPost) => {
    if (language === "ar" && post.excerpt_ar) return post.excerpt_ar;
    if (language === "en" && post.excerpt_en) return post.excerpt_en;
    return post.excerpt_fr;
  };

  const getDateLocale = () => {
    if (language === "ar") return ar;
    if (language === "en") return enUS;
    return fr;
  };

  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader />
      <div className="bg-black pt-28 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            {t("blog.title")}
          </h1>
          <p className="text-white/60 mt-2">{t("blog.subtitle")}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {t("blog.noPosts")}
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {(() => {
              type Item = { key: string; date: string; node: JSX.Element };
              const items: Item[] = [];

              posts.forEach((post) => {
                items.push({
                  key: post.id,
                  date: post.published_at || post.created_at,
                  node: (
                    <Link key={post.id} to={`/blog/${post.slug}`}>
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full relative">
                        <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 bg-primary/90 text-primary-foreground text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full">
                          <Database className="h-2.5 w-2.5" /> dynamique
                        </span>
                        {post.cover_image_url && (
                          <div className="aspect-video overflow-hidden">
                            <img
                              src={post.cover_image_url}
                              alt={getTitle(post)}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <CardContent className="p-6">
                          <h2 className="text-xl font-semibold mb-3 line-clamp-2 font-['Playfair_Display'] italic">
                            {getTitle(post)}
                          </h2>
                          {getExcerpt(post) && (
                            <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                              {getExcerpt(post)}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              {post.author_name && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {post.author_name}
                                </span>
                              )}
                              {post.published_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(post.published_at), "d MMM yyyy", { locale: getDateLocale() })}
                                </span>
                              )}
                            </div>
                            <ArrowRight className="h-4 w-4 text-primary" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ),
                });
              });

              // Carte Activités enfants Marrakech
              items.push({
                key: "static-kids-marrakech",
                date: "2026-05-24T00:00:00Z",
                node: (
                  <Link key="static-kids-marrakech" to="/blog/activites-enfants-marrakech">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-pink-50 to-amber-50 dark:from-pink-950/30 dark:to-amber-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.kids ? (
                          <img src={staticHeroes.kids} alt="Activités pour les enfants à Marrakech" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Activités pour les enfants à Marrakech
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Notre sélection d'adresses testées et approuvées pour les familles — regroupées par type d'activité.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Marrakech
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              // Carte Marrakech (la plus récente)
              items.push({
                key: "static-marrakech",
                date: "2026-05-23T00:00:00Z",
                node: (
                  <Link key="static-marrakech" to="/blog/5-jours-marrakech-artisanat">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.marrakech ? (
                          <img src={staticHeroes.marrakech} alt="Artisanat à Marrakech" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          5 jours à Marrakech pour découvrir le meilleur de l'artisanat marocain
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Itinéraire en 5 étapes — 31 adresses sélectionnées à Guéliz, dans la Médina, à Sidi Ghanem et au-delà.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Marrakech
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              // Carte Essaouira
              items.push({
                key: "static-essaouira",
                date: "2025-11-01T00:00:00Z",
                node: (
                  <Link key="static-essaouira" to="/blog/essaouira-vue-mer">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.essaouira ? (
                          <img src={staticHeroes.essaouira} alt="Essaouira vue sur mer" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Établissements à Essaouira avec vue sur mer
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Découvrez notre sélection des meilleurs établissements d'Essaouira offrant une vue imprenable sur l'océan Atlantique.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Essaouira
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              // Carte Galeries d'art Marrakech
              items.push({
                key: "static-galeries-marrakech",
                date: "2026-05-24T00:00:00Z",
                node: (
                  <Link key="static-galeries-marrakech" to="/blog/galeries-art-marrakech">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <MapPin className="h-16 w-16 text-primary" />
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Les galeries d'art à Marrakech
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Notre sélection de 23 galeries d'art à Marrakech : Guéliz, Médina, Sidi Ghanem et au-delà.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Marrakech
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              return items
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((i) => <div key={i.key}>{i.node}</div>);
            })()}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Blog;
