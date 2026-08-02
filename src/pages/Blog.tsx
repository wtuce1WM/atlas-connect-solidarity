import { useEffect, useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import HomeBottomBar from "@/components/HomeBottomBar";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, User, ArrowRight, MapPin, PlayCircle } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS, ar } from "date-fns/locale";
import ratedHeroAsset from "@/assets/rated-businesses-hero.webp.asset.json";
import { withLangPrefix } from "@/lib/localizedPath";

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
  custom_hero_image_url: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
}

interface VideoFeedCard {
  id: string;
  slug: string;
  hero_title_bottom_fr: string | null;
  hero_title_bottom_en: string | null;
  hero_title_bottom_ar: string | null;
  hero_subtitle_fr: string | null;
  hero_subtitle_en: string | null;
  hero_subtitle_ar: string | null;
  cover_image_url: string | null;
  custom_hero_image_url: string | null;
  published_at: string | null;
  created_at: string;
}

const Blog = () => {
  const { language, t } = useLanguage();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [videoFeeds, setVideoFeeds] = useState<VideoFeedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useSEO({
    title: t("blog.seo.title"),
    description: t("blog.seo.description"),
    canonical: "/blog",
  });

  useEffect(() => {
    const fetchAll = async () => {
      const [postsRes, feedsRes] = await Promise.all([
        supabase
          .from("blog_posts")
          .select("id, title_fr, title_en, title_ar, slug, excerpt_fr, excerpt_en, excerpt_ar, cover_image_url, author_name, published_at, created_at, is_pinned")
          .eq("is_published", true)
          .order("is_pinned", { ascending: false })
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("video_feed_pages")
          .select("id, slug, hero_title_bottom_fr, hero_title_bottom_en, hero_title_bottom_ar, hero_subtitle_fr, hero_subtitle_en, hero_subtitle_ar, cover_image_url, custom_hero_image_url, published_at, created_at")
          .eq("is_published", true)
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
      ]);

      if (postsRes.data) setPosts(postsRes.data);
      if (feedsRes.data) setVideoFeeds(feedsRes.data as VideoFeedCard[]);
      setIsLoading(false);
    };
    fetchAll();
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
      <HomeMindtripHeader alwaysWhite />
      <div className="bg-black pt-28 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            {t("blog.title")}
          </h1>
          <p className="text-white/60 mt-2">{t("blog.subtitle")}</p>
        </div>
      </div>

      <div className="w-full px-4 py-12">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[
              ...posts.map((p) => ({ kind: "post" as const, item: p, date: p.published_at || p.created_at })),
              ...videoFeeds.map((f) => ({ kind: "feed" as const, item: f, date: f.published_at || f.created_at })),
            ]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((entry) => {
                if (entry.kind === "post") {
                  const post = entry.item;
                  return (
                    <Link key={`post-${post.id}`} to={withLangPrefix(`/blog/${post.slug}`, language)}>
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full relative">
                        {post.cover_image_url && (
                          <div className="aspect-video overflow-hidden">
                            <img
                              src={post.cover_image_url}
                              alt={getTitle(post)}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              loading="lazy"
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
                  );
                }
                const feed = entry.item;
                const title =
                  (language === "ar" && feed.hero_title_bottom_ar) ||
                  (language === "en" && feed.hero_title_bottom_en) ||
                  feed.hero_title_bottom_fr ||
                  feed.slug;
                const subtitle =
                  (language === "ar" && feed.hero_subtitle_ar) ||
                  (language === "en" && feed.hero_subtitle_en) ||
                  feed.hero_subtitle_fr ||
                  "";
                const cover = feed.cover_image_url || feed.custom_hero_image_url;
                return (
                  <Link key={`feed-${feed.id}`} to={withLangPrefix(`/videos/${feed.slug}`, language)}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full relative">
                      {cover && (
                        <div className="aspect-video overflow-hidden relative">
                          <img
                            src={cover}
                            alt={title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <PlayCircle className="h-14 w-14 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      )}
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 line-clamp-2 font-['Playfair_Display'] italic">
                          {title}
                        </h2>
                        {subtitle && (
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                            {subtitle}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              One World Morocco
                            </span>
                            {feed.published_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(feed.published_at), "d MMM yyyy", { locale: getDateLocale() })}
                              </span>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}

            {/* Page custom (pas un article éditorial) — classement dynamique des établissements les mieux notés */}
            <Link to={withLangPrefix("/blog/etablissements-notes", language)}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30">
                <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <img
                    src={ratedHeroAsset.url}
                    alt="Établissements notés au Maroc"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                    Établissements notés
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                    Le classement des établissements les mieux notés de notre sélection.
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 text-primary font-medium">
                      <MapPin className="h-3 w-3" /> Maroc
                    </span>
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </div>
      <Footer />
      <HomeBottomBar />
    </div>
  );
};

export default Blog;
