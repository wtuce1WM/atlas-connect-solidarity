import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, trackPageView, setUserId, captureAttribution, getStoredAttribution, trackAhaMoment } from "@/lib/analytics";
import { startWebVitals } from "@/lib/webVitals";

const RETURNING_KEY = "ga-first-visit-at-v1";
const RETURNING_FIRED_KEY = "ga-returning-fired-v1";


const SEEN_USERS_KEY = "ga-known-user-ids-v1";

const getSeenUsers = (): string[] => {
  try { return JSON.parse(localStorage.getItem(SEEN_USERS_KEY) || "[]"); } catch { return []; }
};
const markUserSeen = (id: string) => {
  try {
    const list = getSeenUsers();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(SEEN_USERS_KEY, JSON.stringify(list.slice(-50)));
    }
  } catch { /* noop */ }
};

const INTERNAL_HOST_RE = /(^|\.)oneworldmorocco\.com$|(^|\.)lovable\.app$|^localhost$/i;

// Monétisation: hosts à fort signal d'intention commerciale
const AFFILIATE_HOSTS: Array<{ re: RegExp; partner: string }> = [
  { re: /(^|\.)booking\.com$/i, partner: "booking" },
  { re: /(^|\.)getyourguide\.com$/i, partner: "getyourguide" },
  { re: /(^|\.)viator\.com$/i, partner: "viator" },
  { re: /(^|\.)expedia\.[a-z.]+$/i, partner: "expedia" },
  { re: /(^|\.)tripadvisor\.[a-z.]+$/i, partner: "tripadvisor" },
  { re: /(^|\.)airbnb\.[a-z.]+$/i, partner: "airbnb" },
  { re: /(^|\.)agoda\.com$/i, partner: "agoda" },
  { re: /(^|\.)hotels\.com$/i, partner: "hotels" },
  { re: /(^|\.)trip\.com$/i, partner: "trip" },
];
const DIRECTIONS_RE = /(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.apple\.com|^geo:|waze\.com)/i;


/**
 * Pageviews SPA + tracking global :
 *  - search (extrait `q` de /search)
 *  - login / sign_up via onAuthStateChange + user_id GA4
 *  - whatsapp_click / phone_click / email_click / outbound_click (délégation)
 *  - data-track-event="..." (délégation générique)
 *  - scroll_depth 25/50/75/100 par route
 */
