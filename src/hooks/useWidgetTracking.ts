import { useCallback, useEffect, useRef } from "react";
import { logWidgetEvent } from "@/lib/widgetSettings";

/**
 * Journalise l'affichage d'un widget embarqué (une fois par montage) et expose
 * un `track()` pour ses interactions. Jamais bloquant.
 */
export const useWidgetTracking = (widgetKey: string, businessId?: string | null, lang?: string) => {
  const logged = useRef(false);
  useEffect(() => {
    if (logged.current || !widgetKey) return;
    logged.current = true;
    logWidgetEvent({ widgetKey, businessId, eventType: "load", lang });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetKey, businessId]);

  return useCallback(
    (action: string, meta?: Record<string, any>) =>
      logWidgetEvent({ widgetKey, businessId, eventType: "interaction", action, lang, meta }),
    [widgetKey, businessId, lang],
  );
};

export default useWidgetTracking;
