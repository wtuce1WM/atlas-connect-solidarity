import { ReactNode, Suspense, lazy, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import HomeBottomBar from "@/components/HomeBottomBar";
import ClubLoginPopup from "@/components/club/ClubLoginPopup";
import { useLanguage } from "@/contexts/LanguageContext";
import { useArticleBookmark } from "@/hooks/useArticleBookmark";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bookmark } from "lucide-react";
import { withLangPrefix } from "@/lib/localizedPath";
import type { BlogArticleVideo } from "@/components/blog/BlogArticleTemplate";


const HomeVideoSlidePanel = lazy(() => import("@/components/home/HomeVideoSlidePanel"));

export interface VideoFeedTemplateProps {
  pagePath: string;
  seoTitle: string;
  seoDescription: string;
  heroTitleTop?: string;
  heroTitleBottom?: string;
  heroSubtitle?: string;
  intro?: ReactNode;
  heroImage?: string;
  heroAlt?: string;
  sectionTitle: string;
  sectionIntro?: string;
  videos: BlogArticleVideo[];
  bookmarkSlug: string;
  siteUrl?: string;
}


const DEFAULT_SITE_URL = "https://oneworldmorocco.com";

const VideoFeedTemplate = ({
  pagePath,
  seoTitle,
  seoDescription,
  heroTitleTop,
  heroTitleBottom,
  heroSubtitle,
  intro,
  heroImage,
  heroAlt,
  sectionTitle,
  sectionIntro,
  videos,
  bookmarkSlug,
  siteUrl = DEFAULT_SITE_URL,
}: VideoFeedTemplateProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isBookmarked, isLoading: bmLoading, isLoggedIn, toggle: toggleBookmark } =
    useArticleBookmark(bookmarkSlug);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);

  const ogImage = heroImage || `${siteUrl}/og-install-app.webp`;

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
    title: seoTitle,
    description: seoDescription,
    canonical: `${siteUrl}${pagePath}`,
    ogImage,
    ogUrl: `${siteUrl}${pagePath}`,
    ogType: "website",
  });

  // Wheel/keys navigation while video panel is open (mirrors BlogArticleTemplate)
  useEffect(() => {
    if (!activeVideoId) return;
    const ids = videos.map((v) => v.id);
    const idx = ids.indexOf(activeVideoId);
    const goNext = () => {
      if (idx >= 0 && idx < ids.length - 1) {
        setActiveVideoId(ids[idx + 1]);
        setVideoCurrentTime(0);
      }
    };
    const goPrev = () => {
      if (idx > 0) {
        setActiveVideoId(ids[idx - 1]);
        setVideoCurrentTime(0);
      }
    };
    let accum = 0;
    let lockUntil = 0;
    const onWheel = (e: WheelEvent) => {
      const target = e.target as Element | null;
      const scrollable = target?.closest(
        '[data-slidepanel-scroll="true"], .overflow-y-auto, .overflow-auto'
      ) as HTMLElement | null;
      if (scrollable) {
        const canScrollDown =
          e.deltaY > 0 &&
          scrollable.scrollTop + scrollable.clientHeight < scrollable.scrollHeight - 1;
        const canScrollUp = e.deltaY < 0 && scrollable.scrollTop > 1;
        if (canScrollDown || canScrollUp) return;
      }
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (e.cancelable) e.preventDefault();
      const now = Date.now();
      if (now < lockUntil) return;
      accum += e.deltaY;
      if (Math.abs(accum) < 80) return;
      const dir = accum > 0 ? 1 : -1;
      accum = 0;
      lockUntil = now + 450;
      dir > 0 ? goNext() : goPrev();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [activeVideoId, videos]);

  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <HomeMindtripHeader alwaysWhite />

      {/* Hero */}
      <section className="relative h-[60vh] min-h-[420px] overflow-hidden">
        {heroImage && (
          <img
            src={heroImage}
            alt={heroAlt || sectionTitle}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#3B3B3B] via-[#3B3B3B]/50 to-[#3B3B3B]/30" />
        <div className="absolute inset-0 flex flex-col justify-end pb-4 sm:pb-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <button
                onClick={() => navigate(withLangPrefix("/blog", language))}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border border-white/20 bg-black/50 text-white hover:text-gold hover:border-gold hover:bg-black/70 backdrop-blur-md transition-all duration-300 shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                {language === "en" ? "Back to blog" : language === "ar" ? "العودة إلى المدونة" : "Retour au blog"}
              </button>
              <button
                onClick={handleSaveArticle}
                disabled={bmLoading}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-300 backdrop-blur-md shadow-sm ${
                  isBookmarked
                    ? "bg-gold text-black border-gold hover:bg-gold/90"
                    : "bg-black/50 text-white border-white/20 hover:border-gold hover:text-gold hover:bg-black/70"
                }`}
                aria-label={
                  isBookmarked
                    ? (language === "en" ? "Remove from my OWM Club" : language === "ar" ? "إزالة من نادي OWM" : "Retirer de mon Club OWM")
                    : (language === "en" ? "Save to my OWM Club" : language === "ar" ? "حفظ في نادي OWM" : "Sauvegarder dans mon Club OWM")
                }
              >
                <Bookmark className="h-4 w-4" fill={isBookmarked ? "currentColor" : "none"} />
                {isBookmarked
                  ? (language === "en" ? "Saved" : language === "ar" ? "محفوظ" : "Sauvegardé")
                  : (language === "en" ? "Save" : language === "ar" ? "حفظ" : "Sauvegarder")}
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
      </section>

      {/* Intro */}
      {intro && (
        <section className="py-10 md:py-14 bg-background">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-foreground/85 text-base md:text-lg leading-relaxed">
              {intro}
            </div>
          </div>
        </section>
      )}

      {/* Video grid */}
      <section className="py-10 md:py-16 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <p className="text-sm uppercase tracking-wider mb-2 text-primary">Vidéos</p>
          <h2 className="text-2xl md:text-4xl font-bold mb-4 font-['Playfair_Display'] italic leading-tight text-foreground">
            {sectionTitle}
          </h2>
          {sectionIntro && (
            <p className="text-foreground/80 text-base md:text-lg leading-relaxed mb-8 max-w-3xl">
              {sectionIntro}
            </p>
          )}

          {videos.length === 0 ? (
            <p className="text-muted-foreground text-sm py-10 text-center">
              Aucune vidéo pour l'instant.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {videos.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => { setVideoCurrentTime(0); setActiveVideoId(v.id); }}
                  className="block text-left group"
                >
                  <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-muted">
                    {v.thumbnailUrl ? (
                      <img
                        src={v.thumbnailUrl}
                        alt={v.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                        {v.title}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none z-10">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F1F1F1] text-black text-[11px] font-semibold tracking-normal normal-case shadow-sm whitespace-nowrap">
                        {(() => {
                          if (!v.price) return "Prix : nous consulter";
                          const p = v.price.trim();
                          if (!p) return "Prix : nous consulter";
                          const lower = p.toLowerCase();
                          if (lower === "sur demande" || lower === "prix sur demande") return "Prix sur demande";
                          if (lower === "nous consulter" || lower === "prix: nous consulter" || lower === "prix : nous consulter") return "Prix : nous consulter";
                          const sentence = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
                          return sentence.replace(/\bmad\b/g, "MAD").replace(/\beur\b/g, "EUR");
                        })()}
                      </span>
                    </div>
                    {v.title && v.title !== "Vidéo" && v.title !== "video" ? (
                      <div className="absolute bottom-2 left-2 right-2 text-white text-xs font-medium tracking-normal normal-case line-clamp-2 drop-shadow">
                        {(() => {
                          const t = v.title.trim();
                          if (!t) return "";
                          const sentence = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
                          return sentence.replace(/\bmad\b/g, "MAD").replace(/\beur\b/g, "EUR");
                        })()}
                      </div>
                    ) : (
                      v.businessName && (
                        <div className="absolute bottom-2 left-2 right-2 text-white text-xs font-medium tracking-normal normal-case line-clamp-2 drop-shadow">
                          {(() => {
                            const b = v.businessName.trim();
                            if (!b) return "";
                            const sentence = b.charAt(0).toUpperCase() + b.slice(1).toLowerCase();
                            return sentence.replace(/\bmad\b/g, "MAD").replace(/\beur\b/g, "EUR");
                          })()}
                        </div>
                      )
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
      {!activeVideoId && <HomeBottomBar />}
      <ClubLoginPopup />

      {activeVideoId && (() => {
        const list = videos.map((v) => ({
          id: v.id,
          url: v.url,
          business_name: v.businessName || v.title,
          pageBusinessName: v.businessName ?? null,
          pageBusinessId: v.businessId ?? null,
          owner: v.businessId && v.businessName
            ? {
                id: v.businessId,
                name: v.businessName,
                logo_url: (v as any).businessLogoUrl ?? null,
                logo_bg: (v as any).businessLogoBg ?? null,
              }
            : null,

          social: null,
          showSocialBadge: false,
          description: v.description ?? null,
          manualCard: null,
          title: v.title,
          _isGeneric: v.isGeneric,
          price: v.price ?? null,
        }));
        const active = list.find((v) => v.id === activeVideoId) || null;
        return (
          <Suspense fallback={null}>
            <HomeVideoSlidePanel
              open={!!active}
              onClose={() => setActiveVideoId(null)}
              activeVideo={active as any}
              activeList={list as any}
              onActiveVideoChange={(v: any) => { setActiveVideoId(v.id); setVideoCurrentTime(0); }}
              isActiveGeneric={!!active?._isGeneric}
              currentTime={videoCurrentTime}
              onTimeUpdate={setVideoCurrentTime}
              returnContext={null}
              hideDirections={true}
              hideSecondaryCtas={true}
            />
          </Suspense>
        );
      })()}
    </div>
  );
};

export default VideoFeedTemplate;
