import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, MapPin, Phone, Mail, Globe, Star, BadgeCheck, ChevronLeft, ChevronRight, Clock, Loader2, ExternalLink, CookingPot, Volume2, VolumeX, Maximize, Play, Pause, Headphones, Mic, Maximize2, Minimize2, Navigation, Box } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link, useNavigate } from "react-router-dom";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import { formatDayHours as formatDayHoursDisplay, isCurrentlyOpen as isCurrentlyOpenCheck } from "@/lib/formatOpeningHours";
import logoGold from "@/assets/logoGOLDsimple.webp";
import restaurantGuruLogo from "@/assets/restaurant-guru-logo.webp";
import tripadvisorLogo from "@/assets/tripadvisor-logo.png";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import ShareButton from "@/components/ShareButton";
import BookmarkButton from "@/components/BookmarkButton";
import SimilarBusinesses from "@/components/SimilarBusinesses";
import NearbyBusinesses from "@/components/NearbyBusinesses";
import { Separator } from "@/components/ui/separator";
import { FacebookIcon, InstagramIcon, LinkedInIcon, YouTubeIcon, TikTokIcon, TwitterIcon, PinterestIcon, VimeoIcon } from "@/components/staff/SocialMediaIcons";


interface BusinessSlidePanelProps {
  businessId: string;
  onClose: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

interface FullBusiness {
  id: string;
  name: string;
  description: string | null;
  city: string;
  region: string;
  address: string | null;
  neighborhood: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  whatsapp: string | null;
  wtuce_status: string | null;
  account_type: string | null;
  logo_url: string | null;
  logo_bg: string | null;
  images: string[] | null;
  categories: string[] | null;
  services: string[] | null;
  main_category: string | null;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  rating: number | null;
  google_rating: number | null;
  google_review_count: number | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
  google_maps_url: string | null;
  google_reviews_url: string | null;
  tripadvisor_url: string | null;
  tripadvisor_review_url: string | null;
  restaurant_guru_url: string | null;
  booking_url: string | null;
  reserve_now_url: string | null;
  opening_hours: any;
  is_open_24h: boolean | null;
  show_opening_hours: boolean | null;
  gamme_id: string | null;
  latitude: number | null;
  longitude: number | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  twitter_url: string | null;
  pinterest_url: string | null;
  vimeo_url: string | null;
  skype: string | null;
  airbnb_url: string | null;
  hotels_com_url: string | null;
  trivago_url: string | null;
  glovo_url: string | null;
  getyourguide_url: string | null;
  viator_url: string | null;
  other_booking_name: string | null;
  other_booking_url: string | null;
  menu_url: string | null;
  video_1_url: string | null;
  default_service: string | null;
  ai_review_summary: any;
  matterport_url: string | null;
}

interface Gamme {
  id: string;
  name_fr: string;
  color_hex: string | null;
  text_color_hex: string | null;
}

const WhatsAppIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const SkypeIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#00AFF0">
    <path d="M12.069 18.874c-4.023 0-5.82-1.979-5.82-3.464 0-.765.561-1.296 1.333-1.296 1.723 0 1.273 2.477 4.487 2.477 1.641 0 2.55-.895 2.55-1.811 0-.551-.269-1.16-1.354-1.429l-3.576-.895c-2.88-.724-3.403-2.286-3.403-3.751 0-3.047 2.861-4.191 5.549-4.191 2.471 0 5.393 1.373 5.393 3.199 0 .784-.688 1.24-1.453 1.24-1.469 0-1.198-2.037-4.164-2.037-1.469 0-2.292.664-2.292 1.617s1.153 1.258 2.157 1.487l2.637.587c2.891.649 3.624 2.346 3.624 3.944 0 2.476-1.902 4.324-5.722 4.324m11.084-4.882a7.508 7.508 0 01.12 1.357c0 4.456-4.214 8.07-9.413 8.07a9.643 9.643 0 01-2.987-.463 5.56 5.56 0 01-2.559.631c-3.024 0-5.478-2.455-5.478-5.478 0-.957.245-1.878.681-2.683a8.4 8.4 0 01-.152-1.603c0-4.456 4.214-8.07 9.413-8.07.967 0 1.914.122 2.816.353A5.478 5.478 0 0120.593 5c3.024 0 5.478 2.455 5.478 5.478a5.48 5.48 0 01-.918 3.514"/>
  </svg>
);

