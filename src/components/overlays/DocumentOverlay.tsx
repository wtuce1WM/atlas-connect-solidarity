import { useEffect, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { getFlipbookEmbedUrl } from "@/lib/flipbookEmbed";

interface DocumentOverlayProps {
  url: string;
  name: string;
  type: "pdf" | "flipbook";
  ts: number;
  onClose: () => void;
  onLoad?: () => void;
}

const DocumentOverlay = ({ url, name, type, ts, onClose, onLoad }: DocumentOverlayProps) => {
  const [showFlipbook, setShowFlipbook] = useState(type !== "flipbook");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (type !== "flipbook") return;
    setShowFlipbook(false);
    const timer = window.setTimeout(() => setShowFlipbook(true), 1200);
    return () => window.clearTimeout(timer);
  }, [type, url]);

  return (
    <div className="absolute inset-0 z-[85] bg-white flex flex-col overflow-hidden" style={type === "flipbook" ? undefined : { animation: "slide-up-from-bottom 0.4s ease-out both" }}>
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background border-2 border-white/20 shadow-2xl hover:opacity-90 transition-opacity shrink-0"
            title="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold truncate">{name}</span>
        </div>
      </div>
      <div className="flex-1 relative bg-background overflow-hidden">
        {type === "flipbook" ? (
            <>
              <iframe
                ref={iframeRef}
                src={getFlipbookEmbedUrl(url)}
                className={`border-0 absolute left-0 right-0 w-full ${showFlipbook ? "opacity-100" : "opacity-0"}`}
                style={{ top: 0, height: "calc(100% + 92px)" }}
                allow="clipboard-write; fullscreen"
                tabIndex={-1}
                title={name}
                onLoad={() => iframeRef.current?.blur()}
              />
              {!showFlipbook && <div className="absolute inset-0 bg-background z-20" />}
              <div className="absolute left-0 right-0 bottom-0 h-[92px] bg-background pointer-events-none z-30" />
            </>
        ) : (
          <>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-0">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Chargement du document…</span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-xs text-primary underline hover:no-underline"
              >
                Ouvrir dans un nouvel onglet
              </a>
            </div>
            <iframe
              key={`${url}-gview-${ts}`}
              src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
              className="relative z-10 w-full border-0 bg-transparent"
              style={{ height: "calc(100% + 70px)", marginTop: "-70px" }}
              title={name}
              onLoad={onLoad}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentOverlay;
