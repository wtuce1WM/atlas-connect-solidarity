import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, trackPageView } from "@/lib/analytics";

const SEEN_USERS_KEY = "ga-known-user-ids-v1";

const getSeenUsers = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_USERS_KEY) || "[]");
  } catch {
    return [];
  }
};
const markUserSeen = (id: string) => {
  try {
    const list = getSeenUsers();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(SEEN_USERS_KEY, JSON.stringify(list.slice(-50)));
    }
  } catch {
    /* noop */
  }
};

/**
 * Envoie un page_view GA4 à chaque changement de route SPA
 * + tracking auth (login / sign_up via onAuthStateChange)
 * + tracking search (extrait `q` du querystring de /search).
 */
const AnalyticsTracker = () => {
  const { pathname, search } = useLocation();
  const lastPath = useRef<string | null>(null);
  const lastQuery = useRef<string | null>(null);

  // SPA pageviews + search events
  useEffect(() => {
    const path = pathname + search;
    if (lastPath.current !== path) {
      lastPath.current = path;
      const id = window.setTimeout(() => trackPageView(path), 50);
      // Search event distinct (utile pour les rapports "search_term")
      if (pathname === "/search") {
        const params = new URLSearchParams(search);
        const q = (params.get("q") || "").trim();
        if (q && q !== lastQuery.current) {
          lastQuery.current = q;
          trackEvent("search", { search_term: q });
        }
      }
      return () => window.clearTimeout(id);
    }
  }, [pathname, search]);

  // Auth events
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id;
      if (event === "SIGNED_IN" && userId) {
        const known = getSeenUsers().includes(userId);
        trackEvent(known ? "login" : "sign_up", {
          method: session?.user?.app_metadata?.provider || "email",
        });
        if (!known) markUserSeen(userId);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Global outbound click tracking (WhatsApp / tel / mailto)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      const label =
        anchor.getAttribute("aria-label") ||
        anchor.dataset.trackLabel ||
        anchor.textContent?.trim().slice(0, 80) ||
        "";
      const location = window.location.pathname + window.location.search;

      if (/^(https?:)?\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/i.test(href) || href.startsWith("whatsapp:")) {
        trackEvent("whatsapp_click", { link_url: href, link_text: label, page_location: location });
      } else if (href.startsWith("tel:")) {
        trackEvent("phone_click", { link_url: href, link_text: label, page_location: location });
      } else if (href.startsWith("mailto:")) {
        trackEvent("email_click", { link_url: href, link_text: label, page_location: location });
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true } as never);
  }, []);

  return null;
};

export default AnalyticsTracker;
