import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type WindowWithInstallPrompt = typeof window & {
  __owmInstallPromptEvent?: BeforeInstallPromptEvent;
};

if (typeof window !== "undefined") {
  const PREVIEW_ROUTE_KEY = "__owm_preview_route__";

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const hostname = window.location.hostname;
  const isPreviewHost = hostname.startsWith("id-preview--") || hostname.includes("lovableproject.com");

  // Persist the current preview route before the HMR gate reloads the iframe,
  // then restore it on the next load so the user stays on the page being tested.
  if (isInIframe || isPreviewHost) {
    const saveRoute = () => {
      try {
        sessionStorage.setItem(
          PREVIEW_ROUTE_KEY,
          JSON.stringify({ route: window.location.pathname + window.location.search, at: Date.now() }),
        );
      } catch {
        /* sessionStorage indisponible */
      }
    };

    window.addEventListener("beforeunload", saveRoute);
    window.addEventListener("pagehide", saveRoute);

    try {
      const raw = sessionStorage.getItem(PREVIEW_ROUTE_KEY);
      sessionStorage.removeItem(PREVIEW_ROUTE_KEY);
      const currentPath = window.location.pathname + window.location.search;
      // Restore ONLY when the shell reloaded the iframe on the root URL right after
      // an edit. Any explicit navigation (deep link) must always win.
      const isRootReload = window.location.pathname === "/" && !window.location.search;
      if (raw && isRootReload) {
        const parsed = JSON.parse(raw) as { route?: string; at?: number };
        const fresh = typeof parsed.at === "number" && Date.now() - parsed.at < 15000;
        if (fresh && parsed.route && parsed.route !== currentPath) {
          // Use replaceState to avoid adding an extra history entry; React Router will pick it up.
          window.history.replaceState(null, "", parsed.route);
        }
      }
    } catch {
      /* sessionStorage indisponible */
    }

  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    (window as WindowWithInstallPrompt).__owmInstallPromptEvent = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("owm-installprompt-ready"));
  });

  if ("serviceWorker" in navigator && !isInIframe && !isPreviewHost && window.location.protocol === "https:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          const promptUpdate = (worker: ServiceWorker) => {
            // Lazy-load sonner to avoid blocking the initial render.
            import("sonner").then(({ toast }) => {
              toast("Une mise à jour est disponible", {
                description: "Recharge l'app pour profiter de la dernière version.",
                duration: Infinity,
                action: {
                  label: "Mettre à jour",
                  onClick: () => worker.postMessage({ type: "SKIP_WAITING" }),
                },
              });
            }).catch(() => {
              // Fallback: reload directly if toast can't load.
              worker.postMessage({ type: "SKIP_WAITING" });
            });
          };

          // A waiting worker was found at registration time (user reopened the app).
          if (registration.waiting && navigator.serviceWorker.controller) {
            promptUpdate(registration.waiting);
          }

          // A new worker is being installed.
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                promptUpdate(newWorker);
              }
            });
          });

          // When the new SW takes over, reload to pick up the fresh assets.
          let reloading = false;
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (reloading) return;
            reloading = true;
            window.location.reload();
          });

          // Check for updates on focus / visibility regain.
          const checkForUpdate = () => {
            registration.update().catch(() => {});
          };
          window.addEventListener("focus", checkForUpdate);
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") checkForUpdate();
          });
        })
        .catch((error) => {
          console.warn("[PWA] Service worker registration failed", error);
        });
    });
  } else if ("serviceWorker" in navigator && (isInIframe || isPreviewHost)) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }
}

interface RootErrorBoundaryState {
  error: Error | null;
}

const RELOAD_FLAG = "__owm_chunk_reload__";

const isChunkLoadError = (error: unknown): boolean => {
  if (!error) return false;
  const msg = (error as Error)?.message ?? String(error);
  const name = (error as Error)?.name ?? "";
  return (
    name === "ChunkLoadError" ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Minified React error #(418|423|425|426)/i.test(msg) ||
    // Stale chunk after a deploy: an old lazy chunk references a minified binding
    // (e.g. "scope is not defined") that no longer exists in the new shared chunk.
    // Same class of failure as a chunk load error → purge caches and reload once.
    (name === "ReferenceError" && /is not defined/i.test(msg)) ||
    /Cannot access '[^']+' before initialization/i.test(msg)
  );
};


const hardReload = async () => {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch (e) {
    console.warn("[RootErrorBoundary] cache purge failed", e);
  }
  window.location.reload();
};

class RootErrorBoundary extends React.Component<React.PropsWithChildren, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[RootErrorBoundary] Fatal render error", error, errorInfo);
    try {
      import("@/lib/analytics").then(({ trackEvent }) =>
        trackEvent("exception", {
          description: (error?.message || "render_error").slice(0, 200),
          source: errorInfo?.componentStack?.split("\n")[1]?.trim().slice(0, 120) || "react",
          fatal: true,
        })
      ).catch(() => {});
    } catch { /* noop */ }
    // Auto-recover from stale chunk after deploy: reload once, flag in session to avoid loop.
    if (isChunkLoadError(error)) {
      try {
        const already = sessionStorage.getItem(RELOAD_FLAG);
        if (!already) {
          sessionStorage.setItem(RELOAD_FLAG, "1");
          hardReload();
          return;
        }
      } catch {
        /* sessionStorage indisponible */
      }
    } else {
      try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignore */ }
    }
  }

  render() {
    if (this.state.error) {
      const chunk = isChunkLoadError(this.state.error);
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-12">
          <div className="max-w-xl text-center space-y-4">
            <h1 className="text-2xl font-semibold">
              {chunk ? "Une nouvelle version est disponible" : "Le preview a rencontré une erreur"}
            </h1>
            <p className="text-sm text-muted-foreground break-words">
              {chunk
                ? "Rechargez la page pour récupérer les derniers fichiers."
                : (this.state.error.message || "Erreur de rendu inconnue.")}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={hardReload}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                Recharger
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = "/"; }}
                className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted"
              >
                Accueil
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </RootErrorBoundary>,
);

