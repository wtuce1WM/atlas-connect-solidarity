import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2 } from "lucide-react";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import VideoFeedTemplate from "@/components/video-feed/VideoFeedTemplate";
import {
  fetchBlogVideoSection,
  type BlogVideoSectionConfig,
} from "@/lib/blogVideoSection";
import type { BlogArticleVideo } from "@/components/blog/BlogArticleTemplate";

interface VideoFeedPage {
  id: string;
  slug: string;
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
  section_title_fr: string | null;
  section_title_en: string | null;
  section_title_ar: string | null;
  section_intro_fr: string | null;
  section_intro_en: string | null;
  section_intro_ar: string | null;
  cover_image_url: string | null;
  custom_hero_image_url: string | null;
  hero_alt: string | null;
  video_config: BlogVideoSectionConfig | null;
  seo_title_fr: string | null;
  seo_title_en: string | null;
  seo_title_ar: string | null;
  seo_description_fr: string | null;
  seo_description_en: string | null;
  seo_description_ar: string | null;
}

const VideoFeed = () => {
  const { slug } = useParams();
  const { language } = useLanguage();
  const [page, setPage] = useState<VideoFeedPage | null>(null);
  const [videos, setVideos] = useState<BlogArticleVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      setIsLoading(true);
      const { data } = await supabase
        .from("video_feed_pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (cancelled) return;
      setPage(data as unknown as VideoFeedPage | null);
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    const cfg = page?.video_config;
    if (!cfg || !cfg.badge_id) { setVideos([]); return; }
    (async () => {
      try {
        const list = await fetchBlogVideoSection(cfg);
        if (!cancelled) setVideos(list);
      } catch {
        if (!cancelled) setVideos([]);
      }
    })();
    return () => { cancelled = true; };
  }, [page?.video_config]);

  const pickLang = <T,>(fr: T, en: T | null | undefined, ar: T | null | undefined): T => {
    if (language === "ar" && ar) return ar;
    if (language === "en" && en) return en;
    return fr;
  };

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

  if (!page) {
    return (
      <div className="min-h-screen bg-background">
        <HomeMindtripHeader alwaysWhite />
        <div className="container mx-auto px-4 py-40 text-center">
          <p className="text-muted-foreground">Page introuvable.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const heroImage = page.custom_hero_image_url || page.cover_image_url || undefined;
  const sectionTitle =
    pickLang(page.section_title_fr, page.section_title_en, page.section_title_ar) || "";
  const sectionIntro =
    pickLang(page.section_intro_fr, page.section_intro_en, page.section_intro_ar) || undefined;
  const heroTitleTop =
    pickLang(page.hero_title_top_fr, page.hero_title_top_en, page.hero_title_top_ar) || undefined;
  const heroTitleBottom =
    pickLang(page.hero_title_bottom_fr, page.hero_title_bottom_en, page.hero_title_bottom_ar) || undefined;
  const heroSubtitle =
    pickLang(page.hero_subtitle_fr, page.hero_subtitle_en, page.hero_subtitle_ar) || undefined;
  const introText = pickLang(page.intro_fr, page.intro_en, page.intro_ar) || "";
  const seoTitle =
    pickLang(page.seo_title_fr, page.seo_title_en, page.seo_title_ar) ||
    heroTitleBottom ||
    sectionTitle ||
    "One World Morocco";
  const seoDescription =
    pickLang(page.seo_description_fr, page.seo_description_en, page.seo_description_ar) ||
    introText.slice(0, 155);

  return (
    <VideoFeedTemplate
      pagePath={`/videos/${page.slug}`}
      seoTitle={seoTitle}
      seoDescription={seoDescription}
      heroTitleTop={heroTitleTop || undefined}
      heroTitleBottom={heroTitleBottom || undefined}
      heroSubtitle={heroSubtitle || undefined}
      intro={introText ? introText.split(/\n\n+/).map((p, i) => <p key={i} className="mb-4 last:mb-0">{p}</p>) : undefined}
      heroImage={heroImage}
      heroAlt={page.hero_alt || sectionTitle || undefined}
      sectionTitle={sectionTitle}
      sectionIntro={sectionIntro}
      videos={videos}
      bookmarkSlug={page.slug}
    />
  );

};

export default VideoFeed;
