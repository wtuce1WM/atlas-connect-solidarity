import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, MapPin, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Info, CalendarCheck, Star, Minimize2 } from "lucide-react";
import iconePhotoVideo from "@/assets/icone_photo_video.png";
import FullscreenLightbox from "@/components/FullscreenLightbox";
import type { MediaItem as LightboxMediaItem } from "@/components/FullscreenLightbox";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import { supabase } from "@/integrations/supabase/client";
import MapBusinessInfoCard from "@/components/MapBusinessInfoCard";
import { useLanguage } from "@/contexts/LanguageContext";
import ShareButton from "@/components/ShareButton";
import { Skeleton } from "@/components/ui/skeleton";
import BookingOverlay from "@/components/BookingOverlay";
import DestinationSlidePanel from "@/components/DestinationSlidePanel";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { getLangFlag, getLangAlt } from "@/lib/languageFlags";
import { getVideoEmbed } from "@/lib/videoEmbed";
import ContactFlipCard from "@/components/cards/ContactFlipCard";
import ReviewsFlipCard from "@/components/cards/ReviewsFlipCard";
import type { ReviewText } from "@/components/cards/ReviewsFlipCard";
import ExternalLinksFlipCard from "@/components/cards/ExternalLinksFlipCard";
import type { ExternalLinkItem } from "@/components/cards/ExternalLinksFlipCard";

