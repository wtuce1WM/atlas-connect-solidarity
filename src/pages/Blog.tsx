import { useEffect, useRef, useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import FrontHeader from "@/components/front/FrontHeader";
import Footer from "@/components/Footer";
import HomeBottomBar from "@/components/HomeBottomBar";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, User, ArrowRight, MapPin, PlayCircle, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS, ar } from "date-fns/locale";
import ratedHeroAsset from "@/assets/rated-businesses-hero.webp.asset.json";
import { withLangPrefix } from "@/lib/localizedPath";
import { compareBlogOrder } from "@/lib/blogOrder";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import portraitVideoAsset from "@/assets/hero-home-portrait-20260830.mp4.asset.json";
import landscapeVideoAsset from "@/assets/hero-home-landscape-20260830.mp4.asset.json";
import portraitVideoPoster from "@/assets/hero-home-portrait-poster-20260830.jpg.asset.json";
import landscapeVideoPoster from "@/assets/hero-home-landscape-poster-20260830.jpg.asset.json";


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
  is_pinned?: boolean | null;
  sort_order?: number | null;
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
          .select("id, title_fr, title_en, title_ar, slug, excerpt_fr, excerpt_en, excerpt_ar, cover_image_url, custom_hero_image_url, author_name, published_at, created_at, is_pinned, sort_order")
          .eq("is_published", true)
          .order("is_pinned", { ascending: false })
          .order("sort_order", { ascending: false, nullsFirst: false })
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

  const navigate = useLocalizedNavigate();
  // Hero immersif (modèle Home) : vidéo de fond portrait/paysage + FrontHeader pinné.
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-aspect-ratio: 1/1)").matches,
  );
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mqO = window.matchMedia("(max-aspect-ratio: 1/1)");
    const mqM = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onO = () => setIsPortrait(mqO.matches);
    const onM = () => setReduced(mqM.matches);
    mqO.addEventListener("change", onO);
    mqM.addEventListener("change", onM);
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      mqO.removeEventListener("change", onO);
      mqM.removeEventListener("change", onM);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Safari iOS peut différer l'autoplay malgré muted + playsInline.
  useEffect(() => {
    const retry = () => {
      const v = bgVideoRef.current;
      if (v?.paused) void v.play().catch(() => undefined);
    };
    retry();
    document.addEventListener("touchstart", retry, { passive: true, once: true });
    document.addEventListener("click", retry, { once: true });
    return () => {
      document.removeEventListener("touchstart", retry);
      document.removeEventListener("click", retry);
    };
  }, [isPortrait]);

  const scrollToArticles = () => {
    listRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  const BLOG_HERO_T = {
    fr: {
      eyebrow: "Le Journal",
      title: "Histoires, adresses et coulisses du Maroc",
      text: "Nos guides de Marrakech et Essaouira, nos rencontres avec les artisans, les riads et les maisons d'hôtes, et les coulisses de One World Morocco — écrits sur place, au fil des saisons.",
    },
    en: {
      eyebrow: "The Journal",
      title: "Stories, addresses and behind the scenes of Morocco",
      text: "Our Marrakech and Essaouira guides, encounters with artisans, riads and guesthouses, and the making of One World Morocco — written on the ground, season after season.",
    },
    ar: {
      eyebrow: "المدونة",
      title: "حكايات وعناوين وكواليس المغرب",
      text: "أدلتنا لمراكش والصويرة، لقاءاتنا مع الحرفيين والرياضات ودور الضيافة، وكواليس One World Morocco — مكتوبة على الأرض، موسمًا بعد موسم.",
    },
  } as const;
  const heroT = BLOG_HERO_T[language] || BLOG_HERO_T.fr;

  return (
    <div className="min-h-screen bg-background">
      <FrontHeader fixed visible solid={scrolled} onLogoClick={() => navigate("/")} />
      <section
        className="relative flex h-[100dvh] min-h-[560px] w-full items-center justify-center overflow-hidden bg-[hsl(0_0%_4%)]"
      >
        <video
          ref={bgVideoRef}
          key={isPortrait ? "portrait" : "landscape"}
          className="absolute inset-0 h-full w-full object-cover"
          src={isPortrait ? portraitVideoAsset.url : landscapeVideoAsset.url}
          poster={isPortrait ? portraitVideoPoster.url : landscapeVideoPoster.url}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(to bottom, rgba(6,5,4,.55) 0%, rgba(6,5,4,.42) 35%, rgba(6,5,4,.72) 75%, rgba(6,5,4,.92) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(50% 45% at 12% 8%, hsl(var(--primary) / 0.22), transparent 70%), radial-gradient(45% 40% at 88% 92%, hsl(var(--gold) / 0.16), transparent 70%)",
          }}
        />
        <div className="relative z-10 flex max-w-3xl flex-col items-center px-5 pb-20 pt-24 text-center md:px-12">
          <p
            className="mb-6 text-[12px] font-medium uppercase tracking-[0.32em] text-[#C6A046] md:text-[14px]"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {heroT.eyebrow}
          </p>
          <h1
            className="text-[28px] leading-[1.15] text-[#F4ECDF] sm:text-[2.4rem] md:text-[3.2rem]"
            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
          >
            {heroT.title}
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/90 md:text-[1.06rem]">
            {heroT.text}
          </p>
          <button
            type="button"
            onClick={scrollToArticles}
            className="mt-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white/80 transition-colors hover:border-[#C6A046]/70 hover:text-[#E4C877]"
            aria-label="Voir les articles"
          >
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </button>
        </div>
      </section>

      <div ref={listRef} className="w-full scroll-mt-16 px-4 py-12">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[
              // 1) Articles publiés : ordre identique à Backoffice / Blog / Ordre des articles
              ...posts
                .slice()
                .sort((a, b) =>
                  compareBlogOrder(
                    { is_pinned: a.is_pinned, sort_order: a.sort_order, date: a.published_at || a.created_at },
                    { is_pinned: b.is_pinned, sort_order: b.sort_order, date: b.published_at || b.created_at },
                  ),
                )
                .map((p) => ({
                  kind: "post" as const,
                  item: p,
                })),
              // 2) Pages vidéo ensuite (ordre non modifiable, par date de publication)
              ...videoFeeds.map((f) => ({
                kind: "feed" as const,
                item: f,
              })),
            ]


              .map((entry) => {
                if (entry.kind === "post") {
                  const post = entry.item;
                  return (
                    <Link key={`post-${post.id}`} to={withLangPrefix(`/blog/${post.slug}`, language)}>
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full relative">
                        {(post.custom_hero_image_url || post.cover_image_url) && (
                          <div className="aspect-video overflow-hidden">
                            <img
                              src={post.custom_hero_image_url || post.cover_image_url || undefined}
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
