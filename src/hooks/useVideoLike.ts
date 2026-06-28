import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VideoLikeSource = "youtube" | "business" | "generic";

export const useVideoLike = (
  videoId: string | null | undefined,
  source: VideoLikeSource
) => {
  const [isLiked, setIsLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const latestTargetRef = useRef({ videoId, source, userId });
  latestTargetRef.current = { videoId, source, userId };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, session) => setUserId(session?.user?.id ?? null)
    );
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const refresh = useCallback(async () => {
    const requestedVideoId = videoId;
    const requestedSource = source;
    const requestedUserId = userId;
    if (!requestedVideoId) { setCount(0); setIsLiked(false); return; }
    const { data: c } = await supabase.rpc("get_video_like_count" as any, {
      p_video_id: requestedVideoId,
      p_video_source: requestedSource,
    });
    if (latestTargetRef.current.videoId !== requestedVideoId || latestTargetRef.current.source !== requestedSource) return;
    setCount((c as number | null) ?? 0);
    if (requestedUserId) {
      const { data } = await supabase
        .from("video_likes" as any)
        .select("id")
        .eq("user_id", requestedUserId)
        .eq("video_id", requestedVideoId)
        .eq("video_source", requestedSource)
        .maybeSingle();
      if (
        latestTargetRef.current.videoId !== requestedVideoId ||
        latestTargetRef.current.source !== requestedSource ||
        latestTargetRef.current.userId !== requestedUserId
      ) return;
      setIsLiked(!!data);
    } else {
      setIsLiked(false);
    }
  }, [videoId, source, userId]);

  // Reset immediately when the target video changes so the button doesn't
  // briefly show the previous video's state during the async refresh.
  useEffect(() => {
    setIsLiked(false);
    setCount(0);
  }, [videoId, source]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = useCallback(async () => {
    if (!videoId) return false;
    if (!userId) return false;
    setIsLoading(true);
    try {
      if (isLiked) {
        await supabase
          .from("video_likes" as any)
          .delete()
          .eq("user_id", userId)
          .eq("video_id", videoId)
          .eq("video_source", source);
        setIsLiked(false);
        setCount((c) => Math.max(0, c - 1));
      } else {
        await supabase
          .from("video_likes" as any)
          .insert({ user_id: userId, video_id: videoId, video_source: source } as any);
        setIsLiked(true);
        setCount((c) => c + 1);
      }
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [videoId, source, userId, isLiked]);

  return { isLiked, count, isLoading, isLoggedIn: !!userId, toggle };
};
