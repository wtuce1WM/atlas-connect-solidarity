import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, User, ArrowRight, Star, MapPin, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title_fr, title_en, title_ar, slug, excerpt_fr, excerpt_en, excerpt_ar, cover_image_url, author_name, published_at, created_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (data) setPosts(data);
      setIsLoading(false);
    };
    fetchPosts();
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
      <Header />
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
            {/* Carte Essaouira Vue sur Mer */}
            <Link to="/blog/essaouira-vue-mer">
              <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
                <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <MapPin className="h-16 w-16 text-primary" />
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

            {/* Carte Établissements notés */}
            <Link to="/etablissements-notes">
              <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                <div className="aspect-video overflow-hidden bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                  <Star className="h-16 w-16 text-gold" />
                </div>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                    Établissements notés
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                    Découvrez le classement des meilleurs établissements du Maroc selon les avis TripAdvisor, Google et Restaurant Guru.
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 text-gold font-medium">
                      <Star className="h-3 w-3" /> Classement
                    </span>
                    <ArrowRight className="h-4 w-4 text-gold" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Carte Animations */}
            <Link to="/blog/animations">
              <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
                <div className="aspect-video overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/5 flex items-center justify-center">
                  <Play className="h-16 w-16 text-purple-500" />
                </div>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                    Animations
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                    Démonstration des bandeaux animés d'établissements avec logos défilants, version fond noir et fond blanc.
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 text-purple-500 font-medium">
                      <Play className="h-3 w-3" /> Démo
                    </span>
                    <ArrowRight className="h-4 w-4 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Carte Effets Logo */}
            <Link to="/demo-effects">
              <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30">
                <div className="aspect-video overflow-hidden bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                  <Sparkles className="h-16 w-16 text-gold" />
                </div>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                    Effets Logo — Démo
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                    Prévisualisation de 8 effets d'animation pour le logo WTUCE : zoom, spin, flip 3D, blur reveal et plus.
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 text-gold font-medium">
                      <Sparkles className="h-3 w-3" /> Démo
                    </span>
                    <ArrowRight className="h-4 w-4 text-gold" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Carte Ancien Accueil */}
            <Link to="/blog/ancien-accueil">
              <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-stone-50 to-amber-50 dark:from-stone-950/30 dark:to-amber-950/30">
                <div className="aspect-video overflow-hidden bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                  <span className="text-5xl">🏠</span>
                </div>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                    Ancien Accueil
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                    Copie de la page d'accueil : hero, sections labels dynamiques et liste des établissements.
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 text-gold font-medium">
                      🏠 Accueil
                    </span>
                    <ArrowRight className="h-4 w-4 text-gold" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {posts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
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
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Blog;
