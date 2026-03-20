import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, ShoppingBag, MapPin, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import ShareButton from "@/components/ShareButton";
import BookmarkButton from "@/components/BookmarkButton";
import { Skeleton } from "@/components/ui/skeleton";

const WhatsAppIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

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
  website: string | null;
  whatsapp: string | null;
  online_shop_url: string | null;
  google_maps_url: string | null;
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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [bizRes, woRes] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, slug, logo_url, logo_bg, images, city, neighborhood, website, whatsapp, online_shop_url, google_maps_url")
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
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
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
      {/* Portal Share & Bookmark into right of fixed bar */}
      {toolbarPortal && createPortal(
        <>
          <ShareButton title={business.name} variant="dark" className="toolbar-icon" />
          <BookmarkButton businessId={business.id} variant="gold" />
        </>,
        toolbarPortal
      )}

      {/* Full-size video / image background with overlay content */}
      <div className="relative w-full h-full">
        {/* Media background */}
        <div className="absolute inset-0">
          {currentMedia?.kind === "video" && videoInfo ? (
            videoInfo.type === "file" ? (
              <video
                key={currentMedia.url}
                src={videoInfo.embedUrl}
                autoPlay
                loop
                playsInline
                controls
                className="w-full h-full object-cover"
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

          {/* Centered content block */}
          <div className="flex-1 flex items-start md:items-center justify-center overflow-hidden min-h-0">
            <div className="w-[95%] md:w-[90%] lg:w-[70%] max-h-full md:max-h-none overflow-hidden rounded-2xl bg-black/40 backdrop-blur-sm p-4 md:p-6 flex flex-col gap-5 text-white pointer-events-auto">
              {/* Logo + name + toggle */}
              <div className="flex items-end gap-4">
                {business.logo_url && (
                  <div
                    className="shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg"
                    style={{ backgroundColor: business.logo_bg || "#fff" }}
                  >
                    <img src={business.logo_url} alt="" className="w-full h-full object-contain p-1" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold truncate drop-shadow-lg">{business.name}</h2>
                  {business.city && (
                    <p className="text-sm text-white/80 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {[business.city, business.neighborhood].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                {woDescription && (
                  <button
                    onClick={() => setDescExpanded((p) => !p)}
                    className="shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                    aria-label={descExpanded ? "Replier" : "Déplier"}
                  >
                    {descExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                )}
              </div>

              {/* Web only description (rich text) — collapsible */}
              {woDescription && descExpanded && (
                <div
                  className="flex-1 min-h-0 overflow-y-auto md:overflow-visible pr-1 text-sm leading-relaxed prose prose-invert prose-sm max-w-none break-words [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white"
                  dangerouslySetInnerHTML={{ __html: woDescription }}
                />
              )}
            </div>
          </div>

          {/* CTAs: right below the text block */}
          {(shopUrl || business.google_maps_url) && (
            <div className="shrink-0 py-2 flex flex-col items-center gap-2 pointer-events-auto">
              {shopUrl && (
                <a
                  href={shopUrl.startsWith("http") ? shopUrl : `https://${shopUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-[85%] md:w-1/2 py-2 rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {language === "en" ? "Online Shop" : "Boutique en ligne"}
                  <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
                </a>
              )}
              {business.google_maps_url && (
                <a
                  href={business.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-[85%] md:w-1/2 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs md:text-sm shadow-lg hover:bg-primary/90 transition-colors [&_*]:text-primary-foreground"
                >
                  <MapPin className="h-4 w-4" />
                  {language === "en" ? "Visit Us" : "Visitez-nous"}
                  <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebOnlySlidePanel;
