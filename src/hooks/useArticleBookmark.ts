import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useArticleBookmark = (articleSlug: string) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId || !articleSlug) {
      setIsBookmarked(false);
      return;
    }
    supabase
      .from("article_bookmarks" as any)
      .select("id")
      .eq("user_id", userId)
      .eq("article_slug", articleSlug)
      .maybeSingle()
      .then(({ data }) => setIsBookmarked(!!data));
  }, [userId, articleSlug]);

  const toggle = useCallback(async () => {
    if (!userId || !articleSlug) return false;
    setIsLoading(true);
    try {
      if (isBookmarked) {
        await supabase
          .from("article_bookmarks" as any)
          .delete()
          .eq("user_id", userId)
          .eq("article_slug", articleSlug);
        setIsBookmarked(false);
      } else {
        await supabase
          .from("article_bookmarks" as any)
          .insert({ user_id: userId, article_slug: articleSlug } as any);
        setIsBookmarked(true);
      }
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, articleSlug, isBookmarked]);

  return { isBookmarked, isLoading, isLoggedIn: !!userId, toggle };
};
