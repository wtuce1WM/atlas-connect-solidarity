// Helpers GA4 + Consent Mode v2.
// Les page_view SPA sont émis par <AnalyticsTracker /> à chaque changement de route.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const GA_ID = "G-6Z7316E9Q5";
const CONSENT_KEY = "cookie-consent-v1";

export type ConsentChoice = "granted" | "denied";

export interface ConsentState {
  analytics: ConsentChoice;
  decidedAt: number;
}

export function getStoredConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as ConsentState) : null;
  } catch {
    return null;
  }
}

export function setConsent(analytics: ConsentChoice) {
  const state: ConsentState = { analytics, decidedAt: Date.now() };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
  } catch {
    /* noop */
  }
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: analytics,
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }
}

/** Detecte le mode d'exécution: PWA installée (standalone) vs onglet navigateur. */
function getAppMode(): "standalone" | "browser" {
  if (typeof window === "undefined") return "browser";
  try {
    // iOS Safari standalone
    // @ts-expect-error non-standard iOS property
    if (window.navigator.standalone === true) return "standalone";
    if (window.matchMedia?.("(display-mode: standalone)").matches) return "standalone";
    if (window.matchMedia?.("(display-mode: fullscreen)").matches) return "standalone";
    if (window.matchMedia?.("(display-mode: minimal-ui)").matches) return "standalone";
  } catch { /* noop */ }
  return "browser";
}

/** Détecte les webviews d'apps (WhatsApp, Instagram, Facebook, TikTok, Gmail, LinkedIn). */
function getInAppBrowser(): string | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "facebook";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/WhatsApp/i.test(ua)) return "whatsapp";
  if (/Line\//i.test(ua)) return "line";
  if (/TikTok|BytedanceWebview|musical_ly/i.test(ua)) return "tiktok";
  if (/GSA\//i.test(ua)) return "google_app";
  if (/LinkedInApp/i.test(ua)) return "linkedin";
  if (/Snapchat/i.test(ua)) return "snapchat";
  if (/Twitter|TwitterAndroid/i.test(ua)) return "twitter";
  if (/Threads/i.test(ua)) return "threads";
  if (/GmailMobile|Pinterest/i.test(ua)) return "email_or_pinterest";
  return null;
}

let pwaLaunchFired = false;

// ---- Content grouping + trafic interne ----------------------------------

/** Catégorise une URL interne en content_group GA4 (natif, aucune dimension à créer). */
export function getContentGroup(path: string): string {
  let p = (path || "/").split("?")[0].split("#")[0];
  p = p.replace(/^\/(en|fr|es|de|it)(?=\/|$)/, "");
  if (!p || p === "/") return "Home";
  const seg = p.replace(/^\//, "").split("/");
  const first = seg[0];
  switch (first) {
    case "search": return "Recherche";
    case "blog": return "Blog";
    case "embed": return "Widget";
    case "club": return "Club";
    case "affiliates": return "Affiliés";
    case "staff":
    case "studio-video": return "Staff";
    case "fiche":
    case "business": return "Fiche";
    case "destination": return "Destination";
    case "categorie":
    case "category": return "Catégorie";
    case "map":
    case "carte": return "Carte";
    default: return seg.length === 1 ? "Fiche" : "Autre";
  }
}

let internalTraffic = false;

/** Marque la session comme trafic interne (staff/admin) : tag GA4 + coupure sur /staff/*. */
export function setInternalTraffic(value: boolean) {
  internalTraffic = value;
  try { sessionStorage.setItem("ga-internal-traffic-v1", value ? "1" : "0"); } catch { /* noop */ }
  if (typeof window !== "undefined" && typeof window.gtag === "function" && value) {
    window.gtag("set", { traffic_type: "internal" });
  }
}

export function isInternalTraffic(): boolean {
  if (internalTraffic) return true;
  try { return sessionStorage.getItem("ga-internal-traffic-v1") === "1"; } catch { return false; }
}

/** Coupure totale des hits : back-office (toujours) + sessions internes en back-office. */
function isSuppressed(): boolean {
  if (typeof window === "undefined") return true;
  const p = window.location.pathname;
  return /^\/(staff|studio-video)(\/|$)/.test(p);
}

function baseParams() {
  return isInternalTraffic() ? { traffic_type: "internal" } : {};
}

export function trackPageView(path: string, title?: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  if (isSuppressed()) return;
  const app_mode = getAppMode();
  const in_app_browser = getInAppBrowser();
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: title ?? document.title,
    content_group: getContentGroup(path),
    app_mode,
    is_pwa: app_mode === "standalone",
    in_app_browser: in_app_browser ?? "none",
    ...baseParams(),
    send_to: GA_ID,
  });
  // Fire-once par session pour isoler proprement les lancements PWA / webview.
  if (!pwaLaunchFired) {
    pwaLaunchFired = true;
    if (app_mode === "standalone") {
      window.gtag("event", "pwa_launch", { app_mode, in_app_browser: in_app_browser ?? "none", ...baseParams() });
    }
    if (in_app_browser) {
      window.gtag("event", "in_app_browser_launch", { in_app_browser, app_mode, ...baseParams() });
    }
  }
}

