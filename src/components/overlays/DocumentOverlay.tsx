import { useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { getFlipbookEmbedUrl } from "@/lib/flipbookEmbed";

interface DocumentOverlayProps {
  url: string;
  name: string;
  type: "pdf" | "flipbook";
  ts: number;
  onClose: () => void;
}

const isMobileDevice = () =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const DocumentOverlay = ({ url, name, type, ts, onClose }: DocumentOverlayProps) => {
  const [nativeFailed, setNativeFailed] = useState(false);

  // On mobile, go straight to Google Docs viewer; on desktop try native first
  const useMobile = isMobileDevice();
  const useGoogleViewer = type === "pdf" && (useMobile || nativeFailed);

  const pdfSrc = useGoogleViewer
    ? `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`
    : `${url}#toolbar=1&navpanes=0`;

  return (
    <div className="absolute inset-0 -top-[3.3rem] z-[60] bg-white flex flex-col animate-fade-in overflow-hidden">
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
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ouvrir
        </a>
      </div>
      <div className="flex-1 relative pb-16 bg-background">
        {type === "flipbook" ? (
          <iframe
            src={getFlipbookEmbedUrl(url)}
            className="h-full w-full border-0"
            allow="clipboard-write; fullscreen"
            title={name}
          />
        ) : (
          <iframe
            key={`${url}-pdf-${ts}-${useGoogleViewer ? "gv" : "native"}`}
            src={pdfSrc}
            className="h-full w-full border-0"
            title={name}
            onError={() => !useGoogleViewer && setNativeFailed(true)}
            onLoad={(e) => {
              // If native iframe loads but shows blank (cross-origin), fallback
              if (!useGoogleViewer && !nativeFailed) {
                try {
                  const doc = (e.target as HTMLIFrameElement).contentDocument;
                  if (doc && doc.body && doc.body.childElementCount === 0) {
                    setNativeFailed(true);
                  }
                } catch {
                  // cross-origin — PDF is rendering natively, that's fine
                }
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default DocumentOverlay;
