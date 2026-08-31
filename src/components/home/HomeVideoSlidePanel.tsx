import { useCallback, useEffect, useMemo, useState } from "react";
import BookOnlineSlidePanel from "@/components/BookOnlineSlidePanel";
import { supabase } from "@/integrations/supabase/client";

type FeedBadge = { id: string; name: string; color?: string | null; text_color?: string | null };

/**
 * Repli « ID vidéo → badges » : certaines sources de feed ne joignent pas les
 * badges à la vidéo. On les lit ici directement par ID vidéo dans les 3 tables
 * de liaison (interne / générique / YouTube), filtrés `is_active_on_front`.
 * Cette lecture directe fait autorité : le payload du feed peut ne contenir
 * qu'un sous-ensemble des badges liés à la vidéo.
 */
async function fetchVideoBadgesById(videoId: string): Promise<FeedBadge[]> {
  const badgeSelect = "badges!inner(id, name_fr, color_hex, text_color_hex, is_active_on_front)";
  const [docs, gens, yts] = await Promise.all([
    (supabase as any).from("business_document_badges").select(badgeSelect).eq("document_id", videoId),
    (supabase as any).from("generic_video_badges").select(badgeSelect).eq("generic_video_id", videoId),
    (supabase as any).from("business_youtube_video_badges").select(badgeSelect).eq("youtube_video_id", videoId),
  ]);
  const out = new Map<string, FeedBadge>();
  for (const res of [docs, gens, yts]) {
    for (const row of (res?.data || []) as any[]) {
      const b = row.badges;
      if (!b?.id || !b.is_active_on_front) continue;
      out.set(String(b.id), {
        id: String(b.id),
        name: String(b.name_fr || ""),
        color: b.color_hex ?? null,
        text_color: b.text_color_hex ?? null,
      });
    }
  }
  return Array.from(out.values());
}

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
  onCitySelect?: (city: { id: string; name: string }) => void;
  /** Clic sur la chip rouge « YouTube » (relance du feed YouTube) */
  onYouTubeSelect?: () => void;
  /** ID du badge actuellement sélectionné (affiché texte noir sur fond gold) */
  selectedBadgeId?: string | null;
  /** Variante de l'assistant 

IA : business hôte (défaut) ou plateforme 1WM */
  aiMode?: "business" | "platform";
  /** Neutralise le CTA IA de la barre liquid glass (déjà dans l'assistant IA). */
  aiCtaDisabled?: boolean;
  /** Coins arrondis (variante /front) */
  roundedFrame?: boolean;
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
  onCitySelect,
  onYouTubeSelect,
  selectedBadgeId = null,
  aiMode,
  aiCtaDisabled,
  roundedFrame,
}: Props<T>) {
  const currentIndex = useMemo(
    () => (activeVideo ? activeList.findIndex((v) => v.id === activeVideo.id) : -1),
    [activeList, activeVideo],
  );
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < activeList.length - 1;

  // Source de vérité badges : lecture directe à chaque vidéo active. Le feed
  // peut fournir un tableau partiel (par exemple uniquement le badge filtrant).
  const activeId = activeVideo?.id || null;
  const [fetchedBadges, setFetchedBadges] = useState<{ videoId: string; badges: FeedBadge[] } | null>(null);
  useEffect(() => {
    if (!open || !activeId) return;
    let cancelled = false;
    fetchVideoBadgesById(activeId).then((b) => {
      if (!cancelled) setFetchedBadges({ videoId: activeId, badges: b });
    });
    return () => { cancelled = true; };
  }, [open, activeId]);
  const resolvedBadges = useMemo(() => {
    const out = new Map<string, FeedBadge>();
    for (const badge of activeVideo?.badges ?? []) out.set(badge.id, badge);
    if (fetchedBadges?.videoId === activeId) {
      for (const badge of fetchedBadges.badges) out.set(badge.id, badge);
    }
    return out.size ? Array.from(out.values()) : null;
  }, [activeId, activeVideo?.badges, fetchedBadges]);

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
      feedBadges={resolvedBadges}
      onFeedBadgeSelect={onBadgeSelect}
      onFeedCitySelect={onCitySelect}
      onFeedYouTubeSelect={onYouTubeSelect}
      selectedBadgeId={selectedBadgeId}
      aiMode={aiMode}
      aiCtaDisabled={aiCtaDisabled}
      roundedFrame={roundedFrame}
    />
  );
}

export default HomeVideoSlidePanel;
