import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Globe, MapPin, PenSquare, Star } from "lucide-react";
import NotFound from "@/pages/NotFound";
import ShareButton from "@/components/ShareButton";
import { useSEO } from "@/hooks/useSEO";
import { tripadvisorReviewUrl } from "@/lib/tripadvisorUrl";
import hamsaBlueAsset from "@/assets/hamsa-wall-blue.webp.asset.json";
import { useLanguage } from "@/contexts/LanguageContext";


type PublicBusiness = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  description: string | null;
  logo_url: string | null;
  images: string[] | null;
  website: string | null;
  whatsapp: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  pinterest_url: string | null;
  spotify_url: string | null;
  soundcloud_url: string | null;
  hook_fr: string | null;
  google_maps_url: string | null;
  google_review_url: string | null;
  google_place_id: string | null;
  tripadvisor_url: string | null;
  tripadvisor_review_url: string | null;
  computed_rating?: number | null;
  total_review_count?: number | null;
};


const SOCIAL_ICONS: Record<string, JSX.Element> = {
  whatsapp: (
    <svg className="h-6 w-6 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  ),
  tiktok: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z"/></svg>
  ),
  instagram: (
    <svg className="h-6 w-6 text-[#E4405F]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
  ),
  facebook: (
    <svg className="h-6 w-6 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  ),
  twitter: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  ),
  pinterest: (
    <svg className="h-6 w-6 text-[#E60023]" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg>
  ),
  soundcloud: (
    <svg className="h-6 w-6 text-[#FF5500]" viewBox="0 0 32 32" fill="currentColor"><path d="M0.96 19.04c0 1.36 0.32 2.4 0.8 3.12 0.16 0.16 0.32 0.24 0.48 0.16 0.16-0.08 0.24-0.24 0.16-0.4-0.48-0.88-0.72-1.84-0.72-2.88s0.24-2 0.72-2.88c0.08-0.16 0-0.32-0.16-0.4-0.16-0.08-0.32 0-0.48 0.16-0.48 0.72-0.8 1.76-0.8 3.12zM2.96 21.36c0 0.96 0.16 1.84 0.48 2.4 0.080 0.16 0.24 0.24 0.4 0.16s0.24-0.24 0.16-0.4c-0.24-0.56-0.4-1.36-0.4-2.16 0-1.6 0.32-2.96 0.4-3.12 0.080-0.16 0-0.32-0.16-0.4s-0.32 0-0.4 0.16c-0.24 0.56-0.48 1.92-0.48 3.36zM5.2 22.64c0 0.16 0.16 0.32 0.32 0.32s0.32-0.16 0.32-0.32l0.32-3.6-0.32-7.040c0-0.16-0.16-0.32-0.32-0.32s-0.32 0.16-0.32 0.32l-0.32 7.040 0.32 3.6zM7.6 23.040c0 0.16 0.16 0.32 0.32 0.32 0.24 0 0.32-0.16 0.32-0.32l0.24-4-0.24-8.16c0-0.24-0.16-0.32-0.32-0.32s-0.32 0.16-0.32 0.32l-0.24 8.16 0.24 4zM10 23.12c0 0.24 0.16 0.4 0.4 0.4 0.16 0 0.32-0.16 0.4-0.4l0.24-4.080-0.24-7.36c0-0.24-0.16-0.4-0.4-0.4-0.24 0-0.4 0.16-0.4 0.4l-0.24 7.36 0.24 4.080zM12.48 23.2c0 0.24 0.16 0.4 0.4 0.4s0.4-0.16 0.4-0.4l0.24-4.16-0.24-9.040c0-0.24-0.16-0.4-0.4-0.4s-0.4 0.16-0.4 0.4l-0.16 9.040 0.16 4.16zM14.96 23.2c0 0.24 0.24 0.4 0.48 0.4s0.4-0.16 0.48-0.4l0.16-4.16-0.16-10.080c0-0.24-0.24-0.48-0.48-0.48s-0.48 0.24-0.48 0.48l-0.16 10.080 0.16 4.16zM17.52 23.2c0 0.32 0.24 0.48 0.48 0.48 0.32 0 0.48-0.24 0.48-0.48l0.16-4.16-0.16-10.16c0-0.32-0.24-0.48-0.48-0.48-0.32 0-0.48 0.24-0.48 0.48v14.32zM20.080 23.2c0 0.32 0.24 0.56 0.56 0.56 0.24 0 0.48-0.24 0.56-0.56l0.16-4.080-0.16-9.6c0-0.32-0.24-0.56-0.56-0.56-0.24 0-0.56 0.24-0.56 0.56v13.68zM22.64 23.2c0 0.32 0.32 0.56 0.56 0.56 0.32 0 0.56-0.24 0.56-0.56l0.16-4-0.16-9.36c0-0.32-0.24-0.56-0.56-0.56-0.32 0-0.56 0.24-0.56 0.56l-0.16 9.36 0.16 4zM25.36 23.2c0 0.32 0.24 0.56 0.56 0.56s0.56-0.24 0.56-0.56l0.16-4-0.16-9.6c0-0.32-0.24-0.56-0.56-0.56s-0.56 0.24-0.56 0.56v13.6zM27.2 23.6c0 0.080 0.080 0.16 0.16 0.16h4.080c2.48 0 4.56-2 4.56-4.56s-2.080-4.56-4.56-4.56c-0.64 0-1.2 0.16-1.68 0.32-0.4-3.52-3.36-6.32-7.040-6.32-0.88 0-1.76 0.16-2.56 0.48-0.32 0.080-0.4 0.16-0.4 0.4v13.92z"/></svg>
  ),
  youtube: (
    <svg className="h-6 w-6 text-[#FF0000]" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
  ),
  linkedin: (
    <svg className="h-6 w-6 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
  ),
  spotify: (
    <svg className="h-6 w-6 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12C24 5.4 18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/></svg>
  ),
};