const AnalyticsTracker = () => {
  const { pathname, search } = useLocation();
  const lastPath = useRef<string | null>(null);
  const lastQuery = useRef<string | null>(null);
  const lastQueryAt = useRef<number>(0);
  const scrollMarks = useRef<Set<number>>(new Set());

  // SPA pageviews + search + reset scroll marks
  useEffect(() => {
    const path = pathname + search;
    if (lastPath.current !== path) {
      lastPath.current = path;
      scrollMarks.current = new Set();
      const id = window.setTimeout(() => trackPageView(path), 50);
      if (pathname === "/search") {
        const params = new URLSearchParams(search);
        const q = (params.get("q") || "").trim();
        if (q && q !== lastQuery.current) {
          const prev = lastQuery.current;
          const prevAt = lastQueryAt.current;
          const now = Date.now();
          lastQuery.current = q;
          lastQueryAt.current = now;
          trackEvent("search", { search_term: q });
          trackAhaMoment("first_search", { search_term: q });
          // Search refinement: new query within 30s of previous
          if (prev && now - prevAt < 30_000) {
            const sharedPrefix = (() => {
              const a = prev.toLowerCase(), b = q.toLowerCase();
              let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
              return i;
            })();
            const isExtension = q.toLowerCase().startsWith(prev.toLowerCase());
            const isReduction = prev.toLowerCase().startsWith(q.toLowerCase());
            trackEvent("search_refinement", {
              from: prev,
              to: q,
              delta_ms: now - prevAt,
              shared_prefix_chars: sharedPrefix,
              kind: isExtension ? "extend" : isReduction ? "reduce" : "rewrite",
            });
          }
        }
      }
      return () => window.clearTimeout(id);
    }
  }, [pathname, search]);


  // Auth events + user_id GA4
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id;
      if (event === "SIGNED_IN" && userId) {
        const known = getSeenUsers().includes(userId);
        trackEvent(known ? "login" : "sign_up", {
          method: session?.user?.app_metadata?.provider || "email",
        });
        if (!known) markUserSeen(userId);
        setUserId(userId);
      }
      if (event === "SIGNED_OUT") setUserId(null);
    });
    // hydrate user_id si session déjà active au boot
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) setUserId(data.session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Global click delegation : outbound, WhatsApp, tel, mailto, data-track-event
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // 1) data-track-event="event_name" data-track-* en payload
      const trackEl = target.closest?.("[data-track-event]") as HTMLElement | null;
      if (trackEl) {
        const name = trackEl.dataset.trackEvent!;
        const payload: Record<string, unknown> = {
          page_location: window.location.pathname + window.location.search,
        };
        for (const [k, v] of Object.entries(trackEl.dataset)) {
          if (k.startsWith("track") && k !== "trackEvent") {
            const key = k.replace(/^track/, "").replace(/^./, (c) => c.toLowerCase());
            payload[key] = v;
          }
        }
        trackEvent(name, payload);
      }

      // 2) Liens
      const anchor = target.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      const label =
        anchor.getAttribute("aria-label") ||
        anchor.dataset.trackLabel ||
        anchor.textContent?.trim().slice(0, 80) ||
        "";
      const page_location = window.location.pathname + window.location.search;

      if (/^(https?:)?\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/i.test(href) || href.startsWith("whatsapp:")) {
        trackEvent("whatsapp_click", { link_url: href, link_text: label, page_location });
        return;
      }
      if (href.startsWith("tel:")) {
        trackEvent("phone_click", { link_url: href, link_text: label, page_location });
        return;
      }
      if (href.startsWith("mailto:")) {
        trackEvent("email_click", { link_url: href, link_text: label, page_location });
        return;
      }
      // Outbound : URL absolue avec un host différent
      if (/^https?:\/\//i.test(href)) {
        try {
          const u = new URL(href);
          if (u.host && u.host !== window.location.host && !INTERNAL_HOST_RE.test(u.host)) {
            trackEvent("outbound_click", {
              link_url: href,
              link_domain: u.host,
              link_text: label,
              page_location,
            });
          }
        } catch { /* noop */ }
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true } as never);
  }, []);

  // Scroll depth 25/50/75/100 par route
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      for (const mark of [25, 50, 75, 100]) {
        if (pct >= mark && !scrollMarks.current.has(mark)) {
          scrollMarks.current.add(mark);
          trackEvent("scroll_depth", {
            percent: mark,
            page_path: window.location.pathname + window.location.search,
          });
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Core Web Vitals (LCP/INP/CLS/FCP/TTFB) — une seule fois
  useEffect(() => { startWebVitals(); }, []);

  // Capture UTM/attribution first-touch
  useEffect(() => { captureAttribution(); }, [pathname, search]);

  // Returning visitor : marqueurs J+1 / J+7 / J+30
  useEffect(() => {
    try {
      let firstRaw = localStorage.getItem(RETURNING_KEY);
      if (!firstRaw) {
        firstRaw = String(Date.now());
        localStorage.setItem(RETURNING_KEY, firstRaw);
        return;
      }
      const first = parseInt(firstRaw, 10);
      if (!Number.isFinite(first)) return;
      const days = Math.floor((Date.now() - first) / (1000 * 60 * 60 * 24));
      const fired = new Set<number>(JSON.parse(localStorage.getItem(RETURNING_FIRED_KEY) || "[]"));
      for (const mark of [1, 7, 30]) {
        if (days >= mark && !fired.has(mark)) {
          fired.add(mark);
          trackEvent("returning_visitor", { days_since_first: mark });
        }
      }
      localStorage.setItem(RETURNING_FIRED_KEY, JSON.stringify([...fired]));
    } catch { /* noop */ }
  }, []);

  // PWA install prompt / installed
  useEffect(() => {
    const onPrompt = () => trackEvent("pwa_install_prompt_shown", {});
    const onInstalled = () => {
      const attr = getStoredAttribution();
      trackEvent("pwa_installed", {
        utm_source: attr?.source ?? undefined,
        utm_campaign: attr?.campaign ?? undefined,
      });
    };
    window.addEventListener("beforeinstallprompt", onPrompt as EventListener);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt as EventListener);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Global exceptions → GA4 `exception`
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      trackEvent("exception", {
        description: (e.message || "error").slice(0, 200),
        source: `${e.filename || ""}:${e.lineno || 0}`,
        fatal: false,
      });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason: unknown = e.reason;
      const desc = reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "unhandledrejection";
      trackEvent("exception", { description: desc.slice(0, 200), fatal: false });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
};

export default AnalyticsTracker;
