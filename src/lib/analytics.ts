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