/**
 * page_view virtuel : les fiches ouvertes en slide-panel réécrivent l'URL via
 * replaceState, ce qui n'émet aucun hit GA4. On envoie donc un page_view
 * explicite avec content_group = "Fiche" pour pouvoir comparer Home vs Fiche.
 */
export function trackVirtualPageView(path: string, title?: string, extra: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  if (isSuppressed()) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.origin + path,
    page_title: title ?? document.title,
    content_group: getContentGroup(path),
    virtual: true,
    ...baseParams(),
    ...extra,
    send_to: GA_ID,
  });
}

export function trackEvent(
  name: string,
  params: Record<string, unknown> = {}
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  if (isSuppressed()) return;
  window.gtag("event", name, { ...baseParams(), ...params });
}


/** Associe l'ID utilisateur connecté à GA4 (cross-device). Passer null pour reset. */
export function setUserId(userId: string | null) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("config", GA_ID, { user_id: userId ?? undefined });
}

// ---- Attribution / UTM first-touch ----
const ATTRIBUTION_KEY = "ga-attribution-v1";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"] as const;

export interface Attribution {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  gclid: string | null;
  fbclid: string | null;
  referrer: string | null;
  landing_page: string | null;
  first_seen_at: number;
}

export function getStoredAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

/** Capture les UTMs au premier passage; persiste first-touch. Idempotent. */
export function captureAttribution() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const hasUtm = UTM_KEYS.some((k) => url.searchParams.has(k));
  const stored = getStoredAttribution();
  if (stored && !hasUtm) return; // garde le first-touch sauf nouveaux UTMs explicites
  const ref = document.referrer || "";
  const sameOrigin = ref.startsWith(window.location.origin);
  const attr: Attribution = {
    source: url.searchParams.get("utm_source"),
    medium: url.searchParams.get("utm_medium"),
    campaign: url.searchParams.get("utm_campaign"),
    term: url.searchParams.get("utm_term"),
    content: url.searchParams.get("utm_content"),
    gclid: url.searchParams.get("gclid"),
    fbclid: url.searchParams.get("fbclid"),
    referrer: sameOrigin ? null : ref || null,
    landing_page: window.location.pathname + window.location.search,
    first_seen_at: Date.now(),
  };
  try { localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attr)); } catch { /* noop */ }
  if (hasUtm) trackEvent("campaign_touch", { ...attr });
}

// ---- Aha moments (first-time per browser) ----
const AHA_KEY = "ga-aha-moments-v1";

function getAhaSet(): Set<string> {
  try {
    const raw = localStorage.getItem(AHA_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/**
 * Fire-once milestone event ("first_bookmark", "first_share", etc.).
 * No-op on subsequent calls. Stored in localStorage.
 */
export function trackAhaMoment(name: string, params: Record<string, unknown> = {}) {
  const set = getAhaSet();
  if (set.has(name)) return;
  set.add(name);
  try { localStorage.setItem(AHA_KEY, JSON.stringify([...set])); } catch { /* noop */ }
  trackEvent("aha_moment", { milestone: name, ...params });
  trackEvent(name, params); // also fire the dedicated event name for funnels
}

// ---- Club signup funnel ----
const FUNNEL_KEY = "ga-club-funnel-v1";

interface FunnelState {
  started_at: number;
  steps: string[];
  method?: string;
}

function getFunnel(): FunnelState | null {
  try {
    const raw = sessionStorage.getItem(FUNNEL_KEY);
    return raw ? (JSON.parse(raw) as FunnelState) : null;
  } catch { return null; }
}
function setFunnel(state: FunnelState | null) {
  try {
    if (state) sessionStorage.setItem(FUNNEL_KEY, JSON.stringify(state));
    else sessionStorage.removeItem(FUNNEL_KEY);
  } catch { /* noop */ }
}

export function trackClubSignupStarted(surface: string) {
  if (getFunnel()) return; // already in progress this session
  const state: FunnelState = { started_at: Date.now(), steps: ["started"] };
  setFunnel(state);
  trackEvent("club_signup_started", { surface });
}

export function trackClubSignupStep(step: string, params: Record<string, unknown> = {}) {
  const state = getFunnel();
  if (!state || state.steps.includes(step)) return;
  state.steps.push(step);
  setFunnel(state);
  trackEvent("club_signup_step", {
    step,
    step_index: state.steps.length - 1,
    elapsed_ms: Date.now() - state.started_at,
    ...params,
  });
}

export function trackClubSignupCompleted(method: string) {
  const state = getFunnel();
  trackEvent("club_signup_complete", {
    method,
    elapsed_ms: state ? Date.now() - state.started_at : undefined,
    steps_count: state?.steps.length ?? undefined,
  });
  setFunnel(null);
}

export function trackClubSignupAbandoned(reason: string) {
  const state = getFunnel();
  if (!state) return;
  trackEvent("club_signup_abandoned", {
    reason,
    last_step: state.steps[state.steps.length - 1],
    steps_reached: state.steps.length,
    elapsed_ms: Date.now() - state.started_at,
  });
  setFunnel(null);
}


