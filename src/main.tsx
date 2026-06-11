import React from "react";
import { createRoot } from "react-dom/client";
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
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    (window as WindowWithInstallPrompt).__owmInstallPromptEvent = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("owm-installprompt-ready"));
  });

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const hostname = window.location.hostname;
  const isPreviewHost = hostname.startsWith("id-preview--") || hostname.includes("lovableproject.com");

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

class RootErrorBoundary extends React.Component<React.PropsWithChildren, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[RootErrorBoundary] Fatal render error", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-12">
          <div className="max-w-xl text-center space-y-3">
            <h1 className="text-2xl font-semibold">Le preview a rencontré une erreur</h1>
            <p className="text-sm text-muted-foreground">{this.state.error.message || "Erreur de rendu inconnue."}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
);

