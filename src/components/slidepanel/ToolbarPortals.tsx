import React from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Minimize2, Phone, Heart } from "lucide-react";
import iconePhotoVideo from "@/assets/icone_photo_video.png";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import ShareButton from "@/components/ShareButton";
import { whatsappUrl } from "@/lib/phoneUtils";
import { buildOgShareUrl } from "@/lib/businessUrl";
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
  /** Optional prefix to target scoped toolbar portal IDs */
  toolbarPortalPrefix?: string;
  /** Open/closed badge — shown on mobile only between close button and WhatsApp */
  openBadgeInfo?: { text: string; isOpen: boolean } | null;
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
  toolbarPortalPrefix,
  openBadgeInfo,
}: ToolbarPortalsProps) {
  const pfx = toolbarPortalPrefix ? `${toolbarPortalPrefix}-` : "";
  const toolbarPortal = document.getElementById(`${pfx}slide-panel-toolbar`);
  const toolbarCenterPortal = document.getElementById(`${pfx}slide-panel-toolbar-center`);
  const toolbarLeftPortal = document.getElementById(`${pfx}slide-panel-toolbar-left`);

  const shouldHide = !!selectedKpBusinessId || !!selectedPoiBusinessId || showMosaic;

  return (
    <>
      {/* Left portal: media + mosaic + youtube buttons + (mobile) open badge */}
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
        </div>,
        toolbarLeftPortal
      )}

      {/* Center portal: WhatsApp or Phone */}
      {toolbarCenterPortal && !shouldHide && createPortal(
        <div className="flex items-center gap-6 relative z-[90] md:z-auto">
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
        <ShareButton title={business.name} variant="dark" className="shrink-0" shareUrl={business.slug ? buildOgShareUrl(business.slug) : undefined} />,
        toolbarPortal
      )}
    </>
  );
}
