import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

/**
 * Shows a banner ONLY when a new service-worker version is waiting to activate.
 * Wired up by src/main.tsx, which dispatches "owm-app-update-ready" and stores
 * the waiting ServiceWorker on window.__owmWaitingWorker.
 */
const AppUpdateBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onReady = () => setVisible(true);
    window.addEventListener("owm-app-update-ready", onReady);
    // In case the event fired before this component mounted
    if ((window as any).__owmWaitingWorker) setVisible(true);
    return () => window.removeEventListener("owm-app-update-ready", onReady);
  }, []);

  if (!visible) return null;

  const applyUpdate = () => {
    const worker: ServiceWorker | undefined = (window as any).__owmWaitingWorker;
    if (worker) {
      worker.postMessage({ type: "SKIP_WAITING" });
      // main.tsx reloads on controllerchange
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-x-0 top-[64px] z-[60] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-primary/30 bg-background/95 px-4 py-2 shadow-lg backdrop-blur-md">
        <RefreshCw className="h-4 w-4 text-primary" />
        <span className="font-roboto text-sm text-foreground">
          Une nouvelle version est disponible.
        </span>
        <button
          type="button"
          onClick={applyUpdate}
          className="rounded-full bg-primary px-3 py-1 font-josefin text-xs uppercase tracking-[0.2em] text-primary-foreground hover:opacity-90"
        >
          Installer
        </button>
        <button
          type="button"
          aria-label="Fermer"
          onClick={() => setVisible(false)}
          className="text-foreground/60 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AppUpdateBanner;
