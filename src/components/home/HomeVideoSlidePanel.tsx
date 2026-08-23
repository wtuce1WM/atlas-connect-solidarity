import { useCallback, useMemo } from "react";
import BookOnlineSlidePanel from "@/components/BookOnlineSlidePanel";

interface VideoLike {
  id: string;
  url: string;
  business_name: string;
  pageBusinessName?: string | null;
  pageBusinessId?: string | null;
  owner: { id: string; name: string; logo_url: string | null; logo_bg: string | null } | null;
  social: any;
  showSocialBadge?: boolean;
  description: string | null;
  manualCard: { label: string; badgeId: string | null; eventId?: string | null } | null;
  title?: string | null;
  price?: string | null;
  badges?: { id: string; name: string; color?: string | null; text_color?: string | null }[] | null;
}

interface Props<T extends VideoLike> {
  open: boolean;
  onClose: () => void;
  activeVideo: T | null;
  activeList: T[];
  onActiveVideoChange: (video: T) => void;
  isActiveGeneric: boolean;
  currentTime: number;
  onTimeUpdate: (t: number) => void;
  returnContext: string | null;
  hideDirections?: boolean;
  hideSecondaryCtas?: boolean;
  /** Clic sur une chip badge en haut de la vidéo (relance du feed) */
  onBadgeSelect?: (badge: { id: string; name: string }) => void;
  /** ID du badge actuellement sélectionné (affiché texte noir sur fond gold) */
  selectedBadgeId?: string | null;
  /** Variante de l'assistant IA : business hôte (défaut) ou plateforme 1WM */
  aiMode?: "business" | "platform";
}

/**
 * Wraps BookOnlineSlidePanel with prev/next navigation logic over a list of videos.
 * Extracted from Home.tsx to encapsulate the four duplicated index-search callbacks.
 */
function HomeVideoSlidePanel<T extends VideoLike>({
  open,
  onClose,
  activeVideo,
  activeList,
  onActiveVideoChange,
  isActiveGeneric,
  currentTime,
  onTimeUpdate,
  returnContext,
  hideDirections = false,
  hideSecondaryCtas = false,
  onBadgeSelect,
  aiMode,
}: Props<T>) {
  const currentIndex = useMemo(
    () => (activeVideo ? activeList.findIndex((v) => v.id === activeVideo.id) : -1),
    [activeList, activeVideo],
  );
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < activeList.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onActiveVideoChange(activeList[currentIndex - 1]);
  }, [hasPrev, activeList, currentIndex, onActiveVideoChange]);

  const goNext = useCallback(() => {
    if (hasNext) onActiveVideoChange(activeList[currentIndex + 1]);
  }, [hasNext, activeList, currentIndex, onActiveVideoChange]);

  const eventId = activeVideo?.id?.startsWith("event:")
    ? activeVideo.id.slice(6)
    : (activeVideo?.manualCard?.eventId || null);

  return (
    <BookOnlineSlidePanel
      open={open}
      onClose={onClose}
      videoUrl={activeVideo?.url || null}
      videoId={activeVideo?.id || null}
      businessName={activeVideo?.business_name || ""}
      pageBusinessName={activeVideo?.pageBusinessName ?? null}
      pageBusinessId={activeVideo?.pageBusinessId ?? null}
      isGeneric={isActiveGeneric}
      owner={activeVideo?.owner || null}
      social={activeVideo?.social || null}
      showSocialBadge={!!activeVideo?.showSocialBadge}
      description={activeVideo?.description || null}
      headerVideoTitle={activeVideo?.title ?? null}
      currentTime={currentTime}
      onTimeUpdate={onTimeUpdate}
      onPrev={goPrev}
      onNext={goNext}
      hasPrev={hasPrev}
      hasNext={hasNext}
      eventId={eventId}
      returnContext={returnContext}
      hideDirections={hideDirections}
      hideSecondaryCtas={hideSecondaryCtas}
      hideLeftCtas
      feedLayout
      manualCardLabel={activeVideo?.manualCard?.label || null}
      price={activeVideo?.price || null}
      feedBadges={activeVideo?.badges ?? null}
      onFeedBadgeSelect={onBadgeSelect}
      aiMode={aiMode}
    />
  );
}

export default HomeVideoSlidePanel;
