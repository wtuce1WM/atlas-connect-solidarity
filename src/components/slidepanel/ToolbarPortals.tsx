import React from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Minimize2, Phone } from "lucide-react";
import iconePhotoVideo from "@/assets/icone_photo_video.png";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import ShareButton from "@/components/ShareButton";
import { whatsappUrl } from "@/lib/phoneUtils";
import type { YouTubeVideo } from "@/components/YouTubeShortsCarousel";

interface ToolbarPortalsProps {
  business: any;
  images: string[];
  showMosaic: boolean;
  setShowMosaic: (v: boolean | ((p: boolean) => boolean)) => void;
  youtubeVideoCount: number | null;
  allYoutubeVideos: YouTubeVideo[];
  setActiveYoutubeVideo: (v: YouTubeVideo | null) => void;
  setShowYoutubeOverlay: (v: boolean) => void;
  setYoutubeIsPlaying: (v: boolean) => void;
  serpApiOverlayCtxRef: React.MutableRefObject<any>;
  activeBusinessId: string;
  propBusinessId: string;
  setActiveBusinessId: (id: string) => void;
  setSerpApiOverlayCtx: (v: any) => void;
  selectedKpBusinessId: string | null;
  selectedPoiBusinessId: string | null;
  // Overlay state for ripple suppression
  anyOverlay: boolean;
}

export function ToolbarPortals({
  business,
  images,
  showMosaic,
  setShowMosaic,
  youtubeVideoCount,
  allYoutubeVideos,
  setActiveYoutubeVideo,
  setShowYoutubeOverlay,
  setYoutubeIsPlaying,
  serpApiOverlayCtxRef,
  activeBusinessId,
  propBusinessId,
  setActiveBusinessId,
  setSerpApiOverlayCtx,
  selectedKpBusinessId,
  selectedPoiBusinessId,
  anyOverlay,
}: ToolbarPortalsProps) {
  const toolbarPortal = document.getElementById("slide-panel-toolbar");
  const toolbarCenterPortal = document.getElementById("slide-panel-toolbar-center");
  const toolbarLeftPortal = document.getElementById("slide-panel-toolbar-left");

  const shouldHide = !!selectedKpBusinessId || !!selectedPoiBusinessId || showMosaic;

  return (
    <>
      {/* Left portal: media + mosaic + youtube buttons */}
      {toolbarLeftPortal && !shouldHide && createPortal(
        <div className="flex items-center gap-2">
          {serpApiOverlayCtxRef.current && activeBusinessId !== propBusinessId && (
            <button
              onClick={() => {
                const ctx = serpApiOverlayCtxRef.current;
                serpApiOverlayCtxRef.current = null;
                setActiveBusinessId(propBusinessId);
                setTimeout(() => setSerpApiOverlayCtx(ctx), 50);
              }}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-gold text-black shadow-md hover:bg-gold/90 transition-colors"
              title="Retour aux résultats SerpAPI"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {images.length >= 5 && (
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
            </button>
          )}
          {youtubeVideoCount && youtubeVideoCount > 0 && (
            <button
              onClick={() => {
                const firstShort = allYoutubeVideos.find(v => v.isShort) || allYoutubeVideos[0] || null;
                if (firstShort) setActiveYoutubeVideo(firstShort);
                setShowYoutubeOverlay(true);
                setYoutubeIsPlaying(true);
              }}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-colors"
              title="Vidéos YouTube"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </button>
          )}
        </div>,
        toolbarLeftPortal
      )}

      {/* Center portal: WhatsApp or Phone */}
      {toolbarCenterPortal && !shouldHide && createPortal(
        <div className="flex items-center gap-6">
          {business.whatsapp ? (
            <a href={whatsappUrl(business.whatsapp)} target="_blank" rel="noopener noreferrer" className="relative flex items-center justify-center hover:opacity-90 transition-opacity">
              {!anyOverlay && (
                <>
                  <span className="absolute w-12 h-12 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_infinite]" style={{ borderColor: "rgba(37,211,102,0.35)" }} />
                  <span className="absolute w-16 h-16 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_0.6s_infinite]" style={{ borderColor: "rgba(37,211,102,0.2)" }} />
                  <span className="absolute w-20 h-20 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_1.2s_infinite]" style={{ borderColor: "rgba(37,211,102,0.1)" }} />
                </>
              )}
              <span className="relative z-10 h-9 w-9 flex items-center justify-center rounded-full text-white" style={{ backgroundColor: "#25D366" }}>
                <WhatsAppIcon className="h-4 w-4" />
              </span>
            </a>
          ) : business.phone ? (
            <a href={`tel:${business.phone}`} className="relative flex items-center justify-center hover:opacity-90 transition-opacity">
              {!anyOverlay && (
                <>
                  <span className="absolute w-12 h-12 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_infinite]" style={{ borderColor: "rgba(0,0,0,0.25)" }} />
                  <span className="absolute w-16 h-16 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_0.6s_infinite]" style={{ borderColor: "rgba(0,0,0,0.15)" }} />
                  <span className="absolute w-20 h-20 rounded-full border pointer-events-none animate-[ripple_2.4s_ease-out_1.2s_infinite]" style={{ borderColor: "rgba(0,0,0,0.08)" }} />
                </>
              )}
              <span className="relative z-10 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background">
                <Phone className="h-4 w-4" />
              </span>
            </a>
          ) : null}
        </div>,
        toolbarCenterPortal
      )}

      {/* Right portal: Share */}
      {toolbarPortal && !shouldHide && createPortal(
        <ShareButton title={business.name} variant="dark" className="shrink-0" />,
        toolbarPortal
      )}
    </>
  );
}
