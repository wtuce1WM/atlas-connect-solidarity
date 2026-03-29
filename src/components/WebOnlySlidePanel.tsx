import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getFlipbookEmbedUrl } from "@/lib/flipbookEmbed";
import { createPortal } from "react-dom";
import { ExternalLink, MapPin, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ShoppingBag, Star, Minimize2, X } from "lucide-react";
import DestinationSlidePanel from "@/components/DestinationSlidePanel";
import PoiSlidePanel from "@/components/PoiSlidePanel";
import PoiGoogleMap, { type PoiMapItem } from "@/components/PoiGoogleMap";
import YouTubeShortsCarousel, { type YouTubeVideo } from "@/components/YouTubeShortsCarousel";
import iconePhotoVideo from "@/assets/icone_photo_video.png";
import poiNearbyImg from "@/assets/poi-nearby.webp";
import FullscreenLightbox from "@/components/FullscreenLightbox";
import type { MediaItem as LightboxMediaItem } from "@/components/FullscreenLightbox";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import { whatsappUrl } from "@/lib/phoneUtils";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import ShareButton from "@/components/ShareButton";
import { Skeleton } from "@/components/ui/skeleton";
import BookingOverlay from "@/components/BookingOverlay";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { getLangFlag, getLangAlt } from "@/lib/languageFlags";
import { getVideoEmbed } from "@/lib/videoEmbed";
import ContactFlipCard from "@/components/cards/ContactFlipCard";
import ReviewsFlipCard from "@/components/cards/ReviewsFlipCard";
import type { ReviewText } from "@/components/cards/ReviewsFlipCard";
import ExternalLinksFlipCard from "@/components/cards/ExternalLinksFlipCard";
import type { ExternalLinkItem } from "@/components/cards/ExternalLinksFlipCard";
import SocialLinksCard from "@/components/cards/SocialLinksCard";
import DirectionsOverlay from "@/components/DirectionsOverlay";
import MosaicOverlay from "@/components/MosaicOverlay";
import { useDragToHide } from "@/hooks/useDragToHide";

