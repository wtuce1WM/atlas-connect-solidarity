import { ReactNode, Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import HomeBottomBar from "@/components/HomeBottomBar";
import { Card, CardContent } from "@/components/ui/card";
import PoiGoogleMap, { type PoiMapItem } from "@/components/PoiGoogleMap";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useArticleBookmark } from "@/hooks/useArticleBookmark";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, MapPin, Star, Clock, Bookmark, ArrowDown, X } from "lucide-react";
import logoWatermark from "@/assets/logoGOLDsimpleSML.webp";
import ClubLoginPopup from "@/components/club/ClubLoginPopup";
import SlidePanelHeader from "@/components/SlidePanelHeader";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTaxonomyTranslations } from "@/hooks/useTaxonomyTranslations";
import { withLangPrefix } from "@/lib/localizedPath";
import { mapLabel } from "@/lib/mapLabels";
import BlogEditorialSections, { type BlogEditorialSection } from "@/components/blog/BlogEditorialSections";

export type { BlogEditorialSection };


const BookOnlineSlidePanel = lazy(() => import("@/components/BookOnlineSlidePanel"));
const HomeVideoSlidePanel = lazy(() => import("@/components/home/HomeVideoSlidePanel"));

export interface BlogArticleVideo {
  id: string;
  url: string;
  title: string;
  description: string | null;
  price?: string | null;
  thumbnailUrl?: string | null;
  isGeneric: boolean;
  businessId?: string | null;
  businessName?: string | null;
}

export interface BlogArticleVideoSection {
  title: string;
  intro?: ReactNode;
  videos: BlogArticleVideo[];
}

export interface BlogArticleBusiness {
  id: string;
  name: string;
  slug: string | null;
  neighborhood: string | null;
  city: string | null;
  images: string[] | null;
  rating: number | null;
  computed_rating: number | null;
  total_review_count: number | null;
  categories: string[] | null;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  wtuce_status: string | null;
  latitude: number | null;
  longitude: number | null;
  is_featured?: boolean | null;
  min_price?: number | null;
  manual_price_range?: string | null;
}

export interface BlogArticleEntryReview {
  author?: string | null;
  source?: string | null;
  text: string;
  rating?: number | null;
}

export interface BlogArticleEntry {
  id: string;
  extraIds?: string[];
  pretitle: string;
  title: string;
  hours?: string;
  paragraphs: string[];
  /** Short personalized tagline shown just under the establishment title. */
  hook?: string | null;
  /** Optional podium rank (1, 2, 3) — highlighted with a medal ribbon. */
  rank?: number | null;
  /** Default client review displayed below the immersive text. */
  review?: BlogArticleEntryReview | null;
}

