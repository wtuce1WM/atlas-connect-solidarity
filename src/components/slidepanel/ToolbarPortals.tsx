import React from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Minimize2, Phone, Heart, Bookmark } from "lucide-react";
import iconePhotoVideo from "@/assets/icone_photo_video.png";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import ShareButton from "@/components/ShareButton";
import { whatsappUrl } from "@/lib/phoneUtils";
import { buildOgShareUrl } from "@/lib/businessUrl";
import type { YouTubeVideo } from "@/components/YouTubeShortsCarousel";
import { useVideoLike } from "@/hooks/useVideoLike";
import { useVideoView } from "@/hooks/useVideoView";
import { useBookmark } from "@/hooks/useBookmark";

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
  /** When true, hides all toolbar buttons (e.g. when description overlay is open) */
  hideToolbarButtons?: boolean;
  /** Currently visible YouTube short in the panel — drives the Heart "like" action */
  activeYoutubeVideo?: YouTubeVideo | null;
  /** Currently visible internal video in the panel — drives the Heart "like" action */
  activeInternalVideoId?: string | null;
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
  hideToolbarButtons,
  activeYoutubeVideo,
  activeInternalVideoId,
}: ToolbarPortalsProps) {
  const pfx = toolbarPortalPrefix ? `${toolbarPortalPrefix}-` : "";
  const toolbarPortal = document.getElementById(`${pfx}slide-panel-toolbar`);
  const toolbarCenterPortal = document.getElementById(`${pfx}slide-panel-toolbar-center`);
  const toolbarLeftPortal = document.getElementById(`${pfx}slide-panel-toolbar-left`);

  const shouldHide = !!selectedKpBusinessId || !!selectedPoiBusinessId || showMosaic || !!hideToolbarButtons;

  // Like target: active video if any, otherwise fall back to the business itself
  const likeTarget = activeInternalVideoId
    ? { id: activeInternalVideoId, source: "business" as const }
    : activeYoutubeVideo?.videoId
      ? { id: activeYoutubeVideo.videoId, source: "youtube" as const }
      : business?.id
        ? { id: String(business.id), source: "business" as const }
        : { id: null, source: "business" as const };
  const { isLiked, count: likeCount, isLoggedIn, toggle: toggleLike } = useVideoLike(likeTarget.id, likeTarget.source);
  // Log a view each time a YouTube short becomes active in the panel
  useVideoView(activeYoutubeVideo?.videoId ?? null, "youtube", { autoLog: true });
  const { isBookmarked, isLoggedIn: isBookmarkLoggedIn, toggle: toggleBookmark } = useBookmark(business?.id ? String(business.id) : undefined);
  const [burst, setBurst] = React.useState(0);

  const onHeartClick = async () => {
    if (!isLoggedIn) {
      window.dispatchEvent(new CustomEvent("open-panel-club-popup"));
      return;
    }
    if (!likeTarget.id) return;
    setBurst((b) => b + 1);
    await toggleLike();
  };


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
              <span
                className="relative z-10 h-9 w-9 flex items-center justify-center rounded-full text-white overflow-hidden before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white/30 before:via-transparent before:to-white/5 before:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-1/2 after:rounded-t-full after:bg-gradient-to-b after:from-white/35 after:to-transparent after:blur-[1px] after:pointer-events-none [&>svg]:relative [&>svg]:z-10"
                style={{ backgroundColor: "#25D366", boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.45), inset 0 -1px 0 0 rgba(0,0,0,0.25), 0 4px 14px -2px rgba(0,0,0,0.35)' }}
              >
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
              <span
                className="relative z-10 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background overflow-hidden before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white/25 before:via-transparent before:to-white/5 before:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-1/2 after:rounded-t-full after:bg-gradient-to-b after:from-white/30 after:to-transparent after:blur-[1px] after:pointer-events-none [&>svg]:relative [&>svg]:z-10"
                style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.35), inset 0 -1px 0 0 rgba(0,0,0,0.3), 0 4px 14px -2px rgba(0,0,0,0.35)' }}
              >
                <Phone className="h-4 w-4" />
              </span>
            </a>
          ) : null}
        </div>,
        toolbarCenterPortal
      )}

      {/* Right portal: Heart (like video) + Bookmark (Le Club) + Share */}
      {toolbarPortal && !shouldHide && createPortal(
        <div className="flex items-center gap-2">
          {/* Heart — likes the currently visible YouTube short */}
          <div className="relative flex flex-col items-center">
            <button
              type="button"
              onClick={onHeartClick}
              disabled={isLoggedIn && !likeTarget.id}
              style={{ backgroundColor: "#F1F1F1" }}
              className={`relative h-9 w-9 flex items-center justify-center rounded-full shadow-2xl transition-all shrink-0 glass-toolbar-btn ${
                isLoggedIn && !likeTarget.id ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 active:scale-90"
              }`}
              title={!isLoggedIn ? "Connectez-vous pour liker" : likeTarget.id ? (isLiked ? "Retirer le like" : "Liker") : "Indisponible"}
              aria-label="Liker la vidéo"
            >
              <Heart
                key={`h-${burst}`}
                className={`h-4 w-4 transition-transform ${isLiked ? "text-red-500 animate-[heart-pop_0.4s_ease-out]" : "text-black"}`}
                fill={isLiked ? "currentColor" : "none"}
                strokeWidth={2.5}
              />
              {burst > 0 && isLiked && (
                <Heart
                  key={`fly-${burst}`}
                  className="pointer-events-none absolute h-4 w-4 text-red-500 animate-[heart-fly_0.8s_ease-out_forwards]"
                  fill="currentColor"
                  strokeWidth={0}
                />
              )}
            </button>
            {likeCount > 0 && (
              <span
                className="absolute -bottom-4 text-[10px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tabular-nums"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {likeCount}
              </span>
            )}
          </div>
          {/* Bookmark — opens Club popup / saves business (former Heart role) */}
          <button
            type="button"
            onClick={async () => {
              if (!isBookmarkLoggedIn) {
                window.dispatchEvent(new CustomEvent("open-panel-club-popup"));
                return;
              }
              await toggleBookmark();
            }}
            style={{ backgroundColor: "#F1F1F1" }}
            className="h-9 w-9 flex items-center justify-center rounded-full text-black shadow-2xl hover:opacity-90 transition-opacity shrink-0 glass-toolbar-btn"
            title={isBookmarked ? "Retirer des favoris" : "Le Club OWM"}
            aria-label="Le Club OWM"
          >
            <Bookmark className="h-4 w-4" strokeWidth={2.5} fill={isBookmarked ? "currentColor" : "none"} />
          </button>
          {(() => {
            // If opened from the YouTube channels tab (URL carries ?openChannel=...),
            // share the short /y/<slug> URL that resolves back to this channel panel.
            let shareUrl: string | undefined;
            try {
              const params = new URLSearchParams(window.location.search);
              if (params.has("openChannel")) {
                shareUrl = business.slug
                  ? `https://oneworldmorocco.com/y/${business.slug}`
                  : `https://oneworldmorocco.com/search?tab=youtube&openChannel=${params.get("openChannel")}`;
              }
            } catch {/* noop */}
            if (!shareUrl) {
              shareUrl = business.slug ? `https://oneworldmorocco.com/${business.slug}` : undefined;
            }
            return (
              <ShareButton
                title={business.name}
                variant="dark"
                className="shrink-0 [&>button]:!bg-[#F1F1F1] [&>button]:!text-black"
                buttonClassName="glass-toolbar-btn"
                shareUrl={shareUrl}
                previewImage={images?.[0] || business?.images?.[0] || null}
              />
            );
          })()}

        </div>,
        toolbarPortal
      )}
    </>
  );
}
