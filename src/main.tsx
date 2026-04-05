import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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

