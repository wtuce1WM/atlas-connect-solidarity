import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useBlockedDomains, isDomainInSet } from "@/hooks/useBlockedDomains";

interface BookingOverlayProps {
  bookingUrl: string;
  onClose: () => void;
}

const IFRAME_LOAD_TIMEOUT_MS = 5000;

const BookingOverlay = ({ bookingUrl, onClose }: BookingOverlayProps) => {
  const { domains, loaded } = useBlockedDomains();
  const knownBlocked = loaded && isDomainInSet(bookingUrl, domains);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadedRef = useRef(false);

  // Once blocked domains are loaded, check if this domain is blocked
  useEffect(() => {
    if (loaded && knownBlocked) {
      setIframeBlocked(true);
      window.open(bookingUrl, "_blank", "noopener,noreferrer");
      onClose();
    }
  }, [loaded, knownBlocked, bookingUrl, onClose]);

  // Timeout fallback
  useEffect(() => {
    if (!loaded || knownBlocked) return;

    loadedRef.current = false;
    const timer = setTimeout(() => {
      if (!loadedRef.current) {
        window.open(bookingUrl, "_blank", "noopener,noreferrer");
        onClose();
      }
    }, IFRAME_LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [bookingUrl, loaded, knownBlocked, onClose]);

  const handleIframeLoad = () => {
    loadedRef.current = true;
    setIframeBlocked(false);
  };

  // Don't render if blocked or not yet loaded
  if (iframeBlocked || !loaded) return null;

  return (
    <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-slide-down-from-top">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background border-2 border-white/20 shadow-2xl hover:opacity-90 transition-opacity shrink-0"
            title="Fermer"
            aria-label="Fermer la réservation"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">Réservation</span>
        </div>
      </div>

      <iframe
        ref={iframeRef}
        src={bookingUrl}
        className="flex-1 w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        allow="payment"
        title="Réservation"
        onLoad={handleIframeLoad}
      />
    </div>
  );
};

export default BookingOverlay;
