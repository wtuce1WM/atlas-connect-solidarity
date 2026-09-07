import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  setOverrides,
  subscribeOverrides,
  type PageMetaOverride,
} from "./pageMetaOverrides";

// Loads all page_meta_overrides once at app mount and pushes them into the
// module cache used by RouteSeo. Mounted in App.tsx.
export function PageMetaOverridesLoader() {
  useEffect(() => {
    // Chargé hors du chemin critique : ces métadonnées ne servent pas au premier
    // rendu, inutile de concurrencer les requêtes du contenu visible.
    const load = () => {
      (supabase as any)
        .from("page_meta_overrides")
        .select("route_pattern, title, description, og_image, og_type")
        .then(({ data }: { data: PageMetaOverride[] | null }) => {
          if (data) setOverrides(data);
        });
    };
    const w = window as any;
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(load, { timeout: 3000 });
      return () => { w.cancelIdleCallback?.(id); };
    }
    const t = window.setTimeout(load, 1200);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}

// Hook for the back-office: subscribes to override changes so the UI re-renders
// after a save.
export function usePageMetaOverridesVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const unsub = subscribeOverrides(() => setV((n) => n + 1));
    return () => { unsub(); };
  }, []);
  return v;
}
