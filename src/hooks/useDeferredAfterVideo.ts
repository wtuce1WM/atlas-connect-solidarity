import { useEffect, useState } from "react";

/**
 * Retarde les lectures non visuelles du viewer (agenda, médias hôte, événements)
 * pour ne pas concurrencer la bande passante du MP4 au démarrage.
 *
 * Passe à `true` dès que le navigateur est au repos après le premier rendu,
 * avec un plafond de sécurité (`maxDelayMs`) pour ne jamais bloquer une donnée.
 */
export function useDeferredAfterVideo(active: boolean, maxDelayMs = 900): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) {
      setReady(false);
      return;
    }
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    const timer = window.setTimeout(finish, maxDelayMs);
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout?: number }) => number)
      | undefined;
    const idleId = ric ? ric(finish, { timeout: maxDelayMs }) : null;
    return () => {
      done = true;
      window.clearTimeout(timer);
      if (idleId !== null && (window as any).cancelIdleCallback) {
        (window as any).cancelIdleCallback(idleId);
      }
    };
  }, [active, maxDelayMs]);

  return ready;
}
