// Page embarquable « Laisser un avis » : /embed/avis/:slug?platform=all|google|tripadvisor&lang=fr&variant=card|bar
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { applyEmbedBg, parseBg, resolveEmbedInk } from "@/lib/embedFit";
import { supabase } from "@/integrations/supabase/client";
import { tripadvisorReviewUrl } from "@/lib/tripadvisorUrl";
import EmbedRateUsWidget, { type RateTarget, type RateVariant } from "@/components/embed/EmbedRateUsWidget";

type Lang = "fr" | "en" | "ar";

const MESSAGES: Record<Lang, { loading: string; error: string }> = {
  fr: { loading: "Chargement…", error: "Aucun lien d'avis disponible" },
  en: { loading: "Loading…", error: "No review link available" },
  ar: { loading: "جارٍ التحميل…", error: "لا يوجد رابط للتقييم" },
};

const FIELDS =
  "id,name,google_place_id,google_review_url,google_maps_url,google_reviews_url,google_rating,google_review_count,tripadvisor_review_url,tripadvisor_url,tripadvisor_rating,tripadvisor_review_count";

export default function EmbedRateUs() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const platformParam = (params.get("platform") || "all").toLowerCase();
  const platform = ["google", "tripadvisor"].includes(platformParam) ? platformParam : "all";
  const variant: RateVariant = (params.get("variant") || "card").toLowerCase() === "bar" ? "bar" : "card";
  const langParam = (params.get("lang") || "fr").toLowerCase();
  const lang: Lang = langParam === "en" || langParam === "ar" ? (langParam as Lang) : "fr";
  const L = MESSAGES[lang];
  // Fond de la carte :
  //   ?bg=EFE6D8       → carte de cette couleur (encre auto selon luminance)
  //   ?bg=transparent  → carte transparente : fond du site hôte
  //   (absent)         → carte sombre d'origine
  //   ?card=EFE6D8     → intérieur de la carte coloré, page transparente
  const bgRaw = (params.get("bg") || "").trim();
  const bgColor = parseBg(bgRaw);
  const cardColor = parseBg(params.get("card"));
  const wantsTransparent = /^(transparent|none|0)$/i.test(bgRaw);
  const surface: string | null | undefined =
    cardColor || bgColor || (wantsTransparent ? "" : undefined);
  const ink = surface === undefined ? "light" : resolveEmbedInk(params.get("ink"), bgColor || cardColor);

  const [name, setName] = useState("");
  const [targets, setTargets] = useState<RateTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    return applyEmbedBg(cardColor ? "" : params.get("bg"));
  }, [lang, params]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        const query = supabase.from("businesses").select(FIELDS);
        const { data } = await (isUuid ? query.eq("id", slug) : query.eq("slug", slug)).maybeSingle();
        if (!alive) return;
        const biz = data as Record<string, any> | null;
        if (!biz) {
          setError(true);
          return;
        }
        const googleUrl =
          biz.google_review_url ||
          (biz.google_place_id
            ? `https://search.google.com/local/writereview?placeid=${biz.google_place_id}`
            : biz.google_maps_url || biz.google_reviews_url) ||
          null;
        const taUrl = biz.tripadvisor_review_url || tripadvisorReviewUrl(biz.tripadvisor_url) || biz.tripadvisor_url || null;

        const list: RateTarget[] = [];
        if ((platform === "all" || platform === "google") && googleUrl)
          list.push({
            key: "google",
            name: "Google",
            logo: "https://www.google.com/favicon.ico",
            url: googleUrl,
            rating: biz.google_rating ?? null,
            count: biz.google_review_count ?? null,
          });
        if ((platform === "all" || platform === "tripadvisor") && taUrl)
          list.push({
            key: "tripadvisor",
            name: "TripAdvisor",
            logo: "/review-logos/tripadvisor.webp",
            url: taUrl,
            rating: biz.tripadvisor_rating ?? null,
            count: biz.tripadvisor_review_count ?? null,
          });

        setName(biz.name || "");
        setTargets(list);
        if (!list.length) setError(true);
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug, platform]);

  // Hauteur publiée pour l'auto-resize côté hôte : mesurée sur le conteneur
  // (et non documentElement.scrollHeight) pour éviter la boucle de croissance.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const post = () =>
      window.parent?.postMessage(
        { type: "owm-rate-height", height: Math.ceil(el.getBoundingClientRect().height) },
        "*",
      );
    post();
    const ro = new ResizeObserver(post);
    ro.observe(el);
    return () => ro.disconnect();
  }, [targets, loading, error, variant]);

  return (
    <div ref={rootRef} className="w-full min-h-0 p-2 flex items-start justify-center bg-transparent">
      {loading && (
        <div className="w-full max-w-[460px] rounded-3xl bg-muted/40 animate-pulse h-[280px] flex items-center justify-center text-sm text-muted-foreground">
          {L.loading}
        </div>
      )}
      {!loading && error && (
        <div className="w-full max-w-[460px] rounded-3xl border border-border p-6 text-center text-sm text-muted-foreground">
          {L.error}
        </div>
      )}
      {!loading && !error && (
        <EmbedRateUsWidget businessName={name} targets={targets} lang={lang} variant={variant} surface={surface} ink={ink} />
      )}
    </div>
  );
}