export interface BlogArticleFaqItem {
  q: string;
  a: string;
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
  customHeroImage?: string;
  videoSection?: BlogArticleVideoSection;
  /** Short 2-3 sentence answer displayed above the intro, optimized for LLM extraction (ChatGPT, Perplexity, Google AI Overviews). */
  tldr?: string;
  /** FAQ items rendered at the bottom of the article and emitted as FAQPage JSON-LD. */
  faq?: BlogArticleFaqItem[];
  /** Optional black anchor marker on the map (e.g. reference establishment for a proximity article). */
  anchorPoi?: { name: string; latitude: number; longitude: number } | null;
  /** When set, render in embed mode (no site header/footer/bottom bar) and back-button returns to the assistant (/embed/ask). */
  embedBackSlug?: string | null;
  /** Optional portrait hero used on mobile (<768px) via <picture>. */
  customHeroImageMobile?: string;
  /** "all_poi" = every active POI of the database. "near_10km" = only POIs within 10 km of the article's establishments. */
  poiMapMode?: "all_poi" | "near_10km" | null;
  /** Long-form editorial sections (prose + embedded widgets). When provided, they drive the page layout. */
  editorialSections?: BlogEditorialSection[];
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
  customHeroImage,
  videoSection,
  tldr,
  faq,
  anchorPoi,
  embedBackSlug,
  customHeroImageMobile,
  poiMapMode,
  editorialSections,
}: BlogArticleTemplateProps) => {

  const navigate = useNavigate();
  const { language } = useLanguage();
  const { translateSubcategory } = useTaxonomyTranslations();
  const [businesses, setBusinesses] = useState<Record<string, BlogArticleBusiness>>({});
  const [poiPool, setPoiPool] = useState<Array<{ id: string; name: string; latitude: number; longitude: number; images: string[] | null; city: string | null; neighborhood: string | null; rating: number | null }>>([]);

  const [defaultReviews, setDefaultReviews] = useState<Record<string, { author_name: string | null; source: string | null; rating: number | null; text: string | null; text_fr: string | null; text_en: string | null; text_ar: string | null; }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [openBusinessId, setOpenBusinessId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  // Pre-load the lazy panel chunk early to avoid Suspense flash on first open
  useEffect(() => {
    const t = setTimeout(() => { import("@/components/BookOnlineSlidePanel"); }, 1200);
    return () => clearTimeout(t);
  }, []);


  const geo = useGeolocation();
  const userLocation = geo.isEnabled && geo.coords ? geo.coords : null;

  const { isBookmarked, isLoading: bmLoading, isLoggedIn, toggle: toggleBookmark } =
    useArticleBookmark(bookmarkSlug);
  const { toast } = useToast();

  const allIds = entries.flatMap((e) => [e.id, ...(e.extraIds ?? [])]);
  const ogFallback = defaultOgImage || `${siteUrl}/og-install-app.webp`;

  const heroImageBusiness =
    businesses[entries[0]?.id]?.images?.[0] ||
    businesses[entries[1]?.id]?.images?.[0] ||
    null;
  const heroImage = customHeroImage || heroImageBusiness || ogFallback;

  // Ordered list of business IDs as they appear on the page (used for vertical swipe in the panel)
  const orderedIds = useMemo(() => {
    const sortedEntries = [...entries]
      .filter((e) => businesses[e.id])
      .sort((a, b) => {
        const fa = businesses[a.id]?.is_featured ? 1 : 0;
        const fb = businesses[b.id]?.is_featured ? 1 : 0;
        if (fb !== fa) return fb - fa;
        const ra = businesses[a.id]?.computed_rating ?? businesses[a.id]?.rating ?? -1;
        const rb = businesses[b.id]?.computed_rating ?? businesses[b.id]?.rating ?? -1;
        if (rb !== ra) return rb - ra;
        const countA = businesses[a.id]?.total_review_count ?? 0;
        const countB = businesses[b.id]?.total_review_count ?? 0;
        if (countB !== countA) return countB - countA;
        return (businesses[a.id]?.name ?? "").localeCompare(businesses[b.id]?.name ?? "");
      });
    return sortedEntries.flatMap((entry) =>
      [entry.id, ...(entry.extraIds ?? [])]
        .map((bid) => businesses[bid])
        .filter(Boolean)
        .sort((a, b) => {
          const ra = a.computed_rating ?? a.rating ?? -1;
          const rb = b.computed_rating ?? b.rating ?? -1;
          if (rb !== ra) return rb - ra;
          return (b.total_review_count ?? 0) - (a.total_review_count ?? 0);
        })
        .map((b) => b.id)
    );
  }, [entries, businesses]);

  const openIndex = openBusinessId ? orderedIds.indexOf(openBusinessId) : -1;
  const hasPrev = openIndex > 0;
  const hasNext = openIndex >= 0 && openIndex < orderedIds.length - 1;

  const openBusiness = useCallback((id: string) => {
    setIsClosing(false);
    setOpenBusinessId(id);
  }, []);

  const closePanel = useCallback(() => {
    setIsClosing(true);
    window.setTimeout(() => {
      setOpenBusinessId(null);
      setIsClosing(false);
    }, 300);
  }, []);


  // Sync ?openBusiness= in URL (read on mount + write on change) without reload
  useEffect(() => {
    const url = new URL(window.location.href);
    const initial = url.searchParams.get("openBusiness");
    if (initial) setOpenBusinessId(initial);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (openBusinessId) url.searchParams.set("openBusiness", openBusinessId);
    else url.searchParams.delete("openBusiness");
    window.history.replaceState({}, "", url.toString());
  }, [openBusinessId]);

  // Desktop navigation between businesses inside the panel: wheel + arrow keys.
  // (Touch swipe is already handled inside BookOnlineSlidePanel.)
  useEffect(() => {
    if (!openBusinessId) return;
    const goNext = () => hasNext && setOpenBusinessId(orderedIds[openIndex + 1]);
    const goPrev = () => hasPrev && setOpenBusinessId(orderedIds[openIndex - 1]);
    let accum = 0;
    let lockUntil = 0;
    const onWheel = (e: WheelEvent) => {
      const target = e.target as Element | null;
      // Let internal scroll containers handle their own wheel first
      const scrollable = target?.closest('[data-slidepanel-scroll="true"], .overflow-y-auto, .overflow-auto') as HTMLElement | null;
      if (scrollable) {
        const canScrollDown = e.deltaY > 0 && scrollable.scrollTop + scrollable.clientHeight < scrollable.scrollHeight - 1;
        const canScrollUp = e.deltaY < 0 && scrollable.scrollTop > 1;
        if (canScrollDown || canScrollUp) return;
      }
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
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
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [openBusinessId, openIndex, hasPrev, hasNext, orderedIds]);

  // Desktop: while the video panel from "Les offres du moment" is open,
  // capture wheel + arrow keys to navigate between videos and prevent
  // the page (thumbnails behind) from scrolling.
  useEffect(() => {
    if (!activeVideoId || !videoSection) return;
    const ids = videoSection.videos.map((v) => v.id);
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
      const scrollable = target?.closest('[data-slidepanel-scroll="true"], .overflow-y-auto, .overflow-auto') as HTMLElement | null;
      if (scrollable) {
        const canScrollDown = e.deltaY > 0 && scrollable.scrollTop + scrollable.clientHeight < scrollable.scrollHeight - 1;
        const canScrollUp = e.deltaY < 0 && scrollable.scrollTop > 1;
        if (canScrollDown || canScrollUp) return;
      }
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      // Prevent the page behind (thumbnails column) from scrolling.
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
  }, [activeVideoId, videoSection]);




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

  // Build a @graph with BlogPosting + optional ItemList (listicle) + optional FAQPage.
  // Google + LLM crawlers all understand @graph and pick the relevant node.
  const pageId = `${siteUrl}${articlePath}`;
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "BlogPosting",
      "@id": `${pageId}#article`,
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
      mainEntityOfPage: { "@type": "WebPage", "@id": pageId },
    },
  ];

  const listedBusinesses = entries
    .flatMap((e) => [e.id, ...(e.extraIds ?? [])])
    .map((id) => businesses[id])
    .filter((b): b is BlogArticleBusiness => !!b);

  if (listedBusinesses.length > 0) {
    graph.push({
      "@type": "ItemList",
      "@id": `${pageId}#list`,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: listedBusinesses.length,
      itemListElement: listedBusinesses.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteUrl}/b/${b.slug}`,
        name: b.name,
      })),
    });
  }

  if (faq && faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${pageId}#faq`,
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  useSEO({
    title: articleTitle,
    description: tldr || articleDescription,
    canonical: articlePath,
    ogImage: heroImage,
    ogUrl: articlePath,
    ogType: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": graph,
    },
  });

  useEffect(() => {
    const fetchBiz = async () => {
      const { data } = await supabase
        .from("businesses")
        .select(
          "id, name, slug, neighborhood, city, images, rating, computed_rating, total_review_count, categories, hook_fr, hook_en, hook_ar, wtuce_status, latitude, longitude, is_featured, min_price, manual_price_range"
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

    const fetchDefaultReviews = async () => {
      const { data } = await supabase
        .from("reviews")
        .select("business_id, author_name, source, rating, text, text_fr, text_en, text_ar, is_default, created_at")
        .in("business_id", allIds)
        .eq("is_hidden", false)
        .order("created_at", { ascending: true });
      if (data) {
        const map: Record<string, any> = {};
        data.forEach((r: any) => {
          const existing = map[r.business_id];
          if (!existing) {
            map[r.business_id] = r;
          } else if (r.is_default && !existing.is_default) {
            map[r.business_id] = r;
          }
        });
        setDefaultReviews(map);
      }
    };
    fetchDefaultReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Article map showing every active POI of the database (editorial guides).
  useEffect(() => {
    if (poiMapMode !== "all_poi" && poiMapMode !== "near_10km") {
      setPoiPool([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, latitude, longitude, images, city, neighborhood, rating")
        .eq("is_poi", true)
        .eq("is_active", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      if (cancelled || !data) return;
      setPoiPool(
        data.map((b: any) => ({
          id: b.id,
          name: b.name,
          latitude: Number(b.latitude),
          longitude: Number(b.longitude),
          images: b.images,
          city: b.city,
          neighborhood: b.neighborhood,
          rating: b.rating,
        }))
      );
    })();
    return () => { cancelled = true; };
  }, [poiMapMode]);

  // POIs actually plotted: in "near_10km" mode, keep only those within 10 km
  // of one of the article's establishments (or of the anchor POI).
  const visiblePoiPool = useMemo(() => {
    if (poiMapMode !== "near_10km") return poiPool;
    const centers: Array<{ lat: number; lng: number }> = Object.values(businesses)
      .filter((b: any) => b.latitude != null && b.longitude != null)
      .map((b: any) => ({ lat: Number(b.latitude), lng: Number(b.longitude) }));
    if (anchorPoi?.latitude != null && anchorPoi?.longitude != null) {
      centers.push({ lat: Number(anchorPoi.latitude), lng: Number(anchorPoi.longitude) });
    }
    if (centers.length === 0) return [];
    const distKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
      const R = 6371;
      const dLat = ((bLat - aLat) * Math.PI) / 180;
      const dLng = ((bLng - aLng) * Math.PI) / 180;
      const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(s));
    };
    return poiPool.filter((p) =>
      centers.some((c) => distKm(c.lat, c.lng, p.latitude, p.longitude) <= 10)
    );
  }, [poiMapMode, poiPool, businesses, anchorPoi]);



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

  const panelOpen = !!openBusinessId || !!activeVideoId;

  return (
    <div className="min-h-screen bg-background">
      <div className={`transition-[width,max-width,margin] duration-300 ease-out ${panelOpen ? "lg:w-1/2 lg:max-w-[calc(50vw-1rem)] lg:mr-auto lg:ml-0" : "w-full"}`}>

      {!embedBackSlug && <HomeMindtripHeader alwaysWhite />}

      {/* Hero */}
      <div className="relative h-[60vh] min-h-[420px] overflow-hidden">
        {(customHeroImage || heroImageBusiness) && (
          <picture>
            {customHeroImageMobile && (
              <source media="(max-width: 767px)" srcSet={customHeroImageMobile} />
            )}
            <img
              src={customHeroImage || heroImageBusiness}
              alt={heroAlt}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </picture>
        )}


        <div className="absolute inset-0 bg-gradient-to-t from-[#3B3B3B] via-[#3B3B3B]/50 to-[#3B3B3B]/30" />
        {embedBackSlug && (
          <button
            onClick={() => navigate(embedBackSlug.includes("/embed/ask/") || embedBackSlug.startsWith("/embed/ask?") ? embedBackSlug : `/embed/ask/${embedBackSlug}`)}
            className="absolute top-4 left-4 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-black text-white shadow-2xl hover:opacity-90 transition-opacity"
            aria-label={language === "en" ? "Close article" : language === "ar" ? "إغلاق المقال" : "Fermer l'article"}
            title={language === "en" ? "Close" : language === "ar" ? "إغلاق" : "Fermer"}
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <div className="absolute inset-0 flex flex-col justify-end pb-4 sm:pb-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              {!embedBackSlug && (
                <button
                  onClick={() => navigate(withLangPrefix("/blog", language))}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border border-white/20 bg-black/50 text-white hover:text-gold hover:border-gold hover:bg-black/70 backdrop-blur-md transition-all duration-300 shadow-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {language === "en" ? "Back to blog" : language === "ar" ? "العودة إلى المدونة" : "Retour au blog"}
                </button>
              )}
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
                <Bookmark
                  className="h-4 w-4"
                  fill={isBookmarked ? "currentColor" : "none"}
                />
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
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* TL;DR — optimized for LLM extraction (ChatGPT / Perplexity / Google AI Overviews) */}
          {tldr && (
            <section className="pt-14 pb-4 bg-background" aria-label={language === "en" ? "Summary" : language === "ar" ? "ملخص" : "Résumé"}>
              <div className="container mx-auto px-4 max-w-3xl">
                <div className="border-l-4 border-primary/70 bg-muted/40 rounded-r-lg px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-1.5">
                    {language === "en" ? "In brief" : language === "ar" ? "باختصار" : "En bref"}
                  </p>
                  <p className="text-foreground text-base md:text-lg leading-relaxed">
                    {tldr}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Intro */}
          <section className={`${tldr ? "pt-6 pb-14" : "py-14"} bg-background`}>
            <div className="container mx-auto px-4 max-w-3xl">
              <p className="text-foreground/80 text-lg leading-relaxed">{intro}</p>
            </div>
          </section>


          {/* Full-width map */}
          <section className="bg-background relative">
            <div className="w-full h-[520px] relative group">
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
                visiblePoiPool.forEach((p) => {
                  if (businesses[p.id]) return;
                  pois.push({
                    id: p.id,
                    name: p.name,
                    latitude: p.latitude,
                    longitude: p.longitude,
                    images: p.images,
                    city: p.city,
                    neighborhood: p.neighborhood,
                    rating: p.rating,
                  });
                });
                if (anchorPoi && anchorPoi.latitude != null && anchorPoi.longitude != null) {
                  pois.push({
                    id: "__anchor__",
                    name: anchorPoi.name,
                    latitude: anchorPoi.latitude,
                    longitude: anchorPoi.longitude,
                    markerColor: { bg: "#000000", fg: "#ffffff", border: "#000000" },
                  });
                }
                return (
                  <PoiGoogleMap
                    pois={pois}
                    selectedPoiId={null}
                    fitToMarkers
                    userLocation={userLocation}
                    userMarkerLabel={mapLabel("youAreHere", language)}
                    onPoiClick={(id) => {
                      if (id !== "__anchor__") openBusiness(id);
                    }}
                  />
                );
              })()}
              
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("first-blog-result");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                aria-label="Découvrir"
                className="absolute bottom-6 sm:bottom-8 left-1/2 z-20 -translate-x-1/2 text-black/80 hover:text-black drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)] transition pointer-events-auto"
              >
                <span className="block font-josefin text-xs uppercase tracking-[0.3em] font-bold text-center">Découvrir</span>
                <ArrowDown className="mx-auto mt-2 h-5 w-5 animate-bounce" />
              </button>
            </div>
          </section>

          {(() => {
          const entriesBlock = (
          <>
          {[...entries]

            .filter((e) => businesses[e.id])
            .sort((a, b) => {
              const fa = businesses[a.id]?.is_featured ? 1 : 0;
              const fb = businesses[b.id]?.is_featured ? 1 : 0;
              if (fb !== fa) return fb - fa;

              const ra = businesses[a.id]?.computed_rating ?? businesses[a.id]?.rating ?? -1;
              const rb = businesses[b.id]?.computed_rating ?? businesses[b.id]?.rating ?? -1;
              if (rb !== ra) return rb - ra;
              
              // Break ties with total review count
              const countA = businesses[a.id]?.total_review_count ?? 0;
              const countB = businesses[b.id]?.total_review_count ?? 0;
              if (countB !== countA) return countB - countA;
              
              // Final fallback to alphabetical
              const nameA = businesses[a.id]?.name ?? "";
              const nameB = businesses[b.id]?.name ?? "";
              return nameA.localeCompare(nameB);
            })
            .map((entry, idx) => {
            const isDark = idx % 2 === 0;
            return (
              <section
                key={entry.id}
                id={idx === 0 ? "first-blog-result" : undefined}
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
                    className={`text-2xl md:text-4xl font-bold mb-2 font-['Playfair_Display'] italic leading-tight ${
                      isDark ? "text-white" : "text-foreground"
                    }`}
                  >
                    {entry.rank && entry.rank >= 1 && entry.rank <= 3 && (
                      <span
                        className="inline-flex items-center gap-1.5 align-middle mr-3 px-3 py-1 rounded-full text-xs font-bold not-italic tracking-wider uppercase bg-gradient-to-br from-[#F4CF7A] via-[#D4AF37] to-[#8A6A1A] text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_2px_8px_rgba(212,175,55,0.4)]"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        <span aria-hidden="true">
                          {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                        </span>
                        N°{entry.rank}
                      </span>
                    )}
                    {entry.title}
                  </h2>
                  {entry.hook && (
                    <p
                      className={`mb-3 text-base md:text-lg font-['Playfair_Display'] italic ${
                        isDark ? "text-gold/90" : "text-primary/90"
                      }`}
                    >
                      « {entry.hook} »
                    </p>
                  )}
                  {(() => {
                    const primary = businesses[entry.id];
                    const mp = primary?.min_price;
                    if (mp && mp > 0) {
                      return (
                        <p className={`mb-3 text-sm ${isDark ? "text-white/75" : "text-muted-foreground"}`}>
                          Prix minimum constaté en réservation directe : <span className="font-semibold">{Math.round(mp)} €</span>
                        </p>
                      );
                    }
                    return null;
                  })()}
                  {entry.hours && (
                    <div
                      className={`flex items-center gap-1.5 text-xs mb-6 ${
                        isDark ? "text-white/70" : "text-muted-foreground"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>{entry.hours}</span>
                    </div>
                  )}
                  {!entry.hook && !entry.hours && <div className="mb-6" />}

                  <div className="space-y-4 mb-8">
                    {[entry.id, ...(entry.extraIds ?? [])]
                      .map((bid) => businesses[bid])
                      .filter(Boolean)
                      .sort((a, b) => {
                        const ra = a.computed_rating ?? a.rating ?? -1;
                        const rb = b.computed_rating ?? b.rating ?? -1;
                        if (rb !== ra) return rb - ra;
                        return (b.total_review_count ?? 0) - (a.total_review_count ?? 0);
                      })
                      .map((b) => {
                      return (
                        <button
                          key={b.id}
                          id={`entry-${b.id}`}
                          type="button"
                          onClick={() => openBusiness(b.id)}
                          className="block w-full text-left group"
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
                              </div>
                              <CardContent className="p-6 flex flex-col justify-center">
                                {(b.computed_rating ?? b.rating) && (
                                  <div className="relative inline-flex items-center justify-center gap-2 py-1.5 px-5 rounded-full border border-white/30 backdrop-blur-2xl bg-[#3B3B3B] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.3)] self-start mb-4">
                                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/25 via-transparent to-white/5" />
                                    <span aria-hidden="true" className="pointer-events-none absolute top-0 left-1 right-1 h-1/2 rounded-t-full bg-gradient-to-b from-white/30 to-transparent blur-[1px]" />
                                    <div className="relative z-10 flex items-center gap-2">
                                      <Star className="h-[18px] w-[18px] text-gold fill-gold shrink-0" />
                                      <span className="text-lg font-black text-gold whitespace-nowrap" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                                        {b.computed_rating ?? b.rating}
                                        <span className="text-sm font-semibold text-white/60">/20</span>
                                      </span>
                                      {b.total_review_count && b.total_review_count > 0 && (
                                        <span className="text-xs text-white/60 font-semibold whitespace-nowrap" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                                          · {b.total_review_count} {language === "en" ? "reviews" : language === "ar" ? "تقييم" : "avis"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <h3 className="font-semibold text-xl text-foreground group-hover:text-primary transition-colors mb-2">
                                  {b.name}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
                                  {b.categories?.slice(0, 3).map((c) => (
                                    <span
                                      key={c}
                                      className="bg-muted rounded-full px-2 py-0.5"
                                    >
                                      {translateSubcategory(c, language)}
                                    </span>
                                  ))}
                                  {(b.neighborhood || b.city) && (
                                    <span className="flex items-center gap-0.5">
                                      <MapPin className="h-3 w-3" />
                                      {b.neighborhood || b.city}
                                    </span>
                                  )}
                                </div>
                                {entry.hours && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                                    <Clock className="h-3 w-3 shrink-0" />
                                    <span>{entry.hours}</span>
                                  </div>
                                )}
                                {(() => {
                                  const bh = language === "en" ? (b.hook_en || b.hook_fr) : language === "ar" ? (b.hook_ar || b.hook_fr) : b.hook_fr;
                                  return bh ? (
                                    <p className="text-sm text-foreground/70 italic">
                                      « {bh} »
                                    </p>
                                  ) : null;
                                })()}
                              </CardContent>
                            </div>
                          </Card>
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className={`prose prose-lg max-w-none space-y-4 ${
                      isDark ? "prose-invert text-white/85" : "text-foreground/85"
                    }`}
                  >
                    {(() => {
                      // Strip a trailing paragraph that is a review-style quote
                      // (redundant with the client review displayed below).
                      const paras = entry.paragraphs;
                      const last = paras[paras.length - 1]?.trim() ?? "";
                      const startsWithQuote = /^[«"“„"❝‹»]/.test(last);
                      const cleaned = startsWithQuote ? paras.slice(0, -1) : paras;
                      return cleaned.map((p, i) => (
                        <p key={i} className="leading-relaxed">
                          {p}
                        </p>
                      ));
                    })()}
                  </div>

                  {(() => {
                    const dyn = defaultReviews[entry.id];
                    // Prefer translation in current language, else fall back to any available text
                    // so the review is always displayed (rather than hidden on EN/AR).
                    const dynText = dyn
                      ? (language === "en"
                          ? (dyn.text_en || dyn.text_fr || dyn.text)
                          : language === "ar"
                            ? (dyn.text_ar || dyn.text_fr || dyn.text_en || dyn.text)
                            : (dyn.text_fr || dyn.text))
                      : null;
                    const review = dyn && dynText
                      ? { text: dynText, author: dyn.author_name, source: dyn.source, rating: dyn.rating }
                      : entry.review;
                    if (!review || !review.text) return null;
                    return (
                      <figure
                        className={`mt-8 rounded-xl border-l-4 p-5 md:p-6 ${
                          isDark
                            ? "bg-white/5 border-gold/70"
                            : "bg-muted/60 border-primary/70"
                        }`}
                      >
                        <blockquote
                          className={`text-base md:text-lg leading-relaxed font-['Playfair_Display'] italic ${
                            isDark ? "text-white/90" : "text-foreground/90"
                          }`}
                        >
                          « {review.text} »
                        </blockquote>
                        <figcaption
                          className={`mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider ${
                            isDark ? "text-white/60" : "text-muted-foreground"
                          }`}
                          style={{ fontFamily: "'Montserrat', sans-serif" }}
                        >
                          {review.rating != null && (
                            <span className="inline-flex items-center gap-0.5 text-gold">
                              {Array.from({ length: Math.round(Number(review.rating)) }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-gold text-gold" />
                              ))}
                            </span>
                          )}
                          {review.author && (
                            <span className="font-semibold">{review.author}</span>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>
                            {language === "en" ? "Review" : language === "ar" ? "مراجعة" : "Avis"} {review.source
                              ? review.source.charAt(0).toUpperCase() + review.source.slice(1)
                              : (language === "en" ? "customer" : language === "ar" ? "زبون" : "client")}
                          </span>
                        </figcaption>
                      </figure>
                    );
                  })()}
                </div>
              </section>
            );
          })}
          </>
          );
          return editorialSections && editorialSections.length > 0 ? (
            <BlogEditorialSections sections={editorialSections} entriesBlock={entriesBlock} />
          ) : (
            entriesBlock
          );
          })()}


          {/* FAQ — rendered as expandable Q/A, emitted as FAQPage JSON-LD above */}
          {faq && faq.length > 0 && (
            <section className="py-16 bg-background" aria-label={language === "en" ? "Frequently asked questions" : language === "ar" ? "الأسئلة الشائعة" : "Questions fréquentes"}>
              <div className="container mx-auto px-4 max-w-3xl">
                <p className="text-sm uppercase tracking-wider mb-2 text-primary">FAQ</p>
                <h2 className="text-2xl md:text-4xl font-bold mb-8 font-['Playfair_Display'] italic leading-tight text-foreground">
                  {language === "en" ? "Frequently asked questions" : language === "ar" ? "الأسئلة الشائعة" : "Questions fréquentes"}
                </h2>
                <div className="space-y-3">
                  {faq.map((item, i) => (
                    <details
                      key={i}
                      className="group rounded-lg border border-border bg-card px-5 py-4 open:shadow-sm transition-shadow"
                    >
                      <summary className="cursor-pointer list-none flex items-start justify-between gap-4 font-semibold text-foreground">
                        <span>{item.q}</span>
                        <span className="text-primary text-xl leading-none shrink-0 group-open:rotate-45 transition-transform">
                          +
                        </span>
                      </summary>
                      <p className="mt-3 text-foreground/80 leading-relaxed whitespace-pre-line">
                        {item.a}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          )}

          {videoSection && videoSection.videos.length > 0 && (
            <section className="py-16 bg-background">
              <div className="container mx-auto px-4 max-w-6xl">
                <p className="text-sm uppercase tracking-wider mb-2 text-primary">
                  Vidéos
                </p>
                <h2 className="text-2xl md:text-4xl font-bold mb-4 font-['Playfair_Display'] italic leading-tight text-foreground">
                  {videoSection.title}
                </h2>
                {videoSection.intro && (
                  <p className="text-foreground/80 text-base md:text-lg leading-relaxed mb-8 max-w-3xl">
                    {videoSection.intro}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {videoSection.videos.map((v) => (
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
              </div>
            </section>
          )}
        </>
      )}

      {!embedBackSlug && <Footer />}
      </div>
      {!embedBackSlug && !openBusinessId && !activeVideoId && <HomeBottomBar />}
      <ClubLoginPopup />

      {openBusinessId && (
        <div
          className={`fixed top-0 left-0 right-0 bottom-0 z-[220] bg-background shadow-2xl overflow-visible flex flex-col transform-gpu will-change-transform lg:left-auto lg:bottom-auto lg:border-l lg:border-border lg:w-1/2 ${isClosing ? "animate-slide-out-right" : "animate-slide-in-right"}`}
          style={{ height: "100dvh" }}
        >

          <SlidePanelHeader onClose={closePanel} alwaysDark glassClose />
          <div className="flex-1 min-h-0 overflow-visible">
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
              <BookOnlineSlidePanel
                key={openBusinessId}
                businessId={openBusinessId}
                onClose={closePanel}
                onPrevBusiness={() => hasPrev && setOpenBusinessId(orderedIds[openIndex - 1])}
                onNextBusiness={() => hasNext && setOpenBusinessId(orderedIds[openIndex + 1])}
                hasPrevBusiness={hasPrev}
                hasNextBusiness={hasNext}
                showSearchBar={true}
                onSearch={(params) => {
                  const queryParams = new URLSearchParams(params).toString();
                  navigate(withLangPrefix(`/search?${queryParams}`, language));
                }}
                onSearchBusinessSelect={(id) => {
                  navigate(withLangPrefix(`/search?openBusiness=${id}`, language));
                }}
                onHotelSearch={(intent, spokenText) => {
                  const params: Record<string, string> = {
                    city: intent.city,
                    checkIn: intent.checkIn || "",
                    checkOut: intent.checkOut || "",
                    adults: String(intent.adults || 2),
                    spokenText,
                  };
                  const queryParams = new URLSearchParams(params).toString();
                  navigate(withLangPrefix(`/search?${queryParams}`, language));
                }}
              />
            </Suspense>
          </div>
        </div>
      )}

      {videoSection && activeVideoId && (() => {
        const list = videoSection.videos.map((v) => ({
          id: v.id,
          url: v.url,
          business_name: v.businessName || v.title,
          pageBusinessName: v.businessName ?? null,
          pageBusinessId: v.businessId ?? null,
          owner: v.businessId && v.businessName
            ? { id: v.businessId, name: v.businessName, logo_url: null, logo_bg: null }
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

export default BlogArticleTemplate;
