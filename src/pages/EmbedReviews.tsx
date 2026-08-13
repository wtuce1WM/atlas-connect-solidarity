// Standalone embeddable reviews page: /embed/reviews/:slug?platform=google|tripadvisor|restaurant-guru|all&lang=fr
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { parseFit, fitFlags, applyEmbedBg, parseBg, resolveEmbedInk } from "@/lib/embedFit";
import { useEmbedFitScale } from "@/hooks/useEmbedFitScale";
import EmbedReviewsWidget, {
  type EmbedReviewItem,
  type EmbedReviewsBusiness,
  type ReviewPlatformKey,
  type ReviewsRatio,
  type ReviewsSize,
} from "@/components/embed/EmbedReviewsWidget";
import { useWidgetTracking } from "@/hooks/useWidgetTracking";
import { useWidgetParams } from "@/hooks/useWidgetParams";

type Lang = "fr" | "en" | "ar";

const MESSAGES: Record<Lang, { loading: string; error: string }> = {
  fr: { loading: "Chargement des avis…", error: "Avis indisponibles" },
  en: { loading: "Loading reviews…", error: "Reviews unavailable" },
  ar: { loading: "جارٍ تحميل الآراء…", error: "الآراء غير متاحة" },
};

const BUSINESS_FIELDS =
  "id,name,slug,computed_rating,total_review_count,google_rating,google_review_count,google_reviews_url,google_maps_url,tripadvisor_rating,tripadvisor_review_count,tripadvisor_url,restaurant_guru_rating,restaurant_guru_review_count,restaurant_guru_url";

export default function EmbedReviews() {
  const { slug = "" } = useParams();
  const { params, businessId: widgetBusinessId } = useWidgetParams("reviews", { slug });
  useWidgetTracking("reviews", widgetBusinessId, params.get("lang") || undefined);
  const platformParam = (params.get("platform") || "all").toLowerCase();
  const platform: ReviewPlatformKey = ["google", "tripadvisor", "restaurant-guru"].includes(platformParam)
    ? (platformParam as ReviewPlatformKey)
    : "all";
  const ratioParam = (params.get("ratio") || "auto").toLowerCase();
  const ratio: ReviewsRatio = ["vertical", "horizontal", "square"].includes(ratioParam)
    ? (ratioParam as ReviewsRatio)
    : "auto";
  const sizeParam = (params.get("size") || "auto").toLowerCase();
  const size: ReviewsSize = sizeParam === "sm" || sizeParam === "lg" ? (sizeParam as ReviewsSize) : "auto";
  const { fullWidth, fullHeight } = fitFlags(parseFit(params.get("fit")));
  // Fond de la carte d'avis :
  //   ?bg=EFE6D8       → la carte prend cette couleur (encre auto selon luminance)
  //   ?bg=transparent  → page transparente : fond du site hôte
  //   ?card=EFE6D8     → couleur de l'intérieur de la carte (utile avec bg=transparent)
  //   (absent)         → carte sombre d'origine
  const bgRaw = (params.get("bg") || "").trim();
  const bgColor = parseBg(bgRaw);
  const cardColor = parseBg(params.get("card"));
  const wantsTransparent = /^(transparent|none|0)$/i.test(bgRaw);
  const surface: string | null | undefined = bgColor || (wantsTransparent ? (cardColor || "") : undefined);
  const ink = surface === undefined ? "light" : resolveEmbedInk(params.get("ink"), bgColor || cardColor);
  // ?frame=0 (ou frameless=1) → aucun cadre : fusion parfaite avec la section hôte
  const frameless = /^(0|none|off|no)$/i.test((params.get("frame") || "").trim()) ||
    /^(1|true|yes)$/i.test((params.get("frameless") || "").trim());


  

  const langParam = (params.get("lang") || "fr").toLowerCase();
  const lang: Lang = langParam === "en" || langParam === "ar" ? (langParam as Lang) : "fr";
  const L = MESSAGES[lang];


  const [business, setBusiness] = useState<(EmbedReviewsBusiness & { id: string }) | null>(null);
  const [reviews, setReviews] = useState<EmbedReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { innerRef: fitInnerRef, style: fitStyle } = useEmbedFitScale(fullHeight, [business, reviews, loading, error]);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    return applyEmbedBg(params.get("bg"));
  }, [lang, params]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        const query = supabase.from("businesses").select(BUSINESS_FIELDS);
        const { data: biz } = await (isUuid ? query.eq("id", slug) : query.eq("slug", slug)).maybeSingle();
        if (!alive) return;
        if (!biz) {
          setError(true);
          return;
        }
        setBusiness(biz as any);
        const { data: revs } = await supabase
          .from("reviews")
          .select("id,source,author_name,rating,text,text_fr,text_en,text_ar,is_default")
          .eq("business_id", (biz as any).id)
          .eq("is_hidden", false)
          .order("is_default", { ascending: false })
          .order("rating", { ascending: false, nullsFirst: false })
          .limit(200);
        if (!alive) return;
        setReviews(((revs as any) || []) as EmbedReviewItem[]);
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  // Hauteur publiée pour l'auto-resize côté hôte : mesurée sur le conteneur
  // (et non documentElement.scrollHeight) pour éviter la boucle de croissance.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || fullHeight) return;
    const post = () =>
      window.parent?.postMessage(
        { type: "owm-reviews-height", height: Math.ceil(el.getBoundingClientRect().height) },
        "*",
      );
    post();
    const t = window.setTimeout(post, 300);
    window.addEventListener("resize", post);
    const ro = new ResizeObserver(post);
    ro.observe(el);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", post);
      ro.disconnect();
    };
  }, [business, reviews, loading, error, fullHeight]);

  return (
    <div
      ref={rootRef}
      className={`w-full flex justify-center bg-transparent ${
        fullHeight ? "h-screen min-h-screen overflow-hidden items-start p-1" : "items-start p-2"
      }`}
    >
      {loading && (
        <div className="w-full rounded-3xl bg-muted/40 animate-pulse h-[320px] flex items-center justify-center text-sm text-muted-foreground">
          {L.loading}
        </div>
      )}
      {!loading && (error || !business) && (
        <div className="w-full rounded-3xl border border-border p-6 text-center text-sm text-muted-foreground">
          {L.error}
        </div>
      )}
      {!loading && !error && business && (
        <div ref={fitInnerRef} className="w-full flex justify-center [&>div]:max-w-full" style={fitStyle}>
          <EmbedReviewsWidget business={business} reviews={reviews} platform={platform} lang={lang} ratio={ratio} size={size} fullWidth={fullWidth} surface={surface} ink={ink} frameless={frameless} />
        </div>
      )}
    </div>
  );
}

