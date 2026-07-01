import { useEffect, useState, useMemo } from "react";
import { useSEO } from "@/hooks/useSEO";
import { collectRatingSources, computeWeightedRatingOn20, computeWeightedRatingOn5 } from "@/lib/ratingUtils";
import { cleanPhone, whatsappUrl } from "@/lib/phoneUtils";
import { buildOgShareUrl } from "@/lib/businessUrl";
import { DescriptionExpander } from "@/components/DescriptionExpander";
import { useParams, Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Mail, Globe, BadgeCheck, Loader2, ChevronLeft, ChevronRight, FileText, Download, ShoppingBag, Facebook, Instagram, Linkedin, Youtube, MessageCircle, Clock, AlertTriangle, ChevronDown, Play, CalendarCheck, Star, Camera, Volume2, VolumeX, Loader } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GoogleMapEmbed from "@/components/GoogleMapEmbed";
import ImageLightbox from "@/components/ImageLightbox";
import RelatedEstablishments from "@/components/RelatedEstablishments";
import ShareButton from "@/components/ShareButton";
import BookmarkButton from "@/components/BookmarkButton";
import ServiceListItem from "@/components/ServiceListItem";
import DynamicIcon from "@/components/DynamicIcon";
import { useValidatedImages, useValidatedUrl } from "@/hooks/useValidatedImages";
import logoGold from "@/assets/logoGOLDsimple.webp";
import relaisChateauxLogo from "@/assets/relais-chateaux-logo.png";
import restaurantGuruLogo from "@/assets/restaurant-guru-logo.webp";
import tripadvisorLogo from "@/assets/tripadvisor-logo.png";
import { formatDayHours as formatDayHoursDisplay, isCurrentlyOpen as isCurrentlyOpenCheck } from "@/lib/formatOpeningHours";

interface OpeningHour {
  open: string;
  close: string;
  closed: boolean;
  continuous?: boolean;
  open2?: string;
  close2?: string;
}

interface OpeningHours {
  monday?: OpeningHour;
  tuesday?: OpeningHour;
  wednesday?: OpeningHour;
  thursday?: OpeningHour;
  friday?: OpeningHour;
  saturday?: OpeningHour;
  sunday?: OpeningHour;
}

interface Business {
  id: string;
  name: string;
  description: string | null;
  categories: string[] | null;
  services: string[] | null;
  keywords: string[] | null;
  city: string;
  region: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  wtuce_status: "verified" | "pending" | null;
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  images: string[] | null;
  pdf_url: string | null;
  pdf_name: string | null;
  pdf_2_url: string | null;
  pdf_2_name: string | null;
  pdf_3_url: string | null;
  pdf_3_name: string | null;
  online_shop_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  whatsapp: string | null;
  tripadvisor_url: string | null;
  tripadvisor_review_url: string | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  restaurant_guru_url: string | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
  google_reviews_url: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  booking_url: string | null;
  google_maps_url: string | null;
  pinterest_url: string | null;
  airbnb_url: string | null;
  hotels_com_url: string | null;
  trivago_url: string | null;
  skype: string | null;
  vimeo_url: string | null;
  video_1_url: string | null;
  opening_hours: OpeningHours | null;
  rating: number | null;
  reserve_now_url: string | null;
  show_opening_hours: boolean | null;
  is_open_24h: boolean | null;
  ice: string | null;
  kp_regroupement: string | null;
  vacation_dates: VacationDate[] | null;
  account_type: string | null;
  neighborhood: string | null;
  gamme_id: string | null;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  menu_url: string | null;
  languages: string[] | null;
  logo_bg: string | null;
  default_service: string | null;
  matterport_url: string | null;
}

interface Gamme {
  id: string;
  name_fr: string;
  color_hex: string | null;
  text_color_hex: string | null;
}

interface VacationDate {
  start_date: string;
  end_date: string;
}

interface BusinessLabel {
  id: string;
  label_id: string;
  custom_url: string | null;
  label: {
    id: string;
    name_fr: string;
    image_url: string | null;
    url_fr: string | null;
  } | null;
}

// Helper to convert video URL to embeddable format
const getEmbedUrl = (url: string): { url: string; type: 'iframe' | 'video' | 'facebook' } | null => {
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) return { url: `https://www.youtube-nocookie.com/embed/${youtubeMatch[1]}`, type: 'iframe' };
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return { url: `https://player.vimeo.com/video/${vimeoMatch[1]}`, type: 'iframe' };
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    return { url: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`, type: 'facebook' };
  }
  if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) return { url, type: 'video' };
  // Fallback: treat any URL with common video CDN patterns as direct video
  if (url.match(/scontent.*\.cdninstagram\.com.*\.mp4/i) || url.match(/video.*\.mp4/i)) return { url, type: 'video' };
  // Instagram Reels / posts
  const instaMatch = url.match(/instagram\.com\/(reel|p|tv)\/([\w-]+)/);
  if (instaMatch) return { url: `https://www.instagram.com/${instaMatch[1]}/${instaMatch[2]}/embed/`, type: 'iframe' };
  return null;
};

interface Destination {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  hook: string | null;
  description: string | null;
  image_url: string | null;
}

type TabKey = 'overview' | 'experiences' | 'video' | 'virtual-tour' | 'services' | 'reviews' | 'location';

