// Reporte Core Web Vitals (LCP/INP/CLS/FCP/TTFB) à GA4.
// Appelé une seule fois au boot via AnalyticsTracker.
import type { Metric } from "web-vitals";
import { trackEvent } from "./analytics";

let started = false;

const send = (metric: Metric) => {
  trackEvent("web_vitals", {
    metric_name: metric.name,
    metric_value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
    metric_rating: metric.rating,
    metric_id: metric.id,
    page_path: window.location.pathname + window.location.search,
    non_interaction: true,
  });
};

export function startWebVitals() {
  if (started || typeof window === "undefined") return;
  started = true;
  import("web-vitals").then(({ onLCP, onINP, onCLS, onFCP, onTTFB }) => {
    onLCP(send);
    onINP(send);
    onCLS(send);
    onFCP(send);
    onTTFB(send);
  }).catch(() => {});
}
