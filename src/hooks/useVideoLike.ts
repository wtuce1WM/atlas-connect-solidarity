import { useState, useEffect, useCallback } from "react";
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
    if (!videoId) { setCount(0); setIsLiked(false); return; }
    const { count: c } = await supabase
      .from("video_likes" as any)
      .select("id", { count: "exact", head: true })
      .eq("video_id", videoId)
      .eq("video_source", source);
    setCount(c ?? 0);
    if (userId) {
      const { data } = await supabase
        .from("video_likes" as any)
        .select("id")
        .eq("user_id", userId)
        .eq("video_id", videoId)
        .eq("video_source", source)
        .maybeSingle();
      setIsLiked(!!data);
    } else {
      setIsLiked(false);
    }
  }, [videoId, source, userId]);

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
