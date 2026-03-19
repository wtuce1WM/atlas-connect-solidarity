import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SearchHistoryEntry {
  id: string;
  query: string;
  city?: string | null;
  category?: string | null;
  created_at: string;
}

const LOCAL_STORAGE_KEY = "search_history";
const MAX_ENTRIES = 30;

/** Read from localStorage */
function getLocalHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Write to localStorage */
function setLocalHistory(entries: SearchHistoryEntry[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch { /* quota exceeded – silently ignore */ }
}

/**
 * Unified search history hook.
 * - Anonymous users  → localStorage
 * - Authenticated users → database (search_history table)
 */
export const useSearchHistory = () => {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Track auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load history when userId changes
  useEffect(() => {
    if (userId) {
      loadFromDb(userId);
    } else {
      setHistory(getLocalHistory());
    }
  }, [userId]);

  const loadFromDb = async (uid: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("search_history")
        .select("id, query, city, category, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(MAX_ENTRIES);
      if (!error && data) setHistory(data);
    } catch { /* silent */ }
    setIsLoading(false);
  };

  /** Save a search entry (deduplicates recent identical searches) */
  const saveSearch = useCallback(async (query: string, city?: string | null, category?: string | null) => {
    if (!query || query.trim().length < 2) return;

    const trimmedQuery = query.trim();

    // Deduplicate: skip if last entry is the same
    const isDuplicate = history.length > 0 &&
      history[0].query === trimmedQuery &&
      (history[0].city || null) === (city || null) &&
      (history[0].category || null) === (category || null);
    if (isDuplicate) return;

    const newEntry: SearchHistoryEntry = {
      id: crypto.randomUUID(),
      query: trimmedQuery,
      city: city || null,
      category: category || null,
      created_at: new Date().toISOString(),
    };

    const updated = [newEntry, ...history].slice(0, MAX_ENTRIES);
    setHistory(updated);

    if (userId) {
      // Save to DB
      await supabase.from("search_history").insert({
        user_id: userId,
        query: trimmedQuery,
        city: city || null,
        category: category || null,
      });
    } else {
      // Save to localStorage
      setLocalHistory(updated);
    }
  }, [history, userId]);

  /** Clear all search history */
  const clearHistory = useCallback(async () => {
    setHistory([]);
    if (userId) {
      await supabase.from("search_history").delete().eq("user_id", userId);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [userId]);

  /** Delete a single entry */
  const deleteEntry = useCallback(async (entryId: string) => {
    setHistory(prev => prev.filter(e => e.id !== entryId));
    if (userId) {
      await supabase.from("search_history").delete().eq("id", entryId);
    } else {
      const updated = getLocalHistory().filter(e => e.id !== entryId);
      setLocalHistory(updated);
    }
  }, [userId]);

  /** Migrate localStorage history to DB when user logs in */
  useEffect(() => {
    if (!userId) return;
    const local = getLocalHistory();
    if (local.length === 0) return;

    // Migrate in background
    const rows = local.map(e => ({
      user_id: userId,
      query: e.query,
      city: e.city || null,
      category: e.category || null,
      created_at: e.created_at,
    }));
    supabase.from("search_history").insert(rows).then(() => {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      loadFromDb(userId);
    });
  }, [userId]);

  return { history, isLoading, saveSearch, clearHistory, deleteEntry };
};
