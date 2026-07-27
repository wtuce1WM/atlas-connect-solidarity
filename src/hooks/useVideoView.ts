import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VideoViewSource = "youtube" | "business" | "generic";

/**
 * Log one view per (videoId, source) mount and expose the current total view count.
 * Anonymous views are allowed.
 */
export const useVideoView = (
  videoId: string | null | undefined,
  source: VideoViewSource,
  options: { autoLog?: boolean } = {}
) => {
  const { autoLog = true } = options;
  const [count, setCount] = useState(0);
  const loggedKey = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!videoId) { setCount(0); return; }
    const { data: c } = await supabase.rpc("get_video_view_count" as any, {
      p_video_id: videoId,
      p_video_source: source,
    });
    setCount((c as number | null) ?? 0);
  }, [videoId, source]);

  const logView = useCallback(async () => {
    if (!videoId) return;
    const key = `${source}:${videoId}`;
    if (loggedKey.current === key) return;
    loggedKey.current = key;
    try {
      await supabase.functions.invoke("log-video-view", {
        body: { video_id: videoId, video_source: source },
      });
    } catch { /* silent — analytics never breaks UX */ }
    setCount((c) => c + 1);
    // GA4 event
    import("@/lib/analytics").then(({ trackEvent }) =>
      trackEvent("video_play", { video_id: videoId, video_source: source })
    ).catch(() => {});
  }, [videoId, source]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (autoLog && videoId) logView();
  }, [autoLog, videoId, logView]);

  return { count, logView, refresh };
};
