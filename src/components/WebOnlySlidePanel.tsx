import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, ShoppingBag, MapPin, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Info, Star } from "lucide-react";
import { formatDayHours as formatDayHoursDisplay } from "@/lib/formatOpeningHours";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import { supabase } from "@/integrations/supabase/client";
import MapBusinessInfoCard from "@/components/MapBusinessInfoCard";
import { useLanguage } from "@/contexts/LanguageContext";
import ShareButton from "@/components/ShareButton";
import BookmarkButton from "@/components/BookmarkButton";
import { Skeleton } from "@/components/ui/skeleton";

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
  turc: "🇹🇷", turkish: "🇹🇷", tr: "🇹🇷",
  hindi: "🇮🇳", hi: "🇮🇳",
};

const getLangFlag = (lang: string) => {
  const key = lang.toLowerCase().trim();
  return LANG_FLAGS[key] || "🌐";
};

interface WebOnlySlidePanelProps {
  businessId: string;
  onClose: () => void;
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
  languages: string[] | null;
  opening_hours: unknown;
  show_opening_hours: boolean | null;
  is_open_24h: boolean;
  google_rating: number | null;
  google_review_count: number | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
}

interface WebOnlyData {
  description: string | null;
  videos: string[] | null;
  images: string[] | null;
}

