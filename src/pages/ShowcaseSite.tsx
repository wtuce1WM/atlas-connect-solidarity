import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDown, CalendarDays, ChevronRight, Loader2, Mail, MapPin, MessageCircle, Phone, Star } from "lucide-react";
import { trackBusinessEvent } from "@/lib/businessAnalytics";
import AvailabilitySearchOverlay from "@/components/overlays/AvailabilitySearchOverlay";
import { useHotelAvailability } from "@/hooks/useHotelAvailability";
import type { FallbackPanelData } from "@/components/HotelAvailabilityOverlay";
import { Button } from "@/components/ui/button";
import { whatsappUrl } from "@/lib/phoneUtils";

interface ShowcaseData {
  id: string;
  business_id: string;
  enabled: boolean;
  canonical_url: string | null;
  tagline_fr: string | null;
  tagline_en: string | null;
  tagline_ar: string | null;
  hero_image_url: string | null;
  hero_video_url: string | null;
  story_fr: string | null;
  story_en: string | null;
  story_ar: string | null;
  gallery_image_ids: unknown;
  testimonials: Array<{ author: string; quote: string; location?: string }>;
  cta_config: {
    whatsapp?: string;
    phone?: string;
    email?: string;
    reserve_url?: string;
    primary_label?: string;
  };
  business?: Record<string, any>;
}

interface Highlight {
  id: string;
  title: string | null;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  image_url: string | null;
  metric_title: string | null;
  metric_title_en: string | null;
  metric_value: string | null;
  metric_value_en: string | null;
  sort_order: number;
}

interface Review {
  id: string;
  author_name: string | null;
  rating: number | null;
  quote: string;
}

const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

