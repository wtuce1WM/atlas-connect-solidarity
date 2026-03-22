import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, MapPin, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Info, CalendarCheck, Star, Phone, Mail, Globe, Clock, MessageCircle } from "lucide-react";
import { formatDayHours as formatDayHoursDisplay } from "@/lib/formatOpeningHours";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import { supabase } from "@/integrations/supabase/client";
import MapBusinessInfoCard from "@/components/MapBusinessInfoCard";
import { useLanguage } from "@/contexts/LanguageContext";
import ShareButton from "@/components/ShareButton";
import { Skeleton } from "@/components/ui/skeleton";
import BookingOverlay from "@/components/BookingOverlay";
import DestinationSlidePanel from "@/components/DestinationSlidePanel";

const WhatsAppIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// Language flag mapping
const LANG_FLAGS: Record<string, string> = {
  français: "🇫🇷", french: "🇫🇷", fr: "🇫🇷",
  anglais: "🇬🇧", english: "🇬🇧", en: "🇬🇧",
  arabe: "🇲🇦", arabic: "🇲🇦", ar: "🇲🇦",
  espagnol: "🇪🇸", spanish: "🇪🇸", es: "🇪🇸",
  allemand: "🇩🇪", german: "🇩🇪", de: "🇩🇪",
  italien: "🇮🇹", italian: "🇮🇹", it: "🇮🇹",
  portugais: "🇵🇹", portuguese: "🇵🇹", pt: "🇵🇹",
  néerlandais: "🇳🇱", dutch: "🇳🇱", nl: "🇳🇱",
  russe: "🇷🇺", russian: "🇷🇺", ru: "🇷🇺",
  chinois: "🇨🇳", chinese: "🇨🇳", zh: "🇨🇳",
  japonais: "🇯🇵", japanese: "🇯🇵", ja: "🇯🇵",
  amazigh: "ⵣ", berbère: "ⵣ", tamazight: "ⵣ",
};

const getLangFlag = (lang: string) => {
  const key = lang.toLowerCase().trim();
  return LANG_FLAGS[key] || "🌐";
};

interface BookOnlineSlidePanelProps {
  businessId: string;
  onClose: () => void;
}

interface BookOnlineBusiness {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  logo_bg: string | null;
  images: string[] | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  whatsapp: string | null;
  online_shop_url: string | null;
  google_maps_url: string | null;
  phone: string | null;
  skype: string | null;
  email: string | null;
  languages: string[] | null;
  opening_hours: unknown;
  show_opening_hours: boolean | null;
  is_open_24h: boolean;
  google_rating: number | null;
  google_review_count: number | null;
  google_reviews_url: string | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  tripadvisor_url: string | null;
  tripadvisor_review_url: string | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
  restaurant_guru_url: string | null;
  trustpilot_rating: number | null;
  trustpilot_review_count: number | null;
  trustpilot_url: string | null;
  getyourguide_rating: number | null;
  getyourguide_review_count: number | null;
  getyourguide_url: string | null;
  viator_rating: number | null;
  viator_review_count: number | null;
  viator_url: string | null;
  avis_verifies_rating: number | null;
  avis_verifies_review_count: number | null;
  avis_verifies_url: string | null;
  tourradar_rating: number | null;
  tourradar_review_count: number | null;
  tourradar_url: string | null;
  online_shop_force_external: boolean;
  website_force_external: boolean;
}

interface WebOnlyData {
  description: string | null;
  videos: string[] | null;
  images: string[] | null;
}

interface Destination {
  id: string;
  name_fr: string;
  name_en: string | null;
  image_url: string | null;
  images: string[] | null;
}