const WebOnlySlidePanel = ({ businessId, onClose }: WebOnlySlidePanelProps) => {
  const { language } = useLanguage();
  const [business, setBusiness] = useState<WebOnlyBusiness | null>(null);
  const [webOnlyData, setWebOnlyData] = useState<WebOnlyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(true);
  const [showDirections, setShowDirections] = useState(false);
  const [directionsMode, setDirectionsMode] = useState<"walking" | "driving">("walking");
  const [userOrigin, setUserOrigin] = useState<string | null>(null);
  const [showInfoCard, setShowInfoCard] = useState(true);

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

  // Reset state when switching business
  useEffect(() => {
    setShowDirections(false);
    setCurrentMediaIndex(0);
    setDescExpanded(true);
  }, [businessId]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [bizRes, woRes] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, slug, logo_url, logo_bg, images, city, neighborhood, address, latitude, longitude, website, whatsapp, online_shop_url, google_maps_url, phone, skype, languages, opening_hours, show_opening_hours, is_open_24h, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count")
          .eq("id", businessId)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("business_web_only")
          .select("description, videos, images")
          .eq("business_id", businessId)
          .maybeSingle(),
      ]);

      setBusiness(bizRes.data as WebOnlyBusiness | null);
      setWebOnlyData(woRes.data as WebOnlyData | null);
      setIsLoading(false);
    };
    fetchData();
  }, [businessId]);

  const shopUrl = business?.online_shop_url || business?.website || null;
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

  const getVideoEmbedLocal = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
    if (ytMatch) {
      return { type: "youtube" as const, embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&rel=0&controls=1&modestbranding=1` };
    }
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return { type: "vimeo" as const, embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1` };
    }
    const bunnyMatch = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([\w-]+)/);
    if (bunnyMatch) {
      return { type: "bunny" as const, embedUrl: `https://iframe.mediadelivery.net/embed/${bunnyMatch[1]}/${bunnyMatch[2]}?autoplay=true&preload=true&loop=false&responsive=true` };
    }
    return { type: "file" as const, embedUrl: url };
  };

  const videoInfo = currentMedia?.kind === "video" ? getVideoEmbedLocal(currentMedia.url) : null;

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
              <video
                key={currentMedia.url}
                src={videoInfo.embedUrl}
                autoPlay
                loop
                playsInline
                controls
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <iframe
                key={currentMedia.url}
                src={videoInfo.embedUrl}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                frameBorder="0"
                style={{ border: 0 }}
              />
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

        {/* Left / Right arrows — desktop/tablet: centered on media */}
        {totalMedia > 1 && (
          <>
            <button
              onClick={() => goMedia(-1)}
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center text-white hover:bg-black/60 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => goMedia(1)}
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center text-white hover:bg-black/60 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Overlaid content — leave bottom 3rem free on mobile for video controls */}
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
          {/* Media counter + arrows on mobile */}
          {totalMedia > 1 && (
            <div className="flex items-center justify-center gap-3 pb-4 pointer-events-auto">
              <button
                onClick={() => goMedia(-1)}
                className="md:hidden w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-white/80 text-xs font-medium bg-black/30 rounded-full px-3 py-1">
                {safeIndex + 1} / {totalMedia}
              </span>
              <button
                onClick={() => goMedia(1)}
                className="md:hidden w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Languages floating right — upper half */}
          {languages.length > 0 && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 md:right-3 md:top-[15%] md:translate-y-0 z-20 flex flex-col items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full py-2 px-1.5">
              {languages.map((lang, i) => (
                <span key={i} className="text-base leading-none" title={lang}>
                  {getLangFlag(lang)}
                </span>
              ))}
            </div>
          )}

          {/* Centered content block */}
          <div className="flex-1 flex flex-col items-center overflow-hidden min-h-0 gap-3">
              {/* Logo + name — always visible */}
              <div className="w-[95%] md:w-[90%] rounded-2xl bg-black/40 backdrop-blur-sm px-4 py-3 md:px-6 md:py-4 flex items-end gap-4 text-white pointer-events-auto shrink-0 overflow-hidden">
                {business.logo_url && (
                  <div
                    className="shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg hidden md:block"
                    style={{ backgroundColor: business.logo_bg || "#fff" }}
                  >
                    <img src={business.logo_url} alt="" className="w-full h-full object-contain p-1" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold truncate drop-shadow-lg">{business.name}</h2>
                  {(business.city || business.neighborhood) ? (
                    <p className="text-sm text-white/80 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {[business.city, business.neighborhood].filter(Boolean).join(", ")}
                    </p>
                  ) : business.address ? (
                    <p className="text-sm text-white/80 flex items-center gap-1 mt-0.5">
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

              {/* Web only description + opening hours — always show 4 lines, expandable */}
              {hasExpandableContent && (
                <div className={`w-[95%] md:w-[90%] rounded-2xl bg-black/40 backdrop-blur-sm p-4 md:p-6 text-white pointer-events-auto ${descExpanded ? 'max-h-[30em] overflow-y-auto' : 'overflow-hidden'}`}>
                  <div className={`text-sm leading-relaxed pr-1 ${!descExpanded ? 'max-h-[3.4em] overflow-hidden' : ''}`}>
                    {woDescription && (
                      <div className="relative">
                        {hasExpandableContent && (
                          <button
                            onClick={() => setDescExpanded((p) => !p)}
                            className="float-right ml-2 mt-0.5 shrink-0 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                            aria-label={descExpanded ? "Replier" : "Déplier"}
                          >
                            {descExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        <div
                          className="prose prose-invert prose-sm max-w-none break-words prose-josefin-headings [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white [&_ul]:list-disc [&_li::marker]:text-[#C04F17]"
                          dangerouslySetInnerHTML={{ __html: woDescription }}
                        />
                      </div>
                    )}
                    {!woDescription && hasExpandableContent && (
                      <button
                        onClick={() => setDescExpanded((p) => !p)}
                        className="float-right ml-2 mt-0.5 shrink-0 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                        aria-label={descExpanded ? "Replier" : "Déplier"}
                      >
                        {descExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    {hasOpeningHours && business && (
                      <div className={`${woDescription ? 'mt-4 pt-4 border-t border-white/20' : ''}`}>
                        <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                          {language === "en" ? "Opening hours" : "Horaires"}
                        </p>
                        {business.is_open_24h ? (
                          <p className="text-white/80">Ouvert 24h/24</p>
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
          </div>

          {/* CTAs: right below the text block */}
          {(shopUrl || (business.latitude && business.longitude)) && (
            <div className="shrink-0 py-2 flex flex-col items-center gap-2 pointer-events-auto">
              {shopUrl && (
                <a
                  href={shopUrl.startsWith("http") ? shopUrl : `https://${shopUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-[85%] md:w-1/2 py-2 rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal"
                  style={{ fontFamily: "'Josefin Sans', sans-serif" }}
                >
                  <ShoppingBag className="h-4 w-4" />
                  {language === "en" ? "Online Shop" : "Boutique en ligne"}
                  <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
                </a>
              )}
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

      {/* Directions Overlay — slide-in from right */}
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
              {/* Close button — left, dark style matching SlidePanelHeader */}
              <button
                onClick={() => setShowDirections(false)}
                className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background border-2 border-background/20 shadow-2xl hover:opacity-90 transition-opacity"
                title="Fermer"
                aria-label="Fermer l'itinéraire"
              >
                <X className="h-4 w-4" />
              </button>
              {/* Walking / Driving toggle — centered */}
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
              {/* External nav icons — right */}
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
                <MapBusinessInfoCard
                  business={business}
                  onClose={() => setShowInfoCard(false)}
                  hideDirections
                  hideClose
                />
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
    </div>
  );
};

export default WebOnlySlidePanel;
