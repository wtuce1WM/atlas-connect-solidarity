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
    (supabase as any)
      .from("page_meta_overrides")
      .select("route_pattern, title, description, og_image, og_type")
      .then(({ data }: { data: PageMetaOverride[] | null }) => {
        if (data) setOverrides(data);
      });
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