interface BookOnlineSlidePanelProps {
  businessId: string;
  onClose: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
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
  reserve_now_url: string | null;
  reserve_now_force_external: boolean;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  description: string | null;
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

const BookOnlineSlidePanel = ({ businessId, onClose, isExpanded, onToggleExpand }: BookOnlineSlidePanelProps) => {
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
  const [bookingOverlayUrl, setBookingOverlayUrl] = useState<string | null>(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [reviewTexts, setReviewTexts] = useState<ReviewText[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalLinkItem[]>([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [cardsHidden, setCardsHidden] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef<{ y: number; time: number } | null>(null);
  const cardsHiddenRef = useRef(false);
  const [showHook, setShowHook] = useState(false);

  // Reset all state when switching business
  useEffect(() => {
    setCardsHidden(false);
    cardsHiddenRef.current = false;
    setDragOffsetY(0);
    setShowDirections(false);
    setCurrentMediaIndex(0);
    setDescExpanded(true);
    setSelectedDestinationId(null);
    setShowBookingOverlay(false);
    setIsLightboxOpen(false);
    setShowHook(false);
  }, [businessId]);

  const videoRef = useRef<HTMLVideoElement>(null);
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
    const fetchData = async () => {
      setIsLoading(true);
      const [bizRes, woRes, destLinksRes] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, slug, logo_url, logo_bg, images, city, neighborhood, address, latitude, longitude, website, whatsapp, online_shop_url, reserve_now_url, google_maps_url, phone, skype, email, languages, opening_hours, show_opening_hours, is_open_24h, google_rating, google_review_count, google_reviews_url, tripadvisor_rating, tripadvisor_review_count, tripadvisor_url, tripadvisor_review_url, restaurant_guru_rating, restaurant_guru_review_count, restaurant_guru_url, trustpilot_rating, trustpilot_review_count, trustpilot_url, getyourguide_rating, getyourguide_review_count, getyourguide_url, viator_rating, viator_review_count, viator_url, avis_verifies_rating, avis_verifies_review_count, avis_verifies_url, tourradar_rating, tourradar_review_count, tourradar_url, online_shop_force_external, website_force_external, reserve_now_force_external, hook_fr, hook_en, hook_ar, description")
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
      const { data: langReviews } = await supabase
        .from("reviews" as any)
        .select("source, author_name, rating, text, language")
        .eq("business_id", businessId)
        .not("text", "is", null)
        .order("rating", { ascending: false })
        .limit(3);
      setReviewTexts(langReviews ? (langReviews as any[]) : []);

      // Fetch external links
      const { data: extLinks } = await supabase
        .from("business_documents")
        .select("id, name, url, icon")
        .eq("business_id", businessId)
        .eq("type", "external_link")
        .order("sort_order");
      setExternalLinks((extLinks || []) as ExternalLinkItem[]);

      setIsLoading(false);
    };
    fetchData();
  }, [businessId]);

  const bookUrl = business?.reserve_now_url || business?.website || null;
  const videos = webOnlyData?.videos?.filter(Boolean) || [];
  const woImages = webOnlyData?.images?.filter(Boolean) || [];
  const images = woImages.length > 0 ? woImages : (business?.images?.filter(Boolean) || []);
  const rawWoDesc = webOnlyData?.description?.replace(/<[^>]*>/g, "").trim();
  const woDescription = (rawWoDesc ? webOnlyData!.description : business?.description) || null;
  const hasOpeningHours = business?.show_opening_hours !== false && (business?.is_open_24h || business?.opening_hours);

  const reviewPlatforms = useMemo(() => {
    if (!business) return [];
    return [
      { name: "Google", rating: business.google_rating, count: business.google_review_count, url: business.google_reviews_url || business.google_maps_url },
      { name: "TripAdvisor", rating: business.tripadvisor_rating, count: business.tripadvisor_review_count, url: business.tripadvisor_review_url || business.tripadvisor_url },
      { name: "Restaurant Guru", rating: business.restaurant_guru_rating, count: business.restaurant_guru_review_count, url: business.restaurant_guru_url },
      { name: "Trustpilot", rating: business.trustpilot_rating, count: business.trustpilot_review_count, url: business.trustpilot_url },
      { name: "GetYourGuide", rating: business.getyourguide_rating, count: business.getyourguide_review_count, url: business.getyourguide_url },
      { name: "Viator", rating: business.viator_rating, count: business.viator_review_count, url: business.viator_url },
      { name: "Avis Vérifiés", rating: business.avis_verifies_rating, count: business.avis_verifies_review_count, url: business.avis_verifies_url },
      { name: "TourRadar", rating: business.tourradar_rating, count: business.tourradar_review_count, url: business.tourradar_url },
    ];
  }, [business]);
  const languages = business?.languages?.filter(Boolean) || [];

  const { avgOn20, totalReviewCount } = useMemo(() => {
    if (!business) return { avgOn20: null, totalReviewCount: 0 };
    const sources = collectRatingSources(business);
    const total = sources.reduce((s, r) => s + r.count, 0);
    const computed = computeWeightedRatingOn20(sources);
    return { avgOn20: computed, totalReviewCount: total };
  }, [business]);

  const hasContactCard = !!(business?.phone || business?.whatsapp || business?.email || business?.website || business?.address);
  const hasReviewsCard = avgOn20 !== null && avgOn20 > 0;

  // Hook text for current language
  const hookText = useMemo(() => {
    if (!business) return null;
    const raw = language === "ar" && business.hook_ar ? business.hook_ar
      : language === "en" && business.hook_en ? business.hook_en
      : business.hook_fr;
    return raw?.trim() || null;
  }, [business, language]);

  // Alternate between info and hook every 5s
  useEffect(() => {
    if (!hookText) {
      setShowHook(false);
      return;
    }
    setShowHook(false);
    const interval = setInterval(() => setShowHook((v) => !v), 5000);
    return () => clearInterval(interval);
  }, [hookText, businessId]);

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

  const videoInfo = currentMedia?.kind === "video" ? getVideoEmbed(currentMedia.url, window.location.origin) : null;

  // Detect vertical orientation for file videos
  const [isFileVideoVertical, setIsFileVideoVertical] = useState(false);
  const isVerticalVideo = videoInfo ? (videoInfo.type === "file" ? isFileVideoVertical : videoInfo.isVertical) : false;

  // Listen for YouTube iframe API "ended" state to advance to next media
  useEffect(() => {
    if (!videoInfo || videoInfo.type !== "youtube" || totalMedia <= 1) return;
    const onMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "onStateChange" && data?.info === 0) {
          goMedia(1);
        }
      } catch { /* ignore non-JSON messages */ }
    };
    // Tell the YouTube iframe to send us state change events
    const timer = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", id: 0 }),
        "*"
      );
    }, 1000);
    window.addEventListener("message", onMessage);
    return () => { window.removeEventListener("message", onMessage); clearTimeout(timer); };
  }, [videoInfo, totalMedia, goMedia]);

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
  const toolbarLeftPortal = document.getElementById("slide-panel-toolbar-left");

  const destName = (d: Destination) => language === "en" && d.name_en ? d.name_en : d.name_fr;

  return (
    <div className="h-full overflow-hidden overscroll-none bg-black">
      {/* Portal media button into left of fixed bar (next to close) */}
      {toolbarLeftPortal && images.length >= 5 && createPortal(
        <button
          onClick={() => { onToggleExpand?.(); }}
          className="h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background shadow-md hover:bg-foreground/90 transition-colors"
          title="Voir tous les médias"
        >
          {isExpanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <img src={iconePhotoVideo} alt="Médias" className="h-5 w-5 invert" />
          )}
        </button>,
        toolbarLeftPortal
      )}
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
        <ShareButton title={business.name} variant="dark" className="shrink-0" />,
        toolbarPortal
      )}

      {/* Full-size video / image background with overlay content */}
      <div className="relative w-full h-full">
        {/* Media background */}
        <div className="absolute inset-0">
          {currentMedia?.kind === "video" && videoInfo && !showDirections ? (
            videoInfo.type === "file" ? (
              <video
                ref={videoRef}
                key={currentMedia.url}
                src={videoInfo.embedUrl}
                autoPlay muted playsInline controls
                className={`w-full h-full bg-black ${isFileVideoVertical ? "object-cover" : "object-contain"}`}
                onEnded={() => totalMedia > 1 && goMedia(1)}
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  setIsFileVideoVertical(v.videoHeight > v.videoWidth);
                }}
              />
            ) : (
              <div className={`w-full h-full overflow-hidden bg-black ${videoInfo.type === "youtube" ? "relative" : ""}`}>
                {videoInfo.type === "youtube" && !isVerticalVideo && (
                  <>
                    {/* Hide top bar */}
                    <div className="absolute inset-x-0 top-0 h-16 bg-black z-10" />
                    {/* Hide bottom-right: "Plus de vidéos" + YouTube logo */}
                    <div className="absolute right-0 bottom-[36px] w-[280px] h-[54px] bg-gradient-to-l from-black via-black to-transparent z-10 pointer-events-none" />
                    {/* Hide bottom-left link icon without masking volume */}
                    <div className="absolute left-0 bottom-[44px] w-[8px] h-[24px] bg-black z-10 pointer-events-none" />
                  </>
                )}
                <iframe
                  ref={iframeRef}
                  key={currentMedia.url}
                  src={videoInfo.embedUrl}
                  className={videoInfo.type === "youtube"
                    ? isVerticalVideo
                      ? "w-full h-full"
                      : "w-full h-[calc(100%+80px)] -mt-16 -mb-[46px]"
                    : "w-full h-full pointer-events-none"}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  frameBorder="0"
                  style={{ border: 0 }}
                />
              </div>
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
        {totalMedia > 1 && cardsHidden && (
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

        {cardsHidden && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-3">
            {totalMedia > 1 && (
              <button onClick={() => goMedia(-1)} className="md:hidden w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors" aria-label="Previous">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-1.5 text-foreground shadow-lg backdrop-blur-sm hover:bg-background transition-colors"
              title="Afficher les cartes"
              aria-label="Afficher les cartes"
              onClick={() => {
                cardsHiddenRef.current = false;
                setCardsHidden(false);
                setDragOffsetY(0);
              }}
            >
              <ChevronUp className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">Afficher</span>
              <span className="hidden md:block h-1.5 w-8 rounded-full bg-foreground/60" />
            </button>
            {totalMedia > 1 && (
              <button onClick={() => goMedia(1)} className="md:hidden w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors" aria-label="Next">
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Overlaid content — swipeable */}
        <div
          className={`relative z-10 flex flex-col ${currentMedia?.kind === "video" ? "h-[calc(100%-3.5rem)] pointer-events-none" : "h-full"} p-4 pt-14 md:p-6 md:pt-16 lg:pt-6 ${cardsHidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          style={{
            transform: isDragging
              ? `translateY(${dragOffsetY}px)`
              : cardsHidden
                ? 'translateY(100%)'
                : 'translateY(0)',
            transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(.4,0,.2,1)',
          }}
          onTouchStart={(e) => {
            touchStartRef.current = { y: e.touches[0].clientY, time: Date.now() };
            setIsDragging(true);
          }}
          onTouchMove={(e) => {
            if (!touchStartRef.current) return;
            const dy = e.touches[0].clientY - touchStartRef.current.y;
            setDragOffsetY(cardsHiddenRef.current ? Math.min(0, dy) : Math.max(0, dy));
          }}
          onTouchEnd={() => {
            setIsDragging(false);
            setDragOffsetY((prev) => {
              const threshold = 60;
              const hidden = cardsHiddenRef.current;
              if (hidden && prev < -threshold) {
                cardsHiddenRef.current = false;
                setCardsHidden(false);
              } else if (!hidden && prev > threshold) {
                cardsHiddenRef.current = true;
                setCardsHidden(true);
              }
              return 0;
            });
            touchStartRef.current = null;
          }}
        >
          {/* Single row: flags (left) — Masquer button (center) — media counter (right) */}
          {!cardsHidden && (
            <div key={businessId + '-topbar'} className="relative z-40 overflow-visible flex items-center justify-center pb-3 pointer-events-auto animate-[slide-in-top_0.35s_ease-out_both]">
              {/* Language flags — absolute left */}
              {languages.length > 0 && (
                 <div className={`absolute left-0 z-50 flex items-center gap-0.5 md:gap-1.5 bg-black/40 backdrop-blur-sm rounded-xl py-1.5 px-2 md:px-2.5 md:rounded-full md:py-1 md:flex-wrap md:justify-center md:overflow-visible ${languages.length > 5 ? 'max-w-[7rem] overflow-x-auto' : ''} ${languages.length > 4 ? 'md:max-w-none md:overflow-visible' : ''}`} style={languages.length > 5 ? { scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties : undefined}>
                  {languages.map((lang, i) => {
                    const langAlt = getLangAlt(lang);
                    return (
                      <span
                        key={i}
                        className="group relative inline-flex items-center justify-center text-base md:text-lg leading-none cursor-help shrink-0"
                        title={langAlt}
                        aria-label={langAlt}
                        tabIndex={0}
                      >
                        {getLangFlag(lang)}
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 md:block md:text-xs"
                        >
                          {langAlt}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Masquer button — true center */}
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-1.5 text-foreground shadow-lg backdrop-blur-sm cursor-grab active:cursor-grabbing select-none hover:bg-background transition-colors"
                title="Masquer les cartes"
                aria-label="Masquer les cartes"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    cardsHiddenRef.current = true;
                    setCardsHidden(true);
                    setDragOffsetY(0);
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  touchStartRef.current = { y: e.clientY, time: Date.now() };
                  setIsDragging(true);
                  let moved = false;
                  const onMove = (ev: MouseEvent) => {
                    if (!touchStartRef.current) return;
                    moved = true;
                    const dy = ev.clientY - touchStartRef.current.y;
                    setDragOffsetY(cardsHiddenRef.current ? Math.min(0, dy) : Math.max(0, dy));
                  };
                  const onUp = () => {
                    setIsDragging(false);
                    if (!moved) {
                      cardsHiddenRef.current = true;
                      setCardsHidden(true);
                      setDragOffsetY(0);
                    } else {
                      setDragOffsetY((prev) => {
                        const threshold = 60;
                        const hidden = cardsHiddenRef.current;
                        if (hidden && prev < -threshold) {
                          cardsHiddenRef.current = false;
                          setCardsHidden(false);
                        } else if (!hidden && prev > threshold) {
                          cardsHiddenRef.current = true;
                          setCardsHidden(true);
                        }
                        return 0;
                      });
                    }
                    touchStartRef.current = null;
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                  };
                  window.addEventListener('mousemove', onMove);
                  window.addEventListener('mouseup', onUp);
                }}
              >
                <ChevronDown className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">Masquer</span>
                <span className="hidden md:block h-1.5 w-8 rounded-full bg-foreground/60" />
              </button>

            </div>
          )}

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

          {/* Block 1: Logo + name — always visible */}
          <div key={businessId} className="w-full shrink-0 rounded-2xl bg-black/40 backdrop-blur-sm px-4 md:px-6 text-white overflow-hidden relative h-[5.5rem] pointer-events-auto mt-3 md:mt-0 animate-slide-in-right">
            {/* Info view: Logo + name + city */}
            <div
              className="absolute inset-0 flex items-center gap-4 px-4 md:px-6 transition-all duration-500 ease-in-out"
              style={{
                opacity: showHook && hookText ? 0 : 1,
                transform: showHook && hookText ? 'translateY(-8px)' : 'translateY(0)',
                pointerEvents: showHook && hookText ? 'none' : 'auto',
              }}
            >
              {business.logo_url && (
                <div
                  className={`shrink-0 w-20 h-20 overflow-hidden hidden md:block ${business.logo_bg === 'transparent' ? '' : 'rounded-xl border-2 border-white/20 shadow-lg'}`}
                  style={{ backgroundColor: business.logo_bg === 'transparent' ? 'transparent' : (business.logo_bg || '#fff') }}
                >
                  <img src={business.logo_url} alt="" className={`w-full h-full object-contain ${business.logo_bg === 'transparent' ? '' : 'p-1'}`} />
                </div>
              )}
              <div className="min-w-0 flex-1 text-center md:text-left">
                <h2 className="text-xl font-bold truncate uppercase" style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '0.12em', WebkitTextStroke: '0.8px currentColor', textShadow: '0 0 0 currentColor' }}>{business.name}</h2>
                {(business.city || business.neighborhood) ? (
                  <p className="text-xs md:text-sm text-white/80 flex items-center gap-1 mt-0.5 justify-center md:justify-start">
                    <MapPin className="h-3.5 w-3.5" />
                    {[business.city, business.neighborhood].filter(Boolean).join(", ")}
                  </p>
                ) : business.address ? (
                  <p className="text-xs md:text-sm text-white/80 flex items-center gap-1 mt-0.5 justify-center md:justify-start">
                    <MapPin className="h-3.5 w-3.5" />
                    {business.address}
                  </p>
                ) : null}
              </div>
            </div>
            {/* Hook view */}
            {hookText && (
              <div
                className="absolute inset-0 flex items-center justify-center px-6 transition-all duration-500 ease-in-out"
                style={{
                  opacity: showHook ? 1 : 0,
                  transform: showHook ? 'translateY(0)' : 'translateY(8px)',
                  pointerEvents: showHook ? 'auto' : 'none',
                }}
              >
                <p className="text-base md:text-lg text-white/90 italic text-center leading-relaxed md:pr-28" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>{hookText}</p>
              </div>
            )}
            {/* Rating — always visible, absolute right */}
            {avgOn20 !== null && avgOn20 > 0 && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 shrink-0 hidden md:flex flex-col items-center ml-4 pl-4 border-l border-white/20">
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

          {/* Info Carousel — above destinations */}
          <div className="shrink-0 w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 overflow-x-auto pr-0 pb-1 scrollbar-hide snap-x snap-mandatory mt-3 pointer-events-auto">
            <div className="flex w-max gap-2">
              {/* Spacer to preserve left margin after snap */}
              <div className="snap-start shrink-0 w-2 md:w-4" aria-hidden="true" />
              {/* Card 1: Texte Web only */}
              {woDescription && (
                <div className={`snap-start shrink-0 w-[20rem] md:w-[30rem] ${destinations.length === 0 ? 'h-[21.6em] md:h-[28.8em]' : 'h-[18em] md:h-[24em]'} mb-4 rounded-2xl bg-black/40 backdrop-blur-sm p-4 text-white overflow-y-auto animate-slide-in-left opacity-0 border border-white/10`}
                    style={{ animationFillMode: 'forwards' }}
                  >
                    <div
                      className="prose prose-invert prose-sm max-w-none break-words text-sm leading-relaxed font-['Roboto',sans-serif] prose-josefin-headings [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white [&_ul]:list-disc [&_li::marker]:text-[#C04F17]"
                      dangerouslySetInnerHTML={{ __html: woDescription }}
                    />
                    
                  </div>
                )}
                {/* Card 2: Contact with Flip to Google Map */}
                {hasContactCard && business && (
                  <ContactFlipCard
                    business={business}
                    language={language}
                    hasOpeningHours={!!hasOpeningHours}
                    animationDelay={woDescription ? "120ms" : "0ms"}
                    tallHeight={destinations.length === 0}
                  />
                )}
                {/* Card 3: Avis Clients with Flip to translated reviews */}
                {hasReviewsCard && business && (
                  <ReviewsFlipCard
                    avgOn20={avgOn20!}
                    totalReviewCount={totalReviewCount}
                    platforms={reviewPlatforms}
                    reviewTexts={reviewTexts}
                    language={language}
                    animationDelay={`${(Number(!!woDescription) + Number(hasContactCard)) * 120}ms`}
                  />
                )}
                {/* Card 4: Liens Externes with Flip */}
                {externalLinks.length > 0 && (
                  <ExternalLinksFlipCard
                    links={externalLinks}
                    animationDelay={`${(Number(!!woDescription) + Number(hasContactCard) + Number(hasReviewsCard)) * 120}ms`}
                    onOpenUrl={(url) => {
                      setBookingOverlayUrl(url);
                      setShowBookingOverlay(true);
                    }}
                  />
                )}
                <div className="shrink-0 w-4" aria-hidden="true" />
            </div>
          </div>

          {/* Destinations horizontal scroll */}
          {destinations.length > 0 && (
            <>
            <div className="flex justify-center mt-6 mb-1.5 pointer-events-auto">
              <h3 className="text-xs font-medium text-white/90 rounded-lg py-1 px-3 bg-black/40 backdrop-blur-sm border border-white/10" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                {business.name} vous emmène à :
              </h3>
            </div>
            <div className="shrink-0 pointer-events-auto w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
              <div className="flex w-max gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {/* Spacer gauche */}
                <div className="shrink-0 w-2 md:w-4" aria-hidden="true" />
                {destinations.map((dest, index) => {
                  const destImg = dest.images?.filter(Boolean)?.[0] || dest.image_url;
                  return (
                    <div
                      key={dest.id}
                      className="shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 animate-slide-in-left opacity-0 cursor-pointer hover:border-white/30 transition-colors"
                      style={{ animationDelay: `${index * 120}ms`, animationFillMode: 'forwards' }}
                      onClick={() => setSelectedDestinationId(dest.id)}
                    >
                      {destImg ? (
                        <img src={destImg} alt={destName(dest)} className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] object-cover" />
                      ) : (
                        <div className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] bg-white/10 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-white/40" />
                        </div>
                      )}
                      <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
                        {destName(dest)}
                      </p>
                    </div>
                  );
                })}
                {/* Spacer droit */}
                <div className="shrink-0 w-6" aria-hidden="true" />
              </div>
            </div>
            </>
          )}

          {/* CTAs */}
          {(bookUrl || (business.latitude && business.longitude)) && (
            <div className={`shrink-0 py-2 flex flex-col items-center gap-2 pointer-events-auto ${destinations.length === 0 ? 'mt-auto' : ''}`}>
              {bookUrl && (() => {
                const fullUrl = bookUrl.startsWith("http") ? bookUrl : `https://${bookUrl}`;
                const isReserveUrl = !!business.reserve_now_url;
                const forceExternal = isReserveUrl ? business.reserve_now_force_external : business.website_force_external;
                
                if (forceExternal) {
                  return (
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 w-[85%] md:w-1/2 py-2 rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal animate-slide-in-right"
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
                    className="flex items-center justify-center gap-1.5 w-[85%] md:w-1/2 py-2 rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal animate-slide-in-right"
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
                  className="flex items-center justify-center gap-1.5 w-[85%] md:w-1/2 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs md:text-sm shadow-lg hover:bg-primary/90 transition-colors normal-case tracking-normal animate-slide-in-left"
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
      {showBookingOverlay && (bookingOverlayUrl || bookUrl) && (() => {
        const overlayUrl = bookingOverlayUrl || bookUrl!;
        const finalUrl = overlayUrl.startsWith("http") ? overlayUrl : `https://${overlayUrl}`;
        return (
          <BookingOverlay
            bookingUrl={finalUrl}
            onClose={() => { setShowBookingOverlay(false); setBookingOverlayUrl(null); }}
          />
        );
      })()}

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
      {/* Fullscreen media lightbox */}
      {isLightboxOpen && totalMedia > 0 && (() => {
        const lbItems: LightboxMediaItem[] = mediaItems.map((m) =>
          m.kind === "video"
            ? { type: "video" as const, src: m.url, alt: business?.name || "" }
            : { type: "image" as const, src: m.url, alt: business?.name || "" }
        );
        return (
          <FullscreenLightbox
            items={lbItems}
            currentIndex={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setIsLightboxOpen(false)}
          />
        );
      })()}
    </div>
  );
};

export default BookOnlineSlidePanel;
