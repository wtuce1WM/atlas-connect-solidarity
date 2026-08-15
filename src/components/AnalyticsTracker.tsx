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

  // Trafic interne : toute session portant un rôle staff/admin est taguée
  // traffic_type=internal (à exclure via un filtre de données GA4).
  useEffect(() => {
    let cancelled = false;
    const detect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) { if (!cancelled) setInternalTraffic(false); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (!cancelled) setInternalTraffic(!!roles && roles.length > 0);
    };
    detect().catch(() => {});
    const { data: sub } = supabase.auth.onAuthStateChange(() => { detect().catch(() => {}); });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
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
      const bizId = anchor.dataset.businessId || target.closest?.("[data-business-id]")?.getAttribute("data-business-id") || undefined;
      const logBiz = (type: Parameters<typeof import("@/lib/businessAnalytics").trackBusinessEvent>[1], subtype?: string) => {
        if (!bizId) return;
        import("@/lib/businessAnalytics").then(({ trackBusinessEvent }) => {
          trackBusinessEvent(bizId, type, subtype ? { subtype } : {});
        }).catch(() => {});
      };

      if (/^(https?:)?\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/i.test(href) || href.startsWith("whatsapp:")) {
        trackEvent("whatsapp_click", { link_url: href, link_text: label, page_location, business_id: bizId });
        logBiz("whatsapp_click");
        return;
      }
      if (href.startsWith("tel:")) {
        trackEvent("phone_click", { link_url: href, link_text: label, page_location, business_id: bizId });
        logBiz("phone_click");
        return;
      }
      if (href.startsWith("mailto:")) {
        trackEvent("email_click", { link_url: href, link_text: label, page_location, business_id: bizId });
        logBiz("email_click");
        return;
      }
      // Directions: liens Google/Apple/Waze Maps (intention forte de visite physique)
      if (DIRECTIONS_RE.test(href)) {
        trackEvent("directions_click", {
          link_url: href,
          link_text: label,
          business_id: bizId,
          page_location,
        });
        logBiz("directions_click");
      }
      // Outbound : URL absolue avec un host différent
      if (/^https?:\/\//i.test(href)) {
        try {
          const u = new URL(href);
          if (u.host && u.host !== window.location.host && !INTERNAL_HOST_RE.test(u.host)) {
            const affiliate = AFFILIATE_HOSTS.find((a) => a.re.test(u.host));
            if (affiliate) {
              trackEvent("affiliate_click", {
                partner: affiliate.partner,
                link_url: href,
                link_domain: u.host,
                business_id: bizId,
                page_location,
              });
              logBiz("affiliate_click", affiliate.partner);
            }
            trackEvent("outbound_click", {
              link_url: href,
              link_domain: u.host,
              link_text: label,
              page_location,
            });
            if (!affiliate) logBiz("outbound_click");
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

  // Rage clicks (3+ clics rapprochés <800ms même zone) + dead clicks (clic sans effet)
  useEffect(() => {
    let cluster: { x: number; y: number; t: number; count: number; sel: string } | null = null;
    const RAGE_MS = 800;
    const RAGE_DIST = 40;
    const DEAD_MS = 600;

    const describe = (el: Element | null): string => {
      if (!el || !(el instanceof HTMLElement)) return "";
      const id = el.id ? `#${el.id}` : "";
      const cls = (el.className && typeof el.className === "string")
        ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "";
      return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 80);
    };

    const onClick = (e: MouseEvent) => {
      const t = Date.now();
      const target = e.target as HTMLElement | null;
      const sel = describe(target);

      // Rage detection
      if (cluster && t - cluster.t < RAGE_MS && Math.hypot(e.clientX - cluster.x, e.clientY - cluster.y) < RAGE_DIST) {
        cluster.count += 1;
        cluster.t = t;
        if (cluster.count === 3) {
          trackEvent("rage_click", {
            selector: cluster.sel,
            page_location: window.location.pathname + window.location.search,
          });
        }
      } else {
        cluster = { x: e.clientX, y: e.clientY, t, count: 1, sel };
      }

      // Dead click: l'élément n'est pas interactif et aucune mutation/navigation n'arrive
      const interactive = target?.closest?.(
        "a,button,input,select,textarea,label,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[onclick],[data-track-event]"
      );
      if (interactive) return;
      const startUrl = window.location.href;
      let mutated = false;
      const mo = new MutationObserver(() => { mutated = true; });
      mo.observe(document.body, { childList: true, subtree: true, attributes: true });
      window.setTimeout(() => {
        mo.disconnect();
        if (!mutated && window.location.href === startUrl) {
          trackEvent("dead_click", {
            selector: sel,
            page_location: window.location.pathname + window.location.search,
          });
        }
      }, DEAD_MS);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Erreurs métier silencieuses : fetch HTTP >= 500 ou erreurs réseau
  useEffect(() => {
    const origFetch = window.fetch;
    if (!origFetch) return;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const started = Date.now();
      const url = typeof args[0] === "string" ? args[0] : args[0] instanceof URL ? args[0].href : (args[0] as Request).url;
      try {
        const res = await origFetch(...args);
        if (res.status >= 500) {
          try {
            const u = new URL(url, window.location.href);
            trackEvent("api_error", {
              status: res.status,
              endpoint: u.pathname.slice(0, 120),
              host: u.host,
              duration_ms: Date.now() - started,
            });
          } catch { /* noop */ }
        }
        return res;
      } catch (err) {
        try {
          const u = new URL(url, window.location.href);
          trackEvent("api_network_error", {
            endpoint: u.pathname.slice(0, 120),
            host: u.host,
            description: (err instanceof Error ? err.message : "fetch_failed").slice(0, 200),
            duration_ms: Date.now() - started,
          });
        } catch { /* noop */ }
        throw err;
      }
    };
    return () => { window.fetch = origFetch; };
  }, []);



  return null;
};

export default AnalyticsTracker;
