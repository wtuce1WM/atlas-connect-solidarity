// Standalone embeddable reviews page: /embed/reviews/:slug?platform=google|tripadvisor|restaurant-guru|all&lang=fr
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import EmbedReviewsWidget, {
  type EmbedReviewItem,
  type EmbedReviewsBusiness,
  type ReviewPlatformKey,
  type ReviewsRatio,
  type ReviewsSize,
} from "@/components/embed/EmbedReviewsWidget";

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
  const [params] = useSearchParams();
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
  const langParam = (params.get("lang") || "fr").toLowerCase();
  const lang: Lang = langParam === "en" || langParam === "ar" ? (langParam as Lang) : "fr";
  const L = MESSAGES[lang];


  const [business, setBusiness] = useState<(EmbedReviewsBusiness & { id: string }) | null>(null);
  const [reviews, setReviews] = useState<EmbedReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.body.style.background = "transparent";
  }, [lang]);

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

  // Report height to host page for auto-resize.
  useEffect(() => {
    const post = () =>
      window.parent?.postMessage(
        { type: "owm-reviews-height", height: document.documentElement.scrollHeight },
        "*",
      );
    post();
    const t = window.setTimeout(post, 300);
    window.addEventListener("resize", post);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", post);
    };
  }, [business, reviews, loading, error]);

  return (
    <div className="w-full p-2 flex items-start justify-center bg-transparent">
      {loading && (
        <div className="w-full max-w-[460px] rounded-3xl bg-muted/40 animate-pulse h-[320px] flex items-center justify-center text-sm text-muted-foreground">
          {L.loading}
        </div>
      )}
      {!loading && (error || !business) && (
        <div className="w-full max-w-[460px] rounded-3xl border border-border p-6 text-center text-sm text-muted-foreground">
          {L.error}
        </div>
      )}
      {!loading && !error && business && (
        <EmbedReviewsWidget business={business} reviews={reviews} platform={platform} lang={lang} />
      )}
    </div>
  );
}
