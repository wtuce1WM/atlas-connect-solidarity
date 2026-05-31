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
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        const notifyIfWaiting = (worker: ServiceWorker | null) => {
          if (!worker) return;
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            (window as any).__owmWaitingWorker = worker;
            window.dispatchEvent(new Event("owm-app-update-ready"));
          }
        };
        // Already waiting on load
        notifyIfWaiting(registration.waiting);
        // New worker found later
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          installing?.addEventListener("statechange", () => notifyIfWaiting(installing));
        });
        // Periodic check for updates
        setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
      }).catch((error) => {
        console.warn("[PWA] Service worker registration failed", error);
      });
      // Reload once the new SW takes control
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
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

