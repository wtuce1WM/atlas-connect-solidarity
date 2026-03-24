import { useState, useEffect, useCallback, useRef } from "react";
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
const SEARCH_HISTORY_SYNC_EVENT = "search-history-sync";

const emitSearchHistorySync = () => {
  window.dispatchEvent(new Event(SEARCH_HISTORY_SYNC_EVENT));
};

const normalizeQuery = (query: string) => query.trim().toLocaleLowerCase().replace(/\s+/g, " ");

const dedupeHistoryEntries = (entries: SearchHistoryEntry[]) => {
  const seen = new Set<string>();
  const unique: SearchHistoryEntry[] = [];

  for (const entry of entries) {
    const normalized = normalizeQuery(entry.query || "");
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    unique.push({
      ...entry,
      query: entry.query.trim(),
    });

    if (unique.length >= MAX_ENTRIES) break;
  }

  return unique;
};

/** Read from localStorage */
function getLocalHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return dedupeHistoryEntries(parsed);
  } catch {
    return [];
  }
}

/** Write to localStorage */
function setLocalHistory(entries: SearchHistoryEntry[]) {
  try {
    const unique = dedupeHistoryEntries(entries);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(unique.slice(0, MAX_ENTRIES)));
  } catch {
    /* quota exceeded – silently ignore */
  }
}

/**
 * Unified search history hook.
 * - Anonymous users  → localStorage
 * - Authenticated users → database (search_history table)
 */
export const useSearchHistory = () => {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const historyRef = useRef<SearchHistoryEntry[]>([]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const loadFromDb = useCallback(async (uid: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("search_history")
        .select("id, query, city, category, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(MAX_ENTRIES * 3);

      const nextHistoryRaw = error
        ? getLocalHistory()
        : (data?.length ?? 0) > 0
          ? (data ?? [])
          : getLocalHistory();

      const nextHistory = dedupeHistoryEntries(nextHistoryRaw);
      historyRef.current = nextHistory;
      setHistory(nextHistory);
    } catch {
      const fallback = getLocalHistory();
      historyRef.current = fallback;
      setHistory(fallback);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Track auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setAuthReady(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load history when auth/user changes
  useEffect(() => {
    if (!authReady) return;
    if (userId) {
      void loadFromDb(userId);
    } else {
      const local = getLocalHistory();
      historyRef.current = local;
      setHistory(local);
    }
  }, [authReady, userId, loadFromDb]);

  // Sync history across multiple hook instances in the same page
  useEffect(() => {
    const handleSync = () => {
      if (!authReady) return;
      if (userId) {
        void loadFromDb(userId);
      } else {
        const local = getLocalHistory();
        historyRef.current = local;
        setHistory(local);
      }
    };

    window.addEventListener(SEARCH_HISTORY_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SEARCH_HISTORY_SYNC_EVENT, handleSync);
  }, [authReady, userId, loadFromDb]);

  /** Save a search entry (single unique entry per query) */
  const saveSearch = useCallback(async (query: string, city?: string | null, category?: string | null) => {
    if (!query || query.trim().length < 2) return;

    const trimmedQuery = query.trim().replace(/\s+/g, " ");
    const normalizedQuery = normalizeQuery(trimmedQuery);
    if (!normalizedQuery || trimmedQuery.length < 2) return;

    const current = dedupeHistoryEntries(historyRef.current);

    // If it's already on top, keep as-is (no duplicate + no noisy writes)
    if (current[0] && normalizeQuery(current[0].query) === normalizedQuery) return;

    const duplicatesInCurrent = current.filter((e) => normalizeQuery(e.query) === normalizedQuery);
    const updatedBase = current.filter((e) => normalizeQuery(e.query) !== normalizedQuery);

    const newEntry: SearchHistoryEntry = {
      id: crypto.randomUUID(),
      query: trimmedQuery,
      city: city || null,
      category: category || null,
      created_at: new Date().toISOString(),
    };

    const updated = [newEntry, ...updatedBase].slice(0, MAX_ENTRIES);
    historyRef.current = updated;
    setHistory(updated);

    if (userId) {
      // Cleanup previous duplicate rows for this query (from current loaded history)
      const duplicateIds = duplicatesInCurrent.map((e) => e.id).filter(Boolean);
      if (duplicateIds.length > 0) {
        await supabase.from("search_history").delete().in("id", duplicateIds);
      }

      const { error } = await supabase.from("search_history").insert({
        user_id: userId,
        query: trimmedQuery,
        city: city || null,
        category: category || null,
      });

      // Fallback persistence if DB write fails
      if (error) {
        setLocalHistory(updated);
      }
    } else {
      setLocalHistory(updated);
    }

    emitSearchHistorySync();
  }, [userId]);

  /** Clear all search history */
  const clearHistory = useCallback(async () => {
    historyRef.current = [];
    setHistory([]);

    if (userId) {
      await supabase.from("search_history").delete().eq("user_id", userId);
    }

    localStorage.removeItem(LOCAL_STORAGE_KEY);
    emitSearchHistorySync();
  }, [userId]);

  /** Delete a single entry */
  const deleteEntry = useCallback(async (entryId: string) => {
    const updatedCurrent = historyRef.current.filter((e) => e.id !== entryId);
    historyRef.current = updatedCurrent;
    setHistory(updatedCurrent);

    if (userId) {
      await supabase.from("search_history").delete().eq("id", entryId);
    }

    const updatedLocal = getLocalHistory().filter((e) => e.id !== entryId);
    setLocalHistory(updatedLocal);
    emitSearchHistorySync();
  }, [userId]);

  /** Migrate localStorage history to DB when user logs in */
  useEffect(() => {
    if (!userId) return;

    const local = dedupeHistoryEntries(getLocalHistory());
    if (local.length === 0) return;

    const rows = local.map((e) => ({
      user_id: userId,
      query: e.query,
      city: e.city || null,
      category: e.category || null,
      created_at: e.created_at,
    }));

    const migrate = async () => {
      const { error } = await supabase.from("search_history").insert(rows);
      if (error) return;

      localStorage.removeItem(LOCAL_STORAGE_KEY);
      await loadFromDb(userId);
      emitSearchHistorySync();
    };

    void migrate();
  }, [userId, loadFromDb]);

  return { history, isLoading, saveSearch, clearHistory, deleteEntry };
};