const BookOnlineSlidePanel = ({ businessId, onClose }: BookOnlineSlidePanelProps) => {
  const { language } = useLanguage();
  const [business, setBusiness] = useState<BookOnlineBusiness | null>(null);
  const [webOnlyData, setWebOnlyData] = useState<WebOnlyData | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(true);
  const [showDirections, setShowDirections] = useState(false);
  const [directionsMode, setDirectionsMode] = useState<"walking" | "driving">("walking");
  const [userOrigin, setUserOrigin] = useState<string | null>(null);
  const [showInfoCard, setShowInfoCard] = useState(true);
  const [showBookingOverlay, setShowBookingOverlay] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [reviewsFlipped, setReviewsFlipped] = useState(false);
  const [reviewTexts, setReviewTexts] = useState<{ source: string; author_name: string | null; rating: number | null; text: string | null }[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeSrcRef = useRef<string>("");

  useEffect(() => {
    if (selectedDestinationId) {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.muted = true;
      }
      if (iframeRef.current) {
        iframeSrcRef.current = iframeRef.current.src;
        iframeRef.current.src = "";
      }
    } else {
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.play().catch(() => {});
      }
      if (iframeRef.current && iframeSrcRef.current) {
        iframeRef.current.src = iframeSrcRef.current;
      }
    }
  }, [selectedDestinationId]);

  useEffect(() => {
    if (!showDirections) return;
    setUserOrigin(null);
    setShowInfoCard(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserOrigin(`${pos.coords.latitude},${pos.coords.longitude}`),
        () => {}
      );
    }
  }, [showDirections]);

  useEffect(() => {
    setShowDirections(false);
    setCurrentMediaIndex(0);
    setDescExpanded(true);
    setReviewsFlipped(false);
  }, [businessId]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [bizRes, woRes, destLinksRes] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, slug, logo_url, logo_bg, images, city, neighborhood, address, latitude, longitude, website, whatsapp, online_shop_url, google_maps_url, phone, skype, email, languages, opening_hours, show_opening_hours, is_open_24h, google_rating, google_review_count, google_reviews_url, tripadvisor_rating, tripadvisor_review_count, tripadvisor_url, tripadvisor_review_url, restaurant_guru_rating, restaurant_guru_review_count, restaurant_guru_url, trustpilot_rating, trustpilot_review_count, trustpilot_url, getyourguide_rating, getyourguide_review_count, getyourguide_url, viator_rating, viator_review_count, viator_url, avis_verifies_rating, avis_verifies_review_count, avis_verifies_url, tourradar_rating, tourradar_review_count, tourradar_url, online_shop_force_external, website_force_external")
          .eq("id", businessId)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("business_web_only")
          .select("description, videos, images")
          .eq("business_id", businessId)
          .maybeSingle(),
        supabase
          .from("business_destinations")
          .select("destination_id")
          .eq("business_id", businessId),
      ]);

      setBusiness(bizRes.data as BookOnlineBusiness | null);
      setWebOnlyData(woRes.data as WebOnlyData | null);

      // Fetch destination details
      const destIds = (destLinksRes.data || []).map(d => d.destination_id);
      if (destIds.length > 0) {
        const { data: destData } = await supabase
          .from("destinations")
          .select("id, name_fr, name_en, image_url, images")
          .in("id", destIds);
        const sorted = ((destData || []) as Destination[]).sort((a, b) => {
          const nameA = (language === "en" && a.name_en ? a.name_en : a.name_fr).toLowerCase();
          const nameB = (language === "en" && b.name_en ? b.name_en : b.name_fr).toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setDestinations(sorted);
      } else {
        setDestinations([]);
      }

      // Fetch review texts for flip card
      const langCode = language === "en" ? "en" : language === "ar" ? "ar" : "fr";
      const { data: langReviews } = await supabase
        .from("reviews" as any)
        .select("source, author_name, rating, text")
        .eq("business_id", businessId)
        .eq("language", langCode)
        .not("text", "is", null)
        .order("rating", { ascending: false })
        .limit(3);
      if (langReviews && langReviews.length >= 2) {
        setReviewTexts(langReviews as any[]);
      } else {
        const { data: allReviews } = await supabase
          .from("reviews" as any)
          .select("source, author_name, rating, text")
          .eq("business_id", businessId)
          .not("text", "is", null)
          .order("rating", { ascending: false })
          .limit(3);
        setReviewTexts(allReviews ? (allReviews as any[]) : []);
      }

      setIsLoading(false);
    };
    fetchData();
  }, [businessId]);

  const bookUrl = business?.online_shop_url || business?.website || null;
  const videos = webOnlyData?.videos?.filter(Boolean) || [];
  const woImages = webOnlyData?.images?.filter(Boolean) || [];
  const images = woImages.length > 0 ? woImages : (business?.images?.filter(Boolean) || []);
  const woDescription = webOnlyData?.description || null;
  const hasOpeningHours = business?.show_opening_hours !== false && (business?.is_open_24h || business?.opening_hours);
  const hasExpandableContent = !!(woDescription || hasOpeningHours);
  const languages = business?.languages?.filter(Boolean) || [];

  const { avgOn20, totalReviewCount } = useMemo(() => {
    if (!business) return { avgOn20: null, totalReviewCount: 0 };
    const sources = collectRatingSources(business);
    const total = sources.reduce((s, r) => s + r.count, 0);
    const computed = computeWeightedRatingOn20(sources);
    return { avgOn20: computed, totalReviewCount: total };
  }, [business]);

  type MediaItem = { kind: "video"; url: string } | { kind: "image"; url: string };
  const mediaItems: MediaItem[] = [
    ...videos.map((v) => ({ kind: "video" as const, url: v })),
    ...images.map((i) => ({ kind: "image" as const, url: i })),
  ];
  const totalMedia = mediaItems.length;
  const safeIndex = totalMedia > 0 ? currentMediaIndex % totalMedia : 0;
  const currentMedia = totalMedia > 0 ? mediaItems[safeIndex] : null;

  const goMedia = useCallback((dir: 1 | -1) => {
    if (totalMedia <= 1) return;
    setCurrentMediaIndex((prev) => (prev + dir + totalMedia) % totalMedia);
  }, [totalMedia]);

  const getVideoEmbed = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
    if (ytMatch) {
      return { type: "youtube" as const, embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&rel=0&controls=1&modestbranding=1` };
    }
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return { type: "vimeo" as const, embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1` };
    }
    return { type: "file" as const, embedUrl: url };
  };

  const videoInfo = currentMedia?.kind === "video" ? getVideoEmbed(currentMedia.url) : null;

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto bg-background p-6 space-y-6">
        <Skeleton className="w-full aspect-video rounded-xl" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (!business) return null;

  const toolbarPortal = document.getElementById("slide-panel-toolbar");
  const toolbarCenterPortal = document.getElementById("slide-panel-toolbar-center");

  const destName = (d: Destination) => language === "en" && d.name_en ? d.name_en : d.name_fr;

  return (
    <div className="h-full overflow-hidden overscroll-none bg-black">
      {/* Portal WhatsApp icon into center of fixed bar */}
      {toolbarCenterPortal && createPortal(
        <div className="flex items-center gap-6">
          {business.whatsapp && (
            <a href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="relative flex items-center justify-center hover:opacity-70 transition-opacity" style={{ color: "#25D366" }}>
              <span className="absolute w-10 h-10 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_infinite]" style={{ borderColor: "rgba(37,211,102,0.35)" }} />
              <span className="absolute w-14 h-14 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_0.6s_infinite]" style={{ borderColor: "rgba(37,211,102,0.2)" }} />
              <span className="absolute w-[4.5rem] h-[4.5rem] rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_1.2s_infinite]" style={{ borderColor: "rgba(37,211,102,0.1)" }} />
              <WhatsAppIcon className="h-6 w-6 relative z-10" />
            </a>
          )}
        </div>,
        toolbarCenterPortal
      )}
      {/* Portal Share into right of fixed bar */}
      {toolbarPortal && createPortal(
        <ShareButton title={business.name} variant="dark" className="toolbar-icon shrink-0" />,
        toolbarPortal
      )}

      {/* Full-size video / image background with overlay content */}
      <div className="relative w-full h-full">
        {/* Media background */}
        <div className="absolute inset-0">
          {currentMedia?.kind === "video" && videoInfo && !showDirections ? (
            videoInfo.type === "file" ? (
              <video ref={videoRef} key={currentMedia.url} src={videoInfo.embedUrl} autoPlay loop playsInline controls className="w-full h-full object-contain bg-black" />
            ) : (
              <iframe ref={iframeRef} key={currentMedia.url} src={videoInfo.embedUrl} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen frameBorder="0" style={{ border: 0 }} />
            )
          ) : currentMedia?.kind === "image" ? (
            <img src={currentMedia.url} alt={business.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <CalendarCheck className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
          {currentMedia?.kind !== "video" && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
          )}
        </div>

        {/* Left / Right arrows — desktop */}
        {totalMedia > 1 && (
          <>
            <button onClick={() => goMedia(-1)} className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center text-white hover:bg-black/60 transition-colors" aria-label="Previous">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => goMedia(1)} className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center text-white hover:bg-black/60 transition-colors" aria-label="Next">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Languages + media counter — top left */}

        {/* Overlaid content */}
        <div className={`relative z-10 flex flex-col ${currentMedia?.kind === "video" ? "h-[calc(100%-3.5rem)] pointer-events-none" : "h-full"} p-4 md:p-6`}>
          {/* Mobile-only floating rating badge — top right under toolbar */}
          {avgOn20 !== null && avgOn20 > 0 && (
            <div className="md:hidden absolute top-2 right-4 z-20 flex flex-col items-center bg-black/40 backdrop-blur-sm rounded-xl py-1.5 px-2.5 pointer-events-auto animate-slide-in-right">
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-gold fill-gold" />
                <span className="text-base font-bold text-white">{avgOn20}</span>
                <span className="text-[10px] text-white/60">/20</span>
              </div>
              {totalReviewCount > 0 && (
                <span className="text-[9px] text-white/60">{totalReviewCount.toLocaleString("fr-FR")} avis</span>
              )}
            </div>
          )}
          {/* Language flags + media counter — single row */}
          <div className="relative flex items-center justify-center pb-4 pointer-events-auto">
            {/* Language flags — left */}
            {languages.length > 0 ? (
              <div className="absolute left-0 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full py-1 px-2.5">
                {languages.map((lang, i) => (
                  <span key={i} className="text-lg leading-none" title={lang}>
                    {getLangFlag(lang)}
                  </span>
                ))}
              </div>
            ) : null}
            {/* Media counter + arrows — right/center */}
            {totalMedia > 1 ? (
              <div className="flex items-center gap-2">
                <button onClick={() => goMedia(-1)} className="md:hidden w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors" aria-label="Previous">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-white/80 text-xs font-medium bg-black/30 rounded-full px-3 py-1">
                  {safeIndex + 1} / {totalMedia}
                </span>
                <button onClick={() => goMedia(1)} className="md:hidden w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors" aria-label="Next">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>

          {/* Centered content block — same layout as WebOnlySlidePanel */}
          <div className="flex-1 flex flex-col items-center overflow-hidden min-h-0 gap-3 pointer-events-auto">
            {/* Block 1: Logo + name — always visible */}
            <div className="w-[95%] md:w-[90%] shrink-0 rounded-2xl bg-black/40 backdrop-blur-sm px-4 py-3 md:px-6 md:py-4 text-white overflow-hidden">
              <div className="flex items-center gap-4">
                {business.logo_url && (
                  <div
                    className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg hidden md:block"
                    style={{ backgroundColor: business.logo_bg || "#fff" }}
                  >
                    <img src={business.logo_url} alt="" className="w-full h-full object-contain p-1" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold truncate drop-shadow-lg">{business.name}</h2>
                  {(business.city || business.neighborhood) ? (
                    <p className="text-xs md:text-sm text-white/80 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {[business.city, business.neighborhood].filter(Boolean).join(", ")}
                    </p>
                  ) : business.address ? (
                    <p className="text-xs md:text-sm text-white/80 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {business.address}
                    </p>
                  ) : null}
                </div>
                {avgOn20 !== null && avgOn20 > 0 && (
                  <div className="shrink-0 hidden md:flex flex-col items-center animate-slide-in-right">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-gold fill-gold" />
                      <span className="text-lg font-bold text-white">{avgOn20}</span>
                      <span className="text-xs text-white/60">/20</span>
                    </div>
                    {totalReviewCount > 0 && (
                      <span className="text-[10px] text-white/60">{totalReviewCount.toLocaleString("fr-FR")} avis</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Block 2: Horizontal card carousel */}
            <div className="w-[95%] md:w-[90%] shrink-0">
              <div ref={carouselRef} className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
                {/* Card 1: Texte */}
                {woDescription && (
                  <div className="snap-start shrink-0 w-[85%] md:w-[48%] rounded-2xl bg-black/40 backdrop-blur-sm p-4 text-white max-h-[22em] overflow-y-auto">
                    {/* No title for text card */}
                    <div
                      className="prose prose-invert prose-sm max-w-none break-words text-sm leading-relaxed [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white [&_ul]:list-disc [&_li::marker]:text-[#C04F17]"
                      dangerouslySetInnerHTML={{ __html: woDescription }}
                    />
                  </div>
                )}

                {/* Card 2: Contact */}
                {(business.phone || business.whatsapp || business.email || business.website || business.address) && (
                  <div className="snap-start shrink-0 w-[85%] md:w-[48%] rounded-2xl bg-black/40 backdrop-blur-sm p-4 text-white max-h-[22em] overflow-y-auto">
                    {/* No title for contact card */}
                    <div className="space-y-2.5 text-sm">
                      {business.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-white/60" />
                          <span className="text-white/80">{business.address}</span>
                        </div>
                      )}
                      {business.phone && (
                        <a href={`tel:${business.phone}`} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                          <Phone className="h-4 w-4 shrink-0 text-white/60" />
                          {business.phone}
                        </a>
                      )}
                      {business.whatsapp && (
                        <a href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#25D366] hover:text-[#20bd5a] transition-colors">
                          <WhatsAppIcon className="h-4 w-4 shrink-0" />
                          WhatsApp
                        </a>
                      )}
                      {business.email && (
                        <a href={`mailto:${business.email}`} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                          <Mail className="h-4 w-4 shrink-0 text-white/60" />
                          {business.email}
                        </a>
                      )}
                      {business.website && (
                        <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                          <Globe className="h-4 w-4 shrink-0 text-white/60" />
                          {language === "en" ? "Website" : "Site web"}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {hasOpeningHours && business && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                          <p className="text-xs font-semibold text-gold uppercase tracking-wider mb-1.5">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {language === "en" ? "Hours" : "Horaires"}
                          </p>
                          {business.is_open_24h ? (
                            <p className="text-white/80 text-sm">Ouvert 24h/24</p>
                          ) : business.opening_hours ? (
                            <div className="space-y-0.5">
                              {(() => {
                                const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                                const dayNames: Record<string, string> = { monday: "Lun", tuesday: "Mar", wednesday: "Mer", thursday: "Jeu", friday: "Ven", saturday: "Sam", sunday: "Dim" };
                                const displayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
                                const hours = business.opening_hours as Record<string, any>;
                                const now = new Date();
                                const todayKey = dayOrder[now.getDay()];
                                return displayOrder.map(day => {
                                  const dh = hours[day];
                                  if (!dh) return null;
                                  const isToday = day === todayKey;
                                  return (
                                    <div key={day} className={`flex gap-3 text-xs ${isToday ? 'font-bold' : ''}`}>
                                      <span className={`font-medium ${isToday ? 'text-white' : 'text-white/70'}`}>
                                        {dayNames[day]}{isToday ? ' ●' : ''}
                                      </span>
                                      <span className="text-white/80">
                                        {formatDayHoursDisplay(dh, { language })}
                                      </span>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Card 3: Avis Clients */}
                {(avgOn20 !== null && avgOn20 > 0) && (
                  <div className="snap-start shrink-0 w-[85%] md:w-[48%] rounded-2xl bg-black/40 backdrop-blur-sm p-4 text-white max-h-[22em] overflow-y-auto">
                    <p className="text-[10px] font-semibold text-gold uppercase tracking-wider mb-2">
                      {language === "en" ? "Reviews" : "Avis clients"}
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="h-5 w-5 text-gold fill-gold" />
                      <span className="text-2xl font-bold text-white">{avgOn20}</span>
                      <span className="text-sm text-white/60">/20</span>
                      {totalReviewCount > 0 && (
                        <span className="text-xs text-white/50 ml-1">({totalReviewCount.toLocaleString("fr-FR")} avis)</span>
                      )}
                    </div>
                    {business && (() => {
                      const platforms: { name: string; rating: number | null; count: number | null; url: string | null }[] = [
                        { name: "Google", rating: business.google_rating, count: business.google_review_count, url: business.google_reviews_url || business.google_maps_url },
                        { name: "TripAdvisor", rating: business.tripadvisor_rating, count: business.tripadvisor_review_count, url: business.tripadvisor_url },
                        { name: "Restaurant Guru", rating: business.restaurant_guru_rating, count: business.restaurant_guru_review_count, url: business.restaurant_guru_url },
                        { name: "Trustpilot", rating: business.trustpilot_rating, count: business.trustpilot_review_count, url: business.trustpilot_url },
                        { name: "GetYourGuide", rating: business.getyourguide_rating, count: business.getyourguide_review_count, url: business.getyourguide_url },
                        { name: "Viator", rating: business.viator_rating, count: business.viator_review_count, url: business.viator_url },
                        { name: "Avis Vérifiés", rating: business.avis_verifies_rating, count: business.avis_verifies_review_count, url: business.avis_verifies_url },
                        { name: "TourRadar", rating: business.tourradar_rating, count: business.tourradar_review_count, url: business.tourradar_url },
                      ].filter(p => p.rating && p.count);
                      return (
                        <div className="space-y-2">
                          {platforms.map((p) => (
                            <a
                              key={p.name}
                              href={p.url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center justify-between text-sm border-t border-white/10 pt-2 ${p.url ? 'hover:text-gold transition-colors' : 'pointer-events-none'}`}
                            >
                              <span className="text-white/80 font-medium">{p.name}</span>
                              <span className="flex items-center gap-1.5">
                                <span className="text-gold font-semibold">{p.rating}/5</span>
                                <span className="text-white/50 text-xs">({p.count?.toLocaleString("fr-FR")})</span>
                                {p.url && <ExternalLink className="h-3 w-3 text-white/40" />}
                              </span>
                            </a>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Card 4: Localiser */}
                {business.latitude && business.longitude && (
                  <div className="snap-start shrink-0 w-[85%] md:w-[48%] rounded-2xl bg-black/40 backdrop-blur-sm p-0 text-white max-h-[22em] overflow-hidden">
                    {/* No title for location card */}
                    <div className="relative w-full h-[22em] overflow-hidden rounded-2xl">
                      <iframe
                        src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${business.latitude},${business.longitude}&zoom=15`}
                        className="w-full h-full border-0 pointer-events-none"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Destinations horizontal scroll */}
          {destinations.length > 0 && (
            <div className="shrink-0 mt-3 pointer-events-auto">
              <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
                {destinations.map((dest, index) => {
                  const destImg = dest.images?.filter(Boolean)?.[0] || dest.image_url;
                  return (
                    <div
                      key={dest.id}
                      className="shrink-0 w-36 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 animate-slide-in-left opacity-0 cursor-pointer hover:border-white/30 transition-colors"
                      style={{ animationDelay: `${index * 120}ms`, animationFillMode: 'forwards' }}
                      onClick={() => setSelectedDestinationId(dest.id)}
                    >
                      {destImg ? (
                        <img src={destImg} alt={destName(dest)} className="w-full h-24 object-cover" />
                      ) : (
                        <div className="w-full h-24 bg-white/10 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-white/40" />
                        </div>
                      )}
                      <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
                        {destName(dest)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTAs */}
          {(bookUrl || (business.latitude && business.longitude)) && (
            <div className="shrink-0 py-2 flex flex-col items-center gap-2 pointer-events-auto">
              {bookUrl && (() => {
                const fullUrl = bookUrl.startsWith("http") ? bookUrl : `https://${bookUrl}`;
                const isShopUrl = !!business.online_shop_url;
                const forceExternal = isShopUrl ? business.online_shop_force_external : business.website_force_external;
                
                if (forceExternal) {
                  return (
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 w-[85%] md:w-1/2 py-2 rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal"
                      style={{ fontFamily: "'Josefin Sans', sans-serif" }}
                    >
                      <CalendarCheck className="h-4 w-4" />
                      {language === "en" ? "Book Online" : "Réservez en ligne"}
                      <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
                    </a>
                  );
                }
                return (
                  <button
                    onClick={() => setShowBookingOverlay(true)}
                    className="flex items-center justify-center gap-1.5 w-[85%] md:w-1/2 py-2 rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal"
                    style={{ fontFamily: "'Josefin Sans', sans-serif" }}
                  >
                    <CalendarCheck className="h-4 w-4" />
                    {language === "en" ? "Book Online" : "Réservez en ligne"}
                  </button>
                );
              })()}
              {business.latitude && business.longitude && (
                <button
                  onClick={() => setShowDirections(true)}
                  className="flex items-center justify-center gap-1.5 w-[85%] md:w-1/2 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs md:text-sm shadow-lg hover:bg-primary/90 transition-colors normal-case tracking-normal"
                  style={{ fontFamily: "'Josefin Sans', sans-serif" }}
                >
                  <MapPin className="h-4 w-4" />
                  {language === "en" ? "Directions" : "Itinéraire"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Booking Overlay */}
      {showBookingOverlay && bookUrl && (
        <BookingOverlay
          bookingUrl={bookUrl.startsWith("http") ? bookUrl : `https://${bookUrl}`}
          onClose={() => setShowBookingOverlay(false)}
        />
      )}

      {/* Directions Overlay */}
      {showDirections && business && (() => {
        const dest = business.latitude && business.longitude
          ? `${business.latitude},${business.longitude}`
          : encodeURIComponent(business.address || business.name);
        const destRaw = business.latitude && business.longitude
          ? `${business.latitude},${business.longitude}`
          : business.address || business.name;
        return (
          <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-slide-in-right">
            <div className="shrink-0 flex items-center px-4 py-2 border-b bg-white">
              <button
                onClick={() => setShowDirections(false)}
                className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background border-2 border-background/20 shadow-2xl hover:opacity-90 transition-opacity"
                title="Fermer"
                aria-label="Fermer l'itinéraire"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center bg-muted rounded-full p-0.5">
                  <button
                    onClick={() => setDirectionsMode("walking")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${directionsMode === "walking" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    🚶 À pied
                  </button>
                  <button
                    onClick={() => setDirectionsMode("driving")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${directionsMode === "driving" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    🚗 Voiture
                  </button>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${dest}`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted transition-colors" title="Google Maps">
                  <img src="https://www.gstatic.com/images/branding/product/1x/maps_48dp.png" alt="Google Maps" className="h-6 w-6 object-contain" />
                </a>
                <a href={business.latitude && business.longitude ? `https://waze.com/ul?ll=${business.latitude},${business.longitude}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(destRaw)}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted transition-colors" title="Waze">
                  <img src="https://www.waze.com/favicon.ico" alt="Waze" className="h-6 w-6 object-contain" />
                </a>
                <a href={business.latitude && business.longitude ? `https://maps.apple.com/?daddr=${business.latitude},${business.longitude}&dirflg=d` : `https://maps.apple.com/?daddr=${encodeURIComponent(destRaw)}&dirflg=d`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full hover:bg-muted transition-colors" title="Apple Plans">
                  <img src="https://www.apple.com/favicon.ico" alt="Apple Plans" className="h-7 w-7 object-contain" />
                </a>
              </div>
            </div>
            <div className="flex-1 relative min-h-0">
              <iframe
                src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${userOrigin || "My+location"}&destination=${dest}&mode=${directionsMode}`}
                className="absolute inset-0 w-full h-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Itinéraire vers ${business.name}`}
              />
              {showInfoCard && (
                <MapBusinessInfoCard business={business} onClose={() => setShowInfoCard(false)} hideDirections hideClose />
              )}
              {!showInfoCard && (
                <button
                  onClick={() => setShowInfoCard(true)}
                  className="absolute top-2 left-2 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:opacity-90 transition-opacity"
                  title="Infos établissement"
                >
                  <Info className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Destination detail overlay */}
      {selectedDestinationId && (
        <DestinationSlidePanel
          destinationId={selectedDestinationId}
          onClose={() => setSelectedDestinationId(null)}
          slideFrom="bottom"
        />
      )}
    </div>
  );
};

export default BookOnlineSlidePanel;