interface WebOnlySlidePanelProps {
  businessId: string;
  onClose: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

interface WebOnlyBusiness {
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
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  description: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  pinterest_url: string | null;
  vimeo_url: string | null;
  video_1_url: string | null;
  kp_regroupement: string | null;
  kp_regroupement_2: string | null;
  kp_active: boolean;
  youtube_force_external: boolean;
  main_category: string | null;
}

interface KpRelatedBusiness {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  images: string[] | null;
  is_master: boolean;
  computed_rating: number | null;
}
interface Destination {
  id: string;
  name_fr: string;
  name_en: string | null;
  image_url: string | null;
  images: string[] | null;
}
interface PoiBusiness {
  id: string;
  name: string;
  images: string[] | null;
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  neighborhood: string | null;
}

type MediaItem = { kind: "video"; url: string } | { kind: "image"; url: string };

const WebOnlySlidePanel = ({ businessId, onClose }: WebOnlySlidePanelProps) => {
  const { language } = useLanguage();
  const [business, setBusiness] = useState<WebOnlyBusiness | null>(null);
  const [woDescription, setWoDescription] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showDirections, setShowDirections] = useState(false);
  const [showBookingOverlay, setShowBookingOverlay] = useState(false);
  const [bookingOverlayUrl, setBookingOverlayUrl] = useState<string | null>(null);
  const [bookingOverlayTitle, setBookingOverlayTitle] = useState<string | undefined>(undefined);
  const [docOverlay, setDocOverlay] = useState<{ url: string; name: string; type: 'pdf' | 'flipbook'; ts: number } | null>(null);
  const [reviewTexts, setReviewTexts] = useState<ReviewText[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalLinkItem[]>([]);
  const [videoDocUrls, setVideoDocUrls] = useState<string[]>([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showHook, setShowHook] = useState(false);
  const [showMosaic, setShowMosaic] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [poiBusinesses, setPoiBusinesses] = useState<PoiBusiness[]>([]);
  const [kpRelated, setKpRelated] = useState<KpRelatedBusiness[]>([]);
  const [isKp1Only, setIsKp1Only] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [selectedPoiBusinessId, setSelectedPoiBusinessId] = useState<string | null>(null);
  const [showPoiMapOverlay, setShowPoiMapOverlay] = useState(false);
  const poiOpenedFromMapRef = useRef(false);
  const [youtubeVideoCount, setYoutubeVideoCount] = useState<number | null>(null);
  const [activeYoutubeVideo, setActiveYoutubeVideo] = useState<YouTubeVideo | null>(null);
  const [showYoutubeOverlay, setShowYoutubeOverlay] = useState(false);
  const [allYoutubeVideos, setAllYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [youtubeIsPlaying, setYoutubeIsPlaying] = useState(false);

  const {
    cardsHidden, dragOffsetY, isDragging,
    showCards, hideCards, resetDrag,
    onTouchStart, onTouchMove, onTouchEnd, onMouseDownDrag,
  } = useDragToHide();

  // Reset all state when switching business
  useEffect(() => {
    resetDrag();
    setShowDirections(false);
    setCurrentMediaIndex(0);
    setShowBookingOverlay(false);
    setDocOverlay(null);
    setIsLightboxOpen(false);
    setShowMosaic(false);
    setShowHook(false);
    setSelectedDestinationId(null);
    setSelectedPoiBusinessId(null);
    setYoutubeVideoCount(null);
    setActiveYoutubeVideo(null);
    setYoutubeIsPlaying(false);
    setShowYoutubeOverlay(false);
    setShowPoiMapOverlay(false);
  }, [businessId, resetDrag]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeSrcRef = useRef<string>("");

  // Neutralize background media when overlays are open
  useEffect(() => {
    const overlayOpen = !!selectedDestinationId || !!selectedPoiBusinessId || !!docOverlay || showBookingOverlay || showYoutubeOverlay || showMosaic || showPoiMapOverlay;
    if (overlayOpen) {
      if (videoRef.current) { videoRef.current.pause(); videoRef.current.muted = true; }
      if (iframeRef.current) { iframeSrcRef.current = iframeRef.current.src; iframeRef.current.src = ""; }
    } else {
      if (videoRef.current) { videoRef.current.muted = false; videoRef.current.play().catch(() => {}); }
      if (iframeRef.current && iframeSrcRef.current) { iframeRef.current.src = iframeSrcRef.current; }
    }
  }, [selectedDestinationId, selectedPoiBusinessId, docOverlay, showBookingOverlay, showYoutubeOverlay, showMosaic, showPoiMapOverlay]);

  // Fetch all data in parallel
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [bizRes, woRes, destLinksRes, reviewsRes, extLinksRes, videoDocsRes] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, slug, logo_url, logo_bg, images, city, neighborhood, address, latitude, longitude, website, whatsapp, online_shop_url, google_maps_url, phone, skype, email, languages, opening_hours, show_opening_hours, is_open_24h, google_rating, google_review_count, google_reviews_url, tripadvisor_rating, tripadvisor_review_count, tripadvisor_url, tripadvisor_review_url, restaurant_guru_rating, restaurant_guru_review_count, restaurant_guru_url, trustpilot_rating, trustpilot_review_count, trustpilot_url, getyourguide_rating, getyourguide_review_count, getyourguide_url, viator_rating, viator_review_count, viator_url, avis_verifies_rating, avis_verifies_review_count, avis_verifies_url, tourradar_rating, tourradar_review_count, tourradar_url, online_shop_force_external, website_force_external, youtube_force_external, hook_fr, hook_en, hook_ar, description, facebook_url, instagram_url, tiktok_url, youtube_url, twitter_url, linkedin_url, pinterest_url, vimeo_url, video_1_url, kp_regroupement, kp_regroupement_2, kp_active, is_master, main_category")
          .eq("id", businessId)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("business_web_only")
          .select("description")
          .eq("business_id", businessId)
          .maybeSingle(),
        supabase
          .from("business_destinations")
          .select("destination_id")
          .eq("business_id", businessId),
        supabase
          .from("reviews" as any)
          .select("source, author_name, rating, text, language")
          .eq("business_id", businessId)
          .not("text", "is", null)
          .order("rating", { ascending: false })
          .limit(3),
        supabase
          .from("business_documents")
          .select("id, name, url, icon")
          .eq("business_id", businessId)
          .eq("type", "external_link")
          .order("sort_order"),
        supabase
          .from("business_documents")
          .select("url")
          .eq("business_id", businessId)
          .eq("type", "video")
          .order("sort_order"),
      ]);

      setBusiness(bizRes.data as WebOnlyBusiness | null);
      const rawWoDesc = (woRes.data as any)?.description?.replace(/<[^>]*>/g, "").trim();
      setWoDescription(rawWoDesc ? (woRes.data as any).description : (bizRes.data as any)?.description || null);
      setReviewTexts(reviewsRes.data ? (reviewsRes.data as any[]) : []);
      setExternalLinks((extLinksRes.data || []) as ExternalLinkItem[]);
      setVideoDocUrls((videoDocsRes.data || []).map((d: any) => d.url).filter(Boolean));

      // Fetch destination details
      const destIds = (destLinksRes.data || []).map(d => d.destination_id);
      let fetchedDests: Destination[] = [];
      if (destIds.length > 0) {
        const { data: destData } = await supabase
          .from("destinations")
          .select("id, name_fr, name_en, image_url, images")
          .in("id", destIds);
        fetchedDests = ((destData || []) as Destination[]).sort((a, b) => {
          const nameA = (language === "en" && a.name_en ? a.name_en : a.name_fr).toLowerCase();
          const nameB = (language === "en" && b.name_en ? b.name_en : b.name_fr).toLowerCase();
          return nameA.localeCompare(nameB);
        });
      }
      setDestinations(fetchedDests);

      // Fetch POI businesses
      {
        const { data: poiLinks } = await supabase
          .from("business_poi_businesses")
          .select("poi_business_id")
          .eq("business_id", businessId);
        const poiIds = (poiLinks || []).map(p => p.poi_business_id);
        if (poiIds.length > 0) {
          const { data: poiData } = await supabase
            .from("businesses")
            .select("id, name, images, logo_url, latitude, longitude, city, neighborhood")
            .in("id", poiIds)
            .eq("is_active", true);
          setPoiBusinesses((poiData || []) as PoiBusiness[]);
        } else {
          setPoiBusinesses([]);
        }
      }

      // Fetch KP related businesses
      const kp1Val = (bizRes.data as any)?.kp_regroupement?.trim() || "";
      const kp2Val = (bizRes.data as any)?.kp_regroupement_2?.trim() || "";
      const isKpActive = (bizRes.data as any)?.kp_active;
      const isMaster = (bizRes.data as any)?.is_master === true;

      let kpResults: KpRelatedBusiness[] = [];
      if (isKpActive) {
        if (kp1Val) {
          const { data: kp1Data } = await supabase
            .from("businesses")
            .select("id, name, slug, logo_url, images, is_master, computed_rating")
            .eq("kp_regroupement", kp1Val)
            .eq("is_active", true)
            .neq("id", businessId);
          kpResults = (kp1Data || []) as KpRelatedBusiness[];

          if (kp2Val) {
            const existingIds = new Set([businessId, ...kpResults.map(r => r.id)]);
            const { data: kp2Masters } = await supabase
              .from("businesses")
              .select("id, name, slug, logo_url, images, is_master, computed_rating")
              .eq("kp_regroupement_2", kp2Val)
              .eq("is_master", true)
              .eq("is_active", true);
            for (const m of (kp2Masters || []) as KpRelatedBusiness[]) {
              if (!existingIds.has(m.id)) { kpResults.push(m); existingIds.add(m.id); }
            }
          }
        } else if (kp2Val && isMaster) {
          const { data: kp2Data } = await supabase
            .from("businesses")
            .select("id, name, slug, logo_url, images, is_master, computed_rating")
            .eq("kp_regroupement_2", kp2Val)
            .eq("is_active", true)
            .neq("id", businessId);
          kpResults = (kp2Data || []) as KpRelatedBusiness[];
        }
        // Sort: masters first, then by computed_rating descending
        kpResults.sort((a, b) => {
          if (a.is_master !== b.is_master) return a.is_master ? -1 : 1;
          return (b.computed_rating ?? 0) - (a.computed_rating ?? 0);
        });
      }
      setKpRelated(kpResults);
      setIsKp1Only(!!(kp1Val && !kp2Val));

      setIsLoading(false);
    };
    fetchData();
  }, [businessId]);

  const shopUrl = business?.online_shop_url || business?.website || null;
  const legacyVideo = business?.video_1_url;
  const allVideoUrls = [...videoDocUrls];
  if (legacyVideo && !allVideoUrls.includes(legacyVideo)) allVideoUrls.unshift(legacyVideo);
  const videos = allVideoUrls;
  const images = business?.images?.filter(Boolean) || [];
  const languages = business?.languages?.filter(Boolean) || [];

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

  const { avgOn20, totalReviewCount } = useMemo(() => {
    if (!business) return { avgOn20: null, totalReviewCount: 0 };
    const sources = collectRatingSources(business);
    const total = sources.reduce((s, r) => s + r.count, 0);
    const computed = computeWeightedRatingOn20(sources);
    return { avgOn20: computed, totalReviewCount: total };
  }, [business]);

  const hasContactCard = !!(business?.phone || business?.whatsapp || business?.email || business?.website || business?.address);
  const hasReviewsCard = avgOn20 !== null && avgOn20 > 0;

  // Bottom carousel priority: YouTube > KP > Destinations > POI
  const hasYoutubeBottomCarousel = !!(business?.youtube_url && business?.youtube_force_external && youtubeVideoCount !== 0);
  const hasYoutubeReady = !!(youtubeVideoCount && youtubeVideoCount > 0);
  const hasKpCarousel = kpRelated.length > 0;
  const hasDestCarousel = destinations.length > 0;
  const hasPoiCarousel = poiBusinesses.length > 0;

  const activeBottomCarousel: "youtube" | "kp" | "dest" | "poi" | "none" =
    (hasYoutubeBottomCarousel && hasYoutubeReady) ? "youtube" :
    hasYoutubeBottomCarousel ? "youtube" :
    hasKpCarousel ? "kp" :
    hasDestCarousel ? "dest" :
    hasPoiCarousel ? "poi" :
    "none";

  const noBottomCarousel = activeBottomCarousel === "none";

  const destName = useCallback((d: Destination) => language === "en" && d.name_en ? d.name_en : d.name_fr, [language]);

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
    if (!hookText) { setShowHook(false); return; }
    setShowHook(false);
    const interval = setInterval(() => setShowHook((v) => !v), 5000);
    return () => clearInterval(interval);
  }, [hookText, businessId]);

  // Memoize mediaItems
  const mediaItems = useMemo<MediaItem[]>(() => [
    ...videos.map((v) => ({ kind: "video" as const, url: v })),
    ...images.map((i) => ({ kind: "image" as const, url: i })),
  ], [videos, images]);

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

  // Listen for YouTube iframe API "ended" to advance
  useEffect(() => {
    if (!videoInfo || videoInfo.type !== "youtube" || totalMedia <= 1) return;
    const onMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "onStateChange" && data?.info === 0) goMedia(1);
      } catch { /* ignore */ }
    };
    const timer = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", id: 0 }), "*"
      );
    }, 1000);
    window.addEventListener("message", onMessage);
    return () => { window.removeEventListener("message", onMessage); clearTimeout(timer); };
  }, [videoInfo, totalMedia, goMedia]);

  // Lightbox items memoized
  const lightboxItems = useMemo<LightboxMediaItem[]>(() =>
    mediaItems.map((m) =>
      m.kind === "video"
        ? { type: "video" as const, src: m.url, alt: business?.name || "" }
        : { type: "image" as const, src: m.url, alt: business?.name || "" }
    ),
  [mediaItems, business?.name]);

  // Shop CTA computed
  const shopCta = useMemo(() => {
    if (!shopUrl) return null;
    const fullUrl = shopUrl.startsWith("http") ? shopUrl : `https://${shopUrl}`;
    const isShopUrl = !!business?.online_shop_url;
    const forceExternal = isShopUrl ? business?.online_shop_force_external : business?.website_force_external;
    return { fullUrl, forceExternal };
  }, [shopUrl, business?.online_shop_url, business?.online_shop_force_external, business?.website_force_external]);

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

  return (
    <div className="h-full overflow-hidden overscroll-none bg-black">
      {/* Portal media button into left toolbar */}
      {toolbarLeftPortal && images.length >= 5 && createPortal(
        <button
          onClick={() => setShowMosaic((p) => !p)}
          className="h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background shadow-md hover:bg-foreground/90 transition-colors"
          title={showMosaic ? "Fermer la mosaïque" : "Voir tous les médias"}
        >
          {showMosaic ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <img src={iconePhotoVideo} alt="Médias" className="h-5 w-5 invert" />
          )}
        </button>,
        toolbarLeftPortal
      )}
      {/* Portal WhatsApp into center toolbar */}
      {toolbarCenterPortal && createPortal(
        <div className="flex items-center gap-6">
          {business.whatsapp && (
            <a href={whatsappUrl(business.whatsapp)} target="_blank" rel="noopener noreferrer" className="relative flex items-center justify-center hover:opacity-70 transition-opacity" style={{ color: "#25D366" }}>
              <span className="absolute w-10 h-10 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_infinite]" style={{ borderColor: "rgba(37,211,102,0.35)" }} />
              <span className="absolute w-14 h-14 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_0.6s_infinite]" style={{ borderColor: "rgba(37,211,102,0.2)" }} />
              <span className="absolute w-[4.5rem] h-[4.5rem] rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_1.2s_infinite]" style={{ borderColor: "rgba(37,211,102,0.1)" }} />
              <WhatsAppIcon className="h-6 w-6 relative z-10" />
            </a>
          )}
        </div>,
        toolbarCenterPortal
      )}
      {/* Portal Share into right toolbar */}
      {toolbarPortal && createPortal(
        <ShareButton title={business.name} variant="dark" className="shrink-0" />,
        toolbarPortal
      )}

      {/* Full-size media background */}
      <div className="relative w-full h-full">
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
                onPlay={(e) => { e.currentTarget.muted = false; }}
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  setIsFileVideoVertical(v.videoHeight > v.videoWidth);
                }}
              />
            ) : (
              <div className={`w-full h-full overflow-hidden bg-black ${videoInfo.type === "youtube" ? "relative" : ""}`}>
                {videoInfo.type === "youtube" && !isVerticalVideo && (
                  <>
                    <div className="absolute inset-x-0 top-0 h-16 bg-black z-10" />
                    <div className="absolute right-0 bottom-[36px] w-[280px] h-[54px] bg-gradient-to-l from-black via-black to-transparent z-10 pointer-events-none" />
                    <div className="absolute left-0 bottom-[44px] w-[8px] h-[24px] bg-black z-10 pointer-events-none" />
                  </>
                )}
                <iframe
                  ref={iframeRef}
                  key={currentMedia.url}
                  src={videoInfo.embedUrl}
                  className={videoInfo.type === "youtube"
                    ? isVerticalVideo ? "w-full h-full" : "w-full h-[calc(100%+80px)] -mt-16 -mb-[46px]"
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
              <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
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

        {/* Show cards button when hidden */}
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
              onClick={showCards}
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
              : cardsHidden ? 'translateY(100%)' : 'translateY(0)',
            transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(.4,0,.2,1)',
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Topbar: flags — Masquer — rating badge */}
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

              {/* Masquer button */}
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-1.5 text-foreground shadow-lg backdrop-blur-sm cursor-grab active:cursor-grabbing select-none hover:bg-background transition-colors"
                title="Masquer les cartes"
                aria-label="Masquer les cartes"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hideCards(); }
                }}
                onMouseDown={onMouseDownDrag}
              >
                <ChevronDown className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">Masquer</span>
                <span className="hidden md:block h-1.5 w-8 rounded-full bg-foreground/60" />
              </button>

              {/* Mobile-only rating badge */}
              {avgOn20 !== null && avgOn20 > 0 && (
                <div className="md:hidden absolute right-0 z-50 flex flex-col items-center bg-black/40 backdrop-blur-sm rounded-xl py-1.5 px-2.5 animate-slide-in-right">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-gold fill-gold" />
                    <span className="text-base font-bold text-white">{avgOn20}</span>
                    <span className="text-[10px] text-white/60">/20</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Block 1: Logo + name with hook rotation */}
          <div key={businessId} className="w-full shrink-0 rounded-2xl bg-black/40 backdrop-blur-sm px-4 md:px-6 text-white overflow-hidden relative h-[5.5rem] pointer-events-auto mt-3 md:mt-0 animate-slide-in-right">
            {/* Info view */}
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
                <p className="text-sm md:text-lg text-white/90 text-center leading-relaxed md:pr-28" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>{hookText}</p>
              </div>
            )}
            {/* Rating — desktop, absolute right */}
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

          {/* Info Carousel */}
          <div className="shrink-0 w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 overflow-x-auto pr-0 pb-1 scrollbar-hide snap-x snap-mandatory mt-3 pointer-events-auto">
            <div className="flex w-max gap-2 items-start">
              <div className="snap-start shrink-0 w-2 md:w-4" aria-hidden="true" />
              {/* Card 1: Web Only text */}
              {woDescription && (
                <div className={`snap-start shrink-0 w-[20rem] md:w-[30rem] ${noBottomCarousel ? 'h-[21.6em] md:h-[28.8em]' : 'h-[18em] md:h-[24em]'} mb-4 rounded-2xl bg-black/40 backdrop-blur-sm p-4 text-white overflow-y-auto animate-slide-in-left opacity-0 border border-white/10`}
                  style={{ animationFillMode: 'forwards' }}
                >
                  <div
                    className="prose prose-invert prose-sm max-w-none break-words text-sm leading-relaxed font-['Roboto',sans-serif] prose-josefin-headings [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white [&_ul]:list-disc [&_li::marker]:text-[#C04F17] [&_h2]:!font-bold [&_h3]:!font-bold"
                    dangerouslySetInnerHTML={{ __html: woDescription }}
                  />
                </div>
              )}
              {/* Card 2: Contact + Map Flip */}
              {hasContactCard && (
                <ContactFlipCard
                  business={business}
                  language={language}
                  hasOpeningHours={!!(business?.show_opening_hours !== false && (business?.is_open_24h || business?.opening_hours))}
                  tallHeight={noBottomCarousel}
                  animationDelay={woDescription ? "120ms" : "0ms"}
                />
              )}
              {/* Card 3: Reviews Flip */}
              {hasReviewsCard && (
                <ReviewsFlipCard
                  avgOn20={avgOn20!}
                  totalReviewCount={totalReviewCount}
                  platforms={reviewPlatforms}
                  reviewTexts={reviewTexts}
                  language={language}
                  animationDelay={`${(Number(!!woDescription) + Number(hasContactCard)) * 120}ms`}
                />
              )}
              {/* Card 4: External Links */}
              {externalLinks.length > 0 && (
                <ExternalLinksFlipCard
                  links={externalLinks}
                  animationDelay={`${(Number(!!woDescription) + Number(hasContactCard) + Number(hasReviewsCard)) * 120}ms`}
                  onOpenUrl={(url, linkTitle) => {
                    const isPdf = url?.toLowerCase().endsWith('.pdf') || url?.includes('/pdfs/');
                    const isFlipbook = /issuu\.com|calameo\.com/i.test(url || '');
                    if (isPdf || isFlipbook) {
                      setDocOverlay({ url, name: linkTitle || 'Document', type: isPdf ? 'pdf' : 'flipbook', ts: Date.now() });
                    } else {
                      setBookingOverlayUrl(url);
                      setShowBookingOverlay(true);
                      setBookingOverlayTitle(linkTitle);
                    }
                  }}
                />
              )}
              {/* Card 5: Social Links */}
              {business && (
                <SocialLinksCard
                  facebook={business.facebook_url}
                  instagram={business.instagram_url}
                  tiktok={business.tiktok_url}
                  youtube={business.youtube_url}
                  twitter={business.twitter_url}
                  linkedin={business.linkedin_url}
                  pinterest={business.pinterest_url}
                  vimeo={business.vimeo_url}
                  whatsapp={business.whatsapp}
                  animationDelay={`${(Number(!!woDescription) + Number(hasContactCard) + Number(hasReviewsCard) + Number(externalLinks.length > 0)) * 120}ms`}
                />
              )}
              <div className="shrink-0 w-4" aria-hidden="true" />
            </div>
          </div>

          {/* YouTube Shorts strip — only when YouTube wins priority */}
          {activeBottomCarousel === "youtube" && business?.youtube_url && business?.youtube_force_external && youtubeVideoCount !== 0 && (
            <div className="pointer-events-auto -mr-4 md:-mr-6">
              <YouTubeShortsCarousel
                youtubeUrl={business.youtube_url}
                onVideoCount={setYoutubeVideoCount}
                onVideosLoaded={setAllYoutubeVideos}
                onPlayingChange={setYoutubeIsPlaying}
                onSelectVideo={(v) => { setActiveYoutubeVideo(v); if (v) setShowYoutubeOverlay(true); }}
                activeVideoId={activeYoutubeVideo?.videoId ?? null}
                shortsOnly
                hideLabel
              />
            </div>
          )}
          {/* Hidden YouTube count probe */}
          {activeBottomCarousel !== "youtube" && business?.youtube_url && business?.youtube_force_external && youtubeVideoCount === null && (
            <div className="hidden">
              <YouTubeShortsCarousel
                youtubeUrl={business.youtube_url}
                onVideoCount={setYoutubeVideoCount}
                shortsOnly
                hideLabel
              />
            </div>
          )}

          {/* Destinations carousel */}
          {activeBottomCarousel === "dest" && (
            <>
            <div className="flex justify-center mt-6 mb-1.5 pointer-events-auto">
              <h3 className="text-xs font-medium text-white/90 rounded-lg py-1 px-3 bg-black/40 backdrop-blur-sm border border-white/10" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                {`${business.name} vous emmène à :`}
              </h3>
            </div>
            <div className="shrink-0 pointer-events-auto w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
              <div className="flex w-max gap-2 overflow-x-auto pb-1 scrollbar-hide">
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
                <div className="shrink-0 w-6" aria-hidden="true" />
              </div>
            </div>
            </>
          )}

          {/* POI carousel */}
          {activeBottomCarousel === "poi" && (
            <>
            <div className="flex justify-center mt-6 mb-1.5 pointer-events-auto">
              <h3 className="text-xs font-medium text-white/90 rounded-lg py-1 px-3 bg-black/40 backdrop-blur-sm border border-white/10" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                {language === "en" ? "Nearby points of interest" : "Points d'intérêt à proximité"}
              </h3>
            </div>
            <div className="shrink-0 pointer-events-auto w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
              <div className="flex w-max gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <div className="shrink-0 w-2 md:w-4" aria-hidden="true" />
                {poiBusinesses.map((poi, index) => {
                  const poiImg = poi.images?.filter(Boolean)?.[0] || poi.logo_url;
                  return (
                    <div
                      key={poi.id}
                      className="shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 animate-slide-in-left opacity-0 cursor-pointer hover:border-white/30 transition-colors"
                      style={{ animationDelay: `${index * 120}ms`, animationFillMode: 'forwards' }}
                      onClick={() => setSelectedPoiBusinessId(poi.id)}
                    >
                      {poiImg ? (
                        <img src={poiImg} alt={poi.name} className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] object-cover" />
                      ) : (
                        <div className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] bg-white/10 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-white/40" />
                        </div>
                      )}
                      <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
                        {poi.name}
                      </p>
                    </div>
                  );
                })}
                <div className="shrink-0 w-6" aria-hidden="true" />
              </div>
            </div>
            </>
          )}

          {/* KP Related carousel */}
          {activeBottomCarousel === "kp" && (
            <>
            <div className="flex justify-center mt-4 mb-1.5 pointer-events-auto">
              <h3 className="text-xs font-medium text-white/90 rounded-lg py-1 px-3 bg-black/40 backdrop-blur-sm border border-white/10" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                {language === "en" ? "Other establishments" : "Autres établissements"}
              </h3>
            </div>
            <div className="shrink-0 pointer-events-auto w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
              <div className="flex w-max gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <div className="shrink-0 w-2 md:w-4" aria-hidden="true" />
                {kpRelated.map((rel, index) => {
                  const relImg = rel.images?.filter(Boolean)?.[0] || rel.logo_url;
                  return (
                    <div
                      key={rel.id}
                      className="shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 animate-slide-in-left opacity-0 cursor-pointer hover:border-white/30 transition-colors"
                      style={{ animationDelay: `${index * 120}ms`, animationFillMode: 'forwards' }}
                    >
                      {relImg ? (
                        <img src={relImg} alt={rel.name} className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] object-cover" />
                      ) : (
                        <div className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] bg-white/10 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-white/40" />
                        </div>
                      )}
                      <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
                        {rel.is_master && <span className="text-gold mr-1">★</span>}
                        {rel.name}
                      </p>
                    </div>
                  );
                })}
                {isKp1Only && poiBusinesses.length > 0 && business?.latitude && business?.longitude && (
                  <div
                    className="shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 animate-slide-in-left opacity-0 cursor-pointer hover:border-white/30 transition-colors"
                    style={{ animationDelay: `${kpRelated.length * 120}ms`, animationFillMode: 'forwards' }}
                    onClick={() => setShowPoiMapOverlay(true)}
                  >
                    <img src={poiNearbyImg} alt="Points d'intérêt" className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] object-cover" />
                    <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
                      {language === "en" ? "Nearby points of interest" : "Points d'intérêt à proximité"}
                    </p>
                  </div>
                )}
                <div className="shrink-0 w-6" aria-hidden="true" />
              </div>
            </div>
            </>
          )}

          {/* CTAs */}
          {(shopUrl || (business.latitude && business.longitude)) && (
            <div className={`shrink-0 py-2 flex flex-col items-center gap-2 pointer-events-auto ${noBottomCarousel ? 'mt-auto' : ''}`}>
              {shopCta && (
                shopCta.forceExternal ? (
                  <a
                    href={shopCta.fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-[85%] md:w-1/2 py-2 rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal animate-slide-in-right"
                    style={{ fontFamily: "'Josefin Sans', sans-serif" }}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {language === "en" ? "Online Shop" : "Boutique en ligne"}
                    <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
                  </a>
                ) : (
                  <button
                    onClick={() => { setBookingOverlayUrl(null); setBookingOverlayTitle(undefined); setShowBookingOverlay(true); }}
                    className="flex items-center justify-center gap-1.5 w-[85%] md:w-1/2 py-2 rounded-lg font-medium text-xs md:text-sm shadow-lg hover:opacity-90 transition-opacity text-white normal-case tracking-normal animate-slide-in-right"
                    style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: '#25D366' }}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {language === "en" ? "Online Shop" : "Boutique en ligne"}
                  </button>
                )
              )}
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
      {showBookingOverlay && (bookingOverlayUrl || shopUrl) && (() => {
        const overlayUrl = bookingOverlayUrl || shopUrl!;
        const finalUrl = overlayUrl.startsWith("http") ? overlayUrl : `https://${overlayUrl}`;
        return (
          <BookingOverlay
            bookingUrl={finalUrl}
            title={bookingOverlayUrl ? bookingOverlayTitle : undefined}
            onClose={() => { setShowBookingOverlay(false); setBookingOverlayUrl(null); setBookingOverlayTitle(undefined); }}
          />
        );
      })()}

      {/* Document Overlay (PDF / Flipbook) */}
      {docOverlay && (
        <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-fade-in overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDocOverlay(null)}
                className="h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background border-2 border-white/20 shadow-2xl hover:opacity-90 transition-opacity shrink-0"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold truncate">{docOverlay.name}</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center pb-16 bg-background">
            {docOverlay.type === 'flipbook' ? (
              <iframe
                src={getFlipbookEmbedUrl(docOverlay.url)}
                className="h-full w-full border-0"
                allow="clipboard-write; fullscreen"
                title={docOverlay.name}
              />
            ) : (
              <iframe
                key={`${docOverlay.url}-gview-${docOverlay.ts}`}
                src={`https://docs.google.com/gview?url=${encodeURIComponent(docOverlay.url)}&embedded=true`}
                className="h-full w-full border-0"
                title={docOverlay.name}
              />
            )}
          </div>
        </div>
      )}

      {/* Directions Overlay */}
      {showDirections && business && (
        <DirectionsOverlay
          business={business}
          onClose={() => setShowDirections(false)}
        />
      )}

      {/* Destination detail overlay */}
      {selectedDestinationId && (
        <DestinationSlidePanel
          destinationId={selectedDestinationId}
          onClose={() => setSelectedDestinationId(null)}
          slideFrom="bottom"
        />
      )}

      {/* POI business detail overlay */}
      {selectedPoiBusinessId && (
        <PoiSlidePanel
          businessId={selectedPoiBusinessId}
          onClose={() => {
            setSelectedPoiBusinessId(null);
            if (poiOpenedFromMapRef.current) {
              poiOpenedFromMapRef.current = false;
              setShowPoiMapOverlay(true);
            }
          }}
          slideFrom="bottom"
        />
      )}

      {/* POI Google Map overlay */}
      {showPoiMapOverlay && (
        <div className="absolute inset-0 z-[60] bg-background flex flex-col animate-slide-in-right">
          <div className="shrink-0 flex items-center px-4 py-2 border-b bg-background gap-2">
            <button
              onClick={() => setShowPoiMapOverlay(false)}
              className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background border-2 border-background/20 shadow-2xl hover:opacity-90 transition-opacity"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium truncate">
              {language === "en" ? "Nearby points of interest" : "Points d'intérêt à proximité"}
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <PoiGoogleMap
              pois={[
                ...(business?.latitude && business?.longitude ? [{
                  id: `self-${business.id}`,
                  name: business.name,
                  latitude: business.latitude,
                  longitude: business.longitude,
                  images: business.images,
                  city: business.city,
                  neighborhood: business.neighborhood,
                  markerColor: { bg: "#1a1a1a", fg: "#ffffff", border: "#1a1a1a" },
                } as PoiMapItem] : []),
                ...poiBusinesses.map(p => ({
                  id: p.id,
                  name: p.name,
                  latitude: p.latitude,
                  longitude: p.longitude,
                  images: p.images,
                  city: p.city,
                  neighborhood: p.neighborhood,
                } as PoiMapItem)),
              ]}
              selectedPoiId={null}
              onPoiClick={(poiId) => {
                if (poiId.startsWith("self-")) return;
                setShowPoiMapOverlay(false);
                poiOpenedFromMapRef.current = true;
                setSelectedPoiBusinessId(poiId);
              }}
              fitToMarkers
            />
          </div>
        </div>
      )}

      {/* Mosaic overlay */}
      {showMosaic && (
        <MosaicOverlay
          mediaItems={mediaItems}
          onClose={() => setShowMosaic(false)}
          onOpenLightbox={(idx) => { setLightboxIndex(idx); setIsLightboxOpen(true); }}
        />
      )}

      {/* Fullscreen media lightbox */}
      {isLightboxOpen && totalMedia > 0 && (
        <FullscreenLightbox
          items={lightboxItems}
          currentIndex={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </div>
  );
};

export default WebOnlySlidePanel;