const buildWhatsAppUrl = (val: string) => {
  const v = val.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return `https://wa.me/${v.replace(/[^0-9]/g, "")}`;
};

const normalizeUrl = (v: string) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);

const stripHtml = (s: string) =>
  s
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

type Promotion = {
  id: string;
  title: string | null;
  title_fr: string | null;
  title_en: string | null;
  title_ar: string | null;
  promotion_message: string | null;
  promotion_message_fr: string | null;
  promotion_message_en: string | null;
  promotion_message_ar: string | null;
  savings_amount: number | null;
  promotion_currency: string | null;
  promotion_type: string | null;
  promotion_value: number | null;
};

const PublicBusinessProfile = () => {
  const { slug = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const { language } = useLanguage();
  const lang = (language || "fr").toLowerCase();
  const pickPromo = (p: Promotion, field: "title" | "promotion_message") => {
    const val = (p as any)[`${field}_${lang}`] as string | null | undefined;
    return val || (p as any)[`${field}_fr`] || (p as any)[field] || "";
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const query = supabase
        .from("businesses")
        .select(
          "id, slug, name, city, country, description, hook_fr, logo_url, images, website, whatsapp, instagram_url, facebook_url, tiktok_url, youtube_url, twitter_url, linkedin_url, pinterest_url, spotify_url, soundcloud_url, google_maps_url, google_review_url, google_place_id, tripadvisor_url, tripadvisor_review_url, computed_rating, total_review_count, is_active",
        )
        .eq("is_active", true);

      const { data } = await (isUuid ? query.eq("id", slug) : query.eq("slug", slug)).maybeSingle();
      if (cancelled) return;
      // keep raw HTML — rich text (h2, h3, blockquote, lists…) is rendered with styling below
      setBusiness((data as PublicBusiness) ?? null);
      setLoading(false);

      if (data?.id) {
        const { data: promos } = await supabase
          .from("affiliate_business_promotions")
          .select("id, title, promotion_message, savings_amount, promotion_currency, promotion_type, promotion_value")
          .eq("business_id", data.id)
          .order("sort_order", { ascending: true });
        if (!cancelled) setPromotions((promos as Promotion[]) ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const avatar = business?.logo_url || business?.images?.[0] || null;

  useSEO({
    title: business ? `${business.name} — One World Morocco` : "Établissement",
    description: business?.description || (business ? `Découvrez ${business.name}.` : undefined),
    ogImage: avatar || undefined,
  });

  if (loading) {
    return <div className="min-h-screen" style={{ backgroundColor: "#ECD6B8" }} />;
  }
  if (!business) return <NotFound />;

  const socials: { kind: string; label: string; val: string | null }[] = [
    { kind: "whatsapp", label: "WhatsApp", val: business.whatsapp },
    { kind: "instagram", label: "Instagram", val: business.instagram_url },
    { kind: "youtube", label: "YouTube", val: business.youtube_url },
    { kind: "tiktok", label: "TikTok", val: business.tiktok_url },
    { kind: "facebook", label: "Facebook", val: business.facebook_url },
    { kind: "twitter", label: "X", val: business.twitter_url },
    { kind: "linkedin", label: "LinkedIn", val: business.linkedin_url },
    { kind: "pinterest", label: "Pinterest", val: business.pinterest_url },
    { kind: "spotify", label: "Spotify", val: business.spotify_url },
    { kind: "soundcloud", label: "SoundCloud", val: business.soundcloud_url },
  ];

  const links: { label: string; url: string }[] = [];
  if (business.website) {
    links.push({
      label: business.website.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      url: normalizeUrl(business.website),
    });
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center py-6 px-3 sm:py-10"
      style={{ backgroundColor: "#ECD6B8" }}
    >
      <style>{`
        @keyframes b-rise {
          from { opacity: 0; transform: translateY(34px); }
          to { opacity: 1; transform: none; }
        }
        .b-rise-item {
          opacity: 0;
          animation: b-rise 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes shimmer-loop {
          0% {
            transform: translateX(-150%) skewX(-20deg);
          }
          37.5% {
            transform: translateX(200%) skewX(-20deg);
          }
          100% {
            transform: translateX(200%) skewX(-20deg);
          }
        }
        .shimmer-once-badge {
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }
        .shimmer-once-badge::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.15) 20%,
            rgba(255, 255, 255, 0.5) 50%,
            rgba(255, 255, 255, 0.15) 80%,
            transparent
          );
          transform: translateX(-150%) skewX(-20deg);
          animation: shimmer-loop 4s infinite ease-in-out;
          animation-delay: 0.3s;
          pointer-events: none;
          z-index: 10;
        }
        .shimmer-once-cta {
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }
        .shimmer-once-cta::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.15) 20%,
            rgba(255, 255, 255, 0.5) 50%,
            rgba(255, 255, 255, 0.15) 80%,
            transparent
          );
          transform: translateX(-150%) skewX(-20deg);
          animation: shimmer-loop 4s infinite ease-in-out;
          animation-delay: 0.9s;
          pointer-events: none;
          z-index: 10;
        }
      `}</style>
      <div className="relative w-full max-w-[420px] min-h-[85vh] rounded-[2.5rem] bg-gradient-to-b from-neutral-900 via-neutral-900 to-black text-neutral-100 shadow-2xl ring-1 ring-white/10 overflow-hidden">
        <div className="absolute top-4 right-4 z-10">
          <ShareButton
            variant="dark"
            title={business.name}
            shareUrl={`https://oneworldmorocco.com/b/${business.slug}`}
            previewImage={business.images?.[0] || hamsaBlueAsset.url}
            avatarImage={null}
          />
        </div>

        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

        <div className="relative px-6 pt-12 pb-10 flex flex-col items-center text-center">
          <div 
            className="b-rise-item h-28 w-28 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden mb-4 ring-2 ring-white/20 shadow-xl"
            style={{ animationDelay: "0.1s" }}
          >
            {avatar ? (
              <img src={avatar} alt={business.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-semibold text-neutral-400">
                {(business.name[0] || "?").toUpperCase()}
              </span>
            )}
          </div>

          <h1 
            className="b-rise-item text-2xl font-bold tracking-tight text-white"
            style={{ animationDelay: "0.18s" }}
          >
            {business.name}
          </h1>

          {(business.city || business.country) && (
            <p 
              className="b-rise-item mt-2 inline-flex items-center gap-1 text-sm text-neutral-400"
              style={{ animationDelay: "0.26s" }}
            >
              <MapPin className="h-4 w-4" />
              {[business.city, business.country].filter(Boolean).join(", ")}
            </p>
          )}

          {business.hook_fr && (
            <p 
              className="b-rise-item mt-3 text-[15px] italic text-white/90 font-medium max-w-md"
              style={{ animationDelay: "0.34s" }}
            >
              {business.hook_fr}
            </p>
          )}

          {business.computed_rating != null && business.total_review_count && business.total_review_count > 0 && (
            <div 
              className="b-rise-item shimmer-once-badge relative mt-4 mb-2 flex items-center justify-center gap-1.5 py-1 px-3.5 rounded-full border border-white/20 backdrop-blur-2xl bg-black/40 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.3)]"
              style={{ animationDelay: "0.42s" }}
            >
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/25 via-transparent to-white/5" />
              <span aria-hidden="true" className="pointer-events-none absolute top-0 left-2 right-2 h-1/2 rounded-t-full bg-gradient-to-b from-white/30 to-transparent blur-[1px]" />
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-[#D4AF37] fill-[#D4AF37]" />
                <span className="text-lg font-black text-[#D4AF37] whitespace-nowrap" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {business.computed_rating}<span className="text-xs font-semibold text-white/60">/20</span>
                </span>
              </div>
              <span className="text-[11px] text-white/70 font-medium whitespace-nowrap" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                · {business.total_review_count.toLocaleString("fr-FR")} avis
              </span>
            </div>
          )}

          {business.description && (() => {
            const html = business.description;
            const textLen = stripHtml(html).length;
            const isLong = textLen > 220;
            return (
              <div
                className="b-rise-item mt-3 w-full max-w-md"
                style={{ animationDelay: "0.5s" }}
              >
                <div
                  className={[
                    "rich-desc relative text-[15px] leading-relaxed text-neutral-300 text-left",
                    "[&_h2]:font-bold [&_h2]:text-white [&_h2]:text-[17px] [&_h2]:mt-4 [&_h2]:mb-1.5 [&_h2]:font-[Montserrat]",
                    "[&_h3]:font-semibold [&_h3]:text-white [&_h3]:text-[15px] [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-[Montserrat]",
                    "[&_p]:my-2",
                    "[&_blockquote]:border-l-2 [&_blockquote]:border-[#C04F17] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-neutral-200 [&_blockquote]:my-3",
                    "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5",
                    "[&_a]:text-[#C04F17] [&_a]:underline hover:[&_a]:opacity-80",
                    "[&_strong]:text-white [&_em]:italic",
                    "[&_hr]:border-white/15 [&_hr]:my-3",
                    "overflow-hidden transition-[max-height] duration-500 ease-in-out",
                  ].join(" ")}
                  style={{ maxHeight: descExpanded || !isLong ? "4000px" : "8.5em" }}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
                {isLong && !descExpanded && (
                  <div className="-mt-6 h-6 bg-gradient-to-b from-transparent to-[#1a1a1a] pointer-events-none" />
                )}
                {isLong && (
                  <button
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-2 text-sm font-semibold hover:opacity-80 transition-opacity"
                    style={{ color: "#C04F17" }}
                  >
                    {descExpanded ? "Voir −" : "Voir +"}
                  </button>
                )}
              </div>
            );
          })()}

          {promotions.length > 0 && (
            <div
              className="b-rise-item mt-5 w-full max-w-md flex flex-col gap-3"
              style={{ animationDelay: "0.54s" }}
            >
              <div
                className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#D4AF37] text-left"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                Avantages One World Morocco
              </div>
              {promotions.map((p) => {
                const promoAmount = (() => {
                  if (p.promotion_type === "percentage" && p.promotion_value != null) {
                    return `-${p.promotion_value}%`;
                  }
                  if (p.promotion_type === "fixed" && p.promotion_value != null) {
                    return `-${p.promotion_value} ${p.promotion_currency || "MAD"}`;
                  }
                  if (p.savings_amount != null) {
                    return `-${p.savings_amount} ${p.promotion_currency || "MAD"}`;
                  }
                  return null;
                })();

                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-[#C04F17]/40 bg-white/5 backdrop-blur-sm p-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className="text-[14px] font-bold text-white leading-snug"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        {p.title}
                      </div>
                      {promoAmount && (
                        <div
                          className="shrink-0 text-[22px] font-black text-[#D4AF37] whitespace-nowrap leading-none"
                          style={{ fontFamily: "'Montserrat', sans-serif" }}
                        >
                          {promoAmount}
                        </div>
                      )}
                    </div>
                    {p.promotion_message && (
                      <div
                        className="mt-1.5 text-[13px] leading-relaxed text-neutral-300 [&_p]:m-0"
                        dangerouslySetInnerHTML={{ __html: p.promotion_message }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}




          <div 
            className="b-rise-item mt-6 flex flex-wrap items-center justify-center gap-4"
            style={{ animationDelay: "0.58s" }}
          >
            {socials.map((s) => {
              if (!s.val) return null;
              const href = s.kind === "whatsapp" ? buildWhatsAppUrl(s.val) : normalizeUrl(s.val);
              return (
                <a
                  key={s.kind}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="hover:scale-110 transition-transform"
                >
                  {SOCIAL_ICONS[s.kind]}
                </a>
              );
            })}
          </div>

          <div className="w-full mt-8 space-y-3">
            {links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="b-rise-item block w-full rounded-2xl bg-white/5 hover:bg-white/10 py-4 px-5 text-center font-medium shadow-sm transition-all backdrop-blur-sm border border-white/10 text-neutral-100"
                style={{ animationDelay: `${0.66 + i * 0.08}s` }}
              >
                <span className="inline-flex items-center gap-2">
                  <Globe className="h-4 w-4 text-neutral-400" />
                  {l.label}
                </span>
              </a>
            ))}
            <a
              href={`/fiche/${business.slug}`}
              className="b-rise-item shimmer-once-cta block w-full rounded-2xl bg-primary hover:bg-primary/90 py-4 px-5 text-center font-semibold shadow-lg transition-all text-primary-foreground"
              style={{ animationDelay: `${0.66 + links.length * 0.08}s` }}
            >
              Voir la fiche complète
            </a>

            {(() => {
              const googleReviewHref =
                business.google_review_url ||
                (business.google_place_id
                  ? `https://search.google.com/local/writereview?placeid=${business.google_place_id}`
                  : null);
              const tripHref =
                business.tripadvisor_review_url ||
                tripadvisorReviewUrl(business.tripadvisor_url);
              return (
                <>
                  {googleReviewHref && (
                    <a
                      href={googleReviewHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="b-rise-item flex items-center justify-center gap-2 w-full rounded-2xl bg-white/5 hover:bg-white/10 py-3 px-5 text-center font-medium shadow-sm transition-all backdrop-blur-sm border border-white/10 text-neutral-100"
                      style={{ animationDelay: `${0.66 + (links.length + 1) * 0.08}s` }}
                    >
                      <img src="https://www.google.com/favicon.ico" alt="" className="h-4 w-4" />
                      <span>Laisser un avis sur Google</span>
                      <PenSquare className="h-4 w-4 text-neutral-400" />
                    </a>
                  )}
                  {tripHref && (
                    <a
                      href={tripHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="b-rise-item flex items-center justify-center gap-2 w-full rounded-2xl bg-white/5 hover:bg-white/10 py-3 px-5 text-center font-medium shadow-sm transition-all backdrop-blur-sm border border-white/10 text-neutral-100"
                      style={{ animationDelay: `${0.66 + (links.length + (googleReviewHref ? 2 : 1)) * 0.08}s` }}
                    >
                      <img src="/review-logos/tripadvisor.webp" alt="" className="h-4 w-4 object-contain" />
                      <span>Laisser un avis sur TripAdvisor</span>
                      <PenSquare className="h-4 w-4 text-neutral-400" />
                    </a>
                  )}
                </>
              );
            })()}
          </div>

          <a
            href="/club"
            className="b-rise-item mt-8 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-extrabold shadow-lg transition-all text-neutral-900 border border-neutral-900/10 hover:opacity-90 active:scale-95"
            style={{ 
              backgroundColor: "#ECD6B8",
              animationDelay: `${0.66 + (links.length + 3) * 0.08}s`
            }}
          >
            Un compte One World Morocco ?
          </a>

        </div>
      </div>
    </div>
  );
};

export default PublicBusinessProfile;