const BusinessDetail = () => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessLabels, setBusinessLabels] = useState<BusinessLabel[]>([]);
  const [gamme, setGamme] = useState<Gamme | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [reviewTexts, setReviewTexts] = useState<{ source: string; author_name: string | null; rating: number | null; text: string | null; relative_time: string | null }[]>([]);
  const [categoriesWithResults, setCategoriesWithResults] = useState<string[]>([]);
  const [businessDestinationHook, setBusinessDestinationHook] = useState<string | null>(null);
  const [businessDestinationDescription, setBusinessDestinationDescription] = useState<string | null>(null);
  const [servicesTabTitle, setServicesTabTitle] = useState<string>('Services');
  const [groupedServices, setGroupedServices] = useState<{ subcategoryName: string; description: string | null; icon: string | null; services: string[] }[]>([]);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { speak: ttsSpeak, stop: ttsStop, status: ttsStatus } = useTextToSpeech();

  const { validImages, isValidating: isValidatingImages, brokenCount: brokenImagesCount } = useValidatedImages(business?.images ?? null);
  const { isValid: isPdfValid, isValidating: isValidatingPdf } = useValidatedUrl(business?.pdf_url ?? null);
  const { isValid: isPdf2Valid, isValidating: isValidatingPdf2 } = useValidatedUrl(business?.pdf_2_url ?? null);
  const { isValid: isPdf3Valid, isValidating: isValidatingPdf3 } = useValidatedUrl(business?.pdf_3_url ?? null);

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!routeSlug) return;
      
      // Try by slug first, then fallback to UUID for backward compatibility
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeSlug);
      const column = isUUID ? "id" : "slug" as any;
      
      let data: any = null;
      let error: any = null;
      
      if (isUUID) {
        const res = await supabase.from("businesses").select("*").eq("id", routeSlug).eq("is_active", true).maybeSingle();
        data = res.data; error = res.error;
      } else {
        const res = await (supabase.from("businesses").select("*") as any).eq("slug", routeSlug).eq("is_active", true).maybeSingle();
        data = res.data; error = res.error;
      }

      if (error) {
        console.error("Error fetching business:", error);
        setBusiness(null);
      } else if (data) {
        setBusiness({
          ...data,
          opening_hours: data.opening_hours as OpeningHours | null,
          vacation_dates: (data.vacation_dates as unknown as VacationDate[]) || null,
        });

        // Track recently viewed
        window.dispatchEvent(new CustomEvent("track-business-view", { detail: { id: data.id, name: data.name, images: data.images, logo_url: data.logo_url, city: data.city, slug: (data as any).slug || data.id } }));
        
        const { data: labelsData } = await supabase
          .from("business_labels" as any)
          .select("id, label_id, custom_url")
          .eq("business_id", data.id)
          .order("sort_order", { ascending: true });
        
        if (labelsData && labelsData.length > 0) {
          const labelIds = (labelsData as any[]).map(bl => bl.label_id);
          const { data: labelDetails } = await supabase
            .from("labels" as any)
            .select("id, name_fr, image_url, url_fr")
            .in("id", labelIds);
          
          const labelsWithDetails = (labelsData as any[]).map(bl => ({
            ...bl,
            label: (labelDetails as any[])?.find(l => l.id === bl.label_id) || null
          }));
          setBusinessLabels(labelsWithDetails as BusinessLabel[]);
        }

        if (data.gamme_id) {
          const { data: gammeData } = await supabase
            .from("gammes")
            .select("id, name_fr, color_hex, text_color_hex")
            .eq("id", data.gamme_id)
            .maybeSingle();
          if (gammeData) setGamme(gammeData as Gamme);
        }

        // Fetch review texts — respect is_hidden and prioritise is_default
        const { data: reviewsData } = await supabase
          .from("reviews" as any)
          .select("source, author_name, rating, text, relative_time, text_fr, text_en, is_default, is_hidden")
          .eq("business_id", data.id)
          .eq("is_hidden", false)
          .order("is_default", { ascending: false })
          .order("rating", { ascending: false })
          .limit(5);
        if (reviewsData) setReviewTexts(reviewsData as any[]);

        // Fetch destinations
        setBusinessDestinationHook(data.destination_hook || null);
        setBusinessDestinationDescription(data.destination_description || null);
        const { data: bdData } = await supabase
          .from("business_destinations" as any)
          .select("destination_id")
          .eq("business_id", data.id);
        if (bdData && bdData.length > 0) {
          const destIds = (bdData as any[]).map(d => d.destination_id);
          const { data: destData } = await supabase
            .from("destinations")
            .select("id, name_fr, name_en, name_ar, hook, description, image_url")
            .in("id", destIds)
            .order("sort_order", { ascending: true });
          if (destData) setDestinations(destData as Destination[]);
        } else {
          setDestinations([]);
        }

        // Fetch subcategory info and group services
        if (data.categories && data.categories.length > 0) {
          const { data: subcatData } = await supabase
            .from("subcategories")
            .select("name_fr, tab_title, description_fr, icon")
            .in("name_fr", data.categories);
          if (subcatData && subcatData.length > 0) {
            const withTitle = (subcatData as any[]).find(sc => sc.tab_title);
            if (withTitle) setServicesTabTitle(withTitle.tab_title);
          }
          
          // Fetch service→subcategory mapping for this business's services
          if (data.services && data.services.length > 0) {
            const { data: svcRows } = await supabase
              .from("services")
              .select("name_fr, subcategory_id, subcategories(name_fr, description_fr, icon)")
              .in("name_fr", data.services);
            
            const groupMap = new Map<string, { description: string | null; icon: string | null; services: Set<string> }>();
            const orphanServices: string[] = [];
            const businessCats = new Set(data.categories || []);
            
            if (svcRows) {
              // For each service, find the best matching subcategory (one that's in business categories)
              const serviceToSubcat = new Map<string, { subcatName: string; description: string | null; icon: string | null }>();
              
              for (const row of svcRows as any[]) {
                const subcatName = row.subcategories?.name_fr || null;
                if (!subcatName) continue;
                
                const svcName = row.name_fr as string;
                const existing = serviceToSubcat.get(svcName);
                
                // Prefer subcategory that matches business categories
                if (!existing) {
                  serviceToSubcat.set(svcName, { subcatName, description: row.subcategories?.description_fr || null, icon: row.subcategories?.icon || null });
                } else if (!businessCats.has(existing.subcatName) && businessCats.has(subcatName)) {
                  serviceToSubcat.set(svcName, { subcatName, description: row.subcategories?.description_fr || null, icon: row.subcategories?.icon || null });
                }
              }
              
              for (const [svcName, info] of serviceToSubcat) {
                // Only group under subcategories that belong to this business
                if (!businessCats.has(info.subcatName)) {
                  orphanServices.push(svcName);
                  continue;
                }
                if (!groupMap.has(info.subcatName)) {
                  groupMap.set(info.subcatName, { description: info.description, icon: info.icon, services: new Set() });
                }
                groupMap.get(info.subcatName)!.services.add(svcName);
              }
              
              // Services with no subcategory mapping at all
              const mappedServices = new Set(serviceToSubcat.keys());
              for (const row of svcRows as any[]) {
                if (!serviceToSubcat.has(row.name_fr)) orphanServices.push(row.name_fr);
              }
            }
            
            // Services not found in DB
            const foundNames = new Set((svcRows as any[] || []).map((r: any) => r.name_fr));
            for (const s of data.services) {
              if (!foundNames.has(s)) orphanServices.push(s);
            }
            
            const groups = Array.from(groupMap.entries()).map(([name, g]) => ({
              subcategoryName: name,
              description: g.description,
              icon: g.icon,
              services: Array.from(g.services).sort((a, b) => a.localeCompare(b, 'fr')),
            }));
            // Sort: prioritize group matching default_service, then business categories order, then alphabetical
            const defaultSvc = data.default_service;
            const businessCategories: string[] = data.categories || [];
            groups.sort((a, b) => {
              // 1. default_service group first
              if (defaultSvc) {
                const aHasDefault = a.services.includes(defaultSvc);
                const bHasDefault = b.services.includes(defaultSvc);
                if (aHasDefault && !bHasDefault) return -1;
                if (!aHasDefault && bHasDefault) return 1;
              }
              // 2. Match against business categories order
              const aIdx = businessCategories.indexOf(a.subcategoryName);
              const bIdx = businessCategories.indexOf(b.subcategoryName);
              if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
              if (aIdx !== -1) return -1;
              if (bIdx !== -1) return 1;
              // 3. Alphabetical fallback
              return a.subcategoryName.localeCompare(b.subcategoryName, 'fr');
            });
            
            // Orphan services are silently dropped – never show an "Autres" group
            
            setGroupedServices(groups);
            // If only one subcategory, open it by default; otherwise all collapsed
            setOpenGroups(groups.length === 1 ? new Set([groups[0].subcategoryName]) : new Set());
          }
        }
      } else {
        setBusiness(null);
      }

      setIsLoading(false);
    };
    fetchBusiness();
  }, [routeSlug]);

  // Localized description (falls back to legacy `description` = FR source)
  const localizedDescription = useMemo(() => {
    if (!business) return "";
    const b: any = business;
    if (language === "ar") return b.description_ar || b.description_fr || b.description || "";
    if (language === "en") return b.description_en || b.description_fr || b.description || "";
    return b.description_fr || b.description || "";
  }, [business, language]);

  // SEO
  const seoDescription = useMemo(() => {
    if (!business) return "";
    const plain = localizedDescription.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const cat = business.categories?.filter(c => c && c !== "?").join(", ") ?? "";
    return `${business.name}${business.city ? ` à ${business.city}` : ""}${cat ? ` – ${cat}` : ""}. ${plain}`.slice(0, 160);
  }, [business, localizedDescription]);

  const seoJsonLd = useMemo(() => {
    if (!business) return undefined;
    const ld: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: business.name,
      ...(localizedDescription && { description: localizedDescription.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300) }),
      ...(business.address && { address: { "@type": "PostalAddress", streetAddress: business.address, addressLocality: business.city } }),
      ...(business.phone && { telephone: business.phone }),
      ...(business.website && { url: business.website }),
      ...(business.latitude && business.longitude && { geo: { "@type": "GeoCoordinates", latitude: business.latitude, longitude: business.longitude } }),
      ...(business.images?.[0] && { image: business.images[0] }),
    };
    if (business.google_rating) {
      ld.aggregateRating = { "@type": "AggregateRating", ratingValue: business.google_rating, bestRating: 5, reviewCount: business.google_review_count ?? 1 };
    }
    return ld;
  }, [business]);

  useSEO({
    title: business ? `${business.name}${business.city ? ` – ${business.city}` : ""}` : "Chargement…",
    description: seoDescription || undefined,
    canonical: business ? `/business/${(business as any).slug || business.id}` : undefined,
    ogImage: business?.images?.[0] || undefined,
    ogUrl: business ? `/business/${(business as any).slug || business.id}` : undefined,
    jsonLd: seoJsonLd,
  });

  useEffect(() => {
    const checkCategories = async () => {
      if (!business?.categories) {
        setCategoriesWithResults([]);
        return;
      }
      const validCats = business.categories.filter(c => c && c.trim() && c.trim() !== '?');
      if (validCats.length === 0) {
        setCategoriesWithResults([]);
        return;
      }
      let query = supabase
        .from("businesses")
        .select("categories")
        .neq("id", business.id)
        .overlaps("categories", validCats);
      if (business.city) {
        query = query.eq("city", business.city);
      }
      const { data } = await query;
      if (data && data.length > 0) {
        const foundCats = new Set<string>();
        data.forEach(b => {
          (b.categories || []).forEach((c: string) => {
            if (validCats.includes(c) && c.trim() !== '?') foundCats.add(c);
          });
        });
        setCategoriesWithResults(Array.from(foundCats));
      } else {
        setCategoriesWithResults([]);
      }
    };
    checkCategories();
  }, [business?.id, business?.categories, business?.city]);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <div className="container mx-auto px-4 py-6 animate-pulse">
          <div className="aspect-[16/9] w-full rounded-xl bg-muted" />
          <div className="mt-6 space-y-3">
            <div className="h-8 w-2/3 rounded bg-muted" />
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="flex gap-2 pt-2">
              <div className="h-6 w-20 rounded-full bg-muted" />
              <div className="h-6 w-24 rounded-full bg-muted" />
              <div className="h-6 w-16 rounded-full bg-muted" />
            </div>
            <div className="space-y-2 pt-4">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-11/12 rounded bg-muted" />
              <div className="h-4 w-9/12 rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }


  if (!business) {
    return <Navigate to="/404" replace />;
  }

  const isVerified = business.wtuce_status === "verified";
  const isInstitution = business.account_type?.toLowerCase() === "institution";

  // Calculate rating
  const reviews: { rating: number; count: number; url: string | null; label: string }[] = [];
  if (business.google_rating && business.google_review_count) reviews.push({ rating: business.google_rating, count: business.google_review_count, url: business.google_reviews_url, label: 'Google' });
  if (business.tripadvisor_rating && business.tripadvisor_review_count) reviews.push({ rating: business.tripadvisor_rating, count: business.tripadvisor_review_count, url: business.tripadvisor_review_url || business.tripadvisor_url, label: 'TripAdvisor' });
  if (business.restaurant_guru_rating && business.restaurant_guru_review_count) reviews.push({ rating: business.restaurant_guru_rating, count: business.restaurant_guru_review_count, url: business.restaurant_guru_url, label: 'Restaurant Guru' });
  const totalReviewCount = (business as any).total_review_count ?? reviews.reduce((s, r) => s + r.count, 0);
  const ratingSourcesForCalc = collectRatingSources(business);
  const computedOn20 = computeWeightedRatingOn20(ratingSourcesForCalc);
  const computedOn5 = computeWeightedRatingOn5(ratingSourcesForCalc);
  const avgOn20 = (business as any).computed_rating ?? business.rating ?? computedOn20;
  const avgOn5 = business.rating ? Math.round(business.rating / 4 * 100) / 100 : computedOn5;

  const hasReviews = business.tripadvisor_review_url || business.restaurant_guru_url || business.google_reviews_url;

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: 'overview', label: 'Aperçu', show: true },
    { key: 'experiences', label: 'Expériences', show: destinations.length > 0 },
    { key: 'video', label: 'Vidéo', show: !!business.video_1_url },
    { key: 'virtual-tour', label: 'Visite 3D', show: !!business.matterport_url },
    { key: 'services', label: capitalize(servicesTabTitle), show: !!(business.services && business.services.length > 0) },
    { key: 'reviews', label: 'Avis', show: !!hasReviews },
    { key: 'location', label: 'Localisation', show: !!business.google_maps_url },
  ];

  return (
    <div className={`min-h-screen ${isVerified ? "bg-gradient-to-b from-black from-20% to-gold" : "bg-white"}`}>
      <Header />
      
      <main className="container mx-auto px-4 lg:px-8 py-24 max-w-5xl">
        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className={`inline-flex items-center gap-2 mb-6 text-sm transition-colors ${isVerified ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        {/* ===== COMPACT HEADER ===== */}
        <div className="mb-6">
          {/* Title row with labels */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-0 flex items-center gap-3">
              <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight ${isVerified ? "text-white" : "text-foreground"}`} style={{ fontFamily: "'Raleway', sans-serif" }}>
                {business.name}
              </h1>
              <div className="flex items-center gap-2">
                <BookmarkButton businessId={business.id} variant={isVerified ? "gold" : "dark"} />
                <ShareButton title={business.name} variant={isVerified ? "gold" : "dark"} shareUrl={buildOgShareUrl(routeSlug || business.id)} />
              </div>
            </div>
            {/* Labels - desktop only */}
            {businessLabels.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                {businessLabels.map((bl) => {
                  if (!bl.label?.image_url) return null;
                  const linkUrl = bl.custom_url || bl.label.url_fr;
                  return linkUrl ? (
                    <a key={bl.id} href={linkUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                      <img src={bl.label.image_url} alt={bl.label.name_fr} className="h-14 object-contain" />
                    </a>
                  ) : (
                    <img key={bl.id} src={bl.label.image_url} alt={bl.label.name_fr} className="h-14 object-contain" />
                  );
                })}
              </div>
            )}
          </div>

          {/* Rating + reviews count + location line */}
          <div className={`flex items-center gap-2 mt-2 text-sm flex-wrap ${isVerified ? "text-white/70" : "text-muted-foreground"}`}>
            {avgOn5 !== null && (
              <>
                <Star className={`h-4 w-4 fill-current ${isVerified ? 'text-gold' : 'text-primary'}`} />
                <span className={`font-bold ${isVerified ? 'text-gold' : 'text-primary'}`}>{avgOn20}/20</span>
                {totalReviewCount > 0 && (
                  <span>· {totalReviewCount.toLocaleString('fr-FR')} avis</span>
                )}
                <span>·</span>
              </>
            )}
            {isVerified && !isInstitution && (
              <>
                <BadgeCheck className={`h-4 w-4 ${isVerified ? 'text-gold' : 'text-primary'}`} />
                <span className={`font-semibold ${isVerified ? 'text-gold' : 'text-primary'}`}>WTUCE Vérifié</span>
                <span>·</span>
              </>
            )}
            {business.city && (
              <Link to={`/city/${encodeURIComponent(business.city)}`} className={`hover:underline ${isVerified ? "hover:text-white" : "hover:text-foreground"}`}>
                {business.city}
                {business.neighborhood ? `, ${business.neighborhood}` : business.region ? `, ${business.region}` : ''}
              </Link>
            )}
          </div>

          {/* Gamme badge */}
          {gamme && (
            <div className="mt-2">
              <Badge 
                className="text-xs border border-black whitespace-nowrap"
                style={{ backgroundColor: gamme.color_hex || '#666666', color: gamme.text_color_hex || '#000000' }}
              >
                {gamme.name_fr}
              </Badge>
            </div>
          )}
        </div>



        {/* ===== MOSAIC IMAGE GALLERY ===== */}
        {!isValidatingImages && validImages.length > 0 && (
          <div className="mb-6 rounded-xl overflow-hidden">
            {brokenImagesCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                {brokenImagesCount} image(s) indisponible(s)
              </div>
            )}
            {validImages.length === 1 ? (
              <div 
                className={`aspect-[16/9] sm:h-[400px] lg:h-[480px] cursor-pointer overflow-hidden rounded-xl relative group ${isVerified ? 'bg-black' : 'bg-white'}`}
                onClick={() => { setCurrentImageIndex(0); setIsLightboxOpen(true); }}
              >
                <img
                  src={validImages[0]}
                  alt={`${business.name} - Image 1`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {isVerified && !isInstitution && (
                  <img 
                    src={logoGold} 
                    alt="WTUCE" 
                    className="absolute top-3 right-3 w-16 h-16 sm:w-20 sm:h-20 object-contain opacity-90 pointer-events-none drop-shadow-lg"
                  />
                )}
              </div>
            ) : validImages.length <= 4 ? (
              <div className={`grid gap-1 sm:h-[400px] lg:h-[480px] relative ${
                validImages.length === 2 ? 'grid-cols-2' : validImages.length === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
              }`}>
                {validImages.map((img, idx) => (
                  <div
                    key={idx}
                    className={`cursor-pointer overflow-hidden relative group ${idx === 0 ? 'aspect-[4/3] sm:aspect-auto' : 'aspect-square sm:aspect-auto'}`}
                    onClick={() => { setCurrentImageIndex(idx); setIsLightboxOpen(true); }}
                  >
                    <img
                      src={img}
                      alt={`${business.name} - Image ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {idx === 0 && isVerified && !isInstitution && (
                      <img 
                        src={logoGold} 
                        alt="WTUCE" 
                        className="absolute top-3 right-3 w-16 h-16 sm:w-20 sm:h-20 object-contain opacity-90 pointer-events-none drop-shadow-lg"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 sm:grid-rows-2 gap-1 sm:h-[400px] lg:h-[480px] relative">
                {/* Large image - full width on mobile, left half on desktop */}
                <div 
                  className="col-span-2 sm:row-span-2 aspect-[4/3] sm:aspect-auto cursor-pointer overflow-hidden relative group"
                  onClick={() => { setCurrentImageIndex(0); setIsLightboxOpen(true); }}
                >
                  <img
                    src={validImages[0]}
                    alt={`${business.name} - Image 1`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {isVerified && !isInstitution && (
                    <img 
                      src={logoGold} 
                      alt="WTUCE" 
                      className="absolute top-3 right-3 w-16 h-16 sm:w-20 sm:h-20 object-contain opacity-90 pointer-events-none drop-shadow-lg"
                    />
                  )}
                </div>
                {/* Only render existing smaller images */}
                {[1, 2, 3, 4].filter(idx => validImages[idx]).map((idx) => (
                  <div
                    key={idx}
                    className="cursor-pointer overflow-hidden relative group aspect-square sm:aspect-auto"
                    onClick={() => { setCurrentImageIndex(idx); setIsLightboxOpen(true); }}
                  >
                    <img
                      src={validImages[idx]}
                      alt={`${business.name} - Image ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {idx === 4 && validImages.length > 5 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(0); setIsLightboxOpen(true); }}
                        className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-foreground text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md hover:bg-white transition-colors"
                      >
                        Voir les {validImages.length} photos
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {isValidatingImages && business.images && business.images.length > 0 && (
          <div className="mb-6 rounded-xl overflow-hidden bg-muted flex items-center justify-center h-[300px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Lightbox */}
        {validImages.length > 0 && (
          <ImageLightbox
            images={validImages}
            currentIndex={currentImageIndex}
            isOpen={isLightboxOpen}
            onClose={() => setIsLightboxOpen(false)}
            onPrevious={() => setCurrentImageIndex((prev) => prev === 0 ? validImages.length - 1 : prev - 1)}
            onNext={() => setCurrentImageIndex((prev) => prev === validImages.length - 1 ? 0 : prev + 1)}
          />
        )}

        {/* Anchor for "Réduire" scroll-back — just above the tabs */}
        <div id="description-anchor" className="scroll-mt-24" />

        {/* ===== TABS ===== */}
        <div className={`border-b mb-8 ${isVerified ? 'border-white/20' : 'border-border'}`}>
          <nav className="flex gap-6">
            {tabs.filter(t => t.show).map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  const anchor = document.getElementById('description-anchor');
                  if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? isVerified
                      ? 'border-gold text-gold'
                      : 'border-primary text-primary'
                    : isVerified
                      ? 'border-transparent text-white/60 hover:text-white'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ===== TAB CONTENT ===== */}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hook */}
              {(() => {
                const hook = language === 'ar' ? (business.hook_ar || business.hook_fr) : language === 'en' ? (business.hook_en || business.hook_fr) : business.hook_fr;
                if (!hook) return null;
                return (
                  <p className={`text-2xl md:text-3xl font-semibold italic leading-snug ${isVerified ? 'text-white' : 'text-foreground/80'}`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {hook}
                  </p>
                );
              })()}


              {/* Logo above description */}
              {business.logo_url && (
                <div className="flex justify-center mb-2">
                  <div
                    className="flex items-center justify-center rounded-xl overflow-hidden p-3"
                    style={
                      business.logo_bg === "white"
                        ? { backgroundColor: "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }
                        : business.logo_bg === "black"
                        ? { backgroundColor: "#000000" }
                        : {}
                    }
                  >
                    <img
                      src={business.logo_url}
                      alt={`Logo ${business.name}`}
                      className="object-contain"
                      style={{ maxWidth: "200px", maxHeight: "150px", width: "100%" }}
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              {localizedDescription && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => {
                        // Strip HTML tags for TTS
                        const plainText = localizedDescription.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                        const hook = language === 'ar' ? (business.hook_ar || business.hook_fr) : language === 'en' ? (business.hook_en || business.hook_fr) : business.hook_fr;
                        const fullText = `${business.name}. ${hook ? hook + '. ' : ''}${plainText}`;
                        ttsSpeak(fullText);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        ttsStatus === "playing"
                          ? "bg-gold/20 text-gold animate-pulse"
                          : ttsStatus === "loading"
                            ? "bg-gold/10 text-gold/70"
                            : isVerified
                              ? "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                              : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                      title={ttsStatus === "playing" ? "Arrêter la lecture" : "Lire à voix haute"}
                    >
                      {ttsStatus === "loading" ? (
                        <Loader className="h-3.5 w-3.5 animate-spin" />
                      ) : ttsStatus === "playing" ? (
                        <VolumeX className="h-3.5 w-3.5" />
                      ) : (
                        <Volume2 className="h-3.5 w-3.5" />
                      )}
                      {ttsStatus === "playing" ? "Arrêter" : ttsStatus === "loading" ? "Chargement…" : "Écouter"}
                    </button>
                  </div>
                  <DescriptionExpander
                    html={localizedDescription}
                    isVerified={isVerified}
                    anchorId="description-anchor"
                    collapsedHeight={
                      (business.languages && business.languages.length > 0) ||
                      (business.show_opening_hours && business.opening_hours)
                        ? 550
                        : 300
                    }
                  />
                </div>
              )}


              {((business.pdf_url && !isValidatingPdf && isPdfValid) || (business.pdf_2_url && !isValidatingPdf2 && isPdf2Valid) || (business.pdf_3_url && !isValidatingPdf3 && isPdf3Valid)) && (
                <Card>
                  <CardContent className="p-4">
                    <details className="group">
                      <summary className="flex items-center justify-between cursor-pointer list-none">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Documents annexes
                        </h2>
                        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="space-y-6 mt-4">
                        {business.pdf_url && !isValidatingPdf && isPdfValid && (
                          <div className="space-y-3">
                            {business.pdf_name && (
                              <h3 className="font-medium">{business.pdf_name}</h3>
                            )}
                            <div className="aspect-[3/4] w-full rounded-lg overflow-hidden border bg-muted">
                              <iframe src={`${business.pdf_url}#toolbar=0&navpanes=0`} className="w-full h-full" title={business.pdf_name || "Document PDF 1"} />
                            </div>
                            <a href={business.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                              <Download className="h-4 w-4" />
                              Télécharger
                            </a>
                          </div>
                        )}
                        {business.pdf_2_url && !isValidatingPdf2 && isPdf2Valid && (
                          <div className="space-y-3">
                            {business.pdf_2_name && (
                              <h3 className="font-medium">{business.pdf_2_name}</h3>
                            )}
                            <div className="aspect-[3/4] w-full rounded-lg overflow-hidden border bg-muted">
                              <iframe src={`${business.pdf_2_url}#toolbar=0&navpanes=0`} className="w-full h-full" title={business.pdf_2_name || "Document PDF 2"} />
                            </div>
                            <a href={business.pdf_2_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                              <Download className="h-4 w-4" />
                              Télécharger
                            </a>
                          </div>
                        )}
                        {business.pdf_3_url && !isValidatingPdf3 && isPdf3Valid && (
                          <div className="space-y-3">
                            {business.pdf_3_name && (
                              <h3 className="font-medium">{business.pdf_3_name}</h3>
                            )}
                            <div className="aspect-[3/4] w-full rounded-lg overflow-hidden border bg-muted">
                              <iframe src={`${business.pdf_3_url}#toolbar=0&navpanes=0`} className="w-full h-full" title={business.pdf_3_name || "Document PDF 3"} />
                            </div>
                            <a href={business.pdf_3_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                              <Download className="h-4 w-4" />
                              Télécharger
                            </a>
                          </div>
                        )}
                      </div>
                    </details>
                  </CardContent>
                </Card>
              )}

              {/* Sous-catégories */}
              {categoriesWithResults.length > 0 && (
                <div>
                  <p className={`text-base mb-3 ${isVerified ? 'text-white/60' : 'text-muted-foreground'}`} style={{ fontFamily: "'Raleway', sans-serif" }}>
                    {business.city
                      ? `Cliquez ci-dessous pour voir tous les établissements similaires à ${business.city}.`
                      : "Cliquez ci-dessous pour voir tous les établissements similaires :"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categoriesWithResults.map((cat, index) => (
                      <Link
                        key={index}
                        to={business.city ? `/subcategory/${encodeURIComponent(cat)}?city=${encodeURIComponent(business.city)}` : `/subcategory/${encodeURIComponent(cat)}`}
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          isVerified
                            ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                            : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
                        }`}
                      >
                        {cat}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Establishments moved below main */}

              {/* Services removed - now in dedicated tab */}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions Card */}
              {(business.phone || business.whatsapp || business.skype || business.email || business.website || business.menu_url || business.reserve_now_url || business.online_shop_url) && <Card className={isVerified ? 'bg-white/10 border-white/20' : ''}>
                <CardContent className="p-5 space-y-4">
                  {/* Contact links */}
                  {business.phone && (
                    <a href={`tel:${cleanPhone(business.phone)}`} className={`flex items-center gap-3 font-semibold transition-colors ${isVerified ? "text-gold hover:text-gold/80" : "text-foreground hover:text-primary"}`}>
                      <Phone className="h-5 w-5" />
                      {business.phone}
                    </a>
                  )}
                  {business.whatsapp && (
                    <a href={whatsappUrl(business.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 font-bold hover:opacity-80 transition-opacity" style={{ color: "#25D366" }}>
                      <MessageCircle className="h-5 w-5" />
                      WhatsApp
                    </a>
                  )}
                  {business.skype && (
                    <a href={`skype:${business.skype}?chat`} className="flex items-center gap-3 font-semibold transition-colors text-[#00AFF0] hover:opacity-80">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.069 18.874c-4.023 0-5.82-1.979-5.82-3.464 0-.765.561-1.296 1.333-1.296 1.723 0 1.273 2.477 4.487 2.477 1.641 0 2.55-.895 2.55-1.811 0-.551-.269-1.16-1.354-1.429l-3.576-.895c-2.88-.724-3.403-2.286-3.403-3.751 0-3.047 2.861-4.191 5.549-4.191 2.471 0 5.393 1.373 5.393 3.199 0 .784-.688 1.24-1.453 1.24-1.469 0-1.198-2.037-4.164-2.037-1.469 0-2.292.664-2.292 1.617s1.153 1.258 2.157 1.487l2.637.587c2.891.649 3.624 2.346 3.624 3.944 0 2.476-1.902 4.324-5.722 4.324"/>
                      </svg>
                      Skype
                    </a>
                  )}
                  {business.email && (
                    <a href={`mailto:${business.email}`} className={`flex items-center gap-3 font-semibold transition-colors min-w-0 ${isVerified ? "text-white/70 hover:text-white" : "text-foreground hover:text-primary"}`}>
                      <Mail className="h-5 w-5 flex-shrink-0" />
                      <span className="truncate">{business.email}</span>
                    </a>
                  )}

                  {/* Divider */}
                  {(business.phone || business.whatsapp || business.email) && (business.website || business.reserve_now_url || business.online_shop_url) && (
                    <hr className={isVerified ? 'border-white/20' : 'border-border'} />
                  )}

                  {/* Action links */}
                  {business.website && (
                    <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 font-semibold transition-colors ${isVerified ? "text-gold hover:text-gold/80" : "text-primary hover:text-primary/80"}`}>
                      <Globe className="h-5 w-5" />
                      Visiter le site web
                    </a>
                  )}
                  {business.menu_url && (
                    <a href={business.menu_url.startsWith('http') ? business.menu_url : `https://${business.menu_url}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 font-semibold transition-colors ${isVerified ? "text-gold hover:text-gold/80" : "text-primary hover:text-primary/80"}`}>
                      <FileText className="h-5 w-5" />
                      Menu
                    </a>
                  )}
                  {business.reserve_now_url && (
                    <a href={business.reserve_now_url.startsWith('http') ? business.reserve_now_url : `https://${business.reserve_now_url}`} target="_blank" rel="noopener noreferrer" className="block w-full bg-primary text-primary-foreground text-center py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                      <CalendarCheck className="h-5 w-5 inline mr-2" />
                      Réserver maintenant
                    </a>
                  )}
                  {business.online_shop_url && (
                    <a href={business.online_shop_url.startsWith('http') ? business.online_shop_url : `https://${business.online_shop_url}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 font-semibold transition-colors ${isVerified ? "text-gold hover:text-gold/80" : "text-primary hover:text-primary/80"}`}>
                      <ShoppingBag className="h-5 w-5" />
                      Boutique en ligne
                    </a>
                  )}
                </CardContent>
              </Card>}

              {/* Languages spoken */}
              {business.languages && business.languages.length > 0 && (
                <Card className={isVerified ? "bg-verified-card border-gold/20" : ""}>
                  <CardContent className="p-4">
                    <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isVerified ? 'text-white' : ''}`}>
                      <Globe className="h-4 w-4" />
                      Langues parlées
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const LANG_MAP: Record<string, { flag: string; label: string; isText?: boolean }> = {
                          "ar":     { flag: "🇲🇦", label: "AR" },
                          "ar-std": { flag: "ض",   label: "AR", isText: true },
                          "fr":     { flag: "🇫🇷", label: "FR" },
                          "en":     { flag: "🇬🇧", label: "EN" },
                          "es":     { flag: "🇪🇸", label: "ES" },
                          "de":     { flag: "🇩🇪", label: "DE" },
                          "it":     { flag: "🇮🇹", label: "IT" },
                          "pt":     { flag: "🇵🇹", label: "PT" },
                          "nl":     { flag: "🇳🇱", label: "NL" },
                          "zh":     { flag: "🇨🇳", label: "ZH" },
                          "ja":     { flag: "🇯🇵", label: "JA" },
                          "ru":     { flag: "🇷🇺", label: "RU" },
                        };
                        // Map full language names to codes for robustness
                        const NAME_TO_CODE: Record<string, string> = {
                          "arabe": "ar", "arabic": "ar", "العربية": "ar",
                          "français": "fr", "francais": "fr", "french": "fr",
                          "anglais": "en", "english": "en",
                          "espagnol": "es", "spanish": "es",
                          "allemand": "de", "german": "de",
                          "italien": "it", "italian": "it",
                          "portugais": "pt", "portuguese": "pt",
                          "néerlandais": "nl", "neerlandais": "nl", "dutch": "nl",
                          "chinois": "zh", "chinese": "zh",
                          "japonais": "ja", "japanese": "ja",
                          "russe": "ru", "russian": "ru",
                        };
                        // Deduplicate by resolved code
                        const seen = new Set<string>();
                        return business.languages!.filter((raw) => {
                          const resolved = LANG_MAP[raw] ? raw : NAME_TO_CODE[raw.toLowerCase()] || raw;
                          if (seen.has(resolved)) return false;
                          seen.add(resolved);
                          return true;
                        }).map((raw) => {
                          const resolved = LANG_MAP[raw] ? raw : NAME_TO_CODE[raw.toLowerCase()] || raw;
                          const info = LANG_MAP[resolved] || { flag: raw, label: raw };
                          return (
                            <div
                              key={raw}
                              className={`flex flex-col items-center gap-0.5 py-1.5 px-2.5 rounded-lg border text-[10px] font-medium ${
                                isVerified
                                  ? "bg-gold/20 border-gold/40 text-gold"
                                  : "bg-primary/10 border-primary/20 text-primary"
                              }`}
                            >
                              <span className={`leading-none ${info.isText ? "text-base font-bold" : "text-lg"}`}>{info.flag}</span>
                              {info.label}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Opening Hours */}
              {business.show_opening_hours !== false && (business.is_open_24h || (business.opening_hours && Object.keys(business.opening_hours).length > 0)) && (() => {
                const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                const dayNames: { [key: string]: string } = { monday: "Lun", tuesday: "Mar", wednesday: "Mer", thursday: "Jeu", friday: "Ven", saturday: "Sam", sunday: "Dim" };
                const displayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

                // Determine if currently open
                const getOpenStatus = (): { isOpen: boolean; label: string } => {
                  if (business.is_open_24h) return { isOpen: true, label: language === "en" ? "Open 24/7" : language === "ar" ? "مفتوح 24/7" : "Ouvert 24h/24" };

                  // Check vacation dates
                  if (business.vacation_dates && business.vacation_dates.length > 0) {
                    const today = new Date().toISOString().split("T")[0];
                    for (const vd of business.vacation_dates) {
                      if (today >= vd.start_date && today <= vd.end_date) {
                        return { isOpen: false, label: language === "en" ? "On vacation" : language === "ar" ? "في إجازة" : "En vacances" };
                      }
                    }
                  }

                  const hours = business.opening_hours as OpeningHours | null;
                  if (!hours) return { isOpen: false, label: "" };

                  const now = new Date();
                  const todayKey = dayOrder[now.getDay()] as keyof OpeningHours;
                  const dh = hours[todayKey];

                  if (!dh || dh.closed) return { isOpen: false, label: language === "en" ? "Closed" : language === "ar" ? "مغلق" : "Fermé" };
                  if (!dh.open || !dh.close) return { isOpen: false, label: "" };

                  const open = isCurrentlyOpenCheck(dh);

                  return {
                    isOpen: open,
                    label: open
                      ? (language === "en" ? "Open now" : language === "ar" ? "مفتوح الآن" : "Ouvert")
                      : (language === "en" ? "Closed" : language === "ar" ? "مغلق" : "Fermé"),
                  };
                };

                const status = getOpenStatus();
                const statusBadge = status.label ? (
                  <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                    status.isOpen
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {status.label}
                  </span>
                ) : null;

                if (business.is_open_24h) {
                  return (
                    <Card className={isVerified ? 'bg-white/10 border-white/20' : ''}>
                      <CardContent className="p-5">
                        <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isVerified ? 'text-white' : ''}`}>
                          <Clock className="h-4 w-4" />
                          {language === "en" ? "Hours" : language === "ar" ? "ساعات العمل" : "Horaires"}
                          {statusBadge}
                        </h3>
                        <div className={`text-sm font-medium ${isVerified ? 'text-gold' : 'text-primary'}`}>
                          {language === "en" ? "Open 24/7" : language === "ar" ? "مفتوح 24/7" : "Ouvert 24h/24"}
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
                const hours = business.opening_hours as OpeningHours;
                const hasAnyHours = displayOrder.some(day => { const dh = hours[day as keyof OpeningHours]; return dh && (dh.closed || (dh.open && dh.close)); });
                if (!hasAnyHours) return null;

                const now = new Date();
                const todayKey = dayOrder[now.getDay()];

                return (
                  <Card className={isVerified ? 'bg-white/10 border-white/20' : ''}>
                    <CardContent className="p-5">
                      <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isVerified ? 'text-white' : ''}`}>
                        <Clock className="h-4 w-4" />
                        {language === "en" ? "Hours" : language === "ar" ? "ساعات العمل" : "Horaires"}
                        {statusBadge}
                      </h3>
                      <div className="space-y-1.5">
                        {displayOrder.map(day => {
                          const dh = hours[day as keyof OpeningHours];
                          if (!dh) return null;
                          const isToday = day === todayKey;
                          return (
                            <div key={day} className={`flex justify-between text-sm ${isToday ? 'font-bold' : ''} ${isVerified ? 'text-white/80' : ''}`}>
                              <span className={`font-medium ${isToday && !isVerified ? 'text-foreground' : ''}`}>
                                {dayNames[day]}{isToday ? ' ●' : ''}
                              </span>
                              <span className={isVerified ? 'text-white/60' : 'text-muted-foreground'}>
                                {formatDayHoursDisplay(dh, { language })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Vacation Dates */}
              {business.vacation_dates && business.vacation_dates.length > 0 && (
                <Card className={isVerified ? 'bg-white/10 border-white/20' : ''}>
                  <CardContent className="p-5">
                    <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isVerified ? 'text-white' : ''}`}>
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Fermetures
                    </h3>
                    <div className="space-y-2">
                      {business.vacation_dates.map((vd, idx) => (
                        <div key={idx} className="text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-foreground">
                          Du {format(parseISO(vd.start_date), "d MMM yyyy", { locale: fr })} au {format(parseISO(vd.end_date), "d MMM yyyy", { locale: fr })}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Social Media */}
              {(business.facebook_url || business.instagram_url || business.linkedin_url || business.youtube_url || business.tiktok_url || business.twitter_url || business.pinterest_url || business.vimeo_url) && (
                <Card className={isVerified ? 'bg-white/10 border-white/20' : ''}>
                  <CardContent className="p-5">
                    <h3 className={`font-semibold mb-3 ${isVerified ? 'text-white' : ''}`}>Réseaux sociaux</h3>
                    <div className="flex flex-wrap gap-2">
                      {business.facebook_url && (
                        <a href={business.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-full bg-[#1877F2] text-white hover:opacity-80 transition-opacity" title="Facebook"><Facebook className="h-4 w-4" /></a>
                      )}
                      {business.instagram_url && (
                        <a href={business.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white hover:opacity-80 transition-opacity" title="Instagram"><Instagram className="h-4 w-4" /></a>
                      )}
                      {business.linkedin_url && (
                        <a href={business.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-full bg-[#0A66C2] text-white hover:opacity-80 transition-opacity" title="LinkedIn"><Linkedin className="h-4 w-4" /></a>
                      )}
                      {business.youtube_url && (
                        <a href={business.youtube_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-full bg-[#FF0000] text-white hover:opacity-80 transition-opacity" title="YouTube"><Youtube className="h-4 w-4" /></a>
                      )}
                      {business.tiktok_url && (
                        <a href={business.tiktok_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-full bg-black text-white hover:opacity-80 transition-opacity" title="TikTok">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
                        </a>
                      )}
                      {business.twitter_url && (
                        <a href={business.twitter_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-full bg-black text-white hover:opacity-80 transition-opacity" title="X">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </a>
                      )}
                      {business.pinterest_url && (
                        <a href={business.pinterest_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-full bg-[#E60023] text-white hover:opacity-80 transition-opacity" title="Pinterest">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>
                        </a>
                      )}
                      {business.vimeo_url && (
                        <a href={business.vimeo_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-full bg-[#1AB7EA] text-white hover:opacity-80 transition-opacity" title="Vimeo">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797l-.013.01z"/></svg>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Booking platforms */}
              {(business.booking_url || business.tripadvisor_url || business.airbnb_url || business.hotels_com_url || business.trivago_url) && (
                <Card className={isVerified ? 'bg-white/10 border-white/20' : ''}>
                  <CardContent className="p-5">
                    <h3 className={`font-semibold mb-3 ${isVerified ? 'text-white' : ''}`}>Plateformes de réservation</h3>
                    <div className="flex flex-wrap gap-2">
                      {business.booking_url && (
                        <a href={business.booking_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-full bg-[#003580] text-white hover:opacity-80 transition-opacity" title="Booking.com">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2.273 0v24h10.715c6.066 0 8.739-3.098 8.739-7.133 0-2.829-1.558-5.203-4.107-6.174v-.078c1.908-.893 3.136-2.789 3.136-5.066C20.756 2.36 18.238 0 13.183 0H2.273zm5.882 4.344h3.885c2.127 0 3.156.975 3.156 2.477 0 1.658-1.263 2.593-3.506 2.593H8.155V4.344zm0 9.16h4.274c2.594 0 3.786 1.092 3.786 2.789 0 1.736-1.23 2.672-3.786 2.672H8.155v-5.461z"/></svg>
                        </a>
                      )}
                      {business.hotels_com_url && (
                        <a href={business.hotels_com_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-full bg-[#D32F2F] text-white hover:opacity-80 transition-opacity" title="Hotels.com">
                          <span className="text-xs font-bold">H</span>
                        </a>
                      )}
                      {business.trivago_url && (
                        <a href={business.trivago_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-full bg-[#007FAD] text-white hover:opacity-80 transition-opacity" title="Trivago">
                          <span className="text-xs font-bold">T</span>
                        </a>
                      )}
                      {business.tripadvisor_url && (
                        <a href={business.tripadvisor_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-full bg-[#00AF87] text-white hover:opacity-80 transition-opacity" title="TripAdvisor">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.006 4.295c-2.67 0-5.338.784-7.645 2.353H0l1.963 2.135a5.997 5.997 0 0 0 4.04 10.43 5.976 5.976 0 0 0 4.075-1.6L12 19.705l1.922-2.09a5.972 5.972 0 0 0 4.075 1.598 5.997 5.997 0 0 0 4.04-10.43L24 6.648h-4.35a13.573 13.573 0 0 0-7.644-2.353z"/></svg>
                        </a>
                      )}
                      {business.airbnb_url && (
                        <a href={business.airbnb_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-full bg-[#FF5A5F] text-white hover:opacity-80 transition-opacity" title="Airbnb">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.001 18.275c-.768-1.041-1.497-2.093-2.209-3.155-.717-1.069-1.39-2.164-1.974-3.31-.578-1.138-1.05-2.313-1.05-3.503 0-1.394.575-2.63 1.447-3.501A4.94 4.94 0 0 1 12 3.374c1.353 0 2.63.521 3.567 1.432a4.94 4.94 0 0 1 1.449 3.5c0 1.19-.471 2.366-1.05 3.503-.585 1.147-1.257 2.241-1.974 3.31-.712 1.063-1.441 2.114-2.209 3.155l-.393.521-.389-.52z"/></svg>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          </>
        )}

        {/* EXPERIENCES TAB */}
        {activeTab === 'experiences' && destinations.length > 0 && (
          <div className="space-y-8">
            {/* Global hook & description from the business */}
            {(businessDestinationHook || businessDestinationDescription) && (
              <div className="mb-6">
                {businessDestinationHook && (
                  <h2 className={`text-2xl md:text-3xl font-semibold italic leading-snug mb-4 ${isVerified ? 'text-white' : 'text-foreground/80'}`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {businessDestinationHook}
                  </h2>
                )}
                {businessDestinationDescription && (
                  <div
                    className={`prose max-w-none text-sm leading-relaxed prose-josefin-headings ${isVerified ? 'text-white/70 prose-invert' : 'text-muted-foreground'}`}
                    dangerouslySetInnerHTML={{ __html: businessDestinationDescription }}
                  />
                )}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {destinations.map((dest) => {
                const destName = language === 'ar' ? (dest.name_ar || dest.name_fr) : language === 'en' ? (dest.name_en || dest.name_fr) : dest.name_fr;
                return (
                  <Card key={dest.id} className={`overflow-hidden ${isVerified ? 'bg-white/10 border-white/20' : ''}`}>
                    {dest.image_url && (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={dest.image_url}
                          alt={destName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-5 space-y-3">
                      <h3 className={`text-lg font-bold ${isVerified ? 'text-white' : 'text-foreground'}`}>
                        {destName}
                      </h3>
                      {dest.hook && (
                        <p className={`text-sm italic ${isVerified ? 'text-gold' : 'text-primary'}`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          {dest.hook}
                        </p>
                      )}
                      {dest.description && (
                        <div
                          className={`prose prose-sm max-w-none text-sm leading-relaxed prose-josefin-headings ${isVerified ? 'text-white/70 prose-invert' : 'text-muted-foreground'}`}
                          dangerouslySetInnerHTML={{ __html: dest.description }}
                        />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* VIDEO TAB */}
        {activeTab === 'video' && business.video_1_url && (() => {
          const embedData = getEmbedUrl(business.video_1_url);
          if (!embedData) return null;
          return (
            <div className="flex justify-center">
              <Card className="overflow-hidden bg-black border-black max-w-2xl w-full">
                <div className="w-full relative flex justify-center" style={{ maxHeight: '80vh' }}>
                  {embedData.type === 'video' ? (
                    <>
                      <video
                        src={embedData.url}
                        controls
                        className="max-w-full max-h-[80vh] object-contain mx-auto"
                        onPlay={() => setIsVideoPlaying(true)}
                        onPause={() => setIsVideoPlaying(false)}
                        onEnded={() => setIsVideoPlaying(false)}
                      />
                      {!isVideoPlaying && (
                        <div
                          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-opacity duration-300"
                          onClick={(e) => {
                            const video = (e.currentTarget.previousElementSibling) as HTMLVideoElement;
                            if (video) video.play();
                          }}
                        >
                          <div className="rounded-full bg-white/90 p-4 shadow-lg">
                            <Play className="h-10 w-10 text-black fill-black" />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <iframe
                      src={embedData.url}
                      className={embedData.type === 'iframe' && embedData.url.includes('instagram.com') ? "w-full min-h-[600px]" : "w-full aspect-video"}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Vidéo de présentation"
                    />
                  )}
                </div>
              </Card>
            </div>
          );
        })()}

        {/* VIRTUAL TOUR (MATTERPORT) TAB */}
        {activeTab === 'virtual-tour' && business.matterport_url && (
          <div className="flex justify-center">
            <Card className="overflow-hidden max-w-4xl w-full">
              <div className="w-full aspect-[4/3]">
                <iframe
                  src={business.matterport_url}
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="fullscreen; xr-spatial-tracking"
                  title="Visite virtuelle 3D"
                />
              </div>
            </Card>
          </div>
        )}

        {/* SERVICES TAB */}
        {activeTab === 'services' && (
          <div className="max-w-2xl">
            
            {groupedServices.length > 0 ? (
              <div className="space-y-3">
                {groupedServices.map((group) => {
                  const isOpen = openGroups.has(group.subcategoryName);
                  const showHeader = groupedServices.length > 1 || group.description;
                  return (
                    <div key={group.subcategoryName} className={`rounded-xl overflow-hidden ${isVerified ? 'bg-white/10' : 'bg-card border border-border'}`}>
                      {showHeader && (
                        <button
                          onClick={() => {
                            setOpenGroups(prev => {
                              const next = new Set(prev);
                              if (next.has(group.subcategoryName)) next.delete(group.subcategoryName);
                              else next.add(group.subcategoryName);
                              return next;
                            });
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${isVerified ? 'hover:bg-white/5' : 'hover:bg-muted/50'}`}
                        >
                          <div className="flex items-center gap-2">
                            {group.icon && (
                              <DynamicIcon name={group.icon} className={`h-5 w-5 ${isVerified ? 'text-gold' : 'text-primary'}`} />
                            )}
                            <span className={`font-semibold ${isVerified ? 'text-white' : 'text-foreground'}`}>
                              {group.subcategoryName}
                            </span>
                            <span className={`text-xs ${isVerified ? 'text-white/50' : 'text-muted-foreground'}`}>
                              ({group.services.length})
                            </span>
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isVerified ? 'text-white/60' : 'text-muted-foreground'} ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                      {(isOpen || !showHeader) && (
                        <div className={`px-4 pb-4 ${showHeader ? 'pt-0' : 'pt-4'}`}>
                          {group.description && (
                            <div className={`mb-3 text-sm leading-relaxed prose max-w-none prose-josefin-headings ${isVerified ? 'text-white/70 prose-headings:text-white prose-strong:text-white' : 'text-muted-foreground prose-headings:text-foreground'}`} dangerouslySetInnerHTML={{ __html: group.description }} />
                          )}
                          <ul className="space-y-2">
                            {group.services.map((service, index) => (
                              <ServiceListItem key={index} service={service} currentBusinessId={business.id} city={business.city} />
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : business.services && business.services.length > 0 ? (
              <ul className="space-y-3 text-foreground">
                {[...business.services].sort((a, b) => a.localeCompare(b, 'fr')).map((service, index) => (
                  <ServiceListItem key={index} service={service} currentBusinessId={business.id} city={business.city} />
                ))}
              </ul>
            ) : (
              <p className={`text-sm ${isVerified ? 'text-white/60' : 'text-muted-foreground'}`}>Aucun service renseigné pour cet établissement.</p>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="max-w-2xl">
            {/* Overall rating */}
            {avgOn20 !== null && (
              <div className="flex items-baseline gap-4 mb-8">
                <span className={`font-bold text-5xl italic ${isVerified ? 'text-gold' : 'text-primary'}`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {avgOn20}/20
                </span>
                {isVerified && <img src={logoGold} alt="WTUCE Vérifié" className="w-16 h-14 object-contain" />}
                {totalReviewCount > 0 && (
                  <span className={`text-lg ${isVerified ? 'text-white/70' : 'text-muted-foreground'}`}>
                    sur {totalReviewCount.toLocaleString('fr-FR')} avis
                  </span>
                )}
              </div>
            )}

            {/* Platform breakdown */}
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.label} className={`flex items-center gap-4 p-4 rounded-xl ${isVerified ? 'bg-white/10' : 'bg-card border border-border'}`}>
                  {r.label === 'TripAdvisor' && (
                    <img src={tripadvisorLogo} alt="TripAdvisor" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  )}
                  {r.label === 'Google' && (
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    </div>
                  )}
                  {r.label === 'Restaurant Guru' && (
                    <img src={restaurantGuruLogo} alt="Restaurant Guru" className="w-10 h-10 rounded-full object-contain flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className={`font-semibold ${isVerified ? 'text-white' : 'text-foreground'}`}>{r.label}</div>
                    <div className={`text-sm ${isVerified ? 'text-white/60' : 'text-muted-foreground'}`}>
                      <span className={`font-bold ${isVerified ? 'text-gold' : 'text-primary'}`}>{r.rating}/5</span> · {r.count.toLocaleString('fr-FR')} avis
                    </div>
                  </div>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className={`text-sm font-semibold ${isVerified ? 'text-gold hover:text-gold/80' : 'text-primary hover:text-primary/80'} transition-colors`}>
                      Voir les avis ↗
                    </a>
                  )}
                </div>
              ))}

              {/* Additional review links not in reviews array */}
              {business.tripadvisor_review_url && !reviews.find(r => r.label === 'TripAdvisor') && (
                <a href={business.tripadvisor_review_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-4 p-4 rounded-xl ${isVerified ? 'bg-white/10' : 'bg-card border border-border'}`}>
                  <img src={tripadvisorLogo} alt="TripAdvisor" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  <span className={`font-semibold ${isVerified ? 'text-white' : 'text-foreground'}`}>TripAdvisor Avis ↗</span>
                </a>
              )}
              {business.google_reviews_url && !reviews.find(r => r.label === 'Google') && (
                <a href={business.google_reviews_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-4 p-4 rounded-xl ${isVerified ? 'bg-white/10' : 'bg-card border border-border'}`}>
                  <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  </div>
                  <span className={`font-semibold ${isVerified ? 'text-white' : 'text-foreground'}`}>Google Avis ↗</span>
                </a>
              )}
              {business.restaurant_guru_url && !reviews.find(r => r.label === 'Restaurant Guru') && (
                <a href={business.restaurant_guru_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-4 p-4 rounded-xl ${isVerified ? 'bg-white/10' : 'bg-card border border-border'}`}>
                  <img src={restaurantGuruLogo} alt="Restaurant Guru" className="w-10 h-10 rounded-full object-contain flex-shrink-0" />
                  <span className={`font-semibold ${isVerified ? 'text-white' : 'text-foreground'}`}>Restaurant Guru ↗</span>
                </a>
              )}
            </div>

            {/* Review texts */}
            {reviewTexts.length > 0 && (
              <div className="mt-8">
                <h3 className={`text-lg font-semibold mb-4 ${isVerified ? 'text-white' : 'text-foreground'}`}>
                  Ce que disent les clients
                </h3>
                <div className="space-y-4">
                  {reviewTexts.map((review, idx) => (
                    <div key={idx} className={`p-4 rounded-xl ${isVerified ? 'bg-white/10' : 'bg-card border border-border'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {review.rating && (
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${i < review.rating! ? 'fill-amber-400 text-amber-400' : isVerified ? 'text-white/20' : 'text-muted-foreground/30'}`}
                              />
                            ))}
                          </div>
                        )}
                        <span className={`text-sm font-medium ${isVerified ? 'text-white' : 'text-foreground'}`}>
                          {review.author_name || 'Anonyme'}
                        </span>
                        {review.relative_time && (
                          <span className={`text-xs ${isVerified ? 'text-white/40' : 'text-muted-foreground'}`}>
                            · {review.relative_time}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm leading-relaxed ${isVerified ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {(review as any).text_fr || review.text}
                      </p>
                      <div className="mt-2">
                        <Badge variant="outline" className={`text-[10px] ${isVerified ? 'border-white/20 text-white/50' : ''}`}>
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

        {/* LOCATION TAB */}
        {activeTab === 'location' && (
          <div className="w-full space-y-6">
            <GoogleMapEmbed
              address={business.address || (business.neighborhood ? `${business.neighborhood}, ${business.city}` : `${business.city}, ${business.region}`)}
              businessName={business.name}
              latitude={business.latitude}
              longitude={business.longitude}
              googleMapsUrl={business.google_maps_url}
            />
            
            <div className={`space-y-3 ${isVerified ? 'text-white' : ''}`}>
              {business.address && (
                <div className="flex items-start gap-3">
                  <MapPin className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isVerified ? 'text-gold' : 'text-muted-foreground'}`} />
                  <span>{business.address}</span>
                </div>
              )}
              <div className="flex items-start gap-3">
                <MapPin className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isVerified ? 'text-gold' : 'text-muted-foreground'}`} />
                <span>
                  <Link to={`/city/${encodeURIComponent(business.city)}`} className={`font-bold underline underline-offset-2 ${isVerified ? 'text-gold hover:text-gold/80' : 'text-primary hover:text-foreground'} transition-colors`}>
                    {business.city}
                  </Link>
                  {business.neighborhood && (
                    <>, <Link to={`/neighborhood/${encodeURIComponent(business.neighborhood)}?city=${encodeURIComponent(business.city)}`} className={`font-bold underline underline-offset-2 ${isVerified ? 'text-gold hover:text-gold/80' : 'text-primary hover:text-foreground'} transition-colors`}>
                      {business.neighborhood}
                    </Link></>
                  )}
                  , {business.region}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Related Establishments - full width above footer */}
      {(business.kp_regroupement || (business as any).kp_regroupement_2) && (
        <div className="container mx-auto px-4 lg:px-8 pb-12 max-w-5xl">
          <RelatedEstablishments currentBusinessId={business.id} kpRegroupement={business.kp_regroupement || ''} kpRegroupement2={(business as any).kp_regroupement_2 || ''} isVerified={isVerified} />
        </div>
      )}

      <Footer variant={isVerified ? "verified" : "default"} />
    </div>
  );
};

export default BusinessDetail;
