import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, ShoppingBag, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
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
  website: string | null;
  whatsapp: string | null;
  online_shop_url: string | null;
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
          .select("id, name, slug, logo_url, logo_bg, images, city, website, whatsapp, online_shop_url")
          .eq("id", businessId)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("business_web_only")
          .select("description, videos")
          .eq("business_id", businessId)
          .maybeSingle(),
      ]);

      setBusiness(bizRes.data as WebOnlyBusiness | null);
      setWebOnlyData(woRes.data as WebOnlyData | null);
      setIsLoading(false);
    };
    fetchData();
  }, [businessId]);

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

  const shopUrl = business.online_shop_url || business.website;
  const videos = webOnlyData?.videos?.filter(Boolean) || [];
  const heroImage = business.images?.[0] || null;
  const woDescription = webOnlyData?.description || null;

  // Resolve video src: could be a YouTube/Vimeo URL or a direct file
  const getVideoEmbed = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
    if (ytMatch) {
      return { type: "youtube" as const, embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&rel=0&controls=0&showinfo=0&modestbranding=1` };
    }
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return { type: "vimeo" as const, embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1&background=1` };
    }
    return { type: "file" as const, embedUrl: url };
  };

  const currentVideo = videos.length > 0 ? videos[currentVideoIndex % videos.length] : null;
  const videoInfo = currentVideo ? getVideoEmbed(currentVideo) : null;

  const toolbarPortal = document.getElementById("slide-panel-toolbar");
  const toolbarCenterPortal = document.getElementById("slide-panel-toolbar-center");

  return (
    <div className="h-full overflow-y-auto bg-black">
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
        {/* Video / Image background */}
        <div className="absolute inset-0">
          {videoInfo ? (
            videoInfo.type === "file" ? (
              <video
                key={currentVideo}
                src={videoInfo.embedUrl}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
                onEnded={() => {
                  if (videos.length > 1) setCurrentVideoIndex((i) => (i + 1) % videos.length);
                }}
              />
            ) : (
              <iframe
                key={currentVideo}
                src={videoInfo.embedUrl}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                frameBorder="0"
                style={{ border: 0 }}
              />
            )
          ) : heroImage ? (
            <img src={heroImage} alt={business.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
          {/* Dark gradient overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        </div>

        {/* Overlaid content – centered vertically, 70% width */}
        <div className="relative z-10 flex flex-col h-full p-6">
          {/* Video navigation dots – top */}
          {videos.length > 1 && (
            <div className="flex items-center justify-center gap-2 pb-4">
              {videos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentVideoIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === currentVideoIndex % videos.length
                      ? "bg-white scale-110"
                      : "bg-white/40 hover:bg-white/60"
                  }`}
                  aria-label={`Video ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Centered content block */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-[70%] rounded-2xl bg-black/40 backdrop-blur-sm p-6 space-y-5 text-white">
              {/* Logo + name */}
              <div className="flex items-end gap-4">
                {business.logo_url && (
                  <div
                    className="shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg"
                    style={{ backgroundColor: business.logo_bg || "#fff" }}
                  >
                    <img src={business.logo_url} alt="" className="w-full h-full object-contain p-1" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-xl font-bold truncate drop-shadow-lg">{business.name}</h2>
                  {business.city && (
                    <p className="text-sm text-white/80 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {business.city}
                    </p>
                  )}
                </div>
              </div>

              {/* Web only description (rich text) */}
              {woDescription && (
                <div
                  className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none break-words [&_*]:!text-white [&_a]:!text-white/90 [&_a:hover]:!text-white"
                  dangerouslySetInnerHTML={{ __html: woDescription }}
                />
              )}

              {/* CTA: Shop online */}
              {shopUrl && (
                <a
                  href={shopUrl.startsWith("http") ? shopUrl : `https://${shopUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-1/2 py-2 rounded-lg bg-white text-black font-medium text-sm shadow-lg hover:bg-white/90 transition-colors mx-auto [&_*]:text-black"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {language === "en" ? "Visit Online Shop" : "Visiter la boutique en ligne"}
                  <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebOnlySlidePanel;