const ShowcaseSite = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<ShowcaseData | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hotelSearchLoading, setHotelSearchLoading] = useState(false);
  const [availability, setAvailability] = useState<FallbackPanelData | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      const { data: biz } = await supabase
        .from("businesses")
        .select("id, name, name_en, slug, city, country, address, description_fr, description_en, hook_fr, hook_en, images, latitude, longitude, phone, email, whatsapp, facebook_url, instagram_url, pinterest_url, services, default_service, google_rating, google_review_count, total_review_count, computed_rating, min_price, manual_price_range, reserve_now_cta")
        .eq("slug", slug)
        .maybeSingle();
      if (!biz) { setNotFound(true); setLoading(false); return; }

      const { data: showcase } = await (supabase as any)
        .from("business_showcase_site")
        .select("*")
        .eq("business_id", biz.id)
        .eq("enabled", true)
        .maybeSingle();

      if (!showcase) { setNotFound(true); setLoading(false); return; }

      const [highlightResult, reviewResult] = await Promise.all([
        supabase
          .from("front_highlights")
          .select("id,title,title_en,description,description_en,image_url,metric_title,metric_title_en,metric_value,metric_value_en,sort_order")
          .eq("business_id", biz.id)
          .order("sort_order"),
        supabase
          .from("reviews")
          .select("id,author_name,rating,text,text_fr,highlight,is_default,is_hidden,created_at")
          .eq("business_id", biz.id)
          .eq("is_hidden", false)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

      setData({ ...showcase, business: biz });
      setHighlights((((highlightResult.data || []) as unknown) as Highlight[]).filter((item) =>
        Boolean(item.title?.trim() || item.description?.trim() || item.image_url)
      ));
      setReviews((reviewResult.data || []).map((review: any) => ({
        id: review.id,
        author_name: review.author_name,
        rating: review.rating,
        quote: review.highlight || review.text_fr || review.text || "",
      })).filter((review) => review.quote));
      setLoading(false);
      trackBusinessEvent(biz.id, "view", { subtype: "showcase" });
    };
    load();
  }, [slug]);

  const business = data?.business;
  const handleAvailability = useHotelAvailability({
    business,
    businessId: business?.id || "",
    serpApiMapping: business ? { city: business.city, serp_hotel_name: business.name } : null,
    hasSerpMapping: Boolean(business),
    language,
    setHotelSearchLoading,
    openFallback: setAvailability,
    hideCards: () => undefined,
  });

  const openAvailability = useCallback(() => {
    trackBusinessEvent(business?.id, "booking_intent", { subtype: "showcase" });
    scrollToId("availability");
  }, [business?.id]);

  const gallery = useMemo<string[]>(() => {
    const configured = Array.isArray(data?.gallery_image_ids) ? data.gallery_image_ids.filter((value): value is string => typeof value === "string") : [];
    const source: string[] = configured.length > 0
      ? configured
      : (Array.isArray(business?.images) ? business.images.filter((value: unknown): value is string => typeof value === "string") : []);
    return [...new Set(source.filter(Boolean))];
  }, [business?.images, data?.gallery_image_ids]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-showcase-night text-primary-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-showcase-night text-primary-foreground flex-col gap-4">
        <p className="text-lg">Site vitrine introuvable.</p>
        <Link to="/" className="text-primary underline">Retour à l'accueil</Link>
      </div>
    );
  }

  const b = data.business;
  if (!b) return null;
  const isEn = language === "en";
  const tagline = (isEn ? data.tagline_en || b.hook_en : data.tagline_fr || b.hook_fr) || "";
  const story = (isEn ? data.story_en || b.description_en : data.story_fr || b.description_fr) || "";
  const heroMedia = data.hero_video_url || data.hero_image_url || gallery[0];
  const isVideo = !!data.hero_video_url;
  const canonicalUrl = data.canonical_url || `https://oneworldmorocco.com/site/${slug}`;
  const primaryCta = data.cta_config?.primary_label || (isEn ? "Book your stay" : "Réserver votre séjour");
  const whatsapp = data.cta_config?.whatsapp || b.whatsapp || "+212661439221";
  const phone = data.cta_config?.phone || b.phone;
  const email = data.cta_config?.email || b.email;
  const rating = Number(b.google_rating || (b.computed_rating ? b.computed_rating / 4 : 0));
  const reviewCount = Number(b.google_review_count || b.total_review_count || 0);
  const currentHotel = availability?.hotels.find((hotel) => hotel.isCurrentHotel);

  const waLink = whatsapp ? whatsappUrl(whatsapp, isEn
    ? `Hello ${b.name}, I would like to book a stay.`
    : `Bonjour ${b.name}, je souhaite réserver un séjour.`) : null;

  return (
    <>
      <Helmet>
        <title>{b.name} — {b.city || "Maroc"}</title>
        <meta name="description" content={tagline || `${b.name} — site officiel`} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={b.name} />
        <meta property="og:description" content={tagline} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        {data.hero_image_url && <meta property="og:image" content={data.hero_image_url} />}
      </Helmet>

      <div className="min-h-screen bg-showcase-paper text-showcase-ink font-roboto pb-20 md:pb-0">
        <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 md:px-12 md:py-7 text-primary-foreground">
          <button onClick={() => scrollToId("top")} className="font-josefin text-sm font-semibold uppercase tracking-widest">{b.name}</button>
          <nav className="hidden items-center gap-7 text-xs font-semibold uppercase tracking-widest md:flex">
            <button onClick={() => scrollToId("story")}>{isEn ? "The riad" : "Le riad"}</button>
            <button onClick={() => scrollToId("rooms")}>{isEn ? "Rooms" : "Chambres"}</button>
            <button onClick={() => scrollToId("gallery")}>{isEn ? "Gallery" : "Galerie"}</button>
            <button onClick={() => scrollToId("location")}>{isEn ? "Location" : "Accès"}</button>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLanguage(isEn ? "fr" : "en")} className="h-9 border border-primary-foreground/40 px-3 text-xs text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              {isEn ? "FR" : "EN"}
            </Button>
            <Button onClick={openAvailability} size="sm" className="hidden md:inline-flex">{isEn ? "Book" : "Réserver"}</Button>
          </div>
        </header>

        <main id="top">
          <section className="relative min-h-[92dvh] overflow-hidden bg-showcase-night">
            {heroMedia && isVideo ? (
              <video src={data.hero_video_url || ""} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
            ) : heroMedia ? (
              <img src={heroMedia} alt={b.name} className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-b from-showcase-night/45 via-showcase-night/10 to-showcase-night/80" />
            <div className="relative z-10 flex min-h-[92dvh] max-w-7xl flex-col justify-end px-6 pb-16 pt-28 md:px-12 md:pb-20 lg:px-20">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-showcase-brass">{b.city} · {isEn ? "Moroccan hospitality" : "Hospitalité marocaine"}</p>
              <h1 className="max-w-4xl font-josefin text-5xl font-semibold leading-[1.03] text-primary-foreground md:text-7xl lg:text-8xl">{b.name}</h1>
              {tagline && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-primary-foreground/85 md:text-2xl">{tagline}</p>}
              <div className="mt-8 flex flex-wrap gap-3">
                <Button onClick={openAvailability} size="lg"><CalendarDays className="h-5 w-5" />{primaryCta}</Button>
                <Button onClick={() => scrollToId("story")} variant="outline" size="lg" className="border-primary-foreground/50 bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-showcase-ink">
                  {isEn ? "Discover the riad" : "Découvrir le riad"}<ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              <button onClick={() => scrollToId("story")} aria-label={isEn ? "Continue" : "Continuer"} className="absolute bottom-5 right-6 flex h-11 w-11 items-center justify-center rounded-full border border-primary-foreground/40 text-primary-foreground md:right-12">
                <ArrowDown className="h-5 w-5" />
              </button>
            </div>
          </section>

          <section id="story" className="scroll-mt-8 px-6 py-20 md:px-12 md:py-28">
            <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-showcase-brass">{isEn ? "A house in the Medina" : "Une maison dans la Médina"}</p>
                <h2 className="mt-4 font-josefin text-4xl font-semibold leading-tight md:text-6xl">{isEn ? "Calm behind the ochre walls" : "Le calme derrière les murs ocre"}</h2>
                <div className="mt-8 flex gap-8 border-t border-showcase-line pt-6">
                  {rating > 0 && <div><p className="text-2xl font-semibold">{rating.toFixed(1)}</p><p className="text-xs uppercase tracking-widest text-showcase-copy">Google</p></div>}
                  {reviewCount > 0 && <div><p className="text-2xl font-semibold">{reviewCount}</p><p className="text-xs uppercase tracking-widest text-showcase-copy">{isEn ? "Reviews" : "Avis"}</p></div>}
                  {b.min_price && <div><p className="text-2xl font-semibold">{b.min_price} €</p><p className="text-xs uppercase tracking-widest text-showcase-copy">{isEn ? "From" : "Dès"}</p></div>}
                </div>
              </div>
              {story && <div className="prose prose-lg max-w-none text-showcase-copy prose-headings:font-josefin prose-headings:text-showcase-ink prose-p:leading-relaxed prose-strong:text-showcase-ink" dangerouslySetInnerHTML={{ __html: story }} />}
            </div>
          </section>

          {highlights.length > 0 && (
            <section id="rooms" className="scroll-mt-8 bg-showcase-night px-6 py-20 text-primary-foreground md:px-12 md:py-28">
              <div className="mx-auto max-w-7xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-showcase-brass">{isEn ? "Sleep at Dar Najat" : "Dormir à Dar Najat"}</p>
                <h2 className="mt-4 font-josefin text-4xl font-semibold md:text-6xl">{isEn ? "Our rooms" : "Nos chambres"}</h2>
                <div className="mt-12 grid gap-8 md:grid-cols-2">
                  {highlights.map((room, index) => {
                    const title = (isEn ? room.title_en : room.title) || room.title || "";
                    const description = (isEn ? room.description_en : room.description) || room.description || "";
                    const metricTitle = (isEn ? room.metric_title_en : room.metric_title) || room.metric_title || "";
                    const metricValue = (isEn ? room.metric_value_en : room.metric_value) || room.metric_value || "";
                    return (
                      <article key={room.id} className={index % 2 === 1 ? "md:mt-16" : ""}>
                        {room.image_url && <img src={room.image_url} alt={title} loading="lazy" className="aspect-[4/3] w-full object-cover" />}
                        <div className="border-t border-primary-foreground/20 pt-5">
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="font-josefin text-2xl font-semibold md:text-3xl">{title}</h3>
                            {(metricTitle || metricValue) && <p className="shrink-0 text-right text-xs uppercase tracking-wider text-showcase-brass">{metricTitle}<br/><span className="text-sm font-semibold text-primary-foreground">{metricValue}</span></p>}
                          </div>
                          <div className="mt-4 line-clamp-5 text-sm leading-relaxed text-primary-foreground/70" dangerouslySetInnerHTML={{ __html: description }} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {gallery.length > 0 && (
            <section id="gallery" className="scroll-mt-8 px-4 py-20 md:px-8 md:py-28">
              <div className="mx-auto max-w-7xl">
                <div className="px-2 md:px-4"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-showcase-brass">{isEn ? "Life at the riad" : "La vie au riad"}</p><h2 className="mt-4 font-josefin text-4xl font-semibold md:text-6xl">{isEn ? "Patio, table & rooftop" : "Patio, table & rooftop"}</h2></div>
                <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
                  {gallery.slice(0, 8).map((image: string, index: number) => <img key={image} src={image} alt={`${b.name} — ${index + 1}`} loading="lazy" className={`w-full object-cover ${index === 0 || index === 5 ? "col-span-2 aspect-[16/10]" : "aspect-square"}`} />)}
                </div>
              </div>
            </section>
          )}

          <section id="availability" className="scroll-mt-8 bg-showcase-brass px-6 py-20 md:px-12 md:py-28">
            <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-showcase-ink/70">{isEn ? "Direct availability" : "Disponibilités directes"}</p><h2 className="mt-4 font-josefin text-4xl font-semibold leading-tight md:text-6xl">{isEn ? "Choose your dates" : "Choisissez vos dates"}</h2><p className="mt-5 max-w-md leading-relaxed text-showcase-ink/75">{isEn ? "Check the riad's availability for your stay, then contact the team directly." : "Vérifiez la disponibilité du riad pour votre séjour, puis contactez directement l’équipe."}</p></div>
              <div className="bg-showcase-night p-3 md:p-6">
                <AvailabilitySearchOverlay language={language} isSearching={hotelSearchLoading} onSearch={handleAvailability} onClose={() => undefined} inline />
                {availability && !hotelSearchLoading && <div className="mt-4 border-t border-primary-foreground/15 px-3 py-4 text-sm text-primary-foreground"><p className="font-semibold">{currentHotel ? (isEn ? "Availability found for your dates." : "Disponibilité trouvée pour vos dates.") : (isEn ? "No availability found at Dar Najat for these dates." : "Aucune disponibilité trouvée à Dar Najat pour ces dates.")}</p>{currentHotel?.serpPrice?.amount && <p className="mt-1 text-primary-foreground/70">{isEn ? "Observed from" : "Prix constaté à partir de"} {currentHotel.serpPrice.amount} {currentHotel.serpPrice.currency}</p>}{waLink && <a href={waLink} target="_blank" rel="noreferrer" onClick={() => trackBusinessEvent(data.business_id, "whatsapp_click", { subtype: "showcase_availability" })} className="mt-4 inline-flex items-center gap-2 bg-whatsapp px-5 py-3 font-semibold text-whatsapp-foreground"><MessageCircle className="h-5 w-5" />WhatsApp</a>}</div>}
              </div>
            </div>
          </section>

          {reviews.length > 0 && <section className="px-6 py-20 md:px-12 md:py-28"><div className="mx-auto max-w-6xl"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-showcase-brass">{isEn ? "Guest book" : "Livre d’or"}</p><h2 className="mt-4 font-josefin text-4xl font-semibold md:text-6xl">{isEn ? "They stayed here" : "Ils ont séjourné ici"}</h2><div className="mt-10 grid gap-8 md:grid-cols-2">{reviews.map((review) => <blockquote key={review.id} className="border-l-2 border-showcase-brass pl-6"><div className="mb-4 flex gap-1 text-showcase-brass">{Array.from({ length: Math.round(review.rating || 5) }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div><p className="text-lg leading-relaxed text-showcase-copy">« {review.quote} »</p><footer className="mt-4 text-xs font-semibold uppercase tracking-widest">{review.author_name}</footer></blockquote>)}</div></div></section>}

          <section id="location" className="scroll-mt-8 grid bg-showcase-night text-primary-foreground lg:grid-cols-2">
            <div className="flex flex-col justify-center px-6 py-16 md:px-12 lg:px-20"><MapPin className="h-7 w-7 text-showcase-brass"/><h2 className="mt-5 font-josefin text-4xl font-semibold md:text-5xl">{isEn ? "In the heart of the Medina" : "Au cœur de la Médina"}</h2><p className="mt-5 text-primary-foreground/70">{b.address}<br/>{b.city}, {b.country}</p><div className="mt-8 flex flex-wrap gap-4">{phone && <a href={`tel:${phone}`} onClick={() => trackBusinessEvent(data.business_id, "phone_click", { subtype: "showcase" })} className="inline-flex items-center gap-2 border border-primary-foreground/30 px-5 py-3"><Phone className="h-4 w-4"/>{isEn ? "Call" : "Appeler"}</a>}{email && <a href={`mailto:${email}`} onClick={() => trackBusinessEvent(data.business_id, "email_click", { subtype: "showcase" })} className="inline-flex items-center gap-2 border border-primary-foreground/30 px-5 py-3"><Mail className="h-4 w-4"/>Email</a>}</div></div>
            {b.latitude && b.longitude && <iframe title={isEn ? "Location map" : "Carte d’accès"} src={`https://www.google.com/maps?q=${b.latitude},${b.longitude}&z=16&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-[420px] w-full border-0 lg:h-full lg:min-h-[560px]" />}
          </section>
        </main>

        <footer className="bg-showcase-night px-6 py-8 text-center text-xs text-primary-foreground/50"><Link to={`/fiche/${slug}`} className="hover:text-primary-foreground">Powered by <span className="font-semibold">One World Morocco</span></Link></footer>

        <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-showcase-line bg-showcase-paper p-2 md:hidden">
          <Button onClick={openAvailability} className="rounded-none"><CalendarDays className="h-4 w-4" />{isEn ? "Book" : "Réserver"}</Button>
          {waLink && <a href={waLink} target="_blank" rel="noreferrer" onClick={() => trackBusinessEvent(data.business_id, "whatsapp_click", { subtype: "showcase_sticky" })} className="flex h-10 items-center justify-center gap-2 bg-whatsapp px-3 text-sm font-semibold text-whatsapp-foreground"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
        </div>
      </div>
    </>
  );
};

export default ShowcaseSite;
