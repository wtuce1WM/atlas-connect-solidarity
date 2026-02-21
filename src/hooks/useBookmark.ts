import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useBookmark = (businessId: string | undefined) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId || !businessId) {
      setIsBookmarked(false);
      return;
    }
    const check = async () => {
      const { data } = await supabase
        .from("bookmarks" as any)
        .select("id")
        .eq("user_id", userId)
        .eq("business_id", businessId)
        .maybeSingle();
      setIsBookmarked(!!data);
    };
    check();
  }, [userId, businessId]);

  const toggle = useCallback(async () => {
    if (!userId || !businessId) return false;
    setIsLoading(true);
    try {
      if (isBookmarked) {
        await supabase
          .from("bookmarks" as any)
          .delete()
          .eq("user_id", userId)
          .eq("business_id", businessId);
        setIsBookmarked(false);
      } else {
        await supabase
          .from("bookmarks" as any)
          .insert({ user_id: userId, business_id: businessId } as any);
        setIsBookmarked(true);
      }
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, businessId, isBookmarked]);

  return { isBookmarked, isLoading, isLoggedIn: !!userId, toggle };
};