const BusinessSlidePanel = ({ businessId: externalBusinessId, onClose, isExpanded, onToggleExpand }: BusinessSlidePanelProps) => {
  const [internalBusinessId, setInternalBusinessId] = useState(externalBusinessId);
  const businessId = internalBusinessId;

  // Sync when parent changes the business
  useEffect(() => {
    setInternalBusinessId(externalBusinessId);
  }, [externalBusinessId]);

  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const voiceLoopRef = useRef(false);

  const { status: voiceStatus, toggleRecording } = useVoiceSearch({
    onTranscript: (keywords, spoken) => {
      const params = new URLSearchParams({ q: keywords, spoken });
      navigate(`/search?${params.toString()}`);
    },
    onError: (message) => {
      toast({ variant: "destructive", title: "Erreur", description: message });
    },
  });

  const { speak: ttsSpeak, stop: ttsStop, status: ttsStatus } = useTextToSpeech({
    onEnd: () => {
      if (voiceLoopRef.current) {
        voiceLoopRef.current = false;
        setTimeout(() => toggleRecording(), 400);
      }
    },
  });
  const [business, setBusiness] = useState<FullBusiness | null>(null);
  const [gamme, setGamme] = useState<Gamme | null>(null);
  const [reviewTexts, setReviewTexts] = useState<{ source: string; author_name: string | null; rating: number | null; text: string | null; relative_time: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showClubCard, setShowClubCard] = useState(false);
  // isMatterportOpen removed — Matterport is now part of the unified lightbox
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mediaEndSentinelRef = useRef<HTMLDivElement>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const contactSectionRef = useRef<HTMLDivElement>(null);
  const reviewsSectionRef = useRef<HTMLDivElement>(null);
  const servicesSectionRef = useRef<HTMLDivElement>(null);
  const similarSectionRef = useRef<HTMLDivElement>(null);
  const nearbySectionRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const tabsSentinelRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<string>("apercu");
  const [showStickyTabs, setShowStickyTabs] = useState(false);
  const [similarCount, setSimilarCount] = useState<number | null>(null);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const isScrollingToTabRef = useRef(false);
  const tabScrollUnlockTimeoutRef = useRef<number | null>(null);

  const handleFullscreen = useCallback(() => {
    // For native video, use the video element's fullscreen
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if ((videoRef.current as any).webkitEnterFullscreen) {
        (videoRef.current as any).webkitEnterFullscreen();
      }
      return;
    }
    // For iframes (YouTube/Vimeo), fullscreen the container
    if (mediaContainerRef.current) {
      if (mediaContainerRef.current.requestFullscreen) {
        mediaContainerRef.current.requestFullscreen();
      } else if ((mediaContainerRef.current as any).webkitRequestFullscreen) {
        (mediaContainerRef.current as any).webkitRequestFullscreen();
      }
    }
  }, []);

  // Sticky header: show when scrolled past media
  useEffect(() => {
    const sentinel = mediaEndSentinelRef.current;
    const root = scrollContainerRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyHeader(!entry.isIntersecting),
      { root, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading, business, isExpanded]);

  // Sticky tabs: show when inline tabs scroll out of view
  useEffect(() => {
    const sentinel = tabsSentinelRef.current;
    const root = scrollContainerRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyTabs(!entry.isIntersecting);
      },
      { root, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading, business, isExpanded]);

  // Auto-update active tab based on scroll position (IntersectionObserver)
  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root || isLoading || !business) return;

    const sectionMap: { id: string; ref: React.RefObject<HTMLDivElement | null> }[] = [
      { id: "acote", ref: nearbySectionRef },
      { id: "similaires", ref: similarSectionRef },
      { id: "services", ref: servicesSectionRef },
      { id: "localiser", ref: mapSectionRef },
      { id: "avis", ref: reviewsSectionRef },
      { id: "contact", ref: contactSectionRef },
      { id: "apercu", ref: descriptionRef },
    ];

    const visibleSections = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingToTabRef.current) return;
        entries.forEach((entry) => {
          const sectionId = (entry.target as HTMLElement).dataset.sectionId;
          if (!sectionId) return;
          if (entry.isIntersecting) {
            visibleSections.add(sectionId);
          } else {
            visibleSections.delete(sectionId);
          }
        });

        // Pick the lowest section (highest priority = furthest down the page)
        for (const section of sectionMap) {
          if (visibleSections.has(section.id)) {
            setActiveTab(section.id);
            return;
          }
        }
      },
      { root, threshold: 0, rootMargin: "-120px 0px -60% 0px" }
    );

    sectionMap.forEach(({ id, ref }) => {
      if (ref.current) {
        ref.current.dataset.sectionId = id;
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, [isLoading, business]);

  const navigateToTab = useCallback((tabId: string) => {
    setActiveTab(tabId);
    isScrollingToTabRef.current = true;
    // Let the sticky tabs observer handle visibility naturally (no forcing)

    if (tabScrollUnlockTimeoutRef.current) {
      window.clearTimeout(tabScrollUnlockTimeoutRef.current);
    }

    const root = scrollContainerRef.current;
    const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
      contact: contactSectionRef,
      avis: reviewsSectionRef,
      localiser: mapSectionRef,
      services: servicesSectionRef,
      similaires: similarSectionRef,
      acote: nearbySectionRef,
      apercu: descriptionRef,
    };

    const target = refMap[tabId]?.current;
    if (!root || !target) {
      tabScrollUnlockTimeoutRef.current = window.setTimeout(() => {
        isScrollingToTabRef.current = false;
      }, 550);
      return;
    }

    const rootRect = root.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const stickyOffset = 92;
    const nextTop = root.scrollTop + (targetRect.top - rootRect.top) - stickyOffset;

    root.scrollTo({
      top: Math.max(0, nextTop),
      behavior: "smooth",
    });

    tabScrollUnlockTimeoutRef.current = window.setTimeout(() => {
      isScrollingToTabRef.current = false;
    }, 550);
  }, []);

  useEffect(() => {
    return () => {
      if (tabScrollUnlockTimeoutRef.current) {
        window.clearTimeout(tabScrollUnlockTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      setCurrentImageIndex(0);
      setVideoError(false);
      setActiveTab("apercu");
      setIsDescriptionExpanded(false);
      setSimilarCount(null);
      setNearbyCount(null);

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        setBusiness(null);
        setIsLoading(false);
        return;
      }

      setBusiness(data as any);

      // Fetch review texts – prefer reviews in the current UI language
      const langCode = language === "en" ? "en" : language === "ar" ? "ar" : "fr";
      const { data: langReviews } = await supabase
        .from("reviews" as any)
        .select("source, author_name, rating, text, relative_time, language")
        .eq("business_id", businessId)
        .eq("language", langCode)
        .not("text", "is", null)
        .order("rating", { ascending: false })
        .limit(5);
      if (langReviews && langReviews.length >= 2) {
        setReviewTexts(langReviews as any[]);
      } else {
        // Fallback: fetch best reviews regardless of language
        const { data: allReviews } = await supabase
          .from("reviews" as any)
          .select("source, author_name, rating, text, relative_time, language")
          .eq("business_id", businessId)
          .not("text", "is", null)
          .order("rating", { ascending: false })
          .limit(5);
        setReviewTexts(allReviews ? (allReviews as any[]) : []);
      }

      if (data.gamme_id) {
        const { data: g } = await supabase
          .from("gammes")
          .select("id, name_fr, color_hex, text_color_hex")
          .eq("id", data.gamme_id)
          .maybeSingle();
        if (g) setGamme(g);
      } else {
        setGamme(null);
      }

      setIsLoading(false);
    };
    fetch();
  }, [businessId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Établissement introuvable
      </div>
    );
  }

  const isVerified = business.wtuce_status === "verified";
  const isInstitution = business.account_type?.toLowerCase() === "institution";
   const images = business.images || [];
   const hasVideo = !!business.video_1_url && !videoError;
   const hasMatterport = !!business.matterport_url;
   const mediaCount = (hasVideo ? 1 : 0) + images.length + (hasMatterport ? 1 : 0);
   const videoOffset = hasVideo ? 1 : 0;
   const matterportIndex = hasMatterport ? mediaCount - 1 : -1;
  const ratingSourcesForCalc = collectRatingSources(business);
  const computedOn20 = computeWeightedRatingOn20(ratingSourcesForCalc);
  const avgOn20 = business.rating ?? computedOn20;

  const reviews: { rating: number; count: number; label: string }[] = [];
  if (business.google_rating && business.google_review_count) reviews.push({ rating: business.google_rating, count: business.google_review_count, label: "Google" });
  if (business.tripadvisor_rating && business.tripadvisor_review_count) reviews.push({ rating: business.tripadvisor_rating, count: business.tripadvisor_review_count, label: "TripAdvisor" });
  if (business.restaurant_guru_rating && business.restaurant_guru_review_count) reviews.push({ rating: business.restaurant_guru_rating, count: business.restaurant_guru_review_count, label: "Restaurant Guru" });
  const totalReviewCount = reviews.reduce((s, r) => s + r.count, 0);

  const hook = language === "en" ? business.hook_en : language === "ar" ? business.hook_ar : business.hook_fr;
  const hasContact = !!(business.address || business.phone || business.email || business.whatsapp || business.skype || business.menu_url || business.reserve_now_url || (business.show_opening_hours !== false && (business.is_open_24h || business.opening_hours)));

  // Build TTS synthesis text (~30 seconds)
  const buildTtsSynthesis = () => {
    const parts: string[] = [];
    parts.push(`${business.name}, situé à ${business.city}${business.neighborhood ? `, quartier ${business.neighborhood}` : ""}.`);
    if (business.default_service) {
      parts.push(`Leur spécialité : ${business.default_service}.`);
    }
    // Description nettoyée
    if (business.description) {
      const clean = business.description.replace(/<[^>]+>/g, "").trim();
      if (clean.length > 0) {
        parts.push(clean.length > 250 ? clean.slice(0, 250) + "…" : clean);
      }
    }
    // Synthèse IA des avis (multilingual: picks fr/en based on interface language)
    const rawSummary = business.ai_review_summary as any;
    const langSummary = rawSummary?.[language] || rawSummary; // fallback to legacy top-level
    const prosLabel = language === "en" ? "Customers appreciate" : "Les clients apprécient";
    const consLabel = language === "en" ? "Areas for improvement" : "Points à améliorer";
    if (langSummary?.pros && langSummary.pros.length > 0) {
      parts.push(`${prosLabel} : ${langSummary.pros.slice(0, 3).join(", ")}.`);
    }
    if (langSummary?.cons && langSummary.cons.length > 0) {
      parts.push(`${consLabel} : ${langSummary.cons.slice(0, 2).join(", ")}.`);
    }
    // Avis individuel si pas de synthèse IA
    if (!langSummary?.pros) {
      const bestReview = reviewTexts.find(r => r.text && r.text.length > 20);
      if (bestReview) {
        const snippet = bestReview.text!.slice(0, 150).replace(/<[^>]+>/g, "");
        parts.push(`Un client témoigne : "${snippet}".`);
      }
    }
    if (avgOn20) {
      parts.push(`Note globale : ${avgOn20} sur 20, basée sur ${totalReviewCount} avis.`);
    }
    return parts.join(" ");
  };

  // Opening hours — same logic as BusinessCard badge
  const canShowOpenBadge = !!business.show_opening_hours || !!business.is_open_24h;
  let openBadgeText: string | null = null;
  let openBadgeIsOpen = false;

  if (canShowOpenBadge) {
    if (business.is_open_24h) {
      openBadgeText = "Ouvert 24h";
      openBadgeIsOpen = true;
    } else if (business.opening_hours) {
      const oh = business.opening_hours as Record<string, { open?: string; close?: string; open2?: string; close2?: string; closed?: boolean; continuous?: boolean }>;
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const now = new Date();
      const todayKey = days[now.getDay()];

      // Check if currently open
      const currentlyOpen = isCurrentlyOpenCheck(oh[todayKey]);
      if (currentlyOpen) {
        openBadgeText = "Ouvert";
        openBadgeIsOpen = true;
      } else {
        // Find next opening time
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const dh = oh[todayKey];
        let foundToday = false;

        if (dh && !dh.closed && dh.open) {
          const [oH, oM] = dh.open.split(":").map(Number);
          const openMin = oH * 60 + (oM || 0);
          if (openMin > nowMin) {
            openBadgeText = `Ouvre à ${dh.open}`;
            foundToday = true;
          } else if (dh.open2 && !dh.continuous) {
            const [oH2, oM2] = dh.open2.split(":").map(Number);
            const open2Min = oH2 * 60 + (oM2 || 0);
            if (open2Min > nowMin) {
              openBadgeText = `Ouvre à ${dh.open2}`;
              foundToday = true;
            }
          }
        }

        if (!foundToday) {
          for (let i = 1; i <= 7; i++) {
            const nextDayKey = days[(now.getDay() + i) % 7];
            const nextDh = oh[nextDayKey];
            if (nextDh && !nextDh.closed && nextDh.open) {
              openBadgeText = `Ouvre à ${nextDh.open}`;
              break;
            }
          }
        }
      }
    }
  }

  const toolbarPortal = document.getElementById("slide-panel-toolbar");
  const toolbarCenterPortal = document.getElementById("slide-panel-toolbar-center");

  return (
    <div className="flex flex-col h-full">
      {/* Portal contact icons into center of fixed bar */}
      {toolbarCenterPortal && createPortal(
        <>
          {business.whatsapp && (
            <a href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity" style={{ color: "#25D366" }}>
              <WhatsAppIcon className="h-6 w-6" />
            </a>
          )}
          {business.skype && (
            <a href={`skype:${business.skype}?chat`} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity" style={{ color: "#00AFF0" }}>
              <SkypeIcon className="h-6 w-6" />
            </a>
          )}
          {business.phone && (
            <a href={`tel:${business.phone}`} className="hover:opacity-70 transition-opacity" style={{ color: "#404040" }}>
              <Phone className="h-6 w-6" />
            </a>
          )}
          {(business.latitude || business.google_maps_url) && (
            <button
              onClick={() => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="hover:opacity-70 transition-opacity"
              style={{ color: "#6050DC" }}
              title="Voir sur la carte"
            >
              <MapPin className="h-6 w-6" />
            </button>
          )}
        </>,
        toolbarCenterPortal
      )}
      {/* Portal action icons into right of fixed bar */}
      {toolbarPortal && createPortal(
        <>
          <ShareButton title={business.name} variant="dark" className="toolbar-icon" />
          <BookmarkButton businessId={business.id} variant="gold" onLoginRequired={() => setShowClubCard(true)} />
          <button
            onClick={() => {
              if (ttsStatus === "playing" || ttsStatus === "loading") {
                ttsStop();
                voiceLoopRef.current = false;
              } else {
                voiceLoopRef.current = true;
                const synthesis = buildTtsSynthesis();
                ttsSpeak(synthesis + " … Vous pouvez me poser une autre question.");
              }
            }}
            className={`h-9 w-9 flex items-center justify-center rounded-full transition-colors ${ttsStatus === "playing" || ttsStatus === "loading" ? "bg-gold/20 text-gold" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            title={ttsStatus === "playing" ? "Arrêter la lecture" : "Écouter la synthèse"}
          >
            {ttsStatus === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Headphones className="h-4 w-4" />
            )}
          </button>
        </>,
        toolbarPortal
      )}
      {/* Scrollable content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
        {/* EXPANDED MODE: Full media mosaic gallery */}
        {isExpanded ? (
          <div className="p-2" style={{ columns: "250px 3", columnGap: 6 }}>
              {/* Video tile */}
              {hasVideo && (
                <div
                  className="relative cursor-pointer overflow-hidden rounded-lg mb-1.5 break-inside-avoid"
                  style={{ aspectRatio: "16/10" }}
                  onClick={() => { setCurrentImageIndex(0); setIsLightboxOpen(true); }}
                >
                  {(() => {
                    const url = business.video_1_url!;
                    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
                    if (ytMatch) {
                      return (
                        <iframe
                          src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&mute=1&controls=0&modestbranding=1&rel=0`}
                          className="w-full h-full pointer-events-none"
                          allow="encrypted-media"
                          frameBorder="0"
                        />
                      );
                    }
                    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                    if (vimeoMatch) {
                      return (
                        <iframe
                          src={`https://player.vimeo.com/video/${vimeoMatch[1]}?muted=1&background=1`}
                          className="w-full h-full pointer-events-none"
                          allow="encrypted-media"
                          frameBorder="0"
                        />
                      );
                    }
                    return <video src={url} muted loop playsInline className="w-full h-full object-cover" />;
                  })()}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="p-3 rounded-full bg-background/70">
                      <Play className="h-6 w-6 text-foreground" />
                    </div>
                  </div>
                </div>
              )}
              {/* Image tiles — CSS columns masonry, natural proportions */}
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`${business.name} - ${i + 1}`}
                  className="w-full rounded-lg cursor-pointer hover:scale-[1.03] transition-transform duration-300 mb-1.5 break-inside-avoid"
                  onClick={() => { setCurrentImageIndex(videoOffset + i); setIsLightboxOpen(true); }}
                />
              ))}
              {/* Matterport tile */}
              {hasMatterport && (
                <div
                  className="cursor-pointer overflow-hidden rounded-lg flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/60 hover:from-primary/10 hover:to-primary/5 transition-colors mb-1.5 break-inside-avoid"
                  style={{ aspectRatio: "16/10" }}
                  onClick={() => { setCurrentImageIndex(matterportIndex); setIsLightboxOpen(true); }}
                >
                  <Box className="h-10 w-10 text-primary" />
                  <span className="text-sm font-semibold text-primary">Visite 3D</span>
                </div>
              )}
          </div>
        ) : (
        <>
        {/* Image display */}
        {mediaCount > 0 && (
          <div className="relative">
            {(
              /* Standard carousel for non-expanded or few images */
              <div ref={mediaContainerRef} className={`relative w-full aspect-[16/9] bg-muted ${mediaCount > 1 ? "cursor-pointer" : ""}`} onClick={() => { if (mediaCount > 1 && !(hasVideo && currentImageIndex === 0)) setIsLightboxOpen(true); }}>
                {hasVideo && currentImageIndex === 0 ? (
                  (() => {
                    const url = business.video_1_url!;
                    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
                    if (ytMatch) {
                       return (
                        <iframe
                          key={`yt-${isVideoMuted}`}
                          src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=${isVideoMuted ? 1 : 0}&loop=1&playlist=${ytMatch[1]}&controls=0&modestbranding=1&rel=0`}
                          className="w-full h-full"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                          frameBorder="0"
                          onError={() => setVideoError(true)}
                        />
                      );
                    }
                    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                    if (vimeoMatch) {
                       return (
                        <iframe
                          key={`vi-${isVideoMuted}`}
                          src={`https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=${isVideoMuted ? 1 : 0}&loop=1&background=${isVideoMuted ? 1 : 0}`}
                          className="w-full h-full"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                          frameBorder="0"
                          onError={() => setVideoError(true)}
                        />
                      );
                    }
                    return (
                      <video
                        ref={videoRef}
                        src={url}
                        autoPlay
                        muted={isVideoMuted}
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                        onError={() => setVideoError(true)}
                      />
                    );
                  })()
                ) : hasMatterport && currentImageIndex === matterportIndex ? (
                  <div className="w-full h-full bg-gradient-to-br from-muted to-muted/60 flex flex-col items-center justify-center gap-3">
                    <Box className="h-12 w-12 text-primary" />
                    <span className="text-sm font-semibold text-primary">Visite 3D</span>
                    <span className="text-xs text-muted-foreground">Cliquez pour lancer</span>
                  </div>
                ) : (
                  <img
                    src={images[currentImageIndex - videoOffset]}
                    alt={`${business.name} - ${currentImageIndex - videoOffset + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
                {/* Video controls: Mute + Fullscreen */}
                {hasVideo && currentImageIndex === 0 && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
                    {business.video_1_url && !business.video_1_url.match(/youtube\.com|youtu\.be|vimeo\.com/) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (videoRef.current?.paused) {
                            videoRef.current.play();
                            setIsVideoPaused(false);
                          } else {
                            videoRef.current?.pause();
                            setIsVideoPaused(true);
                          }
                        }}
                        className="p-3 rounded-full bg-background/80 hover:bg-background transition-colors shadow-lg"
                        title={isVideoPaused ? "Lecture" : "Pause"}
                      >
                        {isVideoPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFullscreen(); }}
                      className="p-3 rounded-full bg-background/80 hover:bg-background transition-colors shadow-lg"
                      title="Plein écran"
                    >
                      <Maximize className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsVideoMuted(m => !m); }}
                      className="p-3 rounded-full bg-background/80 hover:bg-background transition-colors shadow-lg"
                    >
                      {isVideoMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                  </div>
                )}
                {isVerified && !isInstitution && (
                  <img src={logoGold} alt="WTUCE" className="absolute top-3 right-3 w-12 h-12 object-contain opacity-90 pointer-events-none drop-shadow-lg" />
                )}
                {mediaCount > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => i === 0 ? mediaCount - 1 : i - 1); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors shadow"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => i === mediaCount - 1 ? 0 : i + 1); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors shadow"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-background/80 text-xs text-foreground">
                      {currentImageIndex + 1} / {mediaCount}
                    </div>
                    {mediaCount > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(0); setIsLightboxOpen(true); }}
                        className="absolute bottom-2 left-2 px-3 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm text-xs font-semibold text-foreground shadow-md hover:bg-background transition-colors"
                      >
                        {language === "en" ? `View all ${mediaCount} photos` : language === "ar" ? `عرض ${mediaCount} صور` : `Voir les ${mediaCount} photos`}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sentinel to detect when images are scrolled past */}
        <div ref={mediaEndSentinelRef} className="h-0 w-full" />

        {/* Sticky sub-header: name, rating, logo, open badge */}
        {showStickyHeader && (
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="px-4 py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-foreground truncate">{business.name}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {avgOn20 !== null && (
                    <>
                      <Star className="h-3 w-3 text-gold fill-gold" />
                      <span className="font-bold text-gold">{avgOn20}/20</span>
                      {totalReviewCount > 0 && <span>· {totalReviewCount.toLocaleString("fr-FR")} avis</span>}
                    </>
                  )}
                  {openBadgeText && (
                    <>
                      <span>·</span>
                      <span className={`inline-flex items-center gap-1 font-medium ${openBadgeIsOpen ? "text-emerald-600" : "text-muted-foreground"}`}>
                        <Clock className="h-3 w-3" />
                        {openBadgeText}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {business.default_service && (
                <Badge className="shrink-0 text-xs bg-gold text-black hover:bg-gold/90 border-gold">{business.default_service}</Badge>
              )}
              {/* Social media icons */}
              {(() => {
                const socials = [
                  { url: business.facebook_url, color: "#1877F2", icon: <FacebookIcon className="h-6 w-6" /> },
                  { url: business.instagram_url, color: "#E4405F", icon: <InstagramIcon className="h-6 w-6" /> },
                  { url: business.linkedin_url, color: "#0A66C2", icon: <LinkedInIcon className="h-6 w-6" /> },
                  { url: business.youtube_url, color: "#FF0000", icon: <YouTubeIcon className="h-6 w-6" /> },
                  { url: business.tiktok_url, color: "#000000", icon: <TikTokIcon className="h-6 w-6" /> },
                  { url: business.twitter_url, color: "#000000", icon: <TwitterIcon className="h-6 w-6" /> },
                  { url: business.pinterest_url, color: "#E60023", icon: <PinterestIcon className="h-6 w-6" /> },
                  { url: business.vimeo_url, color: "#1AB7EA", icon: <VimeoIcon className="h-6 w-6" /> },
                ].filter(s => s.url);
                return socials.length > 0 ? (
                  <div className="flex items-center gap-3 shrink-0">
                    {socials.map((s, i) => (
                      <a key={i} href={s.url!} target="_blank" rel="noopener noreferrer" className="text-foreground hover:opacity-70 transition-opacity grayscale">
                        {s.icon}
                      </a>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
            {/* Sticky tabs bar */}
            {showStickyTabs && (
              <div className="flex gap-1 overflow-x-auto no-scrollbar border-t border-border px-5">
                {[
                  { id: "apercu", label: "Aperçu", show: !!business.description },
                  { id: "contact", label: "Contact", show: !!(business.address || business.phone || business.email || business.whatsapp) },
                  { id: "avis", label: "Avis clients", show: !!(reviews.length > 0 || avgOn20) },
                  { id: "localiser", label: "Localiser", show: !!business.google_maps_url },
                  { id: "services", label: "Services", show: !!(business.services && business.services.length > 0) },
                  { id: "similaires", label: "Similaires", show: true },
                  { id: "acote", label: "À côté", show: !!(business.latitude && business.longitude) },
                ].filter(t => t.show).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => navigateToTab(tab.id)}
                    className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-5 space-y-5 relative z-10 bg-background">
          {/* Name + badges */}
          <div>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-foreground leading-tight">{business.name}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                  {avgOn20 !== null && (
                    <>
                      <Star className="h-4 w-4 text-gold fill-gold" />
                      <span className="font-bold text-gold">{avgOn20}/20</span>
                      {totalReviewCount > 0 && <span>· {totalReviewCount.toLocaleString("fr-FR")} avis</span>}
                      <span>·</span>
                    </>
                  )}
                  {isVerified && !isInstitution && (
                    <>
                      <BadgeCheck className="h-4 w-4 text-gold" />
                      <span className="font-semibold text-gold">Vérifié</span>
                      <span>·</span>
                    </>
                  )}
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{business.city}{business.neighborhood ? `, ${business.neighborhood}` : ""}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {business.default_service && (
                  <Badge className="text-xs bg-gold text-black hover:bg-gold/90 border-gold">{business.default_service}</Badge>
                )}
                {voiceStatus === "recording" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium animate-pulse">
                    <Mic className="h-3.5 w-3.5" />
                    <span>Je vous écoute…</span>
                  </div>
                )}
                {business.logo_url && (
                  <div
                    className="w-16 h-16 p-1.5 rounded-lg border border-border flex items-center justify-center"
                    style={{
                      backgroundColor:
                        business.logo_bg === 'blanc' || business.logo_bg === 'white' ? '#ffffff'
                        : business.logo_bg === 'noir' || business.logo_bg === 'black' ? '#000000'
                        : 'transparent',
                    }}
                  >
                    <img src={business.logo_url} alt="" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
              </div>
            </div>
          </div>


          {/* Opening status */}
          {openBadgeText && (
            <div className={`flex items-center gap-2 text-sm font-medium ${openBadgeIsOpen ? "text-emerald-600" : "text-muted-foreground"}`}>
              <Clock className="h-4 w-4" />
              {openBadgeText}
            </div>
          )}


          {/* Hook */}
          {hook && (
            <p className="text-sm text-muted-foreground italic leading-relaxed border-l-2 border-gold/30 pl-3">
              {hook}
            </p>
          )}

          {/* Tabs navigation */}
          <div ref={descriptionRef} className="flex gap-1 overflow-x-auto no-scrollbar border-b border-border -mx-5 px-5 scroll-mt-28">
            {[
              { id: "apercu", label: "Aperçu", show: !!business.description },
              { id: "contact", label: "Contact", show: hasContact },
              { id: "avis", label: "Avis clients", show: !!(reviews.length > 0 || avgOn20) },
              { id: "localiser", label: "Localiser", show: !!business.google_maps_url },
              { id: "services", label: "Services", show: !!(business.services && business.services.length > 0) },
              { id: "similaires", label: "Similaires", show: similarCount === null || similarCount > 0 },
              { id: "acote", label: "À côté", show: nearbyCount === null || nearbyCount > 0 },
            ].filter(t => t.show).map(tab => (
              <button
                key={tab.id}
                onClick={() => navigateToTab(tab.id)}
                className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sentinel: triggers sticky tabs when inline tabs scroll out */}
          <div ref={tabsSentinelRef} className="h-0 w-full" />

          {/* Description */}
          {business.description && (
            <>
              <div className="relative">
                <div
                  className={`text-sm text-foreground leading-relaxed [&>p]:mb-3 [&>p:last-child]:mb-0 [&>br]:content-[''] [&>br]:block [&>br]:mb-2 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-4 [&>h2]:mt-5 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mb-3 [&>h3]:mt-4 overflow-hidden transition-all duration-300 ${isDescriptionExpanded ? "" : "max-h-[21em]"}`}
                  dangerouslySetInnerHTML={{ __html: business.description }}
                />
                {!isDescriptionExpanded && (business.description?.length ?? 0) >= 1000 && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                )}
              </div>
              {!isDescriptionExpanded && (business.description?.length ?? 0) > 500 && (
                <button
                  onClick={() => setIsDescriptionExpanded(true)}
                  className="w-[20%] py-2 rounded-lg border border-border bg-muted/50 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Voir +
                </button>
              )}
            </>
          )}

          {/* Contact info */}
          {hasContact && (
          <div ref={contactSectionRef} className="border-t border-border py-5 scroll-mt-28">
            <div className="grid grid-cols-2 gap-6">
              {/* Address */}
              {business.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 shrink-0 mt-0.5 text-foreground" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">Adresse</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{business.address}</p>
                    
                  </div>
                </div>
              )}


              {/* Phone */}
              {business.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 shrink-0 mt-0.5 text-foreground" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">Téléphone</p>
                    <a href={`tel:${business.phone}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5 block">
                      {business.phone}
                    </a>
                  </div>
                </div>
              )}

              {/* Email */}
              {business.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 shrink-0 mt-0.5 text-foreground" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">Email</p>
                    <a href={`mailto:${business.email}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5 block">
                      {business.email}
                    </a>
                  </div>
                </div>
              )}

              {/* Menu */}
              {business.menu_url && (
                <div className="flex items-start gap-3">
                  <CookingPot className="h-5 w-5 shrink-0 mt-0.5 text-foreground" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">Menu</p>
                    <a href={business.menu_url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5 block">
                      Voir le menu <ExternalLink className="inline h-3 w-3 ml-0.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* WhatsApp */}
              {business.whatsapp && (
                <div className="flex items-start gap-3">
                  <WhatsAppIcon className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "#25D366" }}>WhatsApp</p>
                    <a href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5 block">
                      {business.whatsapp}
                    </a>
                  </div>
                </div>
              )}

              {/* Skype */}
              {business.skype && (
                <div className="flex items-start gap-3">
                  <SkypeIcon className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "#00AFF0" }}>Skype</p>
                    <a href={`skype:${business.skype}?chat`} className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5 block">
                      {business.skype}
                    </a>
                  </div>
                </div>
              )}

              {/* Opening Hours */}
              {canShowOpenBadge && (
                <div className="col-span-2">
                  <div>
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 shrink-0 mt-0.5 text-foreground" />
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground mb-1.5">
                          Horaires
                          {openBadgeText && (
                            <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${openBadgeIsOpen ? 'bg-green-500/15 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                              {openBadgeText}
                            </span>
                          )}
                        </p>
                        {business.is_open_24h ? (
                          <p className="text-sm text-muted-foreground">Ouvert 24h/24</p>
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
                                  <div key={day} className={`flex gap-3 text-sm ${isToday ? 'font-bold' : ''}`}>
                                    <span className={`font-medium ${isToday ? 'text-foreground' : ''}`}>
                                      {dayNames[day]}{isToday ? ' ●' : ''}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {formatDayHoursDisplay(dh, { language })}
                                    </span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reserve now CTA — independent of opening hours */}
              {business.reserve_now_url && (
                <div className="col-span-2 flex justify-center mt-2">
                  <a
                    href={business.reserve_now_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-[60%] py-3 rounded-xl bg-gold text-gold-foreground font-semibold text-sm hover:bg-gold/90 transition-colors"
                  >
                    {language === "en" ? "Book now" : language === "ar" ? "احجز الآن" : "Réserver maintenant"}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

            </div>
          </div>
          )}

          {/* Booking platforms */}
          {(() => {
            const normalizeUrl = (value?: string | null) => {
              if (!value) return "";
              const trimmed = value.trim();
              if (!trimmed) return "";
              try {
                const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
                const parsed = new URL(withProtocol);
                const normalizedPath = parsed.pathname.replace(/\/$/, "");
                return `${parsed.hostname.toLowerCase()}${normalizedPath}`;
              } catch {
                return trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase();
              }
            };

            const reserveNowNormalized = normalizeUrl(business.reserve_now_url);
            const isReserveNowDuplicate = (url?: string | null) => {
              const candidate = normalizeUrl(url);
              return !!candidate && !!reserveNowNormalized && (
                candidate === reserveNowNormalized ||
                candidate.startsWith(`${reserveNowNormalized}/`) ||
                reserveNowNormalized.startsWith(`${candidate}/`)
              );
            };

            const platforms = [
              { url: business.booking_url, label: "Booking.com", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#003580"><path d="M2.732 0A2.732 2.732 0 000 2.732v18.536A2.732 2.732 0 002.732 24h18.536A2.732 2.732 0 0024 21.268V2.732A2.732 2.732 0 0021.268 0zm7.477 5.63h3.428c2.57 0 4.152 1.214 4.152 3.263 0 1.253-.678 2.274-1.904 2.763v.063c1.58.32 2.457 1.467 2.457 2.92 0 2.322-1.741 3.732-4.593 3.732H10.21zm2.488 2.088v2.763h.878c1.106 0 1.71-.488 1.71-1.382 0-.893-.604-1.381-1.71-1.381zm0 4.788v3.012h1.066c1.169 0 1.804-.552 1.804-1.506s-.635-1.506-1.804-1.506z"/></svg> },
              { url: business.airbnb_url, label: "Airbnb", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#FF5A5F"><path d="M12.001 18.275c-1.353-1.697-2.148-3.398-2.488-4.736-.404-1.618-.18-2.835.564-3.54.477-.452 1.102-.66 1.753-.66h.34c.652 0 1.277.208 1.754.66.744.705.968 1.922.564 3.54-.34 1.338-1.135 3.04-2.487 4.736zm9.394-1.142c-.273 1.787-1.658 3.252-3.472 3.716-.603.155-1.224.224-1.841.224-1.17 0-2.305-.31-3.33-.82a14.37 14.37 0 01-.752-.423c-.23.293-.477.578-.735.853a8.04 8.04 0 01-2.73 2.034c-1.03.51-2.164.82-3.334.82-.617 0-1.238-.069-1.841-.224-1.814-.464-3.199-1.929-3.472-3.716-.211-1.395.07-2.844.815-4.293.512-1.003 1.232-2.01 2.134-2.994a26.478 26.478 0 011.676-1.69c.086-.08.17-.158.256-.234-.02-.07-.036-.14-.053-.211-.3-1.28-.292-2.47.078-3.514C5.685 3.24 6.605 2.496 7.79 2.15c.39-.114.808-.174 1.245-.174 1.352 0 2.834.67 4.407 2.004l.559.485.56-.485C16.153 2.646 17.635 1.976 18.987 1.976c.437 0 .854.06 1.245.174 1.184.346 2.104 1.09 2.594 2.097.37 1.043.378 2.234.077 3.514-.016.071-.033.141-.052.211.085.076.17.155.255.234a26.478 26.478 0 011.677 1.69c.902.985 1.622 1.991 2.134 2.994.745 1.449 1.026 2.898.815 4.293z"/></svg> },
              { url: business.hotels_com_url, label: "Hotels.com", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#D32F2F"><rect width="24" height="24" rx="4" fill="#D32F2F"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">H</text></svg> },
              { url: business.trivago_url, label: "Trivago", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#007FAD"><rect width="24" height="24" rx="4" fill="#007FAD"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">T</text></svg> },
              { url: business.glovo_url, label: "Glovo", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#FFC244"><circle cx="12" cy="12" r="12" fill="#FFC244"/><text x="12" y="16" textAnchor="middle" fill="#1A1A1A" fontSize="10" fontWeight="bold">G</text></svg> },
              { url: business.getyourguide_url, label: "GetYourGuide", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#FF4E00"><rect width="24" height="24" rx="4" fill="#FF4E00"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">G</text></svg> },
              { url: business.viator_url, label: "Viator", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#3B7D23"><rect width="24" height="24" rx="4" fill="#3B7D23"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">V</text></svg> },
              { url: isReserveNowDuplicate(business.other_booking_url) ? undefined : business.other_booking_url, label: business.other_booking_name || "Autre", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> },
            ].filter(p => p.url);

            if (platforms.length === 0) return null;

            return (
              <div className="border-b border-border pb-5">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Plateformes de réservation</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {platforms.map(p => (
                      <a key={p.label} href={p.url!} target="_blank" rel="noopener noreferrer" title={p.label} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
                        {p.icon}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
          {(reviews.length > 0 || avgOn20) && (
            <div ref={reviewsSectionRef} className="space-y-4 scroll-mt-28">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">{language === "en" ? "Customer reviews" : language === "ar" ? "آراء العملاء" : "Avis clients"}</h3>
              {/* Global score */}
              {avgOn20 && (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gold">{avgOn20}/20</span>
                  {totalReviewCount > 0 && (
                    <span className="text-sm text-muted-foreground">{language === "en" ? `on ${totalReviewCount.toLocaleString('en')} reviews` : language === "ar" ? `على ${totalReviewCount.toLocaleString('ar')} تقييم` : `sur ${totalReviewCount.toLocaleString('fr-FR')} avis`}</span>
                  )}
                </div>
              )}

              {/* Platform cards */}
              {reviews.length > 0 && (
                <div className="space-y-2">
                  {reviews.map(r => {
                    const reviewUrl = r.label === "Google"
                      ? (business.google_reviews_url || business.google_maps_url)
                      : r.label === "TripAdvisor"
                      ? (business.tripadvisor_review_url || business.tripadvisor_url)
                      : r.label === "Restaurant Guru"
                      ? business.restaurant_guru_url
                      : null;
                    return (
                      <div key={r.label} className="flex items-center justify-between p-3 rounded-xl border border-border">
                        <div className="flex items-center gap-3">
                          {r.label === 'Google' && (
                            <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                              <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                            </div>
                          )}
                          {r.label === 'TripAdvisor' && (
                            <img src={tripadvisorLogo} alt="TripAdvisor" className="w-10 h-10 rounded-full object-cover shrink-0" />
                          )}
                          {r.label === 'Restaurant Guru' && (
                            <img src={restaurantGuruLogo} alt="Restaurant Guru" className="w-10 h-10 rounded-full object-contain shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-foreground">{r.label}</p>
                            <p className="text-sm">
                              <span className="font-semibold text-gold">{r.rating}/5</span>
                              <span className="text-muted-foreground"> · {r.count.toLocaleString(language === "en" ? 'en' : language === "ar" ? 'ar' : 'fr-FR')} {language === "en" ? "reviews" : language === "ar" ? "تقييم" : "avis"}</span>
                            </p>
                          </div>
                        </div>
                        {reviewUrl && (
                          <a href={reviewUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-gold hover:underline flex items-center gap-1 shrink-0">
                            {language === "en" ? "See reviews" : language === "ar" ? "عرض التقييمات" : "Voir les avis"} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Review comments */}
              {reviewTexts.length > 0 && (
                <div>
                  
                  <div className="space-y-2.5">
                    {reviewTexts.map((review, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          {review.rating && (
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3.5 w-3.5 ${i < review.rating! ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                                />
                              ))}
                            </div>
                          )}
                          <span className="text-sm font-semibold text-foreground">
                            {review.author_name || (language === "en" ? "Anonymous" : language === "ar" ? "مجهول" : "Anonyme")}
                          </span>
                          {review.relative_time && (
                            <span className="text-xs text-muted-foreground">
                              · {review.relative_time}
                            </span>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {review.text}
                        </p>
                        <div className="mt-2">
                          <Badge variant="outline" className="text-[10px]">
                            {review.source === 'google' ? 'Google' : review.source === 'tripadvisor' ? 'TripAdvisor' : review.source}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Google Maps - map only */}
          {business.google_maps_url && (() => {
            const extractPlaceName = (url: string) => {
              const m = url.match(/\/place\/([^/@]+)/);
              return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
            };
            const extractCoords = (url: string) => {
              const m = url.match(/!8m2!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
              if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
              const all = [...url.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
              return all.length > 0 ? { lat: parseFloat(all[all.length-1][1]), lng: parseFloat(all[all.length-1][2]) } : null;
            };
            const coords = business.google_maps_url ? extractCoords(business.google_maps_url) : null;
            const placeName = business.google_maps_url ? extractPlaceName(business.google_maps_url) : null;
            const lat = coords?.lat ?? business.latitude ?? null;
            const lng = coords?.lng ?? business.longitude ?? null;
            const fallbackAddr = business.address || (business.neighborhood ? `${business.neighborhood}, ${business.city}` : `${business.city}, ${business.region}`);
            const embedQuery = placeName || (business.name + (fallbackAddr ? `, ${fallbackAddr}` : lat && lng ? `, ${lat},${lng}` : ""));
            const mapUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(embedQuery)}&zoom=17`;
            const dest = lat && lng ? `${lat},${lng}` : encodeURIComponent(`${business.name}, ${fallbackAddr}`);
            
            return (
              <div ref={mapSectionRef} className="space-y-2 scroll-mt-28">
                <hr className="border-border" />
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">{language === "en" ? "Location" : language === "ar" ? "الموقع" : "Localisation"}</h3>
                <div className="space-y-1.5 text-sm">
                  {business.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                      <span>{business.address}</span>
                    </div>
                  )}
                  {business.city && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
                      <span>
                        <a href={`/city/${encodeURIComponent(business.city)}`} className="font-bold underline underline-offset-2 text-primary hover:text-foreground transition-colors">
                          {business.city}
                        </a>
                        {business.neighborhood && (
                          <>, <a href={`/neighborhood/${encodeURIComponent(business.neighborhood)}?city=${encodeURIComponent(business.city)}`} className="font-bold underline underline-offset-2 text-primary hover:text-foreground transition-colors">
                            {business.neighborhood}
                          </a></>
                        )}
                        {business.region && <>, {business.region}</>}
                      </span>
                    </div>
                  )}
                </div>
                <div className="rounded-lg overflow-hidden border border-border">
                  <iframe
                    src={mapUrl}
                    className={`w-full border-0 ${isExpanded ? "h-[500px]" : "h-[350px]"}`}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Carte de ${business.name}`}
                  />
                  <div className="p-2 flex gap-2">
                    <button
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, "_blank")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      {language === "en" ? "Directions" : language === "ar" ? "الاتجاهات" : "Itinéraire"}
                    </button>
                    <button
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${dest}`, "_blank")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md border border-border text-foreground hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Google Maps
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Services */}
          {business.services && business.services.length > 0 && (
            <>
              <Separator />
              <div ref={servicesSectionRef} className="space-y-1.5 scroll-mt-28">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Services</h3>
                <div className="flex flex-wrap gap-1.5">
                  {business.services.slice(0, 12).map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-gold/10 text-gold border border-gold/20">
                      {s}
                    </span>
                  ))}
                  {business.services.length > 12 && (
                    <span className="px-2 py-0.5 text-xs text-muted-foreground">+{business.services.length - 12}</span>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Similar businesses */}
          <div ref={similarSectionRef} className="scroll-mt-28" />
          <SimilarBusinesses
            currentBusinessId={business.id}
            categories={business.categories}
            city={business.city}
            onNavigate={(id) => { setInternalBusinessId(id); scrollContainerRef.current?.scrollTo({ top: 0 }); if (isExpanded) onToggleExpand?.(); }}
            onLoginRequired={() => setShowClubCard(true)}
            scrollRef={similarSectionRef}
            onResultCount={setSimilarCount}
          />
          {similarCount !== 0 && nearbyCount !== 0 && <Separator />}

          {/* Nearby businesses */}
          <div ref={nearbySectionRef} className="scroll-mt-28" />
          <NearbyBusinesses
            currentBusinessId={business.id}
            businessName={business.name}
            latitude={business.latitude}
            longitude={business.longitude}
            currentSubcategory={business.default_service}
            onNavigate={(id) => { setInternalBusinessId(id); scrollContainerRef.current?.scrollTo({ top: 0 }); if (isExpanded) onToggleExpand?.(); }}
            onLoginRequired={() => setShowClubCard(true)}
            scrollRef={nearbySectionRef}
            onResultCount={setNearbyCount}
          />
          {nearbyCount !== 0 && <Separator />}

          {/* Bottom spacer for floating bar */}
          <div className="h-24" />
        </div>
        </>
        )}
      </div>

      {/* Fullscreen lightbox — rendered via portal to escape panel stacking context */}
      {isLightboxOpen && mediaCount > 0 && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center" onClick={() => { setIsLightboxOpen(false); if (isExpanded) onToggleExpand?.(); scrollContainerRef.current?.scrollTo({ top: 0 }); }}>
          <button
            onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); if (isExpanded) onToggleExpand?.(); scrollContainerRef.current?.scrollTo({ top: 0 }); }}
            className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-black font-semibold text-sm shadow-2xl hover:bg-white/90 transition-colors"
          >
            <X className="h-5 w-5" />
            <span>Fermer</span>
          </button>
           {hasMatterport && currentImageIndex === matterportIndex ? (
             <iframe
               src={business.matterport_url!}
               className="w-[95%] h-[90vh]"
               allow="fullscreen; vr; xr"
               allowFullScreen
               frameBorder="0"
               title={`Visite 3D - ${business.name}`}
               onClick={(e: any) => e.stopPropagation()}
             />
           ) : hasVideo && currentImageIndex === 0 ? (
             (() => {
               const url = business.video_1_url!;
               const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
               if (ytMatch) {
                 return (
                   <iframe
                     src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=0&loop=1&playlist=${ytMatch[1]}&rel=0`}
                     className="w-[90%] max-h-[90vh] aspect-video"
                     allow="autoplay; encrypted-media; fullscreen"
                     allowFullScreen
                     frameBorder="0"
                     onClick={(e: any) => e.stopPropagation()}
                   />
                 );
               }
               const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
               if (vimeoMatch) {
                 return (
                   <iframe
                     src={`https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&loop=1`}
                     className="w-[90%] max-h-[90vh] aspect-video"
                     allow="autoplay; encrypted-media; fullscreen"
                     allowFullScreen
                     frameBorder="0"
                     onClick={(e: any) => e.stopPropagation()}
                   />
                 );
               }
               return (
                 <video src={url} autoPlay controls loop playsInline className="max-w-[90%] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
               );
             })()
           ) : (
             <img
               src={images[currentImageIndex - videoOffset]}
               alt={`${business.name} - ${currentImageIndex - videoOffset + 1}`}
               className="max-w-[90%] max-h-[90vh] object-contain"
               onClick={(e) => e.stopPropagation()}
             />
           )}
          {mediaCount > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => i === 0 ? mediaCount - 1 : i - 1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => i === mediaCount - 1 ? 0 : i + 1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-6 w-6 text-white" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-sm text-white">
                {currentImageIndex + 1} / {mediaCount}
              </div>
            </>
      )}
        </div>,
        document.body
      )}
      {/* Club signup floating overlay - centered in panel */}
      {showClubCard && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 animate-in fade-in-0">
          <div className="w-3/4 max-w-xs rounded-2xl overflow-hidden shadow-xl border border-border animate-in slide-in-from-top-4">
            <div style={{ backgroundColor: "#6050DC" }} className="p-5 text-white relative">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowClubCard(false); }}
                className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4 pointer-events-none" />
              </button>
              <p className="text-sm opacity-90">{language === "en" ? "Welcome to" : language === "ar" ? "مرحباً بكم في" : "Bienvenue dans"}</p>
              <h3 className="text-xl font-bold mt-1">{language === "en" ? "the OWM Club" : language === "ar" ? "نادي OWM" : "le Club OWM"}</h3>
            </div>
            <div className="bg-card p-5 text-center">
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {language === "en"
                  ? "Sign up to save your favorite addresses and access exclusive benefits."
                  : language === "ar"
                    ? "سجّل لحفظ عناوينك المفضلة والحصول على مزايا حصرية."
                    : "Inscrivez-vous pour sauvegarder vos adresses favorites et accéder à des avantages exclusifs."}
              </p>
              <a
                href="/club"
                style={{ backgroundColor: "#6050DC" }}
                className="inline-block rounded-full px-8 py-3 text-white font-semibold text-sm hover:opacity-90 transition-colors shadow-md"
              >
                {language === "en" ? "Join now" : language === "ar" ? "سجّل الآن" : "Je m'inscris"}
              </a>
              <p className="mt-3 text-xs text-muted-foreground">
                {language === "en" ? "Already have an account? " : language === "ar" ? "لديك حساب بالفعل؟ " : "Vous avez déjà un compte ? "}
                <a href="/club" className="font-semibold hover:underline" style={{ color: "#6050DC" }}>
                  {language === "en" ? "Sign in" : language === "ar" ? "تسجيل الدخول" : "Connectez-vous"}
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessSlidePanel;
