import { useState, useEffect, useRef } from "react";
import { X, ExternalLink } from "lucide-react";

interface BookingOverlayProps {
  bookingUrl: string;
  onClose: () => void;
}

const IFRAME_LOAD_TIMEOUT_MS = 5000;

const BookingOverlay = ({ bookingUrl, onClose }: BookingOverlayProps) => {
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      // After timeout, try to detect if the iframe loaded content
      try {
        const iframe = iframeRef.current;
        if (iframe) {
          // Accessing cross-origin contentWindow will throw — that's expected.
          // But if the iframe is truly blank (blocked), we show the fallback.
          // We can't reliably detect this, so we just show the fallback message.
          setIframeBlocked(true);
        }
      } catch {
        setIframeBlocked(true);
      }
    }, IFRAME_LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [bookingUrl]);

  const handleIframeLoad = () => {
    // If the iframe fires onLoad, the page loaded (even if it's an error page from the remote server).
    // Cancel the blocked state.
    setIframeBlocked(false);
  };

  return (
    <div className="absolute inset-0 z-[60] bg-background flex flex-col animate-fade-in">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-background">
        <span className="text-sm font-semibold">Réservation</span>
        <div className="flex items-center gap-2">
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
            title="Ouvrir dans un nouvel onglet"
          >
            <ExternalLink className="h-3 w-3" />
            Nouvel onglet
          </a>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted transition-colors"
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {iframeBlocked && (
        <div className="flex flex-col items-center justify-center gap-4 p-6 text-center flex-1">
          <p className="text-sm text-muted-foreground">
            Ce site de réservation ne peut pas s'afficher ici.
          </p>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Ouvrir la réservation
          </a>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={bookingUrl}
        className={`flex-1 w-full border-0 ${iframeBlocked ? "hidden" : ""}`}
        allow="payment"
        title="Réservation"
        onLoad={handleIframeLoad}
      />
    </div>
  );
};

export default BookingOverlay;
