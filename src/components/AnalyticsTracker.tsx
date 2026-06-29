import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/analytics";

/**
 * Envoie un page_view GA4 à chaque changement de route SPA.
 * Le tout premier pageview est aussi émis ici (send_page_view: false dans le config gtag).
 */
const AnalyticsTracker = () => {
  const { pathname, search } = useLocation();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    const path = pathname + search;
    if (lastSent.current === path) return;
    lastSent.current = path;
    // Petit délai pour laisser le titre de page se mettre à jour (RouteSeo / Helmet)
    const id = window.setTimeout(() => trackPageView(path), 50);
    return () => window.clearTimeout(id);
  }, [pathname, search]);

  return null;
};

export default AnalyticsTracker;
