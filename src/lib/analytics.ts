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

export function trackPageView(path: string, title?: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: title ?? document.title,
    send_to: GA_ID,
  });
}

export function trackEvent(
  name: string,
  params: Record<string, unknown> = {}
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
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


