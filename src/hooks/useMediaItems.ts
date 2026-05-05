import { useMemo, useCallback, useState } from "react";
import { getVideoEmbed } from "@/lib/videoEmbed";
import type { MediaItem as LightboxMediaItem } from "@/components/FullscreenLightbox";

export type MediaItem =
  | { kind: "video"; url: string; thumbnailUrl?: string | null }
  | { kind: "image"; url: string }
  | { kind: "matterport"; url: string };

export function useMediaItems(
  business: any,
  allVideoUrls: string[],
  videoDocs: any[],
) {
  const images: string[] = business?.images?.filter(Boolean) || [];
  const videos = allVideoUrls;

  const mediaItems = useMemo<MediaItem[]>(() => {
    const videoItems: MediaItem[] = videos.map((v) => {
      const doc = videoDocs.find((d: any) => d.url === v);
      return { kind: "video", url: v, thumbnailUrl: doc?.thumbnail_url || null };
    });
    const imageItems: MediaItem[] = images.map((i) => ({ kind: "image", url: i }));
    const matterportItems: MediaItem[] = business?.matterport_url
      ? [{ kind: "matterport", url: business.matterport_url }]
      : [];
    if (business?.prioritize_images) return [...imageItems, ...videoItems, ...matterportItems];
    if (business?.show_videos) return [...videoItems, ...imageItems, ...matterportItems];
    return [...matterportItems, ...videoItems, ...imageItems];
  }, [videos, images, videoDocs, business?.prioritize_images, business?.show_videos, business?.matterport_url]);

  const totalMedia = mediaItems.length;

  const matterportIndex = useMemo(() => mediaItems.findIndex((m) => m.kind === "matterport"), [mediaItems]);
  const matterportItem = matterportIndex >= 0 ? mediaItems[matterportIndex] : null;

  const lightboxItems = useMemo<LightboxMediaItem[]>(() =>
    mediaItems.map((m) =>
      m.kind === "video"
        ? { type: "video" as const, src: m.url, alt: business?.name || "" }
        : m.kind === "matterport"
          ? { type: "matterport" as const, src: m.url, alt: `${business?.name || ""} – Visite 3D` }
          : { type: "image" as const, src: m.url, alt: business?.name || "" },
    ),
    [mediaItems, business?.name],
  );

  return {
    images,
    videos,
    mediaItems,
    totalMedia,
    matterportIndex,
    matterportItem,
    lightboxItems,
  };
}

export function useVideoInfo(effectiveMedia: MediaItem | null, defaultSoundOn?: boolean) {
  const [isFileVideoVertical, setIsFileVideoVertical] = useState(false);
  const [isFileVideoSquare, setIsFileVideoSquare] = useState(false);

  const videoInfo = useMemo(() => {
    if (effectiveMedia?.kind !== "video") return null;
    const base = getVideoEmbed(effectiveMedia.url, window.location.origin, { background: true, defaultSoundOn: defaultSoundOn ?? true, autoplay: true });
    if (base.type === "youtube") {
      return { ...base, embedUrl: base.embedUrl.replace(/controls=0/, "controls=1").replace(/disablekb=1/, "disablekb=0") };
    }
    return base;
  }, [effectiveMedia?.kind, effectiveMedia?.url]);

  const isVerticalVideo = videoInfo ? (videoInfo.type === "file" ? isFileVideoVertical : videoInfo.isVertical) : false;
  const isSquareVideo = videoInfo?.type === "file" && isFileVideoSquare;

  return {
    videoInfo,
    isVerticalVideo,
    isSquareVideo,
    isFileVideoVertical,
    isFileVideoSquare,
    setIsFileVideoVertical,
    setIsFileVideoSquare,
  };
}
