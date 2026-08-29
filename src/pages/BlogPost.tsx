import { useEffect, useRef, useState } from "react";
import { logBlogView } from "@/lib/blogAnalytics";

import { useSEO } from "@/hooks/useSEO";
import { useParams, useNavigate } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import HomeBottomBar from "@/components/HomeBottomBar";
import { Loader2, Calendar, User, ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr, enUS, ar } from "date-fns/locale";
import AnimatedBusinessStrip from "@/components/AnimatedBusinessStrip";
import BlogArticleTemplate, {
  type BlogArticleEntry,
  type BlogArticleVideo,
  type BlogArticleFaqItem,
  type BlogEditorialSection,
} from "@/components/blog/BlogArticleTemplate";
import {
  fetchBlogVideoSection,
  pickVideoSectionCopy,
  type BlogVideoSectionConfig,
} from "@/lib/blogVideoSection";

interface BlogPostData {
  id: string;
  slug: string;
  template: string;
  // Legacy fields (HTML-style posts)
  title_fr: string;
  title_en: string | null;
  title_ar: string | null;
  content_fr: string | null;
  content_en: string | null;
  content_ar: string | null;
  cover_image_url: string | null;
  author_name: string | null;
  published_at: string | null;
  updated_at: string | null;
  // Structured-article fields
  entries_fr: BlogArticleEntry[] | null;
  entries_en: BlogArticleEntry[] | null;
  entries_ar: BlogArticleEntry[] | null;
  hero_title_top_fr: string | null;
  hero_title_top_en: string | null;
  hero_title_top_ar: string | null;
  hero_title_bottom_fr: string | null;
  hero_title_bottom_en: string | null;
  hero_title_bottom_ar: string | null;
  hero_subtitle_fr: string | null;
  hero_subtitle_en: string | null;
  hero_subtitle_ar: string | null;
  intro_fr: string | null;
  intro_en: string | null;
  intro_ar: string | null;
  hero_alt: string | null;
  bookmark_slug: string | null;
  custom_hero_image_url: string | null;
  video_section_config: BlogVideoSectionConfig | null;
  tldr_fr: string | null;
  tldr_en: string | null;
  tldr_ar: string | null;
  faq_fr: BlogArticleFaqItem[] | null;
  faq_en: BlogArticleFaqItem[] | null;
  faq_ar: BlogArticleFaqItem[] | null;
  anchor_poi: { name: string; latitude: number; longitude: number } | null;
  anchor_business_id: string | null;
  custom_hero_image_mobile_url: string | null;
  poi_map_mode: string | null;
  editorial_sections_fr: BlogEditorialSection[] | null;
  editorial_sections_en: BlogEditorialSection[] | null;
  editorial_sections_ar: BlogEditorialSection[] | null;
}

