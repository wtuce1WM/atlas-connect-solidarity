import { useEffect, useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { Loader2, Calendar, User, ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr, enUS, ar } from "date-fns/locale";
import AnimatedBusinessStrip from "@/components/AnimatedBusinessStrip";

interface BlogPostData {
  id: string;
  title_fr: string;
  title_en: string | null;
  title_ar: string | null;
  content_fr: string | null;
  content_en: string | null;
  content_ar: string | null;
  cover_image_url: string | null;
  author_name: string | null;
  published_at: string | null;
}

const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title_fr, title_en, title_ar, content_fr, content_en, content_ar, cover_image_url, author_name, published_at")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      setPost(data);
      setIsLoading(false);
    };
    fetchPost();
  }, [slug]);

  const postTitle = (() => {
    if (!post) return "";
    if (language === "ar" && post.title_ar) return post.title_ar;
    if (language === "en" && post.title_en) return post.title_en;
    return post.title_fr;
  })();

  useSEO({
    title: postTitle || "Article",
    description: postTitle ? `${postTitle} – Blog ONE WORLD MOROCCO.` : undefined,
    canonical: slug ? `/blog/${slug}` : undefined,
    ogUrl: slug ? `/blog/${slug}` : undefined,
    ogType: "article",
    ogImage: post?.cover_image_url || undefined,
    jsonLd: post
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: postTitle,
          image: post.cover_image_url || undefined,
          datePublished: post.published_at || undefined,
          author: post.author_name
            ? { "@type": "Person", name: post.author_name }
            : undefined,
          mainEntityOfPage: slug ? `https://oneworldmorocco.com/blog/${slug}` : undefined,
        }
      : undefined,
  });

  const getTitle = () => {
    if (!post) return "";
    if (language === "ar" && post.title_ar) return post.title_ar;
    if (language === "en" && post.title_en) return post.title_en;
    return post.title_fr;
  };

  const getContent = () => {
    if (!post) return "";
    if (language === "ar" && post.content_ar) return post.content_ar;
    if (language === "en" && post.content_en) return post.content_en;
    return post.content_fr || "";
  };

  const getDateLocale = () => {
    if (language === "ar") return ar;
    if (language === "en") return enUS;
    return fr;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
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
        <Header />
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
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
            <img
              src={post.cover_image_url}
              alt={getTitle()}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <article
          className="prose prose-lg max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: getContent() }}
        />

        {/* Animated business strip - Amazoz style */}
        <AnimatedBusinessStrip
          city="Marrakech"
          title={language === "fr" ? "Nos adresses à découvrir" : language === "ar" ? "عناويننا للاكتشاف" : "Our addresses to discover"}
        />

        <div className="mt-10 flex justify-center">
          <Button
            onClick={() => navigate("/carte")}
            variant="outline"
            className="gap-2"
          >
            <MapPin className="h-4 w-4" />
            {t("blog.viewOnMap")}
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BlogPost;
