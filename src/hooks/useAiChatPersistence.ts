import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const anonTokenKey = (chatId: string) => `ai_chat_token_${chatId}`;

function generateAnonToken() {
  return crypto.randomUUID();
}

export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
  clarify?: any;
  citedBusinesses?: any[];
};

export type PersistedAiChat = {
  id: string;
  user_id: string | null;
  title: string;
  is_bookmarked: boolean;
  is_public: boolean;
  messages: {
    aiAnswerText: string;
    aiChat: AiChatMessage[];
    searchQuery?: string;
    businessPool?: any[];
  };
  city?: string | null;
};

interface UseAiChatPersistenceArgs {
  aiAnswerText: string;
  aiChat: AiChatMessage[];
  searchQuery: string;
  city?: string | null;
  businessPool?: any[];
  setAiAnswerText: (s: string) => void;
  setAiChat: (m: AiChatMessage[]) => void;
  setRestoredBusinessPool?: (b: any[]) => void;
}

export function useAiChatPersistence({
  aiAnswerText,
  aiChat,
  searchQuery,
  city,
  businessPool,
  setAiAnswerText,
  setAiChat,
  setRestoredBusinessPool,
}: UseAiChatPersistenceArgs) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlChatId = searchParams.get("aiChat");

  const [userId, setUserId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(urlChatId);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [hydrating, setHydrating] = useState(false);

  // Auth
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // For anonymous chats (user_id IS NULL in DB), anyone with the chatId can edit (and the local creator is the de-facto owner).
  // For signed-in chats, only the auth user matches.
  const isAnonChat = ownerId === null && !!chatId;
  const isOwner = isAnonChat || (!!userId && !!ownerId && userId === ownerId);

  // Hydrate from URL chatId
  const hydratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!urlChatId) return;
    if (hydratedRef.current === urlChatId) return;
    hydratedRef.current = urlChatId;
    setHydrating(true);
    (async () => {
      const { data, error } = await supabase
        .from("ai_chats")
        .select("id,user_id,title,is_bookmarked,is_public,messages,city")
        .eq("id", urlChatId)
        .maybeSingle();
      if (!error && data) {
        const payload = (data.messages as any) || {};
        setChatId(data.id);
        setOwnerId(data.user_id);
        setTitle(data.title || "");
        setIsBookmarked(!!data.is_bookmarked);
        setIsPublic(!!data.is_public);
        if (typeof payload.aiAnswerText === "string") setAiAnswerText(payload.aiAnswerText);
        if (Array.isArray(payload.aiChat)) setAiChat(payload.aiChat);
        if (Array.isArray(payload.businessPool) && setRestoredBusinessPool) {
          setRestoredBusinessPool(payload.businessPool);
        }
        // Anonymous chats (user_id NULL) are editable by anyone who has the link.
        // Signed-in chats are read-only unless the viewer is the owner.
        const ownsIt = data.user_id === null || (!!userId && data.user_id === userId);
        setIsReadOnly(!ownsIt);
      }
      setHydrating(false);
    })();
  }, [urlChatId, userId, setAiAnswerText, setAiChat, setRestoredBusinessPool]);

  // Auto-save when content changes and user is owner (or creating own new chat)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  useEffect(() => {
    if (isReadOnly) return; // viewing someone else's signed-in chat
    if (!aiAnswerText && aiChat.length === 0) return;

    const payload = { aiAnswerText, aiChat, searchQuery, businessPool: businessPool ?? [] };
    const signature = JSON.stringify({ chatId, payload });
    if (signature === lastSavedRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const autoTitle =
        aiChat.find((m) => m.role === "user")?.content ||
        searchQuery ||
        aiAnswerText.slice(0, 60) ||
        "Nouvelle conversation";
      const finalTitle = (title && title.trim()) ? title : autoTitle.slice(0, 80);

      if (!chatId) {
        // Anonymous chats are public by default so the share link works without auth.
        const insertPayload: any = {
          user_id: userId,
          title: finalTitle,
          messages: payload as any,
          city: city ?? null,
          is_public: userId ? false : true,
        };
        const { data, error } = await supabase
          .from("ai_chats")
          .insert(insertPayload)
          .select("id,title,user_id,is_bookmarked,is_public")
          .single();
        if (!error && data) {
          setChatId(data.id);
          setOwnerId(data.user_id);
          setTitle(data.title);
          setIsBookmarked(!!data.is_bookmarked);
          setIsPublic(!!data.is_public);
          const next = new URLSearchParams(searchParams);
          next.set("aiChat", data.id);
          // Preserve the current pathname (including any /en or /ar language prefix)
          // — setSearchParams would route through the LocalizedRoutes stripped location
          // and drop the language prefix from the URL.
          const nextUrl = `${window.location.pathname}?${next.toString()}${window.location.hash || ""}`;
          window.history.replaceState(window.history.state, "", nextUrl);
          lastSavedRef.current = JSON.stringify({ chatId: data.id, payload });
        }
      } else {
        const { error } = await supabase
          .from("ai_chats")
          .update({ messages: payload as any, title: finalTitle, city: city ?? null })
          .eq("id", chatId);
        if (!error) lastSavedRef.current = signature;
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [userId, isReadOnly, aiAnswerText, aiChat, searchQuery, businessPool, chatId, title, city, searchParams, setSearchParams]);

  // Actions
  const renameTitle = useCallback(
    async (newTitle: string) => {
      const t = newTitle.trim().slice(0, 80);
      if (!t || !chatId || !isOwner) return;
      setTitle(t);
      await supabase.from("ai_chats").update({ title: t }).eq("id", chatId);
    },
    [chatId, isOwner]
  );

  const toggleBookmark = useCallback(async () => {
    if (!userId || !chatId || !isOwner) return false;
    const next = !isBookmarked;
    setIsBookmarked(next);
    // bookmarking auto-publishes (so the share link still works); unbookmark keeps public flag if already set
    const patch: any = { is_bookmarked: next };
    if (next) patch.is_public = true;
    await supabase.from("ai_chats").update(patch).eq("id", chatId);
    if (next) {
      setIsPublic(true);
      await supabase.from("ai_chat_bookmarks").upsert({ user_id: userId, chat_id: chatId });
    } else {
      await supabase.from("ai_chat_bookmarks").delete().eq("user_id", userId).eq("chat_id", chatId);
    }
    return next;
  }, [userId, chatId, isOwner, isBookmarked]);

  const makeShareUrl = useCallback(async (): Promise<string | null> => {
    if (!chatId || !isOwner) return null;
    if (!isPublic) {
      await supabase.from("ai_chats").update({ is_public: true }).eq("id", chatId);
      setIsPublic(true);
    }
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "ai");
    url.searchParams.set("aiChat", chatId);
    url.searchParams.delete("_t");
    return url.toString();
  }, [chatId, isOwner, isPublic]);

  return {
    userId,
    chatId,
    isOwner,
    isReadOnly,
    isBookmarked,
    isPublic,
    title,
    hydrating,
    renameTitle,
    toggleBookmark,
    makeShareUrl,
  };
}