const BlogPost = () => {
  const { slug, embedSlug } = useParams();
  const navigate = useLocalizedNavigate();
  // Mode plateforme : route /embed/ask/article/:slug (pas de slug business).
  // Même rendu embed que /embed/ask/:embedSlug/article/:slug, retour vers l'assistant plateforme.
  const isPlatformArticle = location.pathname.startsWith("/embed/ask/article/");
  const backToAssistant = embedSlug ? `/embed/ask/${embedSlug}` : isPlatformArticle ? "/embed/ask?scope=platform" : null;
  const { language, t } = useLanguage();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videos, setVideos] = useState<BlogArticleVideo[]>([]);
  const [anchorFromBusiness, setAnchorFromBusiness] = useState<{ name: string; latitude: number; longitude: number } | null>(null);
  const didEmbedScrollRef = useRef(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;
      setIsLoading(true);
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      setPost(data as unknown as BlogPostData | null);
      setIsLoading(false);
    };
    fetchPost();
  }, [slug]);

  // Internal blog traffic tracking (one view per slug per session)
  useEffect(() => {
    if (!slug || !post) return;
    logBlogView(slug, language, embedSlug ? "embed" : "site");
  }, [slug, post, language, embedSlug]);


  // Embed-mode scroll: when opened from /embed/ask, the browser sometimes lands
  // at the bottom of the page (chat history position). Force the article to open
  // at the top once the post is rendered.
  useEffect(() => {
    if (!embedSlug || isLoading || !post || didEmbedScrollRef.current) return;
    didEmbedScrollRef.current = true;
    const scrollTop = () => window.scrollTo({ top: 0, behavior: "auto" });
    scrollTop();
    const raf = requestAnimationFrame(scrollTop);
    const t = setTimeout(scrollTop, 100);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [embedSlug, isLoading, post]);

  useEffect(() => {
    let cancelled = false;
    const cfg = post?.video_section_config;
    if (!cfg || !cfg.badge_id) {
      setVideos([]);
      return;
    }
    (async () => {
      try {
        const list = await fetchBlogVideoSection(cfg);
        if (!cancelled) setVideos(list);
      } catch {
        if (!cancelled) setVideos([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [post?.video_section_config]);

  useEffect(() => {
    let cancelled = false;
    const bid = post?.anchor_business_id;
    if (!bid) {
      setAnchorFromBusiness(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("name, latitude, longitude")
        .eq("id", bid)
        .maybeSingle();
      if (cancelled) return;
      if (data && data.latitude != null && data.longitude != null) {
        setAnchorFromBusiness({ name: data.name, latitude: Number(data.latitude), longitude: Number(data.longitude) });
      } else {
        setAnchorFromBusiness(null);
      }
    })();
    return () => { cancelled = true; };
  }, [post?.anchor_business_id]);


  // -- Language helpers ----------------------------------------------------

  const pickLang = <T,>(fr: T, en: T | null | undefined, ar: T | null | undefined): T => {
    if (language === "ar" && ar) return ar;
    if (language === "en" && en) return en;
    return fr;
  };

  const getTitle = () => {
    if (!post) return "";
    return pickLang(post.title_fr, post.title_en, post.title_ar);
  };
  const getContent = () => {
    if (!post) return "";
    return pickLang(post.content_fr ?? "", post.content_en, post.content_ar);
  };
  const getDateLocale = () => (language === "ar" ? ar : language === "en" ? enUS : fr);

  // -- Loading / not found -------------------------------------------------

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <HomeMindtripHeader alwaysWhite />
        <div className="flex justify-center items-center py-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <HomeMindtripHeader alwaysWhite />
        <div className="container mx-auto px-4 py-40 text-center">
          <p className="text-muted-foreground">{t("blog.notFound")}</p>
          <button onClick={() => navigate("/blog")} className="mt-4 text-primary hover:underline">
            {t("blog.backToList")}
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  // -- Structured article (renders via BlogArticleTemplate) ----------------

  const entries = pickLang(post.entries_fr, post.entries_en, post.entries_ar);
  if (post.template === "article_template" && entries && entries.length > 0) {
    const videoCopy = pickVideoSectionCopy(post.video_section_config, language);
    const videoSection =
      post.video_section_config && videos.length > 0
        ? { title: videoCopy.title, intro: videoCopy.intro, videos }
        : undefined;
    const tldr = pickLang(post.tldr_fr ?? "", post.tldr_en, post.tldr_ar) || undefined;
    const faqRaw = pickLang(post.faq_fr, post.faq_en, post.faq_ar);
    const faq = Array.isArray(faqRaw) && faqRaw.length > 0 ? faqRaw : undefined;
    return (
      <BlogArticleTemplate
        entries={entries}
        articlePath={`/blog/${post.slug}`}
        articleTitle={getTitle()}
        articleDescription={pickLang(post.content_fr ?? getTitle(), post.content_en, post.content_ar)}
        bookmarkSlug={post.bookmark_slug ?? post.slug}
        heroAlt={post.hero_alt ?? getTitle()}
        heroTitleTop={pickLang(post.hero_title_top_fr ?? "", post.hero_title_top_en, post.hero_title_top_ar) ?? ""}
        heroTitleBottom={pickLang(post.hero_title_bottom_fr ?? "", post.hero_title_bottom_en, post.hero_title_bottom_ar) ?? ""}
        heroSubtitle={pickLang(post.hero_subtitle_fr ?? "", post.hero_subtitle_en, post.hero_subtitle_ar) ?? ""}
        intro={pickLang(post.intro_fr ?? "", post.intro_en, post.intro_ar) ?? ""}
        datePublished={post.published_at ?? new Date().toISOString()}
        dateModified={post.updated_at ?? undefined}
        customHeroImage={post.custom_hero_image_url ?? undefined}
        videoSection={videoSection}
        tldr={tldr}
        faq={faq}
        anchorPoi={anchorFromBusiness ?? post.anchor_poi ?? undefined}
        embedBackSlug={embedSlug ?? undefined}
        customHeroImageMobile={post.custom_hero_image_mobile_url ?? undefined}
        poiMapMode={
          post.poi_map_mode === "all_poi" || post.poi_map_mode === "near_10km"
            ? (post.poi_map_mode as "all_poi" | "near_10km")
            : undefined
        }
        editorialSections={
          pickLang(post.editorial_sections_fr, post.editorial_sections_en, post.editorial_sections_ar) ?? undefined
        }
      />

    );
  }

  // -- Legacy HTML article (CMS-style) -------------------------------------

  return (
    <LegacyHtmlPost post={post} getTitle={getTitle} getContent={getContent} getDateLocale={getDateLocale} navigate={navigate} t={t} language={language} slug={slug} />
  );
};

// ---- Legacy HTML renderer (kept for any future CMS-style blog posts) ----

const LegacyHtmlPost = ({
  post,
  getTitle,
  getContent,
  getDateLocale,
  navigate,
  t,
  language,
  slug,
}: {
  post: BlogPostData;
  getTitle: () => string;
  getContent: () => string;
  getDateLocale: () => typeof fr;
  navigate: ReturnType<typeof useLocalizedNavigate>;
  t: (key: string) => string;
  language: string;
  slug: string | undefined;
}) => {
  useSEO({
    title: getTitle() || "Article",
    description: getTitle() ? `${getTitle()} – Blog ONE WORLD MOROCCO.` : undefined,
    canonical: slug ? `/blog/${slug}` : undefined,
    ogUrl: slug ? `/blog/${slug}` : undefined,
    ogType: "article",
    ogImage: post?.cover_image_url || undefined,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: getTitle(),
      image: post.cover_image_url || undefined,
      datePublished: post.published_at || undefined,
      author: post.author_name ? { "@type": "Person", name: post.author_name } : undefined,
      mainEntityOfPage: slug ? `https://oneworldmorocco.com/blog/${slug}` : undefined,
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader alwaysWhite />
      <div className="bg-black pt-28 pb-8">
        <div className="container mx-auto px-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-white/60 hover:text-gold mb-4 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("blog.backToList")}
          </button>
          <h1 className="text-2xl md:text-4xl font-bold text-white">{getTitle()}</h1>
          <div className="flex items-center gap-4 mt-3 text-white/50 text-sm">
            {post.author_name && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {post.author_name}
              </span>
            )}
            {post.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(post.published_at), "d MMMM yyyy", { locale: getDateLocale() })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {post.cover_image_url && (
          <div className="mb-8 rounded-xl overflow-hidden max-h-[500px]">
            <img src={post.cover_image_url} alt={getTitle()} className="w-full h-full object-cover" />
          </div>
        )}

        <article
          className="prose prose-lg max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: getContent() }}
        />

        <AnimatedBusinessStrip
          city="Marrakech"
          title={t("blog.ourAddresses")}
        />

        <div className="mt-10 flex justify-center">
          <Button onClick={() => navigate("/carte")} variant="outline" className="gap-2">
            <MapPin className="h-4 w-4" />
            {t("blog.viewOnMap")}
          </Button>
        </div>
      </div>
      <Footer />
      <HomeBottomBar />
    </div>
  );
};

export default BlogPost;
