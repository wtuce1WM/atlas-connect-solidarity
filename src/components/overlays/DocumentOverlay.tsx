import { useEffect, useState } from "react";
import { X, ExternalLink, Loader2 } from "lucide-react";
import { getFlipbookEmbedUrl } from "@/lib/flipbookEmbed";

interface DocumentOverlayProps {
  url: string;
  name: string;
  type: "pdf" | "flipbook";
  ts: number;
  onClose: () => void;
}

const getGoogleViewerUrl = (url: string) =>
  `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

const DocumentOverlay = ({ url, name, type, ts, onClose }: DocumentOverlayProps) => {
  const [pdfSrc, setPdfSrc] = useState<string>("");
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  useEffect(() => {
    if (type !== "pdf") return;

    let cancelled = false;
    let objectUrl: string | null = null;
    const abortController = new AbortController();

    setIsPreparingPdf(true);
    setIsIframeLoaded(false);
    setPdfSrc("");

    const preparePdf = async () => {
      try {
        const response = await fetch(url, {
          signal: abortController.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Unable to fetch PDF (${response.status})`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        if (!cancelled) {
          setPdfSrc(objectUrl);
        }
      } catch {
        if (!cancelled) {
          setPdfSrc(getGoogleViewerUrl(url));
        }
      } finally {
        if (!cancelled) {
          setIsPreparingPdf(false);
        }
      }
    };

    void preparePdf();

    return () => {
      cancelled = true;
      abortController.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [type, url, ts]);

  useEffect(() => {
    setIsIframeLoaded(false);
  }, [pdfSrc, ts]);

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
          <>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-0">
              <Loader2 className={`h-6 w-6 text-muted-foreground ${isPreparingPdf || !isIframeLoaded ? "animate-spin" : "opacity-0"}`} />
              <span className="text-xs text-muted-foreground">Chargement du document…</span>
            </div>
            {pdfSrc && (
              <iframe
                key={`${pdfSrc}-${ts}`}
                src={pdfSrc}
                className="relative z-10 h-full w-full border-0 bg-transparent"
                title={name}
                onLoad={() => setIsIframeLoaded(true)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentOverlay;
